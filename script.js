const coins = [
{symbol:"BTCUSDT", id:"btc"},
{symbol:"ETHUSDT", id:"eth"},
{symbol:"SOLUSDT", id:"sol"},
{symbol:"XRPUSDT", id:"xrp"},
{symbol:"LINKUSDT", id:"link"}
];



// LIVE PRICE

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


if(loss===0) return 100;


let rs=gain/loss;


return 100-(100/(1+rs));

}







// SIGNAL ENGINE

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




if(price>ema20 && ema20>ema50 && rsi>50){

signal="LONG";

bias="Bullish";

confidence=80;

}


else if(price<ema20 && ema20<ema50 && rsi<50){

signal="SHORT";

bias="Bearish";

confidence=80;

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




// EACH COIN ANALYSIS

document.getElementById(id+"-analysis").innerHTML=

coin.symbol+
": "+bias+
" trend | RSI "+rsi.toFixed(2)+
" | Confidence "+confidence+"%";




// HISTORY

if(signal!=="WAIT"){

let old=
localStorage.getItem("history") || "";


let trade=

coin.symbol+
" "+signal+
" Entry $"+price.toFixed(2)+
" SL "+sl+
" TP1 "+tp1+
"<br>";


localStorage.setItem(
"history",
trade+old
);


document.getElementById("history").innerHTML=
localStorage.getItem("history");

}


}


catch(error){

console.log(
coin.symbol,
error
);

}

}






// RUN ALL COINS TOGETHER

coins.forEach(c=>{

generateSignal(c);

});





// UPDATE EVERY MINUTE

setInterval(()=>{

coins.forEach(c=>{

generateSignal(c);

});

},60000);


// AI ANALYSIS AUTO UPDATE

function updateAIAnalysis(){

let boxes = [
"btc",
"eth",
"sol",
"xrp",
"link"
];


boxes.forEach(id=>{


let signal = document.getElementById(id+"-signal").innerHTML;

let bias = document.getElementById(id+"-bias").innerHTML;

let rsi = document.getElementById(id+"-rsi").innerHTML;

let confidence = document.getElementById(id+"-confidence").innerHTML;



let text = "";


if(signal=="LONG"){

text =
"AI Analysis: Bullish momentum detected. RSI "+rsi+
". Trend is positive. Confidence "+confidence+
". Risk management required.";

}


else if(signal=="SHORT"){

text =
"AI Analysis: Bearish momentum detected. RSI "+rsi+
". Downside pressure visible. Confidence "+confidence+
". Manage risk carefully.";

}


else{

text =
"AI Analysis: Market is neutral. Waiting for stronger confirmation.";

}



document.getElementById(id+"-analysis").innerHTML=text;


});


}



setInterval(updateAIAnalysis,2000);

updateAIAnalysis();
