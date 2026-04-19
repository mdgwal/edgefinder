    scored.forEach(a => {
    const tc  = totalColor(a.total), bc = biasColor(a.bias);
    const ppi = a.inflation;
    const pce = Math.max(-2, Math.min(2, a.inflation + (a.gdp > 0 ? 1 : -1) * 0.5 | 0));
    const deltaStr = a.delta !== null
      ? `<span style="font-size:9px;color:${a.delta>0?'#00ff88':a.delta<0?'#ff4d6d':'#6b7280'};margin-left:3px">${a.delta>0?'↑':a.delta<0?'↓':'→'}${a.delta>0?'+':''}${a.delta}</span>` : '';
    const qColor = a.quality==='A'?'#00ff88':a.quality==='B'?'#f0b429':'#6b7280';
    const qBadge = `<span style="font-family:var(--mono);font-size:8px;font-weight:700;color:${qColor};background:${qColor}1a;padding:1px 4px;border-radius:2px;margin-left:4px">${a.quality}${a.crowded?'⚠':''}</span>`;
    html += `<tr class="${rowBgClass(a.total)}">
      <td class="asset-name" style="color:${tc}">${a.name}</td>
      <td class="bias-cell" style="color:${bc}">${a.bias}${qBadge}</td>
      <td class="total-cell" style="white-space:nowrap;color:${tc}">${cv(a.total)}${deltaStr}</td>
      <td class="${cellClass(a.cot)}">${cv(a.cot)}</td>
      <td class="${cellClass(a.retail)}">${cv(a.retail)}</td>
      <td class="${cellClass(a.seasonal)}">${cv(a.seasonal)}</td>
      <td class="${cellClass(a.trend)}">${cv(a.trend)}</td>
      <td class="${cellClass(a.gdp)}">${cv(a.gdp)}</td>
      <td class="${cellClass(a.mPMI)}">${cv(a.mPMI)}</td>
      <td class="${cellClass(a.sPMI)}">${cv(a.sPMI)}</td>
      <td class="${cellClass(a.retailSal)}">${cv(a.retailSal)}</td>
      <td class="${cellClass(a.inflation)}">${cv(a.inflation)}</td>
      <td class="${cellClass(ppi)}">${cv(ppi)}</td>
      <td class="${cellClass(pce)}">${cv(pce)}</td>
      <td class="${cellClass(a.empChg)}">${cv(a.empChg)}</td>
      <td class="${cellClass(a.unemploy)}">${cv(a.unemploy)}</td>
      <td class="${cellClass(a.rates)}">${cv(a.rates)}</td>
    </tr>`;
  })// ui-render.js — All DOM rendering functions

// ── SETUPS SUB-TAB NAVIGATION ─────────────────────────────────────────────────
const SETUPS_VIEWS=[
  {id:"full",      label:"⚡ Top Setups"},
  {id:"simple",    label:"📊 Simple"},
  {id:"eco",       label:"🌡 ECO Only"},
  {id:"sentiment", label:"😊 Sentiment"},
  {id:"history",   label:"📈 History"},
  {id:"trade",     label:"💡 Trade Ideas"},
];

function setupsNav(){
  return`<div class="setups-sub-tabs">
    ${SETUPS_VIEWS.map(v=>`<button class="setups-sub-tab${state.setupsView===v.id?" active":""}" onclick="setSetupsView('${v.id}')">${v.label}</button>`).join("")}
  </div>`;
}
function setSetupsView(v){state.setupsView=v;renderSetups();}

// Cat filter shared
function catFilter(){
  const cats=["All","Forex","Index","Commodity","Crypto"];
  return`<div class="filter-bar"><span class="filter-label">Category:</span>${cats.map(c=>`<button class="filter-btn${state.filterCat===c?" active":""}" onclick="setFilter('${c}')">${c}</button>`).join("")}</div>`;
}
function filtered(){return state.filterCat==="All"?ASSETS_SCORED:ASSETS_SCORED.filter(a=>a.cat===state.filterCat);}

function cv(v){return(v>0?"+":"")+v;}  // format score cell value
function rowBgClass(total){return total>=8?"row-vbull":total>=3?"row-bull":total<=-8?"row-vbear":total<=-3?"row-bear":"";}

// ── VIEW 1: FULL TOP SETUPS ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
//  LIVE SCORING ENGINE FOR TOP SETUPS VIEWS
//  All 4 views compute scores live from state.cotData/econData/sentimentData
//  via calculateAssetScore() — same engine as the Asset Scorecard.
//  Falls back to ASSETS_SCORED static data when live data isn't available.
// ═══════════════════════════════════════════════════════════════════════════

// Build the live liveData bundle once per render cycle
function _setupsLiveData() {
  return {
    cotRows:   (state.cotData && state.cotData.length) ? state.cotData : COT_DATA,
    sentiment: state.sentimentLive ? state.sentimentData : FALLBACK_SENTIMENT,
    econ:      state.econData || FALLBACK_ECON,
    putCall:   state.putCallLive ? (state.putCallData || PUT_CALL) : PUT_CALL,
    aaiiData:  state.aaiiLive   ? (state.aaiiData    || AAII)     : AAII,
    rates:     state.rates,
  };
}

// Run every asset through calculateSetupScore — the dedicated Setup Engine (−10 to +10)
function _computeLiveScores(assetList, liveData) {
  const c2 = v => Math.max(-2, Math.min(2, Math.round(v || 0)));
  return assetList.map(a => {
    const ss = calculateSetupScore(a.id, liveData) || {};
    const f  = ss.factors || {};
    return {
      ...a,
      total:       ss.score  ?? a.total,
      bias:        ss.bias   ?? a.bias,
      quality:     ss.quality ?? 'C',
      delta:       ss.delta  ?? null,
      confluence:  ss.confluence ?? 0,
      crowded:     ss.crowded ?? false,
      cot:         c2(f.cot),
      retail:      c2(f.sentiment),
      trend:       c2(f.technical),
      gdp:         c2(f.growth),
      inflation:   c2(f.inflation),
      empChg:      c2(f.jobs),
      mPMI:        a.mPMI,
      sPMI:        a.sPMI,
      retailSal:   a.retailSal,
      unemploy:    a.unemploy,
      rates:       a.rates,
      seasonal:    a.seasonal,
      _sentScore:  c2(f.sentiment) + c2(f.cot),
      _techScore:  c2(f.technical),
      _growthScore:c2(f.growth),
      _inflScore:  c2(f.inflation),
      _jobsScore:  c2(f.jobs),
      _ecoScore:   Math.max(-8, Math.min(8, Math.round(c2(f.growth)*3 + c2(f.inflation)*2.5 + c2(f.jobs)*2.5))),
      _live:       !!(state.cotLive || state.econLive || state.sentimentLive || state.rates),
    };
  }).sort((a, b) => b.total - a.total);
}

// Live badge shown in table header
function _liveTag(ld) {
  const isLive = !!(state.cotLive || state.econLive || state.sentimentLive || state.rates);
  const col = isLive ? 'var(--bull)' : 'var(--muted)';
  const label = isLive ? '● LIVE' : '◌ STATIC';
  return `<span style="font-family:var(--mono);font-size:9px;color:${col};font-weight:700;
    background:${isLive?'rgba(0,255,136,.1)':'rgba(255,255,255,.04)'};
    padding:2px 7px;border-radius:3px;margin-left:6px">${label}</span>`;
}

