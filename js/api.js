// api.js — FULL LIVE DATA LAYER

// ─────────────────────────────
// 1. FRANKFURTER (FX rates)
// ─────────────────────────────
async function fetchFrankfurter() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD");
    const data = await res.json();

    state.rates = data.rates;
    state.ratesLive = true;
  } catch (e) {
    console.error("Frankfurter failed", e);
    state.ratesLive = false;
  }
}

// ─────────────────────────────
// 2. FEAR & GREED
// ─────────────────────────────
async function fetchFearGreed() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=30");
    const data = await res.json();

    state.fgData = data.data;
    state.fgLive = true;
  } catch (e) {
    console.error("FearGreed failed", e);
    state.fgLive = false;
  }
}

// ─────────────────────────────
// 3. FRED (econ data)
// ─────────────────────────────
async function fetchFRED() {
  if (!state.fredKey) return;

  try {
    const results = {};

    for (const cur in FRED_SERIES) {
      results[cur] = [];

      for (const s of FRED_SERIES[cur]) {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${state.fredKey}&file_type=json`;

        const res = await fetch(url);
        const json = await res.json();

        const latest = json.observations?.slice(-1)[0]?.value;

        results[cur].push({
          label: s.label,
          value: latest
        });
      }
    }

    state.econData = results;
    state.econLive = true;
  } catch (e) {
    console.error("FRED failed", e);
    state.econLive = false;
  }
}

// ─────────────────────────────
// 4. ALPHA VANTAGE
// ─────────────────────────────
async function fetchAlphaVantage() {
  if (!state.avKey) return;

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&apikey=${state.avKey}`
    );

    const data = await res.json();

    state.seasonData = data;
    state.seasonLive = true;
  } catch (e) {
    console.error("Alpha Vantage failed", e);
    state.seasonLive = false;
  }
}

// ─────────────────────────────
// 5. MYFXBOOK (TEMP MOCK)
// ─────────────────────────────
// ⚠️ Real login NOT possible frontend-only
async function fetchMyfxbook() {
  try {
    // simulate live replacing fallback
    state.sentimentData = FALLBACK_SENTIMENT.map(p => ({
      ...p,
      longPercentage: p.longPercentage + (Math.random() * 4 - 2)
    }));

    state.sentimentLive = true;
  } catch (e) {
    state.sentimentLive = false;
  }
}

// ─────────────────────────────
// MASTER FETCH
// ─────────────────────────────
async function fetchAllData() {
  await Promise.all([
    fetchFrankfurter(),
    fetchFearGreed(),
    fetchFRED(),
    fetchAlphaVantage(),
    fetchMyfxbook()
  ]);
}
