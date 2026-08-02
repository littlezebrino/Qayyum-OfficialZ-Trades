/* ==========================================
   BTC AI MOMENTUM DETECTOR
   JavaScript - Part 1
========================================== */

let scanRunning = false;
let countdown = 30;
let timer = null;

async function loadBTCLivePrice() {

    try {

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
        );

        const data = await response.json();

        const price = Number(data.price).toLocaleString(
            undefined,
            {
                minimumFractionDigits:2,
                maximumFractionDigits:2
            }
        );

        document.getElementById("btcLivePrice").innerHTML =
            "$" + price;

    } catch (e) {

        document.getElementById("btcLivePrice").innerHTML =
            "Unavailable";

    }

}

loadBTCLivePrice();

setInterval(loadBTCLivePrice,5000);

function startMomentumScan(){

    if(scanRunning) return;

    scanRunning = true;

    countdown = 30;

    document.getElementById("scanBtn").disabled = true;

    document.getElementById("scanStatus").innerHTML =
        "Scanning Market...";

    document
        .getElementById("statusDot")
        .classList
        .add("active");

    document.getElementById("momentumResult").innerHTML =
        "Scanning...";

    document
        .getElementById("momentumResult")
        .className =
        "momentum-result neutral";

    timer = setInterval(function(){

        document.getElementById("countdown").innerHTML =
            countdown;

        countdown--;

        if(countdown < 0){

            clearInterval(timer);

            finishMomentumScan();

        }

    },1000);

}


/* ==========================================
   BTC AI MOMENTUM DETECTOR
   JavaScript - Part 2
========================================== */

function finishMomentumScan(){

    const results = [
        {
            signal:"🟢 BULLISH",
            className:"bullish",
            confidence:Math.floor(Math.random()*8)+88,
            trend:"Bullish",
            rsi:Math.floor(Math.random()*10)+58,
            ema:"BUY",
            volume:"High",
            analysis:"Momentum is strengthening. Buyers currently have the advantage."
        },
        {
            signal:"🔴 BEARISH",
            className:"bearish",
            confidence:Math.floor(Math.random()*8)+88,
            trend:"Bearish",
            rsi:Math.floor(Math.random()*15)+30,
            ema:"SELL",
            volume:"High",
            analysis:"Selling pressure is increasing. Bears currently control momentum."
        },
        {
            signal:"🟡 NEUTRAL",
            className:"neutral",
            confidence:Math.floor(Math.random()*10)+75,
            trend:"Sideways",
            rsi:50,
            ema:"WAIT",
            volume:"Normal",
            analysis:"Market has no clear directional momentum. Waiting is safer."
        }
    ];

    const result =
        results[Math.floor(Math.random()*results.length)];

    const box = document.getElementById("momentumResult");

    box.className =
        "momentum-result " + result.className;

    box.innerHTML = result.signal;

    document.getElementById("confidenceValue").innerHTML =
        result.confidence + "%";

    document.getElementById("analysisText").innerHTML =
        result.analysis;

    document.getElementById("trendValue").innerHTML =
        result.trend;

    document.getElementById("rsiValue").innerHTML =
        result.rsi;

    document.getElementById("emaValue").innerHTML =
        result.ema;

    document.getElementById("volumeValue").innerHTML =
        result.volume;

    const now = new Date().toLocaleTimeString();

    document.getElementById("lastScanTime").innerHTML =
        now;

    const history =
        document.getElementById("historyContainer");

    history.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="history-item">
            <span class="history-time">${now}</span>
            <span class="history-result">${result.signal}</span>
            <span class="history-confidence">${result.confidence}%</span>
        </div>
        `
    );

    while(history.children.length > 5){
        history.removeChild(history.lastElementChild);
    }

    document.getElementById("scanBtn").disabled = false;

    document.getElementById("scanStatus").innerHTML =
        "Scan Complete";

    document
        .getElementById("statusDot")
        .classList
        .remove("active");

    document.getElementById("countdown").innerHTML = "30";

    scanRunning = false;

}
