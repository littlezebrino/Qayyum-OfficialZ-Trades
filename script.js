/* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 1
LIVE MARKET DATA ENGINE
========================================================= */

/* =========================================================
DOM ELEMENTS
========================================================= */

const btcPrice =
document.getElementById("btcPrice");

const priceChange =
document.getElementById("priceChange");

const marketState =
document.getElementById("marketState");

const priceTime =
document.getElementById("priceTime");

const marketStatus =
document.getElementById("marketStatus");

const priceCanvas =
document.getElementById("priceChart");

/* =========================================================
MARKET CONFIGURATION
========================================================= */

const MARKET_SYMBOL = "BTCUSDT";

const REST_INTERVAL = "1m";

const HISTORY_LIMIT = 500;

const MAX_CANDLES = 500;

const CHART_LIMIT = 120;

const REST_API_URL =
"https://api.binance.com/api/v3/klines";

const WEBSOCKET_URL =
"wss://stream.binance.com:9443/ws/btcusdt@kline_1m";

/* =========================================================
MARKET STORAGE
========================================================= */

let candles = [];

let closes = [];

let highs = [];

let lows = [];

let volumes = [];

/* =========================================================
CURRENT MARKET STATE
========================================================= */

let market = {

```
symbol: MARKET_SYMBOL,

price: 0,

open: 0,

high: 0,

low: 0,

volume: 0,

change: 0,

candleTime: 0,

connected: false
```

};

/* =========================================================
WEBSOCKET STATE
========================================================= */

let socket = null;

let reconnectTimer = null;

let reconnectAttempts = 0;

let historyLoaded = false;

/* =========================================================
CHART STATE
========================================================= */

let chart = null;

/* =========================================================
UTILITY
========================================================= */

function setMarketState(state, color = null) {

```
if (marketState) {

    marketState.textContent = state;

}

if (marketStatus && color) {

    marketStatus.style.borderColor = color;

}
```

}

function formatPrice(value) {

```
if (!Number.isFinite(value)) {

    return "$0.00";

}

return "$" + value.toLocaleString(
    "en-US",
    {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
);
```

}

function formatTime(timestamp) {

```
if (!timestamp) {

    return "--";

}

return new Date(timestamp).toLocaleTimeString(
    [],
    {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }
);
```

}

/* =========================================================
HISTORICAL DATA LOADER
========================================================= */

async function loadHistory() {

```
try {

    setMarketState(
        "LOADING DATA",
        "rgba(255, 209, 102, 0.45)"
    );

    if (priceTime) {

        priceTime.textContent =
            "Loading live market history...";

    }


    const url =
        REST_API_URL +
        "?symbol=" +
        MARKET_SYMBOL +
        "&interval=" +
        REST_INTERVAL +
        "&limit=" +
        HISTORY_LIMIT;


    const response =
        await fetch(url, {
            cache: "no-store"
        });


    if (!response.ok) {

        throw new Error(
            "Binance HTTP " +
            response.status
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data) || data.length === 0) {

        throw new Error(
            "No historical market data received"
        );

    }


    candles = [];

    closes = [];

    highs = [];

    lows = [];

    volumes = [];


    data.forEach(item => {

        const candle = {

            time: Number(item[0]),

            closeTime: Number(item[6]),

            open:
                Number(item[1]),

            high:
                Number(item[2]),

            low:
                Number(item[3]),

            close:
                Number(item[4]),

            volume:
                Number(item[5])

        };


        if (

            !Number.isFinite(candle.open) ||

            !Number.isFinite(candle.high) ||

            !Number.isFinite(candle.low) ||

            !Number.isFinite(candle.close) ||

            !Number.isFinite(candle.volume)

        ) {

            return;

        }


        candles.push(candle);

        closes.push(candle.close);

        highs.push(candle.high);

        lows.push(candle.low);

        volumes.push(candle.volume);

    });


    if (candles.length === 0) {

        throw new Error(
            "Historical candle parsing failed"
        );

    }


    /* ---------------------------------------------
       SET CURRENT MARKET STATE
       --------------------------------------------- */

    const last =
        candles[candles.length - 1];


    market.price =
        last.close;

    market.open =
        last.open;

    market.high =
        last.high;

    market.low =
        last.low;

    market.volume =
        last.volume;

    market.candleTime =
        last.time;


    updatePriceDisplay();

    createChart();

    historyLoaded = true;


    setMarketState(
        "DATA READY",
        "rgba(0, 245, 255, 0.35)"
    );


    if (priceTime) {

        priceTime.textContent =
            "Live feed ready • " +
            formatTime(Date.now());

    }


    console.log(
        "BTC history loaded:",
        candles.length,
        "candles"
    );


}
catch (error) {

    console.error(
        "History loading error:",
        error
    );


    historyLoaded = false;


    setMarketState(
        "DATA ERROR",
        "rgba(255, 77, 109, 0.5)"
    );


    if (priceTime) {

        priceTime.textContent =
            "Unable to load market history";

    }

}
```

}

/* =========================================================
PRICE DISPLAY
========================================================= */

function updatePriceDisplay() {

```
if (!market.price) {

    return;

}


if (btcPrice) {

    btcPrice.textContent =
        formatPrice(market.price);

}


const currentOpen =
    market.open;


if (
    Number.isFinite(currentOpen) &&
    currentOpen > 0
) {

    const change =
        (
            (market.price - currentOpen) /
            currentOpen
        ) * 100;


    market.change =
        change;


    if (priceChange) {

        const sign =
            change > 0
                ? "+"
                : "";


        priceChange.textContent =
            sign +
            change.toFixed(2) +
            "%";


        if (change > 0) {

            priceChange.style.color =
                "#00ff88";

        }
        else if (change < 0) {

            priceChange.style.color =
                "#ff4d6d";

        }
        else {

            priceChange.style.color =
                "#ffd166";

        }

    }

}


if (priceTime) {

    priceTime.textContent =
        "Live • " +
        formatTime(Date.now());

}
```

}

/* =========================================================
WEBSOCKET CONNECTION
========================================================= */

function connectSocket() {

```
if (socket) {

    try {

        socket.close();

    }
    catch (error) {

        console.warn(
            "Socket close warning:",
            error
        );

    }

}


setMarketState(
    "CONNECTING",
    "rgba(255, 209, 102, 0.45)"
);


socket =
    new WebSocket(WEBSOCKET_URL);


/* ---------------------------------------------
   SOCKET OPEN
   --------------------------------------------- */

socket.onopen = () => {

    reconnectAttempts = 0;

    market.connected = true;


    setMarketState(
        "LIVE",
        "rgba(0, 255, 136, 0.45)"
    );


    if (priceTime && market.price) {

        priceTime.textContent =
            "Live WebSocket • " +
            formatTime(Date.now());

    }


    console.log(
        "Binance WebSocket connected"
    );

};


/* ---------------------------------------------
   SOCKET MESSAGE
   --------------------------------------------- */

socket.onmessage = event => {

    try {

        const data =
            JSON.parse(event.data);


        if (!data || !data.k) {

            return;

        }


        updateLiveCandle(data.k);

    }
    catch (error) {

        console.error(
            "WebSocket message error:",
            error
        );

    }

};


/* ---------------------------------------------
   SOCKET ERROR
   --------------------------------------------- */

socket.onerror = error => {

    console.error(
        "Binance WebSocket error:",
        error
    );


    market.connected = false;


    setMarketState(
        "ERROR",
        "rgba(255, 77, 109, 0.5)"
    );

};


/* ---------------------------------------------
   SOCKET CLOSE
   --------------------------------------------- */

socket.onclose = () => {

    market.connected = false;


    setMarketState(
        "RECONNECTING",
        "rgba(255, 209, 102, 0.45)"
    );


    scheduleReconnect();

};
```

}

/* =========================================================
RECONNECT HANDLER
========================================================= */

function scheduleReconnect() {

```
if (reconnectTimer) {

    clearTimeout(reconnectTimer);

}


reconnectAttempts++;


const delay =
    Math.min(
        30000,
        3000 * reconnectAttempts
    );


console.log(
    "Reconnecting WebSocket in",
    delay,
    "ms"
);


reconnectTimer =
    setTimeout(() => {

        connectSocket();

    }, delay);
```

}

/* =========================================================
LIVE CANDLE UPDATE
========================================================= */

function updateLiveCandle(data) {

```
if (!data) {

    return;

}


const candleTime =
    Number(data.t);


const open =
    Number(data.o);


const high =
    Number(data.h);


const low =
    Number(data.l);


const close =
    Number(data.c);


const volume =
    Number(data.v);


if (

    !Number.isFinite(candleTime) ||

    !Number.isFinite(open) ||

    !Number.isFinite(high) ||

    !Number.isFinite(low) ||

    !Number.isFinite(close) ||

    !Number.isFinite(volume)

) {

    return;

}


/* ---------------------------------------------
   UPDATE MARKET OBJECT
   --------------------------------------------- */

market.price =
    close;

market.open =
    open;

market.high =
    high;

market.low =
    low;

market.volume =
    volume;

market.candleTime =
    candleTime;


/* ---------------------------------------------
   FIND CURRENT CANDLE
   --------------------------------------------- */

const lastIndex =
    candles.length - 1;


const lastCandle =
    candles[lastIndex];


/* ---------------------------------------------
   SAME CANDLE
   --------------------------------------------- */

if (
    lastCandle &&
    lastCandle.time === candleTime
) {

    lastCandle.open =
        open;

    lastCandle.high =
        high;

    lastCandle.low =
        low;

    lastCandle.close =
        close;

    lastCandle.volume =
        volume;


    closes[lastIndex] =
        close;

    highs[lastIndex] =
        high;

    lows[lastIndex] =
        low;

    volumes[lastIndex] =
        volume;

}


/* ---------------------------------------------
   NEW CANDLE
   --------------------------------------------- */

else {

    const newCandle = {

        time:
            candleTime,

        closeTime:
            Number(data.T),

        open:
            open,

        high:
            high,

        low:
            low,

        close:
            close,

        volume:
            volume

    };


    candles.push(newCandle);

    closes.push(close);

    highs.push(high);

    lows.push(low);

    volumes.push(volume);


    trimMarketData();

}


updatePriceDisplay();

updateChart();


/* ---------------------------------------------
   LIVE STATUS
   --------------------------------------------- */

if (market.connected) {

    setMarketState(
        "LIVE",
        "rgba(0, 255, 136, 0.45)"
    );

}
```

}

/* =========================================================
KEEP DATA SIZE UNDER CONTROL
========================================================= */

function trimMarketData() {

```
while (
    candles.length > MAX_CANDLES
) {

    candles.shift();

    closes.shift();

    highs.shift();

    lows.shift();

    volumes.shift();

}
```

}

/* =========================================================
CREATE PRICE CHART
========================================================= */

