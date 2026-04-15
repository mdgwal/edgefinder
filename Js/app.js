// ─────────────────────────────────────────────────────────────────────────────
// app.js — Entry point for EdgeFinder Pro
// Handles: state, initialization, event listeners, data loading orchestration
// Depends on: data.js, assets-engine.js, fx-engine.js, ui-render.js
// ─────────────────────────────────────────────────────────────────────────────

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────
function saveKey(k, v) { try { localStorage.setItem('ef_' + k, v); } catch (e) {} }
function loadKey(k)    { try { return localStorage.getItem('ef_' + k) || ''; } catch (e) { return ''; } }

// ── APPLICATION STATE ─────────────────────────────────────────────────────────
const state = {
  // API / live data
  rates:    null,
  prevRates: null,
  cdata:    null,

  // Credentials
  fredKey:      loadKey('fred'),
  mfxEmail:     loadKey('mfx_email'),
  mfxPassword:  loadKey('mfx_password'),
  mfxSession:   loadKey('mfx_session'),

  // Economic data
  econData:    null,
  econLive:    false,
  econLoading: false,

  // Fear & Greed
  fgData: buildFallbackFG(),
  fgLive: false,

  // Sentiment
  sentimentData:    FALLBACK_SENTIMENT,
  sentimentLive:    false,
  sentimentLoading: false,

  // COT
  cotData:       null,
  cotLive:       false,
  cotLoading:    false,
  cotLastUpdate: null,

  // Put/Call + AAII
  putCallData: null,
  putCallLive: false,
  aaiiData:    null,
  aaiiLive:    false,

  // UI state
  activeTab:   "setups",
  sentSubTab:  "retail",
  ecoSubTab:   "meter",
  filterCat:   "All",
  sentFilter:  "All",
  cotSort:     { col: "netChg", dir: -1 },
  seasonFilter:"All",
  seasonAsset: "XAUUSD",
  seasonView:  "monthly",
};

// Live seasonality data — starts as fallback, upgraded as Yahoo data loads
let SEASON_DATA = SEASON_DATA_FALLBACK.map(d => ({ ...d, live: false }));

// ── TAB NAVIGATION ────────────────────────────────────────────────────────────
function initTabs() {
  const nav = document.getElementById("tabs");
  TABS_DEF.forEach(t => {
    const btn       = document.createElement("button");
    btn.className   = "tab" + (t.id === state.activeTab ? " active" : "");
    btn.textContent = t.label;
    btn.onclick     = () => switchTab(t.id);
    nav.appendChild(btn);
  });
}

function switchTab(id) {
  state.activeTab = id;
  document.querySelectorAll(".tab").forEach((b, i) => {
    b.className = "tab" + (TABS_DEF[i].id === id ? " active" : "");
  });
  document.querySelectorAll(".page").forEach(p => { p.className = "page"; });
  document.getElementById("page-" + id).className = "page active";
  renderActive();
}

// ── RENDER DISPATCHER ─────────────────────────────────────────────────────────
function renderActive() {
  switch (state.activeTab) {
    case "setups":      renderAssetScorecard(state.filterCat);    break;
    case "cot":         renderForexScorecard(state.cotData, state.cotLive, state.cotLoading, state.cotSort); break;
    case "sentiment":   renderSentiment(state);                   break;
    case "econ":        renderEcon(state);                        break;
    case "currency":    renderCurrency(state.cdata);              break;
    case "carry":       renderCarry();                            break;
    case "feargreed":   renderFearGreed(state);                   break;
    case "seasonality": renderSeasonality(state, SEASON_DATA);    break;
    case "settings":    renderSettings(state);                    break;
  }
}

// ── FILTER / SORT HANDLERS ────────────────────────────────────────────────────
function setFilter(cat) {
  state.filterCat = cat;
  renderAssetScorecard(cat);
}

function setSentTab(id) {
  state.sentSubTab = id;
  renderSentiment(state);
}

function setSentFilter(f) {
  state.sentFilter = f;
  renderSentiment(state);
}

function setEcoTab(id) {
  state.ecoSubTab = id;
  renderEcon(state);
}

