// ─────────────────────────────────────────────────────────────────────────────
// data.js — All static and fallback data for EdgeFinder Pro
// ─────────────────────────────────────────────────────────────────────────────

// ── TABS DEFINITION ──────────────────────────────────────────────────────────
const TABS_DEF = [
  { id: "setups",      label: "⚡ Top Setups" },
  { id: "cot",         label: "🏦 COT Data" },
  { id: "sentiment",   label: "😊 Sentiment" },
  { id: "econ",        label: "🌡 Economic" },
  { id: "currency",    label: "💱 Currency" },
  { id: "carry",       label: "🎯 Carry Trade" },
  { id: "feargreed",   label: "😨 Fear/Greed" },
  { id: "seasonality", label: "🌱 Seasonality" },
  { id: "settings",    label: "⚙ Settings" },
];

// ── FALLBACK SENTIMENT DATA ───────────────────────────────────────────────────
const FALLBACK_SENTIMENT = [
  { name: "EURUSD",  longPercentage: 38, shortPercentage: 62, longVolume: 12450,  shortVolume: 20300,  longPositions: 1240,  shortPositions: 2030 },
  { name: "GBPUSD",  longPercentage: 61, shortPercentage: 39, longVolume: 8900,   shortVolume: 5700,   longPositions: 890,   shortPositions: 570 },
  { name: "USDJPY",  longPercentage: 72, shortPercentage: 28, longVolume: 15600,  shortVolume: 6100,   longPositions: 1560,  shortPositions: 610 },
  { name: "AUDUSD",  longPercentage: 44, shortPercentage: 56, longVolume: 6200,   shortVolume: 7900,   longPositions: 620,   shortPositions: 790 },
  { name: "USDCAD",  longPercentage: 29, shortPercentage: 71, longVolume: 4100,   shortVolume: 10000,  longPositions: 410,   shortPositions: 1000 },
  { name: "USDCHF",  longPercentage: 55, shortPercentage: 45, longVolume: 5500,   shortVolume: 4500,   longPositions: 550,   shortPositions: 450 },
  { name: "NZDUSD",  longPercentage: 48, shortPercentage: 52, longVolume: 3200,   shortVolume: 3500,   longPositions: 320,   shortPositions: 350 },
  { name: "GBPJPY",  longPercentage: 65, shortPercentage: 35, longVolume: 7800,   shortVolume: 4200,   longPositions: 780,   shortPositions: 420 },
  { name: "EURJPY",  longPercentage: 68, shortPercentage: 32, longVolume: 9100,   shortVolume: 4300,   longPositions: 910,   shortPositions: 430 },
  { name: "AUDJPY",  longPercentage: 59, shortPercentage: 41, longVolume: 4400,   shortVolume: 3100,   longPositions: 440,   shortPositions: 310 },
  { name: "EURGBP",  longPercentage: 42, shortPercentage: 58, longVolume: 5100,   shortVolume: 7000,   longPositions: 510,   shortPositions: 700 },
  { name: "XAUUSD",  longPercentage: 74, shortPercentage: 26, longVolume: 22000,  shortVolume: 7700,   longPositions: 2200,  shortPositions: 770 },
  { name: "XAGUSD",  longPercentage: 69, shortPercentage: 31, longVolume: 8800,   shortVolume: 3900,   longPositions: 880,   shortPositions: 390 },
  { name: "USOIL",   longPercentage: 58, shortPercentage: 42, longVolume: 14500,  shortVolume: 10500,  longPositions: 1450,  shortPositions: 1050 },
  { name: "US500",   longPercentage: 66, shortPercentage: 34, longVolume: 18000,  shortVolume: 9300,   longPositions: 1800,  shortPositions: 930 },
  { name: "NAS100",  longPercentage: 67, shortPercentage: 33, longVolume: 16000,  shortVolume: 7900,   longPositions: 1600,  shortPositions: 790 },
  { name: "US30",    longPercentage: 63, shortPercentage: 37, longVolume: 11000,  shortVolume: 6500,   longPositions: 1100,  shortPositions: 650 },
  { name: "BTCUSD",  longPercentage: 31, shortPercentage: 69, longVolume: 9200,   shortVolume: 20500,  longPositions: 920,   shortPositions: 2050 },
  { name: "ETHUSD",  longPercentage: 28, shortPercentage: 72, longVolume: 7100,   shortVolume: 18200,  longPositions: 710,   shortPositions: 1820 },
];

