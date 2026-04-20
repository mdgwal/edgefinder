// assets-engine.js — Asset Scorecard scoring engine
const SC_WEIGHTS = {
  technical:  0.30,
  sentiment:  0.20,
  cot:        0.20,
  macro:      0.30,
};
const SC_MACRO_WEIGHTS = {
  growth:    0.40,
  inflation: 0.30,
  jobs:      0.30,
};
// ── SYMBOL MAPS (unchanged — keep existing) ──────────────────────────────
const SC_MFX_MAP = {
  EUR:"EURUSD", GBP:"GBPUSD", JPY:"USDJPY", AUD:"AUDUSD",
  CAD:"USDCAD", NZD:"NZDUSD", CHF:"USDCHF",
};
const SC_MFX_INVERT = { JPY:true, CAD:true, CHF:true };
const SC_COT_MAP = {
  Gold:"Gold", SILVER:"SILVER", USOIL:"USOIL", BTC:"BTC",
  NASDAQ:"NASDAQ", DOW:"DOW", SPX500:"SPX", RUSSELL:"RUSSELL", US10T:"US10T",
  COPPER:"COPPER",
  EUR:"EUR", GBP:"GBP", JPY:"JPY", AUD:"AUD", CAD:"CAD", CHF:"CHF", NZD:"NZD", USD:"USD",
};
const SC_PC_MAP = {
  SPX500:"SPX500", NASDAQ:"NAS100", Gold:"GOLD", USOIL:"USOIL",
  BTC:"BTCUSD", EUR:"EURUSD", JPY:"USDJPY",
};

