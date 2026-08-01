// ======================================
// MOMENTUM RADAR AI
// JavaScript Part 1/4
// BTCUSDT 15M Binance Engine
// ======================================



const API = {

    ticker:
    "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",

    candles:
    "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=100"

};






// ================================
// GLOBAL VARIABLES
// ================================


let marketData = [];

let currentPrice = 0;

let voiceEnabled = true;

let autoScan = true;

let lastSignal = "WAIT";







// ================================
// DOM ELEMENTS
// ================================


const btcPrice =
document.getElementById("btcPrice");


const priceChange =
document.getElementById("priceChange");


const apiStatus =
document.getElementById("apiStatus");


const lastScan =
document.getElementById("lastScan");


const scanButton =
document.getElementById("scanButton");


const autoScanButton =
document.getElementById("autoScanButton");


const voiceToggle =
document.getElementById("voiceToggle");


const muteButton =
document.getElementById("muteButton");









// ================================
// BINANCE CONNECTION
// ================================



async function connectBinance(){


    try {


        apiStatus.innerHTML =
        "● Binance Connected";


        apiStatus.className =
        "online";



        await loadMarketData();



    }


    catch(error){


        console.log(
            "Binance Error:",
            error
        );


        apiStatus.innerHTML =
        "● Connection Failed";


        apiStatus.className =
        "offline";


    }


}








// ================================
// GET BTC PRICE
// ================================



async function getBTCPrice(){


    try{


        let response =
        await fetch(API.ticker);


        let data =
        await response.json();



        currentPrice =
        Number(data.lastPrice);



        btcPrice.innerHTML =
        "$" +
        currentPrice.toLocaleString();



        priceChange.innerHTML =
        Number(data.priceChangePercent)
        .toFixed(2)
        + "%";




    }


    catch(error){


        console.log(
            "Price Error",
            error
        );


    }


}









// ================================
// GET CANDLE DATA
// ================================



async function getCandles(){


    try{


        let response =
        await fetch(API.candles);


        let candles =
        await response.json();




        marketData =
        candles.map(candle => {


            return {


                time:
                candle[0],


                open:
                Number(candle[1]),


                high:
                Number(candle[2]),


                low:
                Number(candle[3]),


                close:
                Number(candle[4]),


                volume:
                Number(candle[5])

            };


        });



        return marketData;



    }


    catch(error){


        console.log(
            "Candle Error",
            error
        );


    }


}









// ================================
// LOAD EVERYTHING
// ================================



async function loadMarketData(){


    await getBTCPrice();


    await getCandles();



    lastScan.innerHTML =
    new Date()
    .toLocaleTimeString();



}









// ================================
// MANUAL SCAN BUTTON
// ================================



scanButton.addEventListener(
"click",
async()=>{


    await loadMarketData();


    console.log(
        "Manual Scan Completed"
    );


});








// ================================
// AUTO SCAN
// ================================



setInterval(()=>{


    if(autoScan){


        loadMarketData();


    }



},60000);








// ================================
// VOICE CONTROLS
// ================================



voiceToggle.addEventListener(
"click",
()=>{


    voiceEnabled =
    !voiceEnabled;



    if(voiceEnabled){


        voiceToggle.innerHTML =
        "🔊 Voice ON";


    }

    else{


        voiceToggle.innerHTML =
        "🔇 Voice OFF";


    }



});





muteButton.addEventListener(
"click",
()=>{


    voiceEnabled = false;


    voiceToggle.innerHTML =
    "🔇 Voice OFF";


});








// ================================
// START SYSTEM
// ================================



connectBinance();


// ======================================
// JavaScript Part 2/4
// Indicators & Market Intelligence Engine
// ======================================





// ================================
// EMA CALCULATION
// ================================


function calculateEMA(data, period){


    if(data.length < period){

        return 0;

    }



    let multiplier =
    2 / (period + 1);



    let ema =
    data.slice(0,period)
    .reduce(
        (a,b)=>a+b,
        0
    ) / period;




    for(
        let i = period;
        i < data.length;
        i++
    ){


        ema =
        (data[i]-ema)
        *
        multiplier
        +
        ema;


    }



    return ema;


}








// ================================
// RSI CALCULATION
// ================================



function calculateRSI(prices, period=14){



    if(prices.length <= period){

        return 50;

    }



    let gains = 0;

    let losses = 0;



    for(
        let i=1;
        i<=period;
        i++
    ){



        let change =
        prices[i]-prices[i-1];



        if(change > 0){

            gains += change;

        }

        else{

            losses += Math.abs(change);

        }


    }





    let avgGain =
    gains / period;



    let avgLoss =
    losses / period;



    if(avgLoss === 0){

        return 100;

    }



    let rs =
    avgGain / avgLoss;



    let rsi =
    100 -
    (100/(1+rs));



    return rsi.toFixed(2);



}








