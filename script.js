// ==========================
// COINS
// ==========================

const coins = [
    { symbol:"BTCUSDT", id:"btc" },
    { symbol:"ETHUSDT", id:"eth" },
    { symbol:"SOLUSDT", id:"sol" },
    { symbol:"XRPUSDT", id:"xrp" },
    { symbol:"LINKUSDT", id:"link" },
    { symbol:"LTCUSDT", id:"ltc" }
];


// ==========================
// PERFORMANCE STORAGE
// ==========================

const appVersion = "3";

let savedVersion = localStorage.getItem("appVersion");

if(savedVersion !== appVersion){

    localStorage.removeItem("performance");
    localStorage.removeItem("activeTrades");
    localStorage.removeItem("tradeHistory");

    localStorage.setItem("appVersion",appVersion);

}


let performance = JSON.parse(
    localStorage.getItem("performance")
) || {

    totalSignals:0,
    wins:0,
    losses:0

};



let activeTrades = JSON.parse(
    localStorage.getItem("activeTrades")
) || [];



let tradeHistory = JSON.parse(
    localStorage.getItem("tradeHistory")
) || [];



// ==========================
// SAVE FUNCTIONS
// ==========================


function savePerformance(){

    localStorage.setItem(
        "performance",
        JSON.stringify(performance)
    );

}



function saveTrades(){

    localStorage.setItem(
        "activeTrades",
        JSON.stringify(activeTrades)
    );

}



function saveHistory(){

    localStorage.setItem(
        "tradeHistory",
        JSON.stringify(tradeHistory)
    );

}



// ==========================
// DASHBOARD
// ==========================


function updatePerformanceDashboard(){


    document.getElementById("total-signals").textContent =
    performance.totalSignals;



    document.getElementById("wins").textContent =
    performance.wins;



    document.getElementById("losses").textContent =
    performance.losses;



    let accuracy = 0;


    if(performance.totalSignals > 0){

        accuracy =
        (performance.wins / performance.totalSignals) * 100;

    }


    document.getElementById("accuracy").textContent =
    accuracy.toFixed(1)+"%";


    savePerformance();

}



updatePerformanceDashboard();



// ==========================
// LIVE PRICE
// ==========================


