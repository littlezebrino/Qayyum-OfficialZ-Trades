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