function createChart() {

```
if (!priceCanvas) {

    return;

}


if (chart) {

    chart.destroy();

    chart = null;

}


const ctx =
    priceCanvas.getContext("2d");


const chartData =
    closes.slice(-CHART_LIMIT);


const gradient =
    ctx.createLinearGradient(
        0,
        0,
        0,
        200
    );


gradient.addColorStop(
    0,
    "rgba(0,245,255,0.30)"
);


gradient.addColorStop(
    1,
    "rgba(0,245,255,0.00)"
);


chart =
    new Chart(ctx, {

        type: "line",

        data: {

            labels:
                chartData.map(() => ""),

            datasets: [

                {

                    label:
                        "BTC/USDT",

                    data:
                        chartData,

                    borderColor:
                        "#00f5ff",

                    backgroundColor:
                        gradient,

                    borderWidth:
                        2,

                    fill:
                        true,

                    tension:
                        0.35,

                    pointRadius:
                        0,

                    pointHoverRadius:
                        3,

                    pointHoverBackgroundColor:
                        "#ffffff",

                    pointHoverBorderColor:
                        "#00f5ff"

                }

            ]

        },


        options: {

            responsive:
                true,

            maintainAspectRatio:
                false,

            animation:
                false,

            interaction: {

                intersect:
                    false,

                mode:
                    "index"

            },


            plugins: {

                legend: {

                    display:
                        false

                },

                tooltip: {

                    enabled:
                        true,

                    displayColors:
                        false,

                    callbacks: {

                        label:
                            context => {

                                return (
                                    "BTC: $" +
                                    Number(
                                        context.parsed.y
                                    ).toLocaleString(
                                        "en-US",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        }
                                    )
                                );

                            }

                    }

                }

            },


            scales: {

                x: {

                    display:
                        false

                },

                y: {

                    display:
                        false,

                    grace:
                        "2%"

                }

            }

        }

    });
```

}

/* =========================================================
UPDATE PRICE CHART
========================================================= */

function updateChart() {

```
if (!chart) {

    return;

}


const chartData =
    closes.slice(-CHART_LIMIT);


chart.data.labels =
    chartData.map(() => "");


chart.data.datasets[0].data =
    chartData;


chart.update("none");
```

}

/* =========================================================
PAGE VISIBILITY
========================================================= */

document.addEventListener(
"visibilitychange",
() => {

```
    if (
        document.visibilityState ===
        "visible"
    ) {

        if (
            !socket ||
            socket.readyState !==
            WebSocket.OPEN
        ) {

            connectSocket();

        }

    }

}
```

);

/* =========================================================
START MARKET ENGINE
========================================================= */

async function startMarketEngine() {

```
setMarketState(
    "STARTING",
    "rgba(255, 209, 102, 0.45)"
);


await loadHistory();


connectSocket();
```

}

/* =========================================================
START
========================================================= */

startMarketEngine();




/* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 2
PROFESSIONAL INDICATOR ENGINE
========================================================= */

/* =========================================================
INDICATOR DOM ELEMENTS
========================================================= */

const rsiBox =
document.getElementById("rsi");

const ema20Box =
document.getElementById("ema20");

const ema50Box =
document.getElementById("ema50");

const ema200Box =
document.getElementById("ema200");

const macdBox =
document.getElementById("macd");

const vwapBox =
document.getElementById("vwap");

const atrBox =
document.getElementById("atr");

const volumeBox =
document.getElementById("volume");

const volatilityBox =
document.getElementById("volatility");

/* =========================================================
SAFE NUMBER HELPER
========================================================= */

function safeNumber(value, fallback = 0) {

```
return Number.isFinite(value)
    ? value
    : fallback;
```

}

/* =========================================================
SIMPLE MOVING AVERAGE
========================================================= */

function calculateSMA(values, period) {

```
if (
    !Array.isArray(values) ||
    values.length < period
) {

    return null;

}


const recent =
    values.slice(-period);


const sum =
    recent.reduce(
        (total, value) =>
            total + value,
        0
    );


return sum / period;
```

}

/* =========================================================
EMA
PROPER EXPONENTIAL MOVING AVERAGE
========================================================= */

function calculateEMA(period = 20, values = closes) {

```
if (
    !Array.isArray(values) ||
    values.length < period
) {

    return null;

}


/*
   Start EMA from SMA of first period.
   This gives us a much more stable initial value
   than simply starting from closes[0].
*/

let ema =
    values
        .slice(0, period)
        .reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period;


const multiplier =
    2 / (period + 1);


for (
    let i = period;
    i < values.length;
    i++
) {

    const price =
        values[i];


    ema =
        (
            (price - ema) *
            multiplier
        ) + ema;

}


return ema;
```

}

/* =========================================================
EMA SERIES
USED BY MACD
========================================================= */

function calculateEMASeries(
values,
period
) {

```
if (
    !Array.isArray(values) ||
    values.length < period
) {

    return [];

}


const multiplier =
    2 / (period + 1);


const firstSMA =
    values
        .slice(0, period)
        .reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period;


let ema =
    firstSMA;


const result = [

    {

        index:
            period - 1,

        value:
            ema

    }

];


for (
    let i = period;
    i < values.length;
    i++
) {

    ema =
        (
            (values[i] - ema) *
            multiplier
        ) + ema;


    result.push({

        index:
            i,

        value:
            ema

    });

}


return result;
```

}

/* =========================================================
WILDER RSI
========================================================= */

function calculateRSI(period = 14) {

```
if (
    !Array.isArray(closes) ||
    closes.length <= period
) {

    return null;

}


/*
   Step 1:
   Calculate initial gains/losses.
*/

let gainSum = 0;

let lossSum = 0;


for (
    let i = 1;
    i <= period;
    i++
) {

    const change =
        closes[i] -
        closes[i - 1];


    if (change > 0) {

        gainSum += change;

    }
    else {

        lossSum += Math.abs(change);

    }

}


/*
   Initial Wilder averages.
*/

let averageGain =
    gainSum / period;


let averageLoss =
    lossSum / period;


/*
   Step 2:
   Wilder smoothing through the rest
   of the available candle history.
*/

for (
    let i = period + 1;
    i < closes.length;
    i++
) {

    const change =
        closes[i] -
        closes[i - 1];


    const gain =
        change > 0
            ? change
            : 0;


    const loss =
        change < 0
            ? Math.abs(change)
            : 0;


    averageGain =
        (
            (averageGain * (period - 1)) +
            gain
        ) / period;


    averageLoss =
        (
            (averageLoss * (period - 1)) +
            loss
        ) / period;

}


/*
   Edge cases:
   No losses = RSI 100
   No gains = RSI 0
   No movement = RSI 50
*/

if (
    averageLoss === 0 &&
    averageGain === 0
) {

    return 50;

}


if (averageLoss === 0) {

    return 100;

}


if (averageGain === 0) {

    return 0;

}


const relativeStrength =
    averageGain /
    averageLoss;


const rsi =
    100 -
    (
        100 /
        (1 + relativeStrength)
    );


return Math.min(
    100,
    Math.max(
        0,
        rsi
    )
);
```

}

/* =========================================================
RSI TREND / CONDITION
========================================================= */

function getRSICondition(rsi) {

```
if (!Number.isFinite(rsi)) {

    return "WAITING";

}


if (rsi >= 70) {

    return "OVERBOUGHT";

}


if (rsi <= 30) {

    return "OVERSOLD";

}


if (rsi >= 55) {

    return "BULLISH";

}


if (rsi <= 45) {

    return "BEARISH";

}


return "NEUTRAL";
```

}

/* =========================================================
MACD
12 / 26 / 9
========================================================= */

function calculateMACD() {

```
if (closes.length < 35) {

    return {

        value: null,

        signal: null,

        histogram: null

    };

}


const ema12Series =
    calculateEMASeries(
        closes,
        12
    );


const ema26Series =
    calculateEMASeries(
        closes,
        26
    );


if (
    !ema12Series.length ||
    !ema26Series.length
) {

    return {

        value: null,

        signal: null,

        histogram: null

    };

}


/*
   Align EMA12 with EMA26.
*/

const macdValues = [];


for (
    let i = 0;
    i < ema26Series.length;
    i++
) {

    const absoluteIndex =
        ema26Series[i].index;


    const ema12Point =
        ema12Series.find(
            point =>
                point.index ===
                absoluteIndex
        );


    if (!ema12Point) {

        continue;

    }


    const macdValue =
        ema12Point.value -
        ema26Series[i].value;


    macdValues.push(
        macdValue
    );

}


if (macdValues.length < 9) {

    return {

        value: null,

        signal: null,

        histogram: null

    };

}


const signalSeries =
    calculateEMASeries(
        macdValues,
        9
    );


const currentMACD =
    macdValues[
        macdValues.length - 1
    ];


const currentSignal =
    signalSeries.length
        ? signalSeries[
            signalSeries.length - 1
        ].value
        : null;


const histogram =
    Number.isFinite(currentSignal)
        ? currentMACD -
          currentSignal
        : null;


return {

    value:
        currentMACD,

    signal:
        currentSignal,

    histogram:
        histogram

};
```

}

/* =========================================================
MACD CONDITION
========================================================= */

function getMACDCondition(macdData) {

```
if (
    !macdData ||
    !Number.isFinite(macdData.value) ||
    !Number.isFinite(macdData.signal)
) {

    return "WAITING";

}


if (
    macdData.value > macdData.signal &&
    macdData.histogram > 0
) {

    return "BULLISH";

}


if (
    macdData.value < macdData.signal &&
    macdData.histogram < 0
) {

    return "BEARISH";

}


return "NEUTRAL";
```

}

/* =========================================================
VWAP
========================================================= */

function calculateVWAP() {

```
if (!candles.length) {

    return null;

}


let totalVolume = 0;

let totalValue = 0;


/*
   VWAP is calculated from the loaded
   intraday candle dataset.
*/

candles.forEach(candle => {

    const typicalPrice =
        (
            candle.high +
            candle.low +
            candle.close
        ) / 3;


    const volume =
        safeNumber(
            candle.volume
        );


    totalValue +=
        typicalPrice *
        volume;


    totalVolume +=
        volume;

});


if (totalVolume <= 0) {

    return null;

}


return (
    totalValue /
    totalVolume
);
```

}

/* =========================================================
TRUE RANGE
========================================================= */

function calculateTrueRange(index) {

```
if (
    index <= 0 ||
    !candles[index] ||
    !candles[index - 1]
) {

    return 0;

}


const current =
    candles[index];


const previous =
    candles[index - 1];


return Math.max(

    current.high -
    current.low,

    Math.abs(
        current.high -
        previous.close
    ),

    Math.abs(
        current.low -
        previous.close
    )

);
```

}

/* =========================================================
ATR
WILDER STYLE
========================================================= */

function calculateATR(period = 14) {

```
if (
    candles.length <= period
) {

    return null;

}


const trueRanges = [];


for (
    let i = 1;
    i < candles.length;
    i++
) {

    trueRanges.push(
        calculateTrueRange(i)
    );

}


if (
    trueRanges.length < period
) {

    return null;

}


/*
   Initial ATR.
*/

let atr =
    trueRanges
        .slice(0, period)
        .reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period;


/*
   Wilder smoothing.
*/

for (
    let i = period;
    i < trueRanges.length;
    i++
) {

    atr =
        (
            (atr * (period - 1)) +
            trueRanges[i]
        ) / period;

}


return atr;
```

}

/* =========================================================
VOLUME ANALYSIS
========================================================= */

function analyzeVolume() {

```
const period = 20;


if (
    volumes.length < period + 1
) {

    return "COLLECTING";

}


const previousVolumes =
    volumes.slice(
        -(period + 1),
        -1
    );


const currentVolume =
    volumes[
        volumes.length - 1
    ];


const averageVolume =
    previousVolumes.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / previousVolumes.length;


if (
    averageVolume <= 0
) {

    return "NORMAL";

}


const ratio =
    currentVolume /
    averageVolume;


if (ratio >= 2) {

    return "EXTREME";

}


if (ratio >= 1.5) {

    return "HIGH";

}


if (ratio <= 0.6) {

    return "LOW";

}


return "NORMAL";
```

}

/* =========================================================
VOLUME RATIO
========================================================= */

function calculateVolumeRatio() {

```
const period = 20;


if (
    volumes.length < period + 1
) {

    return null;

}


const previousVolumes =
    volumes.slice(
        -(period + 1),
        -1
    );


const average =
    previousVolumes.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / previousVolumes.length;


if (average <= 0) {

    return null;

}


return (
    volumes[
        volumes.length - 1
    ] / average
);
```

}

/* =========================================================
REALIZED VOLATILITY
========================================================= */

function calculateVolatility(period = 20) {

```
if (
    closes.length < period + 1
) {

    return null;

}


const returns = [];


for (
    let i =
        closes.length - period;
    i < closes.length;
    i++
) {

    const previous =
        closes[i - 1];


    const current =
        closes[i];


    if (
        previous <= 0 ||
        current <= 0
    ) {

        continue;

    }


    const percentageReturn =
        (
            (current - previous) /
            previous
        ) * 100;


    returns.push(
        percentageReturn
    );

}


if (returns.length < 2) {

    return null;

}


const mean =
    returns.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / returns.length;


const variance =
    returns.reduce(
        (sum, value) =>
            sum +
            Math.pow(
                value - mean,
                2
            ),
        0
    ) / returns.length;


/*
   Approximate short-term
   standard deviation percentage.
*/

return Math.sqrt(
    variance
);
```

}

/* =========================================================
ATR VOLATILITY %
========================================================= */

function calculateATRPercent() {

```
const atr =
    calculateATR();


if (
    !Number.isFinite(atr) ||
    !market.price
) {

    return null;

}


return (
    atr /
    market.price
) * 100;
```

}

/* =========================================================
UPDATE INDICATORS UI
========================================================= */

function updateIndicators() {

```
if (
    closes.length < 50 ||
    candles.length < 50
) {

    return;

}


const rsi =
    calculateRSI(14);


const ema20 =
    calculateEMA(20);


const ema50 =
    calculateEMA(50);


const ema200 =
    calculateEMA(200);


const macd =
    calculateMACD();


const vwap =
    calculateVWAP();


const atr =
    calculateATR(14);


const volume =
    analyzeVolume();


const volatility =
    calculateVolatility(20);


/* ---------------------------------------------
   RSI
   --------------------------------------------- */

if (
    rsiBox &&
    Number.isFinite(rsi)
) {

    rsiBox.textContent =
        rsi.toFixed(2);

}


/* ---------------------------------------------
   EMA 20
   --------------------------------------------- */

if (
    ema20Box &&
    Number.isFinite(ema20)
) {

    ema20Box.textContent =
        ema20.toFixed(2);

}


/* ---------------------------------------------
   EMA 50
   --------------------------------------------- */

if (
    ema50Box &&
    Number.isFinite(ema50)
) {

    ema50Box.textContent =
        ema50.toFixed(2);

}


/* ---------------------------------------------
   EMA 200
   --------------------------------------------- */

if (
    ema200Box &&
    Number.isFinite(ema200)
) {

    ema200Box.textContent =
        ema200.toFixed(2);

}


/* ---------------------------------------------
   MACD
   --------------------------------------------- */

if (
    macdBox &&
    macd &&
    Number.isFinite(macd.value)
) {

    macdBox.textContent =
        macd.value.toFixed(2);

}


/* ---------------------------------------------
   VWAP
   --------------------------------------------- */

if (
    vwapBox &&
    Number.isFinite(vwap)
) {

    vwapBox.textContent =
        vwap.toFixed(2);

}


/* ---------------------------------------------
   ATR
   --------------------------------------------- */

if (
    atrBox &&
    Number.isFinite(atr)
) {

    atrBox.textContent =
        atr.toFixed(2);

}


/* ---------------------------------------------
   VOLUME
   --------------------------------------------- */

if (volumeBox) {

    volumeBox.textContent =
        volume;

}


/* ---------------------------------------------
   VOLATILITY
   --------------------------------------------- */

if (
    volatilityBox &&
    Number.isFinite(volatility)
) {

    volatilityBox.textContent =
        volatility.toFixed(3) +
        "%";

}

}

/* =========================================================
INDICATOR UPDATE LOOP
========================================================= */

setInterval(() => {


if (
    historyLoaded &&
    closes.length >= 50
) {


    updateIndicators();

}

}, 3000);



/* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 3
MARKET INTELLIGENCE & STRUCTURE ENGINE
========================================================= */

/* =========================================================
INTELLIGENCE DOM ELEMENTS
========================================================= */

const trendBox =
document.getElementById("trend");

const structureBox =
document.getElementById("structure");

const liquidityZoneBox =
document.getElementById("liquidityZone");

const marketConditionBox =
document.getElementById("marketCondition");

/* =========================================================
MARKET INTELLIGENCE STORAGE
========================================================= */

let intelligence = {

```
trend: "WAITING",

structure: "WAITING",

liquidity: "WAITING",

marketCondition: "WAITING",

support: null,

resistance: null,

bos: "NO BOS",

choch: "NO CHOCH",

fvg: "NONE",

orderBlock: "NONE",

trendStrength: 0
```

};

/* =========================================================
GET RECENT CANDLES
========================================================= */

function getRecentCandles(period = 50) {

```
if (
    candles.length < period
) {

    return [];

}


return candles.slice(-period);
```

}

/* =========================================================
SWING HIGH
========================================================= */

function findSwingHigh(
data,
strength = 2
) {

```
if (
    data.length <
    (strength * 2 + 1)
) {

    return null;

}


const swings = [];


for (
    let i = strength;
    i < data.length - strength;
    i++
) {

    const current =
        data[i].high;


    let isSwing =
        true;


    for (
        let j = 1;
        j <= strength;
        j++
    ) {

        if (
            current <=
            data[i - j].high
        ) {

            isSwing = false;

            break;

        }


        if (
            current <=
            data[i + j].high
        ) {

            isSwing = false;

            break;

        }

    }


    if (isSwing) {

        swings.push({

            price:
                current,

            index:
                i,

            time:
                data[i].time

        });

    }

}


return swings;
```

}

/* =========================================================
SWING LOW
========================================================= */

function findSwingLow(
data,
strength = 2
) {

```
if (
    data.length <
    (strength * 2 + 1)
) {

    return null;

}


const swings = [];


for (
    let i = strength;
    i < data.length - strength;
    i++
) {

    const current =
        data[i].low;


    let isSwing =
        true;


    for (
        let j = 1;
        j <= strength;
        j++
    ) {

        if (
            current >=
            data[i - j].low
        ) {

            isSwing = false;

            break;

        }


        if (
            current >=
            data[i + j].low
        ) {

            isSwing = false;

            break;

        }

    }


    if (isSwing) {

        swings.push({

            price:
                current,

            index:
                i,

            time:
                data[i].time

        });

    }

}


return swings;
```

}

/* =========================================================
GET STRUCTURAL LEVELS
========================================================= */

function getStructuralLevels(
period = 50
) {

```
const data =
    getRecentCandles(period);


if (!data.length) {

    return {

        support: null,

        resistance: null,

        swingHighs: [],

        swingLows: []

    };

}


const swingHighs =
    findSwingHigh(
        data,
        2
    ) || [];


const swingLows =
    findSwingLow(
        data,
        2
    ) || [];


/*
   Use actual swing points where available.
   Fall back to recent extremes if necessary.
*/

let resistance = null;

let support = null;


if (swingHighs.length) {

    resistance =
        swingHighs[
            swingHighs.length - 1
        ].price;

}
else {

    resistance =
        Math.max(
            ...data.map(
                candle =>
                    candle.high
            )
        );

}


if (swingLows.length) {

    support =
        swingLows[
            swingLows.length - 1
        ].price;

}
else {

    support =
        Math.min(
            ...data.map(
                candle =>
                    candle.low
            )
        );

}


return {

    support,

    resistance,

    swingHighs,

    swingLows

};
```

}

/* =========================================================
TREND DETECTION
========================================================= */

function detectTrend() {

```
if (
    closes.length < 200
) {

    return "WAITING";

}


const ema20 =
    calculateEMA(20);


const ema50 =
    calculateEMA(50);


const ema200 =
    calculateEMA(200);


if (
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema200) ||
    !Number.isFinite(market.price)
) {

    return "WAITING";

}


/*
   Strong bullish alignment:
   Price > EMA20 > EMA50 > EMA200
*/

if (
    market.price > ema20 &&
    ema20 > ema50 &&
    ema50 > ema200
) {

    return "BULLISH";

}


/*
   Strong bearish alignment:
   Price < EMA20 < EMA50 < EMA200
*/

if (
    market.price < ema20 &&
    ema20 < ema50 &&
    ema50 < ema200
) {

    return "BEARISH";

}


/*
   Medium-term trend.
*/

if (
    market.price > ema50 &&
    ema50 > ema200
) {

    return "BULLISH";

}


if (
    market.price < ema50 &&
    ema50 < ema200
) {

    return "BEARISH";

}


return "SIDEWAYS";
```

}

/* =========================================================
TREND STRENGTH
========================================================= */

function calculateTrendStrength() {

```
if (
    closes.length < 200
) {

    return 0;

}


const ema20 =
    calculateEMA(20);


const ema50 =
    calculateEMA(50);


const ema200 =
    calculateEMA(200);


if (
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema200) ||
    !market.price
) {

    return 0;

}


