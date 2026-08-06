/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   MARKET DATA ENGINE
   ============================================ */



// ===============================
// DOM ELEMENTS
// ===============================


const btcPrice =
document.getElementById("btcPrice");


const priceChange =
document.getElementById("priceChange");


const marketState =
document.getElementById("marketState");


const priceTime =
document.getElementById("priceTime");





// ===============================
// MARKET STORAGE
// ===============================


let candles = [];

let closes = [];

let highs = [];

let lows = [];

let volumes = [];



let market = {


price:0,

volume:0,

change:0


};





// ===============================
// HISTORICAL DATA LOADER
// ===============================


async function loadHistory(){


try{


marketState.innerHTML =
"LOADING DATA";



const response =
await fetch(

"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500"

);



const data =
await response.json();





data.forEach(item=>{



let candle={


time:item[0],


open:parseFloat(item[1]),


high:parseFloat(item[2]),


low:parseFloat(item[3]),


close:parseFloat(item[4]),


volume:parseFloat(item[5])



};




candles.push(candle);


closes.push(candle.close);


highs.push(candle.high);


lows.push(candle.low);


volumes.push(candle.volume);



});





market.price =
closes[closes.length-1];



btcPrice.innerHTML =

"$"
+
market.price.toFixed(2);



marketState.innerHTML =
"DATA READY";



priceTime.innerHTML =
"Historical candles loaded";



createChart();



}

catch(error){


console.log(
"History error",
error
);



marketState.innerHTML =
"DATA ERROR";


}



}









// ===============================
// BINANCE LIVE WEBSOCKET
// ===============================



let socket;



function connectSocket(){



socket = new WebSocket(

"wss://stream.binance.com:9443/ws/btcusdt@kline_1m"

);






socket.onopen=()=>{


marketState.innerHTML =
"LIVE";


};







socket.onmessage=(event)=>{



let data =
JSON.parse(event.data);



let candleData =
data.k;




let close =
parseFloat(
candleData.c
);




let volume =
parseFloat(
candleData.v
);





market.price =
close;


market.volume =
volume;




btcPrice.innerHTML =

"$"
+
close.toFixed(2);





updateLiveCandle(candleData);



};








socket.onerror=()=>{


marketState.innerHTML =
"ERROR";


};







socket.onclose=()=>{


marketState.innerHTML =
"RECONNECTING";



setTimeout(

connectSocket,

3000

);



};



}





// ===============================
// UPDATE CURRENT CANDLE
// ===============================


function updateLiveCandle(data){



let last =
candles[candles.length-1];




if(!last){


return;


}




last.close =
parseFloat(data.c);



last.high =
parseFloat(data.h);



last.low =
parseFloat(data.l);



last.volume =
parseFloat(data.v);




closes[closes.length-1]=last.close;

highs[highs.length-1]=last.high;

lows[lows.length-1]=last.low;

volumes[volumes.length-1]=last.volume;



updateChart(last.close);



}









// ===============================
// CHART
// ===============================


let chart;



