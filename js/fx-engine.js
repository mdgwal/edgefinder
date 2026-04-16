// fx-engine.js — Forex Scorecard scoring engine (6-factor)
const FX_WEIGHTS = {
  technical:       0.20,
  institutional:   0.15,
  growth:          0.20,
  inflation:       0.15,
  labor:           0.10,
  monetaryPolicy:  0.20,
};

// ── MONETARY POLICY DATASET ───────────────────────────────────────────────
// Each currency: rate (%), stance (-2 Dovish → +2 Hawkish), trend (-1/0/+1)
// Updated manually when central banks meet; falls back gracefully if stale.
const FX_CB_DATA = {
  USD:{ rate:5.25, stance: 1, trend: 0, name:"Fed",  label:"Hawkish Hold"   },
  EUR:{ rate:4.50, stance: 0, trend:-1, name:"ECB",  label:"Cutting"         },
  GBP:{ rate:5.25, stance: 0, trend:-1, name:"BoE",  label:"Cautious Cut"    },
  JPY:{ rate:0.50, stance:-1, trend: 1, name:"BoJ",  label:"Gradual Hike"    },
  AUD:{ rate:4.35, stance: 0, trend:-1, name:"RBA",  label:"Cutting"         },
  CAD:{ rate:2.75, stance:-1, trend:-1, name:"BoC",  label:"Dovish Cutting"  },
  CHF:{ rate:0.50, stance:-2, trend:-1, name:"SNB",  label:"Aggressive Cut"  },
  NZD:{ rate:3.50, stance:-1, trend:-1, name:"RBNZ", label:"Cutting"         },
};

// Regime context: risk-on biases AUD/NZD/GBP up, risk-off biases USD/JPY/CHF up
// Derived from VIX proxy (Fear/Greed below 35 = risk-off)
function fxRegimeBias(ccyId, fgScore) {
  if(!fgScore) return 0;
  const riskOn  = ['AUD','NZD','GBP','CAD'];
  const riskOff = ['USD','JPY','CHF'];
  if(fgScore < 35) return riskOff.includes(ccyId) ? 1 : riskOn.includes(ccyId) ? -1 : 0;
  if(fgScore > 65) return riskOn.includes(ccyId)  ? 1 : riskOff.includes(ccyId) ? -1 : 0;
  return 0;
}
// ═══════════════════════════════════════════════════════════════════════════
//  HEDGE-FUND GRADE FX SCORING ENGINE v3
//  Architecture:  score(PAIR) = score(BASE) − score(QUOTE)
//  Factors:  T·20%  I·20%  G·20%  Inf·15%  L·10%  MP·15%  Regime overlay·5%
//  Each factor outputs [-2, +2] (integer, deterministic)
//  Currency score: continuous [-2.5, +2.5] before scaling to display [-10,+10]
//  ONLY this block changes — deriveComponents / Asset engine untouched.
// ═══════════════════════════════════════════════════════════════════════════

// ── HELPER: clamp + round to integer ─────────────────────────────────────
const _c2  = v => Math.max(-2, Math.min(2, Math.round(v)));
const _cf  = v => Math.max(-2.0, Math.min(2.0, v));   // continuous clamp

// ── FACTOR 1: TECHNICAL [-2, +2] ─────────────────────────────────────────
// Spec: Daily trend (45%) + 4H trend (35%) + Seasonality (20%)
// Trend rule: above 50EMA AND 50EMA>200EMA=+2 / above 50EMA only=+1 / etc.
function fxTechnical(ccyId, liveData) {
  const fb       = ASSETS_SCORED.find(a => a.id === ccyId);
  const inverted = !!SC_MFX_INVERT[ccyId];

  // ── Daily trend from static asset data (trend field encodes EMA structure)
  // ASSETS_SCORED.trend: +2 strong bull, +1 bull, 0 range, -1 bear, -2 strong bear
  const trendDaily = fb ? _c2(fb.trend) : 0;

  // ── 4H trend: derived from live rate-of-change vs prev close (proxy)
  let trend4h = trendDaily; // fallback = same as daily
  if (state.prevRates && state.rates) {
    const rk  = ccyId;
    const cur  = inverted ? (state.rates[rk]     || 1) : 1/(state.rates[rk]     || 1);
    const prev = inverted ? (state.prevRates[rk] || 1) : 1/(state.prevRates[rk] || 1);
    if (prev > 0) {
      const roc = (cur - prev) / prev;
      // 0.5% move = strong; 0.2% = mild; within ±0.1% = range
      trend4h = roc > 0.005 ? 2 : roc > 0.002 ? 1 : roc < -0.005 ? -2 : roc < -0.002 ? -1 : 0;
    }
  }

  // ── Seasonality: monthly avg return encoded in fb.seasonal [-2,+2]
  const seasonal = fb ? _c2(fb.seasonal) : 0;

  // Spec-weighted blend: Daily 45% + 4H 35% + Seasonal 20%
  return _c2(trendDaily * 0.45 + trend4h * 0.35 + seasonal * 0.20);
}