/*
   Measure percentage separation
   between major EMAs.
*/

const separation =
    Math.abs(
        (
            (ema20 - ema200) /
            ema200
        ) * 100
    );


/*
   Price position contributes
   additional strength.
*/

const priceDistance =
    Math.abs(
        (
            (market.price - ema50) /
            ema50
        ) * 100
    );


const strength =
    Math.min(
        100,
        (
            separation * 15
        ) +
        (
            priceDistance * 10
        )
    );


return Number(
    strength.toFixed(1)
);
```

}

/* =========================================================
MARKET STRUCTURE
========================================================= */

function detectMarketStructure() {

```
const levels =
    getStructuralLevels(80);


const swingHighs =
    levels.swingHighs;


const swingLows =
    levels.swingLows;


if (
    swingHighs.length < 2 ||
    swingLows.length < 2
) {

    return "WAITING";

}


const previousHigh =
    swingHighs[
        swingHighs.length - 2
    ].price;


const latestHigh =
    swingHighs[
        swingHighs.length - 1
    ].price;


const previousLow =
    swingLows[
        swingLows.length - 2
    ].price;


const latestLow =
    swingLows[
        swingLows.length - 1
    ].price;


const higherHigh =
    latestHigh >
    previousHigh;


const higherLow =
    latestLow >
    previousLow;


const lowerHigh =
    latestHigh <
    previousHigh;


const lowerLow =
    latestLow <
    previousLow;


if (
    higherHigh &&
    higherLow
) {

    return "HH + HL";

}


if (
    lowerHigh &&
    lowerLow
) {

    return "LH + LL";

}


return "MIXED";
```

}

/* =========================================================
BREAK OF STRUCTURE
========================================================= */

function detectBOS() {

```
if (
    candles.length < 20
) {

    return "WAITING";

}


const levels =
    getStructuralLevels(50);


const resistance =
    levels.resistance;


const support =
    levels.support;


const last =
    candles[
        candles.length - 1
    ];


const previous =
    candles[
        candles.length - 2
    ];


if (
    !last ||
    !previous ||
    !Number.isFinite(resistance) ||
    !Number.isFinite(support)
) {

    return "WAITING";

}


/*
   Confirm bullish break using
   candle close rather than only
   current tick price.
*/

if (
    last.close > resistance &&
    previous.close <= resistance
) {

    return "BULLISH BOS";

}


/*
   Confirm bearish break.
*/

if (
    last.close < support &&
    previous.close >= support
) {

    return "BEARISH BOS";

}


return "NO BOS";
```

}

/* =========================================================
CHANGE OF CHARACTER
========================================================= */

function detectCHOCH() {

```
if (
    candles.length < 60
) {

    return "WAITING";

}


