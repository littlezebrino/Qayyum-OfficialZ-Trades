// ==========================
// COINS CONFIG
// ==========================


const coins = [


{
symbol:"btcusdt",
name:"BTCUSDT",
id:"btc"
},


{
symbol:"ethusdt",
name:"ETHUSDT",
id:"eth"
},


{
symbol:"solusdt",
name:"SOLUSDT",
id:"sol"
},


{
symbol:"xrpusdt",
name:"XRPUSDT",
id:"xrp"
},


{
symbol:"linkusdt",
name:"LINKUSDT",
id:"link"
},


{
symbol:"ltcusdt",
name:"LTCUSDT",
id:"ltc"
}


];








// ==========================
// STORAGE SYSTEM
// ==========================


let appVersion="6";


let savedVersion =
localStorage.getItem("appVersion");



if(savedVersion !== appVersion){


localStorage.removeItem("performance");

localStorage.removeItem("activeTrades");

localStorage.setItem(
"appVersion",
appVersion
);


}







let performance =

JSON.parse(
localStorage.getItem("performance")
)

||

{


totalSignals:0,

wins:0,

losses:0


};







let activeTrades =

JSON.parse(
localStorage.getItem("activeTrades")
)

||

[];








// ==========================
// SAVE FUNCTIONS
// ==========================



function savePerformance(){


localStorage.setItem(

"performance",

JSON.stringify(performance)

);


}





function saveTrades(){


localStorage.setItem(

"activeTrades",

JSON.stringify(activeTrades)

);


}









// ==========================
// PERFORMANCE DASHBOARD
// ==========================



function updatePerformanceDashboard(){



document.getElementById(
"total-signals"
).textContent =

performance.totalSignals;





document.getElementById(
"wins"
).textContent =

performance.wins;





document.getElementById(
"losses"
).textContent =

performance.losses;





savePerformance();



}









// ==========================
// BINANCE WEBSOCKET LIVE PRICE
// ==========================



function startPriceSocket(){



coins.forEach(coin=>{





let socket = new WebSocket(


`wss://stream.binance.com:9443/ws/${coin.symbol}@ticker`


);







socket.onmessage=function(event){



let data =
JSON.parse(event.data);





let price =
Number(data.c);





let element =

document.getElementById(
coin.id+"-price"
);





if(element){



element.textContent =

"$" + price.toLocaleString();



}



};







socket.onerror=function(){


console.log(
"WebSocket error:",
coin.name
);


};







socket.onclose=function(){



setTimeout(()=>{


startSingleSocket(coin);


},3000);



};



});



}









// reconnect helper


function startSingleSocket(coin){



let socket = new WebSocket(


`wss://stream.binance.com:9443/ws/${coin.symbol}@ticker`


);




socket.onmessage=function(event){


let data =
JSON.parse(event.data);



let price =
Number(data.c);




let element =

document.getElementById(
coin.id+"-price"
);



if(element){


element.textContent =

"$"+price.toLocaleString();


}



};



}









// START


updatePerformanceDashboard();


startPriceSocket();




  // ==========================
// EMA
// ==========================


function EMA(prices,period){



if(prices.length < period)

return prices[prices.length-1];




let multiplier =
2/(period+1);



let ema =
prices[0];




for(let i=1;i<prices.length;i++){



ema =

(prices[i]-ema)
*
multiplier
+
ema;



}



return ema;



}









// ==========================
// RSI
// ==========================


function RSI(prices,period=14){



if(prices.length <= period)

return 50;



let gains=0;

let losses=0;




for(
let i=prices.length-period;
i<prices.length;
i++
){



let change =
prices[i]-prices[i-1];




if(change>0)


gains += change;



else


losses += Math.abs(change);



}






if(losses===0)

return 100;





let rs =
gains/losses;




return 100-(100/(1+rs));



}









// ==========================
// MACD
// ==========================


function MACD(prices){



let ema12 =
EMA(prices,12);



let ema26 =
EMA(prices,26);




return ema12-ema26;



}









// ==========================
// ATR
// ==========================


function ATR(candles){



let total=0;



for(
let i=1;
i<candles.length;
i++
){



let high =
Number(candles[i][2]);



let low =
Number(candles[i][3]);



let previous =
Number(candles[i-1][4]);





let tr = Math.max(

high-low,

Math.abs(high-previous),

Math.abs(low-previous)

);



total += tr;



}





return total/(candles.length-1);



}









// ==========================
// VOLUME CONFIRMATION
// ==========================


function volumeCheck(candles){



let volumes =

candles.map(
c=>Number(c[5])
);




let current =

volumes[volumes.length-1];




let average =

volumes.reduce(
(a,b)=>a+b,
0
)
/
volumes.length;





if(current > average*1.2)

return "HIGH";



if(current < average*0.8)

return "LOW";



return "NORMAL";



}









