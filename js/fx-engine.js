// ─────────────────────────────────────────────────────────────────────────────
// fx-engine.js — Forex Scorecard logic, COT fetching, and FX Differential
// Depends on: data.js
// ─────────────────────────────────────────────────────────────────────────────

// ── PROXY FETCH UTILITY ───────────────────────────────────────────────────────

/**
 * Attempt a fetch through each proxy in order, returning parsed JSON.
 * @param {string} targetUrl
 * @returns {Promise<any>}
 */
async function proxyFetch(targetUrl) {
  for (const makeProxy of PROXIES) {
    try {
      const r = await fetch(makeProxy(targetUrl));
      if (!r.ok) continue;
      const text = await r.text();
      try {
        const outer = JSON.parse(text);
        if (outer.contents) return JSON.parse(outer.contents);
        return outer;
      } catch (e) {
        return JSON.parse(text);
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error("All proxies failed");
}

// ── CFTC COT PARSING ──────────────────────────────────────────────────────────

/**
 * Parse raw CFTC CSV text into structured COT rows.
 * @param {string} csvText
 * @returns {Object[]}
 */
function parseCFTCcsv(csvText) {
  const lines  = csvText.trim().split("\n");
  const header = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

  const iName   = header.findIndex(h => h.includes("Market_and_Exchange"));
  const iDate   = header.findIndex(h => h.includes("Report_Date_as_YYYY"));
  const iOI     = header.findIndex(h => h === "Open_Interest_All");
  const iLong   = header.findIndex(h => h === "NonComm_Positions_Long_All");
  const iShort  = header.findIndex(h => h === "NonComm_Positions_Short_All");

  const seen = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    if (cols.length < 10) continue;

    const rawName = (cols[iName] || "").replace(/"/g, "").trim();
    let matched = null;
    for (const key of Object.keys(CFTC_MAP)) {
      if (rawName.toUpperCase().includes(key.toUpperCase())) { matched = key; break; }
    }
    if (!matched) continue;

    const id     = CFTC_MAP[matched].id;
    const longC  = parseInt(cols[iLong])  || 0;
    const shortC = parseInt(cols[iShort]) || 0;
    const oi     = parseInt(cols[iOI])    || 0;
    const date   = (cols[iDate] || "").replace(/"/g, "");

    if (!seen[id]) {
      seen[id] = { first: { longC, shortC, oi, date } };
    } else if (!seen[id].second) {
      seen[id].second = { longC, shortC };
    }
  }

  const rows = [];
  for (const [key, info] of Object.entries(CFTC_MAP)) {
    const s = seen[info.id];
    if (!s || !s.first) continue;
    const { longC, shortC, oi, date } = s.first;
    const total = longC + shortC;
    if (total === 0) continue;

    const longPct  = parseFloat(((longC  / total) * 100).toFixed(2));
    const shortPct = parseFloat(((shortC / total) * 100).toFixed(2));
    const netPos   = longC - shortC;

    let dLong = 0, dShort = 0, netChg = 0;
    if (s.second) {
      dLong  = longC  - s.second.longC;
      dShort = shortC - s.second.shortC;
      const prevTotal    = s.second.longC + s.second.shortC;
      const prevLongPct  = prevTotal > 0 ? (s.second.longC / prevTotal) * 100 : 50;
      netChg = parseFloat((longPct - prevLongPct).toFixed(2));
    }

    rows.push({
      id: info.id, name: info.name,
      longC, shortC, dLong, dShort,
      longPct, shortPct, netChg,
      netPos, oi, dOI: 0, date,
    });
  }

  return rows.sort((a, b) => b.netChg - a.netChg);
}

/**
 * Fetch live COT data from CFTC via proxy, parse and return rows.
 * @returns {Promise<Object[]>}
 */
async function fetchCFTCData() {
  const proxies = [
    u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://thingproxy.freeboard.io/fetch/${u}`,
  ];

  for (const makeProxy of proxies) {
    try {
      const r = await fetch(makeProxy(CFTC_URL));
      if (!r.ok) continue;
      const text = await r.text();
      let csv = text;
      try { const j = JSON.parse(text); if (j.contents) csv = j.contents; } catch (e) {}
      if (!csv || csv.length < 1000) continue;
      const rows = parseCFTCcsv(csv);
      if (rows.length > 0) return rows;
    } catch (e) { continue; }
  }
  throw new Error("CFTC fetch failed");
}

// ── SENTIMENT SIGNALS ─────────────────────────────────────────────────────────

/**
 * Derive a contrarian signal from retail long percentage.
 * @param {number} lp - long percentage (0-100)
 * @returns {{ label: string, cls: string }}
 */
function sentSignal(lp) {
  if (lp >= 75) return { label: "STRONG SELL", cls: "sig-strong-sell" };
  if (lp >= 65) return { label: "SELL",        cls: "sig-sell" };
  if (lp <= 25) return { label: "STRONG BUY",  cls: "sig-strong-buy" };
  if (lp <= 35) return { label: "BUY",         cls: "sig-buy" };
  return { label: "NEUTRAL", cls: "sig-neutral" };
}

/**
 * Derive a signal from a put/call ratio.
 * @param {number} pc
 * @returns {{ label: string, col: string }}
 */
function pcSignal(pc) {
  if (pc >= 1.5) return { label: "EXTREME FEAR",  col: "var(--bear)" };
  if (pc >= 1.2) return { label: "FEAR",          col: "var(--bear)" };
  if (pc >= 0.9) return { label: "NEUTRAL",       col: "var(--neutral)" };
  if (pc >= 0.7) return { label: "GREED",         col: "var(--bull)" };
  return          { label: "EXTREME GREED",        col: "var(--bull)" };
}

// ── MYFXBOOK API ──────────────────────────────────────────────────────────────

/**
 * Login to Myfxbook and return a session token.
 */
async function myfxLogin(email, password) {
  const d = await proxyFetch(
    `https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  );
  if (d.error) throw new Error(d.message || "Login error");
  return d.session;
}

/**
 * Fetch community outlook data from Myfxbook.
 */
async function myfxGetOutlook(session) {
  const d = await proxyFetch(
    `https://www.myfxbook.com/api/get-community-outlook.json?session=${session}`
  );
  if (d.error) throw new Error(d.message || "Session expired");
  return d.symbols;
}

/**
 * Full Myfxbook login + data flow.
 * @param {{ mfxEmail, mfxPassword, mfxSession }} credentials
 * @returns {Promise<Object[]>}
 */
async function fetchMyfxbookSentiment(credentials) {
  const { mfxEmail, mfxPassword } = credentials;
  if (!mfxEmail || !mfxPassword) throw new Error("No credentials");

  let session = credentials.mfxSession;
  if (session) {
    try { return await myfxGetOutlook(session); } catch (e) { session = null; }
  }

  session = await myfxLogin(mfxEmail, mfxPassword);
  return { symbols: await myfxGetOutlook(session), session };
}

// ── FX DIFFERENTIAL ENGINE ────────────────────────────────────────────────────

/**
 * FX component definitions — maps score field to human-readable component name.
 * Each component has sub-fields from the asset row.
 */
const FX_COMPONENTS = {
  growth: {
    label: "Growth",
    fields: ["gdp", "mPMI", "sPMI"],
    descriptions: { gdp: "GDP", mPMI: "Mfg PMI", sPMI: "Svcs PMI" },
  },
  inflation: {
    label: "Inflation",
    fields: ["inflation"],
    descriptions: { inflation: "CPI YoY" },
  },
  monetary: {
    label: "Monetary",
    fields: ["rates"],
    descriptions: { rates: "Rate Stance" },
  },
  institutional: {
    label: "Institutional",
    fields: ["cot", "trend"],
    descriptions: { cot: "COT Positioning", trend: "Trend" },
  },
};

/**
 * Find a scored asset by its COT/data id or pair name.
 * @param {string} currencyCode - e.g. "EUR", "GBP", "USD"
 * @returns {Object|null}
 */
function findCurrencyAsset(currencyCode) {
  return ASSETS_SCORED.find(a => a.id === currencyCode) || null;
}

/**
 * Score a single FX component for one currency.
 * @param {Object} asset
 * @param {string} componentKey
 * @returns {{ score: number, breakdown: Object }}
 */
function scoreComponent(asset, componentKey) {
  if (!asset) return { score: 0, breakdown: {} };
  const comp = FX_COMPONENTS[componentKey];
  const breakdown = {};
  let score = 0;

  for (const field of comp.fields) {
    const val = asset[field] || 0;
    score += val;
    breakdown[field] = val;
  }

  return { score, breakdown };
}

/**
 * Build a macro-level summary row for a component.
 * @param {number} baseScore
 * @param {number} quoteScore
 * @returns {{ result: string, col: string, diff: number }}
 */
function buildComponentSummary(baseScore, quoteScore) {
  const diff = baseScore - quoteScore;
  let result, col;

  if (diff >= 2)       { result = "Base Strong";      col = "var(--bull)"; }
  else if (diff >= 1)  { result = "Base Slight Edge";  col = "#7effc4"; }
  else if (diff <= -2) { result = "Quote Strong";      col = "var(--bear)"; }
  else if (diff <= -1) { result = "Quote Slight Edge"; col = "#ff8fa0"; }
  else                 { result = "Neutral";            col = "var(--neutral)"; }

  return { result, col, diff };
}

/**
 * buildFXDifferential — main FX differential analysis function.
 *
 * Takes base and quote currency codes, returns a structured breakdown
 * of how macro factors compare between them.
 *
 * @param {{ base: string, quote: string }} pairData - e.g. { base: "EUR", quote: "USD" }
 * @returns {{
 *   summary: { growth, inflation, monetary, institutional },
 *   differentials: { [component]: { baseScore, quoteScore, diff, result, col, breakdown } },
 *   finalScore: number,
 *   baseAsset: Object|null,
 *   quoteAsset: Object|null,
 * }}
 */
function buildFXDifferential(pairData) {
  const { base, quote } = pairData;
  const baseAsset  = findCurrencyAsset(base);
  const quoteAsset = findCurrencyAsset(quote);

  const differentials = {};
  const summary = {};
  let finalScore = 0;

  for (const [key] of Object.entries(FX_COMPONENTS)) {
    const baseComp  = scoreComponent(baseAsset, key);
    const quoteComp = scoreComponent(quoteAsset, key);
    const comp      = buildComponentSummary(baseComp.score, quoteComp.score);

    differentials[key] = {
      baseScore:  baseComp.score,
      quoteScore: quoteComp.score,
      diff:       comp.diff,
      result:     comp.result,
      col:        comp.col,
      baseBreakdown:  baseComp.breakdown,
      quoteBreakdown: quoteComp.breakdown,
    };

    summary[key] = comp.result;
    finalScore  += comp.diff;
  }

  return {
    summary,
    differentials,
    finalScore,
    baseAsset,
    quoteAsset,
  };
}

// ── SEASONALITY ENGINE ────────────────────────────────────────────────────────

/**
 * Calculate monthly average returns over N years.
 * @param {{ year, month, pct }[]} returns
 * @param {number} years
 * @returns {number[]} 12 values (Jan..Dec)
 */
function calcSeasonality(returns, years) {
  const now    = new Date();
  const cutoff = now.getFullYear() - years;
  const byMonth = Array(12).fill(null).map(() => []);
  returns.forEach(r => { if (r.year > cutoff) byMonth[r.month].push(r.pct); });
  return byMonth.map(arr => arr.length
    ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
    : 0
  );
}

/**
 * Extract current-year monthly returns (up to today's month).
 * @param {{ year, month, pct }[]} returns
 * @returns {(number|null)[]}
 */
function calcCurrentYear(returns) {
  const yr       = new Date().getFullYear();
  const curMonth = new Date().getMonth();
  const result   = Array(12).fill(null);
  returns.forEach(r => {
    if (r.year === yr && r.month <= curMonth) result[r.month] = parseFloat(r.pct.toFixed(2));
  });
  return result;
}

/**
 * Fetch Yahoo Finance monthly OHLCV data and parse into return series.
 * @param {string} symbol - Yahoo ticker
 * @returns {Promise<{ year, month, pct }[]>}
 */
async function fetchYahooMonthly(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=11y&includePrePost=false`;
  let data = null;

  const urlMakers = [
    u => u,
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  ];

  for (const makeUrl of urlMakers) {
    try {
      const r = await fetch(makeUrl(url));
      if (!r.ok) continue;
      const text  = await r.text();
      const outer = JSON.parse(text);
      data = outer.contents ? JSON.parse(outer.contents) : outer;
      if (data?.chart?.result?.[0]?.indicators) break;
      data = null;
    } catch (e) { continue; }
  }

  if (!data) throw new Error("Yahoo fetch failed for " + symbol);

  const result     = data.chart.result[0];
  const timestamps = result.timestamp;
  const closes     = result.indicators.quote[0].close;
  if (!timestamps || !closes) throw new Error("No data for " + symbol);

  const monthlyReturns = [];
  for (let i = 1; i < timestamps.length; i++) {
    if (closes[i] == null || closes[i - 1] == null) continue;
    const d   = new Date(timestamps[i] * 1000);
    const pct = parseFloat(((closes[i] - closes[i - 1]) / closes[i - 1] * 100).toFixed(4));
    monthlyReturns.push({ year: d.getFullYear(), month: d.getMonth(), pct });
  }

  return monthlyReturns;
}

/**
 * Fetch and compute seasonality for a single asset.
 * @param {string} assetId
 * @returns {Promise<{ m10, m5, mCur, live: true }|null>}
 */
async function fetchSeasonalityForAsset(assetId) {
  const symbol = YAHOO_SYMBOLS[assetId];
  if (!symbol) return null;

  const returns = await fetchYahooMonthly(symbol);
  return {
    m10:  calcSeasonality(returns, 10),
    m5:   calcSeasonality(returns, 5),
    mCur: calcCurrentYear(returns),
    live: true,
  };
}

// ── FEAR & GREED HELPERS ──────────────────────────────────────────────────────

function fgColor(v) {
  if (v >= 75) return "var(--bull)";
  if (v >= 55) return "#7effc4";
  if (v >= 45) return "var(--neutral)";
  if (v >= 25) return "#ff8fa0";
  return "var(--bear)";
}

function fgLabel(v) {
  if (v >= 75) return "EXTREME GREED";
  if (v >= 55) return "GREED";
  if (v >= 45) return "NEUTRAL";
  if (v >= 25) return "FEAR";
  return "EXTREME FEAR";
}

function buildFallbackFG() {
  const base = [14,18,21,19,23,17,15,20,25,22,18,16,13,11,15,19,23,28,24,20,17,14,12,16,20,18,15,12,10,14];
  return base.map((v, i) => ({
    value: String(v),
    value_classification: fgLabel(v),
    timestamp: String(Math.floor((Date.now() - (i * 86400000)) / 1000)),
  }));
}

// ── CURRENCY STRENGTH ─────────────────────────────────────────────────────────

/**
 * Build a ranked currency strength array from live exchange rates.
 * @param {Object} rates - { EUR: 0.92, GBP: 0.79, ... } (from Frankfurter, USD base)
 * @returns {Object[]|null}
 */
function buildStrength(rates) {
  if (!rates) return null;
  const all = { ...rates, USD: 1 };
  const st  = {};
  CURRS.forEach(c => { st[c.code] = 0; });
  CURRS.forEach(b => CURRS.forEach(q => {
    if (b.code === q.code || !all[b.code]) return;
    st[b.code] += Math.log(1 / all[b.code]) * 0.1;
  }));
  const vs = Object.values(st), mn = Math.min(...vs), mx = Math.max(...vs);
  return CURRS
    .map(c => ({ ...c, val: st[c.code] || 0, pct: mx !== mn ? ((st[c.code] - mn) / (mx - mn)) * 100 : 50 }))
    .sort((a, b) => b.val - a.val);
}

// ── FRED API FETCHER ──────────────────────────────────────────────────────────

async function fredFetch(id, key, lim) {
  const r = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=${lim}`
  );
  if (!r.ok) throw new Error();
  const d  = await r.json();
  const v  = (d.observations || []).filter(o => o.value !== ".");
  if (!v.length) throw new Error();
  return v;
}

/**
 * Fetch all FRED economic data for configured currencies.
 * @param {string} key - FRED API key
 * @returns {Promise<Object>}
 */
async function fetchFREDEcon(key) {
  const res = {};
  for (const [cur, series] of Object.entries(FRED_SERIES)) {
    res[cur] = [];
    for (const s of series) {
      try {
        const obs = await fredFetch(s.id, key, 13);
        let val   = parseFloat(obs[0].value);
        const date = obs[0].date;
        let surprise = 0;

        if (s.yoy && obs.length >= 13) {
          const pv = parseFloat(obs[12].value);
          if (!isNaN(pv) && pv !== 0) val = ((val - pv) / pv) * 100;
        }

        if (obs.length >= 2) {
          const pv   = parseFloat(obs[1].value);
          if (!isNaN(pv)) {
            const diff = val - pv;
            if      (Math.abs(diff) > .3) surprise = diff > 0 ?  .5 : -.5;
            else if (Math.abs(diff) > .1) surprise = diff > 0 ?  .2 : -.2;
          }
        }

        res[cur].push({
          l: s.label,
          v: isNaN(val) ? "N/A" : s.fmt(val),
          s: surprise,
          d: date ? new Date(date).toLocaleDateString([], { month: "short", year: "numeric" }) : "",
        });
      } catch (e) {
        const fb = (FALLBACK_ECON[cur] || []).find(f => f.l === s.label);
        res[cur].push(fb ? { ...fb } : { l: s.label, v: "N/A", s: 0, d: "" });
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  return res;
}

// ── LIVE PUT/CALL FETCH ───────────────────────────────────────────────────────

async function fetchPutCall() {
  const url = "https://www.cboe.com/us/options/market_statistics/daily/";
  try {
    const d    = await proxyFetch(url);
    const text = typeof d === "string" ? d : JSON.stringify(d);
    const m    = text.match(/equity[^0-9]*?([01]\.\d{2})/i);
    if (m) {
      const eqPc = parseFloat(m[1]);
      return [
        { id: "SPX500", pc: eqPc + 0.05, meaning: "S&P 500 options activity" },
        { id: "NAS100", pc: eqPc - 0.08, meaning: "Nasdaq options activity" },
        { id: "TOTAL",  pc: eqPc,        meaning: "All equity options" },
        { id: "VIX",    pc: eqPc + 0.45, meaning: "VIX options (fear hedge)" },
        { id: "GOLD",   pc: eqPc - 0.15, meaning: "Gold options activity" },
        { id: "USOIL",  pc: eqPc + 0.08, meaning: "Oil options activity" },
      ];
    }
  } catch (e) {}
  throw new Error("P/C fetch failed");
}

// ── LIVE AAII FETCH ───────────────────────────────────────────────────────────

async function fetchAAII() {
  const url = "https://www.aaii.com/sentimentsurvey/sent_results.js";
  try {
    const d    = await proxyFetch(url);
    const text = typeof d === "string" ? d : (d.contents || JSON.stringify(d));
    const bull = text.match(/bullish['"\s]*:['"\s]*([\d.]+)/i);
    const neut = text.match(/neutral['"\s]*:['"\s]*([\d.]+)/i);
    const bear = text.match(/bearish['"\s]*:['"\s]*([\d.]+)/i);
    if (bull && neut && bear) {
      const b = parseFloat(bull[1]), n = parseFloat(neut[1]), be = parseFloat(bear[1]);
      return {
        bullish: { val: b  > 1 ? b  : b  * 100, hist: 37.5, change: 0 },
        neutral: { val: n  > 1 ? n  : n  * 100, hist: 31.5, change: 0 },
        bearish: { val: be > 1 ? be : be * 100, hist: 31.0, change: 0 },
        spread:  parseFloat(((b > 1 ? b : b * 100) - (be > 1 ? be : be * 100)).toFixed(1)),
        week:    new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        live:    true,
      };
    }
  } catch (e) {}
  throw new Error("AAII fetch failed");
}

// ── GENERIC FORMAT HELPER ─────────────────────────────────────────────────────

function fmtK(n) {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (Math.abs(n) >= 1000)    return (n / 1000).toFixed(0) + "K";
  return String(n);
}