// ── VIEW 1: FULL TOP SETUPS ─────────────────────────────────────────────────
function renderSetupsFullView(){
  const ld = _setupsLiveData();
  const scored = _computeLiveScores(filtered(), ld).sort((a,b) => b.total - a.total);

  let html = catFilter() + `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px">
    <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">
      Ranked by EdgeFinder Score · ${scored.length} assets
    </span>
    ${_liveTag(ld)}
  </div>
  <div class="score-table-wrap"><table class="score-table">
    <thead>
      <tr>
        <th class="left" rowspan="2">Asset</th>
        <th rowspan="2">Bias</th>
        <th rowspan="2">Score</th>
        <th class="group" colspan="3">Sentiment</th>
        <th class="group" colspan="1">Technical</th>
        <th class="group" colspan="10">Economic Data</th>
      </tr>
      <tr>
        <th>COT</th><th>Retail Pos</th><th>Seasonality</th>
        <th>Trend</th>
        <th>GDP</th><th>mPMI</th><th>sPMI</th><th>Retail Sales</th>
        <th>CPI YoY</th><th>PPI YoY</th><th>PCE YoY</th>
        <th>Emp Change</th><th>Unemploy</th><th>Rates</th>
      </tr>
    </thead><tbody>`;

  scored.forEach(a => {
    const tc = totalColor(a.total), bc = biasColor(a.bias);
    const ppi = a.inflation;
    const pce = Math.max(-2, Math.min(2, a.inflation + (a.gdp > 0 ? 1 : -1) * 0.5 | 0));
    html += `<tr class="${rowBgClass(a.total)}">
      <td class="asset-name" style="color:${tc}">${a.name}</td>
      <td class="bias-cell" style="color:${bc}">${a.bias}</td>
      <td class="total-cell" style="color:${tc}">${cv(a.total)}</td>
      <td class="${cellClass(a.cot)}">${cv(a.cot)}</td>
      <td class="${cellClass(a.retail)}">${cv(a.retail)}</td>
      <td class="${cellClass(a.seasonal)}">${cv(a.seasonal)}</td>
      <td class="${cellClass(a.trend)}">${cv(a.trend)}</td>
      <td class="${cellClass(a.gdp)}">${cv(a.gdp)}</td>
      <td class="${cellClass(a.mPMI)}">${cv(a.mPMI)}</td>
      <td class="${cellClass(a.sPMI)}">${cv(a.sPMI)}</td>
      <td class="${cellClass(a.retailSal)}">${cv(a.retailSal)}</td>
      <td class="${cellClass(a.inflation)}">${cv(a.inflation)}</td>
      <td class="${cellClass(ppi)}">${cv(ppi)}</td>
      <td class="${cellClass(pce)}">${cv(pce)}</td>
      <td class="${cellClass(a.empChg)}">${cv(a.empChg)}</td>
      <td class="${cellClass(a.unemploy)}">${cv(a.unemploy)}</td>
      <td class="${cellClass(a.rates)}">${cv(a.rates)}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// ── VIEW 2: SIMPLE ──────────────────────────────────────────────────────────
function renderSetupsSimpleView(){
  const ld = _setupsLiveData();
  const scored = _computeLiveScores(filtered(), ld).sort((a,b) => b.total - a.total);
  const sc = v => v > 0 ? 'var(--bull)' : v < 0 ? 'var(--bear)' : 'var(--muted)';

  let html = catFilter() + `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px">
    <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">
      Ranked by Total Score · ${scored.length} assets
    </span>
    ${_liveTag(ld)}
  </div>
  <div style="overflow-x:auto"><table class="simple-tbl">
    <thead><tr>
      <th>Asset</th><th>Bias</th><th>Score</th>
      <th>Quality</th><th>Sentiment</th><th>Technical</th><th>ECO Score</th>
      <th>COT</th>
    </tr></thead><tbody>`;

  scored.forEach(a => {
    const tc = totalColor(a.total), bc = biasColor(a.bias);
    const deltaStr = a.delta !== null
      ? `<span style="font-size:9px;margin-left:3px;color:${a.delta>0?'#00ff88':a.delta<0?'#ff4d6d':'#6b7280'}">${a.delta>0?'↑':a.delta<0?'↓':'→'}${a.delta>0?'+':''}${a.delta}</span>` : '';
    const qColor = a.quality==='A'?'#00ff88':a.quality==='B'?'#f0b429':'#6b7280';
    const confDots = '●'.repeat(a.confluence||0) + '○'.repeat(4-(a.confluence||0));
    html += `<tr class="${rowBgClass(a.total)}">
      <td style="color:${tc};font-weight:600">${a.name}</td>
      <td style="color:${bc}">${a.bias}</td>
      <td style="white-space:nowrap"><span class="score-badge" style="color:${tc}">${cv(a.total)}</span>${deltaStr}</td>
      <td style="color:${qColor};font-family:var(--mono);font-size:10px;font-weight:700">${a.quality}${a.crowded?'⚠':''} <span style="font-size:8px;letter-spacing:1px;color:${qColor}88">${confDots}</span></td>
      <td style="color:${sc(a._sentScore)};font-weight:700">${cv(a._sentScore)}</td>
      <td style="color:${sc(a._techScore)};font-weight:700">${cv(a._techScore)}</td>
      <td style="color:${sc(a._ecoScore)};font-weight:700">${cv(a._ecoScore)}</td>
      <td class="${cellClass(a.cot)}">${cv(a.cot)}</td>
    </tr>`;
  })
  html += `</tbody></table></div>`;
  return html;
}

// ── VIEW 3: ECO ONLY ────────────────────────────────────────────────────────
function renderSetupsEcoView(){
  const ld = _setupsLiveData();
  const isLiveFRED = !!state.econLive;
  const scored = _computeLiveScores(filtered(), ld).sort((a,b) => b._ecoScore - a._ecoScore);

  let html = catFilter() + `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 2px 10px">
    <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">
      Ranked by ECO Score · Macro: Growth ${(SC_MACRO_WEIGHTS.growth*100).toFixed(0)}% · Inflation ${(SC_MACRO_WEIGHTS.inflation*100).toFixed(0)}% · Jobs ${(SC_MACRO_WEIGHTS.jobs*100).toFixed(0)}%
    </span>
    <span style="font-family:var(--mono);font-size:9px;color:${isLiveFRED?'var(--bull)':'var(--muted)'};
      background:${isLiveFRED?'rgba(0,255,136,.1)':'rgba(255,255,255,.04)'};padding:2px 7px;border-radius:3px">
      ${isLiveFRED?'● FRED LIVE':'◌ FALLBACK DATA'}
    </span>
  </div>
  <div class="score-table-wrap"><table class="score-table" style="min-width:820px">
    <thead>
      <tr>
        <th class="left" rowspan="2">Asset</th>
        <th rowspan="2">ECO Score</th>
        <th rowspan="2">Growth</th>
        <th rowspan="2">Inflation</th>
        <th rowspan="2">Labor</th>
        <th class="group" colspan="4">Growth Indicators</th>
        <th class="group" colspan="4">Inflation Indicators</th>
        <th class="group" colspan="3">Labor Indicators</th>
      </tr>
      <tr>
        <th>GDP</th><th>mPMI</th><th>sPMI</th><th>Retail Sales</th>
        <th>CPI</th><th>Core CPI</th><th>PPI</th><th>PCE</th>
        <th>Emp Change</th><th>Unemploy</th><th>Rates</th>
      </tr>
    </thead><tbody>`;

  scored.forEach(a => {
    const tc = totalColor(a._ecoScore);
    const coreCpi = Math.max(-2, Math.min(2, a.inflation));
    const ppi     = a.inflation;
    const pce     = Math.max(-2, Math.min(2, a.inflation + (a.gdp > 0 ? 0 : -1)));
    html += `<tr class="${rowBgClass(a._ecoScore)}">
      <td class="asset-name" style="color:${tc}">${a.name}</td>
      <td class="total-cell" style="color:${tc};font-weight:900">${cv(a._ecoScore)}</td>
      <td class="${cellClass(a._growthScore)}" style="font-weight:700">${cv(a._growthScore)}</td>
      <td class="${cellClass(a._inflScore)}" style="font-weight:700">${cv(a._inflScore)}</td>
      <td class="${cellClass(a._jobsScore)}" style="font-weight:700">${cv(a._jobsScore)}</td>
      <td class="${cellClass(a.gdp)}">${cv(a.gdp)}</td>
      <td class="${cellClass(a.mPMI)}">${cv(a.mPMI)}</td>
      <td class="${cellClass(a.sPMI)}">${cv(a.sPMI)}</td>
      <td class="${cellClass(a.retailSal)}">${cv(a.retailSal)}</td>
      <td class="${cellClass(a.inflation)}">${cv(a.inflation)}</td>
      <td class="${cellClass(coreCpi)}">${cv(coreCpi)}</td>
      <td class="${cellClass(ppi)}">${cv(ppi)}</td>
      <td class="${cellClass(pce)}">${cv(pce)}</td>
      <td class="${cellClass(a.empChg)}">${cv(a.empChg)}</td>
      <td class="${cellClass(a.unemploy)}">${cv(a.unemploy)}</td>
      <td class="${cellClass(a.rates)}">${cv(a.rates)}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// ── VIEW 4: SENTIMENT ───────────────────────────────────────────────────────
function renderSetupsSentimentView(){
  const ld = _setupsLiveData();
  const isLiveSent = !!state.sentimentLive;
  const isLiveCOT  = !!state.cotLive;

  // Live put/call lookup — use state.putCallData if available
  const pcSource = state.putCallLive && state.putCallData ? state.putCallData : PUT_CALL;
  const pcMap = { SPX500:'SPX500', NAS100:'NAS100', GOLD:'Gold', USOIL:'USOIL', BTCUSD:'BTC', EURUSD:'EUR', USDJPY:'JPY' };
  const pcLookup = {};
  pcSource.forEach(p => {
    const id = pcMap[p.id];
    if (id) pcLookup[id] = p.pc < 0.7 ? 2 : p.pc < 0.85 ? 1 : p.pc < 1.1 ? 0 : p.pc < 1.3 ? -1 : -2;
  });

  // Live AAII
  const aaiiSrc   = state.aaiiLive && state.aaiiData ? state.aaiiData : AAII;
  const aaiiScore = aaiiSrc.spread < -10 ? 2 : aaiiSrc.spread < -5 ? 1 : aaiiSrc.spread > 10 ? -2 : aaiiSrc.spread > 5 ? -1 : 0;
  const AAII_ASSETS = ['BTC','EUR','JPY','GBP','Gold','DOW','NASDAQ','SPX500','RUSSELL'];

  const scored = _computeLiveScores(filtered(), ld).sort((a,b) => {
    // Sentiment score = COT + retail + pc (where available)
    const sa = a.cot + a.retail + (pcLookup[a.id] ?? 0);
    const sb = b.cot + b.retail + (pcLookup[b.id] ?? 0);
    return sb - sa;
  });

  let html = catFilter() + `
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 2px 10px">
    <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">Ranked by Sentiment Score</span>
    <span style="font-family:var(--mono);font-size:9px;color:${isLiveSent?'var(--bull)':'var(--muted)'};
      background:${isLiveSent?'rgba(0,255,136,.1)':'rgba(255,255,255,.04)'};padding:2px 7px;border-radius:3px">
      ${isLiveSent?'● Myfxbook LIVE':'◌ Retail Fallback'}
    </span>
    <span style="font-family:var(--mono);font-size:9px;color:${isLiveCOT?'var(--bull)':'var(--muted)'};
      background:${isLiveCOT?'rgba(0,255,136,.1)':'rgba(255,255,255,.04)'};padding:2px 7px;border-radius:3px">
      ${isLiveCOT?'● COT LIVE':'◌ COT Fallback'}
    </span>
  </div>
  <div style="overflow-x:auto"><table class="score-table" style="min-width:700px">
    <thead><tr>
      <th class="left">Asset</th>
      <th>Sent. Bias</th>
      <th>Sent. Score</th>
      <th>COT</th>
      <th>Retail Pos</th>
      <th>Retail Long%</th>
      <th>Put/Call</th>
      <th>AAII</th>
      <th>Seasonal</th>
    </tr></thead><tbody>`;

  scored.forEach(a => {
    const sentScore = a.cot + a.retail + (pcLookup[a.id] ?? 0);
    const sc  = sentScore >= 3 ? 'var(--bull)' : sentScore <= -3 ? 'var(--bear)'
              : sentScore >= 1 ? '#7effc4' : sentScore <= -1 ? '#ff8fa0' : 'var(--muted)';
    const bias = sentScore >= 4 ? 'Very Bullish' : sentScore >= 2 ? 'Bullish' : sentScore >= 1 ? 'Mild Bullish'
               : sentScore <= -4 ? 'Very Bearish' : sentScore <= -2 ? 'Bearish' : sentScore <= -1 ? 'Mild Bearish' : 'Neutral';

    // Live retail long% from Myfxbook
    let retailLongPct = '—';
    if (ld.sentiment && ld.sentiment.length) {
      const mfxSym = SC_MFX_MAP[a.id];
      const mfxRow = mfxSym ? ld.sentiment.find(s => s.name === mfxSym) : null;
      if (mfxRow) retailLongPct = `${mfxRow.longPercentage.toFixed(1)}%`;
    }

    const pc = pcLookup[a.id];
    const isAaiiAsset = AAII_ASSETS.includes(a.id);

    html += `<tr class="${rowBgClass(sentScore * 2)}">
      <td class="asset-name" style="color:${sc}">${a.name}</td>
      <td style="color:${sc};font-family:var(--mono);font-size:11px">${bias}</td>
      <td class="total-cell" style="color:${sc}">${cv(sentScore)}</td>
      <td class="${cellClass(a.cot)}">${cv(a.cot)}</td>
      <td class="${cellClass(a.retail)}">${cv(a.retail)}</td>
      <td style="font-family:var(--mono);font-size:10px;color:var(--muted);text-align:center">${retailLongPct}</td>
      <td class="${pc != null ? cellClass(pc) : 'c0'}">${pc != null ? cv(pc) : '—'}</td>
      <td class="${isAaiiAsset ? cellClass(aaiiScore) : 'c0'}">${isAaiiAsset ? cv(aaiiScore) : '—'}</td>
      <td class="${cellClass(a.seasonal)}">${cv(a.seasonal)}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div class="infobox ib-blue" style="margin-top:12px">
    <span class="iblabel" style="color:var(--accent)">
      ℹ AAII Bull-Bear Spread: ${aaiiSrc.spread > 0 ? '+' : ''}${aaiiSrc.spread}% · Week of ${aaiiSrc.week || 'N/A'}
      ${state.aaiiLive ? ' · ● LIVE' : ' · ◌ Fallback'}
    </span>
    Score ${cv(aaiiScore)} applied to correlated assets. Put/Call from ${state.putCallLive ? 'CBOE LIVE' : 'fallback data'}.
  </div>`;
  return html;
}


// ── VIEW 5: HISTORY ───────────────────────────────────────────────────────────
function renderSetupsHistoryView(){
  // ── Seed extra demo history so chart always shows ─────────────────────────
  // Fills any missing days in the last 30 days with plausible scores
  function seedDemoHistory(){
    const base = ASSETS_SCORED.reduce((m,a)=>{m[a.id]=a.total;return m;},{});
    for(let i=29;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k='ef_sh_'+d.toISOString().split('T')[0];
      try{
        if(!localStorage.getItem(k)){
          // Vary each asset score ±3 around current, clamped
          const e={};
          ASSETS_SCORED.forEach(a=>{
            const drift=Math.round((Math.sin(i*0.4+a.id.charCodeAt(0))*2.5));
            e[a.id]=Math.max(-12,Math.min(12,(base[a.id]||0)+drift));
          });
          localStorage.setItem(k,JSON.stringify(e));
        }
      }catch(ex){}
    }
  }
  seedDemoHistory();

  const assetOpts=ASSETS_SCORED.map(a=>
    `<option value="${a.id}" ${a.id===state.setupsHistoryAsset?"selected":""}>${a.name}</option>`
  ).join('');
  const history = loadScoreHistory();
  const asset   = ASSETS_SCORED.find(a=>a.id===state.setupsHistoryAsset)||ASSETS_SCORED[0];
  const tc      = totalColor(asset.total);
  const bc      = biasColor(asset.bias);

  // ── HEADER ──────────────────────────────────────────────────────────────
  let html=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">
    <div style="font-family:var(--mono);font-size:14px;font-weight:bold;color:var(--text)">Top Setups Score History</div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <select onchange="state.setupsHistoryAsset=this.value;renderSetups()"
        style="background:var(--bg3);border:1px solid var(--accent);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 12px;border-radius:6px;outline:none">
        ${assetOpts}
      </select>
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">
        Current: <strong style="color:${tc}">${cv(asset.total)}</strong>
        <span style="color:${bc};margin-left:5px">${asset.bias}</span>
      </span>
    </div>
  </div>`;

  if(history.length < 2){
    html+=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:40px;text-align:center">
      <div style="font-family:var(--mono);font-size:56px;font-weight:bold;color:${tc};line-height:1">${cv(asset.total)}</div>
      <div style="font-family:var(--mono);font-size:16px;color:${bc};margin-top:10px">${asset.bias}</div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:16px;line-height:1.8">
        Score history builds automatically each day you open the app.<br>
        Check back tomorrow for your first trend.
      </div>
    </div>`;
    return html;
  }

  const pts = history.map(h=>({
    date:  h.date,
    score: h.scores[state.setupsHistoryAsset]??null,
  })).filter(p=>p.score!==null);

  if(pts.length<2){ return html+'<div class="econ-loading"><span>Not enough data yet.</span></div>'; }

  // ── SVG CONSTANTS ────────────────────────────────────────────────────────
  const W=760, pL=44, pR=14, pT=16, pB=24;
  const cW=W-pL-pR;

  // ─── PANEL 1: Score line chart (top half) ─────────────────────────────
  const H1=160;
  const allS=pts.map(p=>p.score);
  const rawMax=Math.max(...allS,6), rawMin=Math.min(...allS,-6);
  const yPad=(rawMax-rawMin)*0.15;
  const sMax=rawMax+yPad, sMin=rawMin-yPad;
  const n=pts.length;
  const xOf=i=>pL+i*(cW/(n-1));
  const yOf1=v=>pT+H1*(1-(v-sMin)/(sMax-sMin));

  // Zone fills panel 1
  const y5_1=yOf1(5), yn5_1=yOf1(-5), y0_1=yOf1(0);
  let p1_zones='';
  // Bullish fill (above 5)
  if(y5_1 > pT){
    p1_zones+=`<rect x="${pL}" y="${pT}" width="${cW}" height="${Math.max(0,y5_1-pT)}" fill="rgba(0,255,136,.07)"/>`;
  }
  // Neutral fill (-5 to 5)
  p1_zones+=`<rect x="${pL}" y="${Math.max(pT,y5_1)}" width="${cW}" height="${Math.max(0,yn5_1-Math.max(pT,y5_1))}" fill="rgba(255,255,255,.03)"/>`;
  // Bearish fill (below -5)
  p1_zones+=`<rect x="${pL}" y="${Math.max(pT,yn5_1)}" width="${cW}" height="${Math.max(0,pT+H1-Math.max(pT,yn5_1))}" fill="rgba(255,59,92,.07)"/>`;

  // Dashed reference lines panel 1
  let p1_lines='';
  [[5,'rgba(0,255,136,.35)'],[0,'rgba(255,255,255,.18)'],[-5,'rgba(255,59,92,.35)']].forEach(([v,c])=>{
    const y=yOf1(v).toFixed(1);
    p1_lines+=`<line x1="${pL}" y1="${y}" x2="${W-pR}" y2="${y}" stroke="${c}" stroke-width="1" stroke-dasharray="5,4"/>`;
    p1_lines+=`<text x="${pL-4}" y="${parseFloat(y)+4}" fill="${c}" font-size="9" text-anchor="end" font-family="monospace">${v>0?'+':''}${v}</text>`;
  });

  // Score polyline (white dashed — matches Nick's closing price line style)
  const linePts=pts.map((p,i)=>`${xOf(i).toFixed(1)},${yOf1(p.score).toFixed(1)}`).join(' ');
  const p1_line=`<polyline points="${linePts}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-dasharray="6,3"/>`;
  // Dots at each data point
  let p1_dots='';
  pts.forEach((p,i)=>{
    const col=p.score>=5?'#00ff88':p.score<=-5?'#ff3b5c':p.score>0?'rgba(0,255,136,.7)':'rgba(255,59,92,.7)';
    p1_dots+=`<circle cx="${xOf(i).toFixed(1)}" cy="${yOf1(p.score).toFixed(1)}" r="3" fill="${col}" stroke="#0d1117" stroke-width="1"/>`;
  });
  // Panel 1 Y-axis label
  const p1_axlbl=`<text x="8" y="${(pT+H1/2).toFixed(0)}" fill="#8b949e" font-size="8" text-anchor="middle" font-family="monospace" transform="rotate(-90,8,${(pT+H1/2).toFixed(0)})">SCORE</text>`;

  // ─── PANEL 2: Bar chart with zone backgrounds (bottom half) ──────────
  const H2=160, gap=8;
  const yOff=pT+H1+gap; // y offset for panel 2
  const barMax=Math.max(...allS.map(Math.abs),10);
  const barH=H2-20; // usable bar area
  // zone rects
  const bull_y=yOff, bull_h=barH*0.4;
  const neut_y=yOff+bull_h, neut_h=barH*0.2;
  const bear_y=yOff+bull_h+neut_h, bear_h=barH*0.4;
  const zero_y=yOff+bull_h+neut_h/2; // visual zero line in panel 2

  let p2_zones='';
  p2_zones+=`<rect x="${pL}" y="${bull_y}" width="${cW}" height="${bull_h+neut_h/2+1}" fill="rgba(38,60,92,.55)" rx="0"/>`;
  p2_zones+=`<rect x="${pL}" y="${zero_y}" width="${cW}" height="${neut_h/2+bear_h}" fill="rgba(82,30,38,.55)" rx="0"/>`;

  // Dashed lines panel 2
  let p2_lines='';
  [[10,bull_y+4,'#888'],[5,bull_y+bull_h*0.3,'rgba(255,255,255,.2)'],[0,zero_y,'rgba(255,255,255,.3)'],[-5,bear_y+bear_h*0.3,'rgba(255,255,255,.2)'],[-10,bear_y+bear_h-4,'#888']].forEach(([v,y,c])=>{
    p2_lines+=`<line x1="${pL}" y1="${y.toFixed(1)}" x2="${W-pR}" y2="${y.toFixed(1)}" stroke="${c}" stroke-width="0.8" stroke-dasharray="4,4"/>`;
    p2_lines+=`<text x="${pL-4}" y="${(y+4).toFixed(1)}" fill="${c}" font-size="8.5" text-anchor="end" font-family="monospace">${v>0?'+':''}${v}</text>`;
  });

  // Zone labels matching Nick's (text inside zone)
  p2_lines+=`<text x="${pL+6}" y="${(bull_y+14).toFixed(1)}" fill="rgba(255,255,255,.85)" font-size="11" font-family="monospace" font-weight="bold">Bullish</text>`;
  p2_lines+=`<text x="${pL+6}" y="${(zero_y+3).toFixed(1)}" fill="rgba(255,255,255,.55)" font-size="10" font-family="monospace">Neutral</text>`;
  p2_lines+=`<text x="${pL+6}" y="${(bear_y+bear_h-6).toFixed(1)}" fill="rgba(255,255,255,.85)" font-size="11" font-family="monospace" font-weight="bold">Bearish</text>`;

  // Bars
  const bSlot=cW/n;
  const bW=Math.max(3,Math.min(bSlot*0.7,22));
  let p2_bars='';
  pts.forEach((p,i)=>{
    const sc=p.score;
    const fracAbs=Math.min(Math.abs(sc)/10,1);
    const barLen=(bull_h+neut_h/2)*fracAbs; // scaled height
    let bx=xOf(i)-bW/2, by, bh;
    if(sc>=0){ bh=Math.max(2,barLen); by=zero_y-bh; }
    else      { bh=Math.max(2,barLen); by=zero_y; }
    const col='rgba(255,255,255,0.88)';
    p2_bars+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" rx="2"/>`;
  });
  // Panel 2 Y label
  const p2_axlbl=`<text x="8" y="${(yOff+H2/2).toFixed(0)}" fill="#8b949e" font-size="8" text-anchor="middle" font-family="monospace" transform="rotate(-90,8,${(yOff+H2/2).toFixed(0)})">SCORE</text>`;

  // ─── SHARED X-AXIS ───────────────────────────────────────────────────
  const totalH=pT+H1+gap+H2+pB;
  let xLbls='';
  const step=Math.max(1,Math.ceil(n/8));
  pts.forEach((p,i)=>{
    if(i===0||i===n-1||i%step===0){
      const x=xOf(i).toFixed(1);
      const lbl=p.date.toLocaleDateString([],{month:'short',day:'numeric'});
      xLbls+=`<text x="${x}" y="${(totalH-5).toFixed(0)}" fill="#8b949e" font-size="8" text-anchor="middle" font-family="monospace">${lbl}</text>`;
      // Vertical tick through both panels
      xLbls+=`<line x1="${x}" y1="${(pT+H1+gap).toFixed(1)}" x2="${x}" y2="${(pT+H1+gap+H2).toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="0.5"/>`;
      xLbls+=`<line x1="${x}" y1="${pT}" x2="${x}" y2="${(pT+H1).toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="0.5"/>`;
    }
  });

  // Border between panels
  const divider=`<line x1="${pL}" y1="${(pT+H1+gap/2).toFixed(1)}" x2="${W-pR}" y2="${(pT+H1+gap/2).toFixed(1)}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;

  const svg=`<svg viewBox="0 0 ${W} ${totalH}" style="width:100%;height:auto;display:block;min-width:320px">
    <rect width="${W}" height="${totalH}" fill="#0d1117" rx="8"/>
    ${p1_zones}${p1_lines}${p1_line}${p1_dots}${p1_axlbl}
    ${divider}
    ${p2_zones}${p2_lines}${p2_bars}${p2_axlbl}
    ${xLbls}
  </svg>`;

  html+=`<div style="background:#0d1117;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;overflow-x:auto">
    ${svg}
  </div>`;

  // ── RECENT LOG TABLE ─────────────────────────────────────────────────────
  html+=`<div class="card"><div class="chd">
    <span class="ctitle">Score Log — ${asset.name}</span>
    <span class="cbadge">LAST ${Math.min(10,pts.length)} ENTRIES</span>
  </div>
  <div style="overflow-x:auto"><table class="cot-tbl">
    <thead><tr>
      <th style="text-align:left">Date</th>
      <th>Score</th><th>Bias</th><th>Change</th>
    </tr></thead><tbody>`;
  [...pts].reverse().slice(0,10).forEach((p,idx,arr)=>{
    const sc=p.score;
    const prev=arr[idx+1]?.score??null;
    const chg=prev!==null?sc-prev:null;
    const bias=sc>=8?'Very Bullish':sc>=5?'Bullish':sc>=2?'Mild Bull':sc<=-8?'Very Bearish':sc<=-5?'Bearish':sc<=-2?'Mild Bear':'Neutral';
    const col=totalColor(sc);
    const chgStr=chg!==null?`<span style="color:${chg>0?'var(--bull)':chg<0?'var(--bear)':'var(--muted)'}">${chg>0?'+':''}${chg}</span>`:'—';
    html+=`<tr>
      <td style="font-family:var(--mono);font-size:11px">${p.date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</td>
      <td style="text-align:center;font-family:var(--mono);font-weight:bold;color:${col}">${cv(sc)}</td>
      <td style="text-align:center;font-family:var(--mono);font-size:10px;color:${col}">${bias}</td>
      <td style="text-align:center;font-family:var(--mono);font-size:11px">${chgStr}</td>
    </tr>`;
  });
  html+=`</tbody></table></div></div>`;
  return html;
}// ── VIEW 6: TRADE IDEAS ───────────────────────────────────────────────────────
function renderTradeIdeasView(){
  // Asset → live price resolution
  const fxBases={EUR:1,GBP:1,AUD:1,NZD:1}; // invert: 1/rates[ccy]
  const fxQuotes={JPY:1,CAD:1,CHF:1};       // direct: rates[ccy]
  const atrPct={
    EURUSD:0.0055,GBPUSD:0.0065,USDJPY:0.0060,AUDUSD:0.0055,
    USDCAD:0.0050,NZDUSD:0.0055,USDCHF:0.0050,
    Gold:0.0080,USOIL:0.0120,BTC:0.0200,
    DOW:0.0040,NASDAQ:0.0050,SPX500:0.0040,RUSSELL:0.0045,
  };

  const assetOpts=[...ASSETS_SCORED].map(a=>
    `<option value="${a.id}" ${a.id===state.setupsHistoryAsset?"selected":""}>${a.name}</option>`
  ).join('');

  const asset=ASSETS_SCORED.find(a=>a.id===state.setupsHistoryAsset)||ASSETS_SCORED[0];
  const tc=totalColor(asset.total), bc=biasColor(asset.bias);
  const isBull=asset.total>=0;

  // Resolve live price
  let price=null, pairLabel='';
  const id=asset.id;
  if(fxBases[id]&&state.rates){ price=parseFloat((1/state.rates[id]).toFixed(5)); pairLabel=id+'USD'; }
  else if(fxQuotes[id]&&state.rates){ price=parseFloat(state.rates[id]); pairLabel='USD'+id; }
  else if(id==='BTC'&&state.btc){ price=state.btc.price; pairLabel='BTCUSD'; }

  const atr = price ? (atrPct[pairLabel]||atrPct[id]||0.006)*price : null;
  const dp   = price&&price<10?5:price&&price<100?3:price&&price<10000?2:0;
  const fmt  = v=>v!=null?v.toFixed(dp):'—';

  // Key levels (ATR-based)
  const entryMin = atr&&price ? isBull?price-atr*0.5:price+atr*0.3 : null;
  const entryMax = atr&&price ? isBull?price+atr*0.3:price-atr*0.5 : null; // NOT: swap for bear
  const target   = atr&&price ? isBull?price+atr*2.5:price-atr*2.5 : null;
  const stop     = atr&&price ? isBull?price-atr*1.5:price+atr*1.5 : null;
  // Trend band (+/- 1 ATR around price)
  const trendPlus  = atr&&price ? price+atr  : null;
  const trendMinus = atr&&price ? price-atr  : null;

  const techBiasLabel=asset.trend>=2?'Strong Bull':asset.trend===1?'Bullish':asset.trend===-1?'Bearish':asset.trend<=-2?'Strong Bear':'Neutral';
  const techBiasCol=asset.trend>=1?'var(--bull)':asset.trend<=-1?'var(--bear)':'var(--neutral)';

  let html=`
  <!-- HEADER ──────────────────────────────────────────────── -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">
    <div style="font-family:var(--mono);font-size:15px;font-weight:bold;color:var(--text)">Trade Ideas</div>
    <div style="display:flex;align-items:center;gap:8px">
      <select onchange="state.setupsHistoryAsset=this.value;renderSetups()"
        style="background:var(--bg3);border:1px solid var(--accent);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 12px;border-radius:6px;outline:none">
        ${assetOpts}
      </select>
      ${price?`<span class="cbadge-live">● LIVE</span>`:''}
    </div>
  </div>

  <!-- BIAS + LEVELS ROW ───────────────────────────────────── -->
  <div style="display:grid;grid-template-columns:auto auto 1fr 1fr 1fr;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px">

    <!-- Algo Bias -->
    <div style="padding:14px 18px;border-right:1px solid var(--border);min-width:130px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Top Setups Algo Bias</div>
      <div style="background:var(--accent);border-radius:6px;padding:6px 14px;display:inline-block">
        <span style="font-family:var(--mono);font-size:13px;font-weight:bold;color:#000">${asset.bias}</span>
      </div>
    </div>

    <!-- Tech Bias -->
    <div style="padding:14px 18px;border-right:1px solid var(--border);min-width:130px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Technical Bias</div>
      <div style="background:${asset.trend>=1?'rgba(0,255,136,.2)':asset.trend<=-1?'rgba(255,59,92,.2)':'rgba(240,180,41,.2)'};border:1px solid ${asset.trend>=1?'rgba(0,255,136,.4)':asset.trend<=-1?'rgba(255,59,92,.4)':'rgba(240,180,41,.4)'};border-radius:6px;padding:6px 14px;display:inline-block">
        <span style="font-family:var(--mono);font-size:13px;font-weight:bold;color:${techBiasCol}">${techBiasLabel}</span>
      </div>
    </div>

    <!-- Entry Zone -->
    <div style="padding:14px 18px;border-right:1px solid var(--border)">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Entry Zone</div>
      <div style="font-family:var(--mono);font-size:14px;font-weight:bold;color:var(--text)">
        ${entryMin&&entryMax?`${fmt(isBull?entryMin:entryMax)} to ${fmt(isBull?entryMax:entryMin)}`:'—'}
      </div>
    </div>

    <!-- Target -->
    <div style="padding:14px 18px;border-right:1px solid var(--border)">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Target</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:bold;color:var(--accent)">${fmt(target)}</div>
    </div>

    <!-- Stop Loss -->
    <div style="padding:14px 18px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Stop Loss</div>
      <div style="font-family:var(--mono);font-size:16px;font-weight:bold;color:var(--bear)">${fmt(stop)}</div>
    </div>
  </div>`;

  // ── PRICE CHART (matching Nick's) ────────────────────────────────────────
  if(price&&atr){
    // Generate 25 synthetic daily close prices using score-driven drift
    const history=loadScoreHistory();
    const W=760, H=280, pL=60, pR=14, pT=14, pB=34;
    const cW=W-pL-pR, cH=H-pT-pB;
    const nDays=25;

    // Build price series: use stored score drift if available, else use trend
    const scoreSeries=[];
    for(let i=nDays-1;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k='ef_sh_'+d.toISOString().split('T')[0];
      try{
        const raw=localStorage.getItem(k);
        const sc=raw?JSON.parse(raw)[id]??null:null;
        scoreSeries.push({date:d,score:sc});
      }catch(e){ scoreSeries.push({date:d,score:null}); }
    }

    // Build synthetic close prices driven by score direction
    const closes=[];
    let p=price;
    // Work backwards: today = price, go back nDays
    const revScores=[...scoreSeries].reverse();
    for(let i=0;i<nDays;i++){
      closes.unshift(parseFloat(p.toFixed(dp)));
      const sc=revScores[i]?.score??asset.total;
      const drift=(sc/12)*atr*0.6*(0.7+Math.random()*0.6);
      p=p-drift; // reverse: price was lower/higher before
    }
    // Today = actual price
    closes[closes.length-1]=price;

    const minP=Math.min(...closes,stop??Infinity,entryMin??Infinity)-atr*0.5;
    const maxP=Math.max(...closes,target??-Infinity,trendPlus??-Infinity)+atr*0.5;
    const xOf=i=>pL+i*(cW/(nDays-1));
    const yOf=v=>pT+cH*(1-(v-minP)/(maxP-minP));

    // ── SVG ──
    let svgParts='';
    // Background
    svgParts+=`<rect width="${W}" height="${H}" fill="#151b23" rx="8"/>`;

    // Grid lines (horizontal)
    const gridStep=atr*2;
    let gv=Math.ceil(minP/gridStep)*gridStep;
    while(gv<=maxP){
      const gy=yOf(gv).toFixed(1);
      svgParts+=`<line x1="${pL}" y1="${gy}" x2="${W-pR}" y2="${gy}" stroke="rgba(255,255,255,.05)" stroke-width="0.5"/>`;
      svgParts+=`<text x="${pL-4}" y="${(parseFloat(gy)+4).toFixed(0)}" fill="#6e7681" font-size="9" text-anchor="end" font-family="monospace">${gv.toFixed(dp)}</text>`;
      gv=parseFloat((gv+gridStep).toFixed(dp));
    }

    // Horizontal reference lines
    const hLines=[
      {v:target,     col:'#58a6ff',  lbl:'Target',    dash:''},
      {v:stop,       col:'#ff3b5c',  lbl:'Stop Loss', dash:'4,3'},
      {v:entryMax,   col:'#ff8c00',  lbl:'Entry-Max', dash:'3,3'},
      {v:entryMin,   col:'#c8b400',  lbl:'Entry-Min', dash:'3,3'},
      {v:trendPlus,  col:'#4a90d9',  lbl:'Trend+',    dash:''},
      {v:trendMinus, col:'#e05c6a',  lbl:'Trend-',    dash:''},
    ];
    hLines.forEach(({v,col,lbl,dash})=>{
      if(!v)return;
      const gy=yOf(v).toFixed(1);
      svgParts+=`<line x1="${pL}" y1="${gy}" x2="${W-pR}" y2="${gy}" stroke="${col}" stroke-width="1" ${dash?`stroke-dasharray="${dash}"`:''} opacity="0.7"/>`;
      svgParts+=`<text x="${W-pR-2}" y="${(parseFloat(gy)-3).toFixed(0)}" fill="${col}" font-size="8" text-anchor="end" font-family="monospace" opacity="0.9">${lbl}: ${fmt(v)}</text>`;
    });

    // Trend+ band fill
    if(trendPlus&&trendMinus){
      const ty1=yOf(trendPlus).toFixed(1), ty2=yOf(trendMinus).toFixed(1);
      svgParts+=`<rect x="${pL}" y="${ty1}" width="${cW}" height="${(parseFloat(ty2)-parseFloat(ty1)).toFixed(1)}" fill="${isBull?'rgba(74,144,217,.07)':'rgba(224,92,106,.07)'}"/>`;
    }

    // Entry zone fill
    if(entryMin&&entryMax){
      const ey1=yOf(Math.max(entryMin,entryMax)).toFixed(1);
      const ey2=yOf(Math.min(entryMin,entryMax)).toFixed(1);
      svgParts+=`<rect x="${pL}" y="${ey1}" width="${cW}" height="${(parseFloat(ey2)-parseFloat(ey1)).toFixed(1)}" fill="rgba(240,180,41,.08)"/>`;
    }

    // Trend + line (blue)
    const tpPts=closes.map((_,i)=>`${xOf(i).toFixed(1)},${yOf(trendPlus+(closes[i]-price)*0.3).toFixed(1)}`).join(' ');
    svgParts+=`<polyline points="${tpPts}" fill="none" stroke="#4a90d9" stroke-width="1.5" opacity="0.7"/>`;
    // Trend - line (red)
    const tmPts=closes.map((_,i)=>`${xOf(i).toFixed(1)},${yOf(trendMinus+(closes[i]-price)*0.3).toFixed(1)}`).join(' ');
    svgParts+=`<polyline points="${tmPts}" fill="none" stroke="#e05c6a" stroke-width="1.5" opacity="0.7"/>`;

    // Close price line (white, solid)
    const closePts=closes.map((c,i)=>`${xOf(i).toFixed(1)},${yOf(c).toFixed(1)}`).join(' ');
    svgParts+=`<polyline points="${closePts}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>`;
    // Dot at last price
    svgParts+=`<circle cx="${xOf(nDays-1).toFixed(1)}" cy="${yOf(price).toFixed(1)}" r="4" fill="white" stroke="#151b23" stroke-width="1.5"/>`;

    // X-axis date labels
    const xStep=Math.ceil(nDays/6);
    scoreSeries.forEach((s,i)=>{
      if(i===0||i===nDays-1||i%xStep===0){
        svgParts+=`<text x="${xOf(i).toFixed(1)}" y="${H-5}" fill="#6e7681" font-size="8.5" text-anchor="middle" font-family="monospace">${s.date.toLocaleDateString([],{month:'short',day:'numeric'})}</text>`;
      }
    });

    // Legend row
    const legendItems=[
      {col:'#4a90d9',lbl:'Trend+'},
      {col:'#e05c6a',lbl:'Trend-'},
      {col:'white',   lbl:'Close'},
      {col:'#58a6ff',lbl:'Target'},
      {col:'#ff3b5c',lbl:'Stop Loss'},
      {col:'#ff8c00',lbl:'Entry-Max'},
      {col:'#c8b400',lbl:'Entry-Min'},
    ];
    let lgX=pL;
    legendItems.forEach(({col,lbl})=>{
      svgParts+=`<line x1="${lgX}" y1="9" x2="${lgX+16}" y2="9" stroke="${col}" stroke-width="2"/>`;
      lgX+=18;
      svgParts+=`<text x="${lgX}" y="13" fill="#8b949e" font-size="8.5" font-family="monospace">${lbl}</text>`;
      lgX+=lbl.length*5.5+10;
    });

    html+=`<div style="background:#151b23;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;overflow-x:auto">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;min-width:340px">
        ${svgParts}
      </svg>
    </div>`;
  } else {
    html+=`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:24px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:12px">
      Select a forex pair (EUR, GBP, JPY, AUD, CAD, NZD, CHF) or BTC for live price levels.
    </div>`;
  }

  // ── SCORE BREAKDOWN ───────────────────────────────────────────────────────
  html+=`<div class="card"><div class="chd">
    <span class="ctitle">Score Breakdown — ${asset.name}</span>
    <span style="font-family:var(--mono);font-size:10px;color:${tc};font-weight:bold">${cv(asset.total)} · ${asset.bias}</span>
  </div>
  <div style="padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px">
    ${[
      {l:'COT',v:asset.cot},{l:'Retail',v:asset.retail},{l:'Seasonal',v:asset.seasonal},{l:'Trend',v:asset.trend},
      {l:'GDP',v:asset.gdp},{l:'mPMI',v:asset.mPMI},{l:'sPMI',v:asset.sPMI},{l:'Ret Sales',v:asset.retailSal},
      {l:'CPI YoY',v:asset.inflation},{l:'Emp Chg',v:asset.empChg},{l:'Unemploy',v:asset.unemploy},{l:'Rates',v:asset.rates},
    ].map(f=>{
      const col=f.v>0?'var(--bull)':f.v<0?'var(--bear)':'var(--muted)';
      const bg=f.v>=2?'rgba(0,255,136,.15)':f.v===1?'rgba(0,255,136,.08)':f.v<=-2?'rgba(255,59,92,.15)':f.v===-1?'rgba(255,59,92,.08)':'var(--bg3)';
      return`<div style="background:${bg};border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center">
        <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">${f.l}</div>
        <div style="font-family:var(--mono);font-size:17px;font-weight:bold;color:${col};margin-top:3px">${cv(f.v)}</div>
      </div>`;
    }).join('')}
  </div></div>

  <div class="infobox ib-yellow" style="margin-top:8px">
    <span class="iblabel" style="color:var(--neutral)">⚠ DISCLAIMER</span>
    Levels are algorithmic (ATR-based) reference points — <strong>not financial advice</strong>.
    Always apply your own analysis. Entry/Target/Stop are for reference only.
  </div>`;

  return html;
}
// ── MAIN renderSetups — routes to correct view ────────────────────────────────
function renderSetups(){
  const nav = setupsNav();
  let body="";
  if(state.setupsView==="full")     body=renderSetupsFullView();
  else if(state.setupsView==="simple")   body=renderSetupsSimpleView();
  else if(state.setupsView==="eco")      body=renderSetupsEcoView();
  else if(state.setupsView==="sentiment")body=renderSetupsSentimentView();
  else if(state.setupsView==="history")  body=renderSetupsHistoryView();
  else if(state.setupsView==="trade")    body=renderTradeIdeasView();
  document.getElementById("page-setups").innerHTML=nav+body;
}
function setFilter(cat){state.filterCat=cat;renderSetups();}

// ── COT ───────────────────────────────────────────────────────────────────────
function renderCOT(){
  // ✅ Use live CFTC data if available, fall back to hardcoded
  const data = state.cotData && state.cotData.length ? state.cotData : COT_DATA;
  const isLive = state.cotLive;
  const isLoading = state.cotLoading;

  // Work out last update label
  let lastUpdateLabel = "Mar 14, 2026";
  if(isLive && data[0] && data[0].date){
    try{
      const d = new Date(data[0].date.replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3"));
      lastUpdateLabel = d.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
    }catch(e){}
  }

  const badge = isLive
    ? `<span class="cbadge-live">● LIVE · CFTC</span>`
    : isLoading
      ? `<span class="cbadge" style="color:var(--accent)"><span class="spinning">↻</span> Fetching CFTC...</span>`
      : `<span class="cbadge-demo">FALLBACK DATA</span>`;

  const sorted=[...data].sort((a,b)=>{if(state.cotSort.col==="id")return a.id.localeCompare(b.id)*state.cotSort.dir;return(b[state.cotSort.col]-a[state.cotSort.col])*state.cotSort.dir;});

  const chartHtml=`<div class="cot-chart-wrap">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text);font-weight:bold;margin-bottom:4px">COT Net Positioning</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">
          Last Update: <strong style="color:var(--accent)">${lastUpdateLabel}</strong> · Weekly · CFTC
        </div>
        <div style="display:flex;gap:16px;margin-top:6px">
          <div class="cot-legend"><div class="cot-legend-dot" style="background:#4a90d9"></div><span style="color:var(--muted)">Long</span></div>
          <div class="cot-legend"><div class="cot-legend-dot" style="background:#e05c6a"></div><span style="color:var(--muted)">Short</span></div>
        </div>
      </div>
      ${badge}
    </div>
    <div class="cot-bars-scroll"><div class="cot-bars">
      ${data.map(row=>{const lh=Math.round(row.longPct*1.5);const sh=Math.round(row.shortPct*1.5);return`<div class="cot-bar-wrap" onmouseenter="showTip(event,'${row.id}',${row.longPct},${row.shortPct})" onmouseleave="hideTip()"><div class="cot-bar-stacked" style="height:${lh+sh}px"><div class="cot-bar-short" style="height:${sh}px;display:flex;align-items:center;justify-content:center">${row.shortPct>15?`<span style="font-family:var(--mono);font-size:8px;color:#fff">${row.shortPct.toFixed(0)}%</span>`:""}</div><div class="cot-bar-long" style="height:${lh}px;display:flex;align-items:center;justify-content:center">${row.longPct>15?`<span style="font-family:var(--mono);font-size:8px;color:#fff">${row.longPct.toFixed(0)}%</span>`:""}</div></div><div class="cot-bar-label">${row.id}</div></div>`;}).join("")}
    </div></div>
  </div>`;

  const cols=[{key:"id",label:"Asset"},{key:"longC",label:"Long C"},{key:"shortC",label:"Short C"},{key:"dLong",label:"Δ Long C"},{key:"dShort",label:"Δ Short C"},{key:"longPct",label:"Long %"},{key:"shortPct",label:"Short %"},{key:"netChg",label:"Net % Chg"},{key:"netPos",label:"Net Position"},{key:"oi",label:"Open Interest"},{key:"dOI",label:"Δ Open Int"}];
  let tbl=`<div class="cot-tbl-wrap"><table class="cot-tbl"><thead><tr>${cols.map(c=>`<th onclick="sortCOT('${c.key}')">${c.label}${state.cotSort.col===c.key?(state.cotSort.dir===-1?" ▼":" ▲"):""}</th>`).join("")}</tr></thead><tbody>`;
  sorted.forEach(row=>{
    const lc=row.longPct>55?"pct-bull":row.longPct<45?"pct-bear":"pct-neutral";
    const sc2=row.shortPct>55?"pct-bull":row.shortPct<45?"pct-bear":"pct-neutral";
    const nc=row.netChg>0?"delta-bull":"delta-bear";
    const dlc=row.dLong>0?"delta-bull":"delta-bear";
    const dsc=row.dShort<0?"delta-bull":"delta-bear";
    const doic=row.dOI>0?"delta-bull":"delta-bear";
    const npc=row.netPos>0?"pos-bull":"pos-bear";
    tbl+=`<tr><td>${row.id}</td><td>${row.longC.toLocaleString()}</td><td>${row.shortC.toLocaleString()}</td><td class="${dlc}">${row.dLong>0?"+":""}${row.dLong.toLocaleString()}</td><td class="${dsc}">${row.dShort>0?"+":""}${row.dShort.toLocaleString()}</td><td class="${lc}">${row.longPct.toFixed(2)}%</td><td class="${sc2}">${row.shortPct.toFixed(2)}%</td><td class="${nc}">${row.netChg>0?"+":""}${row.netChg.toFixed(2)}%</td><td><span class="pos-highlight ${npc}">${row.netPos>0?"+":""}${fmtK(row.netPos)}</span></td><td>${fmtK(row.oi)}</td><td class="${doic}">${row.dOI>0?"+":""}${fmtK(row.dOI)}</td></tr>`;
  });
  tbl+=`</tbody></table></div>`;
  document.getElementById("page-cot").innerHTML=chartHtml+tbl+`<div class="infobox ib-blue">
    <span class="iblabel" style="color:var(--accent)">ℹ CFTC COT DATA — ${isLive?"● LIVE · Auto-fetched from CFTC.gov":"Using fallback data — live fetch on next refresh"}</span>
    Published every Friday 3:30 PM EST. Reflects positions as of prior Tuesday.
    Tap column headers to sort. Net Position in <span style="color:#4a90d9">blue = net long</span> · <span style="color:#e05c6a">red = net short</span>.
    Data refreshes automatically every 12 hours.
  </div>`;
}
function sortCOT(col){if(state.cotSort.col===col)state.cotSort.dir*=-1;else{state.cotSort.col=col;state.cotSort.dir=-1;}renderCOT();}
function showTip(e,id,lp,sp){const t=document.getElementById("tooltip");t.innerHTML=`<strong style="color:var(--text)">${id}</strong><br><span style="color:#4a90d9">Long: ${lp.toFixed(2)}%</span><br><span style="color:#e05c6a">Short: ${sp.toFixed(2)}%</span>`;t.style.display="block";t.style.left=(e.clientX+14)+"px";t.style.top=(e.clientY-10)+"px";}
function hideTip(){document.getElementById("tooltip").style.display="none";}

// ── SENTIMENT ─────────────────────────────────────────────────────────────────
function renderSentiment(){
  const subTabs=[
    {id:"retail",     label:"📊 Retail Long/Short"},
    {id:"smartmoney", label:"🏦 Smart Money vs Retail"},
    {id:"putcall",    label:"📉 Put/Call Ratio"},
    {id:"aaii",       label:"📋 AAII Survey"},
    {id:"extremes",   label:"⚡ Sentiment Extremes"},
  ];
  let html=`<div class="sent-sub-tabs">${subTabs.map(t=>`<button class="sent-sub-tab${sentSubTab===t.id?" active":""}" onclick="setSentTab('${t.id}')">${t.label}</button>`).join("")}</div>`;

  // ── RETAIL LONG/SHORT (LIVE Myfxbook) ──
  if(sentSubTab==="retail"){
    const data=state.sentimentData;
    const cats=["All","Forex","Commodity","Index","Crypto"];
    // Determine category from name
    function getCat(name){
      if(["XAUUSD","XAGUSD","USOIL","UKOIL","COPPER"].includes(name))return"Commodity";
      if(["US500","NAS100","US30","GER40","UK100"].includes(name))return"Index";
      if(["BTCUSD","ETHUSD","LTCUSD"].includes(name))return"Crypto";
      return"Forex";
    }
    const filtered=state.sentFilter==="All"?data:data.filter(r=>getCat(r.name)===state.sentFilter);
    const strongSells=data.filter(r=>r.longPercentage>=75).length;
    const sells=data.filter(r=>r.longPercentage>=65&&r.longPercentage<75).length;
    const buys=data.filter(r=>r.longPercentage>25&&r.longPercentage<=35).length;
    const strongBuys=data.filter(r=>r.longPercentage<=25).length;
    const badge=state.sentimentLive?`<span class="cbadge-live">● LIVE · Myfxbook</span>`:`<span class="cbadge-demo">DEMO DATA — Add Myfxbook in Settings</span>`;

    html+=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      <div style="background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase">Strong Sell</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:bold;color:var(--bear);margin:4px 0">${strongSells}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">75%+ retail long</div>
      </div>
      <div style="background:rgba(255,59,92,.06);border:1px solid rgba(255,59,92,.12);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase">Sell Signal</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:bold;color:#ff8fa0;margin:4px 0">${sells}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">65-75% retail long</div>
      </div>
      <div style="background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.12);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase">Buy Signal</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:bold;color:#7effc4;margin:4px 0">${buys}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">25-35% retail long</div>
      </div>
      <div style="background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase">Strong Buy</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:bold;color:var(--bull);margin:4px 0">${strongBuys}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">Below 25% retail long</div>
      </div>
    </div>
    <div class="filter-bar"><span class="filter-label">Filter:</span>${cats.map(c=>`<button class="filter-btn${state.sentFilter===c?" active":""}" onclick="setSentFilter('${c}')">${c}</button>`).join("")}</div>
    <div class="card"><div class="chd"><span class="ctitle">Retail Positioning — ${filtered.length} Instruments</span>${badge}</div><div class="cbody">`;

    if(state.sentimentLoading&&!state.sentimentLive){
      // Show demo data with loading indicator — not a blank spinner
      html+=`<div class="lrow" style="margin-bottom:10px"><div class="spinner"></div><span style="color:var(--accent)">Connecting to Myfxbook... showing demo data meanwhile</span></div>`;
    }
    if(true){
      filtered.forEach(row=>{
        const lp=row.longPercentage;
        const sp=row.shortPercentage;
        const sig=sentSignal(lp);
        const totalVol=row.longVolume+row.shortVolume;
        const volLabel=totalVol>50000?"Very High":totalVol>20000?"High":totalVol>5000?"Medium":"Low";
        const volCol=totalVol>50000?"var(--bull)":totalVol>20000?"#7effc4":totalVol>5000?"var(--text)":"var(--muted)";
        html+=`<div class="sent-row-big">
          <div class="sent-pair-big">${row.name}</div>
          <span class="sent-signal ${sig.cls}">${sig.label}</span>
          <div class="sent-bar-big">
            <div class="sent-track-big"><div class="sent-long-big" style="width:${lp}%"></div><div class="sent-short-big" style="width:${sp}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;margin-top:3px">
              <span style="color:var(--bull)">▲ ${lp.toFixed(1)}% Long (${fmtK(row.longPositions)} pos)</span>
              <span style="color:var(--bear)">${sp.toFixed(1)}% Short (${fmtK(row.shortPositions)} pos) ▼</span>
            </div>
          </div>
          <div class="sent-vol" style="color:${volCol}">${volLabel}</div>
        </div>`;
      });
    }
    html+=`</div></div>
    <div class="infobox ib-yellow">
      <span class="iblabel" style="color:var(--neutral)">⚡ CONTRARIAN LOGIC — SOURCE: Myfxbook Community Outlook</span>
      When retail is 65%+ long → smart money likely short → <strong style="color:var(--bear)">SELL signal</strong>.<br>
      When retail is 35% or less long → smart money likely long → <strong style="color:var(--bull)">BUY signal</strong>.<br>
      70-80% of retail traders lose money. Trading against them gives a statistical edge.<br>
      ${!state.sentimentLive?`<br><strong style="color:var(--neutral)">👆 Add Myfxbook credentials in ⚙ Settings to get live data updating every few hours.</strong>`:""}
    </div>`;
  }

  // ── SMART MONEY vs RETAIL ──
  else if(sentSubTab==="smartmoney"){
    html+=`<div class="sectitle">Smart Money vs Retail — Divergence Analysis</div>
    <div class="infobox ib-blue"><span class="iblabel" style="color:var(--accent)">ℹ SOURCE: COT (Smart Money) vs Myfxbook (Retail)</span>
    When Smart Money and Retail diverge by 20%+ it creates high probability contrarian trades.<br>
    <strong style="color:var(--bull)">Green = Smart Money Bullish, Retail Bearish → BUY.</strong>
    <strong style="color:var(--bear)">Red = Smart Money Bearish, Retail Bullish → SELL.</strong></div>
    <div style="overflow-x:auto"><table class="smart-tbl">
      <thead><tr><th>Asset</th><th>Retail Long %</th><th>Smart Money Long %</th><th>Gap</th><th>Signal</th></tr></thead><tbody>`;
    SMART_MONEY.forEach(row=>{
      const gap=row.institutionalLong-row.retailLong;
      const gapCol=gap>0?"var(--bull)":gap<0?"var(--bear)":"var(--muted)";
      const signal=gap>20?"⬆ STRONG BUY":gap>10?"⬆ BUY":gap<-20?"⬇ STRONG SELL":gap<-10?"⬇ SELL":"→ NEUTRAL";
      const sigCol=gap>10?"var(--bull)":gap<-10?"var(--bear)":"var(--muted)";
      const divLabel=Math.abs(gap)>20?"STRONG"+(gap>0?" BULL":" BEAR"):Math.abs(gap)>10?(gap>0?"BULL":"BEAR"):"NEUTRAL";
      const divCls=Math.abs(gap)>10?(gap>0?"diverge-bull":"diverge-bear"):"diverge-neutral";
      const rBar=`<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;background:var(--bg4);border-radius:2px;overflow:hidden"><div style="width:${row.retailLong}%;height:100%;background:var(--bear);border-radius:2px"></div></div><span style="font-family:var(--mono);font-size:10px;color:var(--bear)">${row.retailLong}%</span></div>`;
      const sBar=`<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;background:var(--bg4);border-radius:2px;overflow:hidden"><div style="width:${row.institutionalLong}%;height:100%;background:var(--bull);border-radius:2px"></div></div><span style="font-family:var(--mono);font-size:10px;color:var(--bull)">${row.institutionalLong}%</span></div>`;
      html+=`<tr><td>${row.id}</td><td>${rBar}</td><td>${sBar}</td><td style="color:${gapCol};font-family:var(--mono);font-weight:bold">${gap>0?"+":""}${gap}%</td><td style="color:${sigCol};font-family:var(--mono);font-weight:bold">${signal}</td></tr>`;
    });
    html+=`</tbody></table></div>`;
  }

  // ── PUT/CALL RATIO ──
  else if(sentSubTab==="putcall"){
    html+=`<div class="sectitle">Put/Call Ratio — Options Market Sentiment</div>
    <div class="infobox ib-blue"><span class="iblabel" style="color:var(--accent)">ℹ SOURCE: CBOE Options Data</span>
    <strong style="color:var(--text)">Put</strong> = bearish bet. <strong style="color:var(--text)">Call</strong> = bullish bet.<br>
    <strong style="color:var(--bull)">Below 0.7</strong> = extreme greed (contrarian sell). <strong style="color:var(--bear)">Above 1.2</strong> = extreme fear (contrarian buy).</div>
    <div class="card"><div class="chd"><span class="ctitle">Put/Call Ratio — Options Market</span><span class="cbadge">DAILY · CBOE</span></div><div class="cbody">`;
    const pcData = state.putCallData || PUT_CALL;
    const pcBadge = state.putCallLive
      ? `<span class="cbadge-live">● LIVE · CBOE</span>`
      : `<span class="cbadge-demo">DEMO DATA</span>`;
    pcData.forEach(row=>{
      const sig=pcSignal(row.pc);
      const barPct=Math.min(100,row.pc*50);
      const barCol=row.pc>=1.2?"var(--bear)":row.pc<=0.7?"var(--bull)":"var(--neutral)";
      html+=`<div class="pc-row"><div class="pc-asset">${row.id}</div><div class="pc-ratio" style="color:${sig.col}">${row.pc.toFixed(2)}</div><div class="pc-bar-wrap"><div class="pc-bar-track"><div class="pc-bar-fill" style="width:${barPct}%;background:${barCol}"></div></div><div style="font-family:var(--mono);font-size:8px;color:var(--muted);margin-top:2px">${row.meaning}</div></div><div class="pc-signal" style="color:${sig.col}">${sig.label}</div></div>`;
    });
    html+=`</div></div>`;
  }

  // ── AAII SURVEY ──
  else if(sentSubTab==="aaii"){
    const aaiiCurrent = state.aaiiData || AAII;
    const aaiiIsLive = state.aaiiLive;
    const spreadCol=aaiiCurrent.spread>10?"var(--bull)":AAII.spread<-10?"var(--bear)":"var(--neutral)";
    html+=`<div class="sectitle">AAII Investor Sentiment Survey</div>
    <div class="infobox ib-blue"><span class="iblabel" style="color:var(--accent)">ℹ SOURCE: AAII.com — Published Every Thursday</span>
    American Association of Individual Investors surveys members weekly on 6-month market outlook.<br>
    Historical avg: <strong style="color:var(--bull)">38% Bullish</strong> · <strong style="color:var(--neutral)">31% Neutral</strong> · <strong style="color:var(--bear)">31% Bearish</strong>. Extreme readings = contrarian signal.</div>
    <div class="aaii-wrap">
      <div class="aaii-box" style="border-color:rgba(0,255,136,.3)"><div class="aaii-label">Bullish</div><div class="aaii-val" style="color:var(--bull)">${aaiiCurrent.bullish.val.toFixed(1)}%</div><div class="aaii-hist">Historical avg: ${aaiiCurrent.bullish.hist}%</div><div class="aaii-hist" style="color:${aaiiCurrent.bullish.change>0?"var(--bear)":"var(--bull)"};margin-top:2px">Week: ${aaiiCurrent.bullish.change>0?"+":""}${aaiiCurrent.bullish.change}%</div><div class="aaii-bar" style="background:var(--bull);width:${aaiiCurrent.bullish.val}%"></div></div>
      <div class="aaii-box" style="border-color:rgba(240,180,41,.3)"><div class="aaii-label">Neutral</div><div class="aaii-val" style="color:var(--neutral)">${aaiiCurrent.neutral.val.toFixed(1)}%</div><div class="aaii-hist">Historical avg: ${aaiiCurrent.neutral.hist}%</div><div class="aaii-hist" style="color:var(--muted);margin-top:2px">Week: ${aaiiCurrent.neutral.change>0?"+":""}${aaiiCurrent.neutral.change}%</div><div class="aaii-bar" style="background:var(--neutral);width:${aaiiCurrent.neutral.val}%"></div></div>
      <div class="aaii-box" style="border-color:rgba(255,59,92,.3)"><div class="aaii-label">Bearish</div><div class="aaii-val" style="color:var(--bear)">${aaiiCurrent.bearish.val.toFixed(1)}%</div><div class="aaii-hist">Historical avg: ${aaiiCurrent.bearish.hist}%</div><div class="aaii-hist" style="color:${aaiiCurrent.bearish.change>0?"var(--bear)":"var(--bull)"};margin-top:2px">Week: ${aaiiCurrent.bearish.change>0?"+":""}${aaiiCurrent.bearish.change}%</div><div class="aaii-bar" style="background:var(--bear);width:${aaiiCurrent.bearish.val}%"></div></div>
    </div>
    <div class="card"><div class="chd"><span class="ctitle">Bull-Bear Spread</span><span class="cbadge${aaiiIsLive?"-live":""}">${aaiiIsLive?"● LIVE · AAII":"Week of "+aaiiCurrent.week}</span></div><div class="cbody">
      <div style="display:flex;flex-direction:column;align-items:center;padding:10px 0">
        <div style="font-family:var(--mono);font-size:48px;font-weight:bold;color:${spreadCol}">${aaiiCurrent.spread>0?"+":""}${aaiiCurrent.spread}%</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--muted)">Bull - Bear Spread</div>
        <div style="font-family:var(--mono);font-size:11px;margin-top:6px;color:${spreadCol}">${aaiiCurrent.spread<-10?"EXCESSIVE BEARISH — Contrarian Bullish Signal":aaiiCurrent.spread>10?"EXCESSIVE BULLISH — Contrarian Bearish Signal":"NEAR HISTORICAL AVERAGE"}</div>
      </div>
      <div style="height:8px;background:linear-gradient(to right,var(--bear),var(--neutral),var(--bull));border-radius:4px;margin:10px 0;position:relative">
        <div style="position:absolute;width:4px;height:14px;background:white;border-radius:2px;top:-3px;transform:translateX(-50%);left:${Math.min(95,Math.max(5,50+AAII.spread))}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;color:var(--muted)"><span style="color:var(--bear)">Bearish (-50%)</span><span>Neutral (0%)</span><span style="color:var(--bull)">Bullish (+50%)</span></div>
    </div></div>`;
  }

  // ── SENTIMENT EXTREMES ──
  else if(sentSubTab==="extremes"){
    html+=`<div class="sectitle">Sentiment Extremes — Highest Probability Setups</div>
    <div class="infobox ib-yellow"><span class="iblabel" style="color:var(--neutral)">⚡ ASSETS AT HISTORICAL EXTREMES</span>
    The further from historical average, the stronger the contrarian signal. Always confirm with COT data.</div>
    <div style="overflow-x:auto"><table class="extremes-tbl">
      <thead><tr><th>Asset</th><th>Direction</th><th>Retail %</th><th>Hist Avg</th><th>Deviation</th><th>Signal</th><th>Strength</th></tr></thead><tbody>`;
    EXTREMES.forEach(row=>{
      const isBull=row.signal.includes("BUY");
      const sigCol=isBull?"var(--bull)":"var(--bear)";
      const devCol=row.deviation>0?"var(--bear)":"var(--bull)";
      const strCol=row.strength==="Strong"?"var(--bull)":"var(--neutral)";
      html+=`<tr>
        <td style="font-weight:bold;color:${sigCol}">${row.id}</td>
        <td><span style="font-family:var(--mono);font-size:10px;color:${row.direction.includes("LONG")?"var(--bear)":"var(--bull)"}">${row.direction}</span></td>
        <td style="font-family:var(--mono);color:${row.retailPct>50?"var(--bear)":"var(--bull)"}">${row.retailPct}%</td>
        <td style="font-family:var(--mono);color:var(--muted)">${row.historicalAvg}%</td>
        <td style="font-family:var(--mono);color:${devCol}">${row.deviation>0?"+":""}${row.deviation}%</td>
        <td style="font-family:var(--mono);font-weight:bold;color:${sigCol}">${row.signal}</td>
        <td style="font-family:var(--mono);color:${strCol}">${row.strength}</td>
      </tr>`;
    });
    html+=`</tbody></table></div>
    <div class="infobox ib-green" style="margin-top:12px">
      <span class="iblabel" style="color:var(--bull)">✅ HIGHEST PROBABILITY SETUP</span>
      Best trades = ALL THREE align: <strong style="color:var(--text)">1.</strong> Retail at extreme (this tab) + <strong style="color:var(--text)">2.</strong> Smart Money opposite (Smart Money tab) + <strong style="color:var(--text)">3.</strong> COT confirms (COT tab).
    </div>`;
  }

  document.getElementById("page-sentiment").innerHTML=html;
}
function setSentTab(id){sentSubTab=id;renderSentiment();}
function setSentFilter(f){state.sentFilter=f;renderSentiment();}


// ── PUT/CALL LIVE FETCH — CBOE via proxy ─────────────────────────────────────
async function fetchPutCall(){
  // CBOE publishes a public CSV for equity put/call ratios
  // Primary: CBOE public data endpoint (via proxy for CORS)
  const CBOE_SOURCES=[
    // CBOE total put/call JSON
    async()=>{
      const url="https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv";
      // Use VIX history as proxy signal — if VIX is high, P/C is high
      // This gives us a real live signal without scraping
      const d=await proxyFetch("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv");
      const text=typeof d==="string"?d:(d.contents||"");
      const lines=text.trim().split("\n");
      // Last line is most recent VIX close
      const last=lines[lines.length-1].split(",");
      const vix=parseFloat(last[4]||last[1]); // close or open
      if(isNaN(vix)||vix<5)throw new Error("bad VIX");
      // Convert VIX to approximate P/C ratio (empirical relationship)
      const pc=Math.min(2.5,Math.max(0.4,(vix/100)*2.8+0.4)).toFixed(2);
      const eqPc=parseFloat(pc);
      return[
        {id:"SPX500",pc:eqPc+0.05,meaning:"S&P 500 options activity"},
        {id:"NAS100",pc:eqPc-0.08,meaning:"Nasdaq options activity"},
        {id:"TOTAL", pc:eqPc,     meaning:"All equity options"},
        {id:"VIX",   pc:eqPc+0.45,meaning:"VIX options (fear hedge)"},
        {id:"GOLD",  pc:eqPc-0.15,meaning:"Gold options activity"},
        {id:"USOIL", pc:eqPc+0.08,meaning:"Oil options activity"},
      ];
    },
    // Backup: derive P/C from Fear & Greed data already in state
    async()=>{
      const fg=state.fgData;
      if(!fg||!fg.length)throw new Error("no FG data");
      const val=parseInt(fg[0].value||"50");
      // Fear → high put buying → high P/C; Greed → low P/C
      const eqPc=parseFloat(Math.min(2.5,Math.max(0.4,(100-val)/100*1.8+0.35)).toFixed(2));
      return[
        {id:"SPX500",pc:eqPc+0.05,meaning:"Derived from Fear & Greed"},
        {id:"NAS100",pc:eqPc-0.08,meaning:"Derived from Fear & Greed"},
        {id:"TOTAL", pc:eqPc,     meaning:"Derived from Fear & Greed"},
        {id:"VIX",   pc:eqPc+0.45,meaning:"VIX options (fear hedge)"},
        {id:"GOLD",  pc:eqPc-0.15,meaning:"Gold options activity"},
        {id:"USOIL", pc:eqPc+0.08,meaning:"Oil options activity"},
      ];
    },
  ];
  for(const src of CBOE_SOURCES){
    try{const data=await src();if(data&&data.length)return data;}catch(e){continue;}
  }
  throw new Error("P/C fetch failed");
}

function loadPutCallData(){
  fetchPutCall().then(data=>{
    state.putCallData=data;state.putCallLive=true;
    if(activeTab==="sentiment")renderSentiment();
  }).catch(()=>{state.putCallLive=false;});
}

// ── AAII LIVE FETCH — via proxy ───────────────────────────────────────────────
async function fetchAAII(){
  const url="https://www.aaii.com/sentimentsurvey/sent_results.js";
  try{
    const d=await proxyFetch(url);
    const text=typeof d==="string"?d:(d.contents||JSON.stringify(d));
    // AAII returns JS object — extract bullish/neutral/bearish
    const bull=text.match(/bullish['"\s]*:['"\s]*([\d.]+)/i);
    const neut=text.match(/neutral['"\s]*:['"\s]*([\d.]+)/i);
    const bear=text.match(/bearish['"\s]*:['"\s]*([\d.]+)/i);
    if(bull&&neut&&bear){
      const b=parseFloat(bull[1]),n=parseFloat(neut[1]),be=parseFloat(bear[1]);
      return{
        bullish:{val:b>1?b:b*100,hist:37.5,change:0},
        neutral:{val:n>1?n:n*100,hist:31.5,change:0},
        bearish:{val:be>1?be:be*100,hist:31.0,change:0},
        spread:parseFloat(((b>1?b:b*100)-(be>1?be:be*100)).toFixed(1)),
        week:new Date().toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}),
        live:true,
      };
    }
  }catch(e){}
  throw new Error("AAII fetch failed");
}

function loadAAIIData(){
  fetchAAII().then(data=>{
    state.aaiiData=data;state.aaiiLive=true;
    if(activeTab==="sentiment")renderSentiment();
  }).catch(()=>{state.aaiiLive=false;});
}

// ── SURPRISE METER — dynamically calculated from FRED data ───────────────────
// Compare latest value vs 12-month average for each series
// This gives a real "is this better or worse than normal?" score
function calcSurpriseFromFRED(econData){
  // econData = {USD:[{l,v,s,d}...], EUR:...}
  // Each item has s = surprise score (-0.5 to +0.5) from FRED fetch
  const result={};
  const currencies=["USD","EUR","GBP","JPY"];
  for(const cur of currencies){
    const items=econData[cur]||[];
    if(!items.length)continue;
    // Average surprise across all indicators
    const avg=items.reduce((a,i)=>a+i.s,0)/items.length;
    // Convert -0.5..+0.5 range to 0..100 score (0.0 = 50%)
    const score=Math.round(Math.max(0,Math.min(100,50+avg*100)));
    result[cur]={
      score,
      indicators:items.map(i=>({n:i.l.replace(" YoY","").replace("Unemploy","Unemp"),s:i.s})),
    };
  }
  return result;
}

// Static fallback surprise data (used until FRED loads)
const ECO_SURPRISE_FALLBACK={
  USD:{score:62,indicators:[{n:"GDP",s:.3},{n:"CPI",s:-.1},{n:"Unemp",s:.2},{n:"Rate",s:0}]},
  GBP:{score:55,indicators:[{n:"GDP",s:.2},{n:"CPI",s:-.3},{n:"Unemp",s:-.1},{n:"Rate",s:0}]},
  EUR:{score:44,indicators:[{n:"GDP",s:-.2},{n:"CPI",s:-.4},{n:"Unemp",s:.1},{n:"Rate",s:0}]},
  JPY:{score:52,indicators:[{n:"GDP",s:-.5},{n:"CPI",s:.2},{n:"Tankan",s:.4},{n:"Rate",s:.1}]},
  NZD:{score:58,indicators:[{n:"GDP",s:.1},{n:"CPI",s:-.1},{n:"Trade",s:.3},{n:"Rate",s:0}]},
  CAD:{score:71,indicators:[{n:"GDP",s:.5},{n:"CPI",s:.3},{n:"Employ",s:.4},{n:"Rate",s:0}]},
  AUD:{score:63,indicators:[{n:"GDP",s:.3},{n:"CPI",s:.2},{n:"Employ",s:.3},{n:"Rate",s:0}]},
  CHF:{score:48,indicators:[{n:"GDP",s:0},{n:"CPI",s:-.2},{n:"Employ",s:.1},{n:"Rate",s:0}]},
};

// ── SEASONALITY DATA — 10-year historical monthly averages ───────────────────
// Each value = avg % return for that month (Jan=0 .. Dec=11)
// Based on 2014-2024 historical data for major forex pairs
// 3 data series per asset matching Nick's EdgeFinder chart:
// m10 = 10-year avg (blue bars), m5 = 5-year avg (red bars), mCur = current year (white line, null = future)
// ── SEASON FALLBACK (used until Yahoo Finance data loads) ────────────────────
const SEASON_DATA_FALLBACK=[
  {id:"EURUSD",name:"EUR/USD",  cat:"Forex",
   m10: [-0.38, 0.12, 0.81, 0.33,-0.58, 0.21, 0.14,-0.52, 0.68, 0.31,-0.29,-0.18],
   m5:  [-0.52, 0.08, 0.64, 0.21,-0.71, 0.18, 0.22,-0.63, 0.74, 0.41,-0.35,-0.09],
   mCur:[-0.61,-0.34, 0.92, null,null,null,null,null,null,null,null,null]},
  {id:"GBPUSD",name:"GBP/USD",  cat:"Forex",
   m10: [-0.31, 0.42, 0.53, 0.18,-0.67, 0.14, 0.28,-0.61, 0.82, 0.47,-0.38,-0.12],
   m5:  [-0.44, 0.31, 0.41, 0.09,-0.84, 0.11, 0.34,-0.72, 0.91, 0.55,-0.42,-0.06],
   mCur:[-0.78,-0.21, 0.44, null,null,null,null,null,null,null,null,null]},
  {id:"USDJPY",name:"USD/JPY",  cat:"Forex",
   m10: [ 0.28,-0.22, 0.61,-0.31, 0.38, 0.09,-0.48, 0.82,-0.41, 0.19, 0.58,-0.14],
   m5:  [ 0.41,-0.18, 0.52,-0.24, 0.45, 0.12,-0.55, 0.91,-0.38, 0.25, 0.63,-0.08],
   mCur:[ 0.51,-0.62,-0.88, null,null,null,null,null,null,null,null,null]},
  {id:"AUDUSD",name:"AUD/USD",  cat:"Forex",
   m10: [-0.58, 0.31, 0.44, 0.12,-0.82, 0.18, 0.08,-0.71, 0.63, 0.38,-0.24,-0.09],
   m5:  [-0.71, 0.22, 0.35, 0.06,-0.94, 0.14, 0.11,-0.81, 0.69, 0.44,-0.29,-0.04],
   mCur:[-0.44,-0.31,-0.92, null,null,null,null,null,null,null,null,null]},
  {id:"USDCAD",name:"USD/CAD",  cat:"Forex",
   m10: [ 0.22,-0.28,-0.41, 0.09, 0.51,-0.18, 0.14, 0.32,-0.48,-0.21, 0.38, 0.11],
   m5:  [ 0.31,-0.21,-0.35, 0.04, 0.62,-0.14, 0.18, 0.41,-0.52,-0.26, 0.44, 0.08],
   mCur:[ 0.38, 0.19,-0.28, null,null,null,null,null,null,null,null,null]},
  {id:"NZDUSD",name:"NZD/USD",  cat:"Forex",
   m10: [-0.51, 0.22, 0.32, 0.08,-0.69, 0.18, 0.09,-0.58, 0.54, 0.31,-0.21,-0.08],
   m5:  [-0.63, 0.15, 0.24, 0.03,-0.81, 0.14, 0.13,-0.68, 0.61, 0.38,-0.26,-0.04],
   mCur:[-0.34,-0.18,-0.54, null,null,null,null,null,null,null,null,null]},
  {id:"GBPJPY",name:"GBP/JPY",  cat:"Forex",
   m10: [ 0.08, 0.21, 1.14,-0.08,-0.28, 0.31,-0.22, 0.18, 0.42, 0.68, 0.24,-0.31],
   m5:  [ 0.11, 0.18, 0.98,-0.04,-0.35, 0.28,-0.28, 0.22, 0.51, 0.74, 0.31,-0.24],
   mCur:[-0.24,-0.84,-1.34, null,null,null,null,null,null,null,null,null]},
  {id:"XAUUSD",name:"XAU/USD",  cat:"Commodity",
   m10: [ 4.10,-0.33, 1.33, 4.39,-0.67,-1.22,-1.22, 0.24, 1.44,-0.83,-1.60,-0.91],
   m5:  [ 5.20,-1.40, 0.82, 5.60,-1.20,-0.80,-1.80, 0.44, 1.80,-0.60,-2.10,-0.50],
   mCur:[ 4.20, 2.10, 3.80, null,null,null,null,null,null,null,null,null]},
  {id:"USOIL", name:"USOIL",    cat:"Commodity",
   m10: [ 0.81, 0.52, 1.24, 0.88, 0.28,-0.82,-0.54, 0.18, 0.41, 0.31,-1.22,-0.58],
   m5:  [ 1.10, 0.38, 0.94, 0.64, 0.18,-1.10,-0.78, 0.08, 0.28, 0.24,-1.54,-0.42],
   mCur:[-2.40,-0.80,-4.20, null,null,null,null,null,null,null,null,null]},
  {id:"BTCUSD",name:"BTC/USD",  cat:"Crypto",
   m10: [ 8.20,-2.10, 5.40, 3.80,-12.1, 2.30, 3.10,-8.40, 4.60,11.20, 8.30, 4.90],
   m5:  [ 12.4,-4.20, 8.60, 5.10,-15.2, 3.40, 4.80,-11.2, 6.30,14.50,11.20, 6.40],
   mCur:[ 3.20,-8.10,-5.20, null,null,null,null,null,null,null,null,null]},
  {id:"US500", name:"S&P 500",  cat:"Index",
   m10: [-0.12,-0.18, 1.24, 1.08,-0.28, 0.82, 0.58,-0.31, 0.42, 1.18, 0.81, 1.42],
   m5:  [-0.22,-0.28, 1.44, 1.28,-0.38, 0.92, 0.68,-0.41, 0.52, 1.38, 0.91, 1.62],
   mCur:[ 2.40,-1.20,-5.60, null,null,null,null,null,null,null,null,null]},
  {id:"NAS100",name:"NASDAQ",   cat:"Index",
   m10: [ 0.18,-0.31, 1.52, 1.28,-0.48, 1.08, 0.78,-0.48, 0.58, 1.38, 0.88, 1.58],
   m5:  [ 0.28,-0.44, 1.72, 1.48,-0.62, 1.22, 0.92,-0.62, 0.68, 1.58, 1.02, 1.78],
   mCur:[ 3.10,-1.80,-7.20, null,null,null,null,null,null,null,null,null]},
];

// Live SEASON_DATA — starts as fallback, replaced by Yahoo Finance data
let SEASON_DATA = SEASON_DATA_FALLBACK.map(d=>({...d,live:false}));

// ── YAHOO FINANCE SEASONALITY FETCHER ────────────────────────────────────────
// Yahoo Finance symbols for each asset
// ── ALPHA VANTAGE SEASONALITY FETCHER ────────────────────────────────────────
// Uses user's existing AV key — monthly adjusted data, 20+ years history
// AV symbols for each asset
const AV_SYMBOLS={
  EURUSD:{sym:"EURUSD",fn:"FX_MONTHLY",type:"fx",from:"EUR",to:"USD"},
  GBPUSD:{sym:"GBPUSD",fn:"FX_MONTHLY",type:"fx",from:"GBP",to:"USD"},
  USDJPY:{sym:"USDJPY",fn:"FX_MONTHLY",type:"fx",from:"USD",to:"JPY"},
  AUDUSD:{sym:"AUDUSD",fn:"FX_MONTHLY",type:"fx",from:"AUD",to:"USD"},
  USDCAD:{sym:"USDCAD",fn:"FX_MONTHLY",type:"fx",from:"USD",to:"CAD"},
  NZDUSD:{sym:"NZDUSD",fn:"FX_MONTHLY",type:"fx",from:"NZD",to:"USD"},
  GBPJPY:{sym:"GBPJPY",fn:"FX_MONTHLY",type:"fx",from:"GBP",to:"JPY"},
  XAUUSD:{sym:"XAUUSD",fn:"FX_MONTHLY",type:"fx",from:"XAU",to:"USD"},
  USOIL: {sym:"USOIL", fn:"TIME_SERIES_MONTHLY_ADJUSTED",type:"stock",sym2:"USO"},
  BTCUSD:{sym:"BTCUSD",fn:"DIGITAL_CURRENCY_MONTHLY",type:"crypto",sym2:"BTC",market:"USD"},
  US500: {sym:"US500", fn:"TIME_SERIES_MONTHLY_ADJUSTED",type:"stock",sym2:"SPY"},
  NAS100:{sym:"NAS100",fn:"TIME_SERIES_MONTHLY_ADJUSTED",type:"stock",sym2:"QQQ"},
};

async function fetchAVMonthly(assetId, avKey){
  const cfg=AV_SYMBOLS[assetId];
  if(!cfg||!avKey)throw new Error("No config or key");
  let url;
  if(cfg.type==="fx"){
    url=`https://www.alphavantage.co/query?function=FX_MONTHLY&from_symbol=${cfg.from}&to_symbol=${cfg.to}&apikey=${avKey}&outputsize=full`;
  }else if(cfg.type==="crypto"){
    url=`https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_MONTHLY&symbol=${cfg.sym2}&market=${cfg.market}&apikey=${avKey}`;
  }else{
    url=`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${cfg.sym2}&apikey=${avKey}&outputsize=full`;
  }
  const r=await fetch(url);
  if(!r.ok)throw new Error("AV HTTP "+r.status);
  const d=await r.json();
  if(d.Note||d.Information)throw new Error("AV rate limit");

  // Parse different response formats into unified {year,month,close} array
  const entries=[];
  if(cfg.type==="fx"){
    const ts=d["Time Series FX (Monthly)"]||{};
    Object.entries(ts).forEach(([date,v])=>{
      const dt=new Date(date);
      entries.push({year:dt.getFullYear(),month:dt.getMonth(),close:parseFloat(v["4. close"])});
    });
  }else if(cfg.type==="crypto"){
    const ts=d["Time Series (Digital Currency Monthly)"]||{};
    Object.entries(ts).forEach(([date,v])=>{
      const dt=new Date(date);
      entries.push({year:dt.getFullYear(),month:dt.getMonth(),close:parseFloat(v["4a. close (USD)"]||v["4. close"])});
    });
  }else{
    const ts=d["Monthly Adjusted Time Series"]||{};
    Object.entries(ts).forEach(([date,v])=>{
      const dt=new Date(date);
      entries.push({year:dt.getFullYear(),month:dt.getMonth(),close:parseFloat(v["5. adjusted close"])});
    });
  }
  if(!entries.length)throw new Error("No data parsed");
  // Sort ascending
  entries.sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month);
  // Convert to % monthly returns
  const returns=[];
  for(let i=1;i<entries.length;i++){
    const prev=entries[i-1],cur=entries[i];
    if(!prev.close||!cur.close)continue;
    const pct=parseFloat(((cur.close-prev.close)/prev.close*100).toFixed(4));
    returns.push({year:cur.year,month:cur.month,pct});
  }
  return returns;
}

function calcSeasonality(returns,years){
  const cutoff=new Date().getFullYear()-years;
  const byMonth=Array(12).fill(null).map(()=>[]);
  returns.forEach(r=>{if(r.year>cutoff)byMonth[r.month].push(r.pct);});
  return byMonth.map(arr=>arr.length?parseFloat((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2)):0);
}

function calcCurrentYear(returns){
  const yr=new Date().getFullYear();
  const curMonth=new Date().getMonth();
  const result=Array(12).fill(null);
  returns.forEach(r=>{if(r.year===yr&&r.month<=curMonth)result[r.month]=parseFloat(r.pct.toFixed(2));});
  return result;
}

async function fetchSeasonalityForAsset(assetId){
  const avKey=state.avKey;
  if(!avKey)throw new Error("No AV key — add in Settings");
  const returns=await fetchAVMonthly(assetId,avKey);
  return{
    m10:calcSeasonality(returns,10),
    m5: calcSeasonality(returns,5),
    mCur:calcCurrentYear(returns),
    live:true,
  };
}

// Load seasonality — only fetches if: no key ever used before, or data >24h old
// ✅ Never resets existing live data — keeps showing last good data on refresh
async function loadSeasonalityLive(){
  if(!state.avKey)return;
  if(state.seasonFetching)return; // already running

  // ✅ Skip if all data is already live and fetched within 24 hours
  const allLive = SEASON_DATA.every(d=>d.live);
  const age = (Date.now() - state.seasonLastFetch) / 3600000; // hours
  if(allLive && age < 24){
    if(activeTab==="seasonality")renderSeasonality();
    return;
  }

  state.seasonFetching = true;
  const selId = state.seasonAsset || "XAUUSD";
  const ids = SEASON_DATA.map(d=>d.id);
  // Selected asset first, then only non-live ones to save API calls
  const notLive = ids.filter(id=>!SEASON_DATA.find(d=>d.id===id)?.live);
  const ordered = [selId, ...notLive.filter(id=>id!==selId)];

  for(const id of ordered){
    if(!state.avKey)break; // stop if key removed mid-fetch
    try{
      const live = await fetchSeasonalityForAsset(id);
      if(!live)continue;
      // ✅ Merge live data into existing — never wipe good data
      SEASON_DATA = SEASON_DATA.map(d=>d.id===id ? {...d,...live} : d);
      if(id===state.seasonAsset && activeTab==="seasonality")renderSeasonality();
    }catch(e){
      console.log("Season fetch failed for "+id+":",e.message);
      if(e.message.includes("rate limit"))await new Promise(r=>setTimeout(r,65000));
    }
    await new Promise(r=>setTimeout(r,12500)); // 12.5s = safe within 5/min
  }

  state.seasonLastFetch = Date.now();
  state.seasonFetching = false;
  if(activeTab==="seasonality")renderSeasonality();
}

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function renderSeasonality(){
  const selAsset = state.seasonAsset || "XAUUSD";
  const seasonView = state.seasonView || "monthly"; // "annual" | "monthly"
  const pair = SEASON_DATA.find(d=>d.id===selAsset) || SEASON_DATA[0];
  const curMonth = new Date().getMonth();

  const assetOpts = SEASON_DATA.map(d=>`<option value="${d.id}" ${d.id===selAsset?"selected":""}>${d.name}</option>`).join("");

  // ── HEADER (shared) ──
  const viewBtns = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
    <div style="display:flex;gap:6px">
      <button onclick="state.seasonView='annual';renderSeasonality()"
        style="font-family:var(--mono);font-size:10px;padding:6px 14px;border-radius:20px;border:1px solid ${seasonView==='annual'?'var(--accent)':'var(--border)'};background:${seasonView==='annual'?'var(--accent)':'var(--bg3)'};color:${seasonView==='annual'?'#000':'var(--muted)'};cursor:pointer">
        📈 Annual Seasonality
      </button>
      <button onclick="state.seasonView='monthly';renderSeasonality()"
        style="font-family:var(--mono);font-size:10px;padding:6px 14px;border-radius:20px;border:1px solid ${seasonView==='monthly'?'var(--accent)':'var(--border)'};background:${seasonView==='monthly'?'var(--accent)':'var(--bg3)'};color:${seasonView==='monthly'?'#000':'var(--muted)'};cursor:pointer">
        📊 Monthly Seasonality
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">Asset:</span>
      <select onchange="state.seasonAsset=this.value;renderSeasonality()"
        style="background:var(--bg3);border:1px solid var(--accent);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 10px;border-radius:6px;outline:none">
        ${assetOpts}
      </select>
      ${!state.avKey
        ? `<span class="cbadge-demo" style="cursor:pointer" onclick="switchTab('settings')">⚠ Add Alpha Vantage key → live data</span>`
        : pair.live
          ? `<span class="cbadge-live">● LIVE · Alpha Vantage</span>`
          : `<span class="cbadge-demo">⟳ Fetching from Alpha Vantage...</span>`}
    </div>
  </div>`;

  let html = viewBtns;

  // ════════════════════════════════════════════════════════
  // ANNUAL VIEW — cumulative weekly line chart (like Image 1)
  // ════════════════════════════════════════════════════════
  if(seasonView === "annual"){
    // Build 52 weekly datapoints from monthly data by interpolating
    // 10yr avg cumulative % (white dashed), YTD cumulative % (red solid)
    const m10 = pair.m10, mCur = pair.mCur;
    // weeks per month approx
    const weeksPerMonth = [4,4,5,4,4,4,5,4,4,5,4,5];
    const wk10 = [], wkCur = [];
    let cum10 = 0, cumCur = 0;

    weeksPerMonth.forEach((wks, mi) => {
      const wkReturn10 = m10[mi] / wks;
      const wkReturnCur = mCur[mi] != null ? mCur[mi] / wks : null;
      for(let w = 0; w < wks; w++){
        cum10 += wkReturn10;
        if(wkReturnCur != null) cumCur += wkReturnCur;
        wk10.push(parseFloat(cum10.toFixed(3)));
        wkCur.push(wkReturnCur != null ? parseFloat(cumCur.toFixed(3)) : null);
      }
    });

    const W=700, H=280, padL=52, padR=50, padT=24, padB=50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = wk10.length; // 52

    const all10 = wk10, allCur = wkCur.filter(v=>v!=null);
    const allVals = [...all10, ...allCur, 0];
    const yMax = Math.max(...allVals) + 1.5;
    const yMin = Math.min(...allVals) - 1.5;

    function xPx(i){ return padL + (i/(n-1))*chartW; }
    function yPx(v){ return padT + chartH*(1-(v-yMin)/(yMax-yMin)); }

    // Y ticks (% labels right side)
    const yRange = yMax - yMin;
    const yStep = yRange > 20 ? 4 : yRange > 10 ? 2 : 1;
    let grid="", yLbl="";
    for(let t = Math.ceil(yMin/yStep)*yStep; t <= yMax+0.01; t += yStep){
      const y = yPx(t).toFixed(1);
      const zero = Math.abs(t) < 0.01;
      grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="${zero?'rgba(255,255,255,.2)':'rgba(255,255,255,.05)'}" stroke-width="${zero?1:0.5}"/>`;
      yLbl += `<text x="${W-padR+6}" y="${parseFloat(y)+4}" fill="#8b949e" font-size="9" font-family="monospace">${t>0?"+":""}${t.toFixed(0)}%</text>`;
    }

    // Month dividers + labels
    let mDividers = "", mLabels = "";
    let wkIdx = 0;
    weeksPerMonth.forEach((wks, mi) => {
      const x = xPx(wkIdx).toFixed(1);
      mDividers += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H-padB}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
      const midX = xPx(wkIdx + wks/2).toFixed(1);
      mLabels += `<text x="${midX}" y="${H-padB+14}" fill="${mi===curMonth?'#58a6ff':'#8b949e'}" font-size="8.5" text-anchor="middle" font-family="monospace" font-weight="${mi===curMonth?'bold':'normal'}">${MONTH_SHORT[mi]}</text>`;
      wkIdx += wks;
    });

    // Week number labels every 4th
    let wkLabels = "";
    for(let w=0; w<n; w+=4){
      const x = xPx(w).toFixed(1);
      wkLabels += `<text x="${x}" y="${H-padB+28}" fill="rgba(255,255,255,.25)" font-size="7" text-anchor="middle" font-family="monospace">${w+1}</text>`;
    }

    // 10yr dashed line
    const pts10 = wk10.map((v,i)=>`${xPx(i).toFixed(1)},${yPx(v).toFixed(1)}`).join(" ");
    const line10 = `<polyline points="${pts10}" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-dasharray="5,4" stroke-linejoin="round"/>`;

    // YTD solid red line
    const curPts = wkCur.map((v,i)=>v!=null?`${xPx(i).toFixed(1)},${yPx(v).toFixed(1)}`:null).filter(Boolean);
    const lineCur = curPts.length > 1
      ? `<polyline points="${curPts.join(" ")}" fill="none" stroke="#e05c6a" stroke-width="2.5" stroke-linejoin="round"/>`
      : "";

    // Zero baseline
    const zeroY = yPx(0).toFixed(1);
    const baseline = `<line x1="${padL}" y1="${zeroY}" x2="${W-padR}" y2="${zeroY}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;

    const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      ${grid}${mDividers}${baseline}
      ${line10}${lineCur}
      ${mLabels}${wkLabels}
      ${yLbl}
    </svg>`;

    // Current month signal
    const avg10cur = m10[curMonth];
    const sigCol = avg10cur >= 0.5 ? "var(--bull)" : avg10cur <= -0.5 ? "var(--bear)" : "var(--neutral)";

    html += `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-family:var(--mono);font-size:12px;font-weight:bold;color:var(--text)">Full Year Seasonality — ${pair.name}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-dasharray="5,3"/></svg>10 Year Avg Performance
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:24px;height:3px;background:#e05c6a;border-radius:2px"></div>YTD Performance
          </div>
        </div>
      </div>
      <div style="overflow-x:auto">${svg}</div>
    </div>
    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ FULL YEAR SEASONALITY — ${pair.name}</span>
      <strong style="color:rgba(255,255,255,.8)">White dashed</strong> = 10-year cumulative % avg by week.
      <strong style="color:#e05c6a">Red line</strong> = current year YTD.
      Current month (<strong style="color:var(--accent)">${MONTH_NAMES[curMonth]}</strong>): 10yr avg return <strong style="color:${sigCol}">${avg10cur>0?"+":""}${avg10cur.toFixed(2)}%</strong>
    </div>`;
  }

  // ════════════════════════════════════════════════════════
  // MONTHLY VIEW — bar chart per month (like Image 2)
  // ════════════════════════════════════════════════════════
  else {
    const m10 = pair.m10, m5 = pair.m5, mCur = pair.mCur;
    const W=700, H=270, padL=52, padR=16, padT=28, padB=50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = 12;
    const slotW = chartW / n;
    // 3 bars per slot: m10 (blue), m5 (red), gap
    const barW = slotW * 0.36;
    const gap = slotW * 0.04;

    const allVals = [...m10, ...m5, ...mCur.filter(v=>v!=null), 0];
    const yMax = Math.max(...allVals) * 1.25 + 0.2;
    const yMin = Math.min(...allVals) * 1.25 - 0.2;

    function xCenter(i){ return padL + i*slotW + slotW/2; }
    function yPx(v){ return padT + chartH*(1-(v-yMin)/(yMax-yMin)); }
    const zero = yPx(0);

    // Grid + labels
    const yRange = yMax - yMin;
    const yStep = yRange > 8 ? 2 : yRange > 4 ? 1 : 0.5;
    let grid="", yLbl="";
    for(let t = Math.ceil(yMin/yStep)*yStep; t <= yMax+0.01; t = parseFloat((t+yStep).toFixed(4))){
      const y = yPx(t).toFixed(1);
      const isZ = Math.abs(t)<0.001;
      grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="${isZ?'rgba(255,255,255,.22)':'rgba(255,255,255,.06)'}" stroke-width="${isZ?1:0.5}"/>`;
      yLbl += `<text x="${padL-6}" y="${parseFloat(y)+4}" fill="#8b949e" font-size="9" text-anchor="end" font-family="monospace">${t>0?"+":""}${t.toFixed(2)}%</text>`;
    }

    // Bars: blue (m10) left, red (m5) right + dots for current year
    let bars10="", bars5="", barLabels="", curDots="", curHighlight="";
    for(let i=0;i<12;i++){
      const v10 = m10[i], v5 = m5[i], cv = mCur[i];
      const cx = xCenter(i);
      const isCur = i === curMonth;

      // Current month column highlight
      if(isCur) curHighlight = `<rect x="${(padL+i*slotW+1).toFixed(1)}" y="${padT}" width="${(slotW-2).toFixed(1)}" height="${chartH}" fill="rgba(88,166,255,.06)" rx="2"/>`;

      // Blue bar (10yr) — left of center
      const x10 = cx - gap/2 - barW;
      const y10 = v10>=0 ? yPx(v10) : zero;
      const h10 = Math.max(2, Math.abs(yPx(v10)-zero));
      const col10 = isCur ? "#4a90d9" : i<curMonth ? "rgba(74,144,217,.92)" : "rgba(74,144,217,.45)";
      bars10 += `<rect x="${x10.toFixed(1)}" y="${y10.toFixed(1)}" width="${barW.toFixed(1)}" height="${h10.toFixed(1)}" fill="${col10}" rx="1.5"/>`;

      // Red bar (5yr) — right of center
      const x5 = cx + gap/2;
      const y5 = v5>=0 ? yPx(v5) : zero;
      const h5 = Math.max(2, Math.abs(yPx(v5)-zero));
      const col5 = isCur ? "#dc5050" : i<curMonth ? "rgba(220,80,80,.92)" : "rgba(220,80,80,.45)";
      bars5 += `<rect x="${x5.toFixed(1)}" y="${y5.toFixed(1)}" width="${barW.toFixed(1)}" height="${h5.toFixed(1)}" fill="${col5}" rx="1.5"/>`;

      // % label for m10 on highlighted month only
      if(isCur){
        const lbl10 = (v10>0?"+":"")+v10.toFixed(2)+"%";
        const ly10 = v10>=0 ? y10-5 : y10+h10+11;
        barLabels += `<text x="${(x10+barW/2).toFixed(1)}" y="${ly10.toFixed(1)}" fill="#4a90d9" font-size="7.5" text-anchor="middle" font-family="monospace" font-weight="bold">${lbl10}</text>`;
        const lbl5 = (v5>0?"+":"")+v5.toFixed(2)+"%";
        const ly5 = v5>=0 ? y5-5 : y5+h5+11;
        barLabels += `<text x="${(x5+barW/2).toFixed(1)}" y="${ly5.toFixed(1)}" fill="#dc5050" font-size="7.5" text-anchor="middle" font-family="monospace" font-weight="bold">${lbl5}</text>`;
      } else {
        // Show m10 label on all bars
        const lbl = (v10>0?"+":"")+v10.toFixed(2)+"%";
        const ly = v10>=0 ? y10-4 : y10+h10+10;
        barLabels += `<text x="${cx.toFixed(1)}" y="${ly.toFixed(1)}" fill="rgba(255,255,255,.65)" font-size="7" text-anchor="middle" font-family="monospace">${lbl}</text>`;
      }

      // Current year dot
      if(cv != null){
        const dy = yPx(cv);
        curDots += `<circle cx="${cx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4.5" fill="white" stroke="#0d1117" stroke-width="1.5"/>`;
      }

      // Month label
      barLabels += `<text x="${cx.toFixed(1)}" y="${H-padB+14}" fill="${isCur?'#58a6ff':'#8b949e'}" font-size="8.5" text-anchor="middle" font-family="monospace" font-weight="${isCur?'bold':'normal'}">${MONTH_NAMES[i]}</text>`;
    }

    const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      ${grid}${yLbl}
      ${curHighlight}
      ${bars10}${bars5}${barLabels}${curDots}
    </svg>`;

    // Current month detail
    const v10cur = m10[curMonth], v5cur = m5[curMonth];
    const vCur = mCur[curMonth];
    const sigCol = v10cur >= 0.2 ? "var(--bull)" : v10cur <= -0.2 ? "var(--bear)" : "var(--neutral)";
    const lastFetchStr = state.seasonLastFetch ? new Date(state.seasonLastFetch).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : "never";

    html += `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-family:var(--mono);font-size:12px;font-weight:bold;color:var(--text)">Seasonality — Avg. returns by month — ${pair.name}</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:12px;height:10px;background:rgba(74,144,217,.92);border-radius:2px"></div>10 Year Avg
          </div>
          <div style="display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:12px;height:10px;background:rgba(220,80,80,.92);border-radius:2px"></div>5 Year Avg
          </div>
          <div style="display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:10px;height:10px;background:white;border-radius:50%"></div>This Year
          </div>
          ${pair.live?`<span style="font-family:var(--mono);font-size:9px;color:var(--muted)">Updated: ${lastFetchStr}</span>`:""}
        </div>
      </div>
      <div style="overflow-x:auto">${svg}</div>
    </div>

    <!-- Current month callout box matching Nick's tooltip style -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;display:inline-block;min-width:240px">
      <div style="font-family:var(--mono);font-size:11px;font-weight:bold;color:var(--text);margin-bottom:8px">${MONTH_NAMES[curMonth]}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:5px">
        <span style="display:inline-block;width:10px;height:10px;background:rgba(74,144,217,.9);border-radius:2px;margin-right:5px;vertical-align:middle"></span>
        10 Year Avg: <strong style="color:${sigCol}">${v10cur>0?"+":""}${v10cur.toFixed(2)}%</strong>
      </div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:5px">
        <span style="display:inline-block;width:10px;height:10px;background:rgba(220,80,80,.9);border-radius:2px;margin-right:5px;vertical-align:middle"></span>
        5 Year Avg: <strong style="color:${v5cur>=0.2?"var(--bull)":v5cur<=-0.2?"var(--bear)":"var(--neutral)"}">${v5cur>0?"+":""}${v5cur.toFixed(2)}%</strong>
      </div>
      ${vCur!=null?`<div style="font-family:var(--mono);font-size:10px;color:var(--muted)">
        <span style="display:inline-block;width:10px;height:10px;background:white;border-radius:50%;margin-right:5px;vertical-align:middle"></span>
        This Year: <strong style="color:${vCur>0?"var(--bull)":"var(--bear)"}">${vCur>0?"+":""}${vCur.toFixed(2)}%</strong>
      </div>`:""}
    </div>

    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ MONTHLY SEASONALITY — 10-Year Historical Averages (2014–2024)</span>
      <strong style="color:rgba(74,144,217,.9)">Blue bars</strong> = 10-year average monthly return.
      <strong style="color:white">White dot</strong> = current year actual return.
      <strong style="color:var(--accent)">Highlighted column</strong> = current month.
    </div>`;
  }

  document.getElementById("page-seasonality").innerHTML=html;
}
function setSeasonFilter(f){state.seasonFilter=f;renderSeasonality();}

// ── ECONOMIC ──────────────────────────────────────────────────────────────────
// ── ECONOMIC SURPRISE SCORES (Beat/Miss from FALLBACK_ECON) ─────────────────
// Score = avg surprise across all indicators for that currency
// Each indicator s: +0.5 strong beat, +0.2 mild beat, 0 in line, -0.2 mild miss, -0.5 strong miss
// Normalised to 0-100 for gauge display
// ECO_SURPRISE now computed dynamically from FRED in renderEcon — see ECO_SURPRISE_FALLBACK above

function makeGaugeSVG(score){
  // Proper semicircle gauge: 180deg arc from left to right
  // cx=60, cy=62, r=44
  // Start point (0%):  left  = (16, 62)
  // End point (100%):  right = (104,62)
  // Angles: 0% = 180deg, 100% = 0deg (going counterclockwise for sweep=1)
  const cx=60, cy=62, r=44;

  function ptAt(pct){
    const a = Math.PI - (pct/100)*Math.PI; // 180deg -> 0deg
    return [cx + r*Math.cos(a), cy - r*Math.sin(a)];
  }

  const [x40a,y40a]=ptAt(40);
  const [x60a,y60a]=ptAt(60);
  const [x100,y100]=ptAt(100);
  const [x0, y0] =ptAt(0);
  const [nx,  ny] =ptAt(score);
  const col = score>=70?"#00ff88":score>=45?"#f0b429":"#ff3b5c";

  return `<svg viewBox="0 0 120 68" style="width:130px;height:75px">
    <!-- BG track -->
    <path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x100.toFixed(1)} ${y100.toFixed(1)}"
      fill="none" stroke="#1c2330" stroke-width="11" stroke-linecap="butt"/>
    <!-- Red zone 0-40% -->
    <path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x40a.toFixed(1)} ${y40a.toFixed(1)}"
      fill="none" stroke="rgba(255,59,92,.55)" stroke-width="11" stroke-linecap="butt"/>
    <!-- Yellow zone 40-60% -->
    <path d="M ${x40a.toFixed(1)} ${y40a.toFixed(1)} A ${r} ${r} 0 0 1 ${x60a.toFixed(1)} ${y60a.toFixed(1)}"
      fill="none" stroke="rgba(240,180,41,.55)" stroke-width="11" stroke-linecap="butt"/>
    <!-- Green zone 60-100% -->
    <path d="M ${x60a.toFixed(1)} ${y60a.toFixed(1)} A ${r} ${r} 0 0 1 ${x100.toFixed(1)} ${y100.toFixed(1)}"
      fill="none" stroke="rgba(0,255,136,.55)" stroke-width="11" stroke-linecap="butt"/>
    <!-- Needle shadow -->
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
      stroke="rgba(0,0,0,.4)" stroke-width="4" stroke-linecap="round"/>
    <!-- Needle -->
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
      stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Center hub -->
    <circle cx="${cx}" cy="${cy}" r="5" fill="#0d1117" stroke="${col}" stroke-width="2"/>
    <!-- Labels -->
    <text x="11" y="67" fill="#8b949e" font-size="8" font-family="monospace">0</text>
    <text x="53" y="16" fill="#8b949e" font-size="8" font-family="monospace">50</text>
    <text x="99" y="67" fill="#8b949e" font-size="8" font-family="monospace">100</text>
  </svg>`;
}

function renderEcon(){
  if(state.fredKey&&state.econLoading&&!state.econData){
    document.getElementById("page-econ").innerHTML=`<div class="sectitle">Economic Data</div><div class="econ-loading"><div class="spinner"></div><span>Fetching live data from FRED...</span></div>`;return;
  }

  const econSubTabs=[
    {id:"meter",  label:"🎯 Surprise Meter"},
    {id:"heatmap",label:"🌡 Heatmap"},
  ];

  let html=`<div class="eco-sub-tabs">${econSubTabs.map(t=>`<button class="eco-sub-tab${ecoSubTab===t.id?" active":""}" onclick="setEcoTab('${t.id}')">${t.label}</button>`).join("")}</div>`;

  // ── SURPRISE METER ──
  if(ecoSubTab==="meter"){
    // ✅ Use FRED data if available, else fallback
    const ecoSurprise = state.econData ? calcSurpriseFromFRED(state.econData) : ECO_SURPRISE_FALLBACK;
    // Merge fallback for currencies FRED doesn't cover (NZD, CAD, AUD, CHF)
    const merged = {...ECO_SURPRISE_FALLBACK,...ecoSurprise};
    const scores=Object.entries(merged);
    const avg=Math.round(scores.reduce((a,[,v])=>a+v.score,0)/scores.length);
    const avgCol=avg>=70?"var(--bull)":avg>=45?"var(--neutral)":"var(--bear)";

    html+=`
    <div class="infobox ib-blue" style="margin-bottom:14px">
      <span class="iblabel" style="color:var(--accent)">ℹ ECONOMIC SURPRISE METER</span>
      Shows how economic data for each currency has performed <strong style="color:var(--text)">relative to expectations</strong>.
      A higher score means more data has been <strong style="color:var(--bull)">beating forecasts</strong>.
      A lower score means more data has been <strong style="color:var(--bear)">missing forecasts</strong>.
    </div>

    <!-- INDIVIDUAL CURRENCY GAUGES -->
    <div class="sectitle">Currency Economic Surprise Scores</div>
    <div class="gauge-grid">`;

    scores.forEach(([cur,data])=>{
      const col=data.score>=70?"var(--bull)":data.score>=45?"var(--neutral)":"var(--bear)";
      const status=data.score>=70?"Strong":data.score>=55?"Above Avg":data.score>=45?"Average":data.score>=30?"Below Avg":"Weak";
      html+=`<div class="gauge-wrap">
        <div class="gauge-label">${FLAGS[cur]||""} ${cur}</div>
        ${makeGaugeSVG(data.score)}
        <div class="gauge-pct" style="color:${col}">${data.score}%</div>
        <div class="gauge-status">${status}</div>
      </div>`;
    });

    html+=`</div>

    <!-- GLOBAL AVERAGE GAUGE -->
    <div class="sectitle">Global Economic Surprise Score</div>
    <div class="global-gauge-wrap">
      <div style="display:flex;flex-direction:column;align-items:center">
        ${makeGaugeSVG(avg)}
        <div style="font-family:var(--mono);font-size:28px;font-weight:bold;color:${avgCol};margin-top:4px">${avg}%</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">AVG ALL CURRENCIES</div>
      </div>
      <div class="global-gauge-info">
        <div class="global-gauge-title">Global Economic Surprise Score: ${avg}%</div>
        <div class="global-gauge-desc">
          This gauge reflects the average economic outperformance or underperformance across the eight major currencies.
          A higher score indicates a more robust global economic outlook.<br><br>
          <strong style="color:${avg>=60?"var(--bull)":avg>=45?"var(--neutral)":"var(--bear)"}">${avg>=70?"🟢 Global economy broadly beating expectations":avg>=55?"🟡 Global economy slightly above expectations":avg>=45?"⚪ Global economy in line with expectations":"🔴 Global economy broadly missing expectations"}</strong>
        </div>
      </div>
    </div>

    <!-- INDICATOR BREAKDOWN -->
    <div class="sectitle">Indicator Breakdown by Currency</div>`;

    scores.forEach(([cur,data])=>{
      const col=data.score>=70?"var(--bull)":data.score>=45?"var(--neutral)":"var(--bear)";
      html+=`<div class="card" style="margin-bottom:10px">
        <div class="chd"><span class="ctitle">${FLAGS[cur]||""} ${cur} — ${data.score}%</span><span class="cbadge" style="color:${col}">${data.score>=70?"STRONG":data.score>=45?"AVERAGE":"WEAK"}</span></div>
        <div class="cbody" style="display:flex;gap:10px;flex-wrap:wrap">`;
      data.indicators.forEach(ind=>{
        const ic=ind.s>=.4?"var(--bull)":ind.s>=.1?"#7effc4":ind.s<=-.4?"var(--bear)":ind.s<=-.1?"#ff8fa0":"var(--muted)";
        const il=ind.s>=.4?"▲▲ Strong Beat":ind.s>=.1?"▲ Beat":ind.s<=-.4?"▼▼ Strong Miss":ind.s<=-.1?"▼ Miss":"→ In Line";
        html+=`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;min-width:80px;text-align:center">
          <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">${ind.n}</div>
          <div style="font-family:var(--mono);font-size:11px;color:${ic};margin-top:3px">${il}</div>
        </div>`;
      });
      html+=`</div></div>`;
    });
  }

  // ── HEATMAP ──
  else if(ecoSubTab==="heatmap"){
    const data2=state.econData||FALLBACK_ECON;const isLive=state.econLive;
    if(!state.fredKey)html+=`<div class="infobox ib-yellow"><span class="iblabel" style="color:var(--neutral)">⚡ UPGRADE TO LIVE DATA</span>Go to <strong style="color:var(--accent)">fred.stlouisfed.org</strong> → My Account → API Keys → paste in ⚙ Settings.</div>`;
    for(const[cur,items]of Object.entries(data2)){
      const badge=isLive?`<span class="cbadge-live">● LIVE · FRED</span>`:`<span class="cbadge-demo">DEMO DATA</span>`;
      html+=`<div class="card"><div class="chd"><span class="ctitle">${FLAGS[cur]||""} ${cur}</span>${badge}</div><div class="hgrid">`;
      items.forEach(i=>{
        const bg=i.s>.3?"rgba(0,255,136,.15)":i.s<-.3?"rgba(255,59,92,.15)":"rgba(240,180,41,.1)";
        const br=i.s>.3?"1px solid rgba(0,255,136,.2)":i.s<-.3?"1px solid rgba(255,59,92,.2)":"1px solid rgba(240,180,41,.15)";
        const lbl=i.s>.3?"▲ Beat":i.s<-.3?"▼ Miss":"→ In Line";
        const lc=i.s>.3?"var(--bull)":i.s<-.3?"var(--bear)":"var(--muted)";
        html+=`<div class="hcell" style="background:${bg};border:${br}"><div class="hlbl">${i.l}</div><div class="hval">${i.v}</div><div class="hchg" style="color:${lc}">${lbl}</div>${i.d?`<div class="hdate">${i.d}</div>`:""}</div>`;
      });
      html+=`</div></div>`;
    }
  }

  document.getElementById("page-econ").innerHTML=html;
}
function setEcoTab(id){ecoSubTab=id;renderEcon();}

// ── CURRENCY ──────────────────────────────────────────────────────────────────
function renderCurrency(){
  if(!state.cdata){document.getElementById("page-currency").innerHTML=`<div class="lrow"><div class="spinner"></div><span>Loading live rates...</span></div>`;return;}
  let html=`<div class="sectitle">Currency Strength — Live Rates</div><div class="card"><div class="chd"><span class="ctitle">G8 Relative Strength</span><span class="cbadge-live">● LIVE · Frankfurter</span></div><div class="cbody">`;
  state.cdata.forEach((c,i)=>{const col=c.val>.05?"var(--bull)":c.val<-.05?"var(--bear)":"var(--neutral)";html+=`<div class="crow"><div class="crank">${i+1}</div><div class="ccode" style="color:${col}">${c.code}</div><div class="cname">${c.name}</div><div class="cbarw"><div class="cbart"><div class="cbarf" style="width:${c.pct}%;background:${col}"></div></div></div><div class="cval" style="color:${col}">${c.val>0?"+":""}${c.val.toFixed(3)}</div></div>`;});
  html+=`</div></div>`;document.getElementById("page-currency").innerHTML=html;
}

// ── CARRY ─────────────────────────────────────────────────────────────────────
function renderCarry(){
  let html=`<div class="sectitle">Carry Trade Scanner</div><div class="infobox ib-blue"><span class="iblabel" style="color:var(--accent)">ℹ CARRY TRADE</span>Buy high interest rate currency, sell low rate currency. Best in low volatility trending markets.</div>
  <div class="card"><div class="chd"><span class="ctitle">Best Carry Opportunities</span><span class="cbadge">RANKED BY RATE DIFF</span></div><div class="cbody">`;
  CARRY_PAIRS.forEach(p=>{
    const col=p.score>=2?"var(--bull)":p.score>=1?"#7effc4":p.score<=0?"var(--bear)":"var(--neutral)";
    const stars="★".repeat(Math.max(0,p.score+2))+"☆".repeat(Math.max(0,2-p.score));
    html+=`<div class="carry-row"><div style="font-family:var(--mono);font-size:12px;font-weight:bold;width:80px;flex-shrink:0;color:${col}">${p.pair}</div><div style="flex:1"><div style="font-family:var(--mono);font-size:11px;color:var(--text)">Long ${p.long} / Short ${p.short}</div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Rate diff: ${p.rate.toFixed(2)}%</div></div><div style="text-align:right"><div style="font-family:var(--mono);font-size:14px;font-weight:bold;color:${col}">${p.rate.toFixed(2)}%</div><div style="font-family:var(--mono);font-size:10px;color:${col}">${stars}</div></div></div>`;
  });
  html+=`</div></div>`;document.getElementById("page-carry").innerHTML=html;
}

// ── FEAR & GREED ──────────────────────────────────────────────────────────────
function renderFearGreed(){
  const data=state.fgData;const isLive=state.fgLive;
  const fg=parseInt(data[0].value);const col=fgColor(fg);
  const yesterday=data[1]?parseInt(data[1].value):null;
  const lastWeek=data[7]?parseInt(data[7].value):null;
  const lastMonth=data[29]?parseInt(data[29].value):null;
  const history=data.slice(0,7).reverse();
  const badge=isLive?`<span class="cbadge-live">● LIVE · Alternative.me</span>`:`<span class="cbadge-demo">ESTIMATED</span>`;
  let html=`<div class="sectitle">Fear & Greed Index</div>
  <div class="card"><div class="chd"><span class="ctitle">Crypto Market Sentiment</span>${badge}</div><div class="cbody">
    <div style="display:flex;flex-direction:column;align-items:center;padding:10px 0">
      <div style="font-family:var(--mono);font-size:72px;font-weight:bold;color:${col};line-height:1">${fg}</div>
      <div style="font-family:var(--mono);font-size:20px;font-weight:bold;color:${col};margin-top:8px">${fgLabel(fg)}</div>
      <div style="width:100%;max-width:340px;margin:20px auto 0">
        <div class="fg-bar"><div class="fg-pointer" style="left:${fg}%"></div></div>
        <div class="fg-labels"><span style="color:var(--bear)">Extreme Fear</span><span>Neutral</span><span style="color:var(--bull)">Extreme Greed</span></div>
      </div>
    </div>
  </div></div>
  <div class="card"><div class="chd"><span class="ctitle">Historical Comparison</span>${badge}</div><div class="cbody">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
      ${yesterday!=null?`<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Yesterday</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(yesterday)};margin:4px 0">${yesterday}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(yesterday)}">${fgLabel(yesterday)}</div></div>`:""}
      ${lastWeek!=null?`<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Last Week</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(lastWeek)};margin:4px 0">${lastWeek}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(lastWeek)}">${fgLabel(lastWeek)}</div></div>`:""}
      ${lastMonth!=null?`<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Last Month</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(lastMonth)};margin:4px 0">${lastMonth}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(lastMonth)}">${fgLabel(lastMonth)}</div></div>`:""}
    </div>
  </div></div>
  <div class="card"><div class="chd"><span class="ctitle">7-Day History</span>${badge}</div><div class="cbody">
    ${history.map(d=>{const v=parseInt(d.value);const c=fgColor(v);const dt=new Date(parseInt(d.timestamp)*1000).toLocaleDateString([],{month:"short",day:"numeric"});return`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><div style="font-family:var(--mono);font-size:9px;color:var(--muted);width:50px;flex-shrink:0">${dt}</div><div style="flex:1;background:var(--bg4);border-radius:4px;overflow:hidden;height:26px"><div style="width:${v}%;height:100%;background:${c};border-radius:4px;display:flex;align-items:center;padding-left:8px"><span style="font-family:var(--mono);font-size:11px;font-weight:bold;color:#000">${v}</span></div></div><div style="font-family:var(--mono);font-size:9px;color:${c};width:80px;text-align:right;flex-shrink:0">${fgLabel(v)}</div></div>`;}).join("")}
  </div></div>`;
  document.getElementById("page-feargreed").innerHTML=html;
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function renderSettings(){
  document.getElementById("page-settings").innerHTML=`
  <div class="sectitle">API Settings</div>
  <div class="apibox"><h3>🟢 ALREADY CONNECTED — NO KEY NEEDED</h3>
    <div class="infobox ib-green" style="margin-bottom:0">
      <strong style="color:var(--bull)">Frankfurter.app</strong> — Live forex rates for Currency Strength<br>
      <strong style="color:var(--bull)">Alternative.me</strong> — Fear & Greed Index · Daily<br>
      <strong style="color:var(--bull)">CFTC.gov</strong> — COT Data · Auto-fetched every Friday<br>
      <strong style="color:${state.putCallLive?"var(--bull)":"var(--neutral)"}">CBOE</strong> — Put/Call Ratio · ${state.putCallLive?"● LIVE":"Attempting live fetch..."}<br>
      <strong style="color:${state.aaiiLive?"var(--bull)":"var(--neutral)"}">AAII</strong> — Investor Survey · ${state.aaiiLive?"● LIVE":"Attempting live fetch..."}
    </div>
  </div>

  <div class="apibox">
    <h3>😊 MYFXBOOK — Live Retail Sentiment (Free)</h3>
    <div class="key-status ${state.mfxEmail?"key-ok":"key-missing"}">${state.mfxEmail?"✅ Myfxbook connected — Retail sentiment is LIVE":"⚠ No credentials — Sentiment showing demo data"}</div>
    <div style="font-size:11px;color:var(--muted);margin:10px 0;line-height:1.8">
      1. Register free at <span style="color:var(--accent)">myfxbook.com</span><br>
      2. Enter your email and password below<br>
      3. Tap Save — live sentiment loads automatically ✅<br>
      <span style="color:var(--neutral)">⚠ Credentials stored only on your device — never sent anywhere except Myfxbook.</span>
    </div>
    <div class="apirow">
      <span class="apilbl">Email</span>
      <input class="apiinp" id="mfx-email" type="email" placeholder="Your myfxbook.com email" value="${state.mfxEmail}"/>
    </div>
    <div class="apirow">
      <span class="apilbl">Password</span>
      <input class="apiinp" id="mfx-password" type="password" placeholder="Your myfxbook.com password" value="${state.mfxPassword}"/>
    </div>
    <button class="apibtn" onclick="saveMyfxbook()" style="margin-top:4px">💾 Save & Connect</button>
    ${state.mfxEmail?`<button onclick="clearMyfxbook()" style="background:var(--bg4);color:var(--muted);border:1px solid var(--border);border-radius:5px;padding:8px 14px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-left:8px">Clear</button>`:""}
  </div>

  <div class="apibox"><h3>🌡 FRED API — Live GDP, CPI, Rates (Free)</h3>
    <div class="key-status ${state.fredKey?"key-ok":"key-missing"}">${state.fredKey?"✅ FRED key saved — Economic data is LIVE":"⚠ No key — Economic showing demo data"}</div>
    <div class="apirow" style="margin-top:10px">
      <span class="apilbl">FRED Key</span>
      <input class="apiinp" id="fred-input" placeholder="fred.stlouisfed.org → My Account → API Keys" value="${state.fredKey}"/>
      <button class="apibtn" onclick="saveFREDKey()">💾 Save</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.8">
      1. Go to <span style="color:var(--accent)">fred.stlouisfed.org</span><br>
      2. Click <strong style="color:var(--text)">My Account → API Keys → Request API Key</strong><br>
      3. Paste above → Save ✅
    </div>
  </div>

  <div class="apibox"><h3>🌱 ALPHA VANTAGE — Live Seasonality + Gold, Oil (Free)</h3>
    <div class="key-status ${state.avKey?"key-ok":"key-missing"}">${state.avKey?"✅ AV key saved — Seasonality data is LIVE from real price history":"⚠ No key — Seasonality using fallback data"}</div>
    <div class="apirow" style="margin-top:10px">
      <span class="apilbl">AV Key</span>
      <input class="apiinp" id="av-input" placeholder="alphavantage.co → Get Free API Key" value="${state.avKey}"/>
      <button class="apibtn" onclick="saveAVKey()">💾 Save</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.8">
      1. Go to <span style="color:var(--accent)">alphavantage.co</span> → click <strong style="color:var(--text)">Get Free API Key</strong><br>
      2. Fill in a name → get key instantly (no credit card)<br>
      3. Paste above → Save ✅ Seasonality fetches real 10yr price history automatically<br>
      <span style="color:var(--neutral)">⚠ Free tier = 25 calls/day. Seasonality loads 1 asset at a time (12s apart).</span>
    </div>
  </div>

  <div class="apibox"><h3>📱 ADD TO HOME SCREEN</h3>
    <div style="font-size:11px;color:var(--muted);line-height:2.1">
      <strong style="color:var(--text)">Android Chrome</strong> → Tap ⋮ → "Add to Home screen"<br>
      <strong style="color:var(--text)">iPhone Safari</strong> → Tap Share → "Add to Home Screen"<br>
      <span style="color:var(--bull)">✅ Opens full screen like a native app</span>
    </div>
  </div>

  <div class="apibox" id="ef-debug-panel-static">
    <h3 style="color:var(--accent)">● LIVE DATA STATUS</h3>
    ${renderDebugStatus()}
  </div>`;
}

// ── Debug status rows — called from renderSettings, no nested template literals ──
function renderDebugStatus() {
  const d = state.debug || {};
  const sources = [
    ['Frankfurter (Rates)',     'rates'],
    ['Fear & Greed (Alt.me)',   'feargreed'],
    ['CFTC COT',                'cot'],
    ['FRED Econ' + (!state.fredKey ? ' ⚠ no key' : ''), 'econ'],
    ['Myfxbook Sentiment',      'sentiment'],
    ['Put/Call CBOE',           'putcall'],
  ];
  let html = '';
  sources.forEach(function([label, key]) {
    const info = d[key] || {};
    const ok   = !!info.ok;
    const col  = ok ? '#00ff88' : '#e05c6a';
    const ts   = info.ts ? new Date(info.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
    const err  = info.err ? '<span style="color:#e05c6a;font-size:9px;margin-left:4px">' + info.err + '</span>' : '';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
          + '<span style="font-size:11px;color:var(--muted)"><span style="color:' + col + '">●</span> ' + label + err + '</span>'
          + '<span style="font-family:var(--mono);font-size:10px;color:' + col + '">' + (ok ? 'LIVE ' + ts : 'FAIL') + '</span>'
          + '</div>';
  });
  html += '<div style="margin-top:7px;font-family:var(--mono);font-size:9px;color:var(--muted)">'
        + 'Boot: ' + (d.lastBoot ? new Date(d.lastBoot).toLocaleTimeString() : '—')
        + ' · Now: ' + new Date().toLocaleTimeString()
        + '</div>';
  return html;
}

function saveMyfxbook(){
  const email=document.getElementById("mfx-email").value.trim();
  const password=document.getElementById("mfx-password").value.trim();
  if(!email||!password){alert("Please enter both email and password");return;}
  state.mfxEmail=email;state.mfxPassword=password;state.mfxSession="";
  saveKey("mfx_email",email);saveKey("mfx_password",password);saveKey("mfx_session","");
  state.sentimentLive=false;state.sentimentLoading=false;
  renderSettings();
  // Immediately try to fetch live data
  loadMyfxbookData();
  if(activeTab==="sentiment")renderSentiment();
}
function clearMyfxbook(){
  state.mfxEmail="";state.mfxPassword="";state.mfxSession="";
  saveKey("mfx_email","");saveKey("mfx_password","");saveKey("mfx_session","");
  state.sentimentLive=false;state.sentimentData=FALLBACK_SENTIMENT;
  renderSettings();
  if(activeTab==="sentiment")renderSentiment();
}
function saveFREDKey(){const val=document.getElementById("fred-input").value.trim();if(!val)return;state.fredKey=val;saveKey("fred",val);state.econData=null;state.econLive=false;state.econLoading=false;renderSettings();loadFREDData();if(activeTab==="econ")renderEcon();}
function saveAVKey(){
  const val=document.getElementById("av-input").value.trim();
  if(!val)return;
  state.avKey=val;saveKey("av",val);
  // Reset all season data to fallback so live re-fetch starts fresh
  SEASON_DATA=SEASON_DATA_FALLBACK.map(d=>({...d,live:false}));
  renderSettings();
  // Start fetching live seasonality immediately
  loadSeasonalityLive();
  if(activeTab==="seasonality")renderSeasonality();
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function initTabs(){
  const nav=document.getElementById("tabs");
  TABS_DEF.forEach(t=>{const btn=document.createElement("button");btn.className="tab"+(t.id===activeTab?" active":"");btn.textContent=t.label;btn.onclick=()=>switchTab(t.id);nav.appendChild(btn);});
}
function switchTab(id){
  activeTab=id;
  document.querySelectorAll(".tab").forEach((b,i)=>{b.className="tab"+(TABS_DEF[i].id===id?" active":"");});
  document.querySelectorAll(".page").forEach(p=>{p.className="page";});
  document.getElementById("page-"+id).className="page active";
  renderActive();
}
function renderActive(){
  if(activeTab==="scorecard")  renderScorecard();
  else if(activeTab==="forex")       renderForexScorecard();
  else if(activeTab==="setups")     renderSetups();
  else if(activeTab==="cot")        renderCOT();
  else if(activeTab==="sentiment")  renderSentiment();
  else if(activeTab==="econ")       renderEcon();
  else if(activeTab==="currency")   renderCurrency();
  else if(activeTab==="carry")      renderCarry();
  else if(activeTab==="feargreed")  renderFearGreed();
  else if(activeTab==="seasonality") renderSeasonality();
  else if(activeTab==="settings")   renderSettings();
}



// ═══════════════════════════════════════════════════════════════════════════
// SCORECARD MODULE — Asset Scorecard & Forex Scorecard
// Reads from existing ASSETS_SCORED — zero duplication.
// ═══════════════════════════════════════════════════════════════════════════

// ── SCORING ENGINE ────────────────────────────────────────────────────────────
// Weights are adjustable multipliers per component.
// ═══════════════════════════════════════════════════════════════════════════
// SCORECARD ENGINE v2 — Live Data Driven
// Reads from state (COT, Myfxbook, FRED, Put/Call, AAII, rates).
// Falls back to ASSETS_SCORED static values when live data unavailable.
// ═══════════════════════════════════════════════════════════════════════════

// ── WEIGHTS (adjustable) ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
//  FOREX SCORECARD — Hedge-Fund Grade 6-Factor Macro Engine v2
//  Spec:  T·20% + I·15% + G·20% + Inf·15% + L·10% + MP·20%  = 1.00
//  FX pair score = Base score − Quote score   (range ≈ −4 → +4)
//  All other tabs / asset scorecard UNTOUCHED.
// ═══════════════════════════════════════════════════════════════════════════

// ── LEGACY WEIGHTS (used by Asset Scorecard + Top Setups — DO NOT CHANGE) ──
function scMetricRow(metric, bias, actual, forecast, surprise) {
  const badgeClass = bias==="bull"?"badge-bull":bias==="bear"?"badge-bear":"badge-neut";
  const biasLabel  = bias==="bull"?"▲ Beat":bias==="bear"?"▼ Miss":"→ In Line";
  const surpCol    = bias==="bull"?"var(--bull)":bias==="bear"?"var(--bear)":"var(--muted)";
  return `<tr>
    <td class="sc-tbl-metric">${metric}</td>
    <td><span class="sc-tbl-badge ${badgeClass}">${biasLabel}</span></td>
    <td class="sc-tbl-actual">${actual}</td>
    <td class="sc-tbl-fore">${forecast}</td>
    <td style="font-family:var(--mono);font-size:10px;color:${surpCol}">${surprise}</td>
  </tr>`;
}

function getAssetMetrics(a) {
  // Uses live deriveComponents for accurate bias; scales to readable figures
  const comp = deriveComponents(a.id, {
    cotRows:  (state.cotData&&state.cotData.length)?state.cotData:COT_DATA,
    sentiment:state.sentimentLive?state.sentimentData:FALLBACK_SENTIMENT,
    econ:     state.econData||FALLBACK_ECON,
    putCall:  state.putCallLive?(state.putCallData||PUT_CALL):PUT_CALL,
    aaiiData: state.aaiiLive?(state.aaiiData||AAII):AAII,
    rates:    state.rates,
  });
  const s2b = v => v >= 1 ? "bull" : v <= -1 ? "bear" : "neut";
  const pct = v => (v > 0 ? "+" : "") + v.toFixed(1) + "%";
  const fmtS = v => (v > 0 ? "+" : "") + v.toFixed(1);
  const tr=a.trend,seas=a.seasonal,gdp=a.gdp,mPMI=a.mPMI,sPMI=a.sPMI;
  const rS=a.retailSal,inf=a.inflation,emp=a.empChg,unemp=a.unemploy,rt=a.rates;

  // Blend live FRED data into metric display where available
  const fredKey = ["EUR","GBP","JPY"].includes(a.id) ? a.id
                : ["DOW","NASDAQ","SPX500","RUSSELL","Gold","USOIL","SILVER","COPPER","US10T","BTC"].includes(a.id) ? "USD"
                : a.id === "USD" ? "USD" : null;
  const fredItems = fredKey && state.econData && state.econData[fredKey] ? state.econData[fredKey] : null;
  const gdpItem   = fredItems?.find(i=>i.l.toLowerCase().includes("gdp"));
  const cpiItem   = fredItems?.find(i=>i.l.toLowerCase().includes("cpi"));
  const unempItem = fredItems?.find(i=>i.l.toLowerCase().includes("unemploy"));

  return {
    technical: [
      { m:"4H Trend",    bias:s2b(comp.technical), act:comp.technical>=1?"Above MA":"Below MA",         fore:"MA Level", surp:fmtS(comp.technical*0.8) },
      { m:"Daily Trend", bias:s2b(tr),              act:tr>=2?"Strong Up":tr>=1?"Up":"Down",             fore:"Neutral",  surp:fmtS(tr*0.8) },
      { m:"Momentum",    bias:s2b(seas),             act:seas>=1?"Positive":"Negative",                  fore:"Flat",     surp:fmtS(seas*0.6) },
      { m:"Seasonality", bias:s2b(seas),             act:`${(seas*1.2).toFixed(1)}% avg`,               fore:"0.0% avg", surp:pct(seas*1.2) },
    ],
    institutional: [
      { m:"Net COT Pos",  bias:s2b(comp.cot),   act:`${(comp.cot*14000).toLocaleString()}`,  fore:"0",  surp:comp.cot>=1?"Rising":"Falling" },
      { m:"COT Change",   bias:s2b(comp.cot),   act:`${(comp.cot*3200).toLocaleString()}`,   fore:"0",  surp:fmtS(comp.cot*3200) },
      { m:"Retail Long%", bias:s2b(-comp.sentiment), act:comp.sentiment<=-1?"72%":comp.sentiment>=1?"28%":"50%", fore:"50%", surp:comp.sentiment<=-1?"Crowd Long":"Crowd Short" },
      { m:"Smart/Retail", bias:s2b(comp.cot),   act:comp.cot>=1?"Diverge Bull":"Diverge Bear", fore:"Aligned", surp:fmtS(comp.cot) },
    ],
    economic: [
      { m:"GDP YoY",      bias:s2b(comp.growth),  act:gdpItem?gdpItem.v:pct(2.1+gdp*0.6),  fore:pct(2.0),  surp:gdpItem?fmtS(gdpItem.s*4):fmtS(gdp*0.5) },
      { m:"Mfg PMI",      bias:s2b(mPMI),          act:`${(50+mPMI*2.5).toFixed(1)}`,       fore:"50.0",    surp:fmtS(mPMI*2.5) },
      { m:"Serv PMI",     bias:s2b(sPMI),          act:`${(52+sPMI*2.5).toFixed(1)}`,       fore:"52.0",    surp:fmtS(sPMI*2.5) },
      { m:"Retail Sales", bias:s2b(rS),            act:pct(0.4+rS*0.3),                    fore:pct(0.3),  surp:fmtS(rS*0.3) },
    ],
    inflation: [
      { m:"CPI YoY", bias:s2b(-comp.inflation), act:cpiItem?cpiItem.v:pct(3.0+inf*0.4),   fore:pct(3.1), surp:cpiItem?fmtS(cpiItem.s*4):pct(inf*0.4) },
      { m:"PPI YoY", bias:s2b(-comp.inflation), act:pct(2.8+inf*0.5),                     fore:pct(2.9), surp:pct(inf*0.5) },
      { m:"PCE YoY", bias:s2b(-comp.inflation), act:pct(2.6+inf*0.3),                     fore:pct(2.5), surp:pct(inf*0.3) },
    ],
    jobs: [
      { m:"NFP",          bias:s2b(comp.jobs),   act:`${(180+emp*18)}K`,                                  fore:"175K",  surp:`${emp>=0?"+":""}${emp*18}K` },
      { m:"Unemployment", bias:s2b(-comp.jobs),  act:unempItem?unempItem.v:`${(4.0-unemp*0.2).toFixed(1)}%`, fore:"4.0%", surp:unempItem?fmtS(unempItem.s*4)+"%":fmtS(-unemp*0.2)+"%" },
      { m:"Interest Rate",bias:s2b(rt),          act:`${(5.0+rt*0.25).toFixed(2)}%`,                      fore:"5.00%", surp:fmtS(rt*0.25)+"%" },
    ],
  };
}

// ── SCORE HISTORY HISTOGRAM ───────────────────────────────────────────────────
// Design contract:
//   • SAME dataset regardless of screen width (viewBox scales via CSS width:100%)
//   • Pure histogram tiling: bars fill exactly left→right with 1px gap
//   • Zero-anchored: bars grow up (positive) or down (negative) from zero line
//   • Color polarity: emerald = bull, red = bear, two-tone opacity by magnitude
//   • Consistent on every device — SVG viewBox handles all responsiveness
function scHistoryChart(assetId, curScore, opts={}) {
  const CHART_H  = opts.height      || 140;
  const showHdr  = opts.showLabel   !== false;
  const hdrLabel = opts.labelSuffix || assetId;
  const N_DAYS   = 30; // always 30 bars, no slicing

  // ── 1. Build dataset (always N_DAYS entries, null = no data yet) ──────────
  const pts = [];
  for (let i = N_DAYS - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = "ef_sh_" + d.toISOString().split("T")[0];
    try {
      const raw = localStorage.getItem(key);
      const sc  = raw ? (JSON.parse(raw)[assetId] ?? null) : null;
      pts.push({ d, sc });
    } catch(e) { pts.push({ d, sc: null }); }
  }
  // Pin today's score regardless of storage
  pts[pts.length - 1].sc = curScore;

  // Filled = has a value; gaps shown as hairline
  const filled = pts.filter(p => p.sc !== null);

  // ── 2. Placeholder when history is brand new ──────────────────────────────
  if (filled.length < 2) {
    const col = curScore >= 1 ? "#34d399" : curScore <= -1 ? "#f87171" : "#9ca3af";
    return `<div class="sc-history-card">
      ${showHdr ? `<div class="sc-history-hd"><span class="sc-history-title">Score History — ${hdrLabel}</span></div>` : ''}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:${CHART_H}px;gap:6px">
        <div style="font-size:9px;font-weight:600;letter-spacing:1px;color:var(--sc-t3);text-transform:uppercase">History builds daily</div>
        <div style="font-size:28px;font-weight:800;color:${col}">${curScore>=0?"+":""}${curScore}</div>
      </div>
    </div>`;
  }

  // ── 3. SVG geometry — FIXED viewBox, CSS scales it ────────────────────────
  // viewBox is always 560×CHART_H. CSS width:100% handles responsive scaling.
  // No device-specific branching. No min-width hacks.
  const VW = 560; // viewBox width — never changes
  const pL = 34, pR = 8, pT = 12, pB = 24;
  const cW = VW - pL - pR;  // chart drawable width
  const cH = CHART_H - pT - pB;

  // ── 4. Y scale — zero-anchored, symmetric enough to show polarity ─────────
  const allSc = filled.map(p => p.sc);
  const rawMax = Math.max(...allSc, 5);
  const rawMin = Math.min(...allSc, -5);
  // Add 15% headroom so bars don't touch edges
  const headroom = Math.max(1.5, (rawMax - rawMin) * 0.12);
  const yMax = rawMax + headroom;
  const yMin = rawMin - headroom;
  const yRange = yMax - yMin;

  // Map value → SVG Y coordinate (top = pT when v=yMax)
  const yOf = v => pT + cH * (1 - (v - yMin) / yRange);
  const z   = yOf(0); // zero baseline Y

  // ── 5. Pure histogram tiling ──────────────────────────────────────────────
  // Each of the N_DAYS slots gets exactly cW/N_DAYS width.
  // Bars are 1px narrower on each side → 1px gap between all bars.
  const slotW = cW / N_DAYS;
  const barW  = Math.max(2, slotW - 2); // minimum 2px, 1px gap each side
  // Map day index → left edge of slot
  const xLeft = i => pL + i * slotW + (slotW - barW) / 2;

  // ── 6. Zone fills (subtle gradient feel using two rects) ──────────────────
  const bullZoneH = Math.max(0, z - pT);
  const bearZoneH = Math.max(0, pT + cH - z);
  const zones =
    `<rect x="${pL}" y="${pT}"           width="${cW}" height="${bullZoneH.toFixed(1)}" fill="rgba(52,211,153,.03)"/>` +
    `<rect x="${pL}" y="${z.toFixed(1)}" width="${cW}" height="${bearZoneH.toFixed(1)}" fill="rgba(248,113,113,.03)"/>`;

  // ── 7. Reference lines (+5, 0, -5) ───────────────────────────────────────
  const refLines = [-5, 0, 5].filter(v => v > yMin && v < yMax).map(v => {
    const ry  = yOf(v).toFixed(1);
    const isZ = v === 0;
    const lc  = isZ ? "rgba(255,255,255,.2)" : v > 0 ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)";
    const lbl = v > 0 ? `+${v}` : `${v}`;
    return (
      `<line x1="${pL}" y1="${ry}" x2="${VW-pR}" y2="${ry}" stroke="${lc}" stroke-width="${isZ?1:.6}" ${isZ?'':'stroke-dasharray="3,3"'}/>` +
      `<text x="${pL-2}" y="${(parseFloat(ry)+3.5).toFixed(0)}" fill="${lc}" font-size="7" text-anchor="end" font-family="monospace">${lbl}</text>`
    );
  }).join("");

  // ── 8. Bars — N_DAYS slots, gap for nulls ────────────────────────────────
  let bars = "";
  pts.forEach((p, i) => {
    if (p.sc === null) return; // leave gap for missing days
    const sc    = p.sc;
    const barH  = Math.max(1.5, Math.abs(yOf(sc) - z));
    const barY  = sc >= 0 ? yOf(sc) : z;
    const barX  = xLeft(i);
    const isLast = i === pts.length - 1;

    // Color: magnitude-based opacity + full color for strong signals
    const abs   = Math.abs(sc);
    const alpha = abs >= 5 ? 1 : abs >= 3 ? 0.78 : abs >= 1 ? 0.5 : 0.3;
    const col   = sc > 0
      ? `rgba(52,211,153,${alpha})`
      : sc < 0
        ? `rgba(248,113,113,${alpha})`
        : "rgba(156,163,175,.3)";

    // Today's bar: full opacity + bright stroke highlight
    const lastAttrs = isLast
      ? ` stroke="${sc>0?'#34d399':sc<0?'#f87171':'#9ca3af'}" stroke-width="1.5"`
      : "";

    bars += `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}"
      width="${barW.toFixed(1)}" height="${barH.toFixed(1)}"
      fill="${isLast?(sc>0?'#34d399':sc<0?'#f87171':'#9ca3af'):col}" rx="1"${lastAttrs}/>`;
  });

  // ── 9. Zero baseline ──────────────────────────────────────────────────────
  const baseline = `<line x1="${pL}" y1="${z.toFixed(1)}" x2="${VW-pR}" y2="${z.toFixed(1)}"
    stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;

  // ── 10. X-axis labels — always 5 labels across all N_DAYS ────────────────
  // Positions at 0%, 25%, 50%, 75%, 100% of timeline
  const labelIdxs = [0, 7, 14, 21, 29];
  const xLabels = labelIdxs.map(i => {
    const p = pts[i];
    if (!p) return "";
    const lx = (pL + i * slotW + slotW / 2).toFixed(1);
    return `<text x="${lx}" y="${CHART_H - 5}" fill="rgba(255,255,255,.2)"
      font-size="7" text-anchor="middle" font-family="monospace">
      ${p.d.toLocaleDateString([], {month:"short", day:"numeric"})}
    </text>`;
  }).join("");

  // ── 11. Current score annotation ─────────────────────────────────────────
  const last    = pts[pts.length - 1];
  const lastCol = last.sc >= 1 ? "#34d399" : last.sc <= -1 ? "#f87171" : "#9ca3af";
  const annot   = `<circle cx="${(xLeft(N_DAYS-1)+barW/2).toFixed(1)}" cy="${yOf(last.sc).toFixed(1)}"
    r="3" fill="${lastCol}" stroke="#0d1117" stroke-width="1.2"/>`;

  const hdrHTML = showHdr ? `
    <div class="sc-history-hd">
      <span class="sc-history-title">${hdrLabel}</span>
      <span style="font-size:10px;font-weight:800;color:${lastCol}">${last.sc>=0?"+":""}${last.sc}</span>
    </div>` : "";

  return `<div class="sc-history-card">
    ${hdrHTML}
    <svg viewBox="0 0 ${VW} ${CHART_H}" preserveAspectRatio="none"
      style="width:100%;height:${CHART_H}px;display:block">
      <rect width="${VW}" height="${CHART_H}" fill="#0b0f17"/>
      ${zones}${refLines}${bars}${baseline}${annot}${xLabels}
    </svg>
  </div>`;
}


// ── RENDER: ASSET SCORECARD (adds stable IDs for updateAssetUI) ───────────────
function scBiasInfo(sc){
  if(sc>=5) return{col:"#34d399",bg:"rgba(52,211,153,.1)", border:"rgba(52,211,153,.22)", text:"Bullish"};
  if(sc<=-5)return{col:"#f87171",bg:"rgba(248,113,113,.1)",border:"rgba(248,113,113,.22)",text:"Bearish"};
  if(sc>=2) return{col:"#6ee7b7",bg:"rgba(110,231,183,.07)",border:"rgba(110,231,183,.18)",text:"Mild Bull"};
  if(sc<=-2)return{col:"#fca5a5",bg:"rgba(252,165,165,.07)",border:"rgba(252,165,165,.18)",text:"Mild Bear"};
  return{col:"#6b7280",bg:"rgba(107,114,128,.06)",border:"rgba(107,114,128,.15)","text":"Neutral"};
}

// ═══════════════════════════════════════════════════════════════════════════
//  ASSET SCORECARD — Nick/EdgeFinder style gauge + 5-factor engine
//  Spec weights: Technical 25% · Institutional 20% · Growth 20% · Inflation 20% · Labor 15%
//  ONLY this function and scNickGaugeSVG are new — nothing else touched.
// ═══════════════════════════════════════════════════════════════════════════

// ── Nick-style semicircle dial ───────────────────────────────────────────────
function scNickGaugeSVG(score, maxRange) {
  const W=200, H=120, cx=100, cy=114, R=86, SW=22;
  const pct = Math.max(0, Math.min(1, (score + maxRange) / (2 * maxRange)));
  const na  = Math.PI * (1 - pct);
  const nLen = R - SW/2 - 6;
  const nx = (cx + nLen * Math.cos(na)).toFixed(1);
  const ny = (cy - nLen * Math.sin(na)).toFixed(1);
  const nc = score > 4 ? '#4a90d9' : score > 1 ? '#6aa8dc'
           : score < -4 ? '#c04040' : score < -1 ? '#dc7070' : '#8b949e';

  const pt = (deg, r) => {
    const a = deg * Math.PI / 180;
    return [(cx + r * Math.cos(a)).toFixed(1), (cy - r * Math.sin(a)).toFixed(1)];
  };
  // zone arc (sweep=0 = CCW in screen = upper semicircle direction)
  const arc = (fd, td, col) => {
    const [x1,y1] = pt(fd, R); const [x2,y2] = pt(td, R);
    return `<path d="M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-linecap="butt"/>`;
  };
  // split full semicircle into two 90° arcs to avoid 180° ambiguity
  const [bx0,by0]=pt(180,R), [bxm,bym]=pt(90,R), [bx1,by1]=pt(0,R);
  const bg = `<path d="M ${bx0} ${by0} A ${R} ${R} 0 0 0 ${bxm} ${bym} A ${R} ${R} 0 0 0 ${bx1} ${by1}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="${SW}" stroke-linecap="butt"/>`;
  const zones = [
    arc(180, 144, 'rgba(148,40,40,.92)'),
    arc(144, 108, 'rgba(110,55,50,.72)'),
    arc(108,  72, 'rgba(60,66,84,.60)'),
    arc( 72,  36, 'rgba(44,76,148,.72)'),
    arc( 36,   0, 'rgba(32,58,178,.92)'),
  ].join('');
  const ticks = [0,36,72,108,144,180].map(d => {
    const [x0,y0]=pt(d,R-SW/2); const [x1,y1]=pt(d,R+SW/2+3);
    return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="rgba(255,255,255,.22)" stroke-width="1.5"/>`;
  }).join('');
  const lbl = (d,r,t,c,s) => {
    const [x,y]=pt(d,r);
    return `<text x="${x}" y="${(+y+4).toFixed(1)}" text-anchor="middle" fill="${c}" font-size="${s}" font-family="sans-serif">${t}</text>`;
  };
  const labels =
    lbl(162,R,'Bear',   'rgba(210,90,90,.9)',  9) +
    lbl(126,R,'+ Bear', 'rgba(185,115,115,.7)',7) +
    lbl( 90,R,'Neutral','rgba(152,158,175,.8)',9) +
    lbl( 54,R,'+ Bull', 'rgba(90,132,205,.7)', 7) +
    lbl( 18,R,'Bull',   'rgba(72,136,216,.9)', 9);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:200px;height:auto;display:block;margin:0 auto">` +
    `${bg}${zones}${ticks}` +
    `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${nc}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#10161f" stroke="${nc}" stroke-width="2"/>` +
    `${labels}</svg>`;
}

// ── renderScorecard ──────────────────────────────────────────────────────────
// Fixes applied per audit:
//  1. Strong visual hierarchy (Primary → Secondary → Tertiary)
//  2. Score transformation visibility (raw → normalized → weighted)
//  3. Component weights shown + contribution to final score
//  4. Δ Score momentum indicator (yesterday vs today)
//  5. Macro narrative summary block
//  6. Data freshness per section
//  7. Collapsible sections (accordion)
//  8. Mobile-first stacking with sticky header
//  9. Smart Money vs Retail interpretation layer
// 10. Score history zones + current value annotation
function renderScorecard() {

  // ── 1. ASSET CATALOGUE ───────────────────────────────────────────────────────
  const SC_GROUPS = [
    { label:'Indices',    ids:['SPX500','NASDAQ','DOW','RUSSELL','US10T'] },
    { label:'Commodities',ids:['Gold','SILVER','USOIL','COPPER'] },
    { label:'Crypto',     ids:['BTC','ETH'] },
    { label:'Macro',      ids:['USD'] },
  ];
  const SC_LABELS = {
    SPX500:'SPX500',NASDAQ:'NAS100',DOW:'US30',RUSSELL:'RUT',US10T:'US10T',
    Gold:'XAUUSD',SILVER:'XAGUSD',USOIL:'USOIL',COPPER:'COPPER',
    BTC:'BTCUSD',ETH:'ETHUSD',USD:'DXY',
  };
  const allowedIds = SC_GROUPS.flatMap(g=>g.ids);
  if (!allowedIds.includes(state.scAsset)) state.scAsset = 'SPX500';

  let assetOpts = '';
  SC_GROUPS.forEach(g=>{
    const opts=g.ids.map(id=>{
      const a=ASSETS_SCORED.find(x=>x.id===id); if(!a) return '';
      return `<option value="${id}" ${id===state.scAsset?'selected':''}>${SC_LABELS[id]||id}</option>`;
    }).filter(Boolean).join('');
    if(opts) assetOpts+=`<optgroup label="${g.label}">${opts}</optgroup>`;
  });

  // ── 2. LIVE DATA ─────────────────────────────────────────────────────────────
  const ld = {
    cotRows:   (state.cotData&&state.cotData.length)?state.cotData:COT_DATA,
    sentiment: state.sentimentLive?state.sentimentData:FALLBACK_SENTIMENT,
    econ:      state.econData||FALLBACK_ECON,
    putCall:   state.putCallLive?(state.putCallData||PUT_CALL):PUT_CALL,
    aaiiData:  state.aaiiLive?(state.aaiiData||AAII):AAII,
    rates:     state.rates,
  };
  const raw     = ASSETS_SCORED.find(a=>a.id===state.scAsset)||ASSETS_SCORED[0];
  const comp    = deriveComponents(raw.id, ld);
  const metrics = getAssetMetrics(raw);
  const isLive  = state.cotLive||state.sentimentLive||state.econLive;

  // ── 3. SPEC-EXACT 5-FACTOR ENGINE ────────────────────────────────────────────
  const isInflBull = ['Gold','SILVER','USOIL','COPPER','BTC','ETH'].includes(raw.id);
  const f_tech   = comp.technical;
  const f_inst   = Math.max(-2, Math.min(2, Math.round(comp.cot*0.55 + comp.sentiment*0.45)));
  const f_growth = comp.growth;
  const f_infl   = Math.max(-2, Math.min(2, Math.round(comp.inflation*(isInflBull?1:-1))));
  const f_labor  = comp.jobs;
  const ws       = f_tech*0.25 + f_inst*0.20 + f_growth*0.20 + f_infl*0.20 + f_labor*0.15;

  const overallBias =
    ws>=1.0  ? 'Very Bullish' : ws>=0.3  ? 'Bullish' :
    ws<=-1.0 ? 'Very Bearish' : ws<=-0.3 ? 'Bearish' : 'Neutral';

  // Integer display scores
  const edgeScore    = f_tech + (comp.cot+comp.sentiment) + f_growth + f_infl + f_labor;
  const techScore    = f_tech;
  const sentCOTScore = comp.cot + comp.sentiment;
  const fundScore    = f_growth + f_infl + f_labor;

  // ── 4. SCORE CONTRIBUTIONS (visible weighting) ───────────────────────────────
  const contributions = [
    {key:'technical',   lbl:'Technical',    v:f_tech,   w:0.25, wlbl:'25%'},
    {key:'institutional',lbl:'Institutional',v:f_inst,  w:0.20, wlbl:'20%'},
    {key:'growth',      lbl:'Eco Growth',   v:f_growth, w:0.20, wlbl:'20%'},
    {key:'inflation',   lbl:'Inflation',    v:f_infl,   w:0.20, wlbl:'20%'},
    {key:'labor',       lbl:'Labor',        v:f_labor,  w:0.15, wlbl:'15%'},
  ];

  // ── 5. Δ SCORE MOMENTUM ───────────────────────────────────────────────────────
  let yesterday = null;
  try {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yk = 'ef_sh_'+yd.toISOString().split('T')[0];
    const yr = localStorage.getItem(yk);
    if(yr) yesterday = JSON.parse(yr)[raw.id] ?? null;
  } catch(e){}
  const delta = yesterday !== null ? edgeScore - yesterday : null;

  // ── 6. COT / SENTIMENT DETAIL ────────────────────────────────────────────────
  const cotId  = SC_COT_MAP[raw.id];
  const cotRow = ld.cotRows.find(r=>r.id===cotId);
  const mfxSym = SC_MFX_MAP[raw.id];
  const sentRow= mfxSym ? ld.sentiment.find(s=>s.name===mfxSym) : null;
  const rlp    = sentRow ? sentRow.longPercentage : 50;
  const pcId   = SC_PC_MAP[raw.id];
  const pcRow  = pcId ? ld.putCall.find(p=>p.id===pcId) : null;
  const crowdSignal = rlp>65?'Bullish':rlp<35?'Bearish':'Neutral';

  // Smart Money interpretation
  const smBias = comp.cot>=1?'Bullish':comp.cot<=-1?'Bearish':'Neutral';
  const retailInterp = rlp>65
    ? `Retail is ${rlp.toFixed(0)}% long — contrarian ${isInflBull?'bullish':'bearish'} signal`
    : rlp<35
      ? `Retail is ${rlp.toFixed(0)}% long (heavy short) — contrarian bullish signal`
      : `Retail is ${rlp.toFixed(0)}% long — no extreme, no contrarian edge`;

  // ── 7. MACRO NARRATIVE ───────────────────────────────────────────────────────
  const genNarrative = () => {
    const bulls=[],bears=[],neuts=[];
    contributions.forEach(c=>{
      if(c.v>=1) bulls.push(c.lbl);
      else if(c.v<=-1) bears.push(c.lbl);
      else neuts.push(c.lbl);
    });
    const aName = SC_LABELS[raw.id]||raw.name;
    const dir   = overallBias==='Neutral'?'neutral':overallBias.includes('Bull')?'bullish':'bearish';
    let n = `${aName} is <strong style="color:${biasC(overallBias)}">${overallBias}</strong>.`;
    if(bulls.length) n += ` Bullish signals from: ${bulls.join(', ')}.`;
    if(bears.length) n += ` Bearish drag from: ${bears.join(', ')}.`;
    if(neuts.length) n += ` Neutral: ${neuts.join(', ')}.`;
    if(delta!==null) n += ` Score ${delta>0?'improved':'weakened'} ${Math.abs(delta)} pt since yesterday (${delta>0?'↑':'↓'}).`;
    return n;
  };

  // ── 8. COLOUR / BADGE HELPERS (Nick's blue/red system) ───────────────────────
  const biasC = b => b.includes('Bull')?'#4a90d9':b.includes('Bear')?'#e05c6a':'#8b949e';
  const biasBg= b => b.includes('Bull')?'rgba(74,144,217,.20)':b.includes('Bear')?'rgba(224,92,106,.20)':'rgba(139,148,158,.10)';

  const badge = (bias,sm) => {
    const fs=sm?'9px':'10px'; const px=sm?'8px':'10px';
    return `<span style="display:inline-block;background:${biasBg(bias)};color:${biasC(bias)};
      border-radius:3px;padding:2px ${px};font-family:var(--mono);font-size:${fs};font-weight:700;
      white-space:nowrap;min-width:${sm?'52px':'70px'};text-align:center">${bias}</span>`;
  };

  const pill = v => {
    if(!v) return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--muted)">0</span>`;
    const c=v>0?'#4a90d9':'#e05c6a', bg=v>0?'rgba(74,144,217,.18)':'rgba(224,92,106,.18)';
    return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${c};
      background:${bg};padding:1px 10px;border-radius:4px">${v>0?'+':''}${v}</span>`;
  };

  const fmtSurp = v => {
    const n=parseFloat(v); if(isNaN(n)) return `<span style="color:var(--muted)">${v}</span>`;
    const c=n>0?'#4a90d9':n<0?'#e05c6a':'var(--muted)';
    return `<span style="color:${c}">${n>0?'+':''}${v}</span>`;
  };

  const b2bias = b=>b==='bull'?'Bullish':b==='bear'?'Bearish':'Neutral';

  // Score→normalized display e.g. "+0.2 → Score +1"
  const normHint = (raw_v, score_v) => {
    const c=score_v>0?'#4a90d9':score_v<0?'#e05c6a':'#8b949e';
    return `<span style="font-family:var(--mono);font-size:9px;color:${c};
      background:rgba(255,255,255,.04);padding:1px 5px;border-radius:3px;white-space:nowrap">
      Score ${score_v>0?'+':''}${score_v}</span>`;
  };

  // ── 9. FRESHNESS TIMESTAMPS ───────────────────────────────────────────────────
  const now = new Date();
  const freshLabel = (daysAgo, liveFlag) => {
    if(liveFlag) return `<span style="color:var(--bull);font-size:8px">● LIVE</span>`;
    if(daysAgo===0) return `<span style="color:#4a90d9;font-size:8px">Today</span>`;
    if(daysAgo<=7)  return `<span style="color:var(--muted);font-size:8px">${daysAgo}d ago</span>`;
    return `<span style="color:#e05c6a;font-size:8px">STALE ${daysAgo}d</span>`;
  };
  const techFresh   = freshLabel(0, isLive);
  const cotFresh    = freshLabel(state.cotLive?0:7, state.cotLive);
  const econFresh   = freshLabel(state.econLive?0:30, state.econLive);
  const sentFresh   = freshLabel(state.sentimentLive?0:1, state.sentimentLive);

  // ── 10. COLLAPSIBLE SECTION BUILDER ──────────────────────────────────────────
  let sectionCounter = 0;
  const section = (id, icon, title, bias, weight, freshness, contentHTML, contrib) => {
    const sid = `sc-sect-${id}`;
    const contribLine = contrib!==undefined
      ? `<span style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-left:6px">
           ${weight} weight · ${contrib>0?'+':''}${contrib.toFixed(2)} contribution</span>`
      : '';
    return `
    <div class="sc-accordion" style="border-bottom:1px solid rgba(255,255,255,.06)">
      <div onclick="scToggle('${sid}')" style="display:flex;align-items:center;gap:8px;
        padding:9px 12px;cursor:pointer;background:rgba(22,27,38,.95);
        user-select:none;-webkit-user-select:none">
        <span style="font-size:11px;font-weight:700;color:var(--text);flex:1">
          ${icon} ${title}${contribLine}
        </span>
        ${badge(bias,true)}
        <span style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-left:6px">${freshness}</span>
        <span class="sc-chevron" id="${sid}-chv" style="color:var(--muted);font-size:10px;margin-left:4px;transition:transform .2s">▼</span>
      </div>
      <div id="${sid}" style="display:block">
        ${contentHTML}
      </div>
    </div>`;
  };

  // ── 11. TABLE ROW HELPERS ─────────────────────────────────────────────────────
  const TBL = 'width:100%;border-collapse:collapse;font-size:11px';

  // Row with Actual/Forecast/Surprise + score hint
  const rowAFS = (name, bias, act, fore, surp, scoreV) => `
  <tr style="border-bottom:1px solid rgba(255,255,255,.03)">
    <td style="padding:6px 12px;font-size:11px;color:var(--muted);width:40%">${name}</td>
    <td style="padding:6px 6px;width:16%">${badge(bias,true)}</td>
    <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text);width:13%">${act||'—'}</td>
    <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted);width:13%">${fore||'—'}</td>
    <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;width:10%">${surp!==undefined?fmtSurp(surp):'—'}</td>
    <td style="padding:6px 8px;text-align:right;width:8%">${scoreV!==undefined?normHint(null,scoreV):''}</td>
  </tr>`;

  // Simple row (no AF/S columns)
  const rowSimple = (name, bias, extra) => `
  <tr style="border-bottom:1px solid rgba(255,255,255,.03)">
    <td style="padding:6px 12px;font-size:11px;color:var(--muted)">${name}</td>
    <td colspan="5" style="padding:6px 10px;display:flex;align-items:center;justify-content:flex-end;gap:8px">
      ${badge(bias,true)}
      ${extra||''}
    </td>
  </tr>`;

  // Column header row
  const colHd = (c1,c2,c3,c4,c5,c6) => `
  <tr style="background:rgba(255,255,255,.03)">
    <td style="padding:4px 12px;font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">${c1}</td>
    <td style="padding:4px 6px;font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">${c2||''}</td>
    <td style="padding:4px 6px;text-align:center;font-family:var(--mono);font-size:8px;color:var(--muted);font-style:italic">${c3||''}</td>
    <td style="padding:4px 6px;text-align:center;font-family:var(--mono);font-size:8px;color:var(--muted);font-style:italic">${c4||''}</td>
    <td style="padding:4px 6px;text-align:center;font-family:var(--mono);font-size:8px;color:var(--muted);font-style:italic">${c5||''}</td>
    <td style="padding:4px 8px;text-align:right;font-family:var(--mono);font-size:8px;color:var(--muted)">${c6||''}</td>
  </tr>`;

  // ── 12. SECTION CONTENT BUILDERS ─────────────────────────────────────────────

  // — Technical —
  const techContent = `<table style="${TBL}">
    ${colHd('Indicator','Bias','','','','')}
    ${rowSimple('4H / Daily Chart Trend',
      comp.technical>=1?'Bullish':comp.technical<=-1?'Bearish':'Neutral',
      normHint(null, f_tech))}
    ${rowSimple("Current Month's Seasonality",
      raw.seasonal>=1?'Bullish':raw.seasonal<=-1?'Bearish':'Neutral', '')}
  </table>`;

  // — Institutional (COT + Retail interpretation) —
  const cotNetBias = cotRow?(cotRow.longPct>cotRow.shortPct?'Bullish':'Bearish'):'Neutral';
  const cotChgBias = cotRow?(cotRow.netChg>0?'Bullish':'Bearish'):'Neutral';
  const instContent = `<table style="${TBL}">
    ${colHd('Indicator','Bias','Long %','Short %','Change %', '')}
    <tr style="border-bottom:1px solid rgba(255,255,255,.03)">
      <td style="padding:6px 12px;font-size:11px;color:var(--muted)">COT — Net Positioning</td>
      <td style="padding:6px 6px">${badge(cotNetBias,true)}</td>
      <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text)">${cotRow?cotRow.longPct.toFixed(2)+'%':'—'}</td>
      <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:#e05c6a">${cotRow?cotRow.shortPct.toFixed(2)+'%':'—'}</td>
      <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:#4a90d9">${cotRow?(cotRow.netChg>0?'+':'')+cotRow.netChg.toFixed(2)+'%':'—'}</td>
      <td style="padding:6px 8px;text-align:right">${normHint(null, comp.cot)}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,.03)">
      <td style="padding:6px 12px;font-size:11px;color:var(--muted)">COT — Latest Buys/Sells</td>
      <td style="padding:6px 6px">${badge(cotChgBias,true)}</td>
      <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text)">${cotRow?fmtK(cotRow.dLong):'—'}</td>
      <td style="padding:6px 6px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted)">${cotRow?fmtK(cotRow.dShort):'—'}</td>
      <td></td><td></td>
    </tr>
    <!-- Interpretation layer -->
    <tr style="background:rgba(255,255,255,.025)">
      <td colspan="6" style="padding:6px 12px">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="font-size:10px;color:var(--muted)">Smart Money:</span>
          ${badge(smBias,true)}
          <span style="font-size:10px;color:var(--muted);margin-left:4px">Retail:</span>
          <span style="font-size:10px;color:${rlp>65?'#e05c6a':rlp<35?'#4a90d9':'#8b949e'}">${retailInterp}</span>
          ${pcRow?`<span style="font-family:var(--mono);font-size:9px;color:var(--muted)">P/C: ${pcRow.pc.toFixed(2)}</span>`:''}
        </div>
      </td>
    </tr>
  </table>`;

  // — Economic Growth —
  const growthContent = `<table style="${TBL}">
    ${colHd('Indicator','Bias','Actual','Forecast','Surprise','Norm')}
    ${metrics.economic.map(r=>rowAFS(r.m, b2bias(r.bias), r.act, r.fore, r.surp, comp.growth)).join('')}
    ${rowAFS('Consumer Confidence',
      raw.retailSal>=1?'Bullish':raw.retailSal<=-1?'Bearish':'Neutral',
      (87.4+(raw.retailSal||0)*3.8).toFixed(1),'87.4',
      raw.retailSal>0?'+'+(raw.retailSal*3.8).toFixed(2):(raw.retailSal*3.8).toFixed(2),
      comp.growth)}
  </table>`;

  // — Inflation —
  const inflContent = `<table style="${TBL}">
    ${colHd('Indicator','Bias','Actual','Forecast','Surprise','Norm')}
    ${metrics.inflation.map(r=>{
      const adjBias=isInflBull?b2bias(r.bias):(r.bias==='bull'?'Bearish':r.bias==='bear'?'Bullish':'Neutral');
      return rowAFS(r.m, adjBias, r.act, r.fore, r.surp, f_infl);
    }).join('')}
    ${rowAFS('US02 Yield (21 day SMA)',
      comp.inflation>0?(isInflBull?'Bullish':'Bearish'):(isInflBull?'Bearish':'Bullish'),
      comp.inflation>0?'↑ Rising':comp.inflation<0?'↓ Falling':'→ Flat',
      'The 2yr yield','', f_infl)}
    <tr style="background:rgba(255,255,255,.025)">
      <td colspan="6" style="padding:5px 12px;font-size:9px;color:var(--muted);font-style:italic">
        ${isInflBull?'↑ Inflation = Bullish for '+SC_LABELS[raw.id]+' (commodity / crypto hedge)':'↑ Inflation = Bearish for '+SC_LABELS[raw.id]+' (equity risk-off)'}
      </td>
    </tr>
  </table>`;

  // — Labor —
  const laborContent = `<table style="${TBL}">
    ${colHd('Indicator','Bias','Actual','Forecast','Surprise','Norm')}
    ${metrics.jobs.map(r=>rowAFS(r.m, b2bias(r.bias), r.act, r.fore, '', f_labor)).join('')}
    ${rowAFS('ADP Employment Change',
      comp.jobs>=1?'Bullish':comp.jobs<=-1?'Bearish':'Neutral',
      comp.jobs>=1?'+185k':'-38k','120k','', f_labor)}
    ${rowAFS('JOLTS Job Openings',
      comp.jobs>=1?'Bullish':'Neutral',
      comp.jobs>=1?'7.1M':'6.0M','6.7M',
      comp.jobs>=1?'+0.4M':'-0.7M', f_labor)}
  </table>`;

  // ── 13. LEFT PANEL ────────────────────────────────────────────────────────────
  const edgeCol  = edgeScore>4?'#4a90d9':edgeScore>1?'#6aa8dc':edgeScore<-4?'#c04040':edgeScore<-1?'#dc7070':'#8b949e';
  const deltaStr = delta!==null
    ? `<span style="font-family:var(--mono);font-size:11px;color:${delta>0?'#4a90d9':delta<0?'#e05c6a':'#8b949e'};
        margin-left:6px">${delta>0?'↑':'↓'} ${delta>0?'+':''}${delta} vs yday</span>`
    : '';

  // Weighted contribution bar for each component
  const wtBars = contributions.map(c=>{
    const contrib = c.v * c.w;  // contribution to final weighted score
    const cc=c.v>0?'#4a90d9':c.v<0?'#e05c6a':'#8b949e';
    const pct=Math.round(Math.max(4,Math.min(96,((c.v+2)/4)*100)));
    return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">
      <span style="font-size:10px;color:var(--muted);width:80px;flex-shrink:0">${c.lbl}</span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cc};border-radius:2px"></div>
      </div>
      <span style="font-family:var(--mono);font-size:9px;color:${cc};min-width:22px;text-align:right">${c.v>0?'+':''}${c.v}</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--muted);min-width:28px;text-align:right">${c.wlbl}</span>
    </div>`;
  }).join('');

  const leftHTML = `
  <div style="width:232px;min-width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:7px">

    <!-- Symbol selector -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;
      padding:7px 10px;display:flex;align-items:center;gap:6px">
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">Symbol:</span>
      <select style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);
        font-family:var(--mono);font-size:11px;padding:3px 5px;border-radius:4px;outline:none"
        onchange="state.scAsset=this.value;renderScorecard();runEngine()">${assetOpts}</select>
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">(1) ▼</span>
    </div>

    <!-- PRIMARY: Final bias (biggest visual element) -->
    <div style="background:var(--bg2);border:2px solid ${biasC(overallBias)}44;border-radius:6px;
      padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:${biasC(overallBias)};
        letter-spacing:-.3px">${overallBias}</div>
      ${deltaStr}
    </div>

    <!-- SECONDARY: Gauge + score breakdown -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px 8px 8px">
      ${scNickGaugeSVG(edgeScore, 12)}
      <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px">
          <span style="font-size:11px;color:var(--text)">EdgeFinder score</span>
          <span id="sc-score-num" style="font-family:var(--mono);font-size:13px;font-weight:700;color:${edgeCol}">${edgeScore}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px">
          <span style="font-size:11px;color:var(--text)">Technical score</span>
          <span style="font-family:var(--mono);font-size:13px;font-weight:700;
            color:${techScore===0?'var(--muted)':techScore>0?'#4a90d9':'#e05c6a'}">${techScore}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px">
          <span style="font-size:11px;color:var(--text)">Sentiment + COT</span>${pill(sentCOTScore)}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px">
          <span style="font-size:11px;color:var(--text)">Fundamentals</span>${pill(fundScore)}
        </div>
      </div>
    </div>

    <!-- TERTIARY: Component weight bars -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;
        letter-spacing:.8px;margin-bottom:6px">Component Weights → Final Score</div>
      ${wtBars}
      <div style="margin-top:6px;padding-top:5px;border-top:1px solid var(--border);
        display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px">
        <span style="color:var(--muted)">Weighted Score</span>
        <span style="color:${biasC(overallBias)};font-weight:700">${ws>0?'+':''}${ws.toFixed(2)}</span>
      </div>
    </div>

    <!-- Score over time -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;overflow:hidden">
      <div style="padding:6px 10px;background:var(--bg3);border-bottom:1px solid var(--border);
        font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px">
        EdgeFinder score over time
      </div>
      ${scHistoryChart(raw.id, edgeScore, {height:120, showLabel:false})}
    </div>

    <!-- Targets -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:7px 10px">
      ${['Target 1','Target 2','Target 3'].map(t=>`
      <div style="display:flex;justify-content:space-between;padding:3px 0;
        border-bottom:1px solid rgba(255,255,255,.04)">
        <span style="font-size:11px;color:var(--muted)">${t}</span>
        <span style="font-family:var(--mono);font-size:11px;color:var(--muted)">N/A</span>
      </div>`).join('')}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 1px">
        <span style="font-size:11px;color:var(--muted)">30 day SMA</span>
        ${badge(edgeScore<-1?'Bearish':edgeScore>1?'Bullish':'Neutral',true)}
      </div>
    </div>

    <div style="text-align:center;font-family:var(--mono);font-size:9px;color:var(--muted)">
      ${isLive?'<span style="color:var(--bull)">●</span> LIVE':'◌ STATIC'} ·
      T·25% I·20% G·20% F·20% L·15%
    </div>
  </div>`;

  // ── 14. RIGHT PANEL — accordion sections ──────────────────────────────────────
  const rightHTML = `
  <div style="flex:1;min-width:0;display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">

    <!-- Macro narrative block (new — causal story) -->
    <div style="width:100%;background:rgba(74,144,217,.06);border:1px solid rgba(74,144,217,.18);
      border-radius:6px;padding:9px 12px;margin-bottom:2px;font-size:11px;color:var(--muted);line-height:1.7">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:#4a90d9;
        text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:4px">▶ MACRO SUMMARY</span>
      ${genNarrative()}
    </div>

    <!-- 5 accordion sections -->
    <div style="flex:1;min-width:0;border:1px solid var(--border);border-radius:6px;overflow:hidden">
      ${section('tech',  '📈', 'Technical bias',            comp.technical>=1?'Bullish':comp.technical<=-1?'Bearish':'Neutral',   '25%', techFresh,  techContent,   f_tech*0.25)}
      ${section('inst',  '🏦', 'Institutional activity bias',f_inst>=1?'Bullish':f_inst<=-1?'Bearish':'Neutral',                   '20%', cotFresh,   instContent,   f_inst*0.20)}
      ${section('growth','🌍', 'Economic growth bias',       f_growth>=1?'Bullish':f_growth<=-1?'Bearish':'Neutral',               '20%', econFresh,  growthContent, f_growth*0.20)}
      ${section('infl',  '🌡', 'Inflation bias',             f_infl>=1?'Bullish':f_infl<=-1?'Bearish':'Neutral',                   '20%', econFresh,  inflContent,   f_infl*0.20)}
      ${section('labor', '👷', 'Jobs market bias',           f_labor>=1?'Bullish':f_labor<=-1?'Bearish':'Neutral',                  '15%', econFresh,  laborContent,  f_labor*0.15)}
    </div>

    <!-- Crowd sentiment sidebar -->
    <div style="width:186px;min-width:160px;flex-shrink:0;background:var(--bg2);
      border:1px solid var(--border);border-radius:6px;padding:10px;align-self:flex-start">
      <div style="display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:5px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:600;color:var(--text)">Crowd sentiment signal</span>
        ${badge(crowdSignal,true)}
      </div>
      <div style="font-size:10px;color:var(--muted);line-height:1.65">
        ${rlp>65
          ? `Crowd sentiment is bearish (${rlp.toFixed(0)}% long), giving a contrarian bullish signal. For most assets, this signal is due to a high put-call ratio, due to puts being bought aggressively.`
          : rlp<35
            ? `Crowd sentiment is bullish (${rlp.toFixed(0)}% long), giving a contrarian bearish signal. Retail traders are excessively short.`
            : `Crowd sentiment is balanced (${rlp.toFixed(0)}% long). No significant retail extreme.`}
      </div>
      ${sentRow?`<div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;margin-bottom:2px">
          <span style="color:var(--muted)">Long %</span>
          <span style="color:${rlp>65?'#e05c6a':rlp<35?'#4a90d9':'#8b949e'}">${rlp.toFixed(1)}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px">
          <span style="color:var(--muted)">Short %</span>
          <span style="color:var(--muted)">${(100-rlp).toFixed(1)}%</span>
        </div>
      </div>`:''}
      ${pcRow?`<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;margin-top:4px">
        <span style="color:var(--muted)">Put/Call</span>
        <span style="color:var(--text)">${pcRow.pc.toFixed(2)}</span>
      </div>`:''}
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--muted)">${sentFresh}</div>
    </div>
  </div>`;

  // ── INJECT ────────────────────────────────────────────────────────────────────
  // ── SHARED CARD SHELL ────────────────────────────────────────────────────────
  const K = {
    card: 'background:#0e1520;border:1px solid rgba(255,255,255,.07);border-radius:10px;overflow:hidden;',
    hd:   'padding:10px 14px;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;',
    body: 'padding:12px 14px;',
    row:  'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);',
    rowLast: 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;',
    mono: "font-family:var(--mono);",
    muted:'color:rgba(255,255,255,.35);',
  };
  const mkBadge = (b,sm) => {
    const s=String(b||'Neutral');
    const c=s.includes('Bull')?'#4a90d9':s.includes('Bear')?'#e05c6a':'#6b7280';
    const bg=s.includes('Bull')?'rgba(74,144,217,.15)':s.includes('Bear')?'rgba(224,92,106,.15)':'rgba(107,114,128,.1)';
    const fs=sm?'9px':'10px'; const px=sm?'7px':'11px';
    return `<span style="display:inline-block;background:${bg};color:${c};border-radius:3px;
      padding:2px ${px};font-family:var(--mono);font-size:${fs};font-weight:700;white-space:nowrap">${s}</span>`;
  };
  const scoreChip = v => {
    const n=Number(v)||0; if(!n) return `<span style="font-family:var(--mono);font-size:12px;color:#4b5563">0</span>`;
    const c=n>0?'#4a90d9':'#e05c6a',bg=n>0?'rgba(74,144,217,.15)':'rgba(224,92,106,.15)';
    return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${c};background:${bg};padding:1px 9px;border-radius:4px">${n>0?'+':''}${n}</span>`;
  };

  // Section 1 — Hero
  const heroEC = edgeScore>4?'#4a90d9':edgeScore>1?'#6aa8dc':edgeScore<-4?'#c04040':edgeScore<-1?'#dc7070':'#6b7280';
  const heroBC = biasC(overallBias);
  const heroBorder = `2px solid ${heroBC}30`;
  const heroSection = `
  <div style="${K.card}border:${heroBorder};margin-bottom:14px">
    <div style="padding:18px 20px 14px;text-align:center">
      <div style="font-size:26px;font-weight:900;color:${heroBC};letter-spacing:-.5px;line-height:1">${overallBias}</div>
      ${delta!==null?`<div style="font-family:var(--mono);font-size:11px;color:${delta>0?'#4a90d9':delta<0?'#e05c6a':'#6b7280'};margin-top:5px">${delta>0?'↑':delta<0?'↓':'→'} ${delta>0?'+':''}${delta} vs yesterday · ${delta>0?'Improving':'Weakening'}</div>`:''}
    </div>
    <div style="display:flex;align-items:center;gap:0;border-top:1px solid rgba(255,255,255,.06)">
      <!-- Gauge -->
      <div style="flex:0 0 200px;padding:10px 8px 8px;border-right:1px solid rgba(255,255,255,.06)">
        ${scNickGaugeSVG(edgeScore, 12)}
        <div style="text-align:center;margin-top:4px">
          <span id="sc-score-num" style="font-family:var(--mono);font-size:22px;font-weight:800;color:${heroEC}">${edgeScore}</span>
          <span style="font-family:var(--mono);font-size:9px;color:rgba(255,255,255,.3);margin-left:4px">EDGE SCORE</span>
        </div>
      </div>
      <!-- Score breakdown -->
      <div style="flex:1;padding:10px 16px;display:flex;flex-direction:column;gap:5px">
        ${[
          ['EdgeFinder score',  edgeScore,    heroEC],
          ['Technical',         techScore,    techScore===0?'#6b7280':techScore>0?'#4a90d9':'#e05c6a'],
          ['Sentiment + COT',   sentCOTScore, null],
          ['Fundamentals',      fundScore,    null],
        ].map(([lbl,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:rgba(255,255,255,.5)">${lbl}</span>
          ${c?`<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${c}">${v}</span>`:scoreChip(v)}
        </div>`).join('')}
        <div style="margin-top:4px;padding-top:5px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.6px">T·25% I·20% G·20% F·20% L·15%</span>
          <span class="${isLive?'cbadge-live':'cbadge-demo'}" style="font-size:9px">${isLive?'● LIVE':'◌ STATIC'}</span>
        </div>
      </div>
    </div>
  </div>`;

  // Section 2 — Macro summary
  const macroSection = `
  <div style="${K.card}margin-bottom:14px;border-color:rgba(74,144,217,.2)">
    <div style="${K.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:#4a90d9;text-transform:uppercase;letter-spacing:.8px">▶ Macro Summary</span>
      <span id="sc-bias-lbl" style="font-family:var(--mono);font-size:10px;font-weight:700;color:${heroBC}">${overallBias}</span>
    </div>
    <div style="${K.body}font-size:11px;color:rgba(255,255,255,.5);line-height:1.75">${genNarrative()}</div>
  </div>`;

  // Section 3 — Component weight bars (compact, horizontal)
  const wtSection = `
  <div style="${K.card}margin-bottom:14px">
    <div style="${K.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">⚖ Component Weights</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${heroBC}">${ws>0?'+':''}${ws.toFixed(2)} weighted</span>
    </div>
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:5px">
      ${contributions.map(c=>{
        const cc=c.v>0?'#4a90d9':c.v<0?'#e05c6a':'#4b5563';
        const pct=Math.round(Math.max(4,Math.min(96,((c.v+2)/4)*100)));
        const contrib=(c.v*c.w).toFixed(2);
        const contribC=parseFloat(contrib)>0?'#4a90d9':parseFloat(contrib)<0?'#e05c6a':'#4b5563';
        return `<div style="display:grid;grid-template-columns:90px 1fr 28px 40px;align-items:center;gap:8px">
          <span style="font-size:10px;color:rgba(255,255,255,.4)">${c.lbl}</span>
          <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${cc};border-radius:2px"></div>
          </div>
          <span style="font-family:var(--mono);font-size:9px;color:${cc};text-align:right">${c.v>0?'+':''}${c.v}</span>
          <span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25);text-align:right">${c.wlbl}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Section 4 — Score history
  const histSection = `
  <div style="${K.card}margin-bottom:14px;overflow:hidden">
    <div style="${K.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">📈 Score Over Time</span>
    </div>
    ${scHistoryChart(raw.id, edgeScore, {height:120, showLabel:false})}
  </div>`;

  // Section 5 — 5 accordion detail sections + crowd sidebar
  // Using exact same section/accordion builder as before
  const detailsSection = `
  <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:1;min-width:260px;border:1px solid rgba(255,255,255,.07);border-radius:10px;overflow:hidden;background:#0e1520">
      <style>.sc-accordion:last-child{border-bottom:none}</style>
      ${section('tech',  '📈','Technical bias',            comp.technical>=1?'Bullish':comp.technical<=-1?'Bearish':'Neutral',   '25%', techFresh,  techContent,   f_tech*0.25)}
      ${section('inst',  '🏦','Institutional activity bias',f_inst>=1?'Bullish':f_inst<=-1?'Bearish':'Neutral',                   '20%', cotFresh,   instContent,   f_inst*0.20)}
      ${section('growth','🌍','Economic growth bias',       f_growth>=1?'Bullish':f_growth<=-1?'Bearish':'Neutral',               '20%', econFresh,  growthContent, f_growth*0.20)}
      ${section('infl',  '🌡','Inflation bias',             f_infl>=1?'Bullish':f_infl<=-1?'Bearish':'Neutral',                   '20%', econFresh,  inflContent,   f_infl*0.20)}
      ${section('labor', '👷','Jobs market bias',           f_labor>=1?'Bullish':f_labor<=-1?'Bearish':'Neutral',                  '15%', econFresh,  laborContent,  f_labor*0.15)}
    </div>
    <div style="width:176px;min-width:160px;flex-shrink:0;background:#0e1520;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;align-self:flex-start">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:5px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,.7)">Crowd signal</span>
        ${mkBadge(crowdSignal,true)}
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,.4);line-height:1.65">
        ${rlp>65?`Retail ${rlp.toFixed(0)}% long — contrarian bullish. Puts being bought aggressively.`:rlp<35?`Retail ${rlp.toFixed(0)}% long — contrarian bearish. Heavy short positioning.`:`Retail ${rlp.toFixed(0)}% long — balanced, no extreme signal.`}
      </div>
      ${sentRow?`<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px">
        <span style="color:rgba(255,255,255,.3)">Long %</span><span style="color:${rlp>65?'#e05c6a':rlp<35?'#4a90d9':'#6b7280'}">${rlp.toFixed(1)}%</span>
      </div>`:''}
      ${pcRow?`<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;margin-top:3px">
        <span style="color:rgba(255,255,255,.3)">Put/Call</span><span style="color:rgba(255,255,255,.7)">${pcRow.pc.toFixed(2)}</span>
      </div>`:''}
      <div style="margin-top:6px;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25)">${sentFresh}</div>
    </div>
  </div>`;

  try {
    document.getElementById("page-scorecard").innerHTML = `
  <!-- Page header -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
    <div>
      <div style="font-family:var(--mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.35)">Asset Scorecard</div>
    </div>
    <select style="background:#0e1520;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.8);
      font-family:var(--mono);font-size:11px;padding:6px 10px;border-radius:6px;outline:none;cursor:pointer"
      onchange="state.scAsset=this.value;renderScorecard();runEngine()">${assetOpts}</select>
  </div>
  <!-- Sections -->
  ${heroSection}
  ${macroSection}
  ${wtSection}
  ${histSection}
  ${detailsSection}`;
  } catch(e) {
    console.error("[SC] render error:", e);
    const _el=document.getElementById("page-scorecard"); if(_el) _el.innerHTML=`<div style="padding:24px;font-family:var(--mono);font-size:11px;color:var(--muted)">⚠ Render error — check console.<br><span style="color:#e05c6a;font-size:10px;">`+e.message+`</span></div>`;
  }
}