// ==========================
// VWAP
// ==========================


function VWAP(candles){



let totalPV=0;

let totalVolume=0;





candles.forEach(c=>{



let price =

(
Number(c[2])+
Number(c[3])+
Number(c[4])
)
/3;




let volume =

Number(c[5]);





totalPV += price*volume;


totalVolume += volume;



});





return totalPV/totalVolume;



}









// ==========================
// GOLDEN CROSS
// ==========================


function goldenCross(prices){



let ema50 =
EMA(prices,50);



let ema200 =
EMA(prices,200);




return ema50 > ema200

?

"BULLISH"

:

"BEARISH";



}









// ==========================
// TREND STRENGTH FILTER
// ==========================


function trendStrength(prices){



let current =

prices[prices.length-1];



let previous =

prices[prices.length-20];




let change =

Math.abs(
(current-previous)
/
previous
)
*
100;






if(change > 1.5)

return "STRONG";



if(change > 0.5)

return "MEDIUM";



return "WEAK";



}




// ==========================
// SIGNAL ENGINE
// ==========================


async function generateSignal(coin){


try{



const response = await fetch(


`https://api.binance.com/api/v3/klines?symbol=${coin.name}&interval=15m&limit=500`


);




const candles = await response.json();





const closes = candles.map(

c=>Number(c[4])

);





const price =

closes[closes.length-1];






// INDICATORS


const ema20 = EMA(closes,20);

const ema50 = EMA(closes,50);

const rsi = RSI(closes);

const macd = MACD(closes);

const atr = ATR(candles);

const vwap = VWAP(candles);

const volume = volumeCheck(candles);

const golden = goldenCross(closes);

const trend = trendStrength(closes);








// ==========================
// SCORE SYSTEM
// ==========================



let bullish = 0;

let bearish = 0;







// EMA TREND


if(price > ema20 && ema20 > ema50)

bullish++;



if(price < ema20 && ema20 < ema50)

bearish++;







// RSI FILTER


if(rsi >=55 && rsi <=70)

bullish++;



if(rsi <=45 && rsi >=30)

bearish++;







// MACD


if(macd > 0)

bullish++;



if(macd < 0)

bearish++;








// VWAP


if(price > vwap)

bullish++;



if(price < vwap)

bearish++;








// GOLDEN CROSS


if(golden==="BULLISH")

bullish++;



if(golden==="BEARISH")

bearish++;








// VOLUME


if(volume==="HIGH"){


bullish++;

bearish++;


}








// TREND FILTER


if(trend==="STRONG"){


bullish++;

bearish++;

}


 






let signal="WAIT";

let bias="Neutral";

let confidence=0;







// ==========================
// FINAL DECISION
// ==========================



if(bullish >=5 && bullish > bearish){



signal="LONG";

bias="Bullish";


confidence =

Math.min(
95,
70 + bullish*5
);


}







else if(bearish >=5 && bearish > bullish){



signal="SHORT";

bias="Bearish";


confidence =

Math.min(
95,
70 + bearish*5
);


}






else{


signal="WAIT";

bias="Neutral";

confidence=0;


}



// ==========================
// TP SL SYSTEM
// ==========================


let sl="--";

let tp1="--";

let tp2="--";

let tp3="--";





if(signal==="LONG"){


sl =
(price*0.99).toFixed(4);


tp1 =
(price*1.008).toFixed(4);


tp2 =
(price*1.015).toFixed(4);


tp3 =
(price*1.025).toFixed(4);


}






if(signal==="SHORT"){


sl =
(price*1.01).toFixed(4);


tp1 =
(price*0.992).toFixed(4);


tp2 =
(price*0.985).toFixed(4);


tp3 =
(price*0.975).toFixed(4);


}



// ==========================
// UPDATE HTML
// ==========================



let id = coin.id;





document.getElementById(
id+"-signal"
).textContent = signal;




document.getElementById(
id+"-bias"
).textContent = bias;




document.getElementById(
id+"-confidence"
).textContent =

confidence+"%";






document.getElementById(
id+"-entry"
).textContent =

"$"+price.toFixed(4);






document.getElementById(
id+"-sl"
).textContent =

"$"+sl;






document.getElementById(
id+"-tp1"
).textContent =

"$"+tp1;






document.getElementById(
id+"-tp2"
).textContent =

"$"+tp2;






document.getElementById(
id+"-tp3"
).textContent =

"$"+tp3;








document.getElementById(
id+"-rsi"
).textContent =

rsi.toFixed(2);







document.getElementById(
id+"-ema"
).textContent =

ema20 > ema50

?

"Bullish"

:

"Bearish";







document.getElementById(
id+"-macd"
).textContent =

macd>0

?

"Positive"

:

"Negative";







document.getElementById(
id+"-adx"
).textContent =

trend;






document.getElementById(
id+"-vwap"
).textContent =

price>vwap

?

"Above"

:

"Below";







document.getElementById(
id+"-atr"
).textContent =

atr.toFixed(4);






document.getElementById(
id+"-volume"
).textContent = volume;






document.getElementById(
id+"-golden"
).textContent = golden;








// ANALYSIS TEXT


if(signal==="WAIT"){



document.getElementById(
id+"-analysis"
).textContent =

"Market waiting for stronger confirmation.";

}


else{


document.getElementById(
id+"-analysis"
).textContent =

`${bias} setup | RSI ${rsi.toFixed(2)} | MACD ${macd>0?"Positive":"Negative"} | Trend ${trend} | Volume ${volume}`;


}








// SAVE OPEN TRADE


if(signal!=="WAIT"){



let exists =

activeTrades.some(t=>

t.coin===coin.name &&
t.status==="OPEN"

);





if(!exists){



performance.totalSignals++;





activeTrades.push({


coin:coin.name,

signal:signal,

entry:price,

tp:Number(tp1),

sl:Number(sl),

status:"OPEN"


});






saveTrades();

savePerformance();

updatePerformanceDashboard();



}



}



}



catch(error){


console.log(
"Signal error:",
error
);


}



}