const levels =
    getStructuralLevels(60);


const swingHighs =
    levels.swingHighs;


const swingLows =
    levels.swingLows;


if (
    swingHighs.length < 2 ||
    swingLows.length < 2
) {

    return "WAITING";

}


const structure =
    detectMarketStructure();


const currentTrend =
    detectTrend();


/*
   Bullish CHOCH:
   bearish/weak structure starts breaking
   the previous swing high.
*/

const latestHigh =
    swingHighs[
        swingHighs.length - 1
    ].price;


const latestLow =
    swingLows[
        swingLows.length - 1
    ].price;


const previousHigh =
    swingHighs[
        swingHighs.length - 2
    ].price;


const previousLow =
    swingLows[
        swingLows.length - 2
    ].price;


if (
    currentTrend === "BULLISH" &&
    (
        structure === "HH + HL" ||
        latestHigh > previousHigh
    )
) {

    return "BULLISH CHOCH";

}


if (
    currentTrend === "BEARISH" &&
    (
        structure === "LH + LL" ||
        latestLow < previousLow
    )
) {

    return "BEARISH CHOCH";

}


return "NO CHOCH";
```

}

/* =========================================================
LIQUIDITY ZONE
========================================================= */

function calculateLiquidityZone() {

```
const levels =
    getStructuralLevels(80);


if (
    !Number.isFinite(levels.support) ||
    !Number.isFinite(levels.resistance)
) {

    return {

        side:
            "WAITING",

        price:
            null

    };

}


const distanceToHigh =
    Math.abs(
        market.price -
        levels.resistance
    );


const distanceToLow =
    Math.abs(
        market.price -
        levels.support
    );


/*
   If price is closer to resistance,
   buy-side liquidity is nearby.

   If price is closer to support,
   sell-side liquidity is nearby.
*/

if (
    distanceToHigh <
    distanceToLow
) {

    return {

        side:
            "BUY SIDE",

        price:
            levels.resistance

    };

}


return {

    side:
        "SELL SIDE",

    price:
        levels.support

};
```

}

/* =========================================================
LIQUIDITY SWEEP DETECTION
========================================================= */

function detectLiquiditySweep() {

```
if (
    candles.length < 5
) {

    return "NONE";

}


const levels =
    getStructuralLevels(50);


const last =
    candles[
        candles.length - 1
    ];


const previous =
    candles[
        candles.length - 2
    ];


if (
    !last ||
    !previous
) {

    return "NONE";

}


/*
   Sweep above resistance followed
   by close back below = buy-side sweep.
*/

if (
    last.high > levels.resistance &&
    last.close < levels.resistance &&
    previous.close <= levels.resistance
) {

    return "BUY-SIDE LIQUIDITY SWEPT";

}


/*
   Sweep below support followed
   by close back above = sell-side sweep.
*/

if (
    last.low < levels.support &&
    last.close > levels.support &&
    previous.close >= levels.support
) {

    return "SELL-SIDE LIQUIDITY SWEPT";

}


return "NONE";
```

}

/* =========================================================
FAIR VALUE GAP
========================================================= */

function detectFVG() {

```
if (
    candles.length < 5
) {

    return {

        type:
            "NONE",

        high:
            null,

        low:
            null

    };

}


/*
   Use three-candle structure:
   Candle A -> Candle B -> Candle C
*/

const a =
    candles[
        candles.length - 3
    ];


const b =
    candles[
        candles.length - 2
    ];


const c =
    candles[
        candles.length - 1
    ];


/*
   Bullish FVG:
   A high < C low
*/

if (
    a.high < c.low
) {

    return {

        type:
            "BULLISH FVG",

        high:
            c.low,

        low:
            a.high

    };

}


/*
   Bearish FVG:
   A low > C high
*/

if (
    a.low > c.high
) {

    return {

        type:
            "BEARISH FVG",

        high:
            a.low,

        low:
            c.high

    };

}


return {

    type:
        "NONE",

    high:
        null,

    low:
        null

};
```

}

/* =========================================================
ORDER BLOCK
========================================================= */

function detectOrderBlock() {

```
if (
    candles.length < 10
) {

    return {

        type:
            "NONE",

        price:
            null

    };

}


const recent =
    candles.slice(-8);


/*
   Find a bearish candle immediately
   before a strong bullish displacement.
*/

for (
    let i = recent.length - 2;
    i >= 0;
    i--
) {

    const candle =
        recent[i];


    const next =
        recent[i + 1];


    if (
        candle.close <
        candle.open &&
        next.close >
        candle.high
    ) {

        return {

            type:
                "BULLISH OB",

            price:
                candle.high

        };

    }


    /*
       Find bullish candle before
       strong bearish displacement.
    */

    if (
        candle.close >
        candle.open &&
        next.close <
        candle.low
    ) {

        return {

            type:
                "BEARISH OB",

            price:
                candle.low

        };

    }

}


return {

    type:
        "NONE",

    price:
        null

};
```

}

/* =========================================================
MARKET CONDITION
========================================================= */

function detectMarketCondition() {

```
const trend =
    detectTrend();


const atrPercent =
    calculateATRPercent();


const volatility =
    calculateVolatility(20);


if (
    trend === "WAITING"
) {

    return "COLLECTING DATA";

}


/*
   Very high ATR environment.
*/

if (
    Number.isFinite(atrPercent) &&
    atrPercent >= 0.50
) {

    return "HIGH VOLATILITY";

}


/*
   Extremely quiet market.
*/

if (
    Number.isFinite(atrPercent) &&
    atrPercent <= 0.08
) {

    return "LOW VOLATILITY";

}


/*
   Trend market.
*/

if (
    trend === "BULLISH" ||
    trend === "BEARISH"
) {

    if (
        Number.isFinite(volatility) &&
        volatility >= 0.15
    ) {

        return "TRENDING / ACTIVE";

    }


    return "TRENDING MARKET";

}


return "RANGE MARKET";
```

}

/* =========================================================
MARKET LOCATION
========================================================= */

function detectMarketLocation() {

```
const levels =
    getStructuralLevels(50);


if (
    !Number.isFinite(levels.support) ||
    !Number.isFinite(levels.resistance)
) {

    return "WAITING";

}


const range =
    levels.resistance -
    levels.support;


if (
    range <= 0
) {

    return "WAITING";

}


const position =
    (
        market.price -
        levels.support
    ) / range;


if (
    position <= 0.20
) {

    return "NEAR SUPPORT";

}


if (
    position >= 0.80
) {

    return "NEAR RESISTANCE";

}


if (
    position >= 0.45 &&
    position <= 0.55
) {

    return "MID-RANGE";

}


return "RANGE INTERIOR";
```

}

/* =========================================================
MASTER INTELLIGENCE UPDATE
========================================================= */

function updateMarketIntelligence() {

```
if (
    candles.length < 50
) {

    return;

}


const trend =
    detectTrend();


const structure =
    detectMarketStructure();


const levels =
    getStructuralLevels(80);


const liquidity =
    calculateLiquidityZone();


const bos =
    detectBOS();


const choch =
    detectCHOCH();


const fvg =
    detectFVG();


const orderBlock =
    detectOrderBlock();


const condition =
    detectMarketCondition();


const trendStrength =
    calculateTrendStrength();


const sweep =
    detectLiquiditySweep();


const location =
    detectMarketLocation();


intelligence = {

    trend,

    structure,

    liquidity:
        liquidity.side,

    marketCondition:
        condition,

    support:
        levels.support,

    resistance:
        levels.resistance,

    bos,

    choch,

    fvg:
        fvg.type,

    orderBlock:
        orderBlock.type,

    trendStrength,

    liquiditySweep:
        sweep,

    marketLocation:
        location

};


/* ---------------------------------------------
   TREND UI
   --------------------------------------------- */

if (trendBox) {

    trendBox.textContent =
        trend;

}


/* ---------------------------------------------
   STRUCTURE UI
   --------------------------------------------- */

if (structureBox) {

    let structureText =
        structure;


    if (
        bos !== "NO BOS" &&
        bos !== "WAITING"
    ) {

        structureText +=
            " | " +
            bos;

    }


    if (
        choch !== "NO CHOCH" &&
        choch !== "WAITING"
    ) {

        structureText +=
            " | " +
            choch;

    }


    structureBox.textContent =
        structureText;

}


/* ---------------------------------------------
   LIQUIDITY UI
   --------------------------------------------- */

if (liquidityZoneBox) {

    if (
        liquidity.price !== null
    ) {

        liquidityZoneBox.textContent =
            liquidity.side +
            " @ " +
            liquidity.price.toFixed(2);

    }
    else {

        liquidityZoneBox.textContent =
            "WAITING";

    }

}


/* ---------------------------------------------
   MARKET CONDITION UI
   --------------------------------------------- */

if (marketConditionBox) {

    marketConditionBox.textContent =
        condition;

}


/*
   Keep intelligence available for
   Part 4 scoring engine.
*/

return intelligence;
```

}

/* =========================================================
AUTO INTELLIGENCE UPDATE
========================================================= */

setInterval(() => {

```
if (
    historyLoaded &&
    candles.length >= 50
) {

    updateMarketIntelligence();

}
```

}, 5000);

/* =========================================================
INITIAL INTELLIGENCE UPDATE
========================================================= */

setTimeout(() => {

```
if (
    historyLoaded &&
    candles.length >= 50
) {

    updateMarketIntelligence();

}
```

}, 1500);




/* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 4
FINAL SCORING + SIGNAL + RISK ENGINE
========================================================= */

/* =========================================================
FINAL SCANNER DOM ELEMENTS
========================================================= */

const scanBtn =
document.getElementById("scanBtn");

const scanTimer =
document.getElementById("scanTimer");

const scanStatus =
document.getElementById("scanStatus");

const engineStatus =
document.getElementById("engineStatus");

const signalBox =
document.getElementById("signal");

const confidenceBox =
document.getElementById("confidence");

const momentumBox =
document.getElementById("momentum");

const liquidityBox =
document.getElementById("liquidity");

const signalTime =
document.getElementById("signalTime");

const entryBox =
document.getElementById("entry");

const stopBox =
document.getElementById("stopLoss");

const targetBox =
document.getElementById("target");

const rrBox =
document.getElementById("riskReward");

const voiceText =
document.getElementById("voiceText");

/* =========================================================
SCANNER STATE
========================================================= */

let scanning = false;

let lastSignal = null;

let lastScanResult = null;

/* =========================================================
SCORING CONFIGURATION
========================================================= */

const SCORE_CONFIG = {

```
trend:
    25,

emaAlignment:
    15,

rsi:
    10,

macd:
    15,

vwap:
    10,

volume:
    8,

structure:
    12,

liquidity:
    8,

volatility:
    5
```

};

/* =========================================================
SCORE CLAMP
========================================================= */

function clampScore(
value,
min = -100,
max = 100
) {

```
return Math.max(
    min,
    Math.min(
        max,
        value
    )
);
```

}

/* =========================================================
ADD REASON
========================================================= */

function addReason(
reasons,
direction,
text,
points
) {

```
reasons.push({

    direction,

    text,

    points

});
```

}

/* =========================================================
EMA ALIGNMENT
========================================================= */

function getEMAAlignment() {

```
const ema20 =
    calculateEMA(20);

const ema50 =
    calculateEMA(50);

const ema200 =
    calculateEMA(200);


if (
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema200)
) {

    return "WAITING";

}


if (
    market.price > ema20 &&
    ema20 > ema50 &&
    ema50 > ema200
) {

    return "BULLISH";

}