// ── DATA SNAPSHOT (unchanged signature — used by both engines) ────────────
async function fetchAllData() {
  const cotRows   = (state.cotData && state.cotData.length) ? state.cotData : COT_DATA;
  const sentiment = state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT;
  const econ      = state.econData      || FALLBACK_ECON;
  const putCall   = state.putCallLive   ? (state.putCallData || PUT_CALL) : PUT_CALL;
  const aaiiData  = state.aaiiLive      ? (state.aaiiData    || AAII)     : AAII;
  const rates     = state.rates;
  return { cotRows, sentiment, econ, putCall, aaiiData, rates, ts: Date.now() };
}
function deriveComponents(assetId, liveData) {
  const fallback = ASSETS_SCORED.find(a => a.id === assetId);
  const clamp2   = v => Math.max(-2, Math.min(2, Math.round(v)));

  // Technical
  let technical = fallback ? clamp2(fallback.trend * 0.7 + fallback.seasonal * 0.3) : 0;
  if (liveData.rates && SC_MFX_MAP[assetId]) {
    const inverted = !!SC_MFX_INVERT[assetId];
    if (state.prevRates && state.rates) {
      const cur  = inverted ? (state.rates[assetId] || 1)     : (1/(state.rates[assetId]     || 1));
      const prev = inverted ? (state.prevRates[assetId] || 1) : (1/(state.prevRates[assetId] || 1));
      const roc  = (cur - prev) / prev;
      const sig  = roc > 0.003 ? 1 : roc < -0.003 ? -1 : 0;
      technical  = clamp2(technical * 0.7 + sig * 0.3 * 2);
    }
  }
  // Sentiment
  let sentimentScore = fallback ? clamp2(fallback.retail) : 0;
  const mfxSym = SC_MFX_MAP[assetId];
  if (mfxSym && liveData.sentiment && liveData.sentiment.length) {
    const row = liveData.sentiment.find(s => s.name === mfxSym);
    if (row) {
      const lp = row.longPercentage;
      const rs = lp >= 75 ? -2 : lp >= 65 ? -1 : lp <= 25 ? 2 : lp <= 35 ? 1 : 0;
      sentimentScore = clamp2(SC_MFX_INVERT[assetId] ? -rs : rs);
    }
  }
  const pcId = SC_PC_MAP[assetId];
  if (pcId && liveData.putCall && liveData.putCall.length) {
    const row = liveData.putCall.find(p => p.id === pcId);
    if (row) {
      const sig = row.pc > 1.2 ? 1 : row.pc < 0.7 ? -1 : 0;
      sentimentScore = clamp2(sentimentScore * 0.7 + sig * 0.3 * 2);
    }
  }
  if (["DOW","NASDAQ","SPX500","RUSSELL","Gold","BTC"].includes(assetId) && liveData.aaiiData) {
    const spread = liveData.aaiiData.spread ?? 0;
    const sig = spread < -15 ? 2 : spread < -5 ? 1 : spread > 15 ? -2 : spread > 5 ? -1 : 0;
    sentimentScore = clamp2(sentimentScore * 0.6 + sig * 0.4 * 2);
  }
  // COT
  let cotScore = fallback ? clamp2(fallback.cot) : 0;
  const cotId  = SC_COT_MAP[assetId];
  if (cotId && liveData.cotRows && liveData.cotRows.length) {
    const row = liveData.cotRows.find(r => r.id === cotId);
    if (row) {
      const net    = (row.longPct || 50) - (row.shortPct || 50);
      const netChg = row.netChg || 0;
      const netSig = net > 20 ? 2 : net > 5 ? 1 : net < -20 ? -2 : net < -5 ? -1 : 0;
      const chgSig = netChg > 3 ? 1 : netChg < -3 ? -1 : 0;
      cotScore     = clamp2(netSig * 0.7 + chgSig * 0.3 * 2);
    }
  }
  // Macro
  let growthScore    = fallback ? clamp2((fallback.gdp + fallback.mPMI + fallback.sPMI + fallback.retailSal) / 2) : 0;
  let inflationScore = fallback ? clamp2(fallback.inflation) : 0;
  let jobsScore      = fallback ? clamp2((fallback.empChg + fallback.unemploy + fallback.rates) / 1.5) : 0;
  const fredKey = ["EUR","GBP","JPY"].includes(assetId) ? assetId
                : ["DOW","NASDAQ","SPX500","RUSSELL","Gold","USOIL","SILVER","COPPER","US10T","BTC"].includes(assetId) ? "USD"
                : assetId === "USD" ? "USD" : null;
  if (fredKey && liveData.econ && liveData.econ[fredKey] && liveData.econ[fredKey].length) {
    const items = liveData.econ[fredKey];
    const gdp   = items.find(i => i.l.toLowerCase().includes("gdp"));
    const cpi   = items.find(i => i.l.toLowerCase().includes("cpi"));
    const unemp = items.find(i => i.l.toLowerCase().includes("unemploy"));
    if (gdp)   growthScore    = clamp2((gdp.s ?? 0) * 4);
    if (cpi)   inflationScore = clamp2(-(cpi.s ?? 0) * 4);
    if (unemp) jobsScore      = clamp2(-(unemp.s ?? 0) * 4);
  }
  const macroRaw = growthScore * SC_MACRO_WEIGHTS.growth
                 + inflationScore * SC_MACRO_WEIGHTS.inflation
                 + jobsScore * SC_MACRO_WEIGHTS.jobs;
  const macro = clamp2(macroRaw / 0.4);
  return { technical, sentiment: sentimentScore, cot: cotScore,
           growth: growthScore, inflation: inflationScore, jobs: jobsScore, macro };
}

function calculateComponentScore(a) {
  return deriveComponents(a.id, {
    cotRows:   (state.cotData && state.cotData.length) ? state.cotData : COT_DATA,
    sentiment: state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT,
    econ:      state.econData || FALLBACK_ECON,
    putCall:   state.putCallLive ? (state.putCallData || PUT_CALL) : PUT_CALL,
    aaiiData:  state.aaiiLive ? (state.aaiiData || AAII) : AAII,
    rates:     state.rates,
  });
}