function setSeasonFilter(f) {
  state.seasonFilter = f;
  renderSeasonality(state, SEASON_DATA);
}

function sortCOT(col) {
  if (state.cotSort.col === col) state.cotSort.dir *= -1;
  else { state.cotSort.col = col; state.cotSort.dir = -1; }
  renderForexScorecard(state.cotData, state.cotLive, state.cotLoading, state.cotSort);
}

// ── SETTINGS HANDLERS ─────────────────────────────────────────────────────────
function saveMyfxbook() {
  const email    = document.getElementById("mfx-email").value.trim();
  const password = document.getElementById("mfx-password").value.trim();
  if (!email || !password) { alert("Please enter both email and password"); return; }

  state.mfxEmail    = email;
  state.mfxPassword = password;
  state.mfxSession  = "";
  saveKey("mfx_email",    email);
  saveKey("mfx_password", password);
  saveKey("mfx_session",  "");
  state.sentimentLive    = false;
  state.sentimentLoading = false;

  renderSettings(state);
  loadMyfxbookData();
  if (state.activeTab === "sentiment") renderSentiment(state);
}

function clearMyfxbook() {
  state.mfxEmail    = "";
  state.mfxPassword = "";
  state.mfxSession  = "";
  saveKey("mfx_email",    "");
  saveKey("mfx_password", "");
  saveKey("mfx_session",  "");
  state.sentimentLive = false;
  state.sentimentData = FALLBACK_SENTIMENT;
  renderSettings(state);
  if (state.activeTab === "sentiment") renderSentiment(state);
}

function saveFREDKey() {
  const val = document.getElementById("fred-input").value.trim();
  if (!val) return;
  state.fredKey    = val;
  saveKey("fred", val);
  state.econData    = null;
  state.econLive    = false;
  state.econLoading = false;
  renderSettings(state);
  loadFREDData();
  if (state.activeTab === "econ") renderEcon(state);
}

// ── DATA LOADERS ──────────────────────────────────────────────────────────────

function loadCOTData() {
  if (state.cotLoading) return;
  if (state.cotData && state.cotLastUpdate) {
    const ageHours = (Date.now() - state.cotLastUpdate) / 1000 / 60 / 60;
    if (ageHours < 12) return;
  }
  state.cotLoading = true;

  fetchCFTCData()
    .then(rows => {
      state.cotData       = rows;
      state.cotLive       = true;
      state.cotLoading    = false;
      state.cotLastUpdate = Date.now();
      if (state.activeTab === "cot") renderForexScorecard(state.cotData, state.cotLive, state.cotLoading, state.cotSort);
    })
    .catch(e => {
      console.log("CFTC COT fetch failed:", e.message);
      state.cotLoading = false;
      state.cotLive    = false;
    });
}

function loadMyfxbookData() {
  if (!state.mfxEmail || !state.mfxPassword || state.sentimentLoading) return;
  state.sentimentLoading = true;
  if (state.activeTab === "sentiment") renderSentiment(state);

  const timeout = setTimeout(() => {
    state.sentimentLoading = false;
    state.sentimentLive    = false;
    if (state.activeTab === "sentiment") renderSentiment(state);
  }, 15000);

  const credentials = {
    mfxEmail:    state.mfxEmail,
    mfxPassword: state.mfxPassword,
    mfxSession:  state.mfxSession,
  };

  fetchMyfxbookSentiment(credentials)
    .then(result => {
      clearTimeout(timeout);
      // fetchMyfxbookSentiment may return {symbols, session} or just the symbols array
      const symbols = Array.isArray(result) ? result : result.symbols;
      if (!Array.isArray(result) && result.session) {
        state.mfxSession = result.session;
        saveKey("mfx_session", result.session);
      }
      state.sentimentData = symbols.map(s => ({
        name:             s.name,
        longPercentage:   parseFloat(s.longPercentage),
        shortPercentage:  parseFloat(s.shortPercentage),
        longVolume:       parseInt(s.longVolume)    || 0,
        shortVolume:      parseInt(s.shortVolume)   || 0,
        longPositions:    parseInt(s.longPositions)  || 0,
        shortPositions:   parseInt(s.shortPositions) || 0,
      }));
      state.sentimentLive    = true;
      state.sentimentLoading = false;
      if (state.activeTab === "sentiment") renderSentiment(state);
    })
    .catch(e => {
      clearTimeout(timeout);
      console.log("Myfxbook error:", e.message);
      state.sentimentLoading = false;
      state.sentimentLive    = false;
      if (state.activeTab === "sentiment") renderSentiment(state);
    });
}

