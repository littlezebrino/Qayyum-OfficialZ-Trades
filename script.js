// =====================================
// BTC SMART MONEY RADAR AI
// JavaScript Part 1/5
// Binance Data + Chart Engine
// =====================================



const BINANCE_PRICE =
"https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT";


const BINANCE_CANDLES =
"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=100";





let candles = [];

let btcPrice = 0;

let chart = null;







// ===============================
// HTML ELEMENTS
// ===============================


const priceEl =
document.getElementById("price");


const changeEl =
document.getElementById("change");


const connectionEl =
document.getElementById("connection");


const updateEl =
document.getElementById("lastUpdate");








// ===============================
// GET BTC PRICE
// ===============================



async function loadPrice(){


try{


const response =
await fetch(BINANCE_PRICE);



const data =
await response.json();





btcPrice =
Number(data.lastPrice);




priceEl.innerHTML =

"$" +
btcPrice.toLocaleString();



changeEl.innerHTML =

Number(
data.priceChangePercent
)
.toFixed(2)
+
"%";




connectionEl.innerHTML =
"🟢 Binance Connected";




}

catch(error){


console.log(
"Price Error",
error
);



connectionEl.innerHTML =
"🔴 Binance Error";


}



}









// ===============================
// GET BTC 15M CANDLES
// ===============================



async function loadCandles(){



try{



const response =
await fetch(
BINANCE_CANDLES
);



const data =
await response.json();





candles =
data.map(item=>{


return {


time:item[0],


open:Number(item[1]),


high:Number(item[2]),


low:Number(item[3]),


close:Number(item[4]),


volume:Number(item[5])


};



});





updateEl.innerHTML =

"Data Updated: "
+
new Date()
.toLocaleTimeString();





drawChart();




}



catch(error){


console.log(
"Candle Error",
error
);


}



}









// ===============================
// CREATE CHART
// ===============================



function createChart(){



const ctx =

document
.getElementById(
"btcChart"
);



chart =

new Chart(
ctx,
{


type:"line",



data:{


labels:[],


datasets:[{


label:"BTCUSDT 15M",


data:[],


borderColor:"#38bdf8",


backgroundColor:
"rgba(56,189,248,0.15)",


borderWidth:2,


pointRadius:0,


tension:.3



}]

},





options:{


responsive:true,


maintainAspectRatio:false,



plugins:{


legend:{


labels:{


color:"#ffffff"


}



}


},



scales:{



x:{


ticks:{


color:"#94a3b8"


}



},




y:{


ticks:{


color:"#94a3b8"


}



}



}




}



}

);


}









// ===============================
// UPDATE CHART
// ===============================



function drawChart(){



if(!chart || candles.length===0){

return;

}




const last =

candles.slice(-50);





chart.data.labels =

last.map(c=>{


return new Date(
c.time
)
.toLocaleTimeString();



});





chart.data.datasets[0].data =

last.map(c=>c.close);




chart.update();



}









// ===============================
// INITIAL START
// ===============================



async function startSystem(){



createChart();



await loadPrice();



await loadCandles();



}



startSystem();


// =====================================
// JavaScript Part 2/5
// Indicators Engine
// =====================================






// ===============================
// EMA
// ===============================