// ── FACTOR 2: INSTITUTIONAL POSITIONING / COT [-2, +2] ───────────────────
// Spec: Net Z-score (50%) + weekly change momentum (35%) + crowding contrarian (15%)
// COT net Z-score: (net − μ52w) / σ52w — approximated from longPct−shortPct
function fxInstitutional(ccyId, liveData) {
  const cotId = SC_COT_MAP[ccyId];
  const fb    = ASSETS_SCORED.find(a => a.id === ccyId);
  const fallback = fb ? _c2(fb.cot) : 0;

  if (!cotId || !liveData.cotRows || !liveData.cotRows.length) return fallback;
  const row = liveData.cotRows.find(r => r.id === cotId);
  if (!row) return fallback;

  const net    = (row.longPct || 50) - (row.shortPct || 50); // ≈ −50 to +50
  const netChg = row.netChg || 0;                            // % WoW change

  // Net positioning signal (Z-score proxy: extreme at ±30pp out of 50pp max)
  // Thresholds per spec: Z>+1.5→+2, Z>+0.5→+1, etc.  scaled: 30pp~Z+1.5, 10pp~Z+0.5
  const netSig = net > 30 ? 2 : net > 10 ? 1 : net < -30 ? -2 : net < -10 ? -1 : 0;

  // Weekly change momentum per spec: >+10%→+2, >+3%→+1, <-3%→-1, <-10%→-2
  const chgSig = netChg > 10 ? 2 : netChg > 3 ? 1 : netChg < -10 ? -2 : netChg < -3 ? -1 : 0;

  // Crowding / contrarian: extreme long or short = mean-reversion risk
  // Spec: Z>+2.5 → −1 penalty; Z<−2.5 → +1 bonus (scaled: net>40 or net<-40)
  const crowd = net > 40 ? -1 : net < -40 ? 1 : 0;

  const raw = netSig * 0.50 + chgSig * 0.35 + crowd * 0.15 * 2;
  return _c2(raw);
}

// ── FACTOR 3: ECONOMIC GROWTH [-2, +2] ────────────────────────────────────
// Spec: PMI composite (35%) + GDP surprise (30%) + Retail Sales (20%) + Confidence (15%)
// PMI is the highest weight — most forward-looking leading indicator
function fxGrowth(ccyId, liveData) {
  const fb = ASSETS_SCORED.find(a => a.id === ccyId);

  // ── PMI composite: mfg 40% + services 60% (spec weights)
  const mfgRaw  = fb ? fb.mPMI  : 0;   // encoded: +2=55+, +1=50-55, 0=48-50, -1=<48, -2=<45
  const svcRaw  = fb ? fb.sPMI  : 0;
  const pmiComp = mfgRaw * 0.40 + svcRaw * 0.60;
  const pmiSig  = _c2(pmiComp);

  // ── GDP surprise (actual vs forecast)
  let gdpSig = fb ? _c2(fb.gdp) : 0;

  // ── Retail Sales surprise
  const retailSig = fb ? _c2(fb.retailSal) : 0;

  // ── Consumer Confidence (proxy: encoded in retailSal for non-FRED currencies)
  let confSig = retailSig; // same source as fallback

  // ── Live FRED overrides for USD/EUR/GBP/JPY
  const fredKey = ["USD","EUR","GBP","JPY"].includes(ccyId) ? ccyId : null;
  if (fredKey && liveData.econ && liveData.econ[fredKey]) {
    const items = liveData.econ[fredKey];
    const gdpItem = items.find(i => i.l.toLowerCase().includes("gdp"));
    if (gdpItem?.s !== undefined) {
      // FRED surprise: s is ±0.5 at most → scale to [-2,+2]
      // Spec: diff>+1.0%→+2, diff>+0.3%→+1, etc.  (s≈diff/2.5 after normalization)
      const d = gdpItem.s * 2.5;  // un-normalize to approximate actual diff %
      gdpSig = d > 1.0 ? 2 : d > 0.3 ? 1 : d < -1.0 ? -2 : d < -0.3 ? -1 : 0;
    }
  }

  // Spec-weighted: PMI 35% + GDP 30% + Retail 20% + Confidence 15%
  const raw = pmiSig * 0.35 + gdpSig * 0.30 + retailSig * 0.20 + confSig * 0.15;
  return _c2(raw);
}

