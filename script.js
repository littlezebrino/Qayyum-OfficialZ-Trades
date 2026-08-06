// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 1
// REAL MARKET DATA ENGINE
// ======================================================



// ===============================
// DOM ELEMENTS
// ===============================


const btcPrice =
document.getElementById("btcPrice");


const priceChange =
document.getElementById("priceChange");


const priceTime =
document.getElementById("priceTime");


const marketState =
document.getElementById("marketState");


const marketStatus =
document.getElementById("marketStatus");


const priceChart =
document.getElementById("priceChart");





// ===============================
// MARKET DATA STORAGE
// ===============================


let market = {


price:0,


open:0,


high:0,


low:0,


volume:0,


change:0,


time:null


};





// candle storage


let candles = [];



let closes = [];

let highs = [];

let lows = [];

let volumes = [];






// ===============================
// CONFIG
// ===============================


const SYMBOL = "btcusdt";


const INTERVAL = "1m";



const MAX_CANDLES = 500;






// ===============================
// MARKET STATUS
// ===============================


function updateMarketStatus(text,color){


marketState.innerHTML = text;


marketStatus.style.borderColor = color;


}





// ===============================
// BINANCE CANDLE SOCKET
// ===============================



let candleSocket;





function connectCandleSocket(){



updateMarketStatus(
"CONNECTING",
"#ffd166"
);



candleSocket = new WebSocket(

`wss://stream.binance.com:9443/ws/${SYMBOL}@kline_${INTERVAL}`

);





candleSocket.onopen = ()=>{


updateMarketStatus(
"LIVE MARKET",
"#00ff88"
);


};







candleSocket.onmessage = (event)=>{


const data =
JSON.parse(event.data);



const candle =
data.k;





const candleData = {


open:
parseFloat(candle.o),


high:
parseFloat(candle.h),


low:
parseFloat(candle.l),


close:
parseFloat(candle.c),


volume:
parseFloat(candle.v),


closed:
candle.x,


time:
candle.t


};





updateMarketData(candleData);



};








candleSocket.onerror = ()=>{


updateMarketStatus(
"ERROR",
"#ff4d6d"
);



};







candleSocket.onclose = ()=>{


updateMarketStatus(
"RECONNECTING",
"#ffd166"
);



setTimeout(

connectCandleSocket,

3000

);



};





}







connectCandleSocket();










// ===============================
// PROCESS MARKET DATA
// ===============================


function updateMarketData(candle){



market.price =
candle.close;



market.open =
candle.open;



market.high =
candle.high;



market.low =
candle.low;



market.volume =
candle.volume;



market.time =
candle.time;





btcPrice.innerHTML =

"$" +

market.price.toFixed(2);







priceTime.innerHTML =

"Last Update: " +

new Date()

.toLocaleTimeString();







if(candle.closed){


storeCandle(candle);


}





updateChart(
market.price
);



}









// ===============================
// STORE CANDLES
// ===============================


function storeCandle(candle){



candles.push(candle);



closes.push(candle.close);



highs.push(candle.high);



lows.push(candle.low);



volumes.push(candle.volume);






if(candles.length > MAX_CANDLES){



candles.shift();



closes.shift();



highs.shift();



lows.shift();



volumes.shift();



}





}





// ===============================
// CHART ENGINE
// ===============================


let chart;





