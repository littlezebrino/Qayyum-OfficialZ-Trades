async function loadBTC(){

try{

const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");

const data = await response.json();

document.getElementById("btc-price").innerHTML="$"+Number(data.price).toLocaleString();

}catch(error){

document.getElementById("btc-price").innerHTML="API Error";

}

}

loadBTC();

async function loadPrice(symbol,id){

try{

const response=await fetch("https://api.binance.com/api/v3/ticker/price?symbol="+symbol);

const data=await response.json();

document.getElementById(id).innerHTML="$"+Number(data.price).toLocaleString();

}catch{

document.getElementById(id).innerHTML="Error";

}

}

loadPrice("BTCUSDT","btc-price");
loadPrice("ETHUSDT","eth-price");
loadPrice("SOLUSDT","sol-price");
loadPrice("XRPUSDT","xrp-price");
loadPrice("LINKUSDT","link-price");

setInterval(function(){

loadPrice("BTCUSDT","btc-price");
loadPrice("ETHUSDT","eth-price");
loadPrice("SOLUSDT","sol-price");
loadPrice("XRPUSDT","xrp-price");
loadPrice("LINKUSDT","link-price");

},5000);