// ── SMART MONEY vs RETAIL ────────────────────────────────────────────────────
const SMART_MONEY = [
  { id: "EURUSD", retailLong: 38, institutionalLong: 67 },
  { id: "GBPUSD", retailLong: 61, institutionalLong: 70 },
  { id: "USDJPY", retailLong: 72, institutionalLong: 31 },
  { id: "AUDUSD", retailLong: 44, institutionalLong: 54 },
  { id: "USDCAD", retailLong: 29, institutionalLong: 21 },
  { id: "XAUUSD", retailLong: 74, institutionalLong: 84 },
  { id: "USOIL",  retailLong: 58, institutionalLong: 69 },
  { id: "US500",  retailLong: 66, institutionalLong: 51 },
  { id: "BTCUSD", retailLong: 31, institutionalLong: 48 },
  { id: "GBPJPY", retailLong: 65, institutionalLong: 35 },
  { id: "EURJPY", retailLong: 68, institutionalLong: 28 },
  { id: "NZDUSD", retailLong: 48, institutionalLong: 52 },
];

// ── PUT/CALL RATIO ────────────────────────────────────────────────────────────
const PUT_CALL = [
  { id: "SPX500", pc: 0.82, meaning: "More calls = bullish bias" },
  { id: "NAS100", pc: 0.74, meaning: "Strong call buying = very bullish" },
  { id: "VIX",    pc: 1.45, meaning: "High put buying on VIX = hedging" },
  { id: "GOLD",   pc: 0.65, meaning: "Strong call buying = bullish" },
  { id: "USOIL",  pc: 0.91, meaning: "Balanced options activity" },
  { id: "BTCUSD", pc: 0.58, meaning: "Heavy call buying = bullish" },
  { id: "EURUSD", pc: 1.12, meaning: "Slight put bias = mild bearish" },
  { id: "USDJPY", pc: 1.38, meaning: "Heavy put buying = bearish" },
  { id: "XAUUSD", pc: 0.71, meaning: "Strong call buying = bullish" },
  { id: "US10T",  pc: 1.89, meaning: "Heavy put buying = very bearish bonds" },
];

// ── AAII SENTIMENT SURVEY ─────────────────────────────────────────────────────
const AAII = {
  bullish: { val: 28.4, hist: 37.5, change: -2.1 },
  neutral: { val: 31.2, hist: 31.5, change: 0.8 },
  bearish: { val: 40.4, hist: 31.0, change: 1.3 },
  spread: -12.0,
  week: "Mar 13, 2026",
};

// ── SENTIMENT EXTREMES ────────────────────────────────────────────────────────
const EXTREMES = [
  { id: "US10T",  direction: "EXTREME SHORT", retailPct: 22, historicalAvg: 45, deviation: -23, signal: "CONTRARIAN BUY",  strength: "Strong" },
  { id: "USDJPY", direction: "EXTREME LONG",  retailPct: 72, historicalAvg: 50, deviation: +22, signal: "CONTRARIAN SELL", strength: "Strong" },
  { id: "XAUUSD", direction: "EXTREME LONG",  retailPct: 74, historicalAvg: 55, deviation: +19, signal: "CONTRARIAN SELL", strength: "Strong" },
  { id: "ETHUSD", direction: "EXTREME SHORT", retailPct: 28, historicalAvg: 48, deviation: -20, signal: "CONTRARIAN BUY",  strength: "Strong" },
  { id: "BTCUSD", direction: "EXTREME SHORT", retailPct: 31, historicalAvg: 52, deviation: -21, signal: "CONTRARIAN BUY",  strength: "Strong" },
  { id: "EURJPY", direction: "EXTREME LONG",  retailPct: 68, historicalAvg: 50, deviation: +18, signal: "CONTRARIAN SELL", strength: "Moderate" },
  { id: "GBPJPY", direction: "EXTREME LONG",  retailPct: 65, historicalAvg: 50, deviation: +15, signal: "CONTRARIAN SELL", strength: "Moderate" },
  { id: "NAS100", direction: "EXTREME LONG",  retailPct: 67, historicalAvg: 52, deviation: +15, signal: "CONTRARIAN SELL", strength: "Moderate" },
  { id: "USDCAD", direction: "EXTREME SHORT", retailPct: 29, historicalAvg: 45, deviation: -16, signal: "CONTRARIAN BUY",  strength: "Moderate" },
];