if (
    market.price < ema20 &&
    ema20 < ema50 &&
    ema50 < ema200
) {

    return "BEARISH";

}


return "MIXED";
```

}

/* =========================================================
RSI SCORE
========================================================= */

function scoreRSI(
rsi,
reasons
) {

```
if (
    !Number.isFinite(rsi)
) {

    return 0;

}


/*
   Extreme overbought is not automatically
   a SHORT signal. It can occur during a
   strong bullish trend.

   Therefore RSI is weighted carefully.
*/

if (
    rsi >= 70
) {

    addReason(
        reasons,
        "BEARISH",
        "RSI overbought",
        -6
    );

    return -6;

}


if (
    rsi <= 30
) {

    addReason(
        reasons,
        "BULLISH",
        "RSI oversold",
        6
    );

    return 6;

}


if (
    rsi >= 55 &&
    rsi < 70
) {

    addReason(
        reasons,
        "BULLISH",
        "RSI bullish zone",
        10
    );

    return 10;

}


if (
    rsi <= 45 &&
    rsi > 30
) {

    addReason(
        reasons,
        "BEARISH",
        "RSI bearish zone",
        -10
    );

    return -10;

}


addReason(
    reasons,
    "NEUTRAL",
    "RSI neutral",
    0
);


return 0;
```

}

/* =========================================================
TREND SCORE
========================================================= */

function scoreTrend(
trend,
reasons
) {

```
if (
    trend === "BULLISH"
) {

    addReason(
        reasons,
        "BULLISH",
        "Major trend bullish",
        SCORE_CONFIG.trend
    );

    return SCORE_CONFIG.trend;

}


if (
    trend === "BEARISH"
) {

    addReason(
        reasons,
        "BEARISH",
        "Major trend bearish",
        -SCORE_CONFIG.trend
    );

    return -SCORE_CONFIG.trend;

}


return 0;
```

}

/* =========================================================
EMA SCORE
========================================================= */

function scoreEMA(
alignment,
reasons
) {

```
if (
    alignment === "BULLISH"
) {

    addReason(
        reasons,
        "BULLISH",
        "EMA 20/50/200 aligned bullish",
        SCORE_CONFIG.emaAlignment
    );

    return SCORE_CONFIG.emaAlignment;

}


if (
    alignment === "BEARISH"
) {

    addReason(
        reasons,
        "BEARISH",
        "EMA 20/50/200 aligned bearish",
        -SCORE_CONFIG.emaAlignment
    );

    return -SCORE_CONFIG.emaAlignment;

}


addReason(
    reasons,
    "NEUTRAL",
    "EMA structure mixed",
    0
);


return 0;
```

}

/* =========================================================
MACD SCORE
========================================================= */

function scoreMACD(
macd,
reasons
) {

```
if (
    !macd ||
    !Number.isFinite(macd.value) ||
    !Number.isFinite(macd.signal)
) {

    return 0;

}


if (
    macd.value > macd.signal &&
    macd.histogram > 0
) {

    addReason(
        reasons,
        "BULLISH",
        "MACD bullish momentum",
        SCORE_CONFIG.macd
    );

    return SCORE_CONFIG.macd;

}


if (
    macd.value < macd.signal &&
    macd.histogram < 0
) {

    addReason(
        reasons,
        "BEARISH",
        "MACD bearish momentum",
        -SCORE_CONFIG.macd
    );

    return -SCORE_CONFIG.macd;

}


addReason(
    reasons,
    "NEUTRAL",
    "MACD mixed",
    0
);


return 0;
```

}

/* =========================================================
VWAP SCORE
========================================================= */

function scoreVWAP(
reasons
) {

```
const vwap =
    calculateVWAP();


if (
    !Number.isFinite(vwap) ||
    !Number.isFinite(market.price)
) {

    return 0;

}


if (
    market.price > vwap
) {

    addReason(
        reasons,
        "BULLISH",
        "Price above VWAP",
        SCORE_CONFIG.vwap
    );

    return SCORE_CONFIG.vwap;

}


if (
    market.price < vwap
) {

    addReason(
        reasons,
        "BEARISH",
        "Price below VWAP",
        -SCORE_CONFIG.vwap
    );

    return -SCORE_CONFIG.vwap;

}


return 0;
```

}

/* =========================================================
VOLUME SCORE
========================================================= */

function scoreVolume(
reasons
) {

```
const volume =
    analyzeVolume();


if (
    volume === "EXTREME"
) {

    /*
       Extreme volume confirms activity,
       but direction comes from price structure.
    */

    addReason(
        reasons,
        "NEUTRAL",
        "Extreme volume activity",
        0
    );

    return 0;

}


if (
    volume === "HIGH"
) {

    addReason(
        reasons,
        "NEUTRAL",
        "High volume confirmation",
        0
    );

    return 0;

}


if (
    volume === "LOW"
) {

    addReason(
        reasons,
        "NEUTRAL",
        "Low participation",
        -3
    );

    return -3;

}


return 0;
```

}

/* =========================================================
STRUCTURE SCORE
========================================================= */

function scoreStructure(
reasons
) {

```
let score = 0;


const bos =
    detectBOS();


const choch =
    detectCHOCH();


const structure =
    detectMarketStructure();


if (
    bos === "BULLISH BOS"
) {

    score += 12;


    addReason(
        reasons,
        "BULLISH",
        "Bullish break of structure",
        12
    );

}


else if (
    bos === "BEARISH BOS"
) {

    score -= 12;


    addReason(
        reasons,
        "BEARISH",
        "Bearish break of structure",
        -12
    );

}


if (
    choch === "BULLISH CHOCH"
) {

    score += 5;


    addReason(
        reasons,
        "BULLISH",
        "Bullish change of character",
        5
    );

}


else if (
    choch === "BEARISH CHOCH"
) {

    score -= 5;


    addReason(
        reasons,
        "BEARISH",
        "Bearish change of character",
        -5
    );

}


if (
    structure === "HH + HL"
) {

    score += 3;

}


else if (
    structure === "LH + LL"
) {

    score -= 3;

}


return score;
```

}

/* =========================================================
LIQUIDITY SCORE
========================================================= */

function scoreLiquidity(
reasons
) {

```
const sweep =
    detectLiquiditySweep();


const location =
    detectMarketLocation();


let score = 0;


/*
   Liquidity sweep can be a strong
   reversal confirmation.
*/

if (
    sweep ===
    "SELL-SIDE LIQUIDITY SWEPT"
) {

    score += 8;


    addReason(
        reasons,
        "BULLISH",
        "Sell-side liquidity swept",
        8
    );

}


if (
    sweep ===
    "BUY-SIDE LIQUIDITY SWEPT"
) {

    score -= 8;


    addReason(
        reasons,
        "BEARISH",
        "Buy-side liquidity swept",
        -8
    );

}


/*
   Being near a major level by itself
   is not enough for a directional signal.
*/

if (
    location === "NEAR SUPPORT"
) {

    addReason(
        reasons,
        "BULLISH",
        "Price near support",
        0
    );

}


if (
    location === "NEAR RESISTANCE"
) {

    addReason(
        reasons,
        "BEARISH",
        "Price near resistance",
        0
    );

}


return score;
```

}

/* =========================================================
FVG / ORDER BLOCK SCORE
========================================================= */

function scoreImbalance(
reasons
) {

```
const fvg =
    detectFVG();


const orderBlock =
    detectOrderBlock();


let score = 0;


if (
    fvg.type ===
    "BULLISH FVG"
) {

    score += 3;


    addReason(
        reasons,
        "BULLISH",
        "Bullish fair value gap",
        3
    );

}


if (
    fvg.type ===
    "BEARISH FVG"
) {

    score -= 3;


    addReason(
        reasons,
        "BEARISH",
        "Bearish fair value gap",
        -3
    );

}


if (
    orderBlock.type ===
    "BULLISH OB"
) {

    score += 3;


    addReason(
        reasons,
        "BULLISH",
        "Bullish order block",
        3
    );

}


if (
    orderBlock.type ===
    "BEARISH OB"
) {

    score -= 3;


    addReason(
        reasons,
        "BEARISH",
        "Bearish order block",
        -3
    );

}


return score;
```

}

/* =========================================================
VOLATILITY SCORE
========================================================= */

function scoreVolatility(
reasons
) {

```
const atrPercent =
    calculateATRPercent();


if (
    !Number.isFinite(atrPercent)
) {

    return 0;

}


/*
   Extremely low volatility:
   avoid forcing trades.
*/

if (
    atrPercent < 0.08
) {

    addReason(
        reasons,
        "NEUTRAL",
        "Very low volatility",
        -5
    );

    return -5;

}


/*
   Healthy activity.
*/

if (
    atrPercent >= 0.08 &&
    atrPercent < 0.50
) {

    addReason(
        reasons,
        "NEUTRAL",
        "Healthy volatility",
        5
    );

    return 5;

}


/*
   Very high volatility reduces
   signal reliability.
*/

addReason(
    reasons,
    "NEUTRAL",
    "High volatility risk",
    -3
);


return -3;
```

}

/* =========================================================
SIGNAL QUALITY
========================================================= */

function calculateSignalQuality(
score,
reasons
) {

```
const bullish =
    reasons.filter(
        reason =>
            reason.direction ===
            "BULLISH"
    ).length;


const bearish =
    reasons.filter(
        reason =>
            reason.direction ===
            "BEARISH"
    ).length;


const totalDirectional =
    bullish +
    bearish;


if (
    totalDirectional === 0
) {

    return 0;

}


const agreement =
    Math.max(
        bullish,
        bearish
    ) /
    totalDirectional;


const magnitude =
    Math.min(
        1,
        Math.abs(score) / 70
    );


return (
    agreement *
    60
) +
(
    magnitude *
    40
);
```

}

/* =========================================================
FINAL SCORE
========================================================= */

function calculateScore() {

```
if (
    !historyLoaded ||
    closes.length < 200
) {

    return {

        score:
            0,

        reasons:
            [],

        quality:
            0

    };

}


let score = 0;

const reasons = [];


/* Trend */

score +=
    scoreTrend(
        detectTrend(),
        reasons
    );


/* EMA */

score +=
    scoreEMA(
        getEMAAlignment(),
        reasons
    );


/* RSI */

score +=
    scoreRSI(
        calculateRSI(14),
        reasons
    );


/* MACD */

score +=
    scoreMACD(
        calculateMACD(),
        reasons
    );


/* VWAP */

score +=
    scoreVWAP(
        reasons
    );


/* Volume */

score +=
    scoreVolume(
        reasons
    );


/* Structure */

score +=
    scoreStructure(
        reasons
    );


/* Liquidity */

score +=
    scoreLiquidity(
        reasons
    );


/* FVG + Order Block */

score +=
    scoreImbalance(
        reasons
    );


/* Volatility */

score +=
    scoreVolatility(
        reasons
    );


score =
    clampScore(
        score
    );


const quality =
    calculateSignalQuality(
        score,
        reasons
    );


return {

    score,

    reasons,

    quality

};
```

}

/* =========================================================
FINAL SIGNAL GENERATOR
========================================================= */

function generateSignal() {

```
const data =
    calculateScore();


const score =
    data.score;


let signal =
    "WAIT";


/*
   Stronger threshold means fewer
   but better-confirmed signals.
*/

if (
    score >= 45
) {

    signal =
        "LONG";

}


else if (
    score <= -45
) {

    signal =
        "SHORT";

}


/*
   Between -45 and +45:
   no sufficiently strong agreement.
*/


/*
   Confidence calculation.
   It is based on:
   - score magnitude
   - indicator agreement
   - quality
*/

