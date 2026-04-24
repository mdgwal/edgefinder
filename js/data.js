// data.js — Static data, storage helpers, state

// ── STORAGE ───────────────────────────────────────────────────────────────────
function saveKey(k,v){try{localStorage.setItem('ef_'+k,v);}catch(e){}}
function loadKey(k){try{return localStorage.getItem('ef_'+k)||'';}catch(e){return'';}}

const TABS_DEF=[
  {id:"scorecard",  label:"📋 Scorecard"},
  {id:"forex",      label:"💹 Forex Scorecard"},
  {id:"setups",    label:"⚡ Top Setups"},
  {id:"cot",       label:"🏦 COT Data"},
  {id:"sentiment", label:"😊 Sentiment"},
  {id:"econ",      label:"🌡 Economic"},
  {id:"currency",  label:"💱 Currency"},
  {id:"carry",     label:"YIELD ENGINE"},
  {id:"feargreed", label:"😨 Fear/Greed"},
  {id:"seasonality",label:"🌱 Seasonality"},
  {id:"settings",  label:"⚙ Settings"},
];
let activeTab="setups";
let sentSubTab="retail";
let ecoSubTab="meter";

// ── FALLBACK SENTIMENT DATA ───────────────────────────────────────────────────
const FALLBACK_SENTIMENT=[
  {name:"EURUSD",longPercentage:38,shortPercentage:62,longVolume:12450,shortVolume:20300,longPositions:1240,shortPositions:2030},
  {name:"GBPUSD",longPercentage:61,shortPercentage:39,longVolume:8900,shortVolume:5700,longPositions:890,shortPositions:570},
  {name:"USDJPY",longPercentage:72,shortPercentage:28,longVolume:15600,shortVolume:6100,longPositions:1560,shortPositions:610},
  {name:"AUDUSD",longPercentage:44,shortPercentage:56,longVolume:6200,shortVolume:7900,longPositions:620,shortPositions:790},
  {name:"USDCAD",longPercentage:29,shortPercentage:71,longVolume:4100,shortVolume:10000,longPositions:410,shortPositions:1000},
  {name:"USDCHF",longPercentage:55,shortPercentage:45,longVolume:5500,shortVolume:4500,longPositions:550,shortPositions:450},
  {name:"NZDUSD",longPercentage:48,shortPercentage:52,longVolume:3200,shortVolume:3500,longPositions:320,shortPositions:350},
  {name:"GBPJPY",longPercentage:65,shortPercentage:35,longVolume:7800,shortVolume:4200,longPositions:780,shortPositions:420},
  {name:"EURJPY",longPercentage:68,shortPercentage:32,longVolume:9100,shortVolume:4300,longPositions:910,shortPositions:430},
  {name:"AUDJPY",longPercentage:59,shortPercentage:41,longVolume:4400,shortVolume:3100,longPositions:440,shortPositions:310},
  {name:"EURGBP",longPercentage:42,shortPercentage:58,longVolume:5100,shortVolume:7000,longPositions:510,shortPositions:700},
  {name:"XAUUSD",longPercentage:74,shortPercentage:26,longVolume:22000,shortVolume:7700,longPositions:2200,shortPositions:770},
  {name:"XAGUSD",longPercentage:69,shortPercentage:31,longVolume:8800,shortVolume:3900,longPositions:880,shortPositions:390},
  {name:"USOIL",longPercentage:58,shortPercentage:42,longVolume:14500,shortVolume:10500,longPositions:1450,shortPositions:1050},
  {name:"US500",longPercentage:66,shortPercentage:34,longVolume:18000,shortVolume:9300,longPositions:1800,shortPositions:930},
  {name:"NAS100",longPercentage:67,shortPercentage:33,longVolume:16000,shortVolume:7900,longPositions:1600,shortPositions:790},
  {name:"US30",longPercentage:63,shortPercentage:37,longVolume:11000,shortVolume:6500,longPositions:1100,shortPositions:650},
  {name:"BTCUSD",longPercentage:31,shortPercentage:69,longVolume:9200,shortVolume:20500,longPositions:920,shortPositions:2050},
  {name:"ETHUSD",longPercentage:28,shortPercentage:72,longVolume:7100,shortVolume:18200,longPositions:710,shortPositions:1820},
];

