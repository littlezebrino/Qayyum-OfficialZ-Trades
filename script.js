// ======================================
// BTC QUANT SCANNER
// JAVASCRIPT PART 1/6
// LIVE PRICE + 24H CHANGE
// ======================================



// ===============================
// DOM ELEMENTS
// ===============================


const btcPriceElement =
document.getElementById("btcPrice");


const change24hElement =
document.getElementById("change24h");



const scanStatus =
document.getElementById("scanStatus");





// ===============================
// MARKET VARIABLES
// ===============================


let currentPrice = 0;

let priceHistory = [];

let marketData = {

    volume:0,
    high24:0,
    low24:0,
    change24:0

};






// ===============================
// BINANCE LIVE PRICE STREAM
// ===============================


const priceSocket = new WebSocket(

"wss://stream.binance.com:9443/ws/btcusdt@trade"

);





priceSocket.onopen = ()=>{


    console.log(
        "BTC Live Connection Connected"
    );


};







priceSocket.onmessage = (event)=>{


    const data =
    JSON.parse(event.data);



    currentPrice =
    parseFloat(data.p);



    btcPriceElement.innerHTML =

    "$" +
    currentPrice.toLocaleString(
        "en-US",
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );



    priceHistory.push(currentPrice);



    // Keep latest 200 prices


    if(priceHistory.length > 200){

        priceHistory.shift();

    }



};







priceSocket.onerror = ()=>{


    console.log(
        "Price connection error"
    );


    scanStatus.innerHTML =
    "Market data connection error";


};







// ===============================
// 24 HOUR MARKET DATA
// ===============================


async function get24HourData(){



try {



const response =
await fetch(

"https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"

);



const data =
await response.json();





marketData.high24 =
parseFloat(data.highPrice);



marketData.low24 =
parseFloat(data.lowPrice);



marketData.change24 =
parseFloat(data.priceChangePercent);






update24HourChange();




}

catch(error){


console.log(
"24h data error",
error
);


}



}








function update24HourChange(){



let value =
marketData.change24;



change24hElement.innerHTML =

value.toFixed(2) + "%";






if(value > 0){


change24hElement.style.color =
"#00ff88";


change24hElement.style.background =
"rgba(0,255,136,.12)";


}



else if(value < 0){


change24hElement.style.color =
"#ff4d6d";


change24hElement.style.background =
"rgba(255,77,109,.12)";


}



else{


change24hElement.style.color =
"#ffd166";


}



}







// refresh every 10 seconds

setInterval(
get24HourData,
10000
);



// first load

get24HourData();


// ======================================
// JAVASCRIPT PART 2/6
// LIVE CHART + CANDLE DATA
// ======================================



// ===============================
// MARKET HISTORY STORAGE
// ===============================


let candleData = [];

let volumeHistory = [];





// ===============================
// BINANCE KLINE DATA
// ===============================


async function loadCandles(){


try{


const response =
await fetch(

"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100"

);



const data =
await response.json();




candleData = data.map(
(candle)=>{


return {

time:
candle[0],


open:
parseFloat(candle[1]),


high:
parseFloat(candle[2]),


low:
parseFloat(candle[3]),


close:
parseFloat(candle[4]),


volume:
parseFloat(candle[5])


};


}

);





volumeHistory =
candleData.map(
(item)=>item.volume
);





console.log(
"BTC Candle Data Loaded",
candleData
);



}

catch(error){


console.log(
"Candle loading error",
error
);


}


}






// Load first time

loadCandles();





// refresh candles every minute


setInterval(

loadCandles,

60000

);








// ===============================
// SIMPLE LIVE CHART ENGINE
// ===============================



