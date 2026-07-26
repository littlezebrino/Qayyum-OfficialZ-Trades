const coins = [
{symbol:"BTCUSDT",name:"BTC"},
{symbol:"ETHUSDT",name:"ETH"},
{symbol:"SOLUSDT",name:"SOL"},
{symbol:"XRPUSDT",name:"XRP"},
{symbol:"LINKUSDT",name:"LINK"}
];


// PRICE

async function loadPrice(symbol,id){

try{

let res = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

let data = await res.json();

document.getElementById(id+"-price").innerHTML =
"$"+Number(data.price).toLocaleString();


}catch(e){

console.log(e);

}

}



function updatePrices(){

loadPrice("BTCUSDT","btc");
loadPrice("ETHUSDT","eth");
loadPrice("SOLUSDT","sol");
loadPrice("XRPUSDT","xrp");
loadPrice("LINKUSDT","link");

}


updatePrices();

setInterval(updatePrices,5000);





// EMA

function EMA(data,period){

let k=2/(period+1);

let ema=data[0];

for(let i=1;i<data.length;i++){

ema=(data[i]-ema)*k+ema;

}

return ema;

}




// RSI

function RSI(data,period=14){

let gain=0;
let loss=0;


for(let i=data.length-period;i<data.length;i++){

let diff=data[i]-data[i-1];


if(diff>0){

gain+=diff;

}else{

loss-=diff;

}

}


if(loss===0){

return 100;

}


let rs=gain/loss;

return 100-(100/(1+rs));

}





// SIGNAL

async function generateSignal(coin){


try{


let res=await fetch(

"https://api.binance.com/api/v3/klines?symbol="+coin.symbol+"&interval=15m&limit=100"

);


let candles=await res.json();


let closes=candles.map(c=>Number(c[4]));


let price=closes[closes.length-1];


let rsi=RSI(closes);

let ema20=EMA(closes,20);

let ema50=EMA(closes,50);



let signal="WAIT";

let bias="Neutral";

let confidence=50;




if(price>ema20 && rsi>50){

signal="LONG";
bias="Bullish";
confidence=75;

}



else if(price<ema20 && rsi<50){

signal="SHORT";
bias="Bearish";
confidence=75;

}





let sl="--";
let tp1="--";
let tp2="--";
let tp3="--";




// REALISTIC TARGETS

if(signal==="LONG"){

sl="$"+(price*0.99).toFixed(4);

tp1="$"+(price*1.01).toFixed(4);

tp2="$"+(price*1.02).toFixed(4);

tp3="$"+(price*1.03).toFixed(4);

}



if(signal==="SHORT"){

sl="$"+(price*1.01).toFixed(4);

tp1="$"+(price*0.99).toFixed(4);

tp2="$"+(price*0.98).toFixed(4);

tp3="$"+(price*0.97).toFixed(4);

}





// SHOW SIGNAL

document.getElementById("coin-name").innerHTML=coin.name;

document.getElementById("signal").innerHTML=signal;

document.getElementById("bias").innerHTML=bias;

document.getElementById("confidence").innerHTML=confidence+"%";

document.getElementById("entry").innerHTML="$"+price.toFixed(4);

document.getElementById("stoploss").innerHTML=sl;

document.getElementById("tp1").innerHTML=tp1;

document.getElementById("tp2").innerHTML=tp2;

document.getElementById("tp3").innerHTML=tp3;

document.getElementById("rsi").innerHTML=rsi.toFixed(2);

document.getElementById("trend").innerHTML=
ema20>ema50 ? "Uptrend" : "Downtrend";





// AI ANALYSIS

document.getElementById("analysis").innerHTML=

coin.name+" Analysis: "+bias+
" trend detected. RSI "+rsi.toFixed(2)+
". Signal strength "+confidence+"%";





// HISTORY

if(signal!=="WAIT"){

let old=localStorage.getItem("trades") || "";

let trade=

coin.name+" | "+signal+
" | Entry: $"+price.toFixed(4)+
" | SL: "+sl+
" | TP1: "+tp1+
"<br>";

localStorage.setItem("trades",trade+old);


document.getElementById("history").innerHTML=
localStorage.getItem("trades");

}


}


catch(error){

console.log(error);

}


}




// RUN ALL COINS

coins.forEach(coin=>{

generateSignal(coin);

});



setInterval(()=>{

coins.forEach(coin=>{

generateSignal(coin);

});

},60000);