async function loadPrice(symbol,id){


    try{


        const response = await fetch(

        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`

        );


        const data = await response.json();



        const element =
        document.getElementById(id+"-price");



        if(element){

            element.textContent =
            "$"+Number(data.price).toLocaleString("en-GB");

        }



    }

    catch(error){

        console.log(error);

    }


}




function updatePrices(){


    coins.forEach(coin=>{

        loadPrice(
            coin.symbol,
            coin.id
        );

    });


}



updatePrices();


setInterval(
updatePrices,
5000
);



// ==========================
// EMA
// ==========================


function EMA(prices,period){


    let multiplier =
    2/(period+1);


    let ema =
    prices[0];



    for(let i=1;i<prices.length;i++){


        ema =
        (prices[i]-ema)*multiplier+ema;


    }


    return ema;


}



// ==========================
// RSI
// ==========================


function RSI(prices,period=14){


    let gains=0;

    let losses=0;



    for(
    let i=prices.length-period;
    i<prices.length;
    i++
    ){


        let diff =
        prices[i]-prices[i-1];



        if(diff>0){

            gains+=diff;

        }

        else{

            losses+=Math.abs(diff);

        }


    }



    if(losses===0)
    return 100;



    let rs =
    gains/losses;



    return 100-(100/(1+rs));


          }


// ==========================
// MACD
// ==========================

function MACD(prices){

    let ema12 = EMA(prices,12);

    let ema26 = EMA(prices,26);

    let macd = ema12 - ema26;


    return macd;

}



// ==========================
// ATR
// ==========================

function ATR(candles,period=14){

    let trs=[];


    for(let i=1;i<candles.length;i++){

        let high =
        Number(candles[i][2]);

        let low =
        Number(candles[i][3]);

        let previousClose =
        Number(candles[i-1][4]);


        let tr = Math.max(

            high-low,

            Math.abs(high-previousClose),

            Math.abs(low-previousClose)

        );


        trs.push(tr);

    }


    let sum =
    trs.slice(-period)
    .reduce((a,b)=>a+b,0);


    return sum/period;

}



// ==========================
// VWAP
// ==========================

function VWAP(candles){


    let totalVolume=0;

    let totalPriceVolume=0;



    candles.forEach(c=>{


        let high =
        Number(c[2]);

        let low =
        Number(c[3]);

        let close =
        Number(c[4]);

        let volume =
        Number(c[5]);


        let typical =
        (high+low+close)/3;



        totalPriceVolume +=
        typical*volume;


        totalVolume +=
        volume;


    });



    return totalPriceVolume/totalVolume;


}



// ==========================
// VOLUME ANALYSIS
// ==========================

function volumeAnalysis(candles){


    let volumes =
    candles.map(c=>Number(c[5]));



    let current =
    volumes[volumes.length-1];


    let average =
    volumes.reduce((a,b)=>a+b,0)
    /volumes.length;



    return current > average;

}



// ==========================
// ADX SIMPLE TREND STRENGTH
// ==========================

function ADX(candles){


    let movement=0;


    for(let i=1;i<candles.length;i++){


        let current =
        Number(candles[i][4]);


        let previous =
        Number(candles[i-1][4]);


        movement +=
        Math.abs(current-previous);


    }


    let average =
    movement/candles.length;



    return average;

}



// ==========================
// GOLDEN CROSS
// ==========================

function goldenCross(prices){


    let ema50 =
    EMA(prices,50);


    let ema200 =
    EMA(prices,200);



    return ema50 > ema200;

}



// ==========================
// BOLLINGER BANDS
// ==========================

function bollinger(prices,period=20){


    let slice =
    prices.slice(-period);



    let average =
    slice.reduce((a,b)=>a+b,0)
    /period;



    let variance =
    slice.reduce(
        (a,b)=>a+Math.pow(b-average,2),
        0
    )/period;



    let deviation =
    Math.sqrt(variance);



    return {

        upper:average+(2*deviation),

        lower:average-(2*deviation),

        middle:average

    };


}



// ==========================
// SUPERTREND STYLE
// ==========================

function supertrend(prices){


    let fast =
    EMA(prices,10);


    let slow =
    EMA(prices,30);



    return fast > slow;

}



// ==========================
// SIGNAL ENGINE
// ==========================


async function generateSignal(coin){


try{


const response = await fetch(

`https://api.binance.com/api/v3/klines?symbol=${coin.symbol}&interval=15m&limit=250`

);



const candles =
await response.json();



const closes =
candles.map(c=>Number(c[4]));



const price =
closes[closes.length-1];



const ema20 =
EMA(closes,20);



const ema50 =
EMA(closes,50);



const rsi =
RSI(closes);



const macd =
MACD(closes);



const vwap =
VWAP(candles);



const atr =
ATR(candles);



const adx =
ADX(candles);



const volume =
volumeAnalysis(candles);



const golden =
goldenCross(closes);



const boll =
bollinger(closes);



const trend =
supertrend(closes);




// ==========================
// CONFIRMATION SCORE
// ==========================


let bullish=0;

let bearish=0;



if(price>ema20)
bullish++;

else
bearish++;



if(ema20>ema50)
bullish++;

else
bearish++;



if(rsi>55)
bullish++;

else if(rsi<45)
bearish++;



if(macd>0)
bullish++;

else
bearish++;



if(price>vwap)
bullish++;

else
bearish++;



if(golden)
bullish++;



if(trend)
bullish++;



if(volume)
bullish++;



if(price>boll.middle)
bullish++;

else
bearish++;



if(adx>0)
bullish++;





let signal="WAIT";

let bias="Neutral";


let confidence =
50;



if(bullish>=6 && bullish>bearish){


signal="LONG";

bias="Bullish";

confidence =
Math.min(95,60+(bullish*4));


}



else if(bearish>=6 && bearish>bullish){


signal="SHORT";

bias="Bearish";

confidence =
Math.min(95,60+(bearish*4));


}




let sl="--";

let tp1="--";

let tp2="--";

let tp3="--";



if(signal==="LONG"){


sl =
(price*0.99).toFixed(4);


tp1 =
(price*1.008).toFixed(4);


tp2 =
(price*1.016).toFixed(4);


tp3 =
(price*1.025).toFixed(4);


}



if(signal==="SHORT"){


sl =
(price*1.01).toFixed(4);


tp1 =
(price*0.992).toFixed(4);


tp2 =
(price*0.984).toFixed(4);


tp3 =
(price*0.975).toFixed(4);


}



updateSignalUI(
coin,
{
signal,
bias,
confidence,
price,
sl,
tp1,
tp2,
tp3,
rsi,
ema20,
macd,
adx,
vwap,
atr,
volume,
golden
}
);



trackNewSignal(
coin,
signal,
price,
tp1,
sl
);



}

catch(error){

console.log(error);

}


               }


// ==========================
// UPDATE SIGNAL UI
// ==========================

function updateSignalUI(coin,data){


const id = coin.id;


document.getElementById(id+"-signal").textContent =
data.signal;


document.getElementById(id+"-bias").textContent =
data.bias;


document.getElementById(id+"-confidence").textContent =
data.confidence+"%";


document.getElementById(id+"-entry").textContent =
"$"+data.price.toFixed(4);


document.getElementById(id+"-sl").textContent =
"$"+data.sl;


document.getElementById(id+"-tp1").textContent =
"$"+data.tp1;


document.getElementById(id+"-tp2").textContent =
"$"+data.tp2;


document.getElementById(id+"-tp3").textContent =
"$"+data.tp3;


document.getElementById(id+"-rsi").textContent =
data.rsi.toFixed(2);



document.getElementById(id+"-trend").textContent =
data.ema20 > data.ema50 ?
"UPTREND" :
"DOWNTREND";



document.getElementById(id+"-analysis").textContent =

`${coin.symbol}: ${data.bias} | RSI ${data.rsi.toFixed(2)} | MACD ${data.macd.toFixed(4)} | VWAP ${data.vwap.toFixed(4)} | ATR ${data.atr.toFixed(4)} | Confidence ${data.confidence}%`;

}