// ── COT DATA (CFTC Fallback) ──────────────────────────────────────────────────
const COT_DATA = [
  { id: "AUD",      longC: 101462, shortC: 86934,   dLong: 19538,  dShort: -6238,  longPct: 53.86, shortPct: 46.14, netChg: 7.07,  netPos: 14528,    oi: 201000,  dOI: 24590 },
  { id: "PLATINUM", longC: 46316,  shortC: 18184,   dLong: 213,    dShort: -3518,  longPct: 71.81, shortPct: 28.19, netChg: 3.81,  netPos: 28132,    oi: 73000,   dOI: -2535 },
  { id: "SPX",      longC: 310790, shortC: 302790,  dLong: 20074,  dShort: -24059, longPct: 50.65, shortPct: 49.35, netChg: 3.58,  netPos: 8000,     oi: 2092000, dOI: 36417 },
  { id: "NZD",      longC: 29168,  shortC: 27198,   dLong: 2693,   dShort: -735,   longPct: 51.75, shortPct: 48.25, netChg: 3.09,  netPos: 1970,     oi: 61000,   dOI: 6091 },
  { id: "COPPER",   longC: 108421, shortC: 65229,   dLong: 12159,  dShort: 2097,   longPct: 62.44, shortPct: 37.56, netChg: 2.04,  netPos: 43192,    oi: 241000,  dOI: 14446 },
  { id: "ZAR",      longC: 35100,  shortC: 2161,    dLong: -544,   dShort: -849,   longPct: 94.20, shortPct: 5.80,  netChg: 1.99,  netPos: 32939,    oi: 41000,   dOI: -734 },
  { id: "GBP",      longC: 161469, shortC: 67704,   dLong: 6144,   dShort: -629,   longPct: 70.46, shortPct: 29.54, netChg: 1.01,  netPos: 93765,    oi: 257000,  dOI: 5671 },
  { id: "DOW",      longC: 25145,  shortC: 8095,    dLong: 1922,   dShort: 308,    longPct: 75.65, shortPct: 24.35, netChg: 0.76,  netPos: 17050,    oi: 90000,   dOI: 1925 },
  { id: "NIKKEI",   longC: 5851,   shortC: 2379,    dLong: -1354,  dShort: -582,   longPct: 71.09, shortPct: 28.91, netChg: 0.22,  netPos: 3472,     oi: 35000,   dOI: -1527 },
  { id: "USOIL",    longC: 294894, shortC: 135286,  dLong: 3465,   dShort: 2454,   longPct: 68.55, shortPct: 31.45, netChg: -0.14, netPos: 159608,   oi: 1771000, dOI: -9057 },
  { id: "BTC",      longC: 23406,  shortC: 25090,   dLong: -450,   dShort: -312,   longPct: 48.26, shortPct: 51.74, netChg: -0.17, netPos: -1684,    oi: 29000,   dOI: -2003 },
  { id: "Gold",     longC: 370051, shortC: 70120,   dLong: -17521, dShort: -2062,  longPct: 84.07, shortPct: 15.93, netChg: -0.23, netPos: 299931,   oi: 533000,  dOI: -31533 },
  { id: "RUSSELL",  longC: 85570,  shortC: 65221,   dLong: 228,    dShort: 1786,   longPct: 56.75, shortPct: 43.25, netChg: -0.61, netPos: 20349,    oi: 452000,  dOI: 9512 },
  { id: "NASDAQ",   longC: 56497,  shortC: 40418,   dLong: 3882,   dShort: 3842,   longPct: 58.30, shortPct: 41.70, netChg: -0.70, netPos: 16079,    oi: 234000,  dOI: 6362 },
  { id: "CAD",      longC: 25151,  shortC: 95154,   dLong: -154,   dShort: 4260,   longPct: 20.91, shortPct: 79.09, netChg: -0.87, netPos: -70003,   oi: 216000,  dOI: 2880 },
  { id: "SILVER",   longC: 75588,  shortC: 18664,   dLong: -5441,  dShort: -167,   longPct: 80.20, shortPct: 19.80, netChg: -0.94, netPos: 56924,    oi: 145000,  dOI: -5314 },
  { id: "USD",      longC: 13829,  shortC: 13675,   dLong: -2695,  dShort: -1890,  longPct: 50.28, shortPct: 49.72, netChg: -1.21, netPos: 154,      oi: 26000,   dOI: -708 },
  { id: "US10T",    longC: 454080, shortC: 1597969, dLong: -13748, dShort: 104863, longPct: 22.13, shortPct: 77.87, netChg: -1.73, netPos: -1143889, oi: 4969000, dOI: 27266 },
  { id: "JPY",      longC: 95513,  shortC: 38741,   dLong: -9177,  dShort: 62,     longPct: 71.14, shortPct: 28.86, netChg: -1.88, netPos: 56772,    oi: 196000,  dOI: -11502 },
  { id: "EUR",      longC: 220000, shortC: 110000,  dLong: 8500,   dShort: -3200,  longPct: 66.67, shortPct: 33.33, netChg: 1.20,  netPos: 110000,   oi: 380000,  dOI: 5300 },
  { id: "CHF",      longC: 12000,  shortC: 48000,   dLong: -800,   dShort: 1200,   longPct: 20.00, shortPct: 80.00, netChg: -0.50, netPos: -36000,   oi: 65000,   dOI: 400 },
];