function calculateAssetScore(a, liveData) {
  const ld = liveData || {
    cotRows:   (state.cotData && state.cotData.length) ? state.cotData : COT_DATA,
    sentiment: state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT,
    econ:      state.econData || FALLBACK_ECON,
    putCall:   state.putCallLive ? (state.putCallData || PUT_CALL) : PUT_CALL,
    aaiiData:  state.aaiiLive ? (state.aaiiData || AAII) : AAII,
    rates:     state.rates,
  };
  const comp = deriveComponents(a.id, ld);
  const w = SC_WEIGHTS;
  const raw = comp.technical * w.technical * 5 +
              comp.sentiment * w.sentiment * 5 +
              comp.cot       * w.cot       * 5 +
              comp.macro     * w.macro     * 5;
  const total = Math.max(-12, Math.min(12, Math.round(raw)));
  const bias  = total >= 5 ? "Bullish" : total <= -5 ? "Bearish"
              : total >= 3 ? "Mild Bull" : total <= -3 ? "Mild Bear" : "Neutral";
  return { asset: a.id, name: a.name, cat: a.cat, components: comp, totalScore: total, bias };
}
// Setup scoring engine lives in topsetups-engine.js

// ── SETUP SCORING ENGINE (calculateSetupScore) ──────────────────────────

const SETUP_WEIGHTS = {
  technical:  0.35,
  cot:        0.25,
  macro:      0.25,
  sentiment:  0.15,
};

// ── HELPER: get yesterday's setup score from localStorage ─────────────────
function _getYesterdaySetupScore(assetId) {
  try {
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const key = 'ef_ss_' + assetId + '_' + yd.toISOString().split('T')[0];
    const raw = localStorage.getItem(key);
    return raw !== null ? parseFloat(raw) : null;
  } catch(e) { return null; }
}

function _saveSetupScore(assetId, score) {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('ef_ss_' + assetId + '_' + today, String(score));
  } catch(e) {}
}