// ================================
// VOLUME ANALYSIS
// ================================



function analyzeVolume(data){


    let volumes =
    data.map(
        x=>x.volume
    );



    let current =
    volumes[volumes.length-1];



    let average =
    volumes
    .reduce(
        (a,b)=>a+b,
        0
    )
    /
    volumes.length;



    let strength =
    (current / average) * 100;



    return strength.toFixed(2);



}









// ================================
// MOMENTUM RADAR
// ================================



function momentumRadar(){


    if(marketData.length===0){

        return;

    }



    let closes =
    marketData.map(
        x=>x.close
    );



    let ema20 =
    calculateEMA(
        closes,
        20
    );



    let ema50 =
    calculateEMA(
        closes,
        50
    );



    let rsi =
    Number(
        calculateRSI(
            closes
        )
    );



    let score = 50;




    // EMA TREND


    if(ema20 > ema50){

        score += 20;

    }

    else{

        score -=20;

    }





    // RSI MOMENTUM


    if(rsi > 55){

        score +=15;

    }


    else if(rsi <45){

        score -=15;

    }






    // LIMIT SCORE


    if(score >100){

        score =100;

    }


    if(score <0){

        score =0;

    }




    document
    .getElementById("momentumScore")
    .innerHTML =
    score.toFixed(0)+"%";




    if(score >=65){


        document
        .getElementById("momentumStatus")
        .innerHTML =
        "Bullish Momentum";


    }


    else if(score <=35){


        document
        .getElementById("momentumStatus")
        .innerHTML =
        "Bearish Momentum";


    }


    else{


        document
        .getElementById("momentumStatus")
        .innerHTML =
        "Neutral";


    }




    return score;


}









// ================================
// MARKET REGIME DETECTOR
// ================================



function detectMarketRegime(){



    if(marketData.length===0){

        return;

    }



    let closes =
    marketData.map(
        x=>x.close
    );



    let ema20 =
    calculateEMA(
        closes,
        20
    );



    let ema50 =
    calculateEMA(
        closes,
        50
    );




    let regime =
    "RANGE";




    if(
        ema20 > ema50
    ){


        regime =
        "UP TREND";


    }



    else if(
        ema20 < ema50
    ){


        regime =
        "DOWN TREND";


    }






    document
    .getElementById("marketRegime")
    .innerHTML =
    regime;




    document
    .getElementById("regimeStatus")
    .innerHTML =
    regime;




    return regime;



}







// ================================
// RUN INDICATORS AFTER DATA LOAD
// ================================



async function runIndicators(){


    if(marketData.length===0){

        return;

    }



    momentumRadar();


    detectMarketRegime();



      }


// ======================================
// JavaScript Part 3/4
// Volatility + Signal Decision Engine
// ======================================





// ================================
// ATR CALCULATION
// ================================


function calculateATR(data, period = 14){


    if(data.length <= period){

        return 0;

    }



    let trueRanges = [];



    for(
        let i = 1;
        i < data.length;
        i++
    ){



        let high =
        data[i].high;



        let low =
        data[i].low;



        let previousClose =
        data[i-1].close;



        let tr =
        Math.max(

            high-low,

            Math.abs(high-previousClose),

            Math.abs(low-previousClose)

        );



        trueRanges.push(tr);



    }





    let atr =
    trueRanges
    .slice(-period)
    .reduce(
        (a,b)=>a+b,
        0
    )
    /
    period;



    return atr;



}








// ================================
// VOLATILITY EXPLOSION SCANNER
// ================================



function volatilityScanner(){



    if(marketData.length===0){

        return;

    }




    let atr =
    calculateATR(
        marketData
    );



    let price =
    currentPrice;



    let volatility =
    (atr / price) * 100;



    let score =
    volatility * 100;



    document
    .getElementById("volatilityScore")
    .innerHTML =
    score.toFixed(2)+"%";





    let status =
    document
    .getElementById("volatilityStatus");





    if(score > 1.5){


        status.innerHTML =
        "🔥 Explosion Risk";


    }


    else if(score > 0.8){


        status.innerHTML =
        "⚠ Increasing";


    }


    else{


        status.innerHTML =
        "Stable";


    }



    document
    .getElementById("atrValue")
    .innerHTML =
    atr.toFixed(2);



    return score;



}









// ================================
// FINAL SIGNAL ENGINE
// ================================