function drawChart(){



const chart =
document.getElementById(
"btcChart"
);



if(!chart)
return;




chart.innerHTML="";




let canvas =
document.createElement(
"canvas"
);



canvas.width =
chart.clientWidth;



canvas.height =
chart.clientHeight;




chart.appendChild(canvas);



let ctx =
canvas.getContext(
"2d"
);




if(candleData.length < 2)
return;





let prices =
candleData.map(
c=>c.close
);





let max =
Math.max(...prices);



let min =
Math.min(...prices);





ctx.beginPath();


ctx.strokeStyle =
"#00f5ff";


ctx.lineWidth=3;




prices.forEach(
(price,index)=>{


let x =
(index/(prices.length-1))
*
canvas.width;



let y =
canvas.height -
(
(price-min)
/
(max-min)
*
canvas.height
);




if(index===0)

ctx.moveTo(x,y);


else

ctx.lineTo(x,y);



});



ctx.stroke();






// glow line


ctx.shadowBlur=20;

ctx.shadowColor="#00f5ff";




}






// draw chart after data

setInterval(

drawChart,

5000

);


// ======================================
// JAVASCRIPT PART 3/6
// INDICATORS ENGINE
// ======================================



const rsiElement =
document.getElementById("rsi");


const emaElement =
document.getElementById("ema");


const volumeElement =
document.getElementById("volume");


const volatilityElement =
document.getElementById("volatility");






// ===============================
// RSI CALCULATION
// ===============================


function calculateRSI(){


if(candleData.length < 15)
return 50;



let gains = 0;
let losses = 0;



for(
let i=candleData.length-14;
i<candleData.length;
i++
){


let change =
candleData[i].close -
candleData[i-1].close;



if(change > 0)

gains += change;


else

losses += Math.abs(change);



}



let rs =
gains/(losses || 1);



return 100 -
(100/(1+rs));



}









// ===============================
// EMA CALCULATION
// ===============================


