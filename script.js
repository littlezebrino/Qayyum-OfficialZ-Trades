const coins = [
{symbol:"BTCUSDT", id:"btc"},
{symbol:"ETHUSDT", id:"eth"},
{symbol:"SOLUSDT", id:"sol"},
{symbol:"XRPUSDT", id:"xrp"},
{symbol:"LINKUSDT", id:"link"}
];


// PRICE LOAD

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

coins.forEach(c=>{

loadPrice(c.symbol,c.id);

});

}


updatePrices();

setInterval(updatePrices,5000);




// EMA

function EMA(data,period){

let k=2/(period+1);

let ema=data[0];

for(let i=1;i<data.length;i++){

ema=(data[i]*k)+(ema*(1-k));

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


if(loss===0) return 100;


let rs=gain/loss;

return 100-(100/(1+rs));

}



// MACD

function MACD(data){

let ema12=EMA(data,12);

let ema26=EMA(data,26);

return ema12-ema26;

}

// SIGNAL GENERATOR

async function generateSignal(coin){

try{


let response = await fetch(

"https://api.binance.com/api/v3/klines?symbol="+coin.symbol+"&interval=15m&limit=100"

);


let candles = await response.json();



let closes = candles.map(c=>Number(c[4]));

let volumes = candles.map(c=>Number(c[5]));



let price = closes[closes.length-1];

let rsi = RSI(closes);

let ema20 = EMA(closes,20);

let ema50 = EMA(closes,50);

let macd = MACD(closes);



let avgVolume =
volumes.reduce((a,b)=>a+b,0)/volumes.length;


let currentVolume =
volumes[volumes.length-1];



let signal="WAIT";

let bias="Neutral";

let confidence=50;



// LONG

if(
price > ema20 &&
ema20 > ema50 &&
rsi > 50 &&
macd > 0 &&
currentVolume > avgVolume
){

signal="LONG";
bias="Bullish";
confidence=80;

}



// SHORT

else if(

price < ema20 &&
ema20 < ema50 &&
rsi < 50 &&
macd < 0 &&
currentVolume > avgVolume

){

signal="SHORT";
bias="Bearish";
confidence=80;

}




let sl="--";
let tp1="--";
let tp2="--";
let tp3="--";



// LONG TARGET

if(signal==="LONG"){

sl="$"+(price*0.97).toFixed(4);

tp1="$"+(price*1.03).toFixed(4);

tp2="$"+(price*1.06).toFixed(4);

tp3="$"+(price*1.10).toFixed(4);

}



// SHORT TARGET

if(signal==="SHORT"){

sl="$"+(price*1.03).toFixed(4);

tp1="$"+(price*0.97).toFixed(4);

tp2="$"+(price*0.94).toFixed(4);

tp3="$"+(price*0.90).toFixed(4);

}





let id=coin.id;



document.getElementById(id+"-signal").innerHTML=signal;

document.getElementById(id+"-bias").innerHTML=bias;

document.getElementById(id+"-confidence").innerHTML=
confidence+"%";

document.getElementById(id+"-rsi").innerHTML=
rsi.toFixed(2);


document.getElementById(id+"-trend").innerHTML=
ema20>ema50 ? "UPTREND" : "DOWNTREND";


document.getElementById(id+"-entry").innerHTML=
"$"+price.toFixed(4);


document.getElementById(id+"-sl").innerHTML=sl;

document.getElementById(id+"-tp1").innerHTML=tp1;

document.getElementById(id+"-tp2").innerHTML=tp2;

document.getElementById(id+"-tp3").innerHTML=tp3;



// Color

let el=document.getElementById(id+"-signal");


if(signal==="LONG"){

el.style.color="lime";

}

else if(signal==="SHORT"){

el.style.color="red";

}

else{

el.style.color="orange";

}



document.getElementById("analysis").innerHTML =

"Indicators checked: RSI + EMA20/50 + MACD + Volume";



}

catch(error){


console.log("Signal Error:",coin.symbol,error);


document.getElementById(coin.id+"-signal").innerHTML="ERROR";


}

}




// RUN ALL COINS

coins.forEach(coin=>{

generateSignal(coin);

});




// UPDATE EVERY 1 MINUTE

setInterval(()=>{

coins.forEach(coin=>{

generateSignal(coin);

});

},60000);

