const coins = [
"BTCUSDT",
"ETHUSDT",
"SOLUSDT",
"XRPUSDT",
"LINKUSDT"
];


// LIVE PRICE

async function loadPrice(symbol,id){

try{

let response = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

let data = await response.json();

document.getElementById(id).innerHTML =
"$"+Number(data.price).toLocaleString();


}catch{

document.getElementById(id).innerHTML="Error";

}

}



async function loadChange(symbol,id){

try{

let response = await fetch(
"https://api.binance.com/api/v3/ticker/24hr?symbol="+symbol
);

let data = await response.json();

let change =
Number(data.priceChangePercent).toFixed(2);


let el=document.getElementById(id);


if(change>=0){

el.innerHTML="+"+change+"%";
el.style.color="green";

}else{

el.innerHTML=change+"%";
el.style.color="red";

}


}catch{

}

}




function updatePrices(){

loadPrice("BTCUSDT","btc-price");
loadPrice("ETHUSDT","eth-price");
loadPrice("SOLUSDT","sol-price");
loadPrice("XRPUSDT","xrp-price");
loadPrice("LINKUSDT","link-price");


loadChange("BTCUSDT","btc-change");
loadChange("ETHUSDT","eth-change");
loadChange("SOLUSDT","sol-change");
loadChange("XRPUSDT","xrp-change");
loadChange("LINKUSDT","link-change");

}



updatePrices();

setInterval(updatePrices,5000);






// RSI

function RSI(closes,period=14){

let gain=0;
let loss=0;


for(let i=closes.length-period;i<closes.length;i++){

let diff=closes[i]-closes[i-1];


if(diff>0)
gain+=diff;

else
loss-=diff;


}


let rs=gain/loss;

return 100-(100/(1+rs));

}





// EMA

function EMA(data,period){

let multiplier=2/(period+1);

let ema=data[0];


for(let i=1;i<data.length;i++){

ema=(data[i]-ema)*multiplier+ema;

}

return ema;

}







// SIGNAL ENGINE


async function generateSignal(symbol){


try{


let response=await fetch(

"https://api.binance.com/api/v3/klines?symbol="+symbol+"&interval=15m&limit=100"

);


let candles=await response.json();


let closes=candles.map(c=>Number(c[4]));

let volumes=candles.map(c=>Number(c[5]));



let price=closes[closes.length-1];


let rsi=RSI(closes);


let ema20=EMA(closes,20);

let ema50=EMA(closes,50);



let avgVolume =
volumes.reduce((a,b)=>a+b,0)/volumes.length;


let currentVolume=
volumes[volumes.length-1];



let signal="WAIT";

let bias="Neutral";

let confidence=50;





if(
price>ema20 &&
ema20>ema50 &&
rsi>50 &&
currentVolume>avgVolume
){

signal="LONG";
bias="Bullish";
confidence=80;


}




else if(

price<ema20 &&
ema20<ema50 &&
rsi<50 &&
currentVolume>avgVolume

){

signal="SHORT";
bias="Bearish";
confidence=80;


}




let sl="--";
let tp1="--";
let tp2="--";
let tp3="--";





if(signal=="LONG"){

sl="$"+(price*0.97).toFixed(2);

tp1="$"+(price*1.03).toFixed(2);

tp2="$"+(price*1.06).toFixed(2);

tp3="$"+(price*1.10).toFixed(2);


}





if(signal=="SHORT"){

sl="$"+(price*1.03).toFixed(2);

tp1="$"+(price*0.97).toFixed(2);

tp2="$"+(price*0.94).toFixed(2);

tp3="$"+(price*0.90).toFixed(2);


}






// show BTC signal for now

if(symbol=="BTCUSDT"){


document.getElementById("coin-name").innerHTML=symbol;

document.getElementById("signal").innerHTML=signal;

document.getElementById("bias").innerHTML=bias;

document.getElementById("confidence").innerHTML=
confidence+"%";

document.getElementById("rsi").innerHTML=
rsi.toFixed(2);


document.getElementById("trend").innerHTML=
ema20>ema50?"Uptrend":"Downtrend";


document.getElementById("entry").innerHTML=
"$"+price.toFixed(2);


document.getElementById("stoploss").innerHTML=sl;

document.getElementById("tp1").innerHTML=tp1;

document.getElementById("tp2").innerHTML=tp2;

document.getElementById("tp3").innerHTML=tp3;



document.getElementById("analysis").innerHTML=

symbol+" analysis: RSI "+rsi.toFixed(2)+
", Trend checked with EMA and Volume.";

}



}


catch(error){

console.log(error);

}


}





// Scan all coins

coins.forEach(coin=>{

generateSignal(coin);

});



setInterval(()=>{

coins.forEach(coin=>{

generateSignal(coin);

});

},60000);