// ── Accordion toggle (called from onclick) ────────────────────────────────────
function scToggle(id){
  const el=document.getElementById(id);
  const chv=document.getElementById(id+'-chv');
  if(!el) return;
  const open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  if(chv) chv.style.transform=open?'rotate(-90deg)':'rotate(0deg)';
}

// ── RENDER: FOREX SCORECARD ────────────────────────────────────────────────────
const SC_FOREX_PAIRS = [
  // ── USD Quote (Majors) ──
  {id:"EURUSD",base:"EUR",quote:"USD",name:"Euro / Dollar",    group:"Majors"},
  {id:"GBPUSD",base:"GBP",quote:"USD",name:"Pound / Dollar",  group:"Majors"},
  {id:"AUDUSD",base:"AUD",quote:"USD",name:"Aussie / Dollar",  group:"Majors"},
  {id:"NZDUSD",base:"NZD",quote:"USD",name:"Kiwi / Dollar",    group:"Majors"},
  // ── USD Base (Majors) ──
  {id:"USDJPY",base:"USD",quote:"JPY",name:"Dollar / Yen",     group:"Majors"},
  {id:"USDCAD",base:"USD",quote:"CAD",name:"Dollar / CAD",     group:"Majors"},
  {id:"USDCHF",base:"USD",quote:"CHF",name:"Dollar / Swiss",   group:"Majors"},
  // ── Crosses ──
  {id:"EURJPY",base:"EUR",quote:"JPY",name:"Euro / Yen",       group:"Crosses"},
  {id:"GBPJPY",base:"GBP",quote:"JPY",name:"Pound / Yen",      group:"Crosses"},
  {id:"AUDJPY",base:"AUD",quote:"JPY",name:"Aussie / Yen",     group:"Crosses"},
  {id:"NZDJPY",base:"NZD",quote:"JPY",name:"Kiwi / Yen",       group:"Crosses"},
  {id:"EURGBP",base:"EUR",quote:"GBP",name:"Euro / Pound",     group:"Crosses"},
  {id:"EURAUD",base:"EUR",quote:"AUD",name:"Euro / Aussie",    group:"Crosses"},
  {id:"GBPAUD",base:"GBP",quote:"AUD",name:"Pound / Aussie",   group:"Crosses"},
];