function createChart(){



const ctx =

document
.getElementById("priceChart")
.getContext("2d");




chart = new Chart(ctx,{


type:"line",


data:{


labels:closes.map(
()=>""),



datasets:[{

label:"BTC",


data:closes,


borderColor:"#00f5ff",


borderWidth:2,


tension:.4,


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


x:{display:false},


y:{display:false}



}



}



});



}








function updateChart(price){



if(!chart)
return;




chart.data.datasets[0].data.push(price);


chart.data.labels.push("");




if(chart.data.datasets[0].data.length>100){


chart.data.datasets[0].data.shift();


chart.data.labels.shift();


}



chart.update("none");



}








// ===============================
// START ENGINE
// ===============================



loadHistory();


connectSocket();



/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   INDICATORS ENGINE
   ================================================== */



// ===============================
// INDICATOR ELEMENTS
// ===============================


const rsiBox =
document.getElementById("rsi");


const ema20Box =
document.getElementById("ema20");


const ema50Box =
document.getElementById("ema50");


const ema200Box =
document.getElementById("ema200");


const macdBox =
document.getElementById("macd");


const vwapBox =
document.getElementById("vwap");


const atrBox =
document.getElementById("atr");


const volumeBox =
document.getElementById("volume");


const volatilityBox =
document.getElementById("volatility");





// ===============================
// RSI WILDER METHOD
// ===============================


function calculateRSI(period=14){



if(closes.length <= period){

return 50;

}



let gains=0;

let losses=0;



for(
let i=closes.length-period;
i<closes.length;
i++
){


let change =
closes[i]-closes[i-1];



if(change>0){

gains+=change;

}

else{

losses+=Math.abs(change);

}


}





let avgGain =
gains/period;


let avgLoss =
losses/period;





if(avgLoss===0){


return 70;


}





let rs =
avgGain/avgLoss;



let rsi =

100 -

(
100/
(1+rs)
);



return Math.min(
100,
Math.max(
0,
rsi
)
);



}









// ===============================
// EMA
// ===============================


function calculateEMA(period){



if(closes.length < period){


return 0;


}



let multiplier =
2/(period+1);



let ema =
closes[0];




for(
let i=1;
i<closes.length;
i++
){



ema =

(
closes[i]-ema
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


function calculateMACD(){



let ema12 =
calculateEMA(12);


let ema26 =
calculateEMA(26);



let value =
ema12-ema26;



return value;



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





if(totalVolume===0){

return 0;

}



return totalValue/totalVolume;



}









// ===============================
// ATR
// ===============================


function calculateATR(period=14){



if(candles.length<=period){


return 0;


}



let tr=[];




for(
let i=candles.length-period;
i<candles.length;
i++
){



let current =
candles[i];


let previous =
candles[i-1];




let range = Math.max(

current.high-current.low,


Math.abs(
current.high-previous.close
),


Math.abs(
current.low-previous.close
)

);



tr.push(range);



}




return tr.reduce(
(a,b)=>a+b,
0
)
/period;



}









// ===============================
// VOLUME
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
volumes[volumes.length-1];





if(current > average*1.5){


return "HIGH";


}



if(current < average*.7){


return "LOW";


}



return "NORMAL";



}









// ===============================
// VOLATILITY
// ===============================


function calculateVolatility(){



if(closes.length<20){


return 0;


}



let recent =
closes.slice(-20);



let high =
Math.max(...recent);



let low =
Math.min(...recent);



return high-low;



}









// ===============================
// UPDATE ALL INDICATORS
// ===============================


function updateIndicators(){



let rsi =
calculateRSI();



let ema20 =
calculateEMA(20);



let ema50 =
calculateEMA(50);



let ema200 =
calculateEMA(200);



let macd =
calculateMACD();



let vwap =
calculateVWAP();



let atr =
calculateATR();



rsiBox.innerHTML =
rsi.toFixed(2);



ema20Box.innerHTML =
ema20.toFixed(2);



ema50Box.innerHTML =
ema50.toFixed(2);



ema200Box.innerHTML =
ema200.toFixed(2);



macdBox.innerHTML =
macd.toFixed(2);



vwapBox.innerHTML =
vwap.toFixed(2);



atrBox.innerHTML =
atr.toFixed(2);



volumeBox.innerHTML =
analyzeVolume();



volatilityBox.innerHTML =
calculateVolatility().toFixed(2);



}








// ===============================
// AUTO UPDATE
// ===============================


setInterval(()=>{


if(closes.length>50){


updateIndicators();


}



},3000);



/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 3
   MARKET INTELLIGENCE ENGINE
   ================================================== */



// ===============================
// INTELLIGENCE ELEMENTS
// ===============================


const trendBox =
document.getElementById("trend");


const structureBox =
document.getElementById("structure");


const liquidityZoneBox =
document.getElementById("liquidityZone");


const marketConditionBox =
document.getElementById("marketCondition");







// ===============================
// TREND DETECTION
// ===============================


function detectTrend(){



if(closes.length < 50){

return "WAITING";

}



let ema20 =
calculateEMA(20);


let ema50 =
calculateEMA(50);





if(
market.price > ema20 &&
ema20 > ema50
){


return "BULLISH";


}




if(
market.price < ema20 &&
ema20 < ema50
){


return "BEARISH";


}




return "SIDEWAYS";



}









// ===============================
// SWING HIGH / LOW
// ===============================


function getSwingLevels(){



let recentHighs =
highs.slice(-50);


let recentLows =
lows.slice(-50);





return {


high:
Math.max(...recentHighs),



low:
Math.min(...recentLows)



};



}









// ===============================
// SUPPORT / RESISTANCE
// ===============================


function calculateLiquidityZone(){



let levels =
getSwingLevels();



return {


resistance:
levels.high,


support:
levels.low



};



}









// ===============================
// BREAK OF STRUCTURE
// ===============================


function detectBOS(){



let zone =
getSwingLevels();



if(
market.price > zone.high
){


return "BULLISH BOS";


}




if(
market.price < zone.low
){


return "BEARISH BOS";


}



return "NO BOS";



}









// ===============================
// CHOCH
// ===============================


function detectCHOCH(){



if(closes.length < 60){

return "WAITING";

}



let previous =
closes[closes.length-30];



let current =
market.price;






if(
current > previous &&
detectTrend()==="BULLISH"
){


return "BULLISH CHOCH";


}





if(
current < previous &&
detectTrend()==="BEARISH"
){


return "BEARISH CHOCH";


}




return "NO CHOCH";



}









// ===============================
// LIQUIDITY POOL
// ===============================


function detectLiquidity(){



let zone =
getSwingLevels();




let distanceHigh =
Math.abs(
market.price-zone.high
);



let distanceLow =
Math.abs(
market.price-zone.low
);





if(distanceHigh < distanceLow){


return (

"BUY SIDE @ "

+

zone.high.toFixed(2)

);


}



else{


return (

"SELL SIDE @ "

+

zone.low.toFixed(2)

);


}



}









// ===============================
// FAIR VALUE GAP
// ===============================


function detectFVG(){



if(candles.length < 5){

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
// ORDER BLOCK
// ===============================


function detectOrderBlock(){



if(candles.length < 10){

return "NONE";

}



let last =
candles[candles.length-1];


let previous =
candles[candles.length-2];






if(
last.close > previous.high
){


return "BULLISH OB";


}




if(
last.close < previous.low
){


return "BEARISH OB";


}



return "NONE";



}









// ===============================
// MARKET CONDITION
// ===============================


function detectMarketCondition(){



let atr =
calculateATR();



let volatility =
atr/market.price*100;





if(volatility > 0.5){


return "HIGH VOLATILITY";


}



if(
detectTrend()==="SIDEWAYS"
){


return "RANGE MARKET";


}



return "TRENDING MARKET";



}









// ===============================
// UPDATE INTELLIGENCE
// ===============================


function updateMarketIntelligence(){



let trend =
detectTrend();



let zone =
calculateLiquidityZone();





trendBox.innerHTML =
trend;



structureBox.innerHTML =

detectBOS()
+
" | "
+
detectCHOCH();





liquidityZoneBox.innerHTML =

detectLiquidity();



marketConditionBox.innerHTML =

detectMarketCondition();



}








setInterval(()=>{


if(closes.length>50){


updateMarketIntelligence();


}



},5000);



/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   FINAL SCANNER ENGINE
   ================================================== */



// ===============================
// FINAL ELEMENTS
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


const liquidityBox =
document.getElementById("liquidity");


const signalTime =
document.getElementById("signalTime");


const entryBox =
document.getElementById("entry");


const stopBox =
document.getElementById("stopLoss");


const targetBox =
document.getElementById("target");


const rrBox =
document.getElementById("riskReward");


const voiceText =
document.getElementById("voiceText");





let scanning=false;










// ===============================
// SCORING ENGINE
// ===============================


function calculateScore(){



let score=0;


let reasons=[];




// TREND


let trend =
detectTrend();



if(trend==="BULLISH"){


score+=25;


reasons.push("Bullish trend");


}


else if(trend==="BEARISH"){


score-=25;


reasons.push("Bearish trend");


}






// RSI


let rsi =
calculateRSI();



if(
rsi>45 &&
rsi<65
){


score+=10;


reasons.push("Healthy RSI");


}


else if(rsi>70){


score-=10;


reasons.push("Overbought");


}


else if(rsi<30){


score+=10;


reasons.push("Oversold");


}








// MACD


let macd =
calculateMACD();



if(macd>0){


score+=15;


reasons.push("MACD positive");


}

else{


score-=15;


reasons.push("MACD negative");


}








// VWAP


let vwap =
calculateVWAP();



if(
market.price>vwap
){


score+=10;


reasons.push("Above VWAP");


}

else{


score-=10;


reasons.push("Below VWAP");


}








// BOS


let bos =
detectBOS();



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








// VOLUME


if(
analyzeVolume()==="HIGH"
){


score+=10;


reasons.push("Volume increase");


}









return {


score,

reasons


};



}









// ===============================
// FINAL SIGNAL
// ===============================


function generateSignal(){



let data =
calculateScore();



let score =
data.score;



let result =
"WAIT";





if(score>=35){


result="LONG";


}


else if(score<=-35){


result="SHORT";


}






let confidence =

Math.min(

95,

Math.max(

50,

Math.abs(score)+50

)

);






return {


signal:result,

confidence,

score,

reasons:data.reasons


};



}









// ===============================
// RISK CALCULATION
// ===============================


function calculateRisk(signal){



let atr =
calculateATR();



let entry =
market.price;



let stop;

let target;






if(signal==="LONG"){



stop =
entry-(atr*1.5);



target =
entry+(atr*3);



}





else if(signal==="SHORT"){



stop =
entry+(atr*1.5);



target =
entry-(atr*3);



}





else{


stop=0;

target=0;


}






let rr =

Math.abs(
target-entry
)

/

Math.abs(
entry-stop
);





return {


entry,

stop,

target,

rr


};



}









// ===============================
// SHOW RESULT
// ===============================


function displaySignal(data){



signalBox.innerHTML =
data.signal;



confidenceBox.innerHTML =

data.confidence.toFixed(0)
+
"%";





if(data.signal==="LONG"){



signalBox.style.color =
"#00ff88";


momentumBox.innerHTML =
"BUY PRESSURE";


speak(
"Long opportunity detected"
);



}





else if(data.signal==="SHORT"){



signalBox.style.color =
"#ff4d6d";


momentumBox.innerHTML =
"SELL PRESSURE";


speak(
"Short opportunity detected"
);



}





else{


signalBox.style.color =
"#ffd166";


momentumBox.innerHTML =
"NEUTRAL";


speak(
"No clear opportunity"
);



}







let risk =
calculateRisk(
data.signal
);



entryBox.innerHTML =
risk.entry.toFixed(2);



stopBox.innerHTML =
risk.stop.toFixed(2);



targetBox.innerHTML =
risk.target.toFixed(2);



rrBox.innerHTML =
risk.rr.toFixed(2);





signalTime.innerHTML =

new Date()
.toLocaleTimeString();



liquidityBox.innerHTML =

detectLiquidity();



}









// ===============================
// SCAN BUTTON
// ===============================


scanBtn.onclick=function(){



if(scanning)
return;



if(closes.length<100){



scanStatus.innerHTML =
"Collecting data...";


return;


}



scanning=true;


scanBtn.disabled=true;



let seconds=10;


scanTimer.innerHTML =
seconds;



engineStatus.innerHTML =
"Scanning Market...";





let timer =
setInterval(()=>{



seconds--;


scanTimer.innerHTML =
seconds;



if(seconds<=0){



clearInterval(timer);


let result =
generateSignal();



displaySignal(result);



scanTimer.innerHTML =
"READY";


scanStatus.innerHTML =
"Analysis Complete";


engineStatus.innerHTML =
"Engine Ready";



scanBtn.disabled=false;


scanning=false;



}



},1000);



};









// ===============================
// VOICE
// ===============================


function speak(text){



voiceText.innerHTML =
text;



if(
speechSynthesis
){


speechSynthesis.cancel();



let msg =
new SpeechSynthesisUtterance(text);


msg.rate=.9;


speechSynthesis.speak(msg);



}



}
