
// ==========================================
// BTC QUANT SCANNER ENGINE
// LIQUIDITY LOGIC UPDATE VERSION
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

let currentVolume = 0;

let dayChange = 0;

let lastSignal = "WAIT";






// ===============================
// BINANCE LIVE PRICE
// ===============================


const socket = new WebSocket(
"wss://stream.binance.com:9443/ws/btcusdt@trade"
);



socket.onmessage = (event)=>{


    const data =
    JSON.parse(event.data);



    currentPrice =
    parseFloat(data.p);



    currentVolume =
    parseFloat(data.q);



    btcPrice.innerHTML =
    "$" + currentPrice.toFixed(2);




    prices.push(currentPrice);

    volumes.push(currentVolume);




    if(prices.length > 200){

        prices.shift();

    }



    if(volumes.length > 200){

        volumes.shift();

    }




    updateChart(currentPrice);


    updateIndicators();



};






// ===============================
// 24H CHANGE
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
        parseFloat(
        data.priceChangePercent
        );



        priceChange.innerHTML =

        (dayChange >= 0 ? "+" : "")
        +
        dayChange.toFixed(2)
        +
        "%";



        priceChange.style.color =

        dayChange >= 0
        ?
        "#00ff88"
        :
        "#ff4d6d";



    }
    catch(error){

        console.log(
        "24H error",
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
// LIVE CHART
// ===============================


let chart;



function createChart(){


const ctx =
document
.getElementById("priceChart")
.getContext("2d");



chart =
new Chart(ctx,{

type:"line",


data:{


labels:[],


datasets:[{

label:"BTC",

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


});



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
// RSI
// ===============================


function calculateRSI(data){


    if(data.length < 15){

        return 50;

    }



    let gain = 0;

    let loss = 0;



    for(
        let i = data.length - 14;
        i < data.length;
        i++
    ){


        let diff =
        data[i] - data[i-1];



        if(diff > 0){

            gain += diff;

        }

        else{

            loss += Math.abs(diff);

        }


    }



    let avgGain =
    gain / 14;



    let avgLoss =
    loss / 14;



    if(avgLoss === 0){

        return 100;

    }



    let rs =
    avgGain / avgLoss;



    return 100 -
    (100/(1+rs));


}







// ===============================
// EMA
// ===============================


function calculateEMA(
data,
period = 20
){



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





    let current =
    volumes[volumes.length-1];



    let status;



    if(current > average * 1.5){


        status="HIGH";


    }

    else if(current < average * 0.7){


        status="LOW";


    }

    else{


        status="NORMAL";


    }




    return {


        value:
        current.toFixed(4)
        +
        " BTC",


        power:status


    };


}








// ===============================
// VOLATILITY
// ===============================


function analyzeVolatility(){



    if(prices.length < 20){


        return "Collecting";


    }




    let recent =
    prices.slice(-20);



    let high =
    Math.max(...recent);



    let low =
    Math.min(...recent);



    let range =
    high-low;



    let level;



    if(range >= 150){


        level="HIGH";


    }

    else if(range >= 60){


        level="MEDIUM";


    }

    else{


        level="LOW";


    }



    return (

        range.toFixed(2)

        +

        " "

        +

        level

    );


}







// ===============================
// UPDATE INDICATORS
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
// CALCULATION BASED LIQUIDITY MAGNET
// ==========================================



// ===============================
// MARKET STRUCTURE
// ===============================


function marketStructure(){


    if(prices.length < 40){

        return "NEUTRAL";

    }



    let oldPrice =
    prices[prices.length-40];



    if(currentPrice > oldPrice){

        return "UPTREND";

    }


    else if(currentPrice < oldPrice){

        return "DOWNTREND";

    }


    return "SIDEWAYS";


}







// ===============================
// LIQUIDITY MAGNET ENGINE
// ===============================


function calculateLiquidityMagnet(direction){



    if(prices.length < 50){

        return "Building Liquidity";

    }





    let recentPrices =
    prices.slice(-50);




    let high =
    Math.max(
        ...recentPrices
    );



    let low =
    Math.min(
        ...recentPrices
    );





    // Calculate market range

    let range =
    high - low;




    // Dynamic distance based on volatility

    let distance =
    Math.max(

        300,

        range * 0.8

    );







    let target;

    let type;






    // LONG target

    if(direction === "LONG"){



        target =
        currentPrice + distance;



        type =
        "BUY SIDE LIQUIDITY";



    }





    // SHORT target

    else if(direction === "SHORT"){



        target =
        currentPrice - distance;



        type =
        "SELL SIDE LIQUIDITY";



    }





    else{


        // Neutral market

        let highDistance =
        Math.abs(high-currentPrice);



        let lowDistance =
        Math.abs(currentPrice-low);



        if(highDistance < lowDistance){



            target =
            currentPrice + distance;


            type =
            "BUY SIDE LIQUIDITY";


        }

        else{


            target =
            currentPrice - distance;


            type =
            "SELL SIDE LIQUIDITY";


        }



    }





    return (

        "$"

        +

        target.toFixed(2)

        +

        " "

        +

        type

    );


}






// ===============================
// TEMP SIGNAL HOLDER
// ===============================


function updateLiquidityDisplay(){



    liquidity.innerHTML =

    calculateLiquidityMagnet(
        lastSignal
    );


}



// ==========================================
// BTC QUANT SCANNER ENGINE
// PART 4 FINAL
// SCANNER + SIGNAL + LIQUIDITY CONNECTION
// ==========================================



// ===============================
// SCANNER
// ===============================


let scanning = false;



scanBtn.onclick = ()=>{


    if(scanning)
    return;



    scanning = true;


    scanBtn.disabled = true;



    let seconds = 30;



    scanTimer.innerHTML =
    seconds;



    scanStatus.innerHTML =
    "Analyzing momentum + liquidity zones...";




    let timer =
    setInterval(()=>{


        seconds--;


        scanTimer.innerHTML =
        seconds;




        if(seconds <= 0){


            clearInterval(timer);


            runAnalysis();


        }


    },1000);



};








// ===============================
// FINAL ANALYSIS
// ===============================


function runAnalysis(){



    let score = 0;



    let rsi =
    calculateRSI(prices);



    let ema =
    calculateEMA(prices);



    let structure =
    marketStructure();







    // EMA TREND

    if(currentPrice > ema){


        score += 25;


        momentum.innerHTML =
        "BUY PRESSURE";


    }

    else{


        score -= 25;


        momentum.innerHTML =
        "SELL PRESSURE";


    }







    // RSI


    if(rsi < 35){


        score += 20;


    }


    else if(rsi > 70){


        score -= 20;


    }








    // STRUCTURE


    if(structure === "UPTREND"){


        score +=20;


    }


    else if(structure === "DOWNTREND"){


        score -=20;


    }








    // VOLUME


    let volume =
    analyzeVolume();



    if(volume.power === "HIGH"){


        score +=10;


    }







    // FINAL SIGNAL


    let result;



    let confidenceScore =

    Math.min(

        95,

        Math.abs(score)+50

    );







    if(score >= 25){



        result = "LONG";



        signal.style.color =
        "#00ff88";



        speak(
        "Long opportunity detected."
        );



    }





    else if(score <= -25){



        result = "SHORT";



        signal.style.color =
        "#ff4d6d";



        speak(
        "Short opportunity detected."
        );



    }





    else{



        result = "WAIT";



        signal.style.color =
        "#ffd166";



        speak(
        "No clear market direction."
        );


    }







    // SAVE SIGNAL


    lastSignal = result;







    signal.innerHTML =
    result;



    confidence.innerHTML =
    confidenceScore
    +
    "%";






    // LIQUIDITY UPDATE AFTER SIGNAL


    liquidity.innerHTML =

    calculateLiquidityMagnet(
        lastSignal
    );






    scanTimer.innerHTML =
    "READY";



    scanStatus.innerHTML =
    "Analysis completed";



    scanBtn.disabled = false;



    scanning = false;



}








// ===============================
// VOICE
// ===============================


function speak(text){



    voiceText.innerHTML =
    text;



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
// SOCKET ERRORS
// ===============================


socket.onerror = (error)=>{


    console.log(
        "Socket Error",
        error
    );


};



socket.onclose = ()=>{


    console.log(
        "Market connection closed"
    );


};
