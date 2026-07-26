const coins = [
{symbol:"BTCUSDT", id:"btc"},
{symbol:"ETHUSDT", id:"eth"},
{symbol:"SOLUSDT", id:"sol"},
{symbol:"XRPUSDT", id:"xrp"},
{symbol:"LINKUSDT", id:"link"}
];



// LIVE PRICES

async function loadPrice(symbol,id){

try{

let response = await fetch(
"https://api.binance.com/api/v3/ticker/price?symbol="+symbol
);

let data = await response.json();

document.getElementById(id+"-price").innerHTML =
"$"+Number(data.price).toLocaleString();


}catch(error){

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





// EMA

function EMA(data,period){

let multiplier=2/(period+1);

let ema=data[0];


for(let i=1;i<data.length;i++){

ema=(data[i]-ema)*multiplier+ema;

}


return ema;

}





// RSI

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






// GENERATE SIGNAL

async function generateSignal(coin){


try{


let response = await fetch(

"https://api.binance.com/api/v3/klines?symbol="+coin.symbol+"&interval=15m&limit=100"

);


let candles = await response.json();


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





// REALISTIC TP SL

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




let id=coin.id;



document.getElementById(id+"-signal").innerHTML=signal;

document.getElementById(id+"-bias").innerHTML=bias;

document.getElementById(id+"-confidence").innerHTML=
confidence+"%";


document.getElementById(id+"-entry").innerHTML=
"$"+price.toFixed(4);


document.getElementById(id+"-sl").innerHTML=sl;

document.getElementById(id+"-tp1").innerHTML=tp1;

document.getElementById(id+"-tp2").innerHTML=tp2;

document.getElementById(id+"-tp3").innerHTML=tp3;


document.getElementById(id+"-rsi").innerHTML=
rsi.toFixed(2);


document.getElementById(id+"-trend").innerHTML=
ema20>ema50 ? "UPTREND" : "DOWNTREND";





// AI ANALYSIS

document.getElementById("analysis").innerHTML=

"Market checked: "+coin.symbol+
" | Signal: "+signal+
" | RSI: "+rsi.toFixed(2)+
" | Trend: "+(ema20>ema50?"Bullish":"Bearish");





// HISTORY SAVE

if(signal!=="WAIT"){


let history =
localStorage.getItem("tradeHistory") || "";


let newTrade=

coin.symbol+
" - "+
signal+
" | Entry: $"+
price.toFixed(4)+
" | SL: "+
sl+
" | TP1: "+
tp1+
"<br>";


localStorage.setItem(
"tradeHistory",
newTrade+history
);


document.getElementById("history").innerHTML=
localStorage.getItem("tradeHistory");


}


}



catch(error){

console.log(
"Signal error:",
coin.symbol,
error
);

}


}




// START

coins.forEach(coin=>{

generateSignal(coin);

});



// UPDATE EVERY 1 MINUTE

setInterval(()=>{


coins.forEach(coin=>{

generateSignal(coin);

});


},60000);