// ==========================
// TRACK NEW SIGNAL
// ==========================

function trackNewSignal(
coin,
signal,
entry,
tp,
sl
){


if(signal==="WAIT") return;



let trades =
JSON.parse(localStorage.getItem("activeTrades")) || [];



let exists =
trades.some(t=>

t.coin===coin.symbol &&
t.status==="OPEN"

);



if(exists) return;



trades.push({

coin:coin.symbol,

signal:signal,

entry:entry,

tp:Number(tp),

sl:Number(sl),

status:"OPEN",

time:new Date().toLocaleString()

});



performance.totalSignals++;



localStorage.setItem(
"activeTrades",
JSON.stringify(trades)
);



localStorage.setItem(
"performance",
JSON.stringify(performance)
);



updatePerformanceDashboard();


}



// ==========================
// LIVE TP SL CHECKER
// ==========================


async function checkTradeResults(){


let trades =
JSON.parse(localStorage.getItem("activeTrades")) || [];



for(let trade of trades){



if(trade.status!=="OPEN")
continue;



try{


let res =
await fetch(

`https://api.binance.com/api/v3/ticker/price?symbol=${trade.coin}`

);



let data =
await res.json();



let price =
Number(data.price);



if(trade.signal==="LONG"){


if(price>=trade.tp){


trade.status="WIN";

performance.wins++;


}



else if(price<=trade.sl){


trade.status="LOSS";

performance.losses++;


}


}



if(trade.signal==="SHORT"){



if(price<=trade.tp){


trade.status="WIN";

performance.wins++;


}



else if(price>=trade.sl){


trade.status="LOSS";

performance.losses++;


}


}



}



catch(error){

console.log(error);

}



}



localStorage.setItem(
"activeTrades",
JSON.stringify(trades)
);



localStorage.setItem(
"performance",
JSON.stringify(performance)
);



updatePerformanceDashboard();



}



setInterval(checkTradeResults,10000);



// ==========================
// DASHBOARD UPDATE
// ==========================


function updatePerformanceDashboard(){


document.getElementById(
"total-signals"
).textContent =
performance.totalSignals;



document.getElementById(
"wins"
).textContent =
performance.wins;



document.getElementById(
"losses"
).textContent =
performance.losses;



let accuracy=0;



if(performance.totalSignals>0){


accuracy =
(performance.wins/performance.totalSignals)*100;


}



document.getElementById(
"accuracy"
).textContent =
accuracy.toFixed(1)+"%";



localStorage.setItem(
"performance",
JSON.stringify(performance)
);



}



// ==========================
// TRADE HISTORY
// ==========================


function showTradeHistory(){


let box =
document.getElementById(
"trade-history"
);



if(box.style.display==="none"){


box.style.display="block";


loadTradeHistory();


}

else{


box.style.display="none";


}


}



function loadTradeHistory(){


let trades =
JSON.parse(localStorage.getItem("activeTrades")) || [];



let html="";



if(trades.length===0){


html="No trades yet";


}

else{


trades
.slice(-6)
.reverse()
.forEach(trade=>{


html += `


<div class="trade-item">


<b>${trade.coin}</b><br>


Type: ${trade.signal}<br>


Entry: ${trade.entry}<br>


TP: ${trade.tp}<br>


SL: ${trade.sl}<br>


Status: ${trade.status}<br>


Time: ${trade.time}


</div>


`;



});


}



document.getElementById(
"history-list"
).innerHTML=html;


}



// ==========================
// TRADING CALCULATOR
// ==========================


function calculateTrade(){


let type =
document.getElementById(
"trade-type"
).value;



let entry =
Number(
document.getElementById(
"entry-price"
).value
);



let exit =
Number(
document.getElementById(
"exit-price"
).value
);



let amount =
Number(
document.getElementById(
"amount"
).value
);



if(!entry || !exit || !amount){

alert(
"Please fill all fields correctly."
);

return;

}



let change;



if(type==="long"){


change =
(exit-entry)/entry;


}

else{


change =
(entry-exit)/entry;


}



let profit =
amount*change;



document.getElementById(
"profit"
).textContent =
profit.toFixed(2)+" USDT";



document.getElementById(
"percentage"
).textContent =
(change*100).toFixed(2)+"%";



document.getElementById(
"rr"
).textContent =
(Math.abs(change)/0.01)
.toFixed(2)+" R";


}



// ==========================
// START APP
// ==========================


updatePrices();

updateSignals();


setInterval(updatePrices,5000);


setInterval(updateSignals,60000);


updatePerformanceDashboard();
