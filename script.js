// ==========================
// COINS
// ==========================


const coins = [

{
symbol:"BTCUSDT",
id:"btc"
},

{
symbol:"ETHUSDT",
id:"eth"
},

{
symbol:"SOLUSDT",
id:"sol"
},

{
symbol:"XRPUSDT",
id:"xrp"
},

{
symbol:"LINKUSDT",
id:"link"
},

{
symbol:"LTCUSDT",
id:"ltc"
}

];




// ==========================
// APP STORAGE
// ==========================


let appVersion = "4";


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



document.getElementById("total-signals").textContent =

performance.totalSignals;




document.getElementById("wins").textContent =

performance.wins;




document.getElementById("losses").textContent =

performance.losses;





let accuracy = 0;



if(performance.totalSignals > 0){


accuracy =

(performance.wins / performance.totalSignals) * 100;


}




document.getElementById("accuracy").textContent =

accuracy.toFixed(1)+"%";




savePerformance();



}




updatePerformanceDashboard();






// ==========================
// LIVE PRICE SYSTEM
// ==========================



async function loadPrice(symbol,id){


try{



const response = await fetch(


`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`


);



const data = await response.json();




document.getElementById(id+"-price").textContent =


"$" + Number(data.price).toLocaleString();




}

catch(error){


console.log(error);


}



}








function updatePrices(){



coins.forEach(coin=>{


loadPrice(

coin.symbol,

coin.id

);



});



}




updatePrices();




setInterval(

updatePrices,

5000

);








// ==========================
// EMA INDICATOR
// ==========================



