const coins = [
{symbol:"BTCUSDT", id:"btc"},
{symbol:"ETHUSDT", id:"eth"},
{symbol:"SOLUSDT", id:"sol"},
{symbol:"XRPUSDT", id:"xrp"},
{symbol:"LINKUSDT", id:"link"}
];


async function loadPrice(symbol,id){

try{

let res = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

let data = await res.json();

document.getElementById(id+"-price").innerHTML =
"$"+Number(data.price).toLocaleString();

}
catch(error){

console.log(error);

}

}



function updatePrices(){

coins.forEach(coin=>{

loadPrice(coin.symbol,coin.id);

});

}


updatePrices();

setInterval(updatePrices,5000);




function EMA(data,period){

let k=2/(period+1);

let ema=data[0];

for(let i=1;i<data.length;i++){

ema=(data[i]-ema)*k+ema;

}

return ema;

}




function RSI(data,period=14){

let gain=0;
let loss=0;


for(let i=data.length-period;i<data.length;i++){

let change=data[i]-data[i-1];


if(change>0){

gain+=change;

}else{

loss-=change;

}

}


if(loss===0){

return 100;

}


let rs=gain/loss;

return 100-(100/(1+rs));

}
// SIGNAL SYSTEM

async function generateSignal(coin){

try{


let res = await fetch(
"https://api.binance.com/api/v3/klines?symbol="+coin.symbol+"&interval=15m&limit=100"
);


let candles = await res.json();


let closes = candles.map(c=>Number(c[4]));


let price = closes[closes.length-1];


let rsi = RSI(closes);


let ema20 = EMA(closes,20);

let ema50 = EMA(closes,50);



let signal="WAIT";

let bias="Neutral";

let confidence=50;




// LONG

if(
price > ema20 &&
rsi > 50
){

signal="LONG";

bias="Bullish";

confidence=75;

}




// SHORT

else if(
price < ema20 &&
rsi < 50
){

signal="SHORT";

bias="Bearish";

confidence=75;

}





let sl="--";

let tp1="--";

let tp2="--";

let tp3="--";





// LONG TP/SL

if(signal==="LONG"){

sl="$"+(price*0.97).toFixed(4);

tp1="$"+(price*1.03).toFixed(4);

tp2="$"+(price*1.06).toFixed(4);

tp3="$"+(price*1.10).toFixed(4);

}





// SHORT TP/SL

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
ema20 > ema50 ? "UPTREND" : "DOWNTREND";

document.getElementById(id+"-entry").innerHTML=
"$"+price.toFixed(4);

document.getElementById(id+"-sl").innerHTML=sl;

document.getElementById(id+"-tp1").innerHTML=tp1;

document.getElementById(id+"-tp2").innerHTML=tp2;

document.getElementById(id+"-tp3").innerHTML=tp3;



}

catch(error){

console.log("ERROR",coin.symbol,error);

}

}





// START ALL COINS

coins.forEach(coin=>{

generateSignal(coin);

});




// AUTO UPDATE

setInterval(()=>{

coins.forEach(coin=>{

generateSignal(coin);

});

},60000);