// Smart Money divergence (COT-based)
const SMART_MONEY=[
  {id:"EURUSD",retailLong:38,institutionalLong:67},{id:"GBPUSD",retailLong:61,institutionalLong:70},
  {id:"USDJPY",retailLong:72,institutionalLong:31},{id:"AUDUSD",retailLong:44,institutionalLong:54},
  {id:"USDCAD",retailLong:29,institutionalLong:21},{id:"XAUUSD",retailLong:74,institutionalLong:84},
  {id:"USOIL",retailLong:58,institutionalLong:69},{id:"US500",retailLong:66,institutionalLong:51},
  {id:"BTCUSD",retailLong:31,institutionalLong:48},{id:"GBPJPY",retailLong:65,institutionalLong:35},
  {id:"EURJPY",retailLong:68,institutionalLong:28},{id:"NZDUSD",retailLong:48,institutionalLong:52},
];
const PUT_CALL=[
  {id:"SPX500",pc:0.82,meaning:"More calls = bullish bias"},
  {id:"NAS100",pc:0.74,meaning:"Strong call buying = very bullish"},
  {id:"VIX",   pc:1.45,meaning:"High put buying on VIX = hedging"},
  {id:"GOLD",  pc:0.65,meaning:"Strong call buying = bullish"},
  {id:"USOIL", pc:0.91,meaning:"Balanced options activity"},
  {id:"BTCUSD",pc:0.58,meaning:"Heavy call buying = bullish"},
  {id:"EURUSD",pc:1.12,meaning:"Slight put bias = mild bearish"},
  {id:"USDJPY",pc:1.38,meaning:"Heavy put buying = bearish"},
  {id:"XAUUSD",pc:0.71,meaning:"Strong call buying = bullish"},
  {id:"US10T", pc:1.89,meaning:"Heavy put buying = very bearish bonds"},
];
const AAII={bullish:{val:28.4,hist:37.5,change:-2.1},neutral:{val:31.2,hist:31.5,change:0.8},bearish:{val:40.4,hist:31.0,change:1.3},spread:-12.0,week:"Mar 13, 2026"};
const EXTREMES=[
  {id:"US10T",  direction:"EXTREME SHORT",retailPct:22,historicalAvg:45,deviation:-23,signal:"CONTRARIAN BUY",  strength:"Strong"},
  {id:"USDJPY", direction:"EXTREME LONG", retailPct:72,historicalAvg:50,deviation:+22,signal:"CONTRARIAN SELL", strength:"Strong"},
  {id:"XAUUSD", direction:"EXTREME LONG", retailPct:74,historicalAvg:55,deviation:+19,signal:"CONTRARIAN SELL", strength:"Strong"},
  {id:"ETHUSD", direction:"EXTREME SHORT",retailPct:28,historicalAvg:48,deviation:-20,signal:"CONTRARIAN BUY",  strength:"Strong"},
  {id:"BTCUSD", direction:"EXTREME SHORT",retailPct:31,historicalAvg:52,deviation:-21,signal:"CONTRARIAN BUY",  strength:"Strong"},
  {id:"EURJPY", direction:"EXTREME LONG", retailPct:68,historicalAvg:50,deviation:+18,signal:"CONTRARIAN SELL", strength:"Moderate"},
  {id:"GBPJPY", direction:"EXTREME LONG", retailPct:65,historicalAvg:50,deviation:+15,signal:"CONTRARIAN SELL", strength:"Moderate"},
  {id:"NAS100", direction:"EXTREME LONG", retailPct:67,historicalAvg:52,deviation:+15,signal:"CONTRARIAN SELL", strength:"Moderate"},
  {id:"USDCAD", direction:"EXTREME SHORT",retailPct:29,historicalAvg:45,deviation:-16,signal:"CONTRARIAN BUY",  strength:"Moderate"},
];