// ── ASSETS SCORED ─────────────────────────────────────────────────────────────
// Raw asset data before scoring calculations are applied
const ASSETS_RAW = [
  { id: "DOW",    name: "DOW",    cat: "Index",     cot: 2,  retail: 0,  seasonal: 1,  trend: 2,  gdp: 1,  mPMI: 1,  sPMI: 1,  retailSal: 1,  inflation: -1, empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "Gold",   name: "GOLD",   cat: "Commodity", cot: 2,  retail: 1,  seasonal: 1,  trend: 2,  gdp: 0,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: 1,  empChg: 0,  unemploy: 0,  rates: 1 },
  { id: "GBP",    name: "GBPUSD", cat: "Forex",     cot: 2,  retail: -1, seasonal: 0,  trend: 1,  gdp: 1,  mPMI: 0,  sPMI: 1,  retailSal: 0,  inflation: -1, empChg: 0,  unemploy: 0,  rates: 0 },
  { id: "USOIL",  name: "USOIL",  cat: "Commodity", cot: 2,  retail: 0,  seasonal: 0,  trend: 1,  gdp: 1,  mPMI: 1,  sPMI: 0,  retailSal: 0,  inflation: 1,  empChg: 0,  unemploy: 0,  rates: -1 },
  { id: "COPPER", name: "COPPER", cat: "Commodity", cot: 1,  retail: 0,  seasonal: 1,  trend: 1,  gdp: 0,  mPMI: 1,  sPMI: 1,  retailSal: 1,  inflation: 0,  empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "NASDAQ", name: "NASDAQ", cat: "Index",     cot: 1,  retail: 0,  seasonal: 1,  trend: 2,  gdp: 1,  mPMI: 1,  sPMI: 1,  retailSal: 1,  inflation: -1, empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "SPX500", name: "SPX500", cat: "Index",     cot: 0,  retail: 0,  seasonal: 1,  trend: 1,  gdp: 1,  mPMI: 1,  sPMI: 1,  retailSal: 1,  inflation: -1, empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "EUR",    name: "EURUSD", cat: "Forex",     cot: 1,  retail: 1,  seasonal: 0,  trend: 0,  gdp: -1, mPMI: -1, sPMI: 0,  retailSal: -1, inflation: -1, empChg: 0,  unemploy: -1, rates: 0 },
  { id: "AUD",    name: "AUDUSD", cat: "Forex",     cot: 0,  retail: 0,  seasonal: -1, trend: -1, gdp: 0,  mPMI: 0,  sPMI: -1, retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: 0 },
  { id: "NZD",    name: "NZDUSD", cat: "Forex",     cot: 0,  retail: 0,  seasonal: -1, trend: -1, gdp: 0,  mPMI: -1, sPMI: -1, retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: 0 },
  { id: "RUSSELL",name: "RUSSELL",cat: "Index",     cot: 0,  retail: 0,  seasonal: 1,  trend: 1,  gdp: 1,  mPMI: 0,  sPMI: 0,  retailSal: 1,  inflation: -1, empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "SILVER", name: "SILVER", cat: "Commodity", cot: 1,  retail: 0,  seasonal: 0,  trend: 1,  gdp: 0,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: 1,  empChg: 0,  unemploy: 0,  rates: 1 },
  { id: "BTC",    name: "BITCOIN",cat: "Crypto",    cot: -1, retail: 0,  seasonal: 0,  trend: -2, gdp: 0,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: -1 },
  { id: "JPY",    name: "USDJPY", cat: "Forex",     cot: 1,  retail: -2, seasonal: -1, trend: -1, gdp: -1, mPMI: -1, sPMI: -1, retailSal: -1, inflation: 0,  empChg: -1, unemploy: 0,  rates: -2 },
  { id: "CAD",    name: "USDCAD", cat: "Forex",     cot: -2, retail: 1,  seasonal: 0,  trend: 0,  gdp: 0,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: 0 },
  { id: "USD",    name: "USD IDX",cat: "Forex",     cot: 0,  retail: 0,  seasonal: 0,  trend: -1, gdp: 1,  mPMI: 1,  sPMI: 1,  retailSal: 1,  inflation: -1, empChg: 1,  unemploy: 1,  rates: -1 },
  { id: "CHF",    name: "USDCHF", cat: "Forex",     cot: -2, retail: -1, seasonal: 0,  trend: -1, gdp: 0,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: 0 },
  { id: "US10T",  name: "US10T",  cat: "Index",     cot: -2, retail: 0,  seasonal: -1, trend: -2, gdp: 1,  mPMI: 0,  sPMI: 0,  retailSal: 0,  inflation: -1, empChg: 0,  unemploy: 0,  rates: -1 },
  { id: "GBPJPY", name: "GBPJPY", cat: "Forex",     cot: 1,  retail: -1, seasonal: 0,  trend: 1,  gdp: 0,  mPMI: 0,  sPMI: 1,  retailSal: 0,  inflation: -1, empChg: 0,  unemploy: 0,  rates: 1 },
  { id: "AUDCHF", name: "AUDCHF", cat: "Forex",     cot: 0,  retail: 0,  seasonal: -1, trend: 0,  gdp: 0,  mPMI: 0,  sPMI: -1, retailSal: 0,  inflation: 0,  empChg: 0,  unemploy: 0,  rates: 0 },
];