function EMA(prices,period){



let multiplier =

2/(period+1);




let ema = prices[0];





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
// RSI INDICATOR
// ==========================



function RSI(prices,period=14){



let gains = 0;

let losses = 0;




for(

let i = prices.length-period;

i < prices.length;

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



let total = 0;




for(let i=1;i<candles.length;i++){



let high =

Number(candles[i][2]);



let low =

Number(candles[i][3]);




total += high-low;



}




return total/(candles.length-1);



}


// ==========================
// SIGNAL ENGINE
// ==========================


async function generateSignal(coin){


try{


const response = await fetch(

`https://api.binance.com/api/v3/klines?symbol=${coin.symbol}&interval=15m&limit=200`

);



const candles = await response.json();



const closes = candles.map(c=>Number(c[4]));



const price =
closes[closes.length-1];



const ema20 =
EMA(closes,20);


const ema50 =
EMA(closes,50);



const rsi =
RSI(closes);



const macd =
MACD(closes);



const atr =
ATR(candles);



const adx =
ADX(closes);



const vwap =
VWAP(candles);



const volume =
volumeCheck(candles);



const golden =
goldenCross(closes);






let signal="WAIT";

let bias="Neutral";

let confidence=50;





// ===============================
// CONFIRMATION SCORE
// ===============================


let bullishScore=0;

let bearishScore=0;




if(price > ema20 && ema20 > ema50){

bullishScore++;

}



if(price < ema20 && ema20 < ema50){

bearishScore++;

}




if(rsi > 55){

bullishScore++;

}



if(rsi < 45){

bearishScore++;

}




if(macd > 0){

bullishScore++;

}



if(macd < 0){

bearishScore++;

}




if(golden==="BULLISH"){

bullishScore++;

}



if(golden==="BEARISH"){

bearishScore++;

}




if(volume==="HIGH"){

bullishScore++;

bearishScore++;

}





if(bullishScore>=4){


signal="LONG";

bias="Bullish";

confidence=80+(bullishScore*2);


}



else if(bearishScore>=4){


signal="SHORT";

bias="Bearish";

confidence=80+(bearishScore*2);


}






// ===============================
// TP SL CALCULATION
// ===============================


let sl="--";

let tp1="--";

let tp2="--";

let tp3="--";





if(signal==="LONG"){


sl=(price*0.99).toFixed(4);


tp1=(price*1.008).toFixed(4);


tp2=(price*1.016).toFixed(4);


tp3=(price*1.025).toFixed(4);


}





if(signal==="SHORT"){


sl=(price*1.01).toFixed(4);


tp1=(price*0.992).toFixed(4);


tp2=(price*0.984).toFixed(4);


tp3=(price*0.975).toFixed(4);


}






const id = coin.id;





// ===============================
// HTML UPDATE
// ===============================


document.getElementById(id+"-signal").textContent =
signal;


document.getElementById(id+"-bias").textContent =
bias;



document.getElementById(id+"-confidence").textContent =
confidence+"%";



document.getElementById(id+"-entry").textContent =
"$"+price.toFixed(4);



document.getElementById(id+"-sl").textContent =
"$"+sl;



document.getElementById(id+"-tp1").textContent =
"$"+tp1;



document.getElementById(id+"-tp2").textContent =
"$"+tp2;



document.getElementById(id+"-tp3").textContent =
"$"+tp3;






document.getElementById(id+"-rsi").textContent =
rsi.toFixed(2);




let emaElement =
document.getElementById(id+"-ema");


if(emaElement){

emaElement.textContent =
ema20>ema50 ? "Bullish" : "Bearish";

}





document.getElementById(id+"-trend").textContent =
bias;



document.getElementById(id+"-macd").textContent =
macd>0 ? "Positive" : "Negative";



document.getElementById(id+"-adx").textContent =
adx;



document.getElementById(id+"-vwap").textContent =
price>vwap ? "Above" : "Below";



document.getElementById(id+"-atr").textContent =
atr.toFixed(4);



document.getElementById(id+"-volume").textContent =
volume;



document.getElementById(id+"-golden").textContent =
golden;





if(signal==="WAIT"){


document.getElementById(id+"-analysis").textContent =

"Market is neutral. Waiting for setup confirmation.";


}

else{


document.getElementById(id+"-analysis").textContent =

`${bias} setup confirmed | RSI ${rsi.toFixed(2)} | MACD ${macd>0?"Positive":"Negative"} | ADX ${adx} | Volume ${volume} | Golden Cross ${golden}`;


}






// ===============================
// SAVE ACTIVE TRADE
// ===============================


if(signal!=="WAIT"){



let exists = activeTrades.some(t=>

t.coin===coin.symbol &&
t.status==="OPEN"

);



if(!exists){


performance.totalSignals++;



activeTrades.push({


coin:coin.symbol,

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

console.log(error);

}



    }


// =====================================
// RUN SIGNAL SYSTEM
// =====================================


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





// =====================================
// TP SL LIVE CHECKER
// =====================================


async function checkTradeResults(){


for(let i=0;i<activeTrades.length;i++){


let trade = activeTrades[i];



if(trade.status !== "OPEN")
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







// =====================================
// TRADE HISTORY
// =====================================


function showTradeHistory(){


let box =
document.getElementById("trade-history");



if(box.style.display==="none"){


box.style.display="block";


loadTradeHistory();


}


else{


box.style.display="none";


}



}






function loadTradeHistory(){



let html="";



let trades =
activeTrades
.slice(-6)
.reverse();





if(trades.length===0){


html="No trades yet";


}


else{



trades.forEach(trade=>{


html += `


<div class="trade-item">


<b>${trade.coin}</b><br>


Type: ${trade.signal}<br>


Entry: ${trade.entry}<br>


TP: ${trade.tp}<br>


SL: ${trade.sl}<br>


Status: ${trade.status}


</div>


`;


});



}



document.getElementById("history-list").innerHTML =
html;


}







// =====================================
// TRADING CALCULATOR
// =====================================


function calculateTrade(){



const type =
document.getElementById("trade-type").value;



const entry =
Number(document.getElementById("entry-price").value);



const exit =
Number(document.getElementById("exit-price").value);



const amount =
Number(document.getElementById("amount").value);





if(!entry || !exit || !amount){


alert("Please fill all fields correctly.");

return;


}




let change;



if(type==="long"){


change =
(exit-entry)/entry;


}

else{


change =
(entry-exit)/entry;


}





let profit =
amount*change;




document.getElementById("profit").textContent =

profit.toFixed(2)+" USDT";





document.getElementById("percentage").textContent =

(change*100).toFixed(2)+"%";






let rr =
Math.abs(exit-entry)/(entry*0.01);




document.getElementById("rr").textContent =

rr.toFixed(2)+" R";



}







// =====================================
// STARTUP
// =====================================


document.addEventListener(
"DOMContentLoaded",
()=>{


updatePrices();


updateSignals();


updatePerformanceDashboard();



});