function calculateEMA(data, period){



if(data.length < period){

return 0;

}



let multiplier =
2/(period+1);



let ema =

data
.slice(0,period)
.reduce(
(a,b)=>a+b,
0
)
/
period;





for(
let i=period;
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
// RSI
// ===============================


function calculateRSI(values, period=14){



if(values.length <= period){

return 50;

}



let gains=0;

let losses=0;



for(
let i=1;
i<=period;
i++
){



let diff =
values[i]-values[i-1];



if(diff>0){

gains+=diff;

}

else{

losses+=Math.abs(diff);

}



}




if(losses===0){

return 100;

}




let rs =
gains/losses;



return Number(

(
100 -
(100/(1+rs))
)
.toFixed(2)

);



}









// ===============================
// ATR
// ===============================


function calculateATR(data,period=14){



let ranges=[];



for(
let i=1;
i<data.length;
i++
){



let high =
data[i].high;


let low =
data[i].low;


let previous =
data[i-1].close;




let range =

Math.max(

high-low,

Math.abs(high-previous),

Math.abs(low-previous)

);



ranges.push(range);



}



let atr =

ranges
.slice(-period)
.reduce(
(a,b)=>a+b,
0
)
/
period;




return Number(
atr.toFixed(2)
);



}









// ===============================
// GET INDICATOR DATA
// ===============================



function getIndicators(){



let closes =

candles.map(
c=>c.close
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

calculateRSI(
closes
);




let atr =

calculateATR(
candles
);





return {


ema20,

ema50,

rsi,

atr


};



}









// ===============================
// MOMENTUM RADAR
// ===============================



function runMomentum(){



let data =
getIndicators();



let score = 50;




if(data.ema20 > data.ema50){


score +=20;


}

else{


score -=20;


}





if(data.rsi > 55){


score +=20;


}

else if(data.rsi <45){


score -=20;


}





score =

Math.max(
0,
Math.min(
100,
score
)
);






document
.getElementById(
"momentum"
)
.innerHTML =

score+"%";






document
.getElementById(
"momentumText"
)
.innerHTML =




score>=60

?

"Strong Buying Momentum"

:

score<=40

?

"Strong Selling Momentum"

:

"Neutral Momentum";





return score;



}









// ===============================
// VOLATILITY SCANNER
// ===============================



function runVolatility(){



let data =
getIndicators();




let value =

(
data.atr /
btcPrice
)
*
100;




let score =

Number(
(value*100)
.toFixed(2)
);






document
.getElementById(
"volatility"
)
.innerHTML =

score+"%";






document
.getElementById(
"volatilityText"
)
.innerHTML =




score>1.5

?

"Explosion Possible"

:

score>.8

?

"Increasing"

:

"Stable";





return score;



}









// ===============================
// MARKET REGIME
// ===============================



function detectRegime(){



let data =
getIndicators();



let regime =



data.ema20 >
data.ema50

?

"BULLISH"

:

"BEARISH";





document
.getElementById(
"regime"
)
.innerHTML =

regime;



return regime;



}


// =====================================
// JavaScript Part 3/5
// Smart Money Concept Engine
// =====================================






// ===============================
// STRUCTURE LEVELS
// ===============================


function getStructure(){



let recent =

candles.slice(-30);




let highs =

recent.map(
c=>c.high
);



let lows =

recent.map(
c=>c.low
);




return {


high:
Math.max(...highs),


low:
Math.min(...lows)


};



}









// ===============================
// LIQUIDITY SCAN
// ===============================



function scanLiquidity(){



let level =
getStructure();



let last =
candles[candles.length-1];



let result =
"NO LIQUIDITY";





if(last.high > level.high){


result =
"BUY SIDE LIQUIDITY TAKEN";


}



else if(last.low < level.low){


result =
"SELL SIDE LIQUIDITY TAKEN";


}





document
.getElementById(
"liquidity"
)
.innerHTML =

result;



return result;



}









// ===============================
// MARKET STRUCTURE
// ===============================



function scanStructure(){



let level =
getStructure();


let last =
candles[candles.length-1];



let result =
"RANGE";





if(last.close > level.high){


result =
"BULLISH BOS";


}



else if(last.close < level.low){


result =
"BEARISH BOS";


}





document
.getElementById(
"structure"
)
.innerHTML =

result;



return result;



}









// ===============================
// ORDER FLOW
// ===============================



function scanOrderFlow(){



let recent =

candles.slice(-20);



let buyers=0;

let sellers=0;





recent.forEach(c=>{



if(c.close > c.open){


buyers += c.volume;


}

else{


sellers += c.volume;


}



});





let pressure =


(
buyers /
(buyers+sellers)
)
*100;






let result;



if(pressure>55){


result =
"BUYERS ACTIVE";


}

else if(pressure<45){


result =
"SELLERS ACTIVE";


}

else{


result =
"BALANCED";


}






document
.getElementById(
"orderFlow"
)
.innerHTML =

result;



return pressure;



}









// ===============================
// SMART MONEY SCORE
// ===============================



function runSmartMoney(){



let score=50;





let liquidity =
scanLiquidity();



let structure =
scanStructure();



let flow =
scanOrderFlow();







if(
liquidity.includes("BUY")
){


score +=10;


}



if(
liquidity.includes("SELL")
){


score -=10;


}






if(
structure.includes("BULLISH")
){


score +=20;


}




if(
structure.includes("BEARISH")
){


score -=20;


}






if(flow>55){


score +=15;


}


else if(flow<45){


score -=15;


}






score =

Math.max(
0,
Math.min(
100,
score
)
);






document
.getElementById(
"smartMoney"
)
.innerHTML =

score+"%";






document
.getElementById(
"smartText"
)
.innerHTML =




score>=60

?

"Smart Money Buying"

:

score<=40

?

"Smart Money Selling"

:

"Smart Money Neutral";






return score;



}


    // =====================================
// JavaScript Part 4/5
// Final Signal Engine
// =====================================






// ===============================
// FINAL DECISION
// ===============================



function generateSignal(){



let momentum =
runMomentum();



let smart =
runSmartMoney();



let volatility =
runVolatility();



let regime =
detectRegime();






let score = 50;







// Momentum weight


if(momentum >=60){

score +=20;

}

else if(momentum <=40){

score -=20;

}






// Smart Money weight


if(smart >=60){

score +=25;

}

else if(smart <=40){

score -=25;

}







// Trend weight


if(regime==="BULLISH"){

score +=15;

}

else{

score -=15;

}







// Volatility filter


if(volatility > 2){

score -=10;

}






score =

Math.max(
0,
Math.min(
100,
score
)
);








let signal =
"WAIT";





if(score>=65){


signal =
"LONG NOW";


}


else if(score<=35){


signal =
"SHORT NOW";


}






updateSignal(
signal,
score
);



return {


signal,

confidence:score


};



}









// ===============================
// UPDATE SIGNAL UI
// ===============================



function updateSignal(
signal,
confidence
){



let box =

document
.getElementById(
"signal"
);





box.innerHTML =
signal;





box.className="";






if(signal==="LONG NOW"){


box.classList.add(
"long-signal"
);


}


else if(signal==="SHORT NOW"){


box.classList.add(
"short-signal"
);


}


else{


box.classList.add(
"wait-signal"
);


}






document
.getElementById(
"confidence"
)
.innerHTML =

Math.round(confidence)
+
"%";





document
.getElementById(
"confidenceBar"
)
.style.width =

confidence+"%";






createSetup(signal);





document
.getElementById(
"explanation"
)
.innerHTML =



"Signal generated from Momentum Radar, Smart Money analysis, Market Regime and Volatility Scanner.";





}









// ===============================
// TRADE PLAN
// ===============================



function createSetup(signal){



let atr =

calculateATR(
candles
);




let entry =
btcPrice;



let stop="--";

let target="--";






if(signal==="LONG NOW"){



stop =

entry - atr;



target =

entry + (atr*2);



}







if(signal==="SHORT NOW"){



stop =

entry + atr;



target =

entry - (atr*2);



}








document
.getElementById(
"entry"
)
.innerHTML =



"$"+
entry.toFixed(2);






document
.getElementById(
"stop"
)
.innerHTML =



stop==="--"

?

"--"

:

"$"+stop.toFixed(2);







document
.getElementById(
"target"
)
.innerHTML =



target==="--"

?

"--"

:

"$"+target.toFixed(2);



    }


    // =====================================
// JavaScript Part 5/5
// Scanner Controller + Voice + History
// =====================================






let scanning = false;







// ===============================
// VOICE SYSTEM
// ===============================



function speakResult(text){



if(
"speechSynthesis" in window
){



let speech =

new SpeechSynthesisUtterance(
text
);



speech.rate = 1;

speech.pitch = 1;



window
.speechSynthesis
.cancel();



window
.speechSynthesis
.speak(
speech
);



document
.getElementById(
"voiceStatus"
)
.innerHTML =

"🔊 Voice: "+text;



}



}









// ===============================
// 60 SECOND SCAN
// ===============================



async function startScan(){



if(scanning){

return;

}



scanning=true;



let button =

document
.getElementById(
"scanBtn"
);



let timer =

document
.getElementById(
"timer"
);



let status =

document
.getElementById(
"scanStatus"
);





button.disabled=true;



let seconds=60;






while(seconds>0){



timer.innerHTML =

seconds+"s";



status.innerHTML =

"Analyzing BTC 15M market structure...";



await new Promise(

resolve=>

setTimeout(
resolve,
1000
)

);



seconds--;



}






let result =

generateSignal();






timer.innerHTML =

"Complete";



status.innerHTML =

"Analysis finished";






saveHistory(
result.signal,
result.confidence
);






speakResult(

"Bitcoin analysis complete. "

+

result.signal

+

". Confidence "

+

Math.round(
result.confidence
)

+

" percent."

);







button.disabled=false;



scanning=false;



}









// ===============================
// HISTORY
// ===============================



function saveHistory(
signal,
confidence
){



let box =

document
.getElementById(
"history"
);





if(
box.innerHTML.includes(
"No scans yet"
)
){


box.innerHTML="";


}







let item =

document.createElement(
"div"
);





item.className =
"history-row";





item.innerHTML =


`

<span>
${new Date().toLocaleTimeString()}
</span>


<span>
${signal}
</span>


<span>
${Math.round(confidence)}%
</span>


<span>
BTCUSDT 15M
</span>

`;






box.prepend(item);



}









// ===============================
// BUTTON CONNECT
// ===============================



document
.getElementById(
"scanBtn"
)
.addEventListener(

"click",

startScan

);









// ===============================
// AUTO MARKET UPDATE
// ===============================



setInterval(

async()=>{


await loadPrice();


await loadCandles();



},

30000

);