function loadFREDData() {
  if (!state.fredKey || state.econLoading) return;
  state.econLoading = true;

  fetchFREDEcon(state.fredKey)
    .then(d => {
      state.econData    = d;
      state.econLive    = true;
      state.econLoading = false;
      if (state.activeTab === "econ") renderEcon(state);
    })
    .catch(() => {
      state.econLoading = false;
    });
}

function loadPutCallData() {
  fetchPutCall()
    .then(data => {
      state.putCallData = data;
      state.putCallLive = true;
      if (state.activeTab === "sentiment") renderSentiment(state);
    })
    .catch(() => { state.putCallLive = false; });
}

function loadAAIIData() {
  fetchAAII()
    .then(data => {
      state.aaiiData = data;
      state.aaiiLive = true;
      if (state.activeTab === "sentiment") renderSentiment(state);
    })
    .catch(() => { state.aaiiLive = false; });
}

async function loadSeasonalityLive() {
  const selId  = state.seasonAsset || "XAUUSD";
  const ids    = SEASON_DATA.map(d => d.id);
  const ordered = [selId, ...ids.filter(id => id !== selId)];

  for (const id of ordered) {
    try {
      const live = await fetchSeasonalityForAsset(id);
      if (!live) continue;
      SEASON_DATA = SEASON_DATA.map(d => d.id === id ? { ...d, ...live } : d);
      if (id === state.seasonAsset && state.activeTab === "seasonality") {
        renderSeasonality(state, SEASON_DATA);
      }
    } catch (e) {
      console.log("Season fetch failed for " + id + ":", e.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  if (state.activeTab === "seasonality") renderSeasonality(state, SEASON_DATA);
}

// ── RATE FETCHERS ─────────────────────────────────────────────────────────────
async function fetchRates() {
  const r = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!r.ok) throw new Error();
  return (await r.json()).rates;
}

async function fetchPrev() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() - 2);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  const r = await fetch("https://api.frankfurter.app/" + d.toISOString().split("T")[0] + "?from=USD");
  if (!r.ok) throw new Error();
  return (await r.json()).rates;
}

async function fetchFearGreed() {
  const r = await fetch("https://api.alternative.me/fng/?limit=30&format=json");
  if (!r.ok) throw new Error();
  const d = await r.json();
  if (!d.data || !d.data.length) throw new Error();
  return d.data;
}

// ── GLOBAL REFRESH ────────────────────────────────────────────────────────────
async function refreshAll() {
  document.getElementById("rbtn-icon").classList.add("spinning");
  renderActive();

  const [r1, r2, r3] = await Promise.allSettled([
    fetchRates(),
    fetchPrev(),
    fetchFearGreed(),
  ]);

  if (r1.status === "fulfilled") state.rates     = r1.value;
  if (r2.status === "fulfilled") state.prevRates  = r2.value;
  if (r3.status === "fulfilled" && r3.value && r3.value.length) {
    state.fgData = r3.value;
    state.fgLive = true;
  }

  state.cdata = buildStrength(state.rates);

  loadCOTData();
  loadMyfxbookData();
  loadSeasonalityLive();
  loadPutCallData();
  loadAAIIData();

  if (state.fredKey) {
    state.econData    = null;
    state.econLive    = false;
    loadFREDData();
  }

  const now = new Date();
  document.getElementById("last-update").textContent =
    now.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  renderActive();
  document.getElementById("rbtn-icon").classList.remove("spinning");
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
initTabs();
renderActive();
refreshAll();
setInterval(refreshAll, 15 * 60 * 1000);
