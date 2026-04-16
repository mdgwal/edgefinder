// app.js — Entry point: fetch helpers, engine orchestration, DP pipeline, boot
// ── CFTC COT LIVE FETCH ────────────────────────────────────────────────────────
// CFTC publishes FinFutWk.txt every Friday ~3:30 PM EST
// Contains non-commercial (speculative/smart money) positions for all futures
const CFTC_URL="https://www.cftc.gov/files/dea/newcot/FinFutWk.txt";

// Map CFTC market names → our asset IDs
const CFTC_MAP={
  "EURO FX":                        {id:"EUR",  name:"Euro"},
  "BRITISH POUND STERLING":         {id:"GBP",  name:"British Pound"},
  "JAPANESE YEN":                   {id:"JPY",  name:"Japanese Yen"},
  "AUSTRALIAN DOLLAR":              {id:"AUD",  name:"Australian Dollar"},
  "CANADIAN DOLLAR":                {id:"CAD",  name:"Canadian Dollar"},
  "SWISS FRANC":                    {id:"CHF",  name:"Swiss Franc"},
  "NEW ZEALAND DOLLAR":             {id:"NZD",  name:"New Zealand Dollar"},
  "U.S. DOLLAR INDEX":              {id:"USD",  name:"US Dollar Index"},
  "GOLD":                           {id:"Gold", name:"Gold"},
  "SILVER":                         {id:"SILVER",name:"Silver"},
  "CRUDE OIL, LIGHT SWEET":         {id:"USOIL",name:"Crude Oil"},
  "BITCOIN":                        {id:"BTC",  name:"Bitcoin"},
  "NASDAQ-100 MINI":                {id:"NASDAQ",name:"NASDAQ-100"},
  "S&P 500 MINI":                   {id:"SPX",  name:"S&P 500"},
  "DOW JONES INDUSTRIAL AVG":       {id:"DOW",  name:"Dow Jones"},
  "10-YEAR U.S. TREASURY NOTES":    {id:"US10T",name:"US 10Y T-Note"},
  "COPPER-GRADE #1":                {id:"COPPER",name:"Copper"},
  "PLATINUM":                       {id:"PLATINUM",name:"Platinum"},
};