let confidence =
    50 +
    (
        Math.abs(score) *
        0.35
    ) +
    (
        data.quality *
        0.25
    );


confidence =
    Math.max(
        50,
        Math.min(
            95,
            confidence
        )
    );


/*
   WAIT should not display fake high confidence.
*/

if (
    signal === "WAIT"
) {

    confidence =
        Math.min(
            confidence,
            64
        );

}


return {

    signal,

    confidence,

    score,

    quality:
        data.quality,

    reasons:
        data.reasons

};
```

}

/* =========================================================
ATR BASED RISK MANAGEMENT
========================================================= */

function calculateRisk(
signal
) {

```
const entry =
    market.price;


const atr =
    calculateATR(14);


if (
    !Number.isFinite(entry) ||
    !Number.isFinite(atr) ||
    entry <= 0 ||
    atr <= 0
) {

    return {

        entry:
            entry || 0,

        stop:
            0,

        target:
            0,

        rr:
            0

    };

}


/*
   Dynamic ATR multipliers.

   This prevents a fixed dollar stop
   from becoming useless as BTC volatility changes.
*/

const stopDistance =
    atr * 1.5;


const targetDistance =
    atr * 3;


let stop = 0;

let target = 0;


if (
    signal === "LONG"
) {

    stop =
        entry -
        stopDistance;


    target =
        entry +
        targetDistance;

}


else if (
    signal === "SHORT"
) {

    stop =
        entry +
        stopDistance;


    target =
        entry -
        targetDistance;

}


else {

    return {

        entry,

        stop:
            0,

        target:
            0,

        rr:
            0

    };

}


const risk =
    Math.abs(
        entry -
        stop
    );


const reward =
    Math.abs(
        target -
        entry
    );


const rr =
    risk > 0
        ? reward / risk
        : 0;


return {

    entry,

    stop,

    target,

    rr,

    atr,

    risk,

    reward

};
```

}

/* =========================================================
FORMAT SIGNAL REASONS
========================================================= */

function getSignalSummary(
data
) {

```
const directionalReasons =
    data.reasons.filter(
        reason =>
            reason.direction !==
            "NEUTRAL"
    );


if (
    directionalReasons.length === 0
) {

    return "Signals are mixed";

}


const strongest =
    [...directionalReasons]
        .sort(
            (a, b) =>
                Math.abs(b.points) -
                Math.abs(a.points)
        )
        .slice(0, 3);


return strongest
    .map(
        reason =>
            reason.text
    )
    .join(" • ");
```

}

/* =========================================================
DISPLAY FINAL SIGNAL
========================================================= */

function displaySignal(data) {

```
if (!data) {

    return;

}


lastSignal =
    data.signal;


lastScanResult =
    data;


if (signalBox) {

    signalBox.textContent =
        data.signal;

}


if (confidenceBox) {

    confidenceBox.textContent =
        data.confidence.toFixed(0) +
        "%";

}


/*
   Signal colors.
*/

if (
    data.signal === "LONG"
) {

    if (signalBox) {

        signalBox.style.color =
            "#00ff88";

    }


    if (momentumBox) {

        momentumBox.textContent =
            "BUY PRESSURE";

    }

}


else if (
    data.signal === "SHORT"
) {

    if (signalBox) {

        signalBox.style.color =
            "#ff4d6d";

    }


    if (momentumBox) {

        momentumBox.textContent =
            "SELL PRESSURE";

    }

}


else {

    if (signalBox) {

        signalBox.style.color =
            "#ffd166";

    }


    if (momentumBox) {

        momentumBox.textContent =
            "NEUTRAL";

    }

}


/*
   Liquidity display.
*/

const liquidity =
    calculateLiquidityZone();


if (
    liquidityBox
) {

    if (
        liquidity.price !== null
    ) {

        liquidityBox.textContent =
            liquidity.side +
            " @ " +
            liquidity.price.toFixed(2);

    }
    else {

        liquidityBox.textContent =
            "WAITING";

    }

}


/*
   Risk management.
*/

const risk =
    calculateRisk(
        data.signal
    );


if (entryBox) {

    entryBox.textContent =
        risk.entry > 0
            ? risk.entry.toFixed(2)
            : "--";

}


if (stopBox) {

    stopBox.textContent =
        risk.stop > 0
            ? risk.stop.toFixed(2)
            : "--";

}


if (targetBox) {

    targetBox.textContent =
        risk.target > 0
            ? risk.target.toFixed(2)
            : "--";

}


if (rrBox) {

    rrBox.textContent =
        risk.rr > 0
            ? risk.rr.toFixed(2) + "R"
            : "--";

}


/*
   Signal timestamp.
*/

if (signalTime) {

    signalTime.textContent =
        new Date().toLocaleTimeString();

}


/*
   Scanner status.
*/

if (scanStatus) {

    scanStatus.textContent =
        "Analysis Complete • Score " +
        data.score +
        " • Quality " +
        data.quality.toFixed(0) +
        "%";

}


/*
   Voice summary.
*/

const summary =
    getSignalSummary(data);


if (
    data.signal === "LONG"
) {

    speak(
        "Long setup detected. " +
        summary
    );

}


else if (
    data.signal === "SHORT"
) {

    speak(
        "Short setup detected. " +
        summary
    );

}


else {

    speak(
        "No clear setup. " +
        summary
    );

}


