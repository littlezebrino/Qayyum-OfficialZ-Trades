// ==========================
// COINS
// ==========================

const coins = [
  { symbol: "BTCUSDT", id: "btc" },
  { symbol: "ETHUSDT", id: "eth" },
  { symbol: "SOLUSDT", id: "sol" },
  { symbol: "XRPUSDT", id: "xrp" },
  { symbol: "LINKUSDT", id: "link" }
];

// ==========================
// PERFORMANCE STORAGE
// ==========================

let performance = JSON.parse(localStorage.getItem("performance")) || {
  totalSignals: 0,
  wins: 0,
  losses: 0,
  openTrades: []
};

// ==========================
// UPDATE DASHBOARD
// ==========================

function updatePerformanceDashboard() {

  document.getElementById("total-signals").textContent =
    performance.totalSignals;

  document.getElementById("wins").textContent =
    performance.wins;

  document.getElementById("losses").textContent =
    performance.losses;

  let accuracy = 0;

  if (performance.totalSignals > 0) {
    accuracy =
      (performance.wins / performance.totalSignals) * 100;
  }

  document.getElementById("accuracy").textContent =
    accuracy.toFixed(1) + "%";

  localStorage.setItem(
    "performance",
    JSON.stringify(performance)
  );
}

updatePerformanceDashboard();

// ==========================
// LIVE PRICE
// ==========================

async function loadPrice(symbol, id) {

  try {

    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );

    const data = await res.json();

    document.getElementById(id + "-price").textContent =
      "$" + Number(data.price).toLocaleString();

  } catch (err) {

    console.log(err);

  }

}

function updatePrices() {

  coins.forEach(c => {

    loadPrice(c.symbol, c.id);

  });

}

updatePrices();

setInterval(updatePrices, 5000);
// =====================================
// EMA
// =====================================

function EMA(prices, period) {

    const k = 2 / (period + 1);

    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {

        ema = prices[i] * k + ema * (1 - k);

    }

    return ema;

}

// =====================================
// RSI
// =====================================

function RSI(prices, period = 14) {

    let gain = 0;
    let loss = 0;

    for (let i = prices.length - period; i < prices.length; i++) {

        const diff = prices[i] - prices[i - 1];

        if (diff > 0) {

            gain += diff;

        } else {

            loss += Math.abs(diff);

        }

    }

    if (loss === 0) return 100;

    const rs = gain / loss;

    return 100 - (100 / (1 + rs));

}

// =====================================
// SIGNAL ENGINE
// =====================================

async function generateSignal(coin) {

    try {

        const response = await fetch(

            `https://api.binance.com/api/v3/klines?symbol=${coin.symbol}&interval=15m&limit=100`

        );

        const candles = await response.json();

        const closes = candles.map(c => Number(c[4]));

        const price = closes[closes.length - 1];

        const ema20 = EMA(closes, 20);

        const ema50 = EMA(closes, 50);

        const rsi = RSI(closes);

        let signal = "WAIT";
        let bias = "Neutral";
        let confidence = 50;

        if (price > ema20 && ema20 > ema50 && rsi > 55) {

            signal = "LONG";
            bias = "Bullish";
            confidence = 82;

        }

        else if (price < ema20 && ema20 < ema50 && rsi < 45) {

            signal = "SHORT";
            bias = "Bearish";
            confidence = 82;

        }

        let sl = "--";
        let tp1 = "--";
        let tp2 = "--";
        let tp3 = "--";

        if (signal === "LONG") {

            sl = (price * 0.99).toFixed(4);
            tp1 = (price * 1.01).toFixed(4);
            tp2 = (price * 1.02).toFixed(4);
            tp3 = (price * 1.03).toFixed(4);

        }

        if (signal === "SHORT") {

            sl = (price * 1.01).toFixed(4);
            tp1 = (price * 0.99).toFixed(4);
            tp2 = (price * 0.98).toFixed(4);
            tp3 = (price * 0.97).toFixed(4);

        }

        const id = coin.id;

        document.getElementById(id + "-signal").textContent = signal;
        document.getElementById(id + "-bias").textContent = bias;
        document.getElementById(id + "-confidence").textContent = confidence + "%";
        document.getElementById(id + "-entry").textContent = "$" + price.toFixed(4);
        document.getElementById(id + "-sl").textContent = "$" + sl;
        document.getElementById(id + "-tp1").textContent = "$" + tp1;
        document.getElementById(id + "-tp2").textContent = "$" + tp2;
        document.getElementById(id + "-tp3").textContent = "$" + tp3;
        document.getElementById(id + "-rsi").textContent = rsi.toFixed(2);
        document.getElementById(id + "-trend").textContent =
            ema20 > ema50 ? "UPTREND" : "DOWNTREND";

        document.getElementById(id + "-analysis").textContent =
`${coin.symbol}: ${bias} | RSI ${rsi.toFixed(2)} | Confidence ${confidence}%`;


// Performance Dashboard Count

if(signal !== "WAIT"){

performance.totalSignals++;

localStorage.setItem(
"performance",
JSON.stringify(performance)
);

updatePerformanceDashboard();

}


    }

    catch (error) {

        console.log(error);

    }

}

// =====================================
// RUN SIGNAL ENGINE
// =====================================

