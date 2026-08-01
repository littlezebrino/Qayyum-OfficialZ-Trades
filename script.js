/* ==========================================
   BTC AI MOMENTUM DETECTOR
   PART 1
========================================== */

let scanRunning = false;
let countdown = 30;
let scanTimer = null;

const scanBtn = document.getElementById("scanBtn");
const countdownEl = document.getElementById("countdown");
const statusDot = document.getElementById("statusDot");
const scanStatus = document.getElementById("scanStatus");

const btcPriceEl = document.getElementById("btcLivePrice");

async function loadBTCPrice() {

    try {

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
        );

        const data = await response.json();

        btcPriceEl.innerHTML =
            "$" + Number(data.price).toLocaleString();

    } catch (error) {

        btcPriceEl.innerHTML = "Unavailable";

    }

}

loadBTCPrice();

setInterval(loadBTCPrice,5000);

function startMomentumScan(){

    if(scanRunning) return;

    scanRunning = true;

    countdown = 30;

    scanBtn.disabled = true;

    statusDot.classList.add("active");

    scanStatus.innerHTML = "Scanning BTC...";

    countdownEl.innerHTML = countdown;

    scanTimer = setInterval(function(){

        countdown--;

        countdownEl.innerHTML = countdown;

        if(countdown <= 0){

            clearInterval(scanTimer);

            finishMomentumScan();

        }

    },1000);

}


/* ==========================================
   BTC AI MOMENTUM DETECTOR
   PART 2 (FINAL)
========================================== */

function finishMomentumScan(){

    const resultBox = document.getElementById("momentumResult");
    const confidence = document.getElementById("confidenceValue");
    const analysis = document.getElementById("analysisText");

    const trend = document.getElementById("trendValue");
    const rsi = document.getElementById("rsiValue");
    const ema = document.getElementById("emaValue");
    const volume = document.getElementById("volumeValue");

    const lastScan = document.getElementById("lastScanTime");
    const history = document.getElementById("historyContainer");

    /* ---------- Demo Logic ----------
       Baad me yahan RSI + EMA + Smart Money
       + Divergence logic lagaya ja sakta hai.
    ---------------------------------*/

    const random = Math.random();

    let signal = "";
    let signalClass = "";
    let conf = 0;

    if(random < 0.45){

        signal = "🟢 BULLISH";
        signalClass = "bullish";
        conf = Math.floor(Math.random()*11)+85;

        trend.textContent = "UPTREND";
        rsi.textContent = Math.floor(Math.random()*15)+55;
        ema.textContent = "BUY";
        volume.textContent = "HIGH";

        analysis.textContent =
        "Momentum is positive. Buyers appear stronger than sellers.";

    }else if(random < 0.90){

        signal = "🔴 BEARISH";
        signalClass = "bearish";
        conf = Math.floor(Math.random()*11)+85;

        trend.textContent = "DOWNTREND";
        rsi.textContent = Math.floor(Math.random()*15)+30;
        ema.textContent = "SELL";
        volume.textContent = "HIGH";

        analysis.textContent =
        "Selling pressure is stronger. Bearish momentum detected.";

    }else{

        signal = "🟡 NEUTRAL";
        signalClass = "neutral";
        conf = Math.floor(Math.random()*11)+70;

        trend.textContent = "SIDEWAYS";
        rsi.textContent = 50;
        ema.textContent = "WAIT";
        volume.textContent = "NORMAL";

        analysis.textContent =
        "No clear momentum detected. Better to wait.";

    }

    resultBox.className = "momentum-result " + signalClass;
    resultBox.textContent = signal;

    confidence.textContent = conf + "%";

    const now = new Date().toLocaleTimeString();

    lastScan.textContent = now;

    history.innerHTML =
    `
        <div class="history-item">
            <span class="history-time">${now}</span>
            <span class="history-result">${signal}</span>
            <span class="history-confidence">${conf}%</span>
        </div>
    ` + history.innerHTML;

    statusDot.classList.remove("active");
    scanStatus.textContent = "Scan Complete";

    scanBtn.disabled = false;

    countdownEl.textContent = "30";

    scanRunning = false;

}