// ── MAIN ENGINE ───────────────────────────────────────────────────────────
function calculateSetupScore(assetId, liveData) {
  const fb  = ASSETS_SCORED.find(a => a.id === assetId);
  if (!fb) return null;
  const c2  = v => Math.max(-2, Math.min(2, Math.round(v)));   // clamp factor to [-2,+2]
  const c10 = v => Math.max(-10, Math.min(10, Math.round(v))); // clamp final to [-10,+10]

  // ── FACTOR 1: TECHNICAL (35%) ───────────────────────────────────────────
  // Trend structure (60%) + price momentum ROC (40%)
  // Weighted more than Asset Scorecard because setups need price confirmation
  let f_tech = c2(fb.trend * 0.6 + fb.seasonal * 0.4);
  if (liveData.rates) {
    const inv  = !!SC_MFX_INVERT[assetId];
    const sym  = SC_MFX_MAP[assetId];
    if (sym && state.prevRates && state.rates && state.rates[assetId]) {
      const cur  = inv ? (state.rates[assetId]||1)     : 1/(state.rates[assetId]||1);
      const prev = inv ? (state.prevRates[assetId]||1) : 1/(state.prevRates[assetId]||1);
      const roc  = prev > 0 ? (cur - prev) / prev : 0;
      // Tighter thresholds than Asset engine — only count meaningful moves
      const roc_sig = roc > 0.006 ? 2 : roc > 0.002 ? 1 : roc < -0.006 ? -2 : roc < -0.002 ? -1 : 0;
      f_tech = c2(f_tech * 0.60 + roc_sig * 0.40);
    }
  }

  // ── FACTOR 2: COT / INSTITUTIONAL (25%) ────────────────────────────────
  // Net positioning direction (50%) + weekly change momentum (35%) + crowding (15%)
  let f_cot = c2(fb.cot);
  let cot_is_extreme = false; // flag for crowd risk penalty
  const cotId = SC_COT_MAP[assetId];
  if (cotId && liveData.cotRows && liveData.cotRows.length) {
    const row = liveData.cotRows.find(r => r.id === cotId);
    if (row) {
      const net     = (row.longPct || 50) - (row.shortPct || 50); // -50 to +50
      const netChg  = row.netChg || 0;  // % WoW change
      // Net direction signal
      const net_sig = net > 25 ? 2 : net > 8 ? 1 : net < -25 ? -2 : net < -8 ? -1 : 0;
      // Momentum: is positioning accelerating or decelerating?
      const chg_sig = netChg > 5 ? 2 : netChg > 2 ? 1 : netChg < -5 ? -2 : netChg < -2 ? -1 : 0;
      // Crowding contrarian: extreme positioning = mean-reversion risk
      // This WARNS via crowd_risk — does NOT directly invert the direction signal
      cot_is_extreme = Math.abs(net) > 38;
      const crowd_adj = net > 38 ? -1 : net < -38 ? 1 : 0; // softer: only ±1, not ±2
      f_cot = c2(net_sig * 0.50 + chg_sig * 0.35 + crowd_adj * 0.15 * 2);
    }
  }

  // ── FACTOR 3: MACRO (25%) ──────────────────────────────────────────────
  // Growth (40%) + Inflation (30%) + Jobs (30%) — same weights as SC_MACRO_WEIGHTS
  let f_growth    = c2((fb.gdp + fb.mPMI + fb.sPMI + fb.retailSal) / 2);
  let f_inflation = c2(fb.inflation);
  let f_jobs      = c2((fb.empChg + fb.unemploy + fb.rates) / 1.5);

  const fredKey = ['EUR','GBP','JPY'].includes(assetId)       ? assetId
                : ['DOW','NASDAQ','SPX500','RUSSELL','Gold',
                   'USOIL','SILVER','COPPER','US10T','BTC'].includes(assetId) ? 'USD'
                : assetId === 'USD' ? 'USD' : null;

  if (fredKey && liveData.econ && liveData.econ[fredKey] && liveData.econ[fredKey].length) {
    const items = liveData.econ[fredKey];
    const gdp   = items.find(i => i.l.toLowerCase().includes('gdp'));
    const cpi   = items.find(i => i.l.toLowerCase().includes('cpi'));
    const unemp = items.find(i => i.l.toLowerCase().includes('unemploy'));
    if (gdp   && gdp.s   !== undefined) f_growth    = c2(gdp.s   * 4);
    if (cpi   && cpi.s   !== undefined) f_inflation = c2(-(cpi.s * 4)); // high CPI = bearish (risk-off)
    if (unemp && unemp.s !== undefined) f_jobs      = c2(-(unemp.s * 4)); // high unemp surprise = bearish
  }

  const f_macro = c2(
    f_growth    * SC_MACRO_WEIGHTS.growth    +
    f_inflation * SC_MACRO_WEIGHTS.inflation +
    f_jobs      * SC_MACRO_WEIGHTS.jobs
  );

  // ── FACTOR 4: SENTIMENT / RETAIL CONTRA (15%) ──────────────────────────
  // Retail positioning is a CONTRA indicator — inverted by design
  // Extreme retail longs → bearish signal; extreme retail shorts → bullish
  let f_sent = c2(fb.retail);
  const mfxSym = SC_MFX_MAP[assetId];
  if (mfxSym && liveData.sentiment && liveData.sentiment.length) {
    const row = liveData.sentiment.find(s => s.name === mfxSym);
    if (row) {
      const lp = row.longPercentage;
      // More aggressive thresholds than Asset engine — we want clear extremes for setups
      const rs = lp >= 78 ? -2 : lp >= 68 ? -1 : lp <= 22 ? 2 : lp <= 32 ? 1 : 0;
      f_sent = c2(SC_MFX_INVERT[assetId] ? -rs : rs);
    }
  }
  // Put/Call modifier for equities/commodities (reinforces or dampens sentiment)
  const pcId = SC_PC_MAP[assetId];
  if (pcId && liveData.putCall && liveData.putCall.length) {
    const row = liveData.putCall.find(p => p.id === pcId);
    if (row) {
      const pc_sig = row.pc > 1.3 ? 1 : row.pc < 0.65 ? -1 : 0; // high P/C = fear = bullish contra
      f_sent = c2(f_sent * 0.70 + pc_sig * 0.30 * 2);
    }
  }

  // ── BASE SCORE: weighted sum, scaled to [-10, +10] ──────────────────────
  // Each factor is [-2,+2]; max possible weighted sum = 2.0
  // Scale: base_raw / 2.0 × 10 = /0.2
  const w = SETUP_WEIGHTS;
  const base_raw = f_tech     * w.technical +
                   f_cot      * w.cot       +
                   f_macro    * w.macro     +
                   f_sent     * w.sentiment;
  // base_raw range: -2.0 to +2.0 → scale to -10 to +10
  let score = base_raw * 5;

  // ── CONFLUENCE BOOST (+20% of |score|) ─────────────────────────────────
  // Count how many factors agree with the direction of the base score
  const dir = base_raw > 0 ? 1 : base_raw < 0 ? -1 : 0;
  if (dir !== 0) {
    const factors_aligned = [f_tech, f_cot, f_macro, f_sent]
      .filter(v => v !== 0 && Math.sign(v) === dir).length;
    if (factors_aligned >= 3) {
      // Strong confluence: 3 or 4 factors agree → boost score by 20%
      score = score * 1.20;
    } else if (factors_aligned === 2) {
      // Moderate confluence: 2 factors agree → no boost, no penalty
      score = score * 1.00;
    } else {
      // Weak confluence: only 1 factor driving the score → slight discount
      score = score * 0.80;
    }
  }

  // ── CROWD RISK PENALTY ──────────────────────────────────────────────────
  // COT at extreme = crowded trade = reduce score magnitude (not direction)
  // Penalizes BOTH long and short extremes — setup quality is lower when crowded
  if (cot_is_extreme) {
    score = score * 0.75; // 25% penalty — still shows direction, warns of risk
  }

  // ── CLAMP TO [-10, +10] ─────────────────────────────────────────────────
  score = c10(score);

  // ── MOMENTUM DELTA ──────────────────────────────────────────────────────
  // Compare to yesterday's setup score — is this setup forming or fading?
  const yesterday = _getYesterdaySetupScore(assetId);
  let delta = null;
  if (yesterday !== null) delta = score - yesterday;

  // Save today's score for tomorrow's delta
  _saveSetupScore(assetId, score);

  // ── BIAS LABEL ──────────────────────────────────────────────────────────
  const bias =
    score >= 7  ? 'Strong Bull' :
    score >= 4  ? 'Bullish'     :
    score >= 1  ? 'Mild Bull'   :
    score <= -7 ? 'Strong Bear' :
    score <= -4 ? 'Bearish'     :
    score <= -1 ? 'Mild Bear'   : 'Neutral';

  // ── QUALITY GRADE ───────────────────────────────────────────────────────
  // A = strong confluence, no crowd risk, momentum confirming
  // B = good score, partial confluence
  // C = score driven by fewer factors or crowded
  const factors_in_dir = [f_tech, f_cot, f_macro, f_sent]
    .filter(v => Math.sign(v) === Math.sign(score) && v !== 0).length;
  const quality =
    (factors_in_dir >= 3 && !cot_is_extreme && (delta === null || delta * Math.sign(score) >= 0)) ? 'A' :
    (factors_in_dir >= 2 && !cot_is_extreme) ? 'B' : 'C';

  return {
    assetId,
    score,           // -10 to +10
    bias,            // label
    quality,         // A / B / C
    delta,           // vs yesterday (null if no history)
    confluence: factors_in_dir, // how many factors agree (0–4)
    crowded: cot_is_extreme,
    factors: {
      technical:  f_tech,
      cot:        f_cot,
      macro:      f_macro,
      sentiment:  f_sent,
      // macro breakdown
      growth:     f_growth,
      inflation:  f_inflation,
      jobs:       f_jobs,
    },
  };
}

// Score all assets — returns array sorted by score desc
function scoreAllSetups(liveData) {
  const ld = liveData || {
    cotRows:   (state.cotData && state.cotData.length) ? state.cotData : COT_DATA,
    sentiment: state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT,
    econ:      state.econData || FALLBACK_ECON,
    putCall:   state.putCallLive ? (state.putCallData || PUT_CALL) : PUT_CALL,
    aaiiData:  state.aaiiLive   ? (state.aaiiData    || AAII)     : AAII,
    rates:     state.rates,
  };
  return ASSETS_SCORED
    .map(a => ({ ...a, ...calculateSetupScore(a.id, ld) }))
    .sort((a, b) => b.score - a.score);
}