// ── FACTOR 4: INFLATION [-2, +2] — scored through CB reaction function ────
// Spec: raw CPI surprise × CB reaction multiplier (hawkish=1.0, neutral=0.4, dovish=−0.2)
// + core CPI trend (rising/falling 3m momentum)
function fxInflation(ccyId, liveData) {
  const fb = ASSETS_SCORED.find(a => a.id === ccyId);
  const cb = FX_CB_DATA[ccyId] || { stance: 0, trend: 0 };

  // Raw CPI surprise signal
  let cpiSig = fb ? _c2(fb.inflation) : 0;

  // Live FRED CPI override
  const fredKey = ["USD","EUR","GBP","JPY"].includes(ccyId) ? ccyId : null;
  if (fredKey && liveData.econ && liveData.econ[fredKey]) {
    const items  = liveData.econ[fredKey];
    const cpiItem = items.find(i => i.l.toLowerCase().includes("cpi"));
    if (cpiItem?.s !== undefined) {
      const d = cpiItem.s * 2.5; // un-normalize to approximate diff %
      // Spec: diff>+0.5%→+2, diff>+0.2%→+1, diff<-0.2%→-1, diff<-0.5%→-2
      cpiSig = d > 0.5 ? 2 : d > 0.2 ? 1 : d < -0.5 ? -2 : d < -0.2 ? -1 : 0;
    }
  }

  // CB reaction multiplier (spec-defined):
  // HAWKISH (stance≥+1):  +1.0 → inflation→hike→bullish CCY
  // NEUTRAL (stance= 0):  +0.4 → partial pass-through
  // DOVISH  (stance≤−1): −0.2 → behind curve → credibility risk
  const cbMult = cb.stance >= 1 ? 1.0 : cb.stance <= -1 ? -0.2 : 0.4;

  // Core CPI trend signal: cb.trend encodes direction (+1 hiking, -1 cutting)
  const coreTrend = cb.trend; // ±1 or 0

  // Spec blend: CPI×cbMult (65%) + core trend (35%)
  const raw = cpiSig * cbMult * 0.65 + coreTrend * 0.35 * 2;
  return _c2(raw);
}

// ── FACTOR 5: LABOR MARKET [-2, +2] ──────────────────────────────────────
// Spec: NFP/Employment (45%) + Unemployment trend (35%) + Jobless Claims (20%)
function fxLabor(ccyId, liveData) {
  const fb = ASSETS_SCORED.find(a => a.id === ccyId);

  // NFP / Employment Change surprise
  let nfpSig = fb ? _c2(fb.empChg) : 0;

  // Unemployment rate trend (falling=bullish, rising=bearish)
  // fb.unemploy: +2 falling strongly, +1 falling, 0 stable, -1 rising, -2 rising sharply
  const unempSig = fb ? _c2(fb.unemploy) : 0;

  // Jobless claims trend (proxy via fb.rates field for non-FRED currencies)
  let claimsSig = 0;

  // Live FRED override for main economies
  const fredKey = ["USD","EUR","GBP","JPY"].includes(ccyId) ? ccyId : null;
  if (fredKey && liveData.econ && liveData.econ[fredKey]) {
    const items    = liveData.econ[fredKey];
    const unempItem = items.find(i => i.l.toLowerCase().includes("unemploy"));
    if (unempItem?.s !== undefined) {
      // Surprise: lower unemp than expected = bullish
      const d = -unempItem.s * 2.5; // invert: negative surprise = rising unemp = bearish
      nfpSig = d > 150/1000 ? 2 : d > 50/1000 ? 1 : d < -150/1000 ? -2 : d < -50/1000 ? -1 : 0;
    }
  }

  // Spec blend: NFP 45% + Unemployment 35% + Claims 20%
  const raw = nfpSig * 0.45 + unempSig * 0.35 + claimsSig * 0.20;
  return _c2(raw);
}