function calculateEMA(period=20){



if(candleData.length < period)

return currentPrice;



let multiplier =
2/(period+1);



let ema =
candleData[0].close;




for(
let i=1;
i<candleData.length;
i++
){


ema =
(
candleData[i].close -
ema
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


function calculateVolume(){



if(volumeHistory.length < 10)

return "LOW";




let recent =
volumeHistory
.slice(-5)
.reduce(
(a,b)=>a+b,
0
);



let previous =
volumeHistory
.slice(-15,-5)
.reduce(
(a,b)=>a+b,
0
);



if(recent > previous*1.5)

return "HIGH";



if(recent < previous*.7)

return "LOW";



return "MEDIUM";



}








// ===============================
// VOLATILITY
// ===============================


function calculateVolatility(){



if(candleData.length < 10)

return "LOW";




let changes=[];



for(
let i=candleData.length-10;
i<candleData.length;
i++
){


changes.push(

Math.abs(
candleData[i].close -
candleData[i-1].close
)

);


}



let avg =
changes.reduce(
(a,b)=>a+b,
0
)
/
changes.length;




let percentage =
(avg/currentPrice)*100;




if(percentage > 0.25)

return "HIGH";



if(percentage > 0.08)

return "MEDIUM";



return "LOW";



}








// ===============================
// UPDATE INDICATORS UI
// ===============================


function updateIndicators(){



let rsi =
calculateRSI();



let ema =
calculateEMA();



rsiElement.innerHTML =
rsi.toFixed(1);



if(currentPrice > ema)

emaElement.innerHTML =
"BULLISH";


else

emaElement.innerHTML =
"BEARISH";




volumeElement.innerHTML =
calculateVolume();



volatilityElement.innerHTML =
calculateVolatility();



}





// update every 5 seconds

setInterval(

updateIndicators,

5000

);


// ======================================
// JAVASCRIPT PART 4/6
// ADVANCED MARKET DATA ENGINE
// ======================================



const orderBookElement =
document.getElementById("orderBook");


const fundingElement =
document.getElementById("fundingRate");


const interestElement =
document.getElementById("openInterest");


const liquidationElement =
document.getElementById("liquidation");


const deltaElement =
document.getElementById("volumeDelta");






// ===============================
// ORDER BOOK DEPTH
// ===============================


let orderBookData = {

    bids:[],
    asks:[]

};






async function getOrderBook(){



try{


const response =
await fetch(

"https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=20"

);



const data =
await response.json();



orderBookData.bids =
data.bids;



orderBookData.asks =
data.asks;





let buyLiquidity =
data.bids
.reduce(
(sum,item)=>
sum+
parseFloat(item[1]),
0
);



let sellLiquidity =
data.asks
.reduce(
(sum,item)=>
sum+
parseFloat(item[1]),
0
);





if(buyLiquidity > sellLiquidity){


orderBookElement.innerHTML =
"BUY SIDE STRONG";


}


else{


orderBookElement.innerHTML =
"SELL SIDE STRONG";


}





}

catch(error){


orderBookElement.innerHTML =
"Unavailable";


}


}








// ===============================
// FUNDING RATE
// ===============================


async function getFundingRate(){



try{


const response =
await fetch(

"https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"

);



const data =
await response.json();




let rate =
parseFloat(
data.lastFundingRate
)
*100;




fundingElement.innerHTML =

rate.toFixed(4)+"%";




}

catch(error){


fundingElement.innerHTML =
"N/A";


}



}









// ===============================
// OPEN INTEREST
// ===============================


async function getOpenInterest(){



try{


const response =
await fetch(

"https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"

);



const data =
await response.json();




let value =
parseFloat(
data.openInterest
);



interestElement.innerHTML =

value.toFixed(2)+" BTC";



}

catch(error){


interestElement.innerHTML =
"N/A";


}



}









// ===============================
// LIQUIDITY ZONE
// ===============================


function calculateLiquidityZone(){



if(candleData.length < 20)

return;



let highs =
candleData.map(
c=>c.high
);



let lows =
candleData.map(
c=>c.low
);




let highZone =
Math.max(
...highs
);



let lowZone =
Math.min(
...lows
);





let distanceHigh =
Math.abs(
currentPrice-highZone
);



let distanceLow =
Math.abs(
currentPrice-lowZone
);





if(distanceHigh < distanceLow){


liquidationElement.innerHTML =

"$"+
highZone.toFixed(0);


}


else{


liquidationElement.innerHTML =

"$"+
lowZone.toFixed(0);


}



}










// ===============================
// VOLUME DELTA
// ===============================


function calculateVolumeDelta(){



if(candleData.length < 5)

return;




let buy=0;

let sell=0;




candleData
.slice(-10)
.forEach(
(c)=>{


if(c.close > c.open)


buy += c.volume;


else


sell += c.volume;



});






let delta =
buy-sell;





if(delta>0){


deltaElement.innerHTML =
"BUY +"+
delta.toFixed(2);


}

else{


deltaElement.innerHTML =
"SELL "+
delta.toFixed(2);


}



}










// ===============================
// UPDATE ADVANCED DATA
// ===============================


function updateAdvancedData(){


getOrderBook();

getFundingRate();

getOpenInterest();

calculateLiquidityZone();

calculateVolumeDelta();


}






setInterval(

updateAdvancedData,

10000

);


// ======================================
// JAVASCRIPT PART 5/6
// MARKET STRUCTURE + SCORING ENGINE
// ======================================



const signalElement =
document.getElementById("signal");


const confidenceElement =
document.getElementById("confidence");


const momentumElement =
document.getElementById("momentum");


const structureElement =
document.getElementById("structure");





// ===============================
// MARKET STRUCTURE
// ===============================


function detectMarketStructure(){



if(candleData.length < 20)

return "WAIT";



let recent =
candleData.slice(-20);



let highs =
recent.map(
c=>c.high
);


let lows =
recent.map(
c=>c.low
);



let higherHighs = 0;

let lowerLows = 0;




for(let i=1;i<highs.length;i++){


if(highs[i] > highs[i-1])

higherHighs++;


if(lows[i] < lows[i-1])

lowerLows++;



}




if(higherHighs > lowerLows)

return "UPTREND";



if(lowerLows > higherHighs)

return "DOWNTREND";



return "RANGE";



}









// ===============================
// SCORING MODEL
// ===============================


function calculateMarketScore(){



let score = 0;



let rsi =
calculateRSI();



let ema =
calculateEMA();





// EMA TREND


if(currentPrice > ema)

score += 25;

else

score -= 25;





// RSI


if(rsi < 35)

score += 20;



if(rsi > 70)

score -= 20;






// Volume


let volumeSignal =
calculateVolume();



if(volumeSignal === "HIGH")

score += 15;






// Volume Delta


let deltaText =
deltaElement.innerHTML;



if(deltaText.includes("BUY"))

score += 15;


if(deltaText.includes("SELL"))

score -= 15;








// Structure


let structure =
detectMarketStructure();



if(structure==="UPTREND")

score +=20;



if(structure==="DOWNTREND")

score -=20;





return score;



}









// ===============================
// FINAL SIGNAL
// ===============================


function generateSignal(){



let score =
calculateMarketScore();





let finalSignal="WAIT";





if(score >= 25){


finalSignal="LONG";


signalElement.className="long";


momentumElement.innerHTML =
"BULLISH FLOW";


}



else if(score <= -25){


finalSignal="SHORT";


signalElement.className="short";


momentumElement.innerHTML =
"BEARISH FLOW";


}



else{


finalSignal="WAIT";


signalElement.className="wait";


momentumElement.innerHTML =
"NEUTRAL FLOW";


}






signalElement.innerHTML =
finalSignal;






let confidence =

Math.min(
95,
Math.abs(score)+50
);





confidenceElement.innerHTML =

confidence+"%";






structureElement.innerHTML =

detectMarketStructure();



}









// ===============================
// AUTO UPDATE
// ===============================


setInterval(

generateSignal,

10000

);

// ======================================
// JAVASCRIPT PART 6/6
// SCANNER + VOICE + FINAL CONTROL
// ======================================



const scanButton =
document.getElementById("scanBtn");


const timerElement =
document.getElementById("scanTimer");



const voiceElement =
document.getElementById("voiceText");





let scanning = false;







// ===============================
// SCAN ENGINE
// ===============================


scanButton.onclick = ()=>{



if(scanning)

return;



scanning = true;



scanButton.disabled = true;



let seconds = 30;



timerElement.innerHTML =
seconds;



scanStatus.innerHTML =
"Scanning market structure...";





let phases = [

"Collecting market data...",

"Analyzing order flow...",

"Checking liquidity zones...",

"Calculating momentum...",

"Building final decision..."

];





let phaseIndex = 0;





let interval = setInterval(()=>{



seconds--;



timerElement.innerHTML =
seconds;




if(seconds % 6 === 0){


scanStatus.innerHTML =
phases[phaseIndex];


phaseIndex++;



if(phaseIndex >= phases.length)

phaseIndex=0;


}






if(seconds <= 0){



clearInterval(interval);



finishScan();



}



},1000);





};









// ===============================
// FINISH SCAN
// ===============================


function finishScan(){



generateSignal();




let result =
signalElement.innerHTML;




if(result==="LONG"){


speak(

"Market analysis complete. Long opportunity detected."

);


}



else if(result==="SHORT"){


speak(

"Market analysis complete. Short opportunity detected."

);


}



else{


speak(

"Market analysis complete. No clear market edge."

);


}






timerElement.innerHTML =
"READY";



scanStatus.innerHTML =
"Analysis completed";



scanButton.disabled=false;



scanning=false;



}










// ===============================
// VOICE SYSTEM
// ===============================


function speak(message){



voiceElement.innerHTML =
message;



if(
!("speechSynthesis" in window)
)

return;




let speech =
new SpeechSynthesisUtterance();



speech.text =
message;



speech.rate =
0.9;



speech.pitch =
1;



speech.volume =
1;



window.speechSynthesis.cancel();



window.speechSynthesis.speak(
speech
);



}









// ===============================
// CONNECTION CHECK
// ===============================


window.addEventListener(
"offline",
()=>{


scanStatus.innerHTML =
"Internet connection lost";


});



window.addEventListener(
"online",
()=>{


scanStatus.innerHTML =
"Market connection restored";


});