function parseCFTCcsv(csvText){
  const lines=csvText.trim().split("\n");
  const header=lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
  // Column indices
  const iName   = header.findIndex(h=>h.includes("Market_and_Exchange"));
  const iDate   = header.findIndex(h=>h.includes("Report_Date_as_YYYY"));
  const iOI     = header.findIndex(h=>h==="Open_Interest_All");
  const iLong   = header.findIndex(h=>h==="NonComm_Positions_Long_All");
  const iShort  = header.findIndex(h=>h==="NonComm_Positions_Short_All");
  const iLongOld= header.findIndex(h=>h==="NonComm_Positions_Long_Old")||iLong;
  const iShortOld=header.findIndex(h=>h==="NonComm_Positions_Short_Old")||iShort;

  const results=[];
  // We need previous week too — grab last 2 entries per market
  const seen={};

  for(let i=1;i<lines.length;i++){
    // Parse CSV line handling quoted fields
    const cols=[];let cur="",inQ=false;
    for(const ch of lines[i]){
      if(ch==='"'){inQ=!inQ;}
      else if(ch===","&&!inQ){cols.push(cur.trim());cur="";}
      else cur+=ch;
    }
    cols.push(cur.trim());
    if(cols.length<10)continue;

    const rawName=(cols[iName]||"").replace(/"/g,"").trim();
    // Find matching CFTC_MAP key
    let matched=null;
    for(const key of Object.keys(CFTC_MAP)){
      if(rawName.toUpperCase().includes(key.toUpperCase())){matched=key;break;}
    }
    if(!matched)continue;

    const id=CFTC_MAP[matched].id;
    const longC=parseInt(cols[iLong])||0;
    const shortC=parseInt(cols[iShort])||0;
    const oi=parseInt(cols[iOI])||0;
    const date=(cols[iDate]||"").replace(/"/g,"");

    if(!seen[id]){
      // First occurrence = latest week
      seen[id]={first:{longC,shortC,oi,date}};
    }else if(!seen[id].second){
      // Second occurrence = previous week
      seen[id].second={longC,shortC};
    }
  }

  // Build final COT rows
  const rows=[];
  for(const [key,info] of Object.entries(CFTC_MAP)){
    const s=seen[info.id];
    if(!s||!s.first)continue;
    const {longC,shortC,oi,date}=s.first;
    const total=longC+shortC;
    if(total===0)continue;
    const longPct=parseFloat(((longC/total)*100).toFixed(2));
    const shortPct=parseFloat(((shortC/total)*100).toFixed(2));
    const netPos=longC-shortC;
    // Change vs previous week
    let dLong=0,dShort=0,netChg=0;
    if(s.second){
      dLong=longC-s.second.longC;
      dShort=shortC-s.second.shortC;
      const prevTotal=s.second.longC+s.second.shortC;
      const prevLongPct=prevTotal>0?(s.second.longC/prevTotal)*100:50;
      netChg=parseFloat((longPct-prevLongPct).toFixed(2));
    }
    rows.push({
      id:info.id, name:info.name,
      longC,shortC,dLong,dShort,
      longPct,shortPct,netChg,
      netPos,oi,dOI:0,date,
    });
  }
  // Sort by netChg desc (same as default)
  return rows.sort((a,b)=>b.netChg-a.netChg);
}

async function fetchCFTCData(){
  const proxies=[
    u=>`https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,
    u=>`https://thingproxy.freeboard.io/fetch/${u}`,
  ];
  for(const makeProxy of proxies){
    try{
      const r=await fetch(makeProxy(CFTC_URL));
      if(!r.ok)continue;
      const text=await r.text();
      // allorigins wraps in {contents:"..."}
      let csv=text;
      try{const j=JSON.parse(text);if(j.contents)csv=j.contents;}catch(e){}
      if(!csv||csv.length<1000)continue;
      const rows=parseCFTCcsv(csv);
      if(rows.length>0)return rows;
    }catch(e){continue;}
  }
  throw new Error("CFTC fetch failed");
}

function loadCOTData(){
  if(state.cotLoading)return;
  // Only re-fetch if we don't have data or data is older than 12 hours
  if(state.cotData&&state.cotLastUpdate){
    const age=(Date.now()-state.cotLastUpdate)/1000/60/60;
    if(age<12)return; // Fresh enough
  }
  state.cotLoading=true;
  fetchCFTCData().then(rows=>{
    state.cotData=rows;
    state.cotLive=true;
    state.cotLoading=false;
    state.cotLastUpdate=Date.now();
    if(activeTab==="cot")renderCOT();
  }).catch(e=>{
    console.log("CFTC COT fetch failed:",e.message);
    state.cotLoading=false;
    state.cotLive=false;
    // Keep using hardcoded fallback
  });
}

function sentSignal(lp){
  if(lp>=75)return{label:"STRONG SELL",cls:"sig-strong-sell"};
  if(lp>=65)return{label:"SELL",cls:"sig-sell"};
  if(lp<=25)return{label:"STRONG BUY",cls:"sig-strong-buy"};
  if(lp<=35)return{label:"BUY",cls:"sig-buy"};
  return{label:"NEUTRAL",cls:"sig-neutral"};
}
function pcSignal(pc){
  if(pc>=1.5)return{label:"EXTREME FEAR",col:"var(--bear)"};
  if(pc>=1.2)return{label:"FEAR",col:"var(--bear)"};
  if(pc>=0.9)return{label:"NEUTRAL",col:"var(--neutral)"};
  if(pc>=0.7)return{label:"GREED",col:"var(--bull)"};
  return{label:"EXTREME GREED",col:"var(--bull)"};
}

// ── MYFXBOOK API — multi-proxy fallback ──────────────────────────────────────
const PROXIES=[
  u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,
  u=>`https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  u=>`https://thingproxy.freeboard.io/fetch/${u}`,
];
async function proxyFetch(targetUrl){
  for(const makeProxy of PROXIES){
    try{
      const r=await fetch(makeProxy(targetUrl));
      if(!r.ok)continue;
      const text=await r.text();
      try{const outer=JSON.parse(text);if(outer.contents)return JSON.parse(outer.contents);return outer;}
      catch(e){return JSON.parse(text);}
    }catch(e){continue;}
  }
  throw new Error("All proxies failed");
}
async function myfxLogin(email,password){
  const d=await proxyFetch(`https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
  if(d.error)throw new Error(d.message||"Login error");
  return d.session;
}
async function myfxGetOutlook(session){
  const d=await proxyFetch(`https://www.myfxbook.com/api/get-community-outlook.json?session=${session}`);
  if(d.error)throw new Error(d.message||"Session expired");
  return d.symbols;
}
async function fetchMyfxbookSentiment(){
  if(!state.mfxEmail||!state.mfxPassword)throw new Error("No credentials");
  let session=state.mfxSession;
  if(session){try{return await myfxGetOutlook(session);}catch(e){session=null;}}
  session=await myfxLogin(state.mfxEmail,state.mfxPassword);
  state.mfxSession=session;saveKey("mfx_session",session);
  return await myfxGetOutlook(session);
}

function loadMyfxbookData(){
  if(!state.mfxEmail||!state.mfxPassword||state.sentimentLoading)return;
  state.sentimentLoading=true;
  // ✅ Always show demo data immediately while fetching — never blank
  if(activeTab==="sentiment")renderSentiment();
  // Set a hard 15s timeout — if all proxies fail, show demo data
  const timeout=setTimeout(()=>{
    state.sentimentLoading=false;
    state.sentimentLive=false;
    if(activeTab==="sentiment")renderSentiment();
  },15000);
  fetchMyfxbookSentiment().then(symbols=>{
    clearTimeout(timeout);
    state.sentimentData=symbols.map(s=>({
      name:s.name,
      longPercentage:parseFloat(s.longPercentage),
      shortPercentage:parseFloat(s.shortPercentage),
      longVolume:parseInt(s.longVolume)||0,
      shortVolume:parseInt(s.shortVolume)||0,
      longPositions:parseInt(s.longPositions)||0,
      shortPositions:parseInt(s.shortPositions)||0,
    }));
    state.sentimentLive=true;
    state.sentimentLoading=false;
    if(activeTab==="sentiment")renderSentiment();
  }).catch(e=>{
    clearTimeout(timeout);
    console.log("Myfxbook error:",e.message);
    state.sentimentLoading=false;
    state.sentimentLive=false;
    // Show demo data — no blank screen
    if(activeTab==="sentiment")renderSentiment();
  });
}

// ── OTHER API FETCHERS ────────────────────────────────────────────────────────
async function fetchRates(){const r=await fetch("https://api.frankfurter.app/latest?from=USD");if(!r.ok)throw new Error();return(await r.json()).rates;}
async function fetchPrev(){const d=new Date();d.setDate(d.getDate()-1);if(d.getDay()===0)d.setDate(d.getDate()-2);if(d.getDay()===6)d.setDate(d.getDate()-1);const r=await fetch("https://api.frankfurter.app/"+d.toISOString().split("T")[0]+"?from=USD");if(!r.ok)throw new Error();return(await r.json()).rates;}
async function fetchFearGreed(){const r=await fetch("https://api.alternative.me/fng/?limit=30&format=json");if(!r.ok)throw new Error();const d=await r.json();if(!d.data||!d.data.length)throw new Error();return d.data;}
function buildStrength(rates){if(!rates)return null;const all={...rates,USD:1};const st={};CURRS.forEach(c=>{st[c.code]=0;});CURRS.forEach(b=>CURRS.forEach(q=>{if(b.code===q.code||!all[b.code])return;st[b.code]+=Math.log(1/all[b.code])*.1;}));const vs=Object.values(st),mn=Math.min(...vs),mx=Math.max(...vs);return CURRS.map(c=>({...c,val:st[c.code]||0,pct:mx!==mn?((st[c.code]-mn)/(mx-mn))*100:50})).sort((a,b)=>b.val-a.val);}
async function fredFetch(id,key,lim){const r=await fetch("https://api.stlouisfed.org/fred/series/observations?series_id="+id+"&api_key="+key+"&file_type=json&sort_order=desc&limit="+lim);if(!r.ok)throw new Error();const d=await r.json();const v=(d.observations||[]).filter(o=>o.value!==".");if(!v.length)throw new Error();return v;}
async function fetchFREDEcon(key){const res={};for(const[cur,series]of Object.entries(FRED_SERIES)){res[cur]=[];for(const s of series){try{const obs=await fredFetch(s.id,key,13);let val=parseFloat(obs[0].value);const date=obs[0].date;let surprise=0;if(s.yoy&&obs.length>=13){const pv=parseFloat(obs[12].value);if(!isNaN(pv)&&pv!==0)val=((val-pv)/pv)*100;}if(obs.length>=2){const pv=parseFloat(obs[1].value);if(!isNaN(pv)){const diff=val-pv;if(Math.abs(diff)>.3)surprise=diff>0?.5:-.5;else if(Math.abs(diff)>.1)surprise=diff>0?.2:-.2;}}res[cur].push({l:s.label,v:isNaN(val)?"N/A":s.fmt(val),s:surprise,d:date?new Date(date).toLocaleDateString([],{month:"short",year:"numeric"}):""})}catch(e){const fb=(FALLBACK_ECON[cur]||[]).find(f=>f.l===s.label);res[cur].push(fb?{...fb}:{l:s.label,v:"N/A",s:0,d:""});}await new Promise(r=>setTimeout(r,150));}}return res;}
function loadFREDData(){if(!state.fredKey||state.econLoading)return;state.econLoading=true;fetchFREDEcon(state.fredKey).then(d=>{state.econData=d;state.econLive=true;state.econLoading=false;if(activeTab==="econ")renderEcon();}).catch(()=>{state.econLoading=false;});}

async function refreshAll(){
  document.getElementById("rbtn-icon").classList.add("spinning");
  renderActive();
  const[r1,r2,r3]=await Promise.allSettled([fetchRates(),fetchPrev(),fetchFearGreed()]);
  if(r1.status==="fulfilled")state.rates=r1.value;
  if(r2.status==="fulfilled")state.prevRates=r2.value;
  if(r3.status==="fulfilled"&&r3.value&&r3.value.length){state.fgData=r3.value;state.fgLive=true;}
  state.cdata=buildStrength(state.rates);
  saveScoreHistory(); // ✅ Save today's scores to localStorage for History tab
  // Load live sentiment from Myfxbook
  loadCOTData();
  loadMyfxbookData();
  loadSeasonalityLive();
  loadPutCallData();
  loadAAIIData();
  if(state.fredKey){state.econData=null;state.econLive=false;loadFREDData();}
  const now=new Date();
  document.getElementById("last-update").textContent=now.toLocaleDateString([],{month:"short",day:"numeric"})+" "+now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  renderActive();
  document.getElementById("rbtn-icon").classList.remove("spinning");
}

// ── TOP SETUPS ────────────────────────────────────────────────────────────────
// ── SCORE HISTORY STORAGE ────────────────────────────────────────────────────
function saveScoreHistory(){
  const today=new Date().toISOString().split("T")[0];
  const entry={};
  ASSETS_SCORED.forEach(a=>entry[a.id]=a.total);
  try{localStorage.setItem("ef_sh_"+today,JSON.stringify(entry));}catch(e){}
}

function loadScoreHistory(){
  const history=[];
  // Build last 60 calendar days
  for(let i=59;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const key="ef_sh_"+d.toISOString().split("T")[0];
    try{
      const raw=localStorage.getItem(key);
      if(raw)history.push({date:d,scores:JSON.parse(raw)});
    }catch(e){}
  }
  return history;
}
function scoreAllAssets(liveData) {
  const out = {};
  ASSETS_SCORED.forEach(a => { out[a.id] = calculateAssetScore(a, liveData); });
  return out;
}

function buildForexPairs(ccyScores) {
  return SC_FOREX_PAIRS.map(p => ({
    ...p, ...calculateForexScore(p.base, p.quote, ccyScores),
  }));
}

// ── STEP 7: UI updaters — patch existing DOM without full re-render ───────────
function updateAssetUI(scored) {
  const sc = scored.totalScore;
  const bc = sc >= 3 ? "var(--bull)" : sc <= -3 ? "var(--bear)" : sc >= 1 ? "#7effc4" : sc <= -1 ? "#ff8fa0" : "var(--neutral)";

  // Score number
  const scEl = document.getElementById("sc-score-num");
  if (scEl) { scEl.textContent = (sc >= 0 ? "+" : "") + sc; scEl.style.color = bc; }

  // Gauge SVG — replace entire SVG element
  const gaugeWrap = document.getElementById("sc-gauge-wrap");
  if (gaugeWrap) gaugeWrap.innerHTML = scGaugeSVG(sc, 10);

  // Bias label
  const biasEl = document.getElementById("sc-bias-lbl");
  const biasBg = sc >= 3 ? "rgba(0,255,136,.15)" : sc <= -3 ? "rgba(255,59,92,.15)" : "rgba(240,180,41,.12)";
  if (biasEl) { biasEl.textContent = scored.bias; biasEl.style.color = bc; biasEl.style.background = biasBg; }

  // Component bars — each bar has data-comp attribute
  const comp = scored.components;
  const compVals = {
    technical: comp.technical, sentiment: comp.sentiment, cot: comp.cot,
    growth: comp.growth, inflation: comp.inflation, jobs: comp.jobs,
  };
  Object.entries(compVals).forEach(([key, val]) => {
    const row = document.querySelector(`[data-sc-comp="${key}"]`);
    if (!row) return;
    const fill = row.querySelector(".sc-comp-bar-fill");
    const text = row.querySelector(".sc-comp-val");
    const pct  = Math.round(Math.max(0, Math.min(100, ((val + 2) / 4) * 100)));
    const col  = val >= 1 ? "var(--bull)" : val <= -1 ? "var(--bear)" : "var(--neutral)";
    if (fill) { fill.style.width = pct + "%"; fill.style.background = col; }
    if (text) { text.textContent = (val >= 0 ? "+" : "") + val; text.style.color = col; }
  });

  // Status badge
  const stEl = document.getElementById("sc-status");
  if (stEl) {
    const isLive = state.cotLive || state.sentimentLive || state.econLive;
    stEl.className = isLive ? "cbadge-live" : "cbadge-demo";
    stEl.textContent = isLive ? "● LIVE DATA" : "STATIC DATA";
  }
}

function updateForexUI(pairs, ccyScores) {
  pairs.forEach(fx => {
    const card = document.querySelector(`[data-fx-pair="${fx.id}"]`);
    if (!card) return;

    const pCol = fx.pairScore >= 3 ? "var(--bull)" : fx.pairScore <= -3 ? "var(--bear)"
               : fx.pairScore >= 1 ? "#7effc4" : fx.pairScore <= -1 ? "#ff8fa0" : "var(--neutral)";
    const pBg  = fx.pairScore >= 3 ? "rgba(0,255,136,.12)" : fx.pairScore <= -3 ? "rgba(255,59,92,.12)" : "rgba(240,180,41,.08)";
    const SCORE_MAX = 10;

    // Bias badge
    const badge = card.querySelector(".sc-tbl-badge");
    if (badge) {
      badge.className = `sc-tbl-badge ${fx.pairScore>=1?"badge-bull":fx.pairScore<=-1?"badge-bear":"badge-neut"}`;
      badge.textContent = fx.bias;
    }
    // Pair score pill
    const pill = card.querySelector("[data-fx-score]");
    if (pill) { pill.textContent = (fx.pairScore>=0?"+":"")+fx.pairScore; pill.style.color=pCol; pill.style.background=pBg; }

    // Base bar + value
    const baseBar = card.querySelector("[data-fx-bar='base']");
    const baseVal = card.querySelector("[data-fx-val='base']");
    const basePct = Math.round(Math.max(5,Math.min(95,50+(fx.baseScore/SCORE_MAX)*45)));
    const baseCol = fx.baseScore>=1?"var(--bull)":fx.baseScore<=-1?"var(--bear)":"var(--neutral)";
    if (baseBar) { baseBar.style.width=basePct+"%"; baseBar.style.background=baseCol; }
    if (baseVal) { baseVal.textContent=(fx.baseScore>=0?"+":"")+fx.baseScore; baseVal.style.color=baseCol; }

    // Quote bar + value
    const quoteBar = card.querySelector("[data-fx-bar='quote']");
    const quoteVal = card.querySelector("[data-fx-val='quote']");
    const quotePct = Math.round(Math.max(5,Math.min(95,50+(fx.quoteScore/SCORE_MAX)*45)));
    const quoteCol = fx.quoteScore>=1?"var(--bull)":fx.quoteScore<=-1?"var(--bear)":"var(--neutral)";
    if (quoteBar) { quoteBar.style.width=quotePct+"%"; quoteBar.style.background=quoteCol; }
    if (quoteVal) { quoteVal.textContent=(fx.quoteScore>=0?"+":"")+fx.quoteScore; quoteVal.style.color=quoteCol; }
  });

  // Currency strength ranking
  const csEl = document.getElementById("sc-ccy-ranking");
  if (csEl && ccyScores) {
    const csMax = Math.max(...Object.values(ccyScores).map(Math.abs), 1);
    const sorted = Object.entries(ccyScores).sort((a,b)=>b[1]-a[1]);
    csEl.innerHTML = sorted.map(([ccy,sc],i)=>{
      const col=sc>=1?"var(--bull)":sc<=-1?"var(--bear)":"var(--neutral)";
      const pct=Math.round(Math.max(5,Math.min(95,50+(sc/csMax)*45)));
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:10px;color:var(--muted);width:16px">${i+1}</span>
        <span style="font-family:var(--mono);font-size:12px;font-weight:bold;color:${col};width:36px">${ccy}</span>
        <div style="flex:1;height:7px;background:var(--bg4);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:4px"></div>
        </div>
        <span style="font-family:var(--mono);font-size:12px;font-weight:bold;color:${col};width:28px;text-align:right">${sc>=0?"+":""}${sc}</span>
      </div>`;
    }).join("");
  }

  // Forex status badge
  const fxSt = document.getElementById("fx-status");
  if (fxSt) {
    const isLive = state.cotLive || state.sentimentLive || state.econLive;
    fxSt.className = isLive ? "cbadge-live" : "cbadge-demo";
    fxSt.textContent = isLive ? "● LIVE DATA" : "STATIC DATA";
  }
}

// ── STEP 8: ENGINE — orchestrate fetch → score → update ─────────────────────
let _engineRunning = false;

async function runEngine() {
  if (_engineRunning) return;           // prevent overlap
  if (!document.getElementById("page-scorecard")) return; // DOM not ready
  _engineRunning = true;
  try {
    const liveData   = await fetchAllData();
    const allScores  = scoreAllAssets(liveData);
    const ccyScores  = buildCurrencyScores(liveData);
    const fxPairs    = buildForexPairs(ccyScores);

    // Store results in state so renderers can access them
    state.scLiveData   = liveData;
    state.scAllScores  = allScores;
    state.scCcyScores  = ccyScores;
    state.scFxPairs    = fxPairs;
    state.scLastRun    = Date.now();

    // Update active tab's UI — either patch existing DOM or re-render
    if (activeTab === "scorecard") {
      const raw = ASSETS_SCORED.find(a => a.id === state.scAsset) || ASSETS_SCORED[0];
      const sc  = allScores[raw.id] || calculateAssetScore(raw, liveData);
      // Try DOM patch first; fall back to full re-render if IDs missing
      if (document.getElementById("sc-score-num")) updateAssetUI(sc);
      else renderScorecard();
    }
    if (activeTab === "forex") {
      if (document.querySelector("[data-fx-pair]")) updateForexUI(fxPairs, ccyScores);
      else renderForexScorecard();
    }
  } catch(e) {
    console.warn("runEngine error:", e.message);
  } finally {
    _engineRunning = false;
  }
}

// ── HELPERS: retained + kept identical ───────────────────────────────────────
function scGaugeSVG(score, maxRange) {
  // Semicircle gauge — institutional style: muted zones, precise needle
  const cx=77, cy=76, r=58;
  const pct = Math.max(0, Math.min(1, (score + maxRange) / (2 * maxRange)));
  const angle = Math.PI - pct * Math.PI;
  const nx = cx + r * 0.72 * Math.cos(angle);
  const ny = cy - r * 0.72 * Math.sin(angle);
  const col = score >= 3 ? "#34d399" : score >= 1 ? "#6ee7b7"
            : score <= -3 ? "#f87171" : score <= -1 ? "#fca5a5" : "#9ca3af";

  const arcPt = a => ({
    x: parseFloat((cx + r * Math.cos(a)).toFixed(2)),
    y: parseFloat((cy - r * Math.sin(a)).toFixed(2)),
  });
  const p0   = arcPt(Math.PI);
  const p33  = arcPt(Math.PI * 0.67);
  const p67  = arcPt(Math.PI * 0.33);
  const p100 = arcPt(0);

  // Thin tick marks at 25% intervals
  const ticks = [0.25, 0.5, 0.75].map(f => {
    const a = Math.PI - f * Math.PI;
    const r1 = r + 3, r2 = r + 9;
    return `<line x1="${(cx+r1*Math.cos(a)).toFixed(1)}" y1="${(cy-r1*Math.sin(a)).toFixed(1)}"
              x2="${(cx+r2*Math.cos(a)).toFixed(1)}" y2="${(cy-r2*Math.sin(a)).toFixed(1)}"
              stroke="rgba(255,255,255,.15)" stroke-width="1"/>`;
  }).join("");

  return `<svg viewBox="0 0 154 88" class="sc-gauge-svg">
    <defs>
      <linearGradient id="gBull" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(52,211,153,.08)"/>
        <stop offset="100%" stop-color="rgba(52,211,153,.25)"/>
      </linearGradient>
      <linearGradient id="gBear" x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="rgba(248,113,113,.08)"/>
        <stop offset="100%" stop-color="rgba(248,113,113,.25)"/>
      </linearGradient>
    </defs>
    <!-- Track -->
    <path d="M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p100.x} ${p100.y}"
      fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10" stroke-linecap="butt"/>
    <!-- Bear zone -->
    <path d="M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p33.x} ${p33.y}"
      fill="none" stroke="rgba(248,113,113,.3)" stroke-width="10" stroke-linecap="butt"/>
    <!-- Neutral zone -->
    <path d="M ${p33.x} ${p33.y} A ${r} ${r} 0 0 1 ${p67.x} ${p67.y}"
      fill="none" stroke="rgba(156,163,175,.2)" stroke-width="10" stroke-linecap="butt"/>
    <!-- Bull zone -->
    <path d="M ${p67.x} ${p67.y} A ${r} ${r} 0 0 1 ${p100.x} ${p100.y}"
      fill="none" stroke="rgba(52,211,153,.3)" stroke-width="10" stroke-linecap="butt"/>
    <!-- Tick marks -->
    ${ticks}
    <!-- Needle shadow -->
    <line x1="${cx}" y1="${cy}" x2="${(nx+0.5).toFixed(1)}" y2="${(ny+0.5).toFixed(1)}"
      stroke="rgba(0,0,0,.5)" stroke-width="3" stroke-linecap="round"/>
    <!-- Needle -->
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
      stroke="${col}" stroke-width="2" stroke-linecap="round"/>
    <!-- Hub -->
    <circle cx="${cx}" cy="${cy}" r="5" fill="#0d1117" stroke="${col}" stroke-width="1.5"/>
    <!-- Labels -->
    <text x="14" y="83" fill="rgba(255,255,255,.25)" font-size="7.5" font-family="monospace">${-maxRange}</text>
    <text x="${cx-5}" y="16" fill="rgba(255,255,255,.25)" font-size="7.5" font-family="monospace">0</text>
    <text x="126" y="83" fill="rgba(255,255,255,.25)" font-size="7.5" font-family="monospace">+${maxRange}</text>
  </svg>`;
}


function scCompBar(label, value, maxVal, compKey) {
  const pct = Math.round(Math.max(0, Math.min(100, ((value + maxVal) / (2 * maxVal)) * 100)));
  const col = value >= 1 ? "var(--bull)" : value <= -1 ? "var(--bear)" : "var(--neutral)";
  return `<div class="sc-comp-row" data-sc-comp="${compKey || label.toLowerCase().replace(/\s+/g,'_')}">
    <span class="sc-comp-lbl">${label}</span>
    <div class="sc-comp-bar-track">
      <div class="sc-comp-bar-fill" style="width:${pct}%;background:${col}"></div>
    </div>
    <span class="sc-comp-val" style="color:${col}">${value>0?"+":""}${value}</span>
  </div>`;
}

const DP_CACHE = {};
const DP_TTL = {
  rates:     5  * 60 * 1000,
  feargreed: 15 * 60 * 1000,
  sentiment: 3  * 60 * 60 * 1000,
  cot:       12 * 60 * 60 * 1000,
  econ:      6  * 60 * 60 * 1000,
  putcall:   60 * 60 * 1000,
};
const DP_STATE = {
  rates_running:false, sentiment_running:false, cot_running:false,
  econ_running:false,  feargreed_running:false, putcall_running:false,
  rates_next:0, sentiment_next:0, cot_next:0,
  econ_next:0,  feargreed_next:0, putcall_next:0,
};

function dpCacheValid(key) {
  const e = DP_CACHE[key];
  return !!(e && e.ts && e.data && (Date.now() - e.ts) < (DP_TTL[key] || 0));
}
function dpCacheSet(key, data, source) {
  DP_CACHE[key] = { data, ts: Date.now(), source, stale: false };
  try { localStorage.setItem('ef_dp_ts_'+key, String(Date.now())); } catch(ex){}
}
function dpMarkStale(key) { if (DP_CACHE[key]) DP_CACHE[key].stale = true; }
function dpFreshness(key) {
  const e = DP_CACHE[key];
  if (!e || !e.ts) return { label:'No data', color:'#8b949e' };
  const age = (Date.now() - e.ts) / 1000;
  if (e.stale)    return { label:'Stale',    color:'#e05c6a' };
  if (age < 300)  return { label:'Live',     color:'#00ff88' };
  if (age < 3600) return { label:Math.round(age/60)+'m ago',  color:'#4a90d9' };
  return { label:Math.round(age/3600)+'h ago', color:'#f0b429' };
}
window.dpFreshness = dpFreshness;

function dpTriggerEngine(sourceKey) {
  if (dpTriggerEngine._t) clearTimeout(dpTriggerEngine._t);
  dpTriggerEngine._t = setTimeout(async () => {
    try { await runEngine(); } catch(ex) { console.warn('[DP] engine error:', ex.message); }
  }, 400);
}
dpTriggerEngine._t = null;

async function dpFetchRates() {
  if (DP_STATE.rates_running || dpCacheValid('rates')) return;
  DP_STATE.rates_running = true;
  try {
    const [cur, prev] = await Promise.allSettled([fetchRates(), fetchPrev()]);
    if (cur.status === 'fulfilled' && cur.value) {
      state.rates = cur.value;
      state.cdata = buildStrength(cur.value);
      dpCacheSet('rates', cur.value, 'Frankfurter');
    } else dpMarkStale('rates');
    if (prev.status === 'fulfilled') state.prevRates = prev.value;
    DP_STATE.rates_next = Date.now() + DP_TTL.rates;
    dpTriggerEngine('rates');
  } catch(ex) { console.warn('[DP] rates:', ex.message); dpMarkStale('rates'); }
  finally { DP_STATE.rates_running = false; }
}

async function dpFetchFearGreed() {
  if (DP_STATE.feargreed_running || dpCacheValid('feargreed')) return;
  DP_STATE.feargreed_running = true;
  try {
    const data = await fetchFearGreed();
    if (data && data.length) {
      state.fgData = data; state.fgLive = true;
      dpCacheSet('feargreed', data, 'alternative.me');
      DP_STATE.feargreed_next = Date.now() + DP_TTL.feargreed;
      dpTriggerEngine('feargreed');
    }
  } catch(ex) { console.warn('[DP] feargreed:', ex.message); dpMarkStale('feargreed'); state.fgLive = false; }
  finally { DP_STATE.feargreed_running = false; }
}

async function dpFetchSentiment() {
  if (DP_STATE.sentiment_running) return;
  if (dpCacheValid('sentiment') && state.sentimentLive) return;
  if (!state.mfxEmail || !state.mfxPassword) return;
  DP_STATE.sentiment_running = true;
  const t = setTimeout(() => { DP_STATE.sentiment_running = false; dpMarkStale('sentiment'); }, 18000);
  try {
    const symbols = await fetchMyfxbookSentiment();
    clearTimeout(t);
    if (symbols && symbols.length) {
      state.sentimentData = symbols.map(s => ({
        name: s.name, longPercentage: parseFloat(s.longPercentage),
        shortPercentage: parseFloat(s.shortPercentage),
        longVolume: parseInt(s.longVolume)||0, shortVolume: parseInt(s.shortVolume)||0,
        longPositions: parseInt(s.longPositions)||0, shortPositions: parseInt(s.shortPositions)||0,
      }));
      state.sentimentLive = true; state.sentimentLoading = false;
      dpCacheSet('sentiment', state.sentimentData, 'Myfxbook');
      DP_STATE.sentiment_next = Date.now() + DP_TTL.sentiment;
      if (activeTab === 'sentiment') renderSentiment();
      dpTriggerEngine('sentiment');
    }
  } catch(ex) {
    clearTimeout(t);
    console.warn('[DP] sentiment:', ex.message);
    state.sentimentLive = false; state.sentimentLoading = false; dpMarkStale('sentiment');
  } finally { DP_STATE.sentiment_running = false; }
}

async function dpFetchCOT() {
  if (DP_STATE.cot_running || dpCacheValid('cot')) return;
  const today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('ef_dp_cot_day') === today && state.cotLive && state.cotData && state.cotData.length) {
    if (!DP_CACHE.cot) dpCacheSet('cot', state.cotData, 'CFTC');
    return;
  }
  DP_STATE.cot_running = true;
  try {
    const rows = await fetchCFTCData();
    if (rows && rows.length) {
      state.cotData = rows; state.cotLive = true; state.cotLastUpdate = Date.now();
      dpCacheSet('cot', rows, 'CFTC');
      localStorage.setItem('ef_dp_cot_day', today);
      DP_STATE.cot_next = Date.now() + DP_TTL.cot;
      if (activeTab === 'cot') renderCOT();
      dpTriggerEngine('cot');
    }
  } catch(ex) { console.warn('[DP] COT:', ex.message); state.cotLive = false; dpMarkStale('cot'); }
  finally { DP_STATE.cot_running = false; }
}

async function dpFetchEcon() {
  if (DP_STATE.econ_running || dpCacheValid('econ')) return;
  if (!state.fredKey) return;
  DP_STATE.econ_running = true;
  try {
    const data = await fetchFREDEcon(state.fredKey);
    if (data) {
      state.econData = data; state.econLive = true; state.econLoading = false;
      dpCacheSet('econ', data, 'FRED');
      DP_STATE.econ_next = Date.now() + DP_TTL.econ;
      if (activeTab === 'econ') renderEcon();
      dpTriggerEngine('econ');
    }
  } catch(ex) { console.warn('[DP] FRED:', ex.message); state.econLive = false; state.econLoading = false; dpMarkStale('econ'); }
  finally { DP_STATE.econ_running = false; }
}

async function dpFetchPutCall() {
  if (DP_STATE.putcall_running || dpCacheValid('putcall')) return;
  DP_STATE.putcall_running = true;
  try {
    const data = await fetchPutCall();
    if (data && data.length) {
      state.putCallData = data; state.putCallLive = true;
      dpCacheSet('putcall', data, 'CBOE');
      DP_STATE.putcall_next = Date.now() + DP_TTL.putcall;
      dpTriggerEngine('putcall');
    }
  } catch(ex) { console.warn('[DP] put/call:', ex.message); state.putCallLive = false; dpMarkStale('putcall'); }
  finally { DP_STATE.putcall_running = false; }
}

async function dpUpdateCBRates() {
  if (!state.fredKey) return;
  const rateMap = {
    USD: { id:'FEDFUNDS',    label:'Fed Rate' },
    EUR: { id:'ECBDFR',      label:'ECB Rate' },
    GBP: { id:'IUDSOIA',     label:'BoE Rate' },
    JPY: { id:'IRSTJPN156N', label:'BoJ Rate' },
  };
  for (const [ccy, series] of Object.entries(rateMap)) {
    try {
      const obs    = await fredFetch(series.id, state.fredKey, 3);
      if (!obs || !obs.length) continue;
      const latest = parseFloat(obs[0].value);
      const prev   = obs.length >= 2 ? parseFloat(obs[1].value) : latest;
      if (isNaN(latest) || !FX_CB_DATA[ccy]) continue;
      FX_CB_DATA[ccy].rate = latest;
      if (!isNaN(prev) && Math.abs(latest - prev) > 0.01)
        FX_CB_DATA[ccy].trend = latest > prev ? 1 : -1;
      FX_CB_DATA[ccy].label = FX_CB_DATA[ccy].trend === 1 ? 'Hiking'
                            : FX_CB_DATA[ccy].trend === -1 ? 'Cutting' : 'Hold';
      await new Promise(r => setTimeout(r, 200));
    } catch(ex) { /* silent fallback — static FX_CB_DATA remains */ }
  }
  dpTriggerEngine('cb_rates');
}
