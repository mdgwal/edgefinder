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
