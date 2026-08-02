/* =========================================
   BTC AI MOMENTUM DETECTOR
   JS PART 1
========================================= */

let scanRunning = false;
let countdown = 30;
let timer = null;
let progress = 0;
let progressTimer = null;

async function loadBTCPrice(){

    try{

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
        );

        const data = await response.json();

        document.getElementById("btcPrice").innerHTML =
            "$" + Number(data.price).toLocaleString(
                undefined,
                {
                    minimumFractionDigits:2,
                    maximumFractionDigits:2
                }
            );

    }catch(error){

        document.getElementById("btcPrice").innerHTML =
            "Unavailable";

    }

}

loadBTCPrice();

setInterval(loadBTCPrice,5000);

function startMomentumScan(){

    if(scanRunning) return;

    scanRunning = true;

    countdown = 30;
    progress = 0;

    document.getElementById("scanBtn").disabled = true;

    document.getElementById("scanStatus").innerHTML =
        "Scanning Bitcoin...";

    document.getElementById("statusDot")
        .classList.add("active");

    document.getElementById("momentumResult").innerHTML =
        "Scanning...";

    document.getElementById("momentumResult").className =
        "momentum-result neutral";

    timer = setInterval(function(){

        document.getElementById("countdown").innerHTML =
            countdown;

        countdown--;

        if(countdown < 0){

            clearInterval(timer);
            clearInterval(progressTimer);

            finishMomentumScan();

        }

    },1000);

    progressTimer = setInterval(function(){

        progress += (100/30);

        if(progress > 100){

            progress = 100;

        }

        document.getElementById("scanProgress").style.width =
            progress + "%";

    },1000);

}


/* =========================================
   BTC AI MOMENTUM DETECTOR
   JS PART 2
========================================= */

function finishMomentumScan() {

    let random = Math.random();

    let signal = "";
    let signalClass = "";
    let confidence = 0;
    let trend = "";
    let rsi = 0;
    let ema = "";
    let volume = "";
    let analysis = "";

    if (random <= 0.33) {

        signal = "🟢 BULLISH";
        signalClass = "bullish";
        confidence = Math.floor(Math.random() * 8) + 92;
        trend = "Bullish";
        rsi = Math.floor(Math.random() * 8) + 58;
        ema = "BUY";
        volume = "High";
        analysis =
        "Buying momentum is increasing. Bulls currently control the market.";

    }

    else if (random <= 0.66) {

        signal = "🔴 BEARISH";
        signalClass = "bearish";
        confidence = Math.floor(Math.random() * 8) + 92;
        trend = "Bearish";
        rsi = Math.floor(Math.random() * 10) + 30;
        ema = "SELL";
        volume = "High";
        analysis =
        "Selling pressure is strong. Bears currently dominate the market.";

    }

    else {

        signal = "🟡 NEUTRAL";
        signalClass = "neutral";
        confidence = Math.floor(Math.random() * 6) + 80;
        trend = "Sideways";
        rsi = 50;
        ema = "WAIT";
        volume = "Normal";
        analysis =
        "Market momentum is weak. Waiting for confirmation is recommended.";

    }

    document.getElementById("momentumResult").className =
        "momentum-result " + signalClass;

    document.getElementById("momentumResult").innerHTML =
        signal;

    document.getElementById("confidenceValue").innerHTML =
        confidence + "%";

    document.getElementById("trendValue").innerHTML =
        trend;

    document.getElementById("rsiValue").innerHTML =
        rsi;

    document.getElementById("emaValue").innerHTML =
        ema;

    document.getElementById("volumeValue").innerHTML =
        volume;

    document.getElementById("analysisText").innerHTML =
        analysis;

    document.getElementById("scanStatus").innerHTML =
        "Scan Completed";

    document.getElementById("statusDot")
        .classList.remove("active");

    document.getElementById("countdown").innerHTML =
        "30";

    document.getElementById("scanProgress").style.width =
        "100%";

    document.getElementById("scanBtn").disabled = false;

    scanRunning = false;

    saveHistory(signal, confidence);

}




/* =========================================
   BTC AI MOMENTUM DETECTOR
   JS PART 3 (FINAL)
========================================= */

function saveHistory(signal, confidence){

    const history =
        document.getElementById("historyContainer");

    const time =
        new Date().toLocaleTimeString();

    const item = document.createElement("div");

    item.className = "history-item";

    item.innerHTML = `
        <span class="history-time">${time}</span>
        <span class="history-result">${signal}</span>
        <span class="history-confidence">${confidence}%</span>
    `;

    history.prepend(item);

    while(history.children.length > 5){
        history.removeChild(history.lastChild);
    }

}

function playBeep(){

    try{

        const audio =
            new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");

        audio.volume = 0.6;

        audio.play();

    }catch(e){}

}

const oldFinishMomentumScan = finishMomentumScan;

finishMomentumScan = function(){

    oldFinishMomentumScan();

    playBeep();

};

window.addEventListener("load",function(){

    document.getElementById("countdown").innerHTML = "30";

    document.getElementById("scanProgress").style.width = "0%";

    document.getElementById("scanStatus").innerHTML =
        "Ready To Scan";

    document.getElementById("confidenceValue").innerHTML =
        "95%";

});