console.log(
    "FINAL 




   /* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 5
LIVE CONFIRMATION + AUTO MONITOR ENGINE
========================================================= */

/* =========================================================
AUTO MONITOR STATE
========================================================= */

let autoMonitorEnabled = true;

let lastMonitorScore = null;

let lastMonitorSignal = "WAIT";

let signalStableCount = 0;

let previousMonitorSignal = "WAIT";

let monitorBusy = false;

/* =========================================================
LIVE MARKET SNAPSHOT
========================================================= */

function getMarketSnapshot() {

```
if (
    !historyLoaded ||
    closes.length < 200
) {

    return null;

}


const price =
    Number(market.price);


const rsi =
    Number(calculateRSI(14));


const ema20 =
    Number(calculateEMA(20));


const ema50 =
    Number(calculateEMA(50));


const ema200 =
    Number(calculateEMA(200));


const vwap =
    Number(calculateVWAP());


const atr =
    Number(calculateATR(14));


const trend =
    detectTrend();


const emaAlignment =
    getEMAAlignment();


const volume =
    analyzeVolume();


const marketCondition =
    detectMarketCondition();


return {

    price,

    rsi,

    ema20,

    ema50,

    ema200,

    vwap,

    atr,

    trend,

    emaAlignment,

    volume,

    marketCondition

};
```

}

/* =========================================================
DATA VALIDATION
========================================================= */

function validateMarketSnapshot(
snapshot
) {

```
if (!snapshot) {

    return false;

}


const values = [

    snapshot.price,

    snapshot.rsi,

    snapshot.ema20,

    snapshot.ema50,

    snapshot.ema200,

    snapshot.vwap,

    snapshot.atr

];


return values.every(
    value =>
        Number.isFinite(value)
);
```

}

/* =========================================================
MARKET MOMENTUM
========================================================= */

function detectMomentumState(
snapshot
) {

```
if (
    !snapshot
) {

    return "WAITING";

}


const {

    price,
    ema20,
    ema50,
    rsi

} = snapshot;


/*
   Strong bullish momentum.
*/

if (
    price > ema20 &&
    ema20 > ema50 &&
    rsi >= 55 &&
    rsi < 75
) {

    return "STRONG BUY";

}


/*
   Strong bearish momentum.
*/

if (
    price < ema20 &&
    ema20 < ema50 &&
    rsi <= 45 &&
    rsi > 25
) {

    return "STRONG SELL";

}


/*
   Momentum can be bullish even if
   trend is not fully aligned.
*/

if (
    price > ema20 &&
    rsi > 50
) {

    return "BUY PRESSURE";

}


if (
    price < ema20 &&
    rsi < 50
) {

    return "SELL PRESSURE";

}


return "NEUTRAL";
```

}

/* =========================================================
RSI HEALTH CHECK
========================================================= */

function getRSICondition(
rsi
) {

```
if (
    !Number.isFinite(rsi)
) {

    return "WAITING";

}


if (
    rsi >= 75
) {

    return "EXTREME OVERBOUGHT";

}


if (
    rsi >= 65
) {

    return "OVERBOUGHT";

}


if (
    rsi >= 55
) {

    return "BULLISH";

}


if (
    rsi > 45
) {

    return "NEUTRAL";

}


if (
    rsi > 35
) {

    return "BEARISH";

}


if (
    rsi > 25
) {

    return "OVERSOLD";

}


return "EXTREME OVERSOLD";
```

}

/* =========================================================
EMA POSITION
========================================================= */

function getEMAPosition(
snapshot
) {

```
if (
    !snapshot
) {

    return "WAITING";

}


if (
    snapshot.price >
    snapshot.ema20 &&
    snapshot.ema20 >
    snapshot.ema50 &&
    snapshot.ema50 >
    snapshot.ema200
) {

    return "FULL BULLISH ALIGNMENT";

}


if (
    snapshot.price <
    snapshot.ema20 &&
    snapshot.ema20 <
    snapshot.ema50 &&
    snapshot.ema50 <
    snapshot.ema200
) {

    return "FULL BEARISH ALIGNMENT";

}


if (
    snapshot.price >
    snapshot.ema20
) {

    return "ABOVE EMA20";

}


if (
    snapshot.price <
    snapshot.ema20
) {

    return "BELOW EMA20";

}


return "MIXED";
```

}

/* =========================================================
VWAP POSITION
========================================================= */

function getVWAPPosition(
snapshot
) {

```
if (
    !snapshot
) {

    return "WAITING";

}


const difference =
    (
        snapshot.price -
        snapshot.vwap
    ) /
    snapshot.vwap *
    100;


if (
    difference > 0.15
) {

    return "ABOVE VWAP";

}


if (
    difference < -0.15
) {

    return "BELOW VWAP";

}


return "AT VWAP";
```

}

/* =========================================================
MARKET PARTICIPATION
========================================================= */

function getParticipationState(
volume
) {

```
if (
    volume === "EXTREME"
) {

    return "EXTREME ACTIVITY";

}


if (
    volume === "HIGH"
) {

    return "HIGH PARTICIPATION";

}


if (
    volume === "LOW"
) {

    return "LOW PARTICIPATION";

}


if (
    volume === "NORMAL"
) {

    return "NORMAL";

}


return "COLLECTING";
```

}

/* =========================================================
SIGNAL CONFIRMATION
========================================================= */

function confirmSignal(
result,
snapshot
) {

```
if (
    !result ||
    !snapshot
) {

    return {

        confirmed: false,

        reason:
            "Insufficient market data"

    };

}


let confirmations = 0;

let contradictions = 0;


/*
   LONG confirmation.
*/

if (
    result.signal === "LONG"
) {

    if (
        snapshot.price >
        snapshot.ema20
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.ema20 >
        snapshot.ema50
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.rsi > 50 &&
        snapshot.rsi < 75
    ) {

        confirmations++;

    }


    if (
        snapshot.price >
        snapshot.vwap
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.trend ===
        "BULLISH"
    ) {

        confirmations++;

    }

}


/*
   SHORT confirmation.
*/

if (
    result.signal === "SHORT"
) {

    if (
        snapshot.price <
        snapshot.ema20
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.ema20 <
        snapshot.ema50
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.rsi < 50 &&
        snapshot.rsi > 25
    ) {

        confirmations++;

    }


    if (
        snapshot.price <
        snapshot.vwap
    ) {

        confirmations++;

    }
    else {

        contradictions++;

    }


    if (
        snapshot.trend ===
        "BEARISH"
    ) {

        confirmations++;

    }

}


/*
   WAIT does not require
   directional confirmation.
*/

if (
    result.signal === "WAIT"
) {

    return {

        confirmed: true,

        confirmations: 0,

        contradictions: 0,

        reason:
            "No strong directional setup"

    };

}


const confirmed =
    confirmations >= 3 &&
    contradictions <= 2;


return {

    confirmed,

    confirmations,

    contradictions,

    reason:
        confirmed
            ? "Multiple indicators confirmed"
            : "Indicators are conflicting"

};
```

}

/* =========================================================
STABLE SIGNAL FILTER
========================================================= */

function stabilizeSignal(
signal
) {

```
/*
   Prevents the UI from changing LONG/SHORT
   on every tiny market fluctuation.
*/

if (
    signal ===
    previousMonitorSignal
) {

    signalStableCount++;

}
else {

    signalStableCount = 1;

    previousMonitorSignal =
        signal;

}


/*
   A directional signal must appear
   consistently before being considered stable.
*/

if (
    signal === "LONG" ||
    signal === "SHORT"
) {

    if (
        signalStableCount >= 2
    ) {

        lastMonitorSignal =
            signal;

    }

}
else {

    lastMonitorSignal =
        "WAIT";

}


return lastMonitorSignal;
```

}

/* =========================================================
LIVE CONFIRMATION ENGINE
========================================================= */

function runLiveConfirmation() {

```
if (
    monitorBusy ||
    !autoMonitorEnabled ||
    scanning
) {

    return;

}


if (
    !historyLoaded ||
    closes.length < 200
) {

    return;

}


monitorBusy = true;


try {

    const snapshot =
        getMarketSnapshot();


    if (
        !validateMarketSnapshot(
            snapshot
        )
    ) {

        return;

    }


    const result =
        generateSignal();


    const confirmation =
        confirmSignal(
            result,
            snapshot
        );


    /*
       If a directional signal has
       contradictions, downgrade it
       to WAIT for monitoring purposes.
    */

    let liveSignal =
        result.signal;


    if (
        result.signal !== "WAIT" &&
        !confirmation.confirmed
    ) {

        liveSignal =
            "WAIT";

    }


    const stableSignal =
        stabilizeSignal(
            liveSignal
        );


    lastMonitorScore =
        result.score;


    /*
       Do not overwrite a manually completed
       scanner result every few seconds.

       Only update the status layer.
    */

    updateLiveStatus(
        snapshot,
        result,
        confirmation,
        stableSignal
    );

}
catch (error) {

    console.warn(
        "Live confirmation error:",
        error
    );

}
finally {

    monitorBusy = false;

}
```

}

/* =========================================================
LIVE STATUS DISPLAY
========================================================= */

function updateLiveStatus(
snapshot,
result,
confirmation,
stableSignal
) {

```
/*
   Keep engine status informative.
*/

if (
    engineStatus &&
    !scanning
) {

    if (
        stableSignal === "LONG"
    ) {

        engineStatus.textContent =
            "Live Monitor • Bullish Setup Confirmed";

    }


    else if (
        stableSignal === "SHORT"
    ) {

        engineStatus.textContent =
            "Live Monitor • Bearish Setup Confirmed";

    }


    else {

        engineStatus.textContent =
            "Live Monitor • Waiting for Confirmation";

    }

}


/*
   Scanner status shows live score
   without replacing the final signal card.
*/

if (
    scanStatus &&
    !scanning
) {

    scanStatus.textContent =
        "Live Score: " +
        result.score +
        " • " +
        detectMomentumState(snapshot);

}
```

}

/* =========================================================
LIVE MARKET WATCH
========================================================= */

function startLiveMonitor() {

```
setInterval(
    () => {

        runLiveConfirmation();

    },
    7000
);
```

}

/* =========================================================
PRICE CHANGE CALCULATION
========================================================= */

function updatePriceChange() {

```
if (
    closes.length < 2 ||
    !priceChange
) {

    return;

}


const previous =
    closes[
        closes.length - 2
    ];


const current =
    market.price;


if (
    !Number.isFinite(previous) ||
    previous <= 0
) {

    return;

}


const change =
    (
        current -
        previous
    ) /
    previous *
    100;


market.change =
    change;


priceChange.textContent =
    (
        change >= 0
            ? "+"
            : ""
    ) +
    change.toFixed(2) +
    "%";


if (
    change > 0
) {

    priceChange.style.color =
        "#00ff88";

}
else if (
    change < 0
) {

    priceChange.style.color =
        "#ff4d6d";

}
else {

    priceChange.style.color =
        "#ffd166";

}
```

}

/* =========================================================
LIVE PRICE CLOCK
========================================================= */

function updateLiveClock() {

```
if (
    !priceTime ||
    !historyLoaded
) {

    return;

}


priceTime.textContent =
    "Live • " +
    new Date().toLocaleTimeString();
```

}

/* =========================================================
PRICE UI LOOP
========================================================= */

setInterval(
() => {

```
    if (
        historyLoaded &&
        Number.isFinite(
            market.price
        )
    ) {

        updatePriceChange();

        updateLiveClock();

    }

},
1000
```

);

/* =========================================================
START LIVE MONITOR
========================================================= */

startLiveMonitor();

/* =========================================================
ENGINE START MESSAGE
========================================================= */

setTimeout(
() => {

```
    if (
        historyLoaded
    ) {

        if (
            engineStatus
        ) {

            engineStatus.textContent =
                "Engine Ready • Live Market Monitoring";

        }

    }

},
3000
```

);



   /* =========================================================
BTC QUANTUM SCANNER PRO
JAVASCRIPT PART 6
ADVANCED MARKET STRUCTURE + LIQUIDITY ENGINE
========================================================= */

/* =========================================================
STRUCTURE SETTINGS
========================================================= */

const STRUCTURE_LOOKBACK = 30;

const LIQUIDITY_LOOKBACK = 50;

const SWING_CONFIRMATION = 2;

/* =========================================================
SAFE NUMBER HELPER
========================================================= */

function safeNumber(
value,
fallback = 0
) {

```
return Number.isFinite(
    Number(value)
)
    ? Number(value)
    : fallback;
```

}

/* =========================================================
GET RECENT CANDLES
========================================================= */

function getRecentCandles(
count = 50
) {

```
if (
    !Array.isArray(candles) ||
    candles.length === 0
) {

    return [];

}


return candles.slice(
    -count
);
```

}

/* =========================================================
SWING HIGH DETECTION
========================================================= */

function findSwingHighs(
data = candles
) {

```
const swings = [];


if (
    !data ||
    data.length <
    SWING_CONFIRMATION * 2 + 1
) {

    return swings;

}


for (
    let i = SWING_CONFIRMATION;
    i <
    data.length - SWING_CONFIRMATION;
    i++
) {

    const current =
        safeNumber(
            data[i].high
        );


    let isSwing =
        true;


    for (
        let j = 1;
        j <= SWING_CONFIRMATION;
        j++
    ) {

        if (
            current <=
            safeNumber(
                data[i - j].high
            )
        ) {

            isSwing =
                false;

            break;

        }


        if (
            current <=
            safeNumber(
                data[i + j].high
            )
        ) {

            isSwing =
                false;

            break;

        }

    }


    if (
        isSwing
    ) {

        swings.push({

            index: i,

            price: current,

            time:
                data[i].time

        });

    }

}


return swings;
```

}

/* =========================================================
SWING LOW DETECTION
========================================================= */

function findSwingLows(
data = candles
) {

```
const swings = [];


if (
    !data ||
    data.length <
    SWING_CONFIRMATION * 2 + 1
) {

    return swings;

}


for (
    let i = SWING_CONFIRMATION;
    i <
    data.length - SWING_CONFIRMATION;
    i++
) {

    const current =
        safeNumber(
            data[i].low
        );


    let isSwing =
        true;


    for (
        let j = 1;
        j <= SWING_CONFIRMATION;
        j++
    ) {

        if (
            current >=
            safeNumber(
                data[i - j].low
            )
        ) {

            isSwing =
                false;

            break;

        }


        if (
            current >=
            safeNumber(
                data[i + j].low
            )
        ) {

            isSwing =
                false;

            break;

        }

    }


    if (
        isSwing
    ) {

        swings.push({

            index: i,

            price: current,

            time:
                data[i].time

        });

    }

}


return swings;
```

}

/* =========================================================
MARKET STRUCTURE
========================================================= */

function detectMarketStructure() {

```
const recent =
    getRecentCandles(
        STRUCTURE_LOOKBACK
    );


if (
    recent.length < 10
) {

    return "WAITING";

}


const swingHighs =
    findSwingHighs(
        recent
    );


const swingLows =
    findSwingLows(
        recent
    );


if (
    swingHighs.length < 2 ||
    swingLows.length < 2
) {

    return "WAITING";

}


const lastHigh =
    swingHighs[
        swingHighs.length - 1
    ];


const previousHigh =
    swingHighs[
        swingHighs.length - 2
    ];


const lastLow =
    swingLows[
        swingLows.length - 1
    ];


const previousLow =
    swingLows[
        swingLows.length - 2
    ];


const higherHigh =
    lastHigh.price >
    previousHigh.price;


const higherLow =
    lastLow.price >
    previousLow.price;


const lowerHigh =
    lastHigh.price <
    previousHigh.price;


const lowerLow =
    lastLow.price <
    previousLow.price;


if (
    higherHigh &&
    higherLow
) {

    return "HH + HL";

}


if (
    lowerHigh &&
    lowerLow
) {

    return "LH + LL";

}


if (
    higherHigh &&
    !lowerLow
) {

    return "BULLISH TRANSITION";

}


if (
    lowerLow &&
    !higherHigh
) {

    return "BEARISH TRANSITION";

}


return "RANGE";
```

}

/* =========================================================
PRECISE MARKET STRUCTURE LEVELS
========================================================= */

function getStructureLevels() {

```
const recent =
    getRecentCandles(
        STRUCTURE_LOOKBACK
    );


const swingHighs =
    findSwingHighs(
        recent
    );


const swingLows =
    findSwingLows(
        recent
    );


const resistance =
    swingHighs.length
        ? swingHighs[
            swingHighs.length - 1
        ].price
        : Math.max(
            ...recent.map(
                candle =>
                    safeNumber(
                        candle.high
                    )
            )
        );


const support =
    swingLows.length
        ? swingLows[
            swingLows.length - 1
        ].price
        : Math.min(
            ...recent.map(
                candle =>
                    safeNumber(
                        candle.low
                    )
            )
        );


return {

    support,

    resistance

};
```

}

/* =========================================================
MARKET LOCATION
========================================================= */

function detectMarketLocation() {

```
if (
    !Number.isFinite(
        market.price
    )
) {

    return "WAITING";

}


const levels =
    getStructureLevels();


const support =
    levels.support;


const resistance =
    levels.resistance;


const range =
    resistance -
    support;


if (
    range <= 0
) {

    return "WAITING";

}


const supportDistance =
    Math.abs(
        market.price -
        support
    );


const resistanceDistance =
    Math.abs(
        resistance -
        market.price
    );


/*
   12% of the local range is considered
   close to a major level.
*/

const threshold =
    range * 0.12;


if (
    supportDistance <=
    threshold
) {

    return "NEAR SUPPORT";

}


if (
    resistanceDistance <=
    threshold
) {

    return "NEAR RESISTANCE";

}


const position =
    (
        market.price -
        support
    ) /
    range;


if (
    position >= 0.40 &&
    position <= 0.60
) {

    return "MID RANGE";

}


if (
    position < 0.40
) {

    return "LOWER RANGE";

}


return "UPPER RANGE";
```

}

/* =========================================================
LIQUIDITY SWEEP DETECTION
========================================================= */

function detectLiquiditySweep() {

```
const recent =
    getRecentCandles(
        LIQUIDITY_LOOKBACK
    );


if (
    recent.length < 10
) {

    return "NONE";

}


const current =
    recent[
        recent.length - 1
    ];


const previous =
    recent.slice(
        0,
        -1
    );


const previousHigh =
    Math.max(
        ...previous.map(
            candle =>
                safeNumber(
                    candle.high
                )
        )
    );


const previousLow =
    Math.min(
        ...previous.map(
            candle =>
                safeNumber(
                    candle.low
                )
        )
    );


const currentHigh =
    safeNumber(
        current.high
    );


const currentLow =
    safeNumber(
        current.low
    );


const currentClose =
    safeNumber(
        current.close
    );


/*
   Price takes previous high,
   but closes back below it.
   This is a possible buy-side sweep.
*/

if (
    currentHigh >
    previousHigh &&
    currentClose <
    previousHigh
) {

    return "BUY-SIDE LIQUIDITY SWEPT";

}


/*
   Price takes previous low,
   but closes back above it.
   This is a possible sell-side sweep.
*/

if (
    currentLow <
    previousLow &&
    currentClose >
    previousLow
) {

    return "SELL-SIDE LIQUIDITY SWEPT";

}


return "NONE";
```

}

/* =========================================================
LIQUIDITY ZONE
========================================================= */

function calculateLiquidityZone() {

```
const levels =
    getStructureLevels();


const support =
    safeNumber(
        levels.support
    );


const resistance =
    safeNumber(
        levels.resistance
    );


if (
    !support ||
    !resistance
) {

    return {

        side:
            "WAITING",

        price:
            null

    };

}


const distanceToSupport =
    Math.abs(
        market.price -
        support
    );


const distanceToResistance =
    Math.abs(
        resistance -
        market.price
    );


if (
    distanceToSupport <
    distanceToResistance
) {

    return {

        side:
            "SELL-SIDE",

        price:
            support

    };

}


return {

    side:
        "BUY-SIDE",

    price:
        resistance

};
```

}

/* =========================================================
BREAK OF STRUCTURE
========================================================= */

function detectBOS() {

```
const levels =
    getStructureLevels();


if (
    !levels ||
    !Number.isFinite(
        market.price
    )
) {

    return "NO BOS";

}


/*
   Use a small buffer to avoid calling
   every tiny tick a BOS.
*/

const atr =
    calculateATR(14);


const buffer =
    Number.isFinite(atr)
        ? atr * 0.10
        : market.price *
          0.0005;


if (
    market.price >
    levels.resistance +
    buffer
) {

    return "BULLISH BOS";

}


if (
    market.price <
    levels.support -
    buffer
) {

    return "BEARISH BOS";

}


return "NO BOS";
```

}

/* =========================================================
CHOCH
========================================================= */

function detectCHOCH() {

```
const recent =
    getRecentCandles(
        60
    );


if (
    recent.length < 30
) {

    return "WAITING";

}


const structure =
    detectMarketStructure();


const current =
    safeNumber(
        market.price
    );


const midpointIndex =
    Math.floor(
        recent.length / 2
    );


const oldPrice =
    safeNumber(
        recent[
            midpointIndex
        ].close
    );


if (
    structure ===
    "BULLISH TRANSITION" &&
    current > oldPrice
) {

    return "BULLISH CHOCH";

}


if (
    structure ===
    "BEARISH TRANSITION" &&
    current < oldPrice
) {

    return "BEARISH CHOCH";

}


return "NO CHOCH";
```

}

/* =========================================================
FAIR VALUE GAP
========================================================= */

function detectFVG() {

```
if (
    candles.length < 3
) {

    return {

        type:
            "NONE",

        high:
            null,

        low:
            null

    };

}


const c1 =
    candles[
        candles.length - 3
    ];


const c2 =
    candles[
        candles.length - 2
    ];


const c3 =
    candles[
        candles.length - 1
    ];


/*
   Bullish FVG:
   candle 1 high remains below
   candle 3 low.
*/

if (
    c1.high <
    c3.low
) {

    return {

        type:
            "BULLISH FVG",

        low:
            c1.high,

        high:
            c3.low,

        midpoint:
            (
                c1.high +
                c3.low
            ) / 2

    };

}


/*
   Bearish FVG.
*/

if (
    c1.low >
    c3.high
) {

    return {

        type:
            "BEARISH FVG",

        low:
            c3.high,

        high:
            c1.low,

        midpoint:
            (
                c3.high +
                c1.low
            ) / 2

    };

}


return {

    type:
        "NONE",

    high:
        null,

    low:
        null

};
```

}

/* =========================================================
ORDER BLOCK
========================================================= */

function detectOrderBlock() {

```
if (
    candles.length < 5
) {

    return {

        type:
            "NONE",

        price:
            null

    };

}


const last =
    candles[
        candles.length - 1
    ];


const previous =
    candles[
        candles.length - 2
    ];


const body =
    Math.abs(
        last.close -
        last.open
    );


const range =
    last.high -
    last.low;


if (
    range <= 0
) {

    return {

        type:
            "NONE",

        price:
            null

    };

}


/*
   Strong bullish displacement.
*/

if (
    last.close >
    previous.high &&
    body / range >
    0.55
) {

    return {

        type:
            "BULLISH OB",

        price:
            previous.open

    };

}


/*
   Strong bearish displacement.
*/

if (
    last.close <
    previous.low &&
    body / range >
    0.55
) {

    return {

        type:
            "BEARISH OB",

        price:
            previous.open

    };

}


return {

    type:
        "NONE",

    price:
        null

};
```

}

/* =========================================================
CANDLE MOMENTUM
========================================================= */

function detectCandleMomentum() {

```
if (
    candles.length < 5
) {

    return "WAITING";

}


const recent =
    candles.slice(
        -5
    );


let bullish = 0;

let bearish = 0;


recent.forEach(
    candle => {

        if (
            candle.close >
            candle.open
        ) {

            bullish++;

        }


        else if (
            candle.close <
            candle.open
        ) {

            bearish++;

        }

    }
);


if (
    bullish >= 4
) {

    return "STRONG BULLISH";

}


if (
    bearish >= 4
) {

    return "STRONG BEARISH";

}


if (
    bullish > bearish
) {

    return "BULLISH";

}


if (
    bearish > bullish
) {

    return "BEARISH";

}


return "BALANCED";
```

}

/* =========================================================
ATR PERCENT
========================================================= */

function calculateATRPercent() {

```
const atr =
    calculateATR(14);


const price =
    safeNumber(
        market.price
    );


if (
    !Number.isFinite(atr) ||
    !price ||
    price <= 0
) {

    return 0;

}


return (
    atr /
    price
) *
100;
```

}

/* =========================================================
IMPROVED RSI
========================================================= */

function calculateRSI(
period = 14
) {

```
if (
    closes.length <= period
) {

    return 50;

}


/*
   Wilder-style smoothing.

   This avoids the previous problem where RSI
   could jump unnaturally because only the last
   14 candles were averaged directly.
*/

let gains = 0;

let losses = 0;


for (
    let i = 1;
    i <= period;
    i++
) {

    const change =
        closes[i] -
        closes[i - 1];


    if (
        change > 0
    ) {

        gains += change;

    }
    else {

        losses +=
            Math.abs(
                change
            );

    }

}


let avgGain =
    gains / period;


let avgLoss =
    losses / period;


for (
    let i = period + 1;
    i < closes.length;
    i++
) {

    const change =
        closes[i] -
        closes[i - 1];


    const gain =
        change > 0
            ? change
            : 0;


    const loss =
        change < 0
            ? Math.abs(change)
            : 0;


    avgGain =
        (
            avgGain *
            (period - 1) +
            gain
        ) /
        period;


    avgLoss =
        (
            avgLoss *
            (period - 1) +
            loss
        ) /
        period;

}


/*
   If there are no losses, RSI can legitimately
   approach 100 during a sustained one-direction
   move. We don't artificially force it to 70.
*/

if (
    avgLoss === 0
) {

    if (
        avgGain === 0
    ) {

        return 50;

    }


    return 100;

}


const rs =
    avgGain /
    avgLoss;


const rsi =
    100 -
    (
        100 /
        (
            1 + rs
        )
    );


return Math.max(
    0,
    Math.min(
        100,
        rsi
    )
);
```

}

/* =========================================================
FINAL MARKET CONDITION
========================================================= */

function detectMarketCondition() {

```
const atrPercent =
    calculateATRPercent();


const trend =
    detectTrend();


const structure =
    detectMarketStructure();


if (
    atrPercent >= 0.60
) {

    return "EXTREME VOLATILITY";

}


if (
    atrPercent >= 0.30
) {

    return "HIGH VOLATILITY";

}


if (
    trend ===
    "SIDEWAYS" ||
    structure ===
    "RANGE"
) {

    return "RANGE MARKET";

}


if (
    trend ===
    "BULLISH" ||
    trend ===
    "BEARISH"
) {

    return "TRENDING MARKET";

}


return "TRANSITION";
```

}

/* =========================================================
ADVANCED INTELLIGENCE UPDATE
========================================================= */

function updateAdvancedIntelligence() {

```
if (
    !historyLoaded ||
    closes.length < 200
) {

    return;

}


const structure =
    detectMarketStructure();


const location =
    detectMarketLocation();


const sweep =
    detectLiquiditySweep();


const momentum =
    detectCandleMomentum();


const fvg =
    detectFVG();


const orderBlock =
    detectOrderBlock();


console.log(
    "MARKET STRUCTURE:",
    structure
);


console.log(
    "MARKET LOCATION:",
    location
);


console.log(
    "LIQUIDITY SWEEP:",
    sweep
);


console.log(
    "CANDLE MOMENTUM:",
    momentum
);


console.log(
    "FVG:",
    fvg.type
);


console.log(
    "ORDER BLOCK:",
    orderBlock.type
);
```

}

/* =========================================================
ADVANCED INTELLIGENCE LOOP
========================================================= */

setInterval(
() => {

```
    if (
        historyLoaded &&
        closes.length >= 200
    ) {

        updateAdvancedIntelligence();

    }

},
6000
```

);

/* =========================================================
ENGINE DIAGNOSTIC
========================================================= */

function runEngineDiagnostic() {

```
const checks = {

    history:
        typeof historyLoaded !==
        "undefined",

    candles:
        candles.length >= 200,

    price:
        Number.isFinite(
            market.price
        ),

    rsi:
        Number.isFinite(
            calculateRSI(14)
        ),

    ema20:
        Number.isFinite(
            calculateEMA(20)
        ),

    ema50:
        Number.isFinite(
            calculateEMA(50)
        ),

    ema200:
        Number.isFinite(
            calculateEMA(200)
        ),

    vwap:
        Number.isFinite(
            calculateVWAP()
        ),

    atr:
        Number.isFinite(
            calculateATR(14)
        ),

    structure:
        typeof detectMarketStructure ===
        "function",

    liquidity:
        typeof detectLiquiditySweep ===
        "function"

};


console.table(
    checks
);


return Object.values(
    checks
).every(
    Boolean
);
```

}

/* =========================================================
FINAL DIAGNOSTIC MESSAGE
========================================================= */

setTimeout(
() => {

```
    if (
        historyLoaded &&
        closes.length >= 200
    ) {

        const healthy =
            runEngineDiagnostic();


        if (
            healthy
        ) {

            console.log(
                "BTC QUANTUM SCANNER: ENGINE HEALTHY"
            );

        }
        else {

            c
