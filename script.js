// ==========================================
// BTC QUANT SCANNER ENGINE - UPDATED
// PART 1
// ==========================================


// ===============================
// ELEMENTS
// ===============================

const btcPrice = document.getElementById("btcPrice");
const priceChange = document.getElementById("priceChange");

const scanBtn = document.getElementById("scanBtn");
const scanTimer = document.getElementById("scanTimer");
const scanStatus = document.getElementById("scanStatus");

const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");

const momentum = document.getElementById("momentum");
const liquidity = document.getElementById("liquidity");

const rsiBox = document.getElementById("rsi");
const emaBox = document.getElementById("ema");
const volumeBox = document.getElementById("volume");
const volatilityBox = document.getElementById("volatility");

const voiceText = document.getElementById("voiceText");




// ===============================
// MARKET VARIABLES
// ===============================


let prices = [];

let volumes = [];

let currentPrice = 0;

let dayChange = 0;

let currentVolume = 0;




// ===============================
// LIVE BTC PRICE STREAM
// ===============================


const socket = new WebSocket(
    "wss://stream.binance.com:9443/ws/btcusdt@trade"
);



socket.onmessage = (event)=>{


    const data = JSON.parse(event.data);


    currentPrice = parseFloat(data.p);


    currentVolume = parseFloat(data.q);



    btcPrice.innerHTML =
    "$" + currentPrice.toFixed(2);



    prices.push(currentPrice);

    volumes.push(currentVolume);



    if(prices.length > 100){

        prices.shift();

    }


    if(volumes.length > 100){

        volumes.shift();

    }



    updateChart(currentPrice);


    updateIndicators();


};






// ===============================
// 24 HOUR BTC CHANGE
// ===============================


async function get24HourChange(){


    try{


        const response =
        await fetch(
        "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
        );


        const data =
        await response.json();



        dayChange =
        parseFloat(data.priceChangePercent);



        priceChange.innerHTML =
        (dayChange >= 0 ? "+" : "")
        +
        dayChange.toFixed(2)
        +
        "%";



        priceChange.style.color =
        dayChange >= 0
        ? "#00ff88"
        : "#ff4d6d";



    }

    catch(error){


        console.log(
        "24H data error",
        error
        );


    }


}



get24HourChange();



setInterval(
    get24HourChange,
    10000
);





// ===============================
// LIVE CHART SETUP
// ===============================


let chart;



function createChart(){


    const ctx =
    document
    .getElementById("priceChart")
    .getContext("2d");



    chart =
    new Chart(
        ctx,
        {

            type:"line",

            data:{


                labels:[],


                datasets:[{

                    label:"BTC Price",

                    data:[],

                    borderColor:"#00f5ff",

                    borderWidth:2,

                    tension:0.4,

                    pointRadius:0

                }]


            },


            options:{


                responsive:true,


                maintainAspectRatio:false,


                plugins:{


                    legend:{


                        display:false


                    }


                },


                scales:{


                    x:{


                        display:false


                    },


                    y:{


                        display:false


                    }


                }


            }


        }
    );


}



createChart();





function updateChart(price){


    if(!chart)
    return;



    chart.data.labels.push("");

    chart.data.datasets[0].data.push(price);



    if(chart.data.labels.length > 50){


        chart.data.labels.shift();

        chart.data.datasets[0]
        .data.shift();


    }



    chart.update("none");


}


// ==========================================
// BTC QUANT SCANNER ENGINE
// PART 2
// INDICATORS ENGINE
// ==========================================



// ===============================
// RSI CALCULATION
// ===============================


function calculateRSI(data){


    if(data.length < 15){

        return 50;

    }



    let gains = 0;

    let losses = 0;



    for(
        let i = data.length - 14;
        i < data.length;
        i++
    ){


        let difference =
        data[i] - data[i-1];



        if(difference > 0){

            gains += difference;

        }

        else{

            losses += Math.abs(difference);

        }


    }



    let averageGain =
    gains / 14;



    let averageLoss =
    losses / 14;



    if(averageLoss === 0){

        return 100;

    }



    let rs =
    averageGain / averageLoss;



    return 100 - (100/(1+rs));


}