function updateSignals() {

    coins.forEach(coin => {

        generateSignal(coin);

    });

}

updateSignals();

setInterval(updateSignals, 60000);
// ======================================
// PERFORMANCE TRACKER
// ======================================

function savePerformance(){

    localStorage.setItem(
        "performance",
        JSON.stringify(performance)
    );

}

function addWin(){

    performance.totalSignals++;

    performance.wins++;

    savePerformance();

    updatePerformanceDashboard();

}

function addLoss(){

    performance.totalSignals++;

    performance.losses++;

    savePerformance();

    updatePerformanceDashboard();

}

function resetPerformance(){

    performance={
        totalSignals:0,
        wins:0,
        losses:0,
        openTrades:[]
    };

    savePerformance();

    updatePerformanceDashboard();

}

// ======================================
// MANUAL TRADE CLOSE
// ======================================

function closeTrade(result){

    if(result==="WIN"){

        addWin();

    }

    else if(result==="LOSS"){

        addLoss();

    }

}

// ======================================
// KEYBOARD SHORTCUTS
// W = WIN
// L = LOSS
// R = RESET
// ======================================

document.addEventListener("keydown",function(e){

    if(e.key==="w" || e.key==="W"){

        closeTrade("WIN");

    }

    if(e.key==="l" || e.key==="L"){

        closeTrade("LOSS");

    }

    if(e.key==="r" || e.key==="R"){

        if(confirm("Reset Performance Dashboard?")){

            resetPerformance();

        }

    }

});

updatePerformanceDashboard();
// ======================================
// TRADING CALCULATOR
// ======================================

function calculateTrade(){

    const type =
        document.getElementById("trade-type").value;

    const entry =
        parseFloat(document.getElementById("entry-price").value);

    const exit =
        parseFloat(document.getElementById("exit-price").value);

    const amount =
        parseFloat(document.getElementById("amount").value);

    if(isNaN(entry) || isNaN(exit) || isNaN(amount)){

        alert("Please fill all fields correctly.");

        return;

    }

    let change = 0;

    if(type === "long"){

        change = (exit - entry) / entry;

    }else{

        change = (entry - exit) / entry;

    }

    const profit = amount * change;

    const percent = change * 100;

    document.getElementById("profit").textContent =
        profit.toFixed(2) + " USDT";

    document.getElementById("percentage").textContent =
        percent.toFixed(2) + "%";

    const rr = Math.abs(exit - entry) / (entry * 0.01);

    document.getElementById("rr").textContent =
        rr.toFixed(2) + " R";

}

// ======================================
// AI ANALYSIS
// ======================================

function updateAIAnalysis(){

    coins.forEach(coin=>{

        const id = coin.id;

        const signal =
            document.getElementById(id+"-signal").textContent;

        const bias =
            document.getElementById(id+"-bias").textContent;

        const rsi =
            document.getElementById(id+"-rsi").textContent;

        const confidence =
            document.getElementById(id+"-confidence").textContent;

        let message = "";

        if(signal==="LONG"){

            message =
            "Bullish setup | RSI " +
            rsi +
            " | " +
            bias +
            " | Confidence " +
            confidence;

        }

        else if(signal==="SHORT"){

            message =
            "Bearish setup | RSI " +
            rsi +
            " | " +
            bias +
            " | Confidence " +
            confidence;

        }

        else{

            message =
            "Market is neutral. Waiting for confirmation.";

        }

        document.getElementById(id+"-analysis").textContent =
            message;

    });

}

updateAIAnalysis();

setInterval(updateAIAnalysis,5000);
// ======================================
// APP STARTUP
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    // Dashboard
    updatePerformanceDashboard();

    // Live Prices
    updatePrices();

    // Signals
    updateSignals();

    // AI Analysis
    updateAIAnalysis();

});

// Auto Refresh

setInterval(updatePrices, 5000);

setInterval(updateSignals, 60000);

setInterval(updateAIAnalysis, 5000);

// ======================================
// GLOBAL ERROR HANDLER
// ======================================

window.addEventListener("error", (e) => {

    console.log("App Error:", e.message);

});

window.addEventListener("unhandledrejection", (e) => {

    console.log("Promise Error:", e.reason);

});


// ===== LIVE PERFORMANCE TRACKER =====

let performanceData = JSON.parse(localStorage.getItem("performanceData")) || {
    total:0,
    wins:0,
    losses:0
};


function updateDashboard(){

    document.getElementById("total-signals").innerHTML =
    performanceData.total;

    document.getElementById("wins").innerHTML =
    performanceData.wins;

    document.getElementById("losses").innerHTML =
    performanceData.losses;


    let accuracy = 0;

    if(performanceData.total > 0){

        accuracy =
        (performanceData.wins / performanceData.total) * 100;

    }


    document.getElementById("accuracy").innerHTML =
    accuracy.toFixed(1)+"%";


}



function savePerformance(){

localStorage.setItem(
"performanceData",
JSON.stringify(performanceData)
);

updateDashboard();

}



// Jab naya signal aaye
function addNewSignal(){

performanceData.total++;

savePerformance();

}



// TP hit
function signalWin(){

performanceData.wins++;

savePerformance();

}



// SL hit
function signalLoss(){

performanceData.losses++;

savePerformance();

}



// Load dashboard
updateDashboard();
