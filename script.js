const coins = [
{
symbol:"BTCUSDT",
short:"btc"
},
{
symbol:"ETHUSDT",
short:"eth"
},
{
symbol:"SOLUSDT",
short:"sol"
},
{
symbol:"XRPUSDT",
short:"xrp"
},
{
symbol:"LINKUSDT",
short:"link"
}
];


// LIVE PRICE

async function loadPrice(symbol,id){

try{

const response = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

const data = await response.json();

document.getElementById(id).innerHTML =
"$"+Number(data.price).toLocaleString();


}
catch(error){

document.getElementById(id).innerHTML="Error";

}

}




function updatePrices(){

loadPrice("BTCUSDT","btc-price");

loadPrice("ETHUSDT","eth-price");

loadPrice("SOLUSDT","sol-price");

loadPrice("XRPUSDT","xrp-price");

loadPrice("LINKUSDT","link-price");

}


updatePrices();

setInterval(updatePrices,5000);





// RSI

function calculateRSI(closes,period=14){

let gains=0;
let losses=0;


for(let i=closes.length-period;i<closes.length;i++){

let change=closes[i]-closes[i-1];


if(change>0){

gains+=change;

}
else{

losses-=change;

}

}


if(losses===0){

return 100;

}


let rs=gains/losses;


return 100-(100/(1+rs));

}






// EMA

function calculateEMA(data,period){

let multiplier=2/(period+1);

let ema=data[0];


for(let i=1;i<data.length;i++){

ema=((data[i]-ema)*multiplier)+ema;

}


return ema;

}






// MACD

function calculateMACD(closes){

let ema12=calculateEMA(closes,12);

let ema26=calculateEMA(closes,26);


return ema12-ema26;

}

// SIGNAL ENGINE

async function generateSignal(coin){


try{


const response = await fetch(

"https://api.binance.com/api/v3/klines?symbol="+coin.symbol+"&interval=15m&limit=100"

);


const candles = await response.json();


const closes = candles.map(c=>Number(c[4]));

const volumes = candles.map(c=>Number(c[5]));



let price = closes[closes.length-1];


let rsi = calculateRSI(closes);


let ema20 = calculateEMA(closes,20);

let ema50 = calculateEMA(closes,50);


let macd = calculateMACD(closes);



let avgVolume =
volumes.reduce((a,b)=>a+b,0)/volumes.length;


let currentVolume =
volumes[volumes.length-1];




let signal="WAIT";

let bias="Neutral";

let confidence=50;



// LONG CONDITION

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



// SHORT CONDITION

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





// LONG TARGETS

if(signal==="LONG"){

sl="$"+(price*0.97).toFixed(4);

tp1="$"+(price*1.03).toFixed(4);

tp2="$"+(price*1.06).toFixed(4);

tp3="$"+(price*1.10).toFixed(4);

}





// SHORT TARGETS

if(signal==="SHORT"){

sl="$"+(price*1.03).toFixed(4);

tp1="$"+(price*0.97).toFixed(4);

tp2="$"+(price*0.94).toFixed(4);

tp3="$"+(price*0.90).toFixed(4);

}





let id = coin.short;



document.getElementById(id+"-signal").innerHTML=signal;

document.getElementById(id+"-bias").innerHTML=bias;

document.getElementById(id+"-confidence").innerHTML=
confidence+"%";

document.getElementById(id+"-rsi").innerHTML=
rsi.toFixed(2);


document.getElementById(id+"-trend").innerHTML=
ema20 > ema50 ? "Uptrend" : "Downtrend";


document.getElementById(id+"-entry").innerHTML=
"$"+price.toFixed(4);


document.getElementById(id+"-sl").innerHTML=sl;

document.getElementById(id+"-tp1").innerHTML=tp1;

document.getElementById(id+"-tp2").innerHTML=tp2;

document.getElementById(id+"-tp3").innerHTML=tp3;



// Color signal

let signalElement =
document.getElementById(id+"-signal");


if(signal==="LONG"){

signalElement.style.color="green";

}

else if(signal==="SHORT"){

signalElement.style.color="red";

}

else{

signalElement.style.color="gray";

}





document.getElementById("analysis").innerHTML =

"Market checked: RSI "+rsi.toFixed(2)+
" | EMA trend | MACD | Volume confirmation";



}

catch(error){

console.log(coin.symbol,error);

}


}





// START ALL COINS

coins.forEach(coin=>{

generateSignal(coin);

});





// UPDATE EVERY 1 MINUTE

setInterval(()=>{


coins.forEach(coin=>{

generateSignal(coin);

});


},60000);