function createChart(){



const ctx =
priceChart.getContext("2d");





chart = new Chart(ctx,{


type:"line",



data:{


labels:[],


datasets:[{


label:"BTC PRICE",


data:[],


borderColor:"#00f5ff",


backgroundColor:
"rgba(0,245,255,.08)",


borderWidth:2,


fill:true,


tension:.35,


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



chart.data.datasets[0]
.data.push(price);







if(chart.data.labels.length>80){



chart.data.labels.shift();



chart.data.datasets[0]
.data.shift();



}






chart.update("none");



}





// ===============================
// PRICE CHANGE FETCH
// ===============================


async function update24HourChange(){



try{



let response =
await fetch(

"https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"

);



let data =
await response.json();




let change =
parseFloat(
data.priceChangePercent
);





market.change = change;





priceChange.innerHTML =


(change >=0 ? "+" : "")

+

change.toFixed(2)

+

"%";






priceChange.style.color =


change>=0

?

"#00ff88"

:

"#ff4d6d";




}

catch(error){


console.log(
"24H change error",
error
);


}



}




update24HourChange();


setInterval(
update24HourChange,
10000
);



// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 2
// PROFESSIONAL INDICATOR ENGINE
// ======================================================



// ===============================
// DOM INDICATORS
// ===============================


const rsiBox =
document.getElementById("rsi");


const emaBox =
document.getElementById("ema");


const macdBox =
document.getElementById("macd");


const volumeBox =
document.getElementById("volume");


const vwapBox =
document.getElementById("vwap");


const volatilityBox =
document.getElementById("volatility");






// ===============================
// RSI - WILDER METHOD
// ===============================


function calculateRSI(data, period=14){


if(data.length <= period){

return 50;

}



let gains = 0;

let losses = 0;



for(let i=1;i<=period;i++){


let diff =
data[i]-data[i-1];



if(diff>=0){

gains += diff;

}

else{

losses += Math.abs(diff);

}


}



let avgGain =
gains / period;


let avgLoss =
losses / period;




for(
let i=period+1;
i<data.length;
i++
){


let diff =
data[i]-data[i-1];



let gain =
diff>0 ? diff : 0;


let loss =
diff<0 ? Math.abs(diff):0;




avgGain =
(
avgGain*(period-1)+gain
)
/period;



avgLoss =
(
avgLoss*(period-1)+loss
)
/period;



}




if(avgLoss===0){


return 99;


}




let rs =
avgGain/avgLoss;



return 100-(100/(1+rs));



}









// ===============================
// EMA ENGINE
// ===============================


function calculateEMA(data,period){


if(data.length < period){

return null;

}



let multiplier =
2/(period+1);



let ema =
data[0];



for(let i=1;i<data.length;i++){



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
// MACD
// ===============================


function calculateMACD(data){



if(data.length < 35){


return {

macd:0,

signal:0,

histogram:0

};


}




let ema12 =
calculateEMA(data,12);



let ema26 =
calculateEMA(data,26);



let macd =
ema12-ema26;




let signal =
calculateEMA(
data.slice(-9),
9
);



return {


macd:macd,


signal:signal,


histogram:
macd-signal



};



}









// ===============================
// VWAP
// ===============================


function calculateVWAP(){



if(candles.length===0){

return 0;

}




let totalVolume=0;


let totalValue=0;





candles.forEach(c=>{



let typical =

(
c.high+
c.low+
c.close

)/3;



totalValue +=

typical*c.volume;



totalVolume +=

c.volume;



});




return totalValue/totalVolume;



}









// ===============================
// ATR
// ===============================


function calculateATR(period=14){



if(candles.length<=period){


return 0;


}



let trs=[];




for(
let i=1;
i<candles.length;
i++
){



let current =
candles[i];


let previous =
candles[i-1];



let tr = Math.max(

current.high-current.low,


Math.abs(
current.high-previous.close
),


Math.abs(
current.low-previous.close
)

);



trs.push(tr);



}





let recent =

trs.slice(-period);



return recent.reduce(
(a,b)=>a+b,
0
)/period;



}









// ===============================
// VOLUME ANALYSIS
// ===============================


function analyzeVolume(){



if(volumes.length<20){


return "Collecting";


}




let average =


volumes

.slice(-20)

.reduce(
(a,b)=>a+b,
0
)
/20;





let current =

volumes[
volumes.length-1
];





if(current > average*1.5){


return "HIGH";


}



if(current < average*.6){


return "LOW";


}



return "NORMAL";



}









// ===============================
// VOLATILITY
// ===============================


function calculateVolatility(){



if(closes.length<20){


return "Collecting";


}



let recent =

closes.slice(-20);



let high =
Math.max(...recent);


let low =
Math.min(...recent);



let range =
high-low;



if(range > 150){

return "HIGH";

}

else if(range > 60){

return "MEDIUM";

}


return "LOW";



}









// ===============================
// UPDATE INDICATORS UI
// ===============================


function updateIndicators(){



if(closes.length<30){

return;

}




let rsi =
calculateRSI(closes);



let ema20 =
calculateEMA(closes,20);


let ema50 =
calculateEMA(closes,50);


let ema200 =
calculateEMA(closes,200);




let macd =
calculateMACD(closes);



let vwap =
calculateVWAP();



let atr =
calculateATR();





rsiBox.innerHTML =

rsi.toFixed(1);





if(market.price > ema20){

emaBox.innerHTML =
"BULLISH";


}

else{

emaBox.innerHTML =
"BEARISH";


}






macdBox.innerHTML =


macd.histogram>0

?

"BUY"

:

"SELL";






vwapBox.innerHTML =


market.price > vwap

?

"ABOVE"

:

"BELOW";






volumeBox.innerHTML =

analyzeVolume();






volatilityBox.innerHTML =

calculateVolatility()

+

" | ATR "

+

atr.toFixed(2);





}









// ===============================
// AUTO UPDATE AFTER EACH CANDLE
// ===============================


setInterval(()=>{


updateIndicators();


},3000);




// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 3
// MARKET STRUCTURE + LIQUIDITY ENGINE
// ======================================================



// ===============================
// DOM ELEMENTS
// ===============================


const liquidityBox =
document.getElementById("liquidity");


const marketSummary =
document.getElementById("marketSummary");







// ===============================
// SWING HIGH / LOW
// ===============================



function findSwingHigh(period=3){


let highsFound=[];



for(
let i=period;
i<highs.length-period;
i++
){



let high =
highs[i];



let isHigh=true;



for(
let x=1;
x<=period;
x++
){



if(
high <= highs[i-x]
||
high <= highs[i+x]
){

isHigh=false;

break;

}


}




if(isHigh){

highsFound.push(high);


}



}



return highsFound;



}







function findSwingLow(period=3){



let lowsFound=[];



for(
let i=period;
i<lows.length-period;
i++
){



let low =
lows[i];



let isLow=true;




for(
let x=1;
x<=period;
x++
){



if(
low >= lows[i-x]
||
low >= lows[i+x]
){

isLow=false;

break;

}


}





if(isLow){

lowsFound.push(low);


}



}



return lowsFound;



}








// ===============================
// MARKET TREND
// ===============================


function detectTrend(){



if(closes.length<50){

return "WAITING";

}




let recent =
closes.slice(-50);




let first =
recent[0];


let last =
recent[recent.length-1];





let change =
((last-first)/first)*100;





if(change>0.5){


return "BULLISH";


}


if(change<-0.5){


return "BEARISH";


}



return "SIDEWAYS";



}









// ===============================
// SUPPORT RESISTANCE
// ===============================


function calculateSupportResistance(){



let swingHighs =
findSwingHigh();


let swingLows =
findSwingLow();





let resistance =
Math.max(
...swingHighs
);



let support =
Math.min(
...swingLows
);





return {


support:support || 0,


resistance:resistance || 0


};



}









// ===============================
// BREAK OF STRUCTURE
// ===============================


function detectBOS(){



let levels =
calculateSupportResistance();



if(!levels.resistance){

return "NONE";

}



if(
market.price >
levels.resistance
){


return "BULLISH BOS";


}





if(
market.price <
levels.support
){


return "BEARISH BOS";


}




return "NO BOS";



}









// ===============================
// CHANGE OF CHARACTER
// ===============================


function detectCHOCH(){



if(closes.length<30){

return "NONE";

}




let previous =
closes.slice(-30,-15);


let current =
closes.slice(-15);




let oldTrend =
previous[
previous.length-1
]
-
previous[0];



let newTrend =
current[
current.length-1
]
-
current[0];





if(
oldTrend>0
&&
newTrend<0
){


return "BEARISH CHOCH";


}




if(
oldTrend<0
&&
newTrend>0
){


return "BULLISH CHOCH";


}




return "NONE";



}









// ===============================
// LIQUIDITY ZONE ENGINE
// ===============================


function calculateLiquidity(){



let levels =
calculateSupportResistance();



if(
!levels.support
||
!levels.resistance
){


return "Building zones";


}






let distanceHigh =

Math.abs(
levels.resistance-market.price
);



let distanceLow =

Math.abs(
market.price-levels.support
);






if(distanceHigh < distanceLow){



return (

"$"

+

levels.resistance.toFixed(2)

+

" BUY SIDE LIQUIDITY"

);



}



else{



return (

"$"

+

levels.support.toFixed(2)

+

" SELL SIDE LIQUIDITY"

);



}



}









// ===============================
// MARKET SUMMARY UPDATE
// ===============================


function updateMarketStructure(){



let trend =
detectTrend();



let bos =
detectBOS();



let choch =
detectCHOCH();



let liquidity =
calculateLiquidity();






liquidityBox.innerHTML =
liquidity;







marketSummary.innerHTML =


`

Trend:
<b>${trend}</b>
<br>

Structure:
<b>${bos}</b>

<br>

Market Shift:
<b>${choch}</b>

<br>

Liquidity:
<b>${liquidity}</b>

`;



}








// ===============================
// AUTO STRUCTURE UPDATE
// ===============================


setInterval(()=>{


if(closes.length>50){


updateMarketStructure();


}



},5000);





// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 4
// FINAL SCANNER + SIGNAL ENGINE
// ======================================================



// ===============================
// DOM ELEMENTS
// ===============================


const scanBtn =
document.getElementById("scanBtn");


const scanTimer =
document.getElementById("scanTimer");


const scanStatus =
document.getElementById("scanStatus");


const engineStatus =
document.getElementById("engineStatus");


const signalBox =
document.getElementById("signal");


const confidenceBox =
document.getElementById("confidence");


const momentumBox =
document.getElementById("momentum");


const signalTime =
document.getElementById("signalTime");


const voiceText =
document.getElementById("voiceText");





// ===============================
// SCANNER VARIABLES
// ===============================


let scanning = false;

let lastSignal = "WAIT";

let timer = null;







// ===============================
// SCORE ENGINE
// ===============================


function calculateMarketScore(){



let score = 0;


let reasons=[];




// -------------------------------
// EMA TREND
// -------------------------------


let ema20 =
calculateEMA(closes,20);



let ema50 =
calculateEMA(closes,50);





if(
market.price > ema20
&&
ema20 > ema50
){


score +=20;


reasons.push(
"EMA bullish"
);


}

else if(
market.price < ema20
&&
ema20 < ema50
){


score -=20;


reasons.push(
"EMA bearish"
);


}







// -------------------------------
// RSI
// -------------------------------


let rsi =
calculateRSI(closes);





if(
rsi > 45
&&
rsi < 65
){


score +=10;


reasons.push(
"RSI healthy"
);


}


else if(
rsi >70
){


score -=10;


reasons.push(
"RSI overbought"
);


}


else if(
rsi <30
){


score +=10;


reasons.push(
"RSI oversold"
);


}







// -------------------------------
// MACD
// -------------------------------


let macd =
calculateMACD(closes);





if(
macd.histogram >0
){


score +=15;


reasons.push(
"MACD positive"
);


}

else{


score -=15;


reasons.push(
"MACD negative"
);


}







// -------------------------------
// VWAP
// -------------------------------


let vwap =
calculateVWAP();





if(
market.price > vwap
){


score +=10;


reasons.push(
"Above VWAP"
);


}

else{


score -=10;


reasons.push(
"Below VWAP"
);


}







// -------------------------------
// VOLUME
// -------------------------------


let volume =
analyzeVolume();





if(
volume==="HIGH"
){


score +=10;


reasons.push(
"Volume spike"
);


}







// -------------------------------
// STRUCTURE
// -------------------------------


let trend =
detectTrend();



let bos =
detectBOS();



let choch =
detectCHOCH();





if(trend==="BULLISH"){


score+=10;


}



if(trend==="BEARISH"){


score-=10;


}



if(
bos==="BULLISH BOS"
){


score+=15;


}



if(
bos==="BEARISH BOS"
){


score-=15;


}



if(
choch==="BULLISH CHOCH"
){


score+=10;


}



if(
choch==="BEARISH CHOCH"
){


score-=10;


}







return {


score,


reasons


};



}









// ===============================
// FINAL DECISION
// ===============================


function generateSignal(){



let result =
calculateMarketScore();



let score =
result.score;



let confidence =
Math.min(

95,

Math.max(

50,

Math.abs(score)+50

)

);






let signal;



if(score>=35){



signal="LONG";


}

else if(score<=-35){



signal="SHORT";


}

else{


signal="WAIT";


}






return {


signal,


confidence,


score,


reasons:result.reasons



};



}









// ===============================
// DISPLAY RESULT
// ===============================


function showSignal(data){



signalBox.innerHTML =
data.signal;



confidenceBox.innerHTML =
data.confidence.toFixed(0)
+
"%";




signalTime.innerHTML =

"Generated: "

+

new Date()
.toLocaleTimeString();







if(data.signal==="LONG"){


signalBox.style.color =
"#00ff88";


momentumBox.innerHTML =
"BULLISH PRESSURE";


voiceAlert(
"Long opportunity detected"
);



}




else if(data.signal==="SHORT"){


signalBox.style.color =
"#ff4d6d";


momentumBox.innerHTML =
"BEARISH PRESSURE";


voiceAlert(
"Short opportunity detected"
);



}




else{


signalBox.style.color =
"#ffd166";


momentumBox.innerHTML =
"NO CLEAR MOMENTUM";



voiceAlert(
"Market is unclear"
);



}







lastSignal =
data.signal;



}









// ===============================
// SCAN PROCESS
// ===============================


scanBtn.onclick = ()=>{



if(scanning)
return;




if(closes.length < 50){



scanStatus.innerHTML =
"Collecting candle data...";


return;


}





scanning=true;


scanBtn.disabled=true;



let seconds=10;



scanTimer.innerHTML =
seconds;



engineStatus.innerHTML =
"Analyzing market structure...";




timer=setInterval(()=>{



seconds--;


scanTimer.innerHTML =
seconds;



if(seconds<=0){



clearInterval(timer);



runScanner();



}



},1000);



};









function runScanner(){



engineStatus.innerHTML =
"Generating final analysis...";




let result =
generateSignal();




showSignal(result);





scanStatus.innerHTML =

"Analysis completed";



engineStatus.innerHTML =
"Engine Ready";



scanTimer.innerHTML =
"READY";



scanBtn.disabled=false;


scanning=false;



}









// ===============================
// VOICE SYSTEM
// ===============================


function voiceAlert(text){



voiceText.innerHTML =
text;




if(
!("speechSynthesis" in window)
){

return;

}



speechSynthesis.cancel();



let speech =
new SpeechSynthesisUtterance(text);



speech.rate=.9;


speech.pitch=1;



speechSynthesis.speak(speech);



}














// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 5 FINAL
// ENGINE OPTIMIZATION + RISK MODULE
// ======================================================



// ===============================
// FINAL ENGINE ELEMENTS
// ===============================


const engineBox =
document.getElementById("engineStatus");



let signalHistory = [];

let lastVoice = "";

let lastVoiceTime = 0;







// ===============================
// DATA WARMUP CHECK
// ===============================


function engineReady(){



return (

closes.length >= 200

&&

volumes.length >= 50

&&

candles.length >= 50

);



}







// ===============================
// SAFE SCAN OVERRIDE
// ===============================


function checkMarketReady(){



if(!engineReady()){


engineBox.innerHTML =

"Collecting Market Data";



return false;



}



return true;


}









// ===============================
// SIGNAL HISTORY
// ===============================


function saveSignal(data){



let record={


signal:data.signal,


confidence:data.confidence,


score:data.score,


price:market.price,


time:new Date()
.toLocaleTimeString()



};





signalHistory.unshift(record);





if(signalHistory.length>10){


signalHistory.pop();


}



}









// ===============================
// RISK MANAGEMENT ENGINE
// ===============================


function calculateRisk(){



let atr =
calculateATR();



if(!atr){



return {


entry:market.price,


stop:0,


target:0



};



}




let entry =
market.price;



let stop;



let target;





if(lastSignal==="LONG"){



stop =
entry - (atr*1.5);



target =
entry + (atr*3);



}




else if(lastSignal==="SHORT"){



stop =
entry + (atr*1.5);



target =
entry - (atr*3);



}



else{



stop =
entry-atr;


target =
entry+atr;



}





return {


entry,


stop,


target



};



}









// ===============================
// RISK DISPLAY
// ===============================


function displayRisk(){



let risk =
calculateRisk();




if(!risk.entry)
return;






console.log(

"ENTRY:",
risk.entry,

"STOP:",
risk.stop,

"TARGET:",
risk.target

);



}









// ===============================
// ADVANCED VOICE CONTROL
// ===============================


function smartVoice(text){



let now =
Date.now();



if(

text===lastVoice

&&

now-lastVoiceTime < 30000

){


return;


}




lastVoice=text;


lastVoiceTime=now;



voiceAlert(text);



}









// ===============================
// ENGINE HEALTH
// ===============================


function engineHealth(){



if(
candleSocket
&&
candleSocket.readyState===1
){



engineBox.innerHTML =

"ENGINE ONLINE";



}

else{


engineBox.innerHTML =

"RECONNECTING";



}



}








setInterval(

engineHealth,

5000

);









// ===============================
// FINAL SCAN WRAPPER
// ===============================


const originalScanner =
runScanner;





runScanner = function(){





if(!checkMarketReady()){


scanStatus.innerHTML =

"Waiting for enough market data";


scanBtn.disabled=false;


scanning=false;


return;


}





originalScanner();





let result =
generateSignal();



saveSignal(result);



displayRisk();




};









// ===============================
// MARKET PRICE HELPERS
// ===============================


function getEntryZone(){



let atr =
calculateATR();



return {


low:
market.price-atr,


high:
market.price+atr



};


}









// ===============================
// DEBUG INFORMATION
// ===============================


function engineDebug(){



return {


price:
market.price,


candles:
candles.length,


rsi:
calculateRSI(closes)
.toFixed(2),


trend:
detectTrend(),


signal:
lastSignal,


socket:
candleSocket
?
candleSocket.readyState
:
"offline"



};



}





console.log(
"BTC Quantum Scanner Loaded",
engineDebug()
);





// ======================================================
// BTC QUANTUM SCANNER PRO
// JAVASCRIPT PART 6 FINAL
// PROFESSIONAL QUANT UPGRADE LAYER
// ======================================================




// ===============================
// HISTORICAL DATA LOADER
// ===============================


async function loadHistoricalCandles(){


try{


engineBox.innerHTML =
"Loading Historical Data";



let response =
await fetch(

`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500`

);



let data =
await response.json();





data.forEach(c=>{



let candle={


open:
parseFloat(c[1]),


high:
parseFloat(c[2]),


low:
parseFloat(c[3]),


close:
parseFloat(c[4]),


volume:
parseFloat(c[5]),


time:
c[0]



};





candles.push(candle);


closes.push(candle.close);


highs.push(candle.high);


lows.push(candle.low);


volumes.push(candle.volume);



});






engineBox.innerHTML =
"Historical Data Ready";



updateIndicators();

updateMarketStructure();





}

catch(error){


console.log(
"Historical load error",
error
);



engineBox.innerHTML =
"Data Load Failed";



}



}






loadHistoricalCandles();









// ===============================
// MARKET CONDITION
// ===============================


function marketCondition(){



if(closes.length<50){

return "WAITING";

}



let atr =
calculateATR();



let price =
market.price;



let strength =
(atr/price)*100;






if(strength > 0.5){


return "HIGH VOLATILITY";


}



let trend =
detectTrend();




if(trend==="SIDEWAYS"){


return "RANGE MARKET";


}




return "TRENDING MARKET";



}









// ===============================
// EQUAL HIGH / LOW DETECTION
// ===============================


function detectLiquidityPools(){



if(highs.length<30){


return null;


}





let recentHighs =
highs.slice(-30);



let recentLows =
lows.slice(-30);




let equalHighs=[];

let equalLows=[];





for(
let i=0;
i<recentHighs.length-1;
i++
){



if(

Math.abs(

recentHighs[i]-
recentHighs[i+1]

)

<20

){


equalHighs.push(
recentHighs[i]
);


}





if(

Math.abs(

recentLows[i]-
recentLows[i+1]

)

<20

){


equalLows.push(
recentLows[i]
);


}




}





return {


highs:equalHighs,

lows:equalLows


};



}









// ===============================
// LIQUIDITY SWEEP
// ===============================


function detectLiquiditySweep(){



let pools =
detectLiquidityPools();



if(!pools){

return "NONE";

}





let lastHigh =
Math.max(...pools.highs);



let lastLow =
Math.min(...pools.lows);







if(
market.price > lastHigh
){


return "BUY SIDE SWEEP";


}





if(
market.price < lastLow
){


return "SELL SIDE SWEEP";


}






return "NONE";



}









// ===============================
// FAIR VALUE GAP
// ===============================


function detectFVG(){



if(candles.length<5){

return "NONE";

}




let c1 =
candles[candles.length-3];



let c3 =
candles[candles.length-1];





if(
c1.high < c3.low
){


return "BULLISH FVG";


}





if(
c1.low > c3.high
){


return "BEARISH FVG";


}




return "NONE";



}









// ===============================
// ORDER BLOCK BASIC
// ===============================


function detectOrderBlock(){



if(candles.length<10){

return "NONE";

}




let last =
candles[candles.length-1];


let previous =
candles[candles.length-2];





if(

last.close > previous.high

){


return "BULLISH ORDER BLOCK";


}





if(

last.close < previous.low

){


return "BEARISH ORDER BLOCK";


}






return "NONE";



}









// ===============================
// PROFESSIONAL CONFIRMATION
// ===============================


function professionalFilter(){



let score = 0;


let reasons=[];






let condition =
marketCondition();



if(condition==="TRENDING MARKET"){


score+=10;


reasons.push(
"Trend confirmed"
);


}





if(condition==="RANGE MARKET"){


score-=10;


reasons.push(
"Range warning"
);


}





let sweep =
detectLiquiditySweep();



if(
sweep==="BUY SIDE SWEEP"
){


score+=10;


reasons.push(
"Liquidity sweep"
);


}




if(
sweep==="SELL SIDE SWEEP"
){


score-=10;


reasons.push(
"Liquidity sweep"
);


}






let fvg =
detectFVG();



if(
fvg==="BULLISH FVG"
){


score+=10;


}





if(
fvg==="BEARISH FVG"
){


score-=10;


}






let ob =
detectOrderBlock();



if(
ob==="BULLISH ORDER BLOCK"
){


score+=10;


}




if(
ob==="BEARISH ORDER BLOCK"
){


score-=10;


}







return {


score,

condition,

sweep,

fvg,

ob,

reasons



};



}









// ===============================
// FINAL MARKET REPORT
// ===============================


function professionalReport(){



let data =
professionalFilter();




console.log(

"QUANT REPORT",

data

);



return data;



}






setInterval(()=>{


if(closes.length>100){


professionalReport();


}



},10000);