// ── FACTOR 6: MONETARY POLICY [-2, +2] — THE MOST IMPORTANT FACTOR ───────
// Spec: CB stance (30%) + rate differential vs G8 avg (30%) + forward path OIS (25%) + surprise (15%)
// This is the primary driver of capital flows in FX.
function fxMonetaryPolicy(ccyId, liveData) {
  const cb = FX_CB_DATA[ccyId];
  if (!cb) {
    const fb = ASSETS_SCORED.find(a => a.id === ccyId);
    return fb ? _c2(fb.rates) : 0;
  }

  // ── Rate differential vs G8 average
  const allRates = Object.values(FX_CB_DATA).map(c => c.rate);
  const g8Avg    = allRates.reduce((s,v) => s+v, 0) / allRates.length;
  const diff     = cb.rate - g8Avg;
  // Spec: diff>+1.5%→+2, diff>+0.5%→+1, diff<-0.5%→-1, diff<-1.5%→-2
  const diffSig  = diff > 1.5 ? 2 : diff > 0.5 ? 1 : diff < -1.5 ? -2 : diff < -0.5 ? -1 : 0;

  // ── CB stance: directly from FX_CB_DATA (updated after each meeting)
  const stanceSig = Math.max(-2, Math.min(2, cb.stance));

  // ── Forward rate path: CB trend encodes expected direction
  // trend: +1 = hiking cycle, -1 = cutting cycle, 0 = on hold
  // Scale to +2/-2 range: strong hiking/cutting = ±1.5 → ±2 after clamp
  const trendSig = cb.trend; // −1/0/+1

  // ── Surprise premium: did FRED data show CB moved vs expectations?
  let surpriseSig = 0;
  const fredKey = ["USD","EUR","GBP","JPY"].includes(ccyId) ? ccyId : null;
  if (fredKey && liveData.econ && liveData.econ[fredKey]) {
    const items    = liveData.econ[fredKey];
    const rateItem = items.find(i => i.l.toLowerCase().includes("rate") &&
      (i.l.toLowerCase().includes("fed") || i.l.toLowerCase().includes("ecb") ||
       i.l.toLowerCase().includes("boe") || i.l.toLowerCase().includes("boj")));
    if (rateItem?.s !== undefined) {
      // Hawkish surprise (higher rate than expected) → bullish
      surpriseSig = rateItem.s > 0.3 ? 2 : rateItem.s > 0.1 ? 1
                  : rateItem.s < -0.3 ? -2 : rateItem.s < -0.1 ? -1 : 0;
      // Override stance with FRED-informed value
      stanceOverride = Math.max(-2, Math.min(2, stanceSig + Math.round(rateItem.s * 3)));
    }
  }
  const finalStance = typeof stanceOverride !== 'undefined' ? stanceOverride : stanceSig;

  // Spec blend: stance 30% + differential 30% + forward path 25% + surprise 15%
  const raw = finalStance * 0.30 + diffSig * 0.30 + trendSig * 0.25 * 2 + surpriseSig * 0.15 * 2;
  return _c2(raw);
}

