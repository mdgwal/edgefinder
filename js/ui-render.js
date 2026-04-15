// ─────────────────────────────────────────────────────────────────────────────
// ui-render.js — All DOM rendering for EdgeFinder Pro
// Depends on: data.js, assets-engine.js, fx-engine.js
// Handles ONLY rendering — zero business logic or calculations here.
// ─────────────────────────────────────────────────────────────────────────────

// ── TOP SETUPS ────────────────────────────────────────────────────────────────

function renderAssetScorecard(filterCat) {
  const cats     = ["All", "Forex", "Index", "Commodity", "Crypto"];
  const filtered = buildAssetBreakdown(filterCat);

  let html = `
  <div class="filter-bar">
    <span class="filter-label">Category:</span>
    ${cats.map(c => `<button class="filter-btn${filterCat === c ? " active" : ""}" onclick="setFilter('${c}')">${c}</button>`).join("")}
  </div>
  <div class="score-table-wrap"><table class="score-table">
    <thead>
      <tr>
        <th class="left" rowspan="2">Asset</th>
        <th rowspan="2">Bias</th>
        <th rowspan="2">Score</th>
        <th class="group" colspan="2">Sentiment</th>
        <th class="group" colspan="2">Technical</th>
        <th class="group" colspan="8">Economic Data</th>
      </tr>
      <tr>
        <th>COT</th><th>Retail</th><th>Seasonal</th><th>Trend</th>
        <th>GDP</th><th>mPMI</th><th>sPMI</th><th>Ret Sales</th>
        <th>Inflation</th><th>Emp Chg</th><th>Unemploy</th><th>Rates</th>
      </tr>
    </thead><tbody>`;

  filtered.forEach(a => {
    const tc = totalColor(a.total);
    const bc = biasColor(a.bias);
    const fv = v => `${v > 0 ? "+" : ""}${v}`;
    html += `
    <tr>
      <td class="asset-name" style="color:${tc}">${a.name}</td>
      <td class="bias-cell" style="color:${bc}">${a.bias}</td>
      <td class="total-cell" style="color:${tc}">${fv(a.total)}</td>
      <td class="${cellClass(a.cot)}">${fv(a.cot)}</td>
      <td class="${cellClass(a.retail)}">${fv(a.retail)}</td>
      <td class="${cellClass(a.seasonal)}">${fv(a.seasonal)}</td>
      <td class="${cellClass(a.trend)}">${fv(a.trend)}</td>
      <td class="${cellClass(a.gdp)}">${fv(a.gdp)}</td>
      <td class="${cellClass(a.mPMI)}">${fv(a.mPMI)}</td>
      <td class="${cellClass(a.sPMI)}">${fv(a.sPMI)}</td>
      <td class="${cellClass(a.retailSal)}">${fv(a.retailSal)}</td>
      <td class="${cellClass(a.inflation)}">${fv(a.inflation)}</td>
      <td class="${cellClass(a.empChg)}">${fv(a.empChg)}</td>
      <td class="${cellClass(a.unemploy)}">${fv(a.unemploy)}</td>
      <td class="${cellClass(a.rates)}">${fv(a.rates)}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div class="infobox ib-blue">
    <span class="iblabel" style="color:var(--accent)">ℹ STABLE SCORES</span>
    Calculated from real COT + sentiment data. Only updates when underlying data changes.
  </div>`;

  document.getElementById("page-setups").innerHTML = html;
}

// ── COT TABLE + CHART ─────────────────────────────────────────────────────────

function renderForexScorecard(cotData, isLive, isLoading, cotSort) {
  const data = cotData && cotData.length ? cotData : COT_DATA;

  let lastUpdateLabel = "Mar 14, 2026";
  if (isLive && data[0] && data[0].date) {
    try {
      const d = new Date(data[0].date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
      lastUpdateLabel = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {}
  }

  const badge = isLive
    ? `<span class="cbadge-live">● LIVE · CFTC</span>`
    : isLoading
      ? `<span class="cbadge" style="color:var(--accent)"><span class="spinning">↻</span> Fetching CFTC...</span>`
      : `<span class="cbadge-demo">FALLBACK DATA</span>`;

  const sorted = [...data].sort((a, b) => {
    if (cotSort.col === "id") return a.id.localeCompare(b.id) * cotSort.dir;
    return (b[cotSort.col] - a[cotSort.col]) * cotSort.dir;
  });

  // Chart HTML
  const chartHtml = `
  <div class="cot-chart-wrap">
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
      ${data.map(row => {
        const lh = Math.round(row.longPct  * 1.5);
        const sh = Math.round(row.shortPct * 1.5);
        return `
        <div class="cot-bar-wrap"
          onmouseenter="showTip(event,'${row.id}',${row.longPct},${row.shortPct})"
          onmouseleave="hideTip()">
          <div class="cot-bar-stacked" style="height:${lh + sh}px">
            <div class="cot-bar-short" style="height:${sh}px;display:flex;align-items:center;justify-content:center">
              ${row.shortPct > 15 ? `<span style="font-family:var(--mono);font-size:8px;color:#fff">${row.shortPct.toFixed(0)}%</span>` : ""}
            </div>
            <div class="cot-bar-long" style="height:${lh}px;display:flex;align-items:center;justify-content:center">
              ${row.longPct > 15 ? `<span style="font-family:var(--mono);font-size:8px;color:#fff">${row.longPct.toFixed(0)}%</span>` : ""}
            </div>
          </div>
          <div class="cot-bar-label">${row.id}</div>
        </div>`;
      }).join("")}
    </div></div>
  </div>`;

  // Table HTML
  const cols = [
    { key: "id",     label: "Asset" },
    { key: "longC",  label: "Long C" },
    { key: "shortC", label: "Short C" },
    { key: "dLong",  label: "Δ Long C" },
    { key: "dShort", label: "Δ Short C" },
    { key: "longPct",  label: "Long %" },
    { key: "shortPct", label: "Short %" },
    { key: "netChg",   label: "Net % Chg" },
    { key: "netPos",   label: "Net Position" },
    { key: "oi",       label: "Open Interest" },
    { key: "dOI",      label: "Δ Open Int" },
  ];

  let tbl = `
  <div class="cot-tbl-wrap"><table class="cot-tbl">
    <thead><tr>
      ${cols.map(c => `<th onclick="sortCOT('${c.key}')">${c.label}${cotSort.col === c.key ? (cotSort.dir === -1 ? " ▼" : " ▲") : ""}</th>`).join("")}
    </tr></thead><tbody>`;

  sorted.forEach(row => {
    const lc   = row.longPct  > 55 ? "pct-bull" : row.longPct  < 45 ? "pct-bear" : "pct-neutral";
    const sc2  = row.shortPct > 55 ? "pct-bull" : row.shortPct < 45 ? "pct-bear" : "pct-neutral";
    const nc   = row.netChg > 0 ? "delta-bull" : "delta-bear";
    const dlc  = row.dLong  > 0 ? "delta-bull" : "delta-bear";
    const dsc  = row.dShort < 0 ? "delta-bull" : "delta-bear";
    const doic = row.dOI    > 0 ? "delta-bull" : "delta-bear";
    const npc  = row.netPos > 0 ? "pos-bull"   : "pos-bear";
    tbl += `
    <tr>
      <td>${row.id}</td>
      <td>${row.longC.toLocaleString()}</td>
      <td>${row.shortC.toLocaleString()}</td>
      <td class="${dlc}">${row.dLong  > 0 ? "+" : ""}${row.dLong.toLocaleString()}</td>
      <td class="${dsc}">${row.dShort > 0 ? "+" : ""}${row.dShort.toLocaleString()}</td>
      <td class="${lc}">${row.longPct.toFixed(2)}%</td>
      <td class="${sc2}">${row.shortPct.toFixed(2)}%</td>
      <td class="${nc}">${row.netChg > 0 ? "+" : ""}${row.netChg.toFixed(2)}%</td>
      <td><span class="pos-highlight ${npc}">${row.netPos > 0 ? "+" : ""}${fmtK(row.netPos)}</span></td>
      <td>${fmtK(row.oi)}</td>
      <td class="${doic}">${row.dOI > 0 ? "+" : ""}${fmtK(row.dOI)}</td>
    </tr>`;
  });

  tbl += `</tbody></table></div>`;

  const infoHtml = `
  <div class="infobox ib-blue">
    <span class="iblabel" style="color:var(--accent)">ℹ CFTC COT DATA — ${isLive ? "● LIVE · Auto-fetched from CFTC.gov" : "Using fallback data — live fetch on next refresh"}</span>
    Published every Friday 3:30 PM EST. Reflects positions as of prior Tuesday.
    Tap column headers to sort. Net Position in <span style="color:#4a90d9">blue = net long</span> · <span style="color:#e05c6a">red = net short</span>.
    Data refreshes automatically every 12 hours.
  </div>`;

  document.getElementById("page-cot").innerHTML = chartHtml + tbl + infoHtml;
}

// ── FX EXPLANATION PANEL ──────────────────────────────────────────────────────

/**
 * Render the FX Differential explanation panel for a given pair.
 * Displays macro differential summary and per-component data blocks.
 * @param {{ base: string, quote: string }} pairData
 * @returns {string} HTML string
 */
function renderFXExplanation(pairData) {
  const diff = buildFXDifferential(pairData);
  const { base, quote } = pairData;
  const { summary, differentials, finalScore, baseAsset, quoteAsset } = diff;

  const scoreCol = finalScore >= 2 ? "var(--bull)" : finalScore <= -2 ? "var(--bear)" : "var(--neutral)";
  const scoreLabel = finalScore >= 3 ? `${base} Strong Advantage` :
                     finalScore >= 1 ? `${base} Slight Edge` :
                     finalScore <= -3 ? `${quote} Strong Advantage` :
                     finalScore <= -1 ? `${quote} Slight Edge` : "Balanced";

  const componentLabels = {
    growth: "📈 Growth",
    inflation: "💹 Inflation",
    monetary: "🏦 Monetary Policy",
    institutional: "🏛 Institutional / COT",
  };

  const fieldDescriptions = {
    gdp: "GDP", mPMI: "Mfg PMI", sPMI: "Svcs PMI",
    inflation: "CPI", rates: "Rate Stance",
    cot: "COT Positioning", trend: "Technical Trend",
  };

  function scoreToLabel(s) {
    if (s >= 2)  return { text: "Strong +",  col: "var(--bull)" };
    if (s === 1) return { text: "Positive",  col: "#7effc4" };
    if (s === 0) return { text: "Neutral",   col: "var(--muted)" };
    if (s === -1)return { text: "Negative",  col: "#ff8fa0" };
    return               { text: "Strong −",  col: "var(--bear)" };
  }

  // ── Macro Summary Grid ──
  let summaryHtml = `
  <div class="fx-macro-grid">`;
  for (const [key, label] of Object.entries(componentLabels)) {
    const d   = differentials[key];
    const col = d.col;
    summaryHtml += `
    <div class="fx-macro-cell">
      <div class="fx-macro-label">${label}</div>
      <div class="fx-macro-val" style="color:${col}">${d.result}</div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-top:4px">
        ${base}: ${d.baseScore > 0 ? "+" : ""}${d.baseScore} &nbsp;|&nbsp; ${quote}: ${d.quoteScore > 0 ? "+" : ""}${d.quoteScore}
      </div>
    </div>`;
  }
  summaryHtml += `</div>`;

  // ── Component Data Blocks ──
  let blocksHtml = "";
  for (const [key, label] of Object.entries(componentLabels)) {
    const d    = differentials[key];
    const comp = FX_COMPONENTS[key];
    const conclusionBg = d.diff >= 1 ? "rgba(0,255,136,.1)" : d.diff <= -1 ? "rgba(255,59,92,.1)" : "rgba(240,180,41,.08)";
    const conclusionBorder = d.diff >= 1 ? "rgba(0,255,136,.2)" : d.diff <= -1 ? "rgba(255,59,92,.2)" : "rgba(240,180,41,.15)";

    let fieldsHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">`;

    for (const field of comp.fields) {
      const bv = d.baseBreakdown[field]  || 0;
      const qv = d.quoteBreakdown[field] || 0;
      const bl = scoreToLabel(bv);
      const ql = scoreToLabel(qv);
      fieldsHtml += `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-bottom:5px;text-transform:uppercase">${fieldDescriptions[field] || field}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="text-align:center;flex:1">
            <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">${base}</div>
            <div style="font-family:var(--mono);font-size:11px;font-weight:bold;color:${bl.col}">${bl.text}</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">(${bv > 0 ? "+" : ""}${bv})</div>
          </div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--border)">vs</div>
          <div style="text-align:center;flex:1">
            <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">${quote}</div>
            <div style="font-family:var(--mono);font-size:11px;font-weight:bold;color:${ql.col}">${ql.text}</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">(${qv > 0 ? "+" : ""}${qv})</div>
          </div>
        </div>
      </div>`;
    }

    fieldsHtml += `</div>`;

    blocksHtml += `
    <div class="fx-comp-block">
      <div class="fx-comp-header">
        <div class="fx-comp-name">${label}</div>
        <div class="fx-comp-score" style="color:${d.col}">Diff: ${d.diff > 0 ? "+" : ""}${d.diff} → ${d.result}</div>
      </div>
      ${fieldsHtml}
      <div class="fx-comp-conclusion" style="background:${conclusionBg};border:1px solid ${conclusionBorder};color:${d.col}">
        ${d.diff >= 1 ? `✦ ${base} has the ${label.toLowerCase()} edge` :
          d.diff <= -1 ? `✦ ${quote} has the ${label.toLowerCase()} edge` :
          `→ ${label} is balanced between ${base} and ${quote}`}
      </div>
    </div>`;
  }

  return `
  <div class="fx-diff-wrap">
    <div class="fx-diff-header">
      <div class="fx-diff-title">📊 Macro Differential — ${base} vs ${quote}</div>
      <div style="font-family:var(--mono);font-size:12px;font-weight:bold;color:${scoreCol}">
        Final Score: ${finalScore > 0 ? "+" : ""}${finalScore} · ${scoreLabel}
      </div>
    </div>
    <div class="fx-diff-body">
      <div class="sectitle">Macro Summary</div>
      ${summaryHtml}
      <div class="sectitle">Component Analysis</div>
      ${blocksHtml}
    </div>
  </div>`;
}

// ── SENTIMENT ─────────────────────────────────────────────────────────────────

function renderSentiment(state) {
  const { sentSubTab, sentimentData, sentimentLive, sentimentLoading, sentFilter,
          putCallData, putCallLive, aaiiData, aaiiLive } = state;

  const subTabs = [
    { id: "retail",     label: "📊 Retail Long/Short" },
    { id: "smartmoney", label: "🏦 Smart Money vs Retail" },
    { id: "putcall",    label: "📉 Put/Call Ratio" },
    { id: "aaii",       label: "📋 AAII Survey" },
    { id: "extremes",   label: "⚡ Sentiment Extremes" },
  ];

  let html = `
  <div class="sent-sub-tabs">
    ${subTabs.map(t => `<button class="sent-sub-tab${sentSubTab === t.id ? " active" : ""}" onclick="setSentTab('${t.id}')">${t.label}</button>`).join("")}
  </div>`;

  // ── RETAIL ──
  if (sentSubTab === "retail") {
    const data = sentimentData;

    function getCat(name) {
      if (["XAUUSD","XAGUSD","USOIL","UKOIL","COPPER"].includes(name)) return "Commodity";
      if (["US500","NAS100","US30","GER40","UK100"].includes(name))     return "Index";
      if (["BTCUSD","ETHUSD","LTCUSD"].includes(name))                  return "Crypto";
      return "Forex";
    }

    const cats     = ["All","Forex","Commodity","Index","Crypto"];
    const filtered = sentFilter === "All" ? data : data.filter(r => getCat(r.name) === sentFilter);
    const strongSells = data.filter(r => r.longPercentage >= 75).length;
    const sells       = data.filter(r => r.longPercentage >= 65 && r.longPercentage < 75).length;
    const buys        = data.filter(r => r.longPercentage > 25 && r.longPercentage <= 35).length;
    const strongBuys  = data.filter(r => r.longPercentage <= 25).length;
    const badge = sentimentLive
      ? `<span class="cbadge-live">● LIVE · Myfxbook</span>`
      : `<span class="cbadge-demo">DEMO DATA — Add Myfxbook in Settings</span>`;

    html += `
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
    <div class="filter-bar">
      <span class="filter-label">Filter:</span>
      ${cats.map(c => `<button class="filter-btn${sentFilter === c ? " active" : ""}" onclick="setSentFilter('${c}')">${c}</button>`).join("")}
    </div>
    <div class="card">
      <div class="chd"><span class="ctitle">Retail Positioning — ${filtered.length} Instruments</span>${badge}</div>
      <div class="cbody">`;

    if (sentimentLoading && !sentimentLive) {
      html += `<div class="lrow" style="margin-bottom:10px"><div class="spinner"></div><span style="color:var(--accent)">Connecting to Myfxbook... showing demo data meanwhile</span></div>`;
    }

    filtered.forEach(row => {
      const lp  = row.longPercentage;
      const sp  = row.shortPercentage;
      const sig = sentSignal(lp);
      const totalVol = row.longVolume + row.shortVolume;
      const volLabel = totalVol > 50000 ? "Very High" : totalVol > 20000 ? "High" : totalVol > 5000 ? "Medium" : "Low";
      const volCol   = totalVol > 50000 ? "var(--bull)" : totalVol > 20000 ? "#7effc4" : totalVol > 5000 ? "var(--text)" : "var(--muted)";
      html += `
      <div class="sent-row-big">
        <div class="sent-pair-big">${row.name}</div>
        <span class="sent-signal ${sig.cls}">${sig.label}</span>
        <div class="sent-bar-big">
          <div class="sent-track-big">
            <div class="sent-long-big"  style="width:${lp}%"></div>
            <div class="sent-short-big" style="width:${sp}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;margin-top:3px">
            <span style="color:var(--bull)">▲ ${lp.toFixed(1)}% Long (${fmtK(row.longPositions)} pos)</span>
            <span style="color:var(--bear)">${sp.toFixed(1)}% Short (${fmtK(row.shortPositions)} pos) ▼</span>
          </div>
        </div>
        <div class="sent-vol" style="color:${volCol}">${volLabel}</div>
      </div>`;
    });

    html += `</div></div>
    <div class="infobox ib-yellow">
      <span class="iblabel" style="color:var(--neutral)">⚡ CONTRARIAN LOGIC — SOURCE: Myfxbook Community Outlook</span>
      When retail is 65%+ long → smart money likely short → <strong style="color:var(--bear)">SELL signal</strong>.<br>
      When retail is 35% or less long → smart money likely long → <strong style="color:var(--bull)">BUY signal</strong>.<br>
      70-80% of retail traders lose money. Trading against them gives a statistical edge.<br>
      ${!sentimentLive ? `<br><strong style="color:var(--neutral)">👆 Add Myfxbook credentials in ⚙ Settings to get live data.</strong>` : ""}
    </div>`;
  }

  // ── SMART MONEY ──
  else if (sentSubTab === "smartmoney") {
    html += `
    <div class="sectitle">Smart Money vs Retail — Divergence Analysis</div>
    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ SOURCE: COT (Smart Money) vs Myfxbook (Retail)</span>
      When Smart Money and Retail diverge by 20%+ it creates high probability contrarian trades.<br>
      <strong style="color:var(--bull)">Green = Smart Money Bullish, Retail Bearish → BUY.</strong>
      <strong style="color:var(--bear)">Red = Smart Money Bearish, Retail Bullish → SELL.</strong>
    </div>
    <div style="overflow-x:auto"><table class="smart-tbl">
      <thead><tr><th>Asset</th><th>Retail Long %</th><th>Smart Money Long %</th><th>Gap</th><th>Signal</th></tr></thead>
      <tbody>`;

    SMART_MONEY.forEach(row => {
      const gap    = row.institutionalLong - row.retailLong;
      const gapCol = gap > 0 ? "var(--bull)" : gap < 0 ? "var(--bear)" : "var(--muted)";
      const signal = gap > 20 ? "⬆ STRONG BUY" : gap > 10 ? "⬆ BUY" : gap < -20 ? "⬇ STRONG SELL" : gap < -10 ? "⬇ SELL" : "→ NEUTRAL";
      const sigCol = gap > 10 ? "var(--bull)" : gap < -10 ? "var(--bear)" : "var(--muted)";
      const rBar   = `<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;background:var(--bg4);border-radius:2px;overflow:hidden"><div style="width:${row.retailLong}%;height:100%;background:var(--bear);border-radius:2px"></div></div><span style="font-family:var(--mono);font-size:10px;color:var(--bear)">${row.retailLong}%</span></div>`;
      const sBar   = `<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;background:var(--bg4);border-radius:2px;overflow:hidden"><div style="width:${row.institutionalLong}%;height:100%;background:var(--bull);border-radius:2px"></div></div><span style="font-family:var(--mono);font-size:10px;color:var(--bull)">${row.institutionalLong}%</span></div>`;
      html += `<tr><td>${row.id}</td><td>${rBar}</td><td>${sBar}</td><td style="color:${gapCol};font-family:var(--mono);font-weight:bold">${gap > 0 ? "+" : ""}${gap}%</td><td style="color:${sigCol};font-family:var(--mono);font-weight:bold">${signal}</td></tr>`;
    });

    html += `</tbody></table></div>`;
  }

  // ── PUT/CALL ──
  else if (sentSubTab === "putcall") {
    const pcData  = putCallData || PUT_CALL;
    const pcBadge = putCallLive ? `<span class="cbadge-live">● LIVE · CBOE</span>` : `<span class="cbadge-demo">DEMO DATA</span>`;

    html += `
    <div class="sectitle">Put/Call Ratio — Options Market Sentiment</div>
    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ SOURCE: CBOE Options Data</span>
      <strong style="color:var(--text)">Put</strong> = bearish bet. <strong style="color:var(--text)">Call</strong> = bullish bet.<br>
      <strong style="color:var(--bull)">Below 0.7</strong> = extreme greed. <strong style="color:var(--bear)">Above 1.2</strong> = extreme fear.
    </div>
    <div class="card">
      <div class="chd"><span class="ctitle">Put/Call Ratio — Options Market</span>${pcBadge}</div>
      <div class="cbody">`;

    pcData.forEach(row => {
      const sig    = pcSignal(row.pc);
      const barPct = Math.min(100, row.pc * 50);
      const barCol = row.pc >= 1.2 ? "var(--bear)" : row.pc <= 0.7 ? "var(--bull)" : "var(--neutral)";
      html += `
      <div class="pc-row">
        <div class="pc-asset">${row.id}</div>
        <div class="pc-ratio" style="color:${sig.col}">${row.pc.toFixed(2)}</div>
        <div class="pc-bar-wrap">
          <div class="pc-bar-track"><div class="pc-bar-fill" style="width:${barPct}%;background:${barCol}"></div></div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--muted);margin-top:2px">${row.meaning}</div>
        </div>
        <div class="pc-signal" style="color:${sig.col}">${sig.label}</div>
      </div>`;
    });

    html += `</div></div>`;
  }

  // ── AAII ──
  else if (sentSubTab === "aaii") {
    const aaiiCurrent = aaiiData || AAII;
    const spreadCol   = aaiiCurrent.spread > 10 ? "var(--bull)" : aaiiCurrent.spread < -10 ? "var(--bear)" : "var(--neutral)";
    html += `
    <div class="sectitle">AAII Investor Sentiment Survey</div>
    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ SOURCE: AAII.com — Published Every Thursday</span>
      Historical avg: <strong style="color:var(--bull)">38% Bullish</strong> · <strong style="color:var(--neutral)">31% Neutral</strong> · <strong style="color:var(--bear)">31% Bearish</strong>.
    </div>
    <div class="aaii-wrap">
      <div class="aaii-box" style="border-color:rgba(0,255,136,.3)">
        <div class="aaii-label">Bullish</div>
        <div class="aaii-val" style="color:var(--bull)">${aaiiCurrent.bullish.val.toFixed(1)}%</div>
        <div class="aaii-hist">Historical avg: ${aaiiCurrent.bullish.hist}%</div>
        <div class="aaii-hist" style="color:${aaiiCurrent.bullish.change > 0 ? "var(--bear)" : "var(--bull)"};margin-top:2px">Week: ${aaiiCurrent.bullish.change > 0 ? "+" : ""}${aaiiCurrent.bullish.change}%</div>
        <div class="aaii-bar" style="background:var(--bull);width:${aaiiCurrent.bullish.val}%"></div>
      </div>
      <div class="aaii-box" style="border-color:rgba(240,180,41,.3)">
        <div class="aaii-label">Neutral</div>
        <div class="aaii-val" style="color:var(--neutral)">${aaiiCurrent.neutral.val.toFixed(1)}%</div>
        <div class="aaii-hist">Historical avg: ${aaiiCurrent.neutral.hist}%</div>
        <div class="aaii-hist" style="color:var(--muted);margin-top:2px">Week: ${aaiiCurrent.neutral.change > 0 ? "+" : ""}${aaiiCurrent.neutral.change}%</div>
        <div class="aaii-bar" style="background:var(--neutral);width:${aaiiCurrent.neutral.val}%"></div>
      </div>
      <div class="aaii-box" style="border-color:rgba(255,59,92,.3)">
        <div class="aaii-label">Bearish</div>
        <div class="aaii-val" style="color:var(--bear)">${aaiiCurrent.bearish.val.toFixed(1)}%</div>
        <div class="aaii-hist">Historical avg: ${aaiiCurrent.bearish.hist}%</div>
        <div class="aaii-hist" style="color:${aaiiCurrent.bearish.change > 0 ? "var(--bear)" : "var(--bull)"};margin-top:2px">Week: ${aaiiCurrent.bearish.change > 0 ? "+" : ""}${aaiiCurrent.bearish.change}%</div>
        <div class="aaii-bar" style="background:var(--bear);width:${aaiiCurrent.bearish.val}%"></div>
      </div>
    </div>
    <div class="card">
      <div class="chd">
        <span class="ctitle">Bull-Bear Spread</span>
        <span class="cbadge${aaiiLive ? "-live" : ""}">${aaiiLive ? "● LIVE · AAII" : "Week of " + aaiiCurrent.week}</span>
      </div>
      <div class="cbody">
        <div style="display:flex;flex-direction:column;align-items:center;padding:10px 0">
          <div style="font-family:var(--mono);font-size:48px;font-weight:bold;color:${spreadCol}">${aaiiCurrent.spread > 0 ? "+" : ""}${aaiiCurrent.spread}%</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--muted)">Bull - Bear Spread</div>
          <div style="font-family:var(--mono);font-size:11px;margin-top:6px;color:${spreadCol}">
            ${aaiiCurrent.spread < -10 ? "EXCESSIVE BEARISH — Contrarian Bullish Signal" :
              aaiiCurrent.spread > 10  ? "EXCESSIVE BULLISH — Contrarian Bearish Signal" :
              "NEAR HISTORICAL AVERAGE"}
          </div>
        </div>
        <div style="height:8px;background:linear-gradient(to right,var(--bear),var(--neutral),var(--bull));border-radius:4px;margin:10px 0;position:relative">
          <div style="position:absolute;width:4px;height:14px;background:white;border-radius:2px;top:-3px;transform:translateX(-50%);left:${Math.min(95,Math.max(5,50+AAII.spread))}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;color:var(--muted)">
          <span style="color:var(--bear)">Bearish (-50%)</span><span>Neutral (0%)</span><span style="color:var(--bull)">Bullish (+50%)</span>
        </div>
      </div>
    </div>`;
  }

  // ── EXTREMES ──
  else if (sentSubTab === "extremes") {
    html += `
    <div class="sectitle">Sentiment Extremes — Highest Probability Setups</div>
    <div class="infobox ib-yellow">
      <span class="iblabel" style="color:var(--neutral)">⚡ ASSETS AT HISTORICAL EXTREMES</span>
      The further from historical average, the stronger the contrarian signal.
    </div>
    <div style="overflow-x:auto"><table class="extremes-tbl">
      <thead><tr><th>Asset</th><th>Direction</th><th>Retail %</th><th>Hist Avg</th><th>Deviation</th><th>Signal</th><th>Strength</th></tr></thead>
      <tbody>`;

    EXTREMES.forEach(row => {
      const isBull = row.signal.includes("BUY");
      const sigCol = isBull ? "var(--bull)"  : "var(--bear)";
      const devCol = row.deviation > 0 ? "var(--bear)" : "var(--bull)";
      const strCol = row.strength === "Strong" ? "var(--bull)" : "var(--neutral)";
      html += `
      <tr>
        <td style="font-weight:bold;color:${sigCol}">${row.id}</td>
        <td><span style="font-family:var(--mono);font-size:10px;color:${row.direction.includes("LONG") ? "var(--bear)" : "var(--bull)"}">${row.direction}</span></td>
        <td style="font-family:var(--mono);color:${row.retailPct > 50 ? "var(--bear)" : "var(--bull)"}">${row.retailPct}%</td>
        <td style="font-family:var(--mono);color:var(--muted)">${row.historicalAvg}%</td>
        <td style="font-family:var(--mono);color:${devCol}">${row.deviation > 0 ? "+" : ""}${row.deviation}%</td>
        <td style="font-family:var(--mono);font-weight:bold;color:${sigCol}">${row.signal}</td>
        <td style="font-family:var(--mono);color:${strCol}">${row.strength}</td>
      </tr>`;
    });

    html += `</tbody></table></div>
    <div class="infobox ib-green" style="margin-top:12px">
      <span class="iblabel" style="color:var(--bull)">✅ HIGHEST PROBABILITY SETUP</span>
      Best trades = ALL THREE align: Retail extreme + Smart Money opposite + COT confirms.
    </div>`;
  }

  document.getElementById("page-sentiment").innerHTML = html;
}

// ── ECONOMIC ──────────────────────────────────────────────────────────────────

function renderEcon(state) {
  const { ecoSubTab, econData, econLive, econLoading, fredKey } = state;

  if (fredKey && econLoading && !econData) {
    document.getElementById("page-econ").innerHTML = `
    <div class="sectitle">Economic Data</div>
    <div class="econ-loading"><div class="spinner"></div><span>Fetching live data from FRED...</span></div>`;
    return;
  }

  const subTabs = [
    { id: "meter",   label: "🎯 Surprise Meter" },
    { id: "heatmap", label: "🌡 Heatmap" },
  ];

  let html = `
  <div class="eco-sub-tabs">
    ${subTabs.map(t => `<button class="eco-sub-tab${ecoSubTab === t.id ? " active" : ""}" onclick="setEcoTab('${t.id}')">${t.label}</button>`).join("")}
  </div>`;

  if (ecoSubTab === "meter") {
    const ecoSurprise = econData ? calcSurpriseFromFRED(econData) : ECO_SURPRISE_FALLBACK;
    const merged      = { ...ECO_SURPRISE_FALLBACK, ...ecoSurprise };
    const scores      = Object.entries(merged);
    const avg         = Math.round(scores.reduce((a, [, v]) => a + v.score, 0) / scores.length);
    const avgCol      = avg >= 70 ? "var(--bull)" : avg >= 45 ? "var(--neutral)" : "var(--bear)";

    html += `
    <div class="infobox ib-blue" style="margin-bottom:14px">
      <span class="iblabel" style="color:var(--accent)">ℹ ECONOMIC SURPRISE METER</span>
      Shows how economic data performs <strong style="color:var(--text)">relative to expectations</strong>.
    </div>
    <div class="sectitle">Currency Economic Surprise Scores</div>
    <div class="gauge-grid">`;

    scores.forEach(([cur, data]) => {
      const col    = data.score >= 70 ? "var(--bull)" : data.score >= 45 ? "var(--neutral)" : "var(--bear)";
      const status = data.score >= 70 ? "Strong" : data.score >= 55 ? "Above Avg" : data.score >= 45 ? "Average" : data.score >= 30 ? "Below Avg" : "Weak";
      html += `
      <div class="gauge-wrap">
        <div class="gauge-label">${FLAGS[cur] || ""} ${cur}</div>
        ${makeGaugeSVG(data.score)}
        <div class="gauge-pct" style="color:${col}">${data.score}%</div>
        <div class="gauge-status">${status}</div>
      </div>`;
    });

    html += `</div>
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
          Average economic outperformance or underperformance across all major currencies.<br><br>
          <strong style="color:${avg >= 60 ? "var(--bull)" : avg >= 45 ? "var(--neutral)" : "var(--bear)"}">
            ${avg >= 70 ? "🟢 Global economy broadly beating expectations" :
              avg >= 55 ? "🟡 Global economy slightly above expectations" :
              avg >= 45 ? "⚪ Global economy in line with expectations" :
              "🔴 Global economy broadly missing expectations"}
          </strong>
        </div>
      </div>
    </div>
    <div class="sectitle">Indicator Breakdown by Currency</div>`;

    scores.forEach(([cur, data]) => {
      const col = data.score >= 70 ? "var(--bull)" : data.score >= 45 ? "var(--neutral)" : "var(--bear)";
      html += `
      <div class="card" style="margin-bottom:10px">
        <div class="chd"><span class="ctitle">${FLAGS[cur] || ""} ${cur} — ${data.score}%</span><span class="cbadge" style="color:${col}">${data.score >= 70 ? "STRONG" : data.score >= 45 ? "AVERAGE" : "WEAK"}</span></div>
        <div class="cbody" style="display:flex;gap:10px;flex-wrap:wrap">`;
      data.indicators.forEach(ind => {
        const ic = ind.s >= .4 ? "var(--bull)" : ind.s >= .1 ? "#7effc4" : ind.s <= -.4 ? "var(--bear)" : ind.s <= -.1 ? "#ff8fa0" : "var(--muted)";
        const il = ind.s >= .4 ? "▲▲ Strong Beat" : ind.s >= .1 ? "▲ Beat" : ind.s <= -.4 ? "▼▼ Strong Miss" : ind.s <= -.1 ? "▼ Miss" : "→ In Line";
        html += `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;min-width:80px;text-align:center">
          <div style="font-family:var(--mono);font-size:9px;color:var(--muted)">${ind.n}</div>
          <div style="font-family:var(--mono);font-size:11px;color:${ic};margin-top:3px">${il}</div>
        </div>`;
      });
      html += `</div></div>`;
    });
  }

  else if (ecoSubTab === "heatmap") {
    const data2  = econData || FALLBACK_ECON;
    const isLive = econLive;
    if (!fredKey) html += `<div class="infobox ib-yellow"><span class="iblabel" style="color:var(--neutral)">⚡ UPGRADE TO LIVE DATA</span>Go to <strong style="color:var(--accent)">fred.stlouisfed.org</strong> → My Account → API Keys → paste in ⚙ Settings.</div>`;

    for (const [cur, items] of Object.entries(data2)) {
      const badge = isLive ? `<span class="cbadge-live">● LIVE · FRED</span>` : `<span class="cbadge-demo">DEMO DATA</span>`;
      html += `
      <div class="card">
        <div class="chd"><span class="ctitle">${FLAGS[cur] || ""} ${cur}</span>${badge}</div>
        <div class="hgrid">`;
      items.forEach(i => {
        const bg  = i.s > .3  ? "rgba(0,255,136,.15)"  : i.s < -.3 ? "rgba(255,59,92,.15)" : "rgba(240,180,41,.1)";
        const br  = i.s > .3  ? "1px solid rgba(0,255,136,.2)" : i.s < -.3 ? "1px solid rgba(255,59,92,.2)" : "1px solid rgba(240,180,41,.15)";
        const lbl = i.s > .3  ? "▲ Beat" : i.s < -.3 ? "▼ Miss" : "→ In Line";
        const lc  = i.s > .3  ? "var(--bull)" : i.s < -.3 ? "var(--bear)" : "var(--muted)";
        html += `<div class="hcell" style="background:${bg};border:${br}"><div class="hlbl">${i.l}</div><div class="hval">${i.v}</div><div class="hchg" style="color:${lc}">${lbl}</div>${i.d ? `<div class="hdate">${i.d}</div>` : ""}</div>`;
      });
      html += `</div></div>`;
    }
  }

  document.getElementById("page-econ").innerHTML = html;
}

// ── GAUGE SVG ─────────────────────────────────────────────────────────────────

function makeGaugeSVG(score) {
  const cx = 60, cy = 62, r = 44;

  function ptAt(pct) {
    const a = Math.PI - (pct / 100) * Math.PI;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }

  const [x40a, y40a] = ptAt(40);
  const [x60a, y60a] = ptAt(60);
  const [x100, y100] = ptAt(100);
  const [x0,   y0  ] = ptAt(0);
  const [nx,   ny  ] = ptAt(score);
  const col = score >= 70 ? "#00ff88" : score >= 45 ? "#f0b429" : "#ff3b5c";

  return `<svg viewBox="0 0 120 68" style="width:130px;height:75px">
    <path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x100.toFixed(1)} ${y100.toFixed(1)}" fill="none" stroke="#1c2330" stroke-width="11" stroke-linecap="butt"/>
    <path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x40a.toFixed(1)} ${y40a.toFixed(1)}" fill="none" stroke="rgba(255,59,92,.55)" stroke-width="11" stroke-linecap="butt"/>
    <path d="M ${x40a.toFixed(1)} ${y40a.toFixed(1)} A ${r} ${r} 0 0 1 ${x60a.toFixed(1)} ${y60a.toFixed(1)}" fill="none" stroke="rgba(240,180,41,.55)" stroke-width="11" stroke-linecap="butt"/>
    <path d="M ${x60a.toFixed(1)} ${y60a.toFixed(1)} A ${r} ${r} 0 0 1 ${x100.toFixed(1)} ${y100.toFixed(1)}" fill="none" stroke="rgba(0,255,136,.55)" stroke-width="11" stroke-linecap="butt"/>
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="rgba(0,0,0,.4)" stroke-width="4" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="#0d1117" stroke="${col}" stroke-width="2"/>
    <text x="11" y="67" fill="#8b949e" font-size="8" font-family="monospace">0</text>
    <text x="53" y="16" fill="#8b949e" font-size="8" font-family="monospace">50</text>
    <text x="99" y="67" fill="#8b949e" font-size="8" font-family="monospace">100</text>
  </svg>`;
}

// ── CURRENCY STRENGTH ─────────────────────────────────────────────────────────

function renderCurrency(cdata) {
  if (!cdata) {
    document.getElementById("page-currency").innerHTML = `<div class="lrow"><div class="spinner"></div><span>Loading live rates...</span></div>`;
    return;
  }
  let html = `
  <div class="sectitle">Currency Strength — Live Rates</div>
  <div class="card">
    <div class="chd"><span class="ctitle">G8 Relative Strength</span><span class="cbadge-live">● LIVE · Frankfurter</span></div>
    <div class="cbody">`;
  cdata.forEach((c, i) => {
    const col = c.val > .05 ? "var(--bull)" : c.val < -.05 ? "var(--bear)" : "var(--neutral)";
    html += `
    <div class="crow">
      <div class="crank">${i + 1}</div>
      <div class="ccode" style="color:${col}">${c.code}</div>
      <div class="cname">${c.name}</div>
      <div class="cbarw"><div class="cbart"><div class="cbarf" style="width:${c.pct}%;background:${col}"></div></div></div>
      <div class="cval" style="color:${col}">${c.val > 0 ? "+" : ""}${c.val.toFixed(3)}</div>
    </div>`;
  });
  html += `</div></div>`;
  document.getElementById("page-currency").innerHTML = html;
}

// ── CARRY TRADE ───────────────────────────────────────────────────────────────

function renderCarry() {
  let html = `
  <div class="sectitle">Carry Trade Scanner</div>
  <div class="infobox ib-blue"><span class="iblabel" style="color:var(--accent)">ℹ CARRY TRADE</span>Buy high interest rate currency, sell low rate currency. Best in low volatility trending markets.</div>
  <div class="card">
    <div class="chd"><span class="ctitle">Best Carry Opportunities</span><span class="cbadge">RANKED BY RATE DIFF</span></div>
    <div class="cbody">`;

  CARRY_PAIRS.forEach(p => {
    const col   = p.score >= 2 ? "var(--bull)" : p.score >= 1 ? "#7effc4" : p.score <= 0 ? "var(--bear)" : "var(--neutral)";
    const stars = "★".repeat(Math.max(0, p.score + 2)) + "☆".repeat(Math.max(0, 2 - p.score));
    html += `
    <div class="carry-row">
      <div style="font-family:var(--mono);font-size:12px;font-weight:bold;width:80px;flex-shrink:0;color:${col}">${p.pair}</div>
      <div style="flex:1">
        <div style="font-family:var(--mono);font-size:11px;color:var(--text)">Long ${p.long} / Short ${p.short}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Rate diff: ${p.rate.toFixed(2)}%</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--mono);font-size:14px;font-weight:bold;color:${col}">${p.rate.toFixed(2)}%</div>
        <div style="font-family:var(--mono);font-size:10px;color:${col}">${stars}</div>
      </div>
    </div>`;
  });

  html += `</div></div>`;
  document.getElementById("page-carry").innerHTML = html;
}

// ── FEAR & GREED ──────────────────────────────────────────────────────────────

function renderFearGreed(state) {
  const { fgData, fgLive } = state;
  const data      = fgData;
  const isLive    = fgLive;
  const fg        = parseInt(data[0].value);
  const col       = fgColor(fg);
  const yesterday = data[1]  ? parseInt(data[1].value)  : null;
  const lastWeek  = data[7]  ? parseInt(data[7].value)  : null;
  const lastMonth = data[29] ? parseInt(data[29].value) : null;
  const history   = data.slice(0, 7).reverse();
  const badge     = isLive ? `<span class="cbadge-live">● LIVE · Alternative.me</span>` : `<span class="cbadge-demo">ESTIMATED</span>`;

  let html = `
  <div class="sectitle">Fear & Greed Index</div>
  <div class="card">
    <div class="chd"><span class="ctitle">Crypto Market Sentiment</span>${badge}</div>
    <div class="cbody">
      <div style="display:flex;flex-direction:column;align-items:center;padding:10px 0">
        <div style="font-family:var(--mono);font-size:72px;font-weight:bold;color:${col};line-height:1">${fg}</div>
        <div style="font-family:var(--mono);font-size:20px;font-weight:bold;color:${col};margin-top:8px">${fgLabel(fg)}</div>
        <div style="width:100%;max-width:340px;margin:20px auto 0">
          <div class="fg-bar"><div class="fg-pointer" style="left:${fg}%"></div></div>
          <div class="fg-labels">
            <span style="color:var(--bear)">Extreme Fear</span><span>Neutral</span><span style="color:var(--bull)">Extreme Greed</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="chd"><span class="ctitle">Historical Comparison</span>${badge}</div>
    <div class="cbody">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
        ${yesterday != null ? `<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Yesterday</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(yesterday)};margin:4px 0">${yesterday}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(yesterday)}">${fgLabel(yesterday)}</div></div>` : ""}
        ${lastWeek  != null ? `<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Last Week</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(lastWeek)};margin:4px 0">${lastWeek}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(lastWeek)}">${fgLabel(lastWeek)}</div></div>` : ""}
        ${lastMonth != null ? `<div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">Last Month</div><div style="font-family:var(--mono);font-size:22px;font-weight:bold;color:${fgColor(lastMonth)};margin:4px 0">${lastMonth}</div><div style="font-family:var(--mono);font-size:9px;color:${fgColor(lastMonth)}">${fgLabel(lastMonth)}</div></div>` : ""}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="chd"><span class="ctitle">7-Day History</span>${badge}</div>
    <div class="cbody">
      ${history.map(d => {
        const v  = parseInt(d.value);
        const c  = fgColor(v);
        const dt = new Date(parseInt(d.timestamp) * 1000).toLocaleDateString([], { month: "short", day: "numeric" });
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--muted);width:50px;flex-shrink:0">${dt}</div>
          <div style="flex:1;background:var(--bg4);border-radius:4px;overflow:hidden;height:26px">
            <div style="width:${v}%;height:100%;background:${c};border-radius:4px;display:flex;align-items:center;padding-left:8px">
              <span style="font-family:var(--mono);font-size:11px;font-weight:bold;color:#000">${v}</span>
            </div>
          </div>
          <div style="font-family:var(--mono);font-size:9px;color:${c};width:80px;text-align:right;flex-shrink:0">${fgLabel(v)}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;

  document.getElementById("page-feargreed").innerHTML = html;
}

// ── SEASONALITY ───────────────────────────────────────────────────────────────

function renderSeasonality(state, SEASON_DATA) {
  const selAsset   = state.seasonAsset || "XAUUSD";
  const seasonView = state.seasonView  || "monthly";
  const pair       = SEASON_DATA.find(d => d.id === selAsset) || SEASON_DATA[0];
  const curMonth   = new Date().getMonth();
  const assetOpts  = SEASON_DATA.map(d => `<option value="${d.id}" ${d.id === selAsset ? "selected" : ""}>${d.name}</option>`).join("");

  const viewBtns = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
    <div style="display:flex;gap:6px">
      <button onclick="state.seasonView='annual';renderActive()"
        style="font-family:var(--mono);font-size:10px;padding:6px 14px;border-radius:20px;border:1px solid ${seasonView === 'annual' ? 'var(--accent)' : 'var(--border)'};background:${seasonView === 'annual' ? 'var(--accent)' : 'var(--bg3)'};color:${seasonView === 'annual' ? '#000' : 'var(--muted)'};cursor:pointer">
        📈 Annual Seasonality
      </button>
      <button onclick="state.seasonView='monthly';renderActive()"
        style="font-family:var(--mono);font-size:10px;padding:6px 14px;border-radius:20px;border:1px solid ${seasonView === 'monthly' ? 'var(--accent)' : 'var(--border)'};background:${seasonView === 'monthly' ? 'var(--accent)' : 'var(--bg3)'};color:${seasonView === 'monthly' ? '#000' : 'var(--muted)'};cursor:pointer">
        📊 Monthly Seasonality
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">Asset:</span>
      <select onchange="state.seasonAsset=this.value;renderActive()"
        style="background:var(--bg3);border:1px solid var(--accent);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 10px;border-radius:6px;outline:none">
        ${assetOpts}
      </select>
      ${pair.live
        ? `<span class="cbadge-live">● LIVE · Yahoo Finance</span>`
        : `<span class="cbadge-demo" style="cursor:pointer" onclick="loadSeasonalityLive()">⟳ Loading live...</span>`}
    </div>
  </div>`;

  let html = viewBtns;

  // ── ANNUAL VIEW ──
  if (seasonView === "annual") {
    const m10 = pair.m10, mCur = pair.mCur;
    const weeksPerMonth = [4,4,5,4,4,4,5,4,4,5,4,5];
    const wk10 = [], wkCur = [];
    let cum10 = 0, cumCur = 0;

    weeksPerMonth.forEach((wks, mi) => {
      const wkReturn10  = m10[mi] / wks;
      const wkReturnCur = mCur[mi] != null ? mCur[mi] / wks : null;
      for (let w = 0; w < wks; w++) {
        cum10  += wkReturn10;
        if (wkReturnCur != null) cumCur += wkReturnCur;
        wk10.push(parseFloat(cum10.toFixed(3)));
        wkCur.push(wkReturnCur != null ? parseFloat(cumCur.toFixed(3)) : null);
      }
    });

    const W = 700, H = 280, padL = 52, padR = 50, padT = 24, padB = 50;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = wk10.length;

    const allVals = [...wk10, ...wkCur.filter(v => v != null), 0];
    const yMax = Math.max(...allVals) + 1.5;
    const yMin = Math.min(...allVals) - 1.5;

    function xPx(i)  { return padL + (i / (n - 1)) * chartW; }
    function yPx(v)  { return padT + chartH * (1 - (v - yMin) / (yMax - yMin)); }

    const yRange = yMax - yMin;
    const yStep  = yRange > 20 ? 4 : yRange > 10 ? 2 : 1;
    let grid = "", yLbl = "";
    for (let t = Math.ceil(yMin / yStep) * yStep; t <= yMax + 0.01; t += yStep) {
      const y    = yPx(t).toFixed(1);
      const zero = Math.abs(t) < 0.01;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${zero ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.05)'}" stroke-width="${zero ? 1 : 0.5}"/>`;
      yLbl += `<text x="${W - padR + 6}" y="${parseFloat(y) + 4}" fill="#8b949e" font-size="9" font-family="monospace">${t > 0 ? "+" : ""}${t.toFixed(0)}%</text>`;
    }

    let mDividers = "", mLabels = "";
    let wkIdx = 0;
    weeksPerMonth.forEach((wks, mi) => {
      const x    = xPx(wkIdx).toFixed(1);
      const midX = xPx(wkIdx + wks / 2).toFixed(1);
      mDividers += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
      mLabels   += `<text x="${midX}" y="${H - padB + 14}" fill="${mi === curMonth ? '#58a6ff' : '#8b949e'}" font-size="8.5" text-anchor="middle" font-family="monospace" font-weight="${mi === curMonth ? 'bold' : 'normal'}">${MONTH_SHORT[mi]}</text>`;
      wkIdx += wks;
    });

    const pts10   = wk10.map((v, i) => `${xPx(i).toFixed(1)},${yPx(v).toFixed(1)}`).join(" ");
    const line10  = `<polyline points="${pts10}" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-dasharray="5,4" stroke-linejoin="round"/>`;
    const curPts  = wkCur.map((v, i) => v != null ? `${xPx(i).toFixed(1)},${yPx(v).toFixed(1)}` : null).filter(Boolean);
    const lineCur = curPts.length > 1 ? `<polyline points="${curPts.join(" ")}" fill="none" stroke="#e05c6a" stroke-width="2.5" stroke-linejoin="round"/>` : "";
    const zeroY   = yPx(0).toFixed(1);
    const baseline = `<line x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;

    const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      ${grid}${mDividers}${baseline}${line10}${lineCur}${mLabels}${yLbl}
    </svg>`;

    const avg10cur = m10[curMonth];
    const sigCol   = avg10cur >= 0.5 ? "var(--bull)" : avg10cur <= -0.5 ? "var(--bear)" : "var(--neutral)";

    html += `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-family:var(--mono);font-size:12px;font-weight:bold;color:var(--text)">Full Year Seasonality — ${pair.name}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-dasharray="5,3"/></svg>10 Year Avg
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
      <strong style="color:rgba(255,255,255,.8)">White dashed</strong> = 10-year cumulative avg.
      <strong style="color:#e05c6a">Red line</strong> = current YTD.
      Current month (<strong style="color:var(--accent)">${MONTH_NAMES[curMonth]}</strong>): 10yr avg <strong style="color:${sigCol}">${avg10cur > 0 ? "+" : ""}${avg10cur.toFixed(2)}%</strong>
    </div>`;
  }

  // ── MONTHLY VIEW ──
  else {
    const m10 = pair.m10, mCur = pair.mCur;
    const W = 700, H = 260, padL = 52, padR = 16, padT = 28, padB = 50;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = 12, barW = chartW / n * 0.55;

    const allVals = [...m10, ...mCur.filter(v => v != null), 0];
    const yMax = Math.max(...allVals) * 1.25 + 0.2;
    const yMin = Math.min(...allVals) * 1.25 - 0.2;

    function xCenter(i) { return padL + i * (chartW / n) + (chartW / n) / 2; }
    function yPx(v)     { return padT + chartH * (1 - (v - yMin) / (yMax - yMin)); }
    const zero = yPx(0);

    const yRange = yMax - yMin;
    const yStep  = yRange > 8 ? 2 : yRange > 4 ? 1 : 0.5;
    let grid = "", yLbl = "";
    for (let t = Math.ceil(yMin / yStep) * yStep; t <= yMax + 0.01; t = parseFloat((t + yStep).toFixed(4))) {
      const y   = yPx(t).toFixed(1);
      const isZ = Math.abs(t) < 0.001;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${isZ ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)'}" stroke-width="${isZ ? 1 : 0.5}"/>`;
      yLbl += `<text x="${padL - 6}" y="${parseFloat(y) + 4}" fill="#8b949e" font-size="9" text-anchor="end" font-family="monospace">${t > 0 ? "+" : ""}${t.toFixed(2)}%</text>`;
    }

    let bars = "", barLabels = "", curDots = "", curHighlight = "";
    m10.forEach((v, i) => {
      const cx    = xCenter(i);
      const x     = cx - barW / 2;
      const y     = v >= 0 ? yPx(v) : zero;
      const h     = Math.max(2, Math.abs(yPx(v) - zero));
      const isCur = i === curMonth;
      if (isCur) curHighlight = `<rect x="${padL + i * (chartW / n) + 2}" y="${padT}" width="${chartW / n - 4}" height="${chartH}" fill="rgba(88,166,255,.06)" rx="2"/>`;
      const barCol = isCur ? "#4a90d9" : i < curMonth ? "rgba(74,144,217,.9)" : "rgba(74,144,217,.5)";
      bars       += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${barCol}" rx="2"/>`;
      const lbl   = (v > 0 ? "+" : "") + v.toFixed(2) + "%";
      const ly    = v >= 0 ? y - 5 : parseFloat(y) + h + 11;
      barLabels  += `<text x="${cx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${isCur ? '#fff' : 'rgba(255,255,255,.8)'}" font-size="8" text-anchor="middle" font-family="monospace" font-weight="${isCur ? 'bold' : 'normal'}">${lbl}</text>`;
      const cv    = mCur[i];
      if (cv != null) {
        const dy  = yPx(cv);
        curDots  += `<circle cx="${cx.toFixed(1)}" cy="${dy.toFixed(1)}" r="5" fill="white" stroke="#0d1117" stroke-width="1.5"/>`;
      }
      barLabels += `<text x="${cx.toFixed(1)}" y="${H - padB + 14}" fill="${isCur ? '#58a6ff' : '#8b949e'}" font-size="8.5" text-anchor="middle" font-family="monospace" font-weight="${isCur ? 'bold' : 'normal'}">${MONTH_NAMES[i]}</text>`;
    });

    const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      ${grid}${curHighlight}${bars}${barLabels}${curDots}
    </svg>`;

    const v10cur = m10[curMonth];
    const vCur   = mCur[curMonth];
    const sigCol = v10cur >= 0.2 ? "var(--bull)" : v10cur <= -0.2 ? "var(--bear)" : "var(--neutral)";

    html += `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-family:var(--mono);font-size:12px;font-weight:bold;color:var(--text)">Seasonality — Avg. returns by month — ${pair.name}</div>
        <div style="display:flex;gap:16px">
          <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:12px;height:10px;background:rgba(74,144,217,.9);border-radius:2px"></div>10 Year Avg
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--muted)">
            <div style="width:10px;height:10px;background:white;border-radius:50%"></div>This Year
          </div>
        </div>
      </div>
      <div style="overflow-x:auto">${svg}</div>
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;display:inline-block;min-width:200px">
      <div style="font-family:var(--mono);font-size:11px;font-weight:bold;color:var(--text);margin-bottom:6px">${MONTH_NAMES[curMonth]}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:3px">
        <span style="display:inline-block;width:10px;height:10px;background:rgba(74,144,217,.9);border-radius:2px;margin-right:5px;vertical-align:middle"></span>
        10 Year Avg: <strong style="color:${sigCol}">${v10cur > 0 ? "+" : ""}${v10cur.toFixed(2)}%</strong>
      </div>
      ${vCur != null ? `<div style="font-family:var(--mono);font-size:10px;color:var(--muted)">
        <span style="display:inline-block;width:10px;height:10px;background:white;border-radius:50%;margin-right:5px;vertical-align:middle"></span>
        This Year: <strong style="color:${vCur > 0 ? "var(--bull)" : "var(--bear)"}">${vCur > 0 ? "+" : ""}${vCur.toFixed(2)}%</strong>
      </div>` : ""}
    </div>
    <div class="infobox ib-blue">
      <span class="iblabel" style="color:var(--accent)">ℹ MONTHLY SEASONALITY — 10-Year Historical Averages (2014–2024)</span>
      <strong style="color:rgba(74,144,217,.9)">Blue bars</strong> = 10-year avg monthly return.
      <strong style="color:white">White dot</strong> = current year actual.
      <strong style="color:var(--accent)">Highlighted column</strong> = current month.
    </div>`;
  }

  document.getElementById("page-seasonality").innerHTML = html;
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function renderSettings(state) {
  const { mfxEmail, fredKey, putCallLive, aaiiLive } = state;

  document.getElementById("page-settings").innerHTML = `
  <div class="sectitle">API Settings</div>
  <div class="apibox"><h3>🟢 ALREADY CONNECTED — NO KEY NEEDED</h3>
    <div class="infobox ib-green" style="margin-bottom:0">
      <strong style="color:var(--bull)">Frankfurter.app</strong> — Live forex rates for Currency Strength<br>
      <strong style="color:var(--bull)">Alternative.me</strong> — Fear & Greed Index · Daily<br>
      <strong style="color:var(--bull)">CFTC.gov</strong> — COT Data · Auto-fetched every Friday<br>
      <strong style="color:${putCallLive ? "var(--bull)" : "var(--neutral)"}">CBOE</strong> — Put/Call Ratio · ${putCallLive ? "● LIVE" : "Attempting live fetch..."}<br>
      <strong style="color:${aaiiLive ? "var(--bull)" : "var(--neutral)"}">AAII</strong> — Investor Survey · ${aaiiLive ? "● LIVE" : "Attempting live fetch..."}
    </div>
  </div>
  <div class="apibox">
    <h3>😊 MYFXBOOK — Live Retail Sentiment (Free)</h3>
    <div class="key-status ${mfxEmail ? "key-ok" : "key-missing"}">${mfxEmail ? "✅ Myfxbook connected — Retail sentiment is LIVE" : "⚠ No credentials — Sentiment showing demo data"}</div>
    <div style="font-size:11px;color:var(--muted);margin:10px 0;line-height:1.8">
      1. Register free at <span style="color:var(--accent)">myfxbook.com</span><br>
      2. Enter your email and password below<br>
      3. Tap Save — live sentiment loads automatically ✅<br>
      <span style="color:var(--neutral)">⚠ Credentials stored only on your device.</span>
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
    ${mfxEmail ? `<button onclick="clearMyfxbook()" style="background:var(--bg4);color:var(--muted);border:1px solid var(--border);border-radius:5px;padding:8px 14px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-left:8px">Clear</button>` : ""}
  </div>
  <div class="apibox"><h3>🌡 FRED API — Live GDP, CPI, Rates (Free)</h3>
    <div class="key-status ${fredKey ? "key-ok" : "key-missing"}">${fredKey ? "✅ FRED key saved — Economic data is LIVE" : "⚠ No key — Economic showing demo data"}</div>
    <div class="apirow" style="margin-top:10px">
      <span class="apilbl">FRED Key</span>
      <input class="apiinp" id="fred-input" placeholder="fred.stlouisfed.org → My Account → API Keys" value="${fredKey}"/>
      <button class="apibtn" onclick="saveFREDKey()">💾 Save</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.8">
      1. Go to <span style="color:var(--accent)">fred.stlouisfed.org</span><br>
      2. Click <strong style="color:var(--text)">My Account → API Keys → Request API Key</strong><br>
      3. Paste above → Save ✅
    </div>
  </div>
  <div class="apibox"><h3>📱 ADD TO HOME SCREEN</h3>
    <div style="font-size:11px;color:var(--muted);line-height:2.1">
      <strong style="color:var(--text)">Android Chrome</strong> → Tap ⋮ → "Add to Home screen"<br>
      <strong style="color:var(--text)">iPhone Safari</strong> → Tap Share → "Add to Home Screen"<br>
      <span style="color:var(--bull)">✅ Opens full screen like a native app</span>
    </div>
  </div>`;
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────

function showTip(e, id, lp, sp) {
  const t = document.getElementById("tooltip");
  t.innerHTML = `<strong style="color:var(--text)">${id}</strong><br><span style="color:#4a90d9">Long: ${lp.toFixed(2)}%</span><br><span style="color:#e05c6a">Short: ${sp.toFixed(2)}%</span>`;
  t.style.display = "block";
  t.style.left    = (e.clientX + 14) + "px";
  t.style.top     = (e.clientY - 10) + "px";
}

function hideTip() {
  document.getElementById("tooltip").style.display = "none";
}
