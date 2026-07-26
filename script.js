async function loadPrice(symbol, id) {

    try {

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=" + symbol
        );

        const data = await response.json();

        document.getElementById(id).innerHTML =
            "$" + Number(data.price).toLocaleString();

    } catch (error) {

        document.getElementById(id).innerHTML = "API Error";

    }

}



function updatePrices() {

    loadPrice("BTCUSDT", "btc-price");

    loadPrice("ETHUSDT", "eth-price");

    loadPrice("SOLUSDT", "sol-price");

    loadPrice("XRPUSDT", "xrp-price");

    loadPrice("LINKUSDT", "link-price");

}



// Website open hote hi prices load
updatePrices();


// Har 5 second baad automatic update
setInterval(updatePrices, 5000);

async function loadChange(symbol,id){

try{

const response = await fetch(
"https://api.binance.com/api/v3/ticker/24hr?symbol="+symbol
);

const data = await response.json();

let change = Number(data.priceChangePercent).toFixed(2);

let element = document.getElementById(id);

if(change >= 0){
element.innerHTML = "+"+change+"%";
element.style.color="green";
}else{
element.innerHTML = change+"%";
element.style.color="red";
}

}catch{

document.getElementById(id).innerHTML="Error";

}

}


function updateChanges(){

loadChange("BTCUSDT","btc-change");
loadChange("ETHUSDT","eth-change");
loadChange("SOLUSDT","sol-change");
loadChange("XRPUSDT","xrp-change");
loadChange("LINKUSDT","link-change");

}


updateChanges();

setInterval(updateChanges,5000);
async function getSignal(symbol){

try{

const response = await fetch(
"https://api.binance.com/api/v3/klines?symbol="+symbol+"&interval=15m&limit=50"
);

const candles = await response.json();


let closes = candles.map(c => Number(c[4]));


let current = closes[closes.length-1];

let previous = closes[closes.length-2];



let signal = "WAIT";

let bias = "Neutral";

let confidence = 50;



if(current > previous){

signal = "LONG";
bias = "Bullish";
confidence = 65;

}
else if(current < previous){

signal = "SHORT";
bias = "Bearish";
confidence = 65;

}



let sl;
let tp1;
let tp2;
let tp3;


if(signal=="LONG"){

sl = current * 0.97;
tp1 = current * 1.03;
tp2 = current * 1.06;
tp3 = current * 1.10;

}
else if(signal=="SHORT"){

sl = current * 1.03;
tp1 = current * 0.97;
tp2 = current * 0.94;
tp3 = current * 0.90;

}



document.getElementById("signal").innerHTML = signal;

document.getElementById("bias").innerHTML = bias;

document.getElementById("confidence").innerHTML = confidence+"%";

document.getElementById("entry").innerHTML =
"$"+current.toFixed(2);


document.getElementById("stoploss").innerHTML =
sl ? "$"+sl.toFixed(2) : "--";


document.getElementById("tp1").innerHTML =
tp1 ? "$"+tp1.toFixed(2) : "--";


document.getElementById("tp2").innerHTML =
tp2 ? "$"+tp2.toFixed(2) : "--";


document.getElementById("tp3").innerHTML =
tp3 ? "$"+tp3.toFixed(2) : "--";



}catch(error){

console.log(error);

}

}



getSignal("BTCUSDT");


setInterval(function(){

getSignal("BTCUSDT");

},60000);
getSignal("BTCUSDT");
async function getSignal(symbol){

try{

const response = await fetch(
"https://api.binance.com/api/v3/klines?symbol="+symbol+"&interval=15m&limit=50"
);

const candles = await response.json();

let closes = candles.map(c => Number(c[4]));

let current = closes[closes.length - 1];
let previous = closes[closes.length - 2];

let signal = "WAIT";
let bias = "Neutral";
let confidence = 50;


if(current > previous){

signal = "LONG";
bias = "Bullish";
confidence = 65;

}

else if(current < previous){

signal = "SHORT";
bias = "Bearish";
confidence = 65;

}


document.getElementById("signal").innerHTML = signal;
document.getElementById("bias").innerHTML = bias;
document.getElementById("confidence").innerHTML = confidence+"%";
document.getElementById("entry").innerHTML = "$"+current.toFixed(2);


let sl = current * 0.97;
let tp1 = current * 1.03;
let tp2 = current * 1.06;
let tp3 = current * 1.10;


document.getElementById("stoploss").innerHTML="$"+sl.toFixed(2);
document.getElementById("tp1").innerHTML="$"+tp1.toFixed(2);
document.getElementById("tp2").innerHTML="$"+tp2.toFixed(2);
document.getElementById("tp3").innerHTML="$"+tp3.toFixed(2);


}

catch(error){

console.log(error);

}

}


getSignal("BTCUSDT");