// ── COT DATA ──────────────────────────────────────────────────────────────────
const COT_DATA=[
  {id:"AUD",     longC:101462,shortC:86934, dLong:19538, dShort:-6238, longPct:53.86,shortPct:46.14,netChg:7.07, netPos:14528,  oi:201000, dOI:24590},
  {id:"PLATINUM",longC:46316, shortC:18184, dLong:213,   dShort:-3518, longPct:71.81,shortPct:28.19,netChg:3.81, netPos:28132,  oi:73000,  dOI:-2535},
  {id:"SPX",     longC:310790,shortC:302790,dLong:20074, dShort:-24059,longPct:50.65,shortPct:49.35,netChg:3.58, netPos:8000,   oi:2092000,dOI:36417},
  {id:"NZD",     longC:29168, shortC:27198, dLong:2693,  dShort:-735,  longPct:51.75,shortPct:48.25,netChg:3.09, netPos:1970,   oi:61000,  dOI:6091},
  {id:"COPPER",  longC:108421,shortC:65229, dLong:12159, dShort:2097,  longPct:62.44,shortPct:37.56,netChg:2.04, netPos:43192,  oi:241000, dOI:14446},
  {id:"ZAR",     longC:35100, shortC:2161,  dLong:-544,  dShort:-849,  longPct:94.20,shortPct:5.80, netChg:1.99, netPos:32939,  oi:41000,  dOI:-734},
  {id:"GBP",     longC:161469,shortC:67704, dLong:6144,  dShort:-629,  longPct:70.46,shortPct:29.54,netChg:1.01, netPos:93765,  oi:257000, dOI:5671},
  {id:"DOW",     longC:25145, shortC:8095,  dLong:1922,  dShort:308,   longPct:75.65,shortPct:24.35,netChg:0.76, netPos:17050,  oi:90000,  dOI:1925},
  {id:"NIKKEI",  longC:5851,  shortC:2379,  dLong:-1354, dShort:-582,  longPct:71.09,shortPct:28.91,netChg:0.22, netPos:3472,   oi:35000,  dOI:-1527},
  {id:"USOIL",   longC:294894,shortC:135286,dLong:3465,  dShort:2454,  longPct:68.55,shortPct:31.45,netChg:-0.14,netPos:159608, oi:1771000,dOI:-9057},
  {id:"BTC",     longC:23406, shortC:25090, dLong:-450,  dShort:-312,  longPct:48.26,shortPct:51.74,netChg:-0.17,netPos:-1684,  oi:29000,  dOI:-2003},
  {id:"Gold",    longC:370051,shortC:70120, dLong:-17521,dShort:-2062, longPct:84.07,shortPct:15.93,netChg:-0.23,netPos:299931, oi:533000, dOI:-31533},
  {id:"RUSSELL", longC:85570, shortC:65221, dLong:228,   dShort:1786,  longPct:56.75,shortPct:43.25,netChg:-0.61,netPos:20349,  oi:452000, dOI:9512},
  {id:"NASDAQ",  longC:56497, shortC:40418, dLong:3882,  dShort:3842,  longPct:58.30,shortPct:41.70,netChg:-0.70,netPos:16079,  oi:234000, dOI:6362},
  {id:"CAD",     longC:25151, shortC:95154, dLong:-154,  dShort:4260,  longPct:20.91,shortPct:79.09,netChg:-0.87,netPos:-70003, oi:216000, dOI:2880},
  {id:"SILVER",  longC:75588, shortC:18664, dLong:-5441, dShort:-167,  longPct:80.20,shortPct:19.80,netChg:-0.94,netPos:56924,  oi:145000, dOI:-5314},
  {id:"USD",     longC:13829, shortC:13675, dLong:-2695, dShort:-1890, longPct:50.28,shortPct:49.72,netChg:-1.21,netPos:154,    oi:26000,  dOI:-708},
  {id:"US10T",   longC:454080,shortC:1597969,dLong:-13748,dShort:104863,longPct:22.13,shortPct:77.87,netChg:-1.73,netPos:-1143889,oi:4969000,dOI:27266},
  {id:"JPY",     longC:95513, shortC:38741, dLong:-9177, dShort:62,    longPct:71.14,shortPct:28.86,netChg:-1.88,netPos:56772,  oi:196000, dOI:-11502},
  {id:"EUR",     longC:220000,shortC:110000,dLong:8500,  dShort:-3200, longPct:66.67,shortPct:33.33,netChg:1.20, netPos:110000, oi:380000, dOI:5300},
  {id:"CHF",     longC:12000, shortC:48000, dLong:-800,  dShort:1200,  longPct:20.00,shortPct:80.00,netChg:-0.50,netPos:-36000, oi:65000,  dOI:400},
];

