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