// ── REGIME OVERLAY ────────────────────────────────────────────────────────
// Risk-on/off from Fear & Greed (VIX proxy). Applied after base score as additive adj.
// Spec: RISK_OFF → USD/JPY/CHF +0.3, AUD/NZD/CAD −0.3
//       RISK_ON  → AUD/NZD/GBP +0.2, USD/JPY/CHF −0.1
function _fxRegimeAdj(ccyId, regime) {
  const OVERLAY = {
    'RISK_OFF': { USD:+0.3, JPY:+0.3, CHF:+0.2, AUD:-0.3, NZD:-0.3, GBP:-0.1, CAD:-0.2, EUR: 0   },
    'RISK_ON':  { AUD:+0.2, NZD:+0.2, GBP:+0.1, USD:-0.1, JPY:-0.2, CHF:-0.1, CAD: 0,   EUR:+0.1 },
    'NEUTRAL':  {},
  };
  return (OVERLAY[regime] || {})[ccyId] || 0;
}

// ── DIVERGENCE DETECTION ─────────────────────────────────────────────────
// Spec: if technical signal ≠ macro signal → flag instability
function _fxDivergence(factors) {
  const tech  = factors.technical;
  const macro = (factors.growth + factors.inflation + factors.labor + factors.monetaryPolicy) / 4;
  if (Math.abs(tech) < 0.5 || Math.abs(macro) < 0.5) return null;
  if (tech > 1 && macro < -0.5)
    return { type:'BEARISH_DIVERGENCE', note:'Price strength not supported by macro — reversal risk' };
  if (tech < -1 && macro > 0.5)
    return { type:'BULLISH_DIVERGENCE', note:'Price weakness not aligned with macro — potential recovery' };
  return null;
}

// ── FULL CURRENCY SCORE ───────────────────────────────────────────────────
// Output: continuous score [-2.5, +2.5] + all sub-components for explainability
function scoreCurrency(ccyId, liveData) {
  // ── Factor scores
  const t   = fxTechnical(ccyId, liveData);
  const i   = fxInstitutional(ccyId, liveData);
  const g   = fxGrowth(ccyId, liveData);
  const inf = fxInflation(ccyId, liveData);
  const l   = fxLabor(ccyId, liveData);
  const mp  = fxMonetaryPolicy(ccyId, liveData);

  // ── Weighted sum (spec: T·20% I·20% G·20% Inf·15% L·10% MP·15% + Regime·5%)
  const W   = FX_WEIGHTS;
  const ws  = t*W.technical + i*W.institutional + g*W.growth +
              inf*W.inflation + l*W.labor + mp*W.monetaryPolicy;

  // ── Regime overlay (additive, max ±0.3, capped by total clamp)
  const fgScore = state.fgData?.length ? parseInt(state.fgData[0].value || '50') : 50;
  const regime  = fgScore < 35 ? 'RISK_OFF' : fgScore > 65 ? 'RISK_ON' : 'NEUTRAL';
  const regAdj  = _fxRegimeAdj(ccyId, regime);
  const wsFinal = _cf(ws + regAdj);

  // ── Display score (×5 → approximately −10 to +10 integer)
  const score = Math.max(-10, Math.min(10, Math.round(wsFinal * 5)));

  // ── Divergence
  const diverge = _fxDivergence({ technical:t, institutional:i, growth:g,
                                   inflation:inf, labor:l, monetaryPolicy:mp });

  // ── CB metadata
  const cb = FX_CB_DATA[ccyId] || { rate:0, stance:0, name:'', label:'' };

  // ── Momentum vs yesterday
  let delta = null;
  try {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yk = 'ef_fx_'+ccyId+'_'+yd.toISOString().split('T')[0];
    const yr = localStorage.getItem(yk);
    if (yr) delta = score - parseFloat(yr);
  } catch(e){}
  try {
    localStorage.setItem('ef_fx_'+ccyId+'_'+new Date().toISOString().split('T')[0], String(score));
  } catch(e){}

  return {
    currency: ccyId,
    score,
    wsRaw: wsFinal,          // continuous [-2.5,+2.5] for display
    components: {
      technical:      t,
      institutional:  i,
      growth:         g,
      inflation:      inf,
      labor:          l,
      monetaryPolicy: mp,
      // legacy aliases so existing UI code (which reads .cot / .sentiment / .jobs) still works
      cot:       i,
      sentiment: i,
      jobs:      l,
    },
    regime, regAdj,
    cbRate: cb.rate, cbStance: cb.stance, cbLabel: cb.label, cbName: cb.name,
    diverge, delta,
  };
}