function generateSignal(){



    let momentum =
    momentumRadar();



    let regime =
    detectMarketRegime();



    let volatility =
    volatilityScanner();




    let score = 50;






    // MOMENTUM WEIGHT


    if(momentum >=65){


        score +=25;


    }


    else if(momentum <=35){


        score -=25;


    }






    // MARKET REGIME WEIGHT


    if(regime==="UP TREND"){


        score +=15;


    }


    else if(regime==="DOWN TREND"){


        score -=15;


    }






    // VOLATILITY FILTER


    if(volatility > 1.5){


        score -=10;


    }






    if(score>100){

        score=100;

    }



    if(score<0){

        score=0;

    }





    let signal="WAIT";





    if(score >=65){


        signal="LONG";


    }


    else if(score <=35){


        signal="SHORT";


    }







    updateSignalUI(
        signal,
        score
    );



    return signal;



}









// ================================
// UPDATE SIGNAL DISPLAY
// ================================



function updateSignalUI(signal,confidence){



    let box =
    document
    .getElementById("tradeSignal");



    box.innerHTML =
    signal;



    box.classList.remove(
        "long",
        "short",
        "wait"
    );




    if(signal==="LONG"){


        box.classList.add(
            "long"
        );


    }


    else if(signal==="SHORT"){


        box.classList.add(
            "short"
        );


    }


    else{


        box.classList.add(
            "wait"
        );


    }






    document
    .getElementById("confidenceValue")
    .innerHTML =
    confidence.toFixed(0)+"%";




    document
    .getElementById("confidenceBar")
    .style.width =
    confidence+"%";





    document
    .getElementById("marketBias")
    .innerHTML =
    signal;



    document
    .getElementById("actionSuggestion")
    .innerHTML =
    signal;



}







// ================================
// TECHNICAL VALUES UPDATE
// ================================



function updateTechnicalPanel(){


    let closes =
    marketData.map(
        x=>x.close
    );



    let rsi =
    calculateRSI(
        closes
    );



    let volume =
    analyzeVolume(
        marketData
    );



    document
    .getElementById("rsiValue")
    .innerHTML =
    rsi;



    document
    .getElementById("volumePressure")
    .innerHTML =
    volume+"%";



          }




// ======================================
// JavaScript Part 4/4
// Final Controller + Voice + History
// ======================================





// ================================
// TEXT TO SPEECH SYSTEM
// ================================



function speakSignal(message){



    if(!voiceEnabled){

        return;

    }



    if(
        "speechSynthesis" in window
    ){



        let speech =
        new SpeechSynthesisUtterance(
            message
        );


        speech.rate = 1;

        speech.pitch = 1;



        window
        .speechSynthesis
        .speak(
            speech
        );

    }



}









// ================================
// SIGNAL HISTORY
// ================================



function addHistory(signal,confidence){



    let history =
    document
    .getElementById(
        "historyList"
    );



    let empty =
    document
    .querySelector(
        ".empty-history"
    );



    if(empty){

        empty.remove();

    }




    let row =
    document.createElement(
        "div"
    );



    row.className =
    "history-row";




    row.innerHTML = `


        <span>
            ${new Date()
            .toLocaleTimeString()}
        </span>


        <span>
            ${signal}
        </span>


        <span>
            ${confidence.toFixed(0)}%
        </span>


        <span>
            BTCUSDT
        </span>


    `;




    history
    .prepend(row);



}









// ================================
// COMPLETE MARKET SCAN
// ================================



async function completeScan(){



    await loadMarketData();




    await runIndicators();




    updateTechnicalPanel();




    let signal =
    generateSignal();




    let confidence =
    Number(
        document
        .getElementById(
            "confidenceValue"
        )
        .innerHTML
        .replace("%","")
    );





    if(signal !== lastSignal){



        speakSignal(

            "Bitcoin "

            +
            signal

            +
            " signal detected with "

            +
            confidence

            +
            " percent confidence"

        );




        addHistory(
            signal,
            confidence
        );



        lastSignal =
        signal;


    }





    document
    .getElementById(
        "lastScan"
    )
    .innerHTML =
    new Date()
    .toLocaleTimeString();





}









// ================================
// REPLACE OLD SCAN BUTTON
// ================================



scanButton.onclick =
async function(){


    await completeScan();


};








// ================================
// AUTO SCAN CONTROL
// ================================



autoScanButton.onclick =
function(){


    autoScan =
    !autoScan;




    if(autoScan){


        autoScanButton.innerHTML =
        "⏱ Auto Scan ON";


    }

    else{


        autoScanButton.innerHTML =
        "⏸ Auto Scan OFF";


    }


};








// ================================
// START FINAL ENGINE
// ================================



setTimeout(()=>{


    completeScan();


},2000);





setInterval(()=>{


    if(autoScan){


        completeScan();


    }



},900000);




// 900000 ms = 15 minutes