// ==========================
// RUN SIGNALS
// ==========================



function updateSignals(){



coins.forEach(coin=>{


generateSignal(coin);


});


}



updateSignals();



setInterval(

updateSignals,

60000

);





// ==========================
// TP / SL CHECKER
// ==========================


async function checkTradeResults(){


for(let i=0;i<activeTrades.length;i++){


let trade = activeTrades[i];



if(trade.status!=="OPEN")

continue;





try{


const response = await fetch(


`https://api.binance.com/api/v3/ticker/price?symbol=${trade.coin}`


);



const data = await response.json();



const currentPrice =

Number(data.price);






if(trade.signal==="LONG"){



if(currentPrice >= trade.tp){


trade.status="WIN";


performance.wins++;


}




else if(currentPrice <= trade.sl){


trade.status="LOSS";


performance.losses++;


}



}








if(trade.signal==="SHORT"){



if(currentPrice <= trade.tp){


trade.status="WIN";


performance.wins++;


}




else if(currentPrice >= trade.sl){


trade.status="LOSS";


performance.losses++;


}



}






saveTrades();

savePerformance();



}



catch(error){


console.log(error);


}



}



updatePerformanceDashboard();


}




setInterval(

checkTradeResults,

10000

);











// ==========================
// TRADE HISTORY
// ==========================



function showTradeHistory(){



let box =

document.getElementById(
"trade-history"
);




if(box.style.display==="none"){



box.style.display="block";

loadTradeHistory();



}

else{


box.style.display="none";


}



}








function loadTradeHistory(){



let list =

document.getElementById(
"history-list"
);




let trades =

activeTrades
.slice()
.reverse();





if(trades.length===0){


list.innerHTML =
"No trades yet";


return;


}






let html="";






trades.forEach(trade=>{



html += `


<div class="trade-item">


<b>${trade.coin}</b>
<br>


Signal:
${trade.signal}

<br>


Entry:
${trade.entry}

<br>


TP:
${trade.tp}

<br>


SL:
${trade.sl}

<br>


Status:
${trade.status}


</div>


`;



});






list.innerHTML=html;



}











// ==========================
// TRADING CALCULATOR
// ==========================



function calculateTrade(){



const type =

document.getElementById(
"trade-type"
).value;





const entry =

Number(

document.getElementById(
"entry-price"
).value

);





const exit =

Number(

document.getElementById(
"exit-price"
).value

);





const amount =

Number(

document.getElementById(
"amount"
).value

);






if(!entry || !exit || !amount){


alert(
"Please fill all fields correctly."
);


return;


}







let change;





if(type==="long"){


change =

(exit-entry)
/entry;


}

else{


change =

(entry-exit)
/entry;


}







let profit =

amount*change;







document.getElementById(
"profit"
).textContent =

profit.toFixed(2)+" USDT";






document.getElementById(
"percentage"
).textContent =

(change*100).toFixed(2)+"%";







let risk =

entry*0.008;



let reward =

Math.abs(exit-entry);





let rr =

reward/risk;







document.getElementById(
"rr"
).textContent =

rr.toFixed(2)+" R";



}









// ==========================
// STARTUP
// ==========================


document.addEventListener(

"DOMContentLoaded",

()=>{


updatePerformanceDashboard();


startPriceSocket();


updateSignals();



}

);
