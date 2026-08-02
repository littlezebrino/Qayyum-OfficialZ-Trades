// ===============================
// BTC QUANT SCANNER ENGINE
// ===============================


// Elements

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
// MARKET DATA
// ===============================


let prices = [];
let volumes = [];

let currentPrice = 0;



const socket =
new WebSocket(
"wss://stream.binance.com:9443/ws/btcusdt@trade"
);



socket.onmessage = (event)=>{


    const data = JSON.parse(event.data);


    currentPrice =
    parseFloat(data.p);



    btcPrice.innerHTML =
    "$" + currentPrice.toFixed(2);



    prices.push(currentPrice);


    if(prices.length > 100){
        prices.shift();
    }


    updateIndicators();


};





// ===============================
// INDICATORS
// ===============================


function calculateRSI(data){


    if(data.length < 15)
    return 50;


    let gain=0;
    let loss=0;


    for(let i=data.length-14;i<data.length;i++){


        let diff =
        data[i]-data[i-1];


        if(diff>0)
        gain+=diff;

        else
        loss+=Math.abs(diff);


    }



    let rs =
    gain/(loss||1);


    return 100-(100/(1+rs));

}



function calculateEMA(data){


    if(data.length<20)
    return currentPrice;


    let multiplier =
    2/(20+1);


    let ema=data[0];


    for(let i=1;i<data.length;i++){

        ema =
        (data[i]-ema)*multiplier+ema;

    }


    return ema;

}




function updateIndicators(){


    let rsi =
    calculateRSI(prices);



    let ema =
    calculateEMA(prices);



    rsiBox.innerHTML =
    rsi.toFixed(1);



    emaBox.innerHTML =
    ema > currentPrice
    ? "BEARISH"
    : "BULLISH";



    volumeBox.innerHTML =
    "LIVE";



    volatilityBox.innerHTML =
    Math.abs(
        currentPrice-ema
    ).toFixed(2);



}







// ===============================
// 30 SECOND SCANNER
// ===============================


let scanning=false;


scanBtn.onclick = ()=>{


    if(scanning)
    return;


    scanning=true;


    let seconds=30;


    scanBtn.disabled=true;


    scanStatus.innerHTML=
    "Analyzing liquidity + momentum...";


    scanTimer.innerHTML=
    seconds;



    let timer =
    setInterval(()=>{


        seconds--;


        scanTimer.innerHTML=
        seconds;



        if(seconds<=0){


            clearInterval(timer);


            runAnalysis();


        }


    },1000);



};







// ===============================
// STRATEGY ENGINE
// ===============================


function runAnalysis(){



let score=0;



let rsi =
calculateRSI(prices);



let ema =
calculateEMA(prices);




// Momentum

if(currentPrice > ema){

    score+=25;

    momentum.innerHTML="BUY PRESSURE";

}

else{

    score-=25;

    momentum.innerHTML="SELL PRESSURE";

}




// RSI Logic


if(rsi < 35){

    score+=20;

}


if(rsi >70){

    score-=20;

}





// Recent movement


let first =
prices[0];


let movement =
currentPrice-first;



if(movement>0){

    score+=20;

}

else{

    score-=20;

}





// Final probability


let result;


let confidenceScore =
Math.min(
95,
Math.abs(score)+50
);



if(score>=20){


    result="LONG";

    signal.style.color="#00ff88";


    speak(
    "Analysis complete. Open long positions now."
    );


}


else if(score<=-20){


    result="SHORT";


    signal.style.color="#ff4d6d";


    speak(
    "Analysis complete. Short opportunity detected."
    );


}


else{


    result="WAIT";


    signal.style.color="#ffd166";


    speak(
    "Analysis complete. No clear market edge."
    );


}





signal.innerHTML=result;


confidence.innerHTML=
confidenceScore+"%";



liquidity.innerHTML =
estimateLiquidity();



scanTimer.innerHTML=
"READY";


scanStatus.innerHTML=
"Analysis completed";



scanBtn.disabled=false;


scanning=false;



}







// ===============================
// LIQUIDITY MAGNET
// ===============================


function estimateLiquidity(){


if(prices.length<10)
return "Collecting data";


let high =
Math.max(...prices);


let low =
Math.min(...prices);



if(currentPrice > (high+low)/2){

    return "$"+high.toFixed(2);

}


else{

    return "$"+low.toFixed(2);

}



}








// ===============================
// VOICE SYSTEM
// ===============================


function speak(text){


voiceText.innerHTML=text;



let speech =
new SpeechSynthesisUtterance();


speech.text=text;


speech.rate=0.9;


speech.pitch=1;


window.speechSynthesis.speak(
speech
);



}