// ===============================
// EMA CALCULATION
// ===============================


function calculateEMA(data, period=20){



    if(data.length < period){

        return currentPrice;

    }



    let multiplier =
    2/(period+1);



    let ema =
    data[0];



    for(
        let i=1;
        i<data.length;
        i++
    ){


        ema =
        (
            data[i]-ema
        )
        *
        multiplier
        +
        ema;


    }



    return ema;


}







// ===============================
// VOLUME ANALYSIS
// ===============================


function analyzeVolume(){



    if(volumes.length < 10){

        return {
            value:"Collecting",
            power:"LOW"
        };

    }



    let average =

    volumes.reduce(
        (a,b)=>a+b,
        0
    )
    /
    volumes.length;



    let latest =
    volumes[volumes.length-1];



    let power;



    if(latest > average * 1.5){

        power="HIGH";

    }

    else if(latest < average * 0.7){

        power="LOW";

    }

    else{

        power="NORMAL";

    }



    return {


        value:
        latest.toFixed(4)
        +
        " BTC",


        power:power


    };

}





// ===============================
// VOLATILITY ANALYSIS
// ===============================


function analyzeVolatility(){



    if(prices.length < 20){

        return "Collecting";

    }




    let ema =
    calculateEMA(prices);



    let difference =
    Math.abs(
        currentPrice - ema
    );



    let level;



    if(difference > 80){

        level="HIGH";

    }

    else if(difference > 30){

        level="MEDIUM";

    }

    else{

        level="LOW";

    }




    return (

        difference.toFixed(2)

        +

        " "

        +

        level

    );


}







// ===============================
// UPDATE ALL INDICATORS
// ===============================


function updateIndicators(){



    let rsi =
    calculateRSI(prices);



    let ema =
    calculateEMA(prices);



    let volume =
    analyzeVolume();




    rsiBox.innerHTML =
    rsi.toFixed(1);




    emaBox.innerHTML =

    currentPrice > ema

    ?

    "BULLISH"

    :

    "BEARISH";





    volumeBox.innerHTML =

    volume.value
    +
    " "
    +
    volume.power;





    volatilityBox.innerHTML =

    analyzeVolatility();



}


// ==========================================
// BTC QUANT SCANNER ENGINE
// PART 3
// SMART MONEY + ANALYSIS ENGINE
// ==========================================



// ===============================
// LIQUIDITY MAGNET ENGINE
// ===============================


function findLiquidityMagnet(){


    if(prices.length < 20){

        return "Collecting Data";

    }



    let recentPrices =
    prices.slice(-20);



    let high =
    Math.max(...recentPrices);



    let low =
    Math.min(...recentPrices);



    let distanceHigh =
    Math.abs(
        high - currentPrice
    );



    let distanceLow =
    Math.abs(
        currentPrice - low
    );



    // Closest liquidity pool

    if(distanceHigh < distanceLow){


        return (
            "$"
            +
            high.toFixed(2)
            +
            " HIGH LIQUIDITY"
        );


    }

    else{


        return (

            "$"
            +
            low.toFixed(2)
            +
            " LOW LIQUIDITY"

        );


    }


}






// ===============================
// MARKET STRUCTURE
// ===============================


function marketStructure(){


    if(prices.length < 30){

        return "NEUTRAL";

    }



    let previous =
    prices[prices.length-20];



    if(currentPrice > previous){

        return "UPTREND";

    }

    else if(currentPrice < previous){

        return "DOWNTREND";

    }

    else{

        return "SIDEWAYS";

    }



}





// ===============================
// SCAN SYSTEM
// ===============================


let scanning=false;