const ASSETS_SCORED=[
  {id:"DOW",    name:"DOW",    cat:"Index",    cot:2,retail:0, seasonal:1, trend:2, gdp:1, mPMI:1, sPMI:1, retailSal:1, inflation:-1,empChg:1, unemploy:1, rates:-1},
  {id:"Gold",   name:"GOLD",   cat:"Commodity",cot:2,retail:1, seasonal:1, trend:2, gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:1, empChg:0, unemploy:0, rates:1},
  {id:"GBP",    name:"GBPUSD", cat:"Forex",    cot:2,retail:-1,seasonal:0, trend:1, gdp:1, mPMI:0, sPMI:1, retailSal:0, inflation:-1,empChg:0, unemploy:0, rates:0},
  {id:"USOIL",  name:"USOIL",  cat:"Commodity",cot:2,retail:0, seasonal:0, trend:1, gdp:1, mPMI:1, sPMI:0, retailSal:0, inflation:1, empChg:0, unemploy:0, rates:-1},
  {id:"COPPER", name:"COPPER", cat:"Commodity",cot:1,retail:0, seasonal:1, trend:1, gdp:0, mPMI:1, sPMI:1, retailSal:1, inflation:0, empChg:1, unemploy:1, rates:-1},
  {id:"NASDAQ", name:"NASDAQ", cat:"Index",    cot:1,retail:0, seasonal:1, trend:2, gdp:1, mPMI:1, sPMI:1, retailSal:1, inflation:-1,empChg:1, unemploy:1, rates:-1},
  {id:"SPX500", name:"SPX500", cat:"Index",    cot:0,retail:0, seasonal:1, trend:1, gdp:1, mPMI:1, sPMI:1, retailSal:1, inflation:-1,empChg:1, unemploy:1, rates:-1},
  {id:"EUR",    name:"EURUSD", cat:"Forex",    cot:1,retail:1, seasonal:0, trend:0, gdp:-1,mPMI:-1,sPMI:0, retailSal:-1,inflation:-1,empChg:0, unemploy:-1,rates:0},
  {id:"AUD",    name:"AUDUSD", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:-1,gdp:0, mPMI:0, sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"NZD",    name:"NZDUSD", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:-1,gdp:0, mPMI:-1,sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"RUSSELL",name:"RUSSELL",cat:"Index",    cot:0,retail:0, seasonal:1, trend:1, gdp:1, mPMI:0, sPMI:0, retailSal:1, inflation:-1,empChg:1, unemploy:1, rates:-1},
  {id:"SILVER", name:"SILVER", cat:"Commodity",cot:1,retail:0, seasonal:0, trend:1, gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:1, empChg:0, unemploy:0, rates:1},
  {id:"BTC",    name:"BITCOIN",cat:"Crypto",   cot:-1,retail:0,seasonal:0, trend:-2,gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:0, empChg:0, unemploy:0, rates:-1},
  {id:"JPY",    name:"USDJPY", cat:"Forex",    cot:1,retail:-2,seasonal:-1,trend:-1,gdp:-1,mPMI:-1,sPMI:-1,retailSal:-1,inflation:0, empChg:-1,unemploy:0, rates:-2},
  {id:"CAD",    name:"USDCAD", cat:"Forex",    cot:-2,retail:1,seasonal:0, trend:0, gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"USD",    name:"USD IDX",cat:"Forex",    cot:0,retail:0, seasonal:0, trend:-1,gdp:1, mPMI:1, sPMI:1, retailSal:1, inflation:-1,empChg:1, unemploy:1, rates:-1},
  {id:"CHF",    name:"USDCHF", cat:"Forex",    cot:-2,retail:-1,seasonal:0,trend:-1,gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"US10T",  name:"US10T",  cat:"Index",    cot:-2,retail:0,seasonal:-1,trend:-2,gdp:1, mPMI:0, sPMI:0, retailSal:0, inflation:-1,empChg:0, unemploy:0, rates:-1},
  {id:"GBPJPY", name:"GBPJPY", cat:"Forex",    cot:1,retail:-1,seasonal:0, trend:1, gdp:0, mPMI:0, sPMI:1, retailSal:0, inflation:-1,empChg:0, unemploy:0, rates:1},
  {id:"AUDCHF", name:"AUDCHF", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:0, gdp:0, mPMI:0, sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  // ── Additional instruments ────────────────────────────────────────────────
  {id:"ETH",   name:"ETHUSD", cat:"Crypto",   cot:-1,retail:0,seasonal:0, trend:-1,gdp:0, mPMI:0, sPMI:0, retailSal:0, inflation:0, empChg:0, unemploy:0, rates:-1},
  {id:"NZDUSD",name:"NZDUSD", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:-1,gdp:0, mPMI:-1,sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"EURJPY",name:"EURJPY", cat:"Forex",    cot:0,retail:-1,seasonal:0, trend:-1,gdp:-1,mPMI:-1,sPMI:0, retailSal:-1,inflation:0, empChg:0, unemploy:-1,rates:-2},
  {id:"AUDJPY",name:"AUDJPY", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:-1,gdp:0, mPMI:0, sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:-1},
  {id:"NZDJPY",name:"NZDJPY", cat:"Forex",    cot:0,retail:0, seasonal:-1,trend:-1,gdp:0, mPMI:-1,sPMI:-1,retailSal:0, inflation:0, empChg:0, unemploy:0, rates:-2},
  {id:"EURGBP",name:"EURGBP", cat:"Forex",    cot:0,retail:1, seasonal:0, trend:-1,gdp:-1,mPMI:-1,sPMI:0, retailSal:-1,inflation:0, empChg:0, unemploy:-1,rates:0},
  {id:"EURAUD",name:"EURAUD", cat:"Forex",    cot:0,retail:0, seasonal:0, trend:1, gdp:-1,mPMI:-1,sPMI:0, retailSal:-1,inflation:0, empChg:0, unemploy:0, rates:0},
  {id:"GBPAUD",name:"GBPAUD", cat:"Forex",    cot:1,retail:-1,seasonal:0, trend:2, gdp:1, mPMI:0, sPMI:1, retailSal:0, inflation:-1,empChg:0, unemploy:0, rates:0},
].map(a=>{
  a.total=a.cot+a.retail+a.seasonal+a.trend+a.gdp+a.mPMI+a.sPMI+a.retailSal+a.inflation+a.empChg+a.unemploy+a.rates;
  a.bias=a.total>=8?"Very Bullish":a.total>=5?"Bullish":a.total>=2?"Mild Bullish":a.total<=-8?"Very Bearish":a.total<=-5?"Bearish":a.total<=-2?"Mild Bearish":"Neutral";
  return a;
}).sort((a,b)=>b.total-a.total);

const CURRS=[
  {code:"USD",name:"US Dollar"},{code:"EUR",name:"Euro"},
  {code:"GBP",name:"British Pound"},{code:"JPY",name:"Japanese Yen"},
  {code:"AUD",name:"Australian Dollar"},{code:"CAD",name:"Canadian Dollar"},
  {code:"CHF",name:"Swiss Franc"},{code:"NZD",name:"New Zealand Dollar"},
];
const FOREX_PAIRS=[
  {id:"EURUSD",base:"EUR",quote:"USD"},{id:"GBPUSD",base:"GBP",quote:"USD"},
  {id:"USDJPY",base:"USD",quote:"JPY"},{id:"AUDUSD",base:"AUD",quote:"USD"},
  {id:"USDCAD",base:"USD",quote:"CAD"},{id:"USDCHF",base:"USD",quote:"CHF"},
  {id:"NZDUSD",base:"NZD",quote:"USD"},
];
const CARRY_PAIRS=[
  {pair:"NZDJPY",long:"NZD",short:"JPY",rate:5.50,score:9,trend:"Bullish",vol:"Low",confidence:"High",
   reasons:["Highest rate differential in G10","JPY carry funding remains cheap","Low realized volatility regime"]},
  {pair:"GBPJPY",long:"GBP",short:"JPY",rate:5.15,score:8,trend:"Bullish",vol:"Low",confidence:"High",
   reasons:["Strong GBP fundamentals vs JPY","Rate divergence widening","Momentum confirming direction"]},
  {pair:"USDJPY",long:"USD",short:"JPY",rate:5.25,score:8,trend:"Bullish",vol:"Medium",confidence:"High",
   reasons:["Fed-BoJ divergence at cycle extremes","USD liquidity premium intact","Key support levels holding"]},
  {pair:"AUDJPY",long:"AUD",short:"JPY",rate:4.35,score:7,trend:"Bullish",vol:"Low",confidence:"Medium",
   reasons:["RBA rate stance supportive","China growth stabilizing","Low vol favors carry"]},
  {pair:"CADJPY",long:"CAD",short:"JPY",rate:5.00,score:6,trend:"Neutral",vol:"Medium",confidence:"Medium",
   reasons:["Solid rate diff but oil sensitivity","BoC path less certain","Moderate carry conditions"]},
  {pair:"NZDCHF",long:"NZD",short:"CHF",rate:3.75,score:6,trend:"Neutral",vol:"Low",confidence:"Medium",
   reasons:["Moderate differential","CHF SNB policy uncertain","Pair lacks strong momentum"]},
  {pair:"AUDCHF",long:"AUD",short:"CHF",rate:2.60,score:4,trend:"Neutral",vol:"Medium",confidence:"Low",
   reasons:["Below-average rate differential","CHF risk-off demand caps upside","Mixed macro signals"]},
  {pair:"EURCHF",long:"EUR",short:"CHF",rate:2.25,score:2,trend:"Bearish",vol:"High",confidence:"Low",
   reasons:["EUR macro deteriorating","SNB intervention risk elevated","Carry not compensating vol"]},
];
const FALLBACK_ECON={
  USD:[{l:"GDP YoY",v:"2.8%",s:.3,d:"Q4 2025"},{l:"CPI YoY",v:"3.1%",s:-.1,d:"Feb 2026"},{l:"Unemploy",v:"4.1%",s:0,d:"Feb 2026"},{l:"Fed Rate",v:"5.25%",s:0,d:"Mar 2026"}],
  EUR:[{l:"GDP YoY",v:"0.4%",s:-.2,d:"Q4 2025"},{l:"CPI YoY",v:"2.6%",s:-.4,d:"Feb 2026"},{l:"Unemploy",v:"6.1%",s:.1,d:"Jan 2026"},{l:"ECB Rate",v:"4.50%",s:0,d:"Mar 2026"}],
  GBP:[{l:"GDP YoY",v:"0.6%",s:.2,d:"Q3 2025"},{l:"CPI YoY",v:"3.4%",s:-.3,d:"Feb 2026"},{l:"Unemploy",v:"4.2%",s:-.1,d:"Jan 2026"},{l:"BOE Rate",v:"5.25%",s:0,d:"Mar 2026"}],
  JPY:[{l:"GDP YoY",v:"0.1%",s:-.5,d:"Q3 2025"},{l:"CPI YoY",v:"2.8%",s:.2,d:"Feb 2026"},{l:"Unemploy",v:"2.4%",s:.1,d:"Jan 2026"},{l:"BOJ Rate",v:"0.10%",s:.1,d:"Mar 2026"}],
};
const FLAGS={USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵"};
const FRED_SERIES={
  USD:[{label:"GDP YoY",id:"A191RL1Q225SBEA",fmt:v=>v.toFixed(1)+"%"},{label:"CPI YoY",id:"CPIAUCSL",fmt:v=>v.toFixed(1)+"%",yoy:true},{label:"Unemploy",id:"UNRATE",fmt:v=>v.toFixed(1)+"%"},{label:"Fed Rate",id:"FEDFUNDS",fmt:v=>v.toFixed(2)+"%"}],
  EUR:[{label:"GDP YoY",id:"CLVMEURSCAB1GQEA19",fmt:v=>v.toFixed(1)+"%"},{label:"CPI YoY",id:"CP0000EZ19M086NEST",fmt:v=>v.toFixed(1)+"%"},{label:"Unemploy",id:"LRHUTTTTEZM156S",fmt:v=>v.toFixed(1)+"%"},{label:"ECB Rate",id:"ECBDFR",fmt:v=>v.toFixed(2)+"%"}],
  GBP:[{label:"GDP YoY",id:"CLVMNACSCAB1GQUK",fmt:v=>v.toFixed(1)+"%"},{label:"CPI YoY",id:"GBRCPIALLMINMEI",fmt:v=>v.toFixed(1)+"%",yoy:true},{label:"Unemploy",id:"LRHUTTTTGBM156S",fmt:v=>v.toFixed(1)+"%"},{label:"BOE Rate",id:"IUDSOIA",fmt:v=>v.toFixed(2)+"%"}],
  JPY:[{label:"GDP YoY",id:"JPNRGDPEXP",fmt:v=>v.toFixed(1)+"%"},{label:"CPI YoY",id:"JPNCPIALLMINMEI",fmt:v=>v.toFixed(1)+"%",yoy:true},{label:"Unemploy",id:"JPNURYNAA",fmt:v=>v.toFixed(1)+"%"},{label:"BOJ Rate",id:"IRSTJPN156N",fmt:v=>v.toFixed(2)+"%"}],
};
function buildFallbackFG(){
  const base=[14,18,21,19,23,17,15,20,25,22,18,16,13,11,15,19,23,28,24,20,17,14,12,16,20,18,15,12,10,14];
  return base.map((v,i)=>({value:String(v),value_classification:fgLabel(v),timestamp:String(Math.floor((Date.now()-(i*86400000))/1000))}));
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let state={
  rates:null,prevRates:null,cdata:null,
  fredKey:loadKey('fred'),
  avKey:loadKey('av'),
  mfxEmail:loadKey('mfx_email'),
  mfxPassword:loadKey('mfx_password'),
  mfxSession:loadKey('mfx_session'),
  econData:null,econLive:false,econLoading:false,
  fgData:buildFallbackFG(),fgLive:false,
  // Sentiment data — starts with fallback, replaced by live Myfxbook data
  sentimentData:FALLBACK_SENTIMENT,
  sentimentLive:false,
  sentimentLoading:false,
  filterCat:"All",cotSort:{col:"netChg",dir:-1},
  setupsView:"full",setupsHistoryAsset:"DOW",
  sentFilter:"All",
  seasonFilter:"All",
  seasonAsset:"XAUUSD",
  seasonView:"monthly",
  // COT live data from CFTC
  cotData:null,cotLive:false,cotLoading:false,cotLastUpdate:null,
  seasonLastFetch:0,seasonFetching:false,
  putCallData:null,putCallLive:false,
  aaiiData:null,aaiiLive:false,
  scAsset:"Gold",
  scForexPair:"EURUSD",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function biasColor(b){if(b.includes("Very Bullish")||b.includes("Bullish"))return"var(--bull)";if(b.includes("Mild Bullish"))return"#7effc4";if(b.includes("Very Bearish")||b.includes("Bearish"))return"var(--bear)";if(b.includes("Mild Bearish"))return"#ff8fa0";return"var(--neutral)";}
function cellClass(v){if(v>=2)return"c2";if(v===1)return"c1";if(v===0)return"c0";if(v===-1)return"cm1";return"cm2";}
// hm(v): inline style for heatmap gradient cells (-2..+2 typical, up to ±10)
function hm(v){
  var n = Math.max(-10, Math.min(10, v));
  var abs = Math.abs(n);
  var bull = n > 0;
  var bg_a = abs===0 ? 0 : abs<=1 ? 0.07 : abs<=2 ? 0.13 : abs<=3 ? 0.20 : abs<=5 ? 0.24 : 0.28;
  var tx_a = abs===0 ? 0.35 : abs<=1 ? 0.55 : abs<=2 ? 0.72 : abs<=3 ? 0.88 : abs<=5 ? 0.96 : 1.0;
  if (abs === 0) return 'background:var(--bg2);color:rgba(255,255,255,.35);transition:background-color .3s ease';
  var r = bull ? 0   : (abs<=1 ? 210 : abs<=2 ? 230 : 250);
  var g = bull ? (abs<=1 ? 200 : abs<=2 ? 220 : abs<=3 ? 240 : 255) : 50;
  var b = bull ? (abs<=1 ? 160 : abs<=2 ? 120 : 80) : 60;
  return 'background:rgba('+r+','+g+','+b+','+bg_a+');color:rgba('+r+','+g+','+b+','+tx_a+');transition:background-color .3s ease,color .3s ease';
}
// hmTotal(v): heatmap style for score column (-10..+10)
function hmTotal(v){
  var n = Math.max(-10, Math.min(10, v));
  var abs = Math.abs(n);
  var bull = n >= 0;
  var bg_a = abs<=1 ? 0.04 : abs<=4 ? 0.08 : abs<=7 ? 0.13 : 0.18;
  var tx_a = abs<=1 ? 0.55 : abs<=4 ? 0.75 : abs<=7 ? 0.92 : 1.0;
  if (abs === 0) return 'color:rgba(255,255,255,.4)';
  var r = bull ? 0   : (abs<=4 ? 220 : 255);
  var g = bull ? (abs<=4 ? 220 : 255) : 55;
  var bv= bull ? (abs<=4 ? 130 : 88)  : 65;
  return 'background:rgba('+r+','+g+','+bv+','+bg_a+');color:rgba('+r+','+g+','+bv+','+tx_a+');transition:background-color .3s ease,color .3s ease';
}
function totalColor(t){if(t>=8)return"var(--bull)";if(t>=4)return"#7effc4";if(t<=-8)return"var(--bear)";if(t<=-4)return"#ff8fa0";return"var(--neutral)";}
function fgColor(v){if(v>=75)return"var(--bull)";if(v>=55)return"#7effc4";if(v>=45)return"var(--neutral)";if(v>=25)return"#ff8fa0";return"var(--bear)";}
function fgLabel(v){if(v>=75)return"EXTREME GREED";if(v>=55)return"GREED";if(v>=45)return"NEUTRAL";if(v>=25)return"FEAR";return"EXTREME FEAR";}
function fmtK(n){if(Math.abs(n)>=1000000)return(n/1000000).toFixed(2)+"M";if(Math.abs(n)>=1000)return(n/1000).toFixed(0)+"K";return String(n);}