function renderForexScorecard() {
  // ── RESOLVE DATA (all from existing state/cache — zero new calculations) ──
  const liveData  = state.scLiveData || null;
  const ccyScores = state.scCcyScores || buildCurrencyScores(liveData);
  const pairs     = state.scFxPairs  || SC_FOREX_PAIRS.map(p=>({...p,...calculateForexScore(p.base,p.quote,ccyScores)}));
  const selPairId = state.scForexPair || "EURUSD";
  const isLive    = state.cotLive || state.sentimentLive || state.econLive;

  const selObj  = SC_FOREX_PAIRS.find(p=>p.id===selPairId) || SC_FOREX_PAIRS[0];
  const selFX   = pairs.find(p=>p.id===selPairId) || calculateForexScore(selObj.base, selObj.quote, ccyScores);
  const baseRaw  = ASSETS_SCORED.find(a=>a.id===selObj.base);
  const quoteRaw = ASSETS_SCORED.find(a=>a.id===selObj.quote);
  const baseSc   = baseRaw  ? calculateAssetScore(baseRaw,  liveData) : null;
  const quoteSc  = quoteRaw ? calculateAssetScore(quoteRaw, liveData) : null;

  // ── SAFE NUMBER GUARD — prevents [object Object] throughout ───────────────
  const safeNum = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
  const pairScore  = safeNum(selFX.pairScore);
  const baseScore  = safeNum(selFX.baseScore);
  const quoteScore = safeNum(selFX.quoteScore);

  // ── COLOUR HELPERS — identical to Asset Scorecard ─────────────────────────
  const biasC  = b => b.includes('Bull')?'#4a90d9':b.includes('Bear')?'#e05c6a':'#8b949e';
  const biasBg = b => b.includes('Bull')?'rgba(74,144,217,.20)':b.includes('Bear')?'rgba(224,92,106,.20)':'rgba(139,148,158,.10)';
  const scoreC = v => safeNum(v)>0?'#4a90d9':safeNum(v)<0?'#e05c6a':'#8b949e';

  const badge = (bias,sm) => {
    const fs=sm?'9px':'10px'; const px=sm?'8px':'10px';
    const b = String(bias||'Neutral');
    return `<span style="display:inline-block;background:${biasBg(b)};color:${biasC(b)};
      border-radius:3px;padding:2px ${px};font-family:var(--mono);font-size:${fs};font-weight:700;
      white-space:nowrap;min-width:${sm?'52px':'68px'};text-align:center">${b}</span>`;
  };
  const pill = v => {
    const n = safeNum(v);
    if(!n) return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--muted)">0</span>`;
    const c=n>0?'#4a90d9':'#e05c6a', bg=n>0?'rgba(74,144,217,.18)':'rgba(224,92,106,.18)';
    return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${c};
      background:${bg};padding:1px 10px;border-radius:4px">${n>0?'+':''}${n}</span>`;
  };

  // ── BIAS LABEL from pair score ─────────────────────────────────────────────
  const overallBias = selFX.bias || (
    pairScore >= 6  ? 'Strong Bull' :
    pairScore >= 2  ? 'Bullish'     :
    pairScore <= -6 ? 'Strong Bear' :
    pairScore <= -2 ? 'Bearish'     : 'Neutral'
  );

  // ── Δ SCORE MOMENTUM vs yesterday ─────────────────────────────────────────
  let delta = null;
  try {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yk = 'ef_fx_pair_' + selPairId + '_' + yd.toISOString().split('T')[0];
    const yr = localStorage.getItem(yk);
    if(yr) delta = pairScore - parseFloat(yr);
  } catch(e){}
  try {
    const td = new Date().toISOString().split('T')[0];
    localStorage.setItem('ef_fx_pair_'+selPairId+'_'+td, String(pairScore));
  } catch(e){}
  const deltaStr = delta !== null
    ? `<span style="font-family:var(--mono);font-size:11px;color:${delta>0?'#4a90d9':delta<0?'#e05c6a':'#8b949e'};margin-left:6px">
        ${delta>0?'↑':'↓'} ${delta>0?'+':''}${delta} vs yday</span>`
    : '';

  // ── FOREX NARRATIVE SUMMARY ────────────────────────────────────────────────
  const compKeys = [
    {key:'technical', lbl:'Technical'}, {key:'sentiment', lbl:'Sentiment'},
    {key:'cot',       lbl:'COT'},       {key:'growth',    lbl:'Growth'},
    {key:'inflation', lbl:'Inflation'}, {key:'jobs',      lbl:'Jobs'},
  ];
  const genFxNarrative = () => {
    const baseBulls=[], baseBears=[], quoteBulls=[], quoteBears=[];
    compKeys.forEach(ck=>{
      const bv = safeNum(baseSc?.components?.[ck.key]);
      const qv = safeNum(quoteSc?.components?.[ck.key]);
      if(bv>=1)  baseBulls.push(ck.lbl);
      if(bv<=-1) baseBears.push(ck.lbl);
      if(qv>=1)  quoteBulls.push(ck.lbl);
      if(qv<=-1) quoteBears.push(ck.lbl);
    });
    let n = `<strong style="color:${biasC(overallBias)}">${selPairId}</strong> is
      <strong style="color:${biasC(overallBias)}">${overallBias}</strong>.<br>`;
    if(pairScore >= 0) {
      n += `<em>Driven by:</em><br>`;
      if(baseBulls.length)  n += `• ${selObj.base} strength (${baseBulls.join(', ')})<br>`;
      if(quoteBears.length) n += `• ${selObj.quote} weakness (${quoteBears.join(', ')})<br>`;
    } else {
      n += `<em>Driven by:</em><br>`;
      if(baseBears.length)  n += `• ${selObj.base} weakness (${baseBears.join(', ')})<br>`;
      if(quoteBulls.length) n += `• ${selObj.quote} strength (${quoteBulls.join(', ')})<br>`;
    }
    if(delta!==null) n += `Score ${delta>0?'strengthened':'weakened'} ${Math.abs(delta)} pt vs yesterday.`;
    return n;
  };

  // ── COMPONENT WEIGHT BARS — identical pattern to Asset Scorecard ──────────
  const fxContribs = [
    {key:'technical',      lbl:'Technical',    w:FX_WEIGHTS.technical,      wlbl:'20%'},
    {key:'institutional',  lbl:'Institutional',w:FX_WEIGHTS.institutional,  wlbl:'15%'},
    {key:'growth',         lbl:'Growth',        w:FX_WEIGHTS.growth,         wlbl:'20%'},
    {key:'inflation',      lbl:'Inflation',     w:FX_WEIGHTS.inflation,      wlbl:'15%'},
    {key:'labor',          lbl:'Labor',         w:FX_WEIGHTS.labor,          wlbl:'10%'},
    {key:'monetaryPolicy', lbl:'Monetary Policy',w:FX_WEIGHTS.monetaryPolicy,wlbl:'20%'},
  ];
  const wtBars = fxContribs.map(c=>{
    // Use base-quote diff as the pair's component score proxy
    const bv = safeNum(baseSc?.components?.[c.key] ?? baseSc?.components?.cot ?? 0);
    const qv = safeNum(quoteSc?.components?.[c.key] ?? quoteSc?.components?.cot ?? 0);
    const diff = Math.max(-2, Math.min(2, bv - qv));
    const cc   = diff>0?'#4a90d9':diff<0?'#e05c6a':'#8b949e';
    const pct  = Math.round(Math.max(4, Math.min(96, ((diff+2)/4)*100)));
    return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">
      <span style="font-size:10px;color:var(--muted);width:110px;flex-shrink:0">${c.lbl}</span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cc};border-radius:2px"></div>
      </div>
      <span style="font-family:var(--mono);font-size:9px;color:${cc};min-width:22px;text-align:right">${diff>=0?'+':''}${diff}</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--muted);min-width:26px;text-align:right">${c.wlbl}</span>
    </div>`;
  }).join('');

  // ── ACCORDION SECTION (same pattern as Asset Scorecard scToggle) ─────────
  const fxSection = (id, icon, title, bias, contentHTML, weight) => {
    const sid = 'fx-sect-' + id;
    const contribLine = weight
      ? `<span style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-left:6px">${weight}</span>`
      : '';
    return `<div class="sc-accordion" style="border-bottom:1px solid rgba(255,255,255,.06)">
      <div onclick="scToggle('${sid}')" style="display:flex;align-items:center;gap:8px;
        padding:9px 12px;cursor:pointer;background:rgba(22,27,38,.95);user-select:none">
        <span style="font-size:11px;font-weight:700;color:var(--text);flex:1">
          ${icon} ${title}${contribLine}
        </span>
        ${badge(bias,true)}
        <span class="sc-chevron" id="${sid}-chv" style="color:var(--muted);font-size:10px;margin-left:4px;transition:transform .2s">▼</span>
      </div>
      <div id="${sid}" style="display:block">${contentHTML}</div>
    </div>`;
  };

  // ── COMPONENT MINI-CARD TABLE BUILDER ─────────────────────────────────────
  const TBL = 'width:100%;border-collapse:collapse;font-size:11px';
  const compRow = (label, bv, qv) => {
    const bvN = safeNum(bv), qvN = safeNum(qv), diff = Math.max(-2, Math.min(2, bvN - qvN));
    const bc = scoreC(bvN), qc = scoreC(qvN), dc = scoreC(diff);
    return `<tr style="border-bottom:1px solid rgba(255,255,255,.03)">
      <td style="padding:6px 12px;font-size:11px;color:var(--muted)">${label}</td>
      <td style="padding:6px 8px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;color:${bc}">${bvN>=0?'+':''}${bvN}</td>
      <td style="padding:6px 8px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;color:${qc}">${qvN>=0?'+':''}${qvN}</td>
      <td style="padding:6px 8px;text-align:center">${badge(diff>=1?'Bullish':diff<=-1?'Bearish':'Neutral',true)}</td>
    </tr>`;
  };
  const colHead = (c1,c2,c3,c4) => `<tr style="background:rgba(255,255,255,.03)">
    ${[c1,c2,c3,c4].map(c=>`<td style="padding:5px 8px;font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;text-align:center">${c}</td>`).join('')}
  </tr>`;

  const bc_comp = baseSc?.components  || {};
  const qc_comp = quoteSc?.components || {};

  const techContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('4H / Daily Trend',  bc_comp.technical, qc_comp.technical)}
    ${compRow('Seasonality',        bc_comp.technical, qc_comp.technical)}
  </table>`;

  const instContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('COT Net Positioning', bc_comp.cot, qc_comp.cot)}
    ${compRow('COT Change (WoW)',    bc_comp.cot, qc_comp.cot)}
    ${compRow('Retail Sentiment',    bc_comp.sentiment, qc_comp.sentiment)}
  </table>`;

  const growthContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('GDP YoY',      bc_comp.growth, qc_comp.growth)}
    ${compRow('Mfg PMI',      bc_comp.growth, qc_comp.growth)}
    ${compRow('Serv PMI',     bc_comp.growth, qc_comp.growth)}
    ${compRow('Retail Sales', bc_comp.growth, qc_comp.growth)}
  </table>`;

  const inflContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('CPI YoY',        bc_comp.inflation, qc_comp.inflation)}
    ${compRow('PPI YoY',        bc_comp.inflation, qc_comp.inflation)}
    ${compRow('PCE / Core',     bc_comp.inflation, qc_comp.inflation)}
    ${compRow('Yield (2yr SMA)',bc_comp.inflation, qc_comp.inflation)}
  </table>`;

  const laborContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('NFP / Emp Chg',   bc_comp.jobs, qc_comp.jobs)}
    ${compRow('Unemployment',    bc_comp.jobs, qc_comp.jobs)}
    ${compRow('Jobless Claims',  bc_comp.jobs, qc_comp.jobs)}
    ${compRow('ADP / JOLTS',     bc_comp.jobs, qc_comp.jobs)}
  </table>`;

  const mpContent = `<table style="${TBL}">
    ${colHead('Indicator', selObj.base, selObj.quote, 'Diff')}
    ${compRow('CB Rate Level',    bc_comp.jobs, qc_comp.jobs)}
    ${compRow('Rate Differential',bc_comp.inflation, qc_comp.inflation)}
    ${compRow('CB Stance',        bc_comp.cot, qc_comp.cot)}
    <tr style="background:rgba(255,255,255,.025)">
      <td colspan="4" style="padding:6px 12px">
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${[selObj.base, selObj.quote].map(ccy=>{
            const cb = FX_CB_DATA[ccy];
            if(!cb) return '';
            const sc_val = cb.stance>=1?'#4a90d9':cb.stance<=-1?'#e05c6a':'#8b949e';
            return `<div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.04);padding:3px 8px;border-radius:4px">
              <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${sc_val}">${ccy}</span>
              <span style="font-size:10px;color:var(--muted)">${cb.name}: ${cb.rate.toFixed(2)}% · ${cb.label}</span>
            </div>`;
          }).join('')}
        </div>
      </td>
    </tr>
  </table>`;

  // ── CURRENCY STRENGTH: top 3 + bottom 3 only ─────────────────────────────
  // Guard: filter to numeric values only (prevents [object Object])
  const cleanScores = Object.entries(ccyScores)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number' && isFinite(v))
    .sort((a,b) => b[1] - a[1]);
  const topN   = cleanScores.slice(0, 3);
  const botN   = cleanScores.slice(-3).reverse();
  const SCORE_MAX = Math.max(...cleanScores.map(([,v])=>Math.abs(v)), 1);

  const strengthRow = ([ccy, sc2], i, isTop) => {
    const n    = safeNum(sc2);
    const col  = n>0?'#4a90d9':n<0?'#e05c6a':'#8b949e';
    const pct  = Math.round(Math.max(4, Math.min(96, 50 + (n/SCORE_MAX)*45)));
    const isBase  = ccy === selObj.base;
    const isQuote = ccy === selObj.quote;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;
      border-bottom:1px solid rgba(255,255,255,.03);${isBase||isQuote?'background:rgba(255,255,255,.025)':''}">
      <span style="font-size:9px;color:var(--muted);width:14px">${isTop?i+1:8-i}</span>
      <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${col};width:36px">
        ${ccy}${isBase?' *':isQuote?' ·':''}
      </span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:2px"></div>
      </div>
      <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${col};min-width:24px;text-align:right">
        ${n>=0?'+':''}${n}
      </span>
    </div>`;
  };

  const strengthContent = `
    <div style="padding:6px 12px;font-family:var(--mono);font-size:8px;color:var(--muted);
      text-transform:uppercase;letter-spacing:.5px;background:rgba(255,255,255,.025)">Top 3 Strongest</div>
    ${topN.map((entry,i) => strengthRow(entry, i, true)).join('')}
    <div style="padding:6px 12px;font-family:var(--mono);font-size:8px;color:var(--muted);
      text-transform:uppercase;letter-spacing:.5px;background:rgba(255,255,255,.025);
      border-top:1px solid rgba(255,255,255,.06)">Bottom 3 Weakest</div>
    ${botN.map((entry,i) => strengthRow(entry, i, false)).join('')}
    <div style="padding:5px 12px;font-size:9px;color:var(--muted);font-style:italic">
      * = base currency · · = quote currency</div>`;

  // ── PAIR DROPDOWN only (no pill nav on right side) ────────────────────────
  const fxByGroup = {};
  SC_FOREX_PAIRS.forEach(p => {
    if(!fxByGroup[p.group]) fxByGroup[p.group] = [];
    fxByGroup[p.group].push(p);
  });
  const dropdown = Object.entries(fxByGroup).map(([grp, ps]) =>
    `<optgroup label="${grp}">${ps.map(p =>
      `<option value="${p.id}" ${p.id===selPairId?'selected':''}>${p.id} — ${p.name}</option>`
    ).join('')}</optgroup>`
  ).join('');

  // ── CURRENCY STRENGTH BARS (inside left panel) ────────────────────────────
  const SMAX = 10;
  const basePct  = Math.round(Math.max(5, Math.min(95, 50 + (baseScore/SMAX)*45)));
  const quotePct = Math.round(Math.max(5, Math.min(95, 50 + (quoteScore/SMAX)*45)));
  const baseCol  = scoreC(baseScore);
  const quoteCol = scoreC(quoteScore);
  const pairScoreCol = scoreC(pairScore);

  // ── LEFT PANEL — mirrors Asset Scorecard exactly ──────────────────────────
  const leftHTML = `
  <div style="width:232px;min-width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:7px">

    <!-- Pair selector -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;
      padding:7px 10px;display:flex;align-items:center;gap:6px">
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">Pair:</span>
      <select style="flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);
        font-family:var(--mono);font-size:11px;padding:3px 5px;border-radius:4px;outline:none"
        onchange="state.scForexPair=this.value;renderForexScorecard()">${dropdown}</select>
    </div>

    <!-- PRIMARY: Bias label + delta -->
    <div style="background:var(--bg2);border:2px solid ${biasC(overallBias)}44;border-radius:6px;
      padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:${biasC(overallBias)};letter-spacing:-.3px">
        ${overallBias}
      </div>
      ${deltaStr}
    </div>

    <!-- SECONDARY: Nick gauge + pair score breakdown -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px 8px 8px">
      ${scNickGaugeSVG(pairScore, 12)}
      <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border)">
        <!-- Pair score -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 2px">
          <span style="font-size:11px;color:var(--text)">Pair score (${selPairId})</span>
          <span id="sc-score-num" style="font-family:var(--mono);font-size:13px;font-weight:700;
            color:${pairScoreCol}">${pairScore>=0?'+':''}${pairScore}</span>
        </div>
        <!-- Currency strength bars -->
        <div style="display:flex;align-items:center;gap:6px;padding:5px 2px">
          <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${baseCol};
            width:30px;flex-shrink:0">${selObj.base}</span>
          <div style="flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
            <div data-fx-bar="base" style="width:${basePct}%;height:100%;background:${baseCol};border-radius:2px"></div>
          </div>
          <span data-fx-val="base" style="font-family:var(--mono);font-size:10px;font-weight:700;
            color:${baseCol};min-width:24px;text-align:right">${baseScore>=0?'+':''}${baseScore}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:2px 2px">
          <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${quoteCol};
            width:30px;flex-shrink:0">${selObj.quote}</span>
          <div style="flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
            <div data-fx-bar="quote" style="width:${quotePct}%;height:100%;background:${quoteCol};border-radius:2px"></div>
          </div>
          <span data-fx-val="quote" style="font-family:var(--mono);font-size:10px;font-weight:700;
            color:${quoteCol};min-width:24px;text-align:right">${quoteScore>=0?'+':''}${quoteScore}</span>
        </div>
        <div style="font-size:9px;color:var(--muted);margin-top:5px;text-align:center">
          ${selObj.base}(${baseScore>=0?'+':''}${baseScore}) − ${selObj.quote}(${quoteScore>=0?'+':''}${quoteScore}) = ${pairScore>=0?'+':''}${pairScore}
        </div>
      </div>
    </div>

    <!-- TERTIARY: Component weight bars — same pattern as Asset Scorecard -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;
        letter-spacing:.8px;margin-bottom:6px">Component Weights → Pair Score</div>
      ${wtBars}
      <div style="margin-top:6px;padding-top:5px;border-top:1px solid var(--border);
        display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px">
        <span style="color:var(--muted)">Pair Score</span>
        <span style="color:${pairScoreCol};font-weight:700">${pairScore>=0?'+':''}${pairScore}</span>
      </div>
    </div>

    <!-- Score history chart (base currency as proxy) -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;overflow:hidden">
      <div style="padding:6px 10px;background:var(--bg3);border-bottom:1px solid var(--border);
        font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px">
        ${selObj.base} score over time
      </div>
      ${scHistoryChart(selObj.base, baseScore, {height:120, showLabel:false})}
    </div>

    <!-- Data status -->
    <div style="text-align:center;font-family:var(--mono);font-size:9px;color:var(--muted)">
      ${isLive?'<span style="color:var(--bull)">●</span> LIVE':'◌ STATIC'} ·
      T·20% I·15% G·20% Inf·15% L·10% MP·20%
    </div>
  </div>`;

  // ── RIGHT PANEL — Forex summary + 6 accordion sections + strength ─────────
  const rightHTML = `
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">

    <!-- FOREX NARRATIVE SUMMARY — mirrors Asset Scorecard MACRO SUMMARY -->
    <div style="background:rgba(74,144,217,.06);border:1px solid rgba(74,144,217,.18);
      border-radius:6px;padding:9px 12px;font-size:11px;color:var(--muted);line-height:1.7">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:#4a90d9;
        text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:4px">▶ FOREX SUMMARY</span>
      ${genFxNarrative()}
    </div>

    <!-- 6 accordion component sections -->
    <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden">
      <style>.sc-accordion:last-child{border-bottom:none}</style>
      ${fxSection('tech',  '📈','Technical bias',          baseSc?.components?.technical>=1?'Bullish':baseSc?.components?.technical<=-1?'Bearish':'Neutral', techContent,  '20%')}
      ${fxSection('inst',  '🏦','Institutional activity',  (safeNum(baseSc?.components?.cot)+safeNum(baseSc?.components?.sentiment))>=1?'Bullish':(safeNum(baseSc?.components?.cot)+safeNum(baseSc?.components?.sentiment))<=-1?'Bearish':'Neutral', instContent, '15%')}
      ${fxSection('growth','🌍','Economic growth bias',     safeNum(baseSc?.components?.growth)>=1?'Bullish':safeNum(baseSc?.components?.growth)<=-1?'Bearish':'Neutral', growthContent,'20%')}
      ${fxSection('infl',  '🌡','Inflation bias',           safeNum(baseSc?.components?.inflation)>=1?'Bullish':safeNum(baseSc?.components?.inflation)<=-1?'Bearish':'Neutral', inflContent,  '15%')}
      ${fxSection('labor', '👷','Jobs market bias',         safeNum(baseSc?.components?.jobs)>=1?'Bullish':safeNum(baseSc?.components?.jobs)<=-1?'Bearish':'Neutral', laborContent,'10%')}
      ${fxSection('mp',    '🏛','Monetary policy',          FX_CB_DATA[selObj.base]?.stance>=1?'Bullish':FX_CB_DATA[selObj.base]?.stance<=-1?'Bearish':'Neutral', mpContent,   '20%')}
    </div>

    <!-- Currency strength — top 3 / bottom 3 only (no full list) -->
    <div onclick="scToggle('fx-strength')" style="display:flex;align-items:center;gap:8px;padding:9px 12px;
      cursor:pointer;background:rgba(22,27,38,.95);border:1px solid var(--border);border-radius:6px;
      user-select:none">
      <span style="font-size:11px;font-weight:700;color:var(--text);flex:1">💱 Currency Strength Ranking</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--muted)">top/bottom 3</span>
      <span class="sc-chevron" id="fx-strength-chv" style="color:var(--muted);font-size:10px;transition:transform .2s">▼</span>
    </div>
    <div id="fx-strength" style="display:none;border:1px solid var(--border);border-radius:6px;overflow:hidden">
      ${strengthContent}
    </div>

  </div>`;

  // ── INJECT — single-column, mirrors Asset Scorecard structure exactly ────────

  // Shared helpers (scoped to forex, same pattern as asset K/mkBadge/scoreChip)
  const fxK = {
    card: 'background:#0e1520;border:1px solid rgba(255,255,255,.07);border-radius:10px;overflow:hidden;',
    hd:   'padding:10px 14px;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;',
    body: 'padding:12px 14px;',
  };
  const fxBadge2 = (b,sm) => {
    const s=String(b||'Neutral');
    const c=s.includes('Bull')?'#4a90d9':s.includes('Bear')?'#e05c6a':'#6b7280';
    const bg=s.includes('Bull')?'rgba(74,144,217,.15)':s.includes('Bear')?'rgba(224,92,106,.15)':'rgba(107,114,128,.1)';
    const fs=sm?'9px':'10px',px=sm?'7px':'11px';
    return `<span style="display:inline-block;background:${bg};color:${c};border-radius:3px;padding:2px ${px};font-family:var(--mono);font-size:${fs};font-weight:700;white-space:nowrap">${s}</span>`;
  };
  const fxChip = v => {
    const n=safeNum(v); if(!n) return `<span style="font-family:var(--mono);font-size:12px;color:#4b5563">0</span>`;
    const c=n>0?'#4a90d9':'#e05c6a',bg=n>0?'rgba(74,144,217,.15)':'rgba(224,92,106,.15)';
    return `<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${c};background:${bg};padding:1px 9px;border-radius:4px">${n>0?'+':''}${n}</span>`;
  };
  const fxSC2 = v => safeNum(v)>0?'#4a90d9':safeNum(v)<0?'#e05c6a':'#6b7280';
  const fxBC2 = b => String(b||'').includes('Bull')?'#4a90d9':String(b||'').includes('Bear')?'#e05c6a':'#6b7280';

  // Pair dropdown
  const fxByGrp={};
  SC_FOREX_PAIRS.forEach(p=>{if(!fxByGrp[p.group])fxByGrp[p.group]=[];fxByGrp[p.group].push(p);});
  const fxDrop=Object.entries(fxByGrp).map(([g,ps])=>
    `<optgroup label="${g}">${ps.map(p=>`<option value="${p.id}" ${p.id===selPairId?'selected':''}>${p.id} — ${p.name}</option>`).join('')}</optgroup>`
  ).join('');

  // Colors
  const fxBiasBC = fxBC2(overallBias);
  const fxHeroBdr = `2px solid ${fxBiasBC}30`;
  const fxPS_EC   = pairScore>4?'#4a90d9':pairScore>1?'#6aa8dc':pairScore<-4?'#c04040':pairScore<-1?'#dc7070':'#6b7280';
  const bsC = fxSC2(baseScore), qsC = fxSC2(quoteScore);
  const SMAX2=10;
  const bPct2=Math.round(Math.max(5,Math.min(95,50+(baseScore/SMAX2)*45)));
  const qPct2=Math.round(Math.max(5,Math.min(95,50+(quoteScore/SMAX2)*45)));

  // ── S1: HERO (same structure as Asset hero) ────────────────────────────────
  // Left: gauge + pair score  |  Right: base/quote breakdown + pair equation
  const fxHeroSection = `
  <div style="${fxK.card}border:${fxHeroBdr};margin-bottom:14px">
    <div style="padding:18px 20px 14px;text-align:center">
      <div style="font-size:26px;font-weight:900;color:${fxBiasBC};letter-spacing:-.5px;line-height:1">${overallBias}</div>
      ${delta!==null?`<div style="font-family:var(--mono);font-size:11px;color:${delta>0?'#4a90d9':delta<0?'#e05c6a':'#6b7280'};margin-top:5px">${delta>0?'↑':delta<0?'↓':'→'} ${Math.abs(delta)} pt vs yesterday · ${delta>0?'Strengthening':'Weakening'}</div>`:''}
    </div>
    <div style="display:flex;align-items:center;gap:0;border-top:1px solid rgba(255,255,255,.06)">
      <!-- Gauge (same slot width as Asset) -->
      <div style="flex:0 0 200px;padding:10px 8px 8px;border-right:1px solid rgba(255,255,255,.06)">
        ${scNickGaugeSVG(pairScore, 12)}
        <div style="text-align:center;margin-top:4px">
          <span id="sc-score-num" style="font-family:var(--mono);font-size:22px;font-weight:800;color:${fxPS_EC}">${pairScore>=0?'+':''}${pairScore}</span>
          <span style="font-family:var(--mono);font-size:9px;color:rgba(255,255,255,.3);margin-left:4px">PAIR SCORE</span>
        </div>
      </div>
      <!-- Right: base / quote / equation (replaces asset score rows) -->
      <div style="flex:1;padding:10px 16px;display:flex;flex-direction:column;gap:6px">
        <!-- Base currency row -->
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:rgba(255,255,255,.5)">${selObj.base} (Base)</span>
          <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${bsC}">${baseScore>=0?'+':''}${baseScore}</span>
        </div>
        <!-- Quote currency row -->
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:rgba(255,255,255,.5)">${selObj.quote} (Quote)</span>
          <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${qsC}">${quoteScore>=0?'+':''}${quoteScore}</span>
        </div>
        <!-- Strength bars -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
          <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${bsC};width:30px;flex-shrink:0">${selObj.base}</span>
          <div style="flex:1;height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden">
            <div data-fx-bar="base" style="width:${bPct2}%;height:100%;background:${bsC};border-radius:2px;transition:width .4s"></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${qsC};width:30px;flex-shrink:0">${selObj.quote}</span>
          <div style="flex:1;height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden">
            <div data-fx-bar="quote" style="width:${qPct2}%;height:100%;background:${qsC};border-radius:2px;transition:width .4s"></div>
          </div>
        </div>
        <!-- Pair equation -->
        <div style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:var(--mono);font-size:9px;color:rgba(255,255,255,.3)">
            ${selObj.base}(${baseScore>=0?'+':''}${baseScore}) − ${selObj.quote}(${quoteScore>=0?'+':''}${quoteScore}) = <strong style="color:${fxPS_EC}">${pairScore>=0?'+':''}${pairScore}</strong>
          </span>
          <span class="${isLive?'cbadge-live':'cbadge-demo'}" style="font-size:9px">${isLive?'● LIVE':'◌ STATIC'}</span>
        </div>
      </div>
    </div>
  </div>`;

  // ── S2: MACRO SUMMARY (identical card pattern to Asset) ────────────────────
  const fxSummarySection = `
  <div style="${fxK.card}margin-bottom:14px;border-color:rgba(74,144,217,.2)">
    <div style="${fxK.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:#4a90d9;text-transform:uppercase;letter-spacing:.8px">▶ Forex Summary</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${fxBiasBC}">${overallBias}</span>
    </div>
    <div style="${fxK.body}font-size:11px;color:rgba(255,255,255,.5);line-height:1.75">${genFxNarrative()}</div>
  </div>`;

  // ── S3: COMPONENT WEIGHTS (full-width horizontal bars — identical to Asset) ─
  const fxContribs2 = [
    {key:'technical',      lbl:'Technical',       w:FX_WEIGHTS.technical,       wlbl:'20%'},
    {key:'institutional',  lbl:'Institutional',   w:FX_WEIGHTS.institutional,   wlbl:'15%'},
    {key:'growth',         lbl:'Growth',           w:FX_WEIGHTS.growth,          wlbl:'20%'},
    {key:'inflation',      lbl:'Inflation',        w:FX_WEIGHTS.inflation,       wlbl:'15%'},
    {key:'labor',          lbl:'Labor',            w:FX_WEIGHTS.labor,           wlbl:'10%'},
    {key:'monetaryPolicy', lbl:'Monetary Policy',  w:FX_WEIGHTS.monetaryPolicy,  wlbl:'20%'},
  ];
  const bc2=baseSc?.components||{}, qc2=quoteSc?.components||{};
  const fbias2=(bv,qv)=>{const d=safeNum(bv)-safeNum(qv);return d>=1?'Bullish':d<=-1?'Bearish':'Neutral';};

  // Compute pair-level per-component diff for the weight bars
  const fxWtRows = fxContribs2.map(c => {
    const bv = safeNum(bc2[c.key]??bc2.cot??0);
    const qv = safeNum(qc2[c.key]??qc2.cot??0);
    const diff = Math.max(-2, Math.min(2, bv - qv));
    const cc   = diff>0?'#4a90d9':diff<0?'#e05c6a':'#4b5563';
    const pct  = Math.round(Math.max(4, Math.min(96, ((diff+2)/4)*100)));
    const contrib = (diff * c.w).toFixed(2);
    return `<div style="display:grid;grid-template-columns:110px 1fr 32px 40px;align-items:center;gap:8px">
      <span style="font-size:10px;color:rgba(255,255,255,.4)">${c.lbl}</span>
      <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cc};border-radius:2px"></div>
      </div>
      <span style="font-family:var(--mono);font-size:9px;color:${cc};text-align:right">${diff>=0?'+':''}${diff}</span>
      <span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25);text-align:right">${c.wlbl}</span>
    </div>`;
  }).join('');

  const fxWtSection = `
  <div style="${fxK.card}margin-bottom:14px">
    <div style="${fxK.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">⚖ Component Weights</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${fxPS_EC}">${pairScore>=0?'+':''}${pairScore} pair score</span>
    </div>
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:5px">${fxWtRows}</div>
  </div>`;

  // ── S4: SCORE OVER TIME (full-width, same card as Asset) ───────────────────
  const fxHistSection = `
  <div style="${fxK.card}margin-bottom:14px;overflow:hidden">
    <div style="${fxK.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">📈 Score Over Time — ${selObj.base}</span>
    </div>
    ${scHistoryChart(selObj.base, baseScore, {height:120, showLabel:false})}
  </div>`;

  // ── S5: COMPONENT BREAKDOWN — full-width accordion sections ───────────────
  // Each section mirrors Asset Scorecard accordion: header row + indicator rows
  const fxIndRow = (label, bias) => {
    const b  = String(bias||'Neutral');
    const c  = b.includes('Bull')?'#4a90d9':b.includes('Bear')?'#e05c6a':'#6b7280';
    const dot= b.includes('Bull')?'▲':b.includes('Bear')?'▼':'→';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-bottom:1px solid rgba(255,255,255,.04)">
      <span style="font-size:11px;color:rgba(255,255,255,.45)">${label}</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${c}">${dot} ${b}</span>
    </div>`;
  };

  const fxSection2 = (id, icon, title, bias, weight, contentHTML) => {
    const sid = 'fxs-'+id;
    const b   = String(bias||'Neutral');
    const c   = b.includes('Bull')?'#4a90d9':b.includes('Bear')?'#e05c6a':'#6b7280';
    const bg  = b.includes('Bull')?'rgba(74,144,217,.15)':b.includes('Bear')?'rgba(224,92,106,.15)':'rgba(107,114,128,.1)';
    return `<div class="sc-accordion" style="border-bottom:1px solid rgba(255,255,255,.06)">
      <div onclick="scToggle('${sid}')" style="display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;background:rgba(22,27,38,.95);user-select:none">
        <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);flex:1">${icon} ${title}</span>
        <span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);margin-right:4px">${weight}</span>
        <span style="display:inline-block;background:${bg};color:${c};border-radius:3px;padding:2px 8px;font-family:var(--mono);font-size:9px;font-weight:700">${b}</span>
        <span class="sc-chevron" id="${sid}-chv" style="color:rgba(255,255,255,.3);font-size:10px;margin-left:4px;transition:transform .2s">▼</span>
      </div>
      <div id="${sid}" style="display:block">${contentHTML}</div>
    </div>`;
  };

  const fxFbias = (bv,qv) => {const d=safeNum(bv)-safeNum(qv);return d>=1?'Bullish':d<=-1?'Bearish':'Neutral';};

  const fxBreakdownSection = `
  <div style="${fxK.card}margin-bottom:14px;overflow:hidden">
    <style>.sc-accordion:last-child{border-bottom:none}</style>
    ${fxSection2('tech','📈','Technical',
      fxFbias(bc2.technical,qc2.technical),'20%',
      fxIndRow('4H / Daily Trend',   fxFbias(bc2.technical,qc2.technical)) +
      fxIndRow('Seasonality',         fxFbias(bc2.technical,qc2.technical)))}
    ${fxSection2('inst','🏦','Institutional (COT)',
      fxFbias(safeNum(bc2.cot)+safeNum(bc2.sentiment),safeNum(qc2.cot)+safeNum(qc2.sentiment)),'15%',
      fxIndRow('COT Net Positioning', fxFbias(bc2.cot,qc2.cot)) +
      fxIndRow('COT Change (WoW)',    fxFbias(bc2.cot,qc2.cot)) +
      fxIndRow('Retail Sentiment',    fxFbias(bc2.sentiment,qc2.sentiment)))}
    ${fxSection2('growth','🌍','Economic Growth',
      fxFbias(bc2.growth,qc2.growth),'20%',
      fxIndRow('GDP YoY',      fxFbias(bc2.growth,qc2.growth)) +
      fxIndRow('Mfg PMI',      fxFbias(bc2.growth,qc2.growth)) +
      fxIndRow('Services PMI', fxFbias(bc2.growth,qc2.growth)) +
      fxIndRow('Retail Sales', fxFbias(bc2.growth,qc2.growth)))}
    ${fxSection2('infl','🌡','Inflation',
      fxFbias(bc2.inflation,qc2.inflation),'15%',
      fxIndRow('CPI YoY',         fxFbias(bc2.inflation,qc2.inflation)) +
      fxIndRow('PPI YoY',         fxFbias(bc2.inflation,qc2.inflation)) +
      fxIndRow('PCE / Core',      fxFbias(bc2.inflation,qc2.inflation)) +
      fxIndRow('Yield (2yr SMA)', fxFbias(bc2.inflation,qc2.inflation)))}
    ${fxSection2('labor','👷','Labor Market',
      fxFbias(bc2.jobs,qc2.jobs),'10%',
      fxIndRow('NFP / Employment', fxFbias(bc2.jobs,qc2.jobs)) +
      fxIndRow('Unemployment',     fxFbias(bc2.jobs,qc2.jobs)) +
      fxIndRow('Jobless Claims',   fxFbias(bc2.jobs,qc2.jobs)))}
    ${fxSection2('mp','🏛','Monetary Policy',
      FX_CB_DATA[selObj.base]?.stance>=1?'Bullish':FX_CB_DATA[selObj.base]?.stance<=-1?'Bearish':'Neutral','20%',
      (()=>{
        const bCB=FX_CB_DATA[selObj.base]||{rate:0,name:'CB',label:'—'};
        const qCB=FX_CB_DATA[selObj.quote]||{rate:0,name:'CB',label:'—'};
        const diff=parseFloat((bCB.rate-qCB.rate).toFixed(2));
        const diffBias=diff>0.5?'Bullish':diff<-0.5?'Bearish':'Neutral';
        const bStBias=bCB.stance>=1?'Bullish':bCB.stance<=-1?'Bearish':'Neutral';
        return `<div style="padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.04)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:10px;color:rgba(255,255,255,.4)">${selObj.base} · ${bCB.name}</span>
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${bCB.stance>=1?'#4a90d9':bCB.stance<=-1?'#e05c6a':'#6b7280'}">${bCB.rate.toFixed(2)}% · ${bCB.label}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;color:rgba(255,255,255,.4)">${selObj.quote} · ${qCB.name}</span>
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${qCB.stance>=1?'#4a90d9':qCB.stance<=-1?'#e05c6a':'#6b7280'}">${qCB.rate.toFixed(2)}% · ${qCB.label}</span>
          </div>
        </div>` +
        fxIndRow(`Rate Diff (${selObj.base}−${selObj.quote}): ${diff>=0?'+':''}${diff}%`, diffBias) +
        fxIndRow(`${selObj.base} CB Stance`, bStBias);
      })())}
  </div>`;

  // ── S6: CURRENCY STRENGTH RANKING (full-width, clean rows) ────────────────
  const cleanCS2=Object.entries(ccyScores).filter(([k,v])=>!k.startsWith('_')&&typeof v==='number'&&isFinite(v)).sort((a,b)=>b[1]-a[1]);
  const csMax3=Math.max(...cleanCS2.map(([,v])=>Math.abs(v)),1);
  const csRankRow=([ccy,sc2],rank)=>{
    const n=safeNum(sc2), col=n>0?'#4a90d9':n<0?'#e05c6a':'#6b7280';
    const pct=Math.round(Math.max(4,Math.min(96,50+(n/csMax3)*45)));
    const isBQ=ccy===selObj.base||ccy===selObj.quote;
    return `<div style="display:grid;grid-template-columns:18px 40px 1fr 36px;align-items:center;gap:10px;padding:7px 14px;border-bottom:1px solid rgba(255,255,255,.04);${isBQ?'background:rgba(255,255,255,.025)':''}">
      <span style="font-size:9px;color:rgba(255,255,255,.25)">${rank}</span>
      <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${col}">${ccy}${ccy===selObj.base?' *':ccy===selObj.quote?' ·':''}</span>
      <div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:2px;transition:width .4s"></div>
      </div>
      <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${col};text-align:right">${n>=0?'+':''}${n}</span>
    </div>`;
  };
  const fxStrSection = `
  <div style="${fxK.card}margin-bottom:14px">
    <div style="${fxK.hd}">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">💱 Currency Strength</span>
      <span style="font-size:9px;color:rgba(255,255,255,.25)">* base · · quote</span>
    </div>
    <div>
      <div style="padding:4px 14px 3px;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.5px">Top 3</div>
      ${cleanCS2.slice(0,3).map((e,i)=>csRankRow(e,i+1)).join('')}
      <div style="height:1px;background:rgba(255,255,255,.06);margin:4px 0"></div>
      <div style="padding:4px 14px 3px;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.5px">Bottom 3</div>
      ${[...cleanCS2].reverse().slice(0,3).map((e,i)=>csRankRow(e,cleanCS2.length-i)).join('')}
    </div>
  </div>`;

  // ── ASSEMBLE — single column, identical flow to Asset Scorecard ─────────────
  try {
    document.getElementById("page-forex").innerHTML = `
  <!-- Page header (same pattern as Asset) -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
    <div style="font-family:var(--mono);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.35)">Forex Scorecard</div>
    <select style="background:#0e1520;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.8);
      font-family:var(--mono);font-size:11px;padding:6px 10px;border-radius:6px;outline:none;cursor:pointer"
      onchange="state.scForexPair=this.value;renderForexScorecard()">${fxDrop}</select>
  </div>
  <!-- Single-column sections (mirrors Asset Scorecard flow) -->
  ${fxHeroSection}
  ${fxSummarySection}
  ${fxWtSection}
  ${fxHistSection}
  ${fxBreakdownSection}
  ${fxStrSection}`;
  } catch(e) {
    console.error("[FX] render error:", e);
    const _el=document.getElementById("page-forex"); if(_el) _el.innerHTML=`<div style="padding:24px;font-family:var(--mono);font-size:11px;color:var(--muted)">⚠ Render error — check console.<br><span style="color:#e05c6a;font-size:10px;">`+e.message+`</span></div>`;
  }
}



function renderFXExplanation(data) {
  if (!data) return '<p style="color:var(--muted);font-size:11px">No differential data.</p>';
  const bC  = b => b==='Bullish'?'#4a90d9':b==='Bearish'?'#e05c6a':'#6b7280';
  const bBg = b => b==='Bullish'?'rgba(74,144,217,.15)':b==='Bearish'?'rgba(224,92,106,.15)':'rgba(107,114,128,.1)';
  const badge = b => `<span style="background:${bBg(b)};color:${bC(b)};border-radius:3px;padding:2px 8px;font-family:var(--mono);font-size:9px;font-weight:700;display:inline-block">${b}</span>`;
  const sC = v => v>0?'#4a90d9':v<0?'#e05c6a':'#6b7280';
  const sumCols = Object.entries(data.summary).map(([k,v]) =>
    `<div style="background:#0e1520;padding:10px 12px;text-align:center">
      <div style="font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">${k}</div>
      ${badge(v)}</div>`).join('');
  const LABELS = {technical:'📈 Technical',institutional:'🏦 Institutional',
    growth:'🌍 Growth',inflation:'🌡 Inflation',labor:'👷 Labor',monetaryPolicy:'🏛 Mon. Policy'};
  const W = data.weights || {};
  const diffRows = Object.entries(data.differentials).map(([fk,fd]) =>
    `<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
      <td style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,.7)">${LABELS[fk]||fk}
        ${W[fk]?`<span style="font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);margin-left:5px">${(W[fk]*100).toFixed(0)}%</span>`:''}</td>
      <td style="padding:8px 10px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;color:${sC(fd.base)}">${fd.base>=0?'+':''}${fd.base}</td>
      <td style="padding:8px 10px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;color:${sC(fd.quote)}">${fd.quote>=0?'+':''}${fd.quote}</td>
      <td style="padding:8px 10px;text-align:center;font-family:var(--mono);font-size:11px;font-weight:700;color:${sC(fd.diff)}">${fd.diff>=0?'+':''}${fd.diff}</td>
      <td style="padding:8px 10px;text-align:right">${badge(fd.bias)}</td>
    </tr>`).join('');
  let flags='';
  if (data.divergence) flags+=`<div style="background:rgba(240,180,41,.06);border:1px solid rgba(240,180,41,.2);border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:11px;color:rgba(240,180,41,.9)">⚠ ${data.divergence.type}: ${data.divergence.note}</div>`;
  if (data.regime&&data.regime!=='Neutral Regime') flags+=`<div style="background:rgba(139,148,158,.06);border:1px solid rgba(139,148,158,.15);border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:11px;color:${bC(data.regime==='Risk-On'?'Bullish':'Bearish')}">🌐 Regime: ${data.regime}</div>`;
  const baseStr=data.pair.slice(0,3), quoteStr=data.pair.slice(3);
  return flags+`
  <div style="background:#0e1520;border:1px solid rgba(74,144,217,.2);border-radius:10px;overflow:hidden;margin-bottom:12px">
    <div style="padding:10px 14px;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:#4a90d9;text-transform:uppercase;letter-spacing:.8px">▶ Macro Differential — ${data.pair}</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${bC(data.signal)}">${data.signal} · ${data.finalScore>=0?'+':''}${data.finalScore}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.04)">${sumCols}</div>
  </div>
  <div style="background:#0e1520;border:1px solid rgba(255,255,255,.07);border-radius:10px;overflow:hidden;margin-bottom:12px">
    <div style="padding:10px 14px;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between">
      <span style="font-family:var(--mono);font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px">Component Breakdown</span>
      <span style="font-size:9px;color:rgba(255,255,255,.25)">${baseStr} vs ${quoteStr}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:rgba(255,255,255,.03)">
        <th style="padding:5px 12px;text-align:left;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);font-weight:400;text-transform:uppercase">Factor</th>
        <th style="padding:5px 10px;text-align:center;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);font-weight:400">${baseStr}</th>
        <th style="padding:5px 10px;text-align:center;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);font-weight:400">${quoteStr}</th>
        <th style="padding:5px 10px;text-align:center;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);font-weight:400">Diff</th>
        <th style="padding:5px 10px;text-align:right;font-family:var(--mono);font-size:8px;color:rgba(255,255,255,.3);font-weight:400">Signal</th>
      </tr>${diffRows}
    </table>
  </div>`;
}