// ── CURRENCIES ────────────────────────────────────────────────────────────────
const CURRS = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "NZD", name: "New Zealand Dollar" },
];

// ── FOREX PAIRS ───────────────────────────────────────────────────────────────
const FOREX_PAIRS = [
  { id: "EURUSD", base: "EUR", quote: "USD" },
  { id: "GBPUSD", base: "GBP", quote: "USD" },
  { id: "USDJPY", base: "USD", quote: "JPY" },
  { id: "AUDUSD", base: "AUD", quote: "USD" },
  { id: "USDCAD", base: "USD", quote: "CAD" },
  { id: "USDCHF", base: "USD", quote: "CHF" },
  { id: "NZDUSD", base: "NZD", quote: "USD" },
];

// ── CARRY PAIRS ───────────────────────────────────────────────────────────────
const CARRY_PAIRS = [
  { pair: "NZDJPY", long: "NZD", short: "JPY", rate: 5.50, score: 2 },
  { pair: "AUDJPY", long: "AUD", short: "JPY", rate: 4.35, score: 2 },
  { pair: "GBPJPY", long: "GBP", short: "JPY", rate: 5.15, score: 2 },
  { pair: "CADJPY", long: "CAD", short: "JPY", rate: 5.00, score: 1 },
  { pair: "USDJPY", long: "USD", short: "JPY", rate: 5.25, score: 1 },
  { pair: "NZDCHF", long: "NZD", short: "CHF", rate: 3.75, score: 1 },
  { pair: "AUDCHF", long: "AUD", short: "CHF", rate: 2.60, score: 0 },
  { pair: "EURCHF", long: "EUR", short: "CHF", rate: 2.25, score: -1 },
];

// ── FALLBACK ECONOMIC DATA ────────────────────────────────────────────────────
const FALLBACK_ECON = {
  USD: [{ l: "GDP YoY", v: "2.8%", s: .3,  d: "Q4 2025" }, { l: "CPI YoY", v: "3.1%", s: -.1, d: "Feb 2026" }, { l: "Unemploy", v: "4.1%", s: 0,   d: "Feb 2026" }, { l: "Fed Rate", v: "5.25%", s: 0,  d: "Mar 2026" }],
  EUR: [{ l: "GDP YoY", v: "0.4%", s: -.2, d: "Q4 2025" }, { l: "CPI YoY", v: "2.6%", s: -.4, d: "Feb 2026" }, { l: "Unemploy", v: "6.1%", s: .1,  d: "Jan 2026" }, { l: "ECB Rate", v: "4.50%", s: 0,  d: "Mar 2026" }],
  GBP: [{ l: "GDP YoY", v: "0.6%", s: .2,  d: "Q3 2025" }, { l: "CPI YoY", v: "3.4%", s: -.3, d: "Feb 2026" }, { l: "Unemploy", v: "4.2%", s: -.1, d: "Jan 2026" }, { l: "BOE Rate", v: "5.25%", s: 0,  d: "Mar 2026" }],
  JPY: [{ l: "GDP YoY", v: "0.1%", s: -.5, d: "Q3 2025" }, { l: "CPI YoY", v: "2.8%", s: .2,  d: "Feb 2026" }, { l: "Unemploy", v: "2.4%", s: .1,  d: "Jan 2026" }, { l: "BOJ Rate", v: "0.10%", s: .1, d: "Mar 2026" }],
};

