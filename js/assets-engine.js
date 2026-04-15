// ─────────────────────────────────────────────────────────────────────────────
// assets-engine.js — Asset Scorecard scoring and calculations
// Depends on: data.js
// ─────────────────────────────────────────────────────────────────────────────

// ── SCORING FORMULAS ──────────────────────────────────────────────────────────

/**
 * Compute the bias label from a numeric total score.
 * @param {number} total
 * @returns {string}
 */
function getBiasLabel(total) {
  if (total >= 8)  return "Very Bullish";
  if (total >= 5)  return "Bullish";
  if (total >= 2)  return "Mild Bullish";
  if (total <= -8) return "Very Bearish";
  if (total <= -5) return "Bearish";
  if (total <= -2) return "Mild Bearish";
  return "Neutral";
}

/**
 * Calculate total score and bias for a single asset row.
 * Does NOT mutate the original object.
 * @param {Object} asset - raw asset data row from ASSETS_RAW
 * @returns {Object} asset with total and bias appended
 */
function calculateAssetScore(asset) {
  const total =
    asset.cot + asset.retail + asset.seasonal + asset.trend +
    asset.gdp + asset.mPMI + asset.sPMI + asset.retailSal +
    asset.inflation + asset.empChg + asset.unemploy + asset.rates;

  return {
    ...asset,
    total,
    bias: getBiasLabel(total),
  };
}

/**
 * Build a full scored and sorted asset list.
 * @param {string} [filterCat="All"] - category filter
 * @returns {Object[]} scored assets sorted by total descending
 */
function buildAssetBreakdown(filterCat = "All") {
  const scored = ASSETS_RAW.map(calculateAssetScore);
  const sorted = scored.sort((a, b) => b.total - a.total);

  if (filterCat === "All") return sorted;
  return sorted.filter(a => a.cat === filterCat);
}

// ── MEMOISED SCORED ARRAY ─────────────────────────────────────────────────────
// Pre-computed at boot so rendering never re-calculates from scratch
const ASSETS_SCORED = ASSETS_RAW.map(calculateAssetScore).sort((a, b) => b.total - a.total);

// ── COLOUR / CLASS HELPERS ────────────────────────────────────────────────────

/**
 * CSS class for an individual score cell value (-2..+2)
 * @param {number} v
 * @returns {string}
 */
function cellClass(v) {
  if (v >= 2)  return "c2";
  if (v === 1) return "c1";
  if (v === 0) return "c0";
  if (v === -1)return "cm1";
  return "cm2";
}

/**
 * CSS colour string for a total score
 * @param {number} t
 * @returns {string}
 */
function totalColor(t) {
  if (t >= 8)  return "var(--bull)";
  if (t >= 4)  return "#7effc4";
  if (t <= -8) return "var(--bear)";
  if (t <= -4) return "#ff8fa0";
  return "var(--neutral)";
}

/**
 * CSS colour string for a bias label
 * @param {string} b
 * @returns {string}
 */
function biasColor(b) {
  if (b.includes("Very Bullish") || b.includes("Bullish")) return "var(--bull)";
  if (b.includes("Mild Bullish"))  return "#7effc4";
  if (b.includes("Very Bearish") || b.includes("Bearish")) return "var(--bear)";
  if (b.includes("Mild Bearish"))  return "#ff8fa0";
  return "var(--neutral)";
}

// ── ECONOMIC SURPRISE CALCULATION ─────────────────────────────────────────────

/**
 * Derive economic surprise scores from live FRED data.
 * Returns same shape as ECO_SURPRISE_FALLBACK.
 * @param {Object} econData - keyed by currency code
 * @returns {Object}
 */
function calcSurpriseFromFRED(econData) {
  const result = {};
  const currencies = ["USD", "EUR", "GBP", "JPY"];

  for (const cur of currencies) {
    const items = econData[cur] || [];
    if (!items.length) continue;

    const avg = items.reduce((a, i) => a + i.s, 0) / items.length;
    const score = Math.round(Math.max(0, Math.min(100, 50 + avg * 100)));

    result[cur] = {
      score,
      indicators: items.map(i => ({
        n: i.l.replace(" YoY", "").replace("Unemploy", "Unemp"),
        s: i.s,
      })),
    };
  }

  return result;
}
