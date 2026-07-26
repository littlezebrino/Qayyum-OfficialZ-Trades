async function loadPrice(symbol, id) {

try {

const response = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

const data = await response.json();

document.getElementById(id).innerHTML =
"$"+Number(data.price).toLocaleString();


} catch(error){

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





// RSI Calculation

function calculateRSI(closes, period=14){

let gains=0;
let losses=0;


for(let i=closes.length-period;i<closes.length;i++){

let diff=closes[i]-closes[i-1];

if(diff>=0){
gains+=diff;
}else{
losses-=diff;
}

}


let rs=gains/losses;

let rsi=100-(100/(1+rs));

return rsi;

}





// EMA Calculation

function calculateEMA(prices, period){

let multiplier=2/(period+1);

let ema=prices[0];


for(let i=1;i<prices.length;i++){

ema=(prices[i]-ema)*multiplier+ema;

}


return ema;

}







async function generateSignal(symbol){

try{


const response = await fetch(
"https://api.binance.com/api/v3/klines?symbol="+symbol+"&interval=15m&limit=100"
);


const candles=await response.json();


let closes=candles.map(c=>Number(c[4]));


let price=closes[closes.length-1];


let rsi=calculateRSI(closes);


let ema20=calculateEMA(closes,20);

let ema50=calculateEMA(closes,50);



let signal="WAIT";
let bias="Neutral";
let confidence=50;



if(price>ema20 && ema20>ema50 && rsi>50){

signal="LONG";
bias="Bullish";
confidence=75;

}


else if(price<ema20 && ema20<ema50 && rsi<50){

signal="SHORT";
bias="Bearish";
confidence=75;

}





let sl;
let tp1;
let tp2;
let tp3;



if(signal=="LONG"){

sl=price*0.97;
tp1=price*1.03;
tp2=price*1.06;
tp3=price*1.10;

}



if(signal=="SHORT"){

sl=price*1.03;
tp1=price*0.97;
tp2=price*0.94;
tp3=price*0.90;

}





document.getElementById("signal").innerHTML=signal;

document.getElementById("bias").innerHTML=bias;

document.getElementById("confidence").innerHTML=confidence+"%";

document.getElementById("entry").innerHTML="$"+price.toFixed(2);



document.getElementById("stoploss").innerHTML=
sl ? "$"+sl.toFixed(2) : "--";


document.getElementById("tp1").innerHTML=
tp1 ? "$"+tp1.toFixed(2) : "--";


document.getElementById("tp2").innerHTML=
tp2 ? "$"+tp2.toFixed(2) : "--";


document.getElementById("tp3").innerHTML=
tp3 ? "$"+tp3.toFixed(2) : "--";



console.log(
symbol,
"RSI:",
rsi.toFixed(2)
);



}


catch(error){

console.log(error);

}


}





// BTC signal test

generateSignal("BTCUSDT");


setInterval(function(){

generateSignal("BTCUSDT");

},60000);