// ── CURRENCY FLAGS ────────────────────────────────────────────────────────────
const FLAGS = { USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵" };

// ── FRED SERIES DEFINITIONS ───────────────────────────────────────────────────
const FRED_SERIES = {
  USD: [
    { label: "GDP YoY",  id: "A191RL1Q225SBEA",     fmt: v => v.toFixed(1) + "%" },
    { label: "CPI YoY",  id: "CPIAUCSL",             fmt: v => v.toFixed(1) + "%", yoy: true },
    { label: "Unemploy", id: "UNRATE",               fmt: v => v.toFixed(1) + "%" },
    { label: "Fed Rate", id: "FEDFUNDS",             fmt: v => v.toFixed(2) + "%" },
  ],
  EUR: [
    { label: "GDP YoY",  id: "CLVMEURSCAB1GQEA19",  fmt: v => v.toFixed(1) + "%" },
    { label: "CPI YoY",  id: "CP0000EZ19M086NEST",  fmt: v => v.toFixed(1) + "%" },
    { label: "Unemploy", id: "LRHUTTTTEZM156S",      fmt: v => v.toFixed(1) + "%" },
    { label: "ECB Rate", id: "ECBDFR",               fmt: v => v.toFixed(2) + "%" },
  ],
  GBP: [
    { label: "GDP YoY",  id: "CLVMNACSCAB1GQUK",    fmt: v => v.toFixed(1) + "%" },
    { label: "CPI YoY",  id: "GBRCPIALLMINMEI",      fmt: v => v.toFixed(1) + "%", yoy: true },
    { label: "Unemploy", id: "LRHUTTTTGBM156S",      fmt: v => v.toFixed(1) + "%" },
    { label: "BOE Rate", id: "IUDSOIA",              fmt: v => v.toFixed(2) + "%" },
  ],
  JPY: [
    { label: "GDP YoY",  id: "JPNRGDPEXP",           fmt: v => v.toFixed(1) + "%" },
    { label: "CPI YoY",  id: "JPNCPIALLMINMEI",      fmt: v => v.toFixed(1) + "%", yoy: true },
    { label: "Unemploy", id: "JPNURYNAA",            fmt: v => v.toFixed(1) + "%" },
    { label: "BOJ Rate", id: "IRSTJPN156N",          fmt: v => v.toFixed(2) + "%" },
  ],
};

// ── ECO SURPRISE FALLBACK ─────────────────────────────────────────────────────
const ECO_SURPRISE_FALLBACK = {
  USD: { score: 62, indicators: [{ n: "GDP", s: .3 }, { n: "CPI", s: -.1 }, { n: "Unemp", s: .2 }, { n: "Rate", s: 0 }] },
  GBP: { score: 55, indicators: [{ n: "GDP", s: .2 }, { n: "CPI", s: -.3 }, { n: "Unemp", s: -.1 }, { n: "Rate", s: 0 }] },
  EUR: { score: 44, indicators: [{ n: "GDP", s: -.2 }, { n: "CPI", s: -.4 }, { n: "Unemp", s: .1 }, { n: "Rate", s: 0 }] },
  JPY: { score: 52, indicators: [{ n: "GDP", s: -.5 }, { n: "CPI", s: .2 }, { n: "Tankan", s: .4 }, { n: "Rate", s: .1 }] },
  NZD: { score: 58, indicators: [{ n: "GDP", s: .1 }, { n: "CPI", s: -.1 }, { n: "Trade", s: .3 }, { n: "Rate", s: 0 }] },
  CAD: { score: 71, indicators: [{ n: "GDP", s: .5 }, { n: "CPI", s: .3 }, { n: "Employ", s: .4 }, { n: "Rate", s: 0 }] },
  AUD: { score: 63, indicators: [{ n: "GDP", s: .3 }, { n: "CPI", s: .2 }, { n: "Employ", s: .3 }, { n: "Rate", s: 0 }] },
  CHF: { score: 48, indicators: [{ n: "GDP", s: 0 }, { n: "CPI", s: -.2 }, { n: "Employ", s: .1 }, { n: "Rate", s: 0 }] },
};

// ── CFTC COT MAP ──────────────────────────────────────────────────────────────
const CFTC_MAP = {
  "EURO FX":                    { id: "EUR",    name: "Euro" },
  "BRITISH POUND STERLING":     { id: "GBP",    name: "British Pound" },
  "JAPANESE YEN":               { id: "JPY",    name: "Japanese Yen" },
  "AUSTRALIAN DOLLAR":          { id: "AUD",    name: "Australian Dollar" },
  "CANADIAN DOLLAR":            { id: "CAD",    name: "Canadian Dollar" },
  "SWISS FRANC":                { id: "CHF",    name: "Swiss Franc" },
  "NEW ZEALAND DOLLAR":         { id: "NZD",    name: "New Zealand Dollar" },
  "U.S. DOLLAR INDEX":          { id: "USD",    name: "US Dollar Index" },
  "GOLD":                       { id: "Gold",   name: "Gold" },
  "SILVER":                     { id: "SILVER", name: "Silver" },
  "CRUDE OIL, LIGHT SWEET":     { id: "USOIL",  name: "Crude Oil" },
  "BITCOIN":                    { id: "BTC",    name: "Bitcoin" },
  "NASDAQ-100 MINI":            { id: "NASDAQ", name: "NASDAQ-100" },
  "S&P 500 MINI":               { id: "SPX",    name: "S&P 500" },
  "DOW JONES INDUSTRIAL AVG":   { id: "DOW",    name: "Dow Jones" },
  "10-YEAR U.S. TREASURY NOTES":{ id: "US10T",  name: "US 10Y T-Note" },
  "COPPER-GRADE #1":            { id: "COPPER", name: "Copper" },
  "PLATINUM":                   { id: "PLATINUM",name: "Platinum" },
};

// ── CFTC API URL ──────────────────────────────────────────────────────────────
const CFTC_URL = "https://www.cftc.gov/files/dea/newcot/FinFutWk.txt";

// ── YAHOO FINANCE SYMBOLS ─────────────────────────────────────────────────────
const YAHOO_SYMBOLS = {
  EURUSD: "EURUSD=X", GBPUSD: "GBPUSD=X", USDJPY: "USDJPY=X",
  AUDUSD: "AUDUSD=X", USDCAD: "USDCAD=X", NZDUSD: "NZDUSD=X",
  GBPJPY: "GBPJPY=X", XAUUSD: "GC=F",     USOIL:  "CL=F",
  BTCUSD: "BTC-USD",  US500:  "^GSPC",     NAS100: "^NDX",
};

// ── SEASONALITY DATA (FALLBACK) ───────────────────────────────────────────────
const SEASON_DATA_FALLBACK = [
  { id: "EURUSD", name: "EUR/USD", cat: "Forex",
    m10:  [-0.38, 0.12, 0.81, 0.33,-0.58, 0.21, 0.14,-0.52, 0.68, 0.31,-0.29,-0.18],
    m5:   [-0.52, 0.08, 0.64, 0.21,-0.71, 0.18, 0.22,-0.63, 0.74, 0.41,-0.35,-0.09],
    mCur: [-0.61,-0.34, 0.92, null,null,null,null,null,null,null,null,null] },
  { id: "GBPUSD", name: "GBP/USD", cat: "Forex",
    m10:  [-0.31, 0.42, 0.53, 0.18,-0.67, 0.14, 0.28,-0.61, 0.82, 0.47,-0.38,-0.12],
    m5:   [-0.44, 0.31, 0.41, 0.09,-0.84, 0.11, 0.34,-0.72, 0.91, 0.55,-0.42,-0.06],
    mCur: [-0.78,-0.21, 0.44, null,null,null,null,null,null,null,null,null] },
  { id: "USDJPY", name: "USD/JPY", cat: "Forex",
    m10:  [ 0.28,-0.22, 0.61,-0.31, 0.38, 0.09,-0.48, 0.82,-0.41, 0.19, 0.58,-0.14],
    m5:   [ 0.41,-0.18, 0.52,-0.24, 0.45, 0.12,-0.55, 0.91,-0.38, 0.25, 0.63,-0.08],
    mCur: [ 0.51,-0.62,-0.88, null,null,null,null,null,null,null,null,null] },
  { id: "AUDUSD", name: "AUD/USD", cat: "Forex",
    m10:  [-0.58, 0.31, 0.44, 0.12,-0.82, 0.18, 0.08,-0.71, 0.63, 0.38,-0.24,-0.09],
    m5:   [-0.71, 0.22, 0.35, 0.06,-0.94, 0.14, 0.11,-0.81, 0.69, 0.44,-0.29,-0.04],
    mCur: [-0.44,-0.31,-0.92, null,null,null,null,null,null,null,null,null] },
  { id: "USDCAD", name: "USD/CAD", cat: "Forex",
    m10:  [ 0.22,-0.28,-0.41, 0.09, 0.51,-0.18, 0.14, 0.32,-0.48,-0.21, 0.38, 0.11],
    m5:   [ 0.31,-0.21,-0.35, 0.04, 0.62,-0.14, 0.18, 0.41,-0.52,-0.26, 0.44, 0.08],
    mCur: [ 0.38, 0.19,-0.28, null,null,null,null,null,null,null,null,null] },
  { id: "NZDUSD", name: "NZD/USD", cat: "Forex",
    m10:  [-0.51, 0.22, 0.32, 0.08,-0.69, 0.18, 0.09,-0.58, 0.54, 0.31,-0.21,-0.08],
    m5:   [-0.63, 0.15, 0.24, 0.03,-0.81, 0.14, 0.13,-0.68, 0.61, 0.38,-0.26,-0.04],
    mCur: [-0.34,-0.18,-0.54, null,null,null,null,null,null,null,null,null] },
  { id: "GBPJPY", name: "GBP/JPY", cat: "Forex",
    m10:  [ 0.08, 0.21, 1.14,-0.08,-0.28, 0.31,-0.22, 0.18, 0.42, 0.68, 0.24,-0.31],
    m5:   [ 0.11, 0.18, 0.98,-0.04,-0.35, 0.28,-0.28, 0.22, 0.51, 0.74, 0.31,-0.24],
    mCur: [-0.24,-0.84,-1.34, null,null,null,null,null,null,null,null,null] },
  { id: "XAUUSD", name: "XAU/USD", cat: "Commodity",
    m10:  [ 4.10,-0.33, 1.33, 4.39,-0.67,-1.22,-1.22, 0.24, 1.44,-0.83,-1.60,-0.91],
    m5:   [ 5.20,-1.40, 0.82, 5.60,-1.20,-0.80,-1.80, 0.44, 1.80,-0.60,-2.10,-0.50],
    mCur: [ 4.20, 2.10, 3.80, null,null,null,null,null,null,null,null,null] },
  { id: "USOIL",  name: "USOIL",   cat: "Commodity",
    m10:  [ 0.81, 0.52, 1.24, 0.88, 0.28,-0.82,-0.54, 0.18, 0.41, 0.31,-1.22,-0.58],
    m5:   [ 1.10, 0.38, 0.94, 0.64, 0.18,-1.10,-0.78, 0.08, 0.28, 0.24,-1.54,-0.42],
    mCur: [-2.40,-0.80,-4.20, null,null,null,null,null,null,null,null,null] },
  { id: "BTCUSD", name: "BTC/USD", cat: "Crypto",
    m10:  [ 8.20,-2.10, 5.40, 3.80,-12.1, 2.30, 3.10,-8.40, 4.60,11.20, 8.30, 4.90],
    m5:   [ 12.4,-4.20, 8.60, 5.10,-15.2, 3.40, 4.80,-11.2, 6.30,14.50,11.20, 6.40],
    mCur: [ 3.20,-8.10,-5.20, null,null,null,null,null,null,null,null,null] },
  { id: "US500",  name: "S&P 500", cat: "Index",
    m10:  [-0.12,-0.18, 1.24, 1.08,-0.28, 0.82, 0.58,-0.31, 0.42, 1.18, 0.81, 1.42],
    m5:   [-0.22,-0.28, 1.44, 1.28,-0.38, 0.92, 0.68,-0.41, 0.52, 1.38, 0.91, 1.62],
    mCur: [ 2.40,-1.20,-5.60, null,null,null,null,null,null,null,null,null] },
  { id: "NAS100", name: "NASDAQ",  cat: "Index",
    m10:  [ 0.18,-0.31, 1.52, 1.28,-0.48, 1.08, 0.78,-0.48, 0.58, 1.38, 0.88, 1.58],
    m5:   [ 0.28,-0.44, 1.72, 1.48,-0.62, 1.22, 0.92,-0.62, 0.68, 1.58, 1.02, 1.78],
    mCur: [ 3.10,-1.80,-7.20, null,null,null,null,null,null,null,null,null] },
];

// ── MONTH NAME ARRAYS ─────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── PROXY LIST ────────────────────────────────────────────────────────────────
const PROXIES = [
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  u => `https://thingproxy.freeboard.io/fetch/${u}`,
];