// ── BUILD ALL CURRENCY SCORES ─────────────────────────────────────────────
function buildCurrencyScores(liveData) {
  const ld = liveData || {
    cotRows:   (state.cotData?.length) ? state.cotData : COT_DATA,
    sentiment: state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT,
    econ:      state.econData || FALLBACK_ECON,
    putCall:   state.putCallLive ? (state.putCallData||PUT_CALL) : PUT_CALL,
    aaiiData:  state.aaiiLive   ? (state.aaiiData   ||AAII)     : AAII,
    rates:     state.rates,
  };
  const CCY_IDS = ["USD","EUR","GBP","JPY","AUD","CAD","CHF","NZD"];
  const scores  = {};
  CCY_IDS.forEach(ccy => {
    const result     = scoreCurrency(ccy, ld);
    scores[ccy]      = result.score;
    scores['_detail_'+ccy] = result;
  });
  return scores;
}

// ── PAIR SCORE: BASE − QUOTE (only valid derivation per spec) ─────────────
function calculateForexScore(baseCcy, quoteCcy, ccyScores) {
  const baseScore  = ccyScores[baseCcy]  ?? 0;
  const quoteScore = ccyScores[quoteCcy] ?? 0;
  const pairScore  = baseScore - quoteScore;

  // Signal classification per spec thresholds (scaled: ×5 means ±10 range)
  // Spec: ≥+1.5→Strong Bull, +0.5–+1.5→Bull, −0.5–+0.5→Neutral, etc.
  // Scaled to integer: ×5 → ≥+7.5≈8→Strong Bull, ≥+2.5≈3→Bull
  const bias =
    pairScore >=  8 ? 'Strong Bull' :
    pairScore >=  3 ? 'Bullish'     :
    pairScore <= -8 ? 'Strong Bear' :
    pairScore <= -3 ? 'Bearish'     : 'Neutral';

  const baseDetail  = ccyScores['_detail_'+baseCcy]  || null;
  const quoteDetail = ccyScores['_detail_'+quoteCcy] || null;

  // Regime label for the pair
  const fgScore = state.fgData?.length ? parseInt(state.fgData[0].value||'50') : 50;
  const regime  = fgScore < 35 ? 'Risk-Off' : fgScore > 65 ? 'Risk-On' : 'Neutral Regime';

  return { base:baseCcy, quote:quoteCcy, baseScore, quoteScore, pairScore, bias,
           baseDetail, quoteDetail, regime };
}

function buildFXDifferential(pairData) {
  const base  = pairData.baseDetail;
  const quote = pairData.quoteDetail;
  if (!base || !quote) return null;
  const bc = base.components || {}, qc = quote.components || {};
  const sN = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
  const mkDiff = (bk, qk) => {
    const bv = sN(bc[bk]), qv = sN(qc[qk||bk]), d = bv - qv;
    return { base:bv, quote:qv, diff:d, bias:d>=1?'Bullish':d<=-1?'Bearish':'Neutral' };
  };
  const techD=mkDiff('technical'), instD=mkDiff('institutional');
  const growD=mkDiff('growth'), inflD=mkDiff('inflation'), laborD=mkDiff('labor');
  const mpRaw = sN(base.cbStance) - sN(quote.cbStance);
  const mpD   = { base:sN(base.cbStance), quote:sN(quote.cbStance), diff:mpRaw,
                  bias:mpRaw>=1?'Bullish':mpRaw<=-1?'Bearish':'Neutral' };
  return {
    pair:pairData.base+pairData.quote, signal:pairData.bias,
    finalScore:pairData.pairScore??(base.score-quote.score),
    summary:{ growth:growD.bias, inflation:inflD.bias, monetary:mpD.bias, institutional:instD.bias },
    differentials:{ technical:techD, institutional:instD, growth:growD, inflation:inflD, labor:laborD, monetaryPolicy:mpD },
    weights:FX_WEIGHTS, baseScore:base.score, quoteScore:quote.score,
    regime:pairData.regime, divergence:base.diverge||quote.diverge||null,
  };
}