scanBtn.onclick = ()=>{



    if(scanning)
    return;



    scanning=true;



    scanBtn.disabled=true;



    let seconds=30;



    scanTimer.innerHTML =
    seconds;



    scanStatus.innerHTML =
    "Scanning liquidity + momentum...";




    let timer =
    setInterval(()=>{



        seconds--;



        scanTimer.innerHTML =
        seconds;



        if(seconds<=0){


            clearInterval(timer);


            runAnalysis();


        }



    },1000);



};







// ===============================
// FINAL AI ANALYSIS
// ===============================


function runAnalysis(){



    let score=0;



    let rsi =
    calculateRSI(prices);



    let ema =
    calculateEMA(prices);



    let structure =
    marketStructure();





    // EMA TREND


    if(currentPrice > ema){


        score +=25;


        momentum.innerHTML =
        "BUY PRESSURE";


    }

    else{


        score -=25;


        momentum.innerHTML =
        "SELL PRESSURE";


    }






    // RSI


    if(rsi <35){


        score +=20;


    }



    else if(rsi >70){


        score -=20;


    }






    // Market Structure


    if(structure==="UPTREND"){


        score +=20;


    }


    else if(structure==="DOWNTREND"){


        score -=20;


    }






    // Volume Confirmation


    let volume =
    analyzeVolume();



    if(volume.power==="HIGH"){


        score +=10;


    }






    // Volatility Filter


    let volatility =
    analyzeVolatility();



    if(
        volatility.includes("HIGH")
    ){


        score -=10;


    }







    // RESULT


    let result;



    let confidenceScore =

    Math.min(

        95,

        Math.abs(score)+50

    );







    if(score >= 25){


        result="LONG";


        signal.style.color =
        "#00ff88";



        speak(
        "Analysis complete. Long opportunity detected."
        );


    }



    else if(score <= -25){



        result="SHORT";



        signal.style.color =
        "#ff4d6d";



        speak(
        "Analysis complete. Short opportunity detected."
        );


    }




    else{


        result="WAIT";


        signal.style.color =
        "#ffd166";



        speak(
        "Analysis complete. Market is unclear."
        );


    }






    signal.innerHTML =
    result;



    confidence.innerHTML =
    confidenceScore
    +
    "%";



    liquidity.innerHTML =
    findLiquidityMagnet();



    scanTimer.innerHTML =
    "READY";



    scanStatus.innerHTML =
    "Analysis completed";



    scanBtn.disabled=false;



    scanning=false;



        }


// ==========================================
// BTC QUANT SCANNER ENGINE
// PART 4 FINAL
// VOICE + CONNECTION + CLEANUP
// ==========================================



// ===============================
// WEBSOCKET RECONNECT
// ===============================


socket.onclose = ()=>{


    console.log(
        "Connection lost. Reloading..."
    );


    setTimeout(()=>{


        location.reload();


    },3000);



};





socket.onerror = (error)=>{


    console.log(
        "WebSocket Error",
        error
    );


};






// ===============================
// SCANNER ANIMATION
// ===============================


const scannerCircle =
document.querySelector(
    ".scanner-circle"
);



scanBtn.addEventListener(
"click",
()=>{


    if(scannerCircle){


        scannerCircle.style.animation =
        "spin 2s linear infinite";


    }


});





function stopScannerAnimation(){


    if(scannerCircle){


        scannerCircle.style.animation =
        "none";


    }


}







// Stop animation after analysis


const oldRunAnalysis =
runAnalysis;



window.runAnalysis =
function(){


    oldRunAnalysis();


    stopScannerAnimation();


};







// ===============================
// VOICE SYSTEM
// ===============================


function speak(text){



    voiceText.innerHTML =
    text;



    // remove previous voice

    window.speechSynthesis.cancel();




    let speech =
    new SpeechSynthesisUtterance();



    speech.text =
    text;



    speech.rate =
    0.9;



    speech.pitch =
    1;



    window.speechSynthesis.speak(
        speech
    );



}






// ===============================
// INITIAL STATUS
// ===============================


window.onload = ()=>{


    console.log(
        "BTC Quantum Scanner Ready"
    );


};
