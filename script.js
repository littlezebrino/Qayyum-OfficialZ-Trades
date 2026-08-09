/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   REAL MARKET DATA ENGINE
   ================================================== */


/* ===============================
   DOM ELEMENTS
   =============================== */

const btcPrice =
    document.getElementById("btcPrice");

const priceChange =
    document.getElementById("priceChange");

const marketState =
    document.getElementById("marketState");

const priceTime =
    document.getElementById("priceTime");


/* ===============================
   MARKET STORAGE
   =============================== */

let candles = [];

let closes = [];

let highs = [];

let lows = [];

let volumes = [];


let market = {

    price: 0,

    volume: 0,

    change: 0,

    changePercent: 0

};


/* ===============================
   SETTINGS
   =============================== */

const SYMBOL = "BTCUSDT";

const INTERVAL = "1m";

const HISTORY_LIMIT = 500;

const MAX_CHART_POINTS = 120;


/* ===============================
   CONNECTION STATE
   =============================== */

let socket = null;

let reconnectTimer = null;

let chart = null;

let historyLoaded = false;


/* ===============================
   FORMAT PRICE
   =============================== */

function formatPrice(price) {

    if (!Number.isFinite(price)) {
        return "$0.00";
    }

    return "$" + price.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* ===============================
   FORMAT TIME
   =============================== */

function formatTime(time) {

    if (!time) {
        return "--";
    }

    return new Date(time).toLocaleTimeString();

}


/* ===============================
   UPDATE PRICE UI
   =============================== */

function updatePriceUI() {

    if (!Number.isFinite(market.price)) {
        return;
    }


    btcPrice.textContent =
        formatPrice(market.price);


    const change =
        Number.isFinite(market.changePercent)
            ? market.changePercent
            : 0;


    priceChange.textContent =
        (change >= 0 ? "+" : "") +
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


    priceTime.textContent =
        "Live • " +
        formatTime(Date.now());

}


/* ===============================
   LOAD HISTORICAL DATA
   =============================== */

async function loadHistory() {

    try {

        marketState.textContent =
            "LOADING DATA";


        const url =
            `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${HISTORY_LIMIT}`;


        const response =
            await fetch(url, {
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data) || data.length === 0) {

            throw new Error(
                "No candle data received"
            );

        }


        /* Clear old data */

        candles = [];

        closes = [];

        highs = [];

        lows = [];

        volumes = [];


        /* Build candles */

        data.forEach(item => {

            const candle = {

                time: Number(item[0]),

                open: Number(item[1]),

                high: Number(item[2]),

                low: Number(item[3]),

                close: Number(item[4]),

                volume: Number(item[5]),

                closeTime: Number(item[6])

            };


            if (

                Number.isFinite(candle.open) &&

                Number.isFinite(candle.high) &&

                Number.isFinite(candle.low) &&

                Number.isFinite(candle.close) &&

                Number.isFinite(candle.volume)

            ) {

                candles.push(candle);

                closes.push(candle.close);

                highs.push(candle.high);

                lows.push(candle.low);

                volumes.push(candle.volume);

            }

        });


        if (closes.length < 50) {

            throw new Error(
                "Insufficient candle data"
            );

        }


        market.price =
            closes[closes.length - 1];


        market.volume =
            volumes[volumes.length - 1];


        historyLoaded = true;


        createChart();


        updatePriceUI();


        marketState.textContent =
            "DATA READY";


        priceTime.textContent =
            "Historical data loaded • Live connection starting";


        console.log(
            "BTC historical candles loaded:",
            candles.length
        );


    }

    catch (error) {

        console.error(
            "History error:",
            error
        );


        historyLoaded = false;


        marketState.textContent =
            "DATA ERROR";


        priceTime.textContent =
            "Unable to load Binance market data";

    }

}


/* ===============================
   LOAD 24H MARKET CHANGE
   =============================== */

async function load24hTicker() {

    try {

        const url =
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${SYMBOL}`;


        const response =
            await fetch(url, {
                cache: "no-store"
            });


        if (!response.ok) {
            throw new Error(
                `Ticker HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        const lastPrice =
            Number(data.lastPrice);


        const priceChangeValue =
            Number(data.priceChange);


        const percent =
            Number(data.priceChangePercent);


        if (Number.isFinite(lastPrice)) {

            market.price =
                lastPrice;

        }


        if (Number.isFinite(priceChangeValue)) {

            market.change =
                priceChangeValue;

        }


        if (Number.isFinite(percent)) {

            market.changePercent =
                percent;

        }


        updatePriceUI();


    }

    catch (error) {

        console.warn(
            "24h ticker unavailable:",
            error
        );

    }

}


/* ===============================
   BINANCE WEBSOCKET
   =============================== */

function connectSocket() {

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


    marketState.textContent =
        "CONNECTING";


    const stream =
        `${SYMBOL.toLowerCase()}@kline_${INTERVAL}`;


    socket = new WebSocket(
        `wss://stream.binance.com:9443/ws/${stream}`
    );


    socket.onopen = function () {

        marketState.textContent =
            "LIVE";


        console.log(
            "Binance WebSocket connected"
        );

    };


    socket.onmessage = function (event) {

        try {

            const message =
                JSON.parse(event.data);


            if (!message.k) {
                return;
            }


            updateLiveCandle(
                message.k
            );

        }

        catch (error) {

            console.error(
                "WebSocket message error:",
                error
            );

        }

    };


    socket.onerror = function (error) {

        console.warn(
            "Binance WebSocket error:",
            error
        );


        marketState.textContent =
            "ERROR";

    };


    socket.onclose = function () {

        marketState.textContent =
            "RECONNECTING";


        console.warn(
            "Binance WebSocket disconnected"
        );


        scheduleReconnect();

    };

}


/* ===============================
   RECONNECT
   =============================== */

function scheduleReconnect() {

    if (reconnectTimer) {
        return;
    }


    reconnectTimer =
        setTimeout(() => {

            reconnectTimer = null;

            connectSocket();

        }, 3000);

}


/* ===============================
   UPDATE LIVE CANDLE
   =============================== */

function updateLiveCandle(data) {

    const openTime =
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

        !Number.isFinite(openTime) ||

        !Number.isFinite(close) ||

        !Number.isFinite(high) ||

        !Number.isFinite(low) ||

        !Number.isFinite(volume)

    ) {

        return;

    }


    market.price =
        close;


    market.volume =
        volume;


    /* ===============================
       CURRENT CANDLE
       =============================== */

    const last =
        candles[candles.length - 1];


    /*
       If WebSocket candle belongs to
       current historical candle,
       update it instead of adding
       duplicate data.
    */

    if (
        last &&
        last.time === openTime
    ) {

        last.open =
            open;

        last.high =
            high;

        last.low =
            low;

        last.close =
            close;

        last.volume =
            volume;


        closes[closes.length - 1] =
            close;

        highs[highs.length - 1] =
            high;

        lows[lows.length - 1] =
            low;

        volumes[volumes.length - 1] =
            volume;

    }


    /*
       New 1-minute candle
    */

    else if (
        !last ||
        openTime > last.time
    ) {

        const newCandle = {

            time: openTime,

            open: open,

            high: high,

            low: low,

            close: close,

            volume: volume,

            closeTime:
                Number(data.T)

        };


        candles.push(
            newCandle
        );

        closes.push(
            close
        );

        highs.push(
            high
        );

        lows.push(
            low
        );

        volumes.push(
            volume
        );


        /*
           Keep memory controlled.
           We don't need unlimited candles.
        */

        if (candles.length > 600) {

            candles.shift();

            closes.shift();

            highs.shift();

            lows.shift();

            volumes.shift();

        }

    }


    updatePriceUI();


    updateChart(
        close
    );


    /*
       When candle is closed,
       refresh 24h ticker.
    */

    if (data.x === true) {

        load24hTicker();

    }

}


/* ===============================
   CHART
   =============================== */

function createChart() {

    const canvas =
        document.getElementById(
            "priceChart"
        );


    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d");


    /*
       Destroy old chart if
       function is called again.
    */

    if (chart) {

        chart.destroy();

        chart = null;

    }


    /*
       Only show latest chart points.
       Indicators still use full
       candle storage.
    */

    const chartData =
        closes.slice(-MAX_CHART_POINTS);


    chart =
        new Chart(ctx, {

            type: "line",


            data: {

                labels:
                    chartData.map(
                        () => ""
                    ),


                datasets: [{

                    label: "BTC",

                    data: chartData,

                    borderColor:
                        "#00f5ff",

                    backgroundColor:
                        "rgba(0,245,255,.08)",

                    borderWidth: 2,

                    tension: .35,

                    pointRadius: 0,

                    pointHoverRadius: 3,

                    fill: true

                }]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,


                animation: false,


                plugins: {

                    legend: {

                        display: false

                    },

                    tooltip: {

                        enabled: false

                    }

                },


                scales: {

                    x: {

                        display: false

                    },

                    y: {

                        display: false

                    }

                }


            }

        });

}


/* ===============================
   UPDATE CHART
   =============================== */

function updateChart(price) {

    if (!chart) {
        return;
    }


    const dataset =
        chart.data.datasets[0];


    /*
       The last chart point represents
       the currently forming candle.
       Update it instead of pushing
       every WebSocket tick.
    */

    if (dataset.data.length > 0) {

        dataset.data[
            dataset.data.length - 1
        ] = price;

    }

    else {

        dataset.data.push(
            price
        );

        chart.data.labels.push("");

    }


    /*
       If a new candle appeared,
       sync chart length with
       latest candles.
    */

    const desiredLength =
        Math.min(
            closes.length,
            MAX_CHART_POINTS
        );


    const recent =
        closes.slice(-desiredLength);


    dataset.data =
        recent;


    chart.data.labels =
        recent.map(
            () => ""
        );


    chart.update("none");

}


/* ===============================
   PERIODIC TICKER REFRESH
   =============================== */

setInterval(
    load24hTicker,
    30000
);


/* ===============================
   START MARKET ENGINE
   =============================== */

(async function startMarketEngine() {

    await loadHistory();

    await load24hTicker();

    connectSocket();

})();




/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   TECHNICAL INDICATORS ENGINE
   ================================================== */


/* ===============================
   INDICATOR ELEMENTS
   =============================== */

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


/* ===============================
   SAFE NUMBER
   =============================== */

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


/* ===============================
   SMA
   =============================== */

function calculateSMA(values, period) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return null;

    }


    const slice =
        values.slice(-period);


    const sum =
        slice.reduce(
            (total, value) =>
                total + safeNumber(value),
            0
        );


    return sum / period;

}


/* ===============================
   EMA
   =============================== */

function calculateEMA(period = 20) {

    if (
        !Array.isArray(closes) ||
        closes.length < period
    ) {

        return null;

    }


    /*
       Start EMA from SMA instead of
       incorrectly starting from closes[0].
    */

    let ema =
        calculateSMA(
            closes.slice(
                0,
                period
            ),
            period
        );


    if (ema === null) {
        return null;
    }


    const multiplier =
        2 / (period + 1);


    for (
        let i = period;
        i < closes.length;
        i++
    ) {

        const price =
            safeNumber(
                closes[i]
            );


        ema =
            (
                price - ema
            ) *
            multiplier +
            ema;

    }


    return ema;

}


/* ===============================
   RSI - WILDER METHOD
   =============================== */

function calculateRSI(period = 14) {

    if (
        !Array.isArray(closes) ||
        closes.length <= period
    ) {

        return 50;

    }


    /*
       We need enough candles to
       establish a stable RSI.
    */

    const prices =
        closes.map(
            value => safeNumber(value)
        );


    let gains = 0;

    let losses = 0;


    /*
       Initial average gain/loss
    */

    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const change =
            prices[i] -
            prices[i - 1];


        if (change > 0) {

            gains += change;

        }

        else if (change < 0) {

            losses += Math.abs(
                change
            );

        }

    }


    let avgGain =
        gains / period;


    let avgLoss =
        losses / period;


    /*
       Wilder smoothing
    */

    for (
        let i = period + 1;
        i < prices.length;
        i++
    ) {

        const change =
            prices[i] -
            prices[i - 1];


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
                (avgGain * (period - 1))
                + gain
            ) / period;


        avgLoss =
            (
                (avgLoss * (period - 1))
                + loss
            ) / period;

    }


    /*
       No losses means extremely
       strong upward movement.
       Return 100 only when the
       smoothed calculation actually
       reaches that condition.
    */

    if (
        avgLoss === 0 &&
        avgGain === 0
    ) {

        return 50;

    }


    if (avgLoss === 0) {

        return 100;

    }


    const rs =
        avgGain / avgLoss;


    const rsi =
        100 -
        (
            100 /
            (1 + rs)
        );


    return Math.min(
        100,
        Math.max(
            0,
            rsi
        )
    );

}


/* ===============================
   MACD
   =============================== */

function calculateMACD() {

    const ema12 =
        calculateEMA(12);


    const ema26 =
        calculateEMA(26);


    if (
        ema12 === null ||
        ema26 === null
    ) {

        return 0;

    }


    return ema12 - ema26;

}


/* ===============================
   MACD SIGNAL
   =============================== */

function calculateMACDDetails() {

    if (closes.length < 35) {

        return {

            macd: 0,

            signal: 0,

            histogram: 0

        };

    }


    /*
       Build MACD history so that
       signal line is based on actual
       MACD values rather than just
       current MACD.
    */

    const macdValues = [];


    for (
        let i = 26;
        i < closes.length;
        i++
    ) {

        const subset =
            closes.slice(
                0,
                i + 1
            );


        const oldCloses =
            closes;


        /*
           Temporarily use the subset
           for EMA calculations.
        */

        closes =
            subset;


        const ema12 =
            calculateEMA(12);

        const ema26 =
            calculateEMA(26);


        closes =
            oldCloses;


        if (
            ema12 !== null &&
            ema26 !== null
        ) {

            macdValues.push(
                ema12 - ema26
            );

        }

    }


    const currentMACD =
        calculateMACD();


    if (
        macdValues.length < 9
    ) {

        return {

            macd: currentMACD,

            signal: 0,

            histogram: currentMACD

        };

    }


    /*
       Calculate EMA 9 of MACD values.
    */

    let signal =
        calculateArrayEMA(
            macdValues,
            9
        );


    if (signal === null) {

        signal = 0;

    }


    return {

        macd:
            currentMACD,

        signal:
            signal,

        histogram:
            currentMACD - signal

    };

}


/* ===============================
   ARRAY EMA
   =============================== */

function calculateArrayEMA(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return null;

    }


    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum +=
            safeNumber(
                values[i]
            );

    }


    let ema =
        sum / period;


    const multiplier =
        2 / (period + 1);


    for (
        let i = period;
        i < values.length;
        i++
    ) {

        ema =
            (
                values[i] - ema
            ) *
            multiplier +
            ema;

    }


    return ema;

}


/* ===============================
   VWAP
   =============================== */

function calculateVWAP() {

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {

        return 0;

    }


    let totalVolume = 0;

    let totalValue = 0;


    candles.forEach(candle => {

        const high =
            safeNumber(
                candle.high
            );


        const low =
            safeNumber(
                candle.low
            );


        const close =
            safeNumber(
                candle.close
            );


        const volume =
            safeNumber(
                candle.volume
            );


        const typicalPrice =
            (
                high +
                low +
                close
            ) / 3;


        totalValue +=
            typicalPrice *
            volume;


        totalVolume +=
            volume;

    });


    if (
        totalVolume <= 0
    ) {

        return 0;

    }


    return (
        totalValue /
        totalVolume
    );

}


/* ===============================
   ATR
   =============================== */

function calculateATR(period = 14) {

    if (
        !Array.isArray(candles) ||
        candles.length <= period
    ) {

        return 0;

    }


    const trueRanges = [];


    /*
       Calculate enough historical
       TR values for a stable ATR.
    */

    const start =
        Math.max(
            1,
            candles.length - 100
        );


    for (
        let i = start;
        i < candles.length;
        i++
    ) {

        const current =
            candles[i];


        const previous =
            candles[i - 1];


        const high =
            safeNumber(
                current.high
            );


        const low =
            safeNumber(
                current.low
            );


        const previousClose =
            safeNumber(
                previous.close
            );


        const trueRange =
            Math.max(

                high - low,

                Math.abs(
                    high -
                    previousClose
                ),

                Math.abs(
                    low -
                    previousClose
                )

            );


        trueRanges.push(
            trueRange
        );

    }


    if (
        trueRanges.length < period
    ) {

        return 0;

    }


    /*
       Wilder ATR
    */

    let atr =
        calculateSMA(
            trueRanges,
            period
        );


    if (atr === null) {

        return 0;

    }


    /*
       Smooth the available
       remaining TR values.
    */

    const initialStart =
        Math.max(
            0,
            trueRanges.length - 50
        );


    for (
        let i = initialStart;
        i < trueRanges.length;
        i++
    ) {

        atr =
            (
                (atr * (period - 1))
                +
                trueRanges[i]
            ) / period;

    }


    return atr;

}


/* ===============================
   VOLUME ANALYSIS
   =============================== */

function analyzeVolume() {

    if (
        !Array.isArray(volumes) ||
        volumes.length < 20
    ) {

        return "COLLECTING";

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            (sum, value) =>
                sum + safeNumber(value),
            0
        ) / recent.length;


    const current =
        safeNumber(
            volumes[
                volumes.length - 1
            ]
        );


    if (
        average <= 0
    ) {

        return "NORMAL";

    }


    const ratio =
        current / average;


    if (ratio >= 1.5) {

        return "HIGH";

    }


    if (ratio <= 0.7) {

        return "LOW";

    }


    return "NORMAL";

}


/* ===============================
   VOLUME RATIO
   =============================== */

function calculateVolumeRatio() {

    if (
        volumes.length < 20
    ) {

        return 1;

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            (sum, value) =>
                sum + safeNumber(value),
            0
        ) / recent.length;


    if (average <= 0) {

        return 1;

    }


    const current =
        safeNumber(
            volumes[
                volumes.length - 1
            ]
        );


    return current / average;

}


/* ===============================
   VOLATILITY
   =============================== */

function calculateVolatility() {

    if (
        closes.length < 20
    ) {

        return 0;

    }


    const recent =
        closes.slice(-20);


    const high =
        Math.max(
            ...recent
        );


    const low =
        Math.min(
            ...recent
        );


    if (
        !Number.isFinite(high) ||
        !Number.isFinite(low)
    ) {

        return 0;

    }


    return high - low;

}


/* ===============================
   VOLATILITY PERCENT
   =============================== */

function calculateVolatilityPercent() {

    const price =
        safeNumber(
            market.price
        );


    if (
        price <= 0
    ) {

        return 0;

    }


    const volatility =
        calculateVolatility();


    return (
        volatility /
        price
    ) * 100;

}


/* ===============================
   RSI CONDITION
   =============================== */

function getRSICondition(
    rsi
) {

    if (rsi >= 70) {

        return "OVERBOUGHT";

    }


    if (rsi >= 60) {

        return "BULLISH";

    }


    if (rsi <= 30) {

        return "OVERSOLD";

    }


    if (rsi <= 40) {

        return "BEARISH";

    }


    return "NEUTRAL";

}


/* ===============================
   EMA ALIGNMENT
   =============================== */

function getEMAAlignment() {

    const ema20 =
        calculateEMA(20);


    const ema50 =
        calculateEMA(50);


    const ema200 =
        calculateEMA(200);


    if (
        ema20 === null ||
        ema50 === null ||
        ema200 === null
    ) {

        return "WAITING";

    }


    if (
        ema20 > ema50 &&
        ema50 > ema200
    ) {

        return "BULLISH";

    }


    if (
        ema20 < ema50 &&
        ema50 < ema200
    ) {

        return "BEARISH";

    }


    return "MIXED";

}


/* ===============================
   VWAP POSITION
   =============================== */

function getVWAPPosition() {

    const vwap =
        calculateVWAP();


    if (
        !vwap ||
        !market.price
    ) {

        return "WAITING";

    }


    if (
        market.price > vwap
    ) {

        return "ABOVE VWAP";

    }


    if (
        market.price < vwap
    ) {

        return "BELOW VWAP";

    }


    return "AT VWAP";

}


/* ===============================
   UPDATE INDICATORS
   =============================== */

function updateIndicators() {

    if (
        closes.length < 50
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
        calculateVolatility();


    /*
       RSI
    */

    rsiBox.textContent =
        Number.isFinite(rsi)
            ? rsi.toFixed(2)
            : "--";


    /*
       EMA
    */

    ema20Box.textContent =
        ema20 !== null
            ? ema20.toFixed(2)
            : "--";


    ema50Box.textContent =
        ema50 !== null
            ? ema50.toFixed(2)
            : "--";


    ema200Box.textContent =
        ema200 !== null
            ? ema200.toFixed(2)
            : "--";


    /*
       MACD
    */

    macdBox.textContent =
        Number.isFinite(macd)
            ? macd.toFixed(2)
            : "--";


    /*
       VWAP
    */

    vwapBox.textContent =
        vwap > 0
            ? vwap.toFixed(2)
            : "--";


    /*
       ATR
    */

    atrBox.textContent =
        atr > 0
            ? atr.toFixed(2)
            : "--";


    /*
       Volume
    */

    volumeBox.textContent =
        volume;


    /*
       Volatility
    */

    volatilityBox.textContent =
        volatility > 0
            ? volatility.toFixed(2)
            : "--";

}


/* ===============================
   AUTO UPDATE
   =============================== */

setInterval(
    () => {

        if (
            closes.length >= 50
        ) {

            updateIndicators();

        }

    },
    3000
);


/* ===============================
   INITIAL INDICATOR UPDATE
   =============================== */

setTimeout(
    () => {

        updateIndicators();

    },
    1500
);





/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 3
   MARKET INTELLIGENCE ENGINE
   ================================================== */


/* ===============================
   INTELLIGENCE ELEMENTS
   =============================== */

const trendBox =
    document.getElementById("trend");

const structureBox =
    document.getElementById("structure");

const liquidityZoneBox =
    document.getElementById("liquidityZone");

const liquidityMagnetBox =
    document.getElementById("liquidityMagnet");

const marketConditionBox =
    document.getElementById("marketCondition");

const marketStrengthBox =
    document.getElementById("marketStrength");


/* ===============================
   EVIDENCE ELEMENTS
   =============================== */

const emaAlignmentBox =
    document.getElementById("emaAlignment");

const vwapPositionBox =
    document.getElementById("vwapPosition");

const rsiConditionBox =
    document.getElementById("rsiCondition");

const volumePressureBox =
    document.getElementById("volumePressure");


/* ===============================
   BASIC HELPERS
   =============================== */

function getRecentCandles(count = 50) {

    return candles.slice(
        Math.max(
            0,
            candles.length - count
        )
    );

}


/* ===============================
   SWING HIGH DETECTION
   =============================== */

function isSwingHigh(index, strength = 2) {

    if (
        index - strength < 0 ||
        index + strength >= candles.length
    ) {

        return false;

    }


    const current =
        candles[index].high;


    for (
        let i = 1;
        i <= strength;
        i++
    ) {

        if (
            current <= candles[index - i].high ||
            current <= candles[index + i].high
        ) {

            return false;

        }

    }


    return true;

}


/* ===============================
   SWING LOW DETECTION
   =============================== */

function isSwingLow(index, strength = 2) {

    if (
        index - strength < 0 ||
        index + strength >= candles.length
    ) {

        return false;

    }


    const current =
        candles[index].low;


    for (
        let i = 1;
        i <= strength;
        i++
    ) {

        if (
            current >= candles[index - i].low ||
            current >= candles[index + i].low
        ) {

            return false;

        }

    }


    return true;

}


/* ===============================
   GET SWING LEVELS
   =============================== */

function getSwingLevels() {

    const start =
        Math.max(
            2,
            candles.length - 100
        );


    const swingHighs = [];

    const swingLows = [];


    for (
        let i = start;
        i < candles.length - 2;
        i++
    ) {

        if (
            isSwingHigh(i, 2)
        ) {

            swingHighs.push({

                price:
                    candles[i].high,

                index:
                    i,

                time:
                    candles[i].time

            });

        }


        if (
            isSwingLow(i, 2)
        ) {

            swingLows.push({

                price:
                    candles[i].low,

                index:
                    i,

                time:
                    candles[i].time

            });

        }

    }


    return {

        highs: swingHighs,

        lows: swingLows

    };

}


/* ===============================
   RECENT HIGH / LOW
   =============================== */

function getRecentHighLow() {

    const recent =
        getRecentCandles(50);


    if (!recent.length) {

        return {

            high: 0,

            low: 0

        };

    }


    return {

        high:
            Math.max(
                ...recent.map(
                    candle =>
                        safeNumber(
                            candle.high
                        )
                )
            ),

        low:
            Math.min(
                ...recent.map(
                    candle =>
                        safeNumber(
                            candle.low
                        )
                )
            )

    };

}


/* ===============================
   TREND DETECTION
   =============================== */

function detectTrend() {

    if (
        closes.length < 50
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
        ema20 === null ||
        ema50 === null ||
        ema200 === null
    ) {

        return "WAITING";

    }


    const price =
        market.price;


    /*
       Strong bullish alignment
    */

    if (
        price > ema20 &&
        ema20 > ema50 &&
        ema50 > ema200
    ) {

        return "BULLISH";

    }


    /*
       Strong bearish alignment
    */

    if (
        price < ema20 &&
        ema20 < ema50 &&
        ema50 < ema200
    ) {

        return "BEARISH";

    }


    /*
       Short-term bullish
    */

    if (
        price > ema20 &&
        ema20 > ema50
    ) {

        return "BULLISH";

    }


    /*
       Short-term bearish
    */

    if (
        price < ema20 &&
        ema20 < ema50
    ) {

        return "BEARISH";

    }


    return "SIDEWAYS";

}


/* ===============================
   MARKET STRUCTURE
   =============================== */

function detectStructure() {

    const levels =
        getSwingLevels();


    if (
        levels.highs.length < 2 ||
        levels.lows.length < 2
    ) {

        return "WAITING";

    }


    const lastHigh =
        levels.highs[
            levels.highs.length - 1
        ];


    const previousHigh =
        levels.highs[
            levels.highs.length - 2
        ];


    const lastLow =
        levels.lows[
            levels.lows.length - 1
        ];


    const previousLow =
        levels.lows[
            levels.lows.length - 2
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

        return "HIGHER HIGH / HIGHER LOW";

    }


    if (
        lowerHigh &&
        lowerLow
    ) {

        return "LOWER HIGH / LOWER LOW";

    }


    return "MIXED STRUCTURE";

}


/* ===============================
   BREAK OF STRUCTURE
   =============================== */

function detectBOS() {

    const levels =
        getSwingLevels();


    if (
        levels.highs.length === 0 ||
        levels.lows.length === 0
    ) {

        return "NO BOS";

    }


    const latestHigh =
        levels.highs[
            levels.highs.length - 1
        ];


    const latestLow =
        levels.lows[
            levels.lows.length - 1
        ];


    /*
       Only call it BOS when current
       price actually breaks the
       confirmed swing level.
    */

    if (
        market.price >
        latestHigh.price
    ) {

        return "BULLISH BOS";

    }


    if (
        market.price <
        latestLow.price
    ) {

        return "BEARISH BOS";

    }


    return "NO BOS";

}


/* ===============================
   CHOCH
   =============================== */

function detectCHOCH() {

    const levels =
        getSwingLevels();


    if (
        levels.highs.length < 3 ||
        levels.lows.length < 3
    ) {

        return "NO CHOCH";

    }


    const trend =
        detectTrend();


    const latestHigh =
        levels.highs[
            levels.highs.length - 1
        ];


    const latestLow =
        levels.lows[
            levels.lows.length - 1
        ];


    const previousHigh =
        levels.highs[
            levels.highs.length - 2
        ];


    const previousLow =
        levels.lows[
            levels.lows.length - 2
        ];


    /*
       Bearish trend breaking
       previous swing high.
    */

    if (
        trend === "BEARISH" &&
        market.price >
        previousHigh.price
    ) {

        return "BULLISH CHOCH";

    }


    /*
       Bullish trend breaking
       previous swing low.
    */

    if (
        trend === "BULLISH" &&
        market.price <
        previousLow.price
    ) {

        return "BEARISH CHOCH";

    }


    return "NO CHOCH";

}


/* ===============================
   LIQUIDITY CLUSTER
   =============================== */

function findLiquidityClusters() {

    const levels =
        getSwingLevels();


    const clusters = [];

    const tolerance =
        market.price * 0.0015;


    const allLevels = [

        ...levels.highs.map(
            item => ({
                price: item.price,
                type: "BUY SIDE"
            })
        ),

        ...levels.lows.map(
            item => ({
                price: item.price,
                type: "SELL SIDE"
            })
        )

    ];


    for (
        let i = 0;
        i < allLevels.length;
        i++
    ) {

        const base =
            allLevels[i];


        let count = 1;


        for (
            let j = i + 1;
            j < allLevels.length;
            j++
        ) {

            if (
                Math.abs(
                    base.price -
                    allLevels[j].price
                ) <= tolerance
            ) {

                count++;

            }

        }


        if (count >= 2) {

            clusters.push({

                price:
                    base.price,

                type:
                    base.type,

                strength:
                    count

            });

        }

    }


    return clusters;

}


/* ===============================
   LIQUIDITY MAGNET
   =============================== */

function detectLiquidityMagnet() {

    if (
        !market.price ||
        candles.length < 20
    ) {

        return {

            type: "WAITING",

            price: 0,

            distance: 0,

            strength: 0

        };

    }


    const levels =
        getSwingLevels();


    const clusters =
        findLiquidityClusters();


    const candidates = [];


    /*
       Add swing highs
       as buy-side liquidity.
    */

    levels.highs.forEach(
        level => {

            if (
                level.price >
                market.price
            ) {

                candidates.push({

                    price:
                        level.price,

                    type:
                        "BUY SIDE",

                    strength:
                        1

                });

            }

        }
    );


    /*
       Add swing lows
       as sell-side liquidity.
    */

    levels.lows.forEach(
        level => {

            if (
                level.price <
                market.price
            ) {

                candidates.push({

                    price:
                        level.price,

                    type:
                        "SELL SIDE",

                    strength:
                        1

                });

            }

        }
    );


    /*
       Clustered liquidity gets
       stronger weighting.
    */

    clusters.forEach(
        cluster => {

            if (
                (
                    cluster.type ===
                    "BUY SIDE" &&
                    cluster.price >
                    market.price
                ) ||
                (
                    cluster.type ===
                    "SELL SIDE" &&
                    cluster.price <
                    market.price
                )
            ) {

                candidates.push({

                    price:
                        cluster.price,

                    type:
                        cluster.type,

                    strength:
                        cluster.strength + 2

                });

            }

        }
    );


    if (
        candidates.length === 0
    ) {

        return {

            type: "NONE",

            price: 0,

            distance: 0,

            strength: 0

        };

    }


    /*
       Score each candidate.
       Strong liquidity + reasonable
       distance gets priority.
    */

    candidates.forEach(
        candidate => {

            const distance =
                Math.abs(
                    candidate.price -
                    market.price
                ) /
                market.price;


            candidate.distance =
                distance;


            /*
               Very distant levels are
               less likely to be the
               immediate magnet.
            */

            candidate.score =
                (
                    candidate.strength * 2
                ) -
                (
                    distance * 100
                );

        }
    );


    candidates.sort(
        (a, b) =>
            b.score - a.score
    );


    const best =
        candidates[0];


    return {

        type:
            best.type,

        price:
            best.price,

        distance:
            best.distance,

        strength:
            best.strength

    };

}


/* ===============================
   LIQUIDITY ZONE
   =============================== */

function calculateLiquidityZone() {

    if (
        !market.price
    ) {

        return {

            resistance: 0,

            support: 0

        };

    }


    const recent =
        getRecentHighLow();


    return {

        resistance:
            recent.high,

        support:
            recent.low

    };

}


/* ===============================
   LIQUIDITY DISPLAY
   =============================== */

function getLiquidityDisplay() {

    const zone =
        calculateLiquidityZone();


    if (
        !zone.resistance ||
        !zone.support
    ) {

        return "WAITING";

    }


    return (

        "S: " +
        zone.support.toFixed(2) +

        " | R: " +
        zone.resistance.toFixed(2)

    );

}


/* ===============================
   FAIR VALUE GAP
   =============================== */

function detectFVG() {

    if (
        candles.length < 5
    ) {

        return "NONE";

    }


    /*
       Use the last completed
       3-candle structure.
    */

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
       candle 1 high below
       candle 3 low.
    */

    if (
        c1.high <
        c3.low
    ) {

        return "BULLISH FVG";

    }


    /*
       Bearish FVG:
       candle 1 low above
       candle 3 high.
    */

    if (
        c1.low >
        c3.high
    ) {

        return "BEARISH FVG";

    }


    return "NONE";

}


/* ===============================
   ORDER BLOCK
   =============================== */

function detectOrderBlock() {

    if (
        candles.length < 6
    ) {

        return "NONE";

    }


    const current =
        candles[
            candles.length - 1
        ];


    const previous =
        candles[
            candles.length - 2
        ];


    /*
       Strong bullish displacement.
    */

    if (
        current.close >
        previous.high
    ) {

        return "BULLISH OB";

    }


    /*
       Strong bearish displacement.
    */

    if (
        current.close <
        previous.low
    ) {

        return "BEARISH OB";

    }


    return "NONE";

}


/* ===============================
   MARKET CONDITION
   =============================== */

function detectMarketCondition() {

    if (
        closes.length < 50
    ) {

        return "WAITING";

    }


    const volatility =
        calculateVolatilityPercent();


    const trend =
        detectTrend();


    /*
       High volatility comes first.
    */

    if (
        volatility >= 1.2
    ) {

        return "HIGH VOLATILITY";

    }


    if (
        volatility <= 0.25
    ) {

        return "LOW VOLATILITY";

    }


    if (
        trend === "SIDEWAYS"
    ) {

        return "RANGE MARKET";

    }


    return "TRENDING MARKET";

}


/* ===============================
   MARKET STRENGTH
   =============================== */

function calculateMarketStrength() {

    if (
        closes.length < 50
    ) {

        return "WAITING";

    }


    const trend =
        detectTrend();


    const emaAlignment =
        getEMAAlignment();


    const rsi =
        calculateRSI(14);


    const macd =
        calculateMACD();


    const vwap =
        calculateVWAP();


    let score = 0;


    /*
       Trend
    */

    if (
        trend === "BULLISH"
    ) {

        score += 25;

    }

    else if (
        trend === "BEARISH"
    ) {

        score -= 25;

    }


    /*
       EMA alignment
    */

    if (
        emaAlignment === "BULLISH"
    ) {

        score += 20;

    }

    else if (
        emaAlignment === "BEARISH"
    ) {

        score -= 20;

    }


    /*
       RSI
    */

    if (
        rsi >= 55 &&
        rsi < 70
    ) {

        score += 15;

    }

    else if (
        rsi <= 45 &&
        rsi > 30
    ) {

        score -= 15;

    }


    /*
       MACD
    */

    if (
        macd > 0
    ) {

        score += 15;

    }

    else if (
        macd < 0
    ) {

        score -= 15;

    }


    /*
       VWAP
    */

    if (
        market.price > vwap
    ) {

        score += 10;

    }

    else if (
        market.price < vwap
    ) {

        score -= 10;

    }


    const strength =
        Math.abs(score);


    if (
        strength >= 60
    ) {

        return score > 0
            ? "STRONG BULLISH"
            : "STRONG BEARISH";

    }


    if (
        strength >= 30
    ) {

        return score > 0
            ? "BULLISH"
            : "BEARISH";

    }


    return "NEUTRAL";

}


/* ===============================
   UPDATE MARKET INTELLIGENCE
   =============================== */

function updateMarketIntelligence() {

    if (
        closes.length < 50
    ) {

        return;

    }


    const trend =
        detectTrend();


    const structure =
        detectStructure();


    const bos =
        detectBOS();


    const choch =
        detectCHOCH();


    const liquidity =
        getLiquidityDisplay();


    const magnet =
        detectLiquidityMagnet();


    const condition =
        detectMarketCondition();


    const strength =
        calculateMarketStrength();


    /*
       Main intelligence
    */

    trendBox.textContent =
        trend;


    structureBox.textContent =
        bos +
        " | " +
        choch;


    liquidityZoneBox.textContent =
        liquidity;


    marketConditionBox.textContent =
        condition;


    marketStrengthBox.textContent =
        strength;


    /*
       Liquidity magnet
    */

    if (
        magnet.type === "NONE"
    ) {

        liquidityMagnetBox.textContent =
            "NONE";

    }

    else if (
        magnet.type === "WAITING"
    ) {

        liquidityMagnetBox.textContent =
            "WAITING";

    }

    else {

        liquidityMagnetBox.textContent =

            magnet.type +
            " @ " +
            magnet.price.toFixed(2);

    }


    /*
       Evidence
    */

    emaAlignmentBox.textContent =
        getEMAAlignment();


    vwapPositionBox.textContent =
        getVWAPPosition();


    const rsi =
        calculateRSI(14);


    rsiConditionBox.textContent =
        getRSICondition(rsi);


    const volumeRatio =
        calculateVolumeRatio();


    if (
        volumeRatio >= 1.5
    ) {

      




/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   REAL MARKET SIGNAL ENGINE
   ================================================== */


/* ===============================
   FINAL ELEMENTS
   =============================== */

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

const voiceText =
    document.getElementById("voiceText");


let scanning = false;


/* ===============================
   SIGNAL SCORE
   =============================== */

function calculateSignalScore() {

    let score = 0;

    let bullishEvidence = 0;

    let bearishEvidence = 0;

    let reasons = [];


    /* ===============================
       TREND
       =============================== */

    const trend =
        detectTrend();


    if (trend === "BULLISH") {

        score += 25;

        bullishEvidence++;

        reasons.push(
            "Bullish trend"
        );

    }

    else if (trend === "BEARISH") {

        score -= 25;

        bearishEvidence++;

        reasons.push(
            "Bearish trend"
        );

    }


    /* ===============================
       EMA ALIGNMENT
       =============================== */

    const emaAlignment =
        getEMAAlignment();


    if (
        emaAlignment === "BULLISH"
    ) {

        score += 18;

        bullishEvidence++;

        reasons.push(
            "Bullish EMA alignment"
        );

    }

    else if (
        emaAlignment === "BEARISH"
    ) {

        score -= 18;

        bearishEvidence++;

        reasons.push(
            "Bearish EMA alignment"
        );

    }


    /* ===============================
       RSI
       =============================== */

    const rsi =
        calculateRSI(14);


    if (
        rsi >= 52 &&
        rsi < 68
    ) {

        score += 12;

        bullishEvidence++;

        reasons.push(
            "Positive RSI momentum"
        );

    }

    else if (
        rsi <= 48 &&
        rsi > 32
    ) {

        score -= 12;

        bearishEvidence++;

        reasons.push(
            "Negative RSI momentum"
        );

    }

    else if (
        rsi >= 68
    ) {

        /*
           Don't blindly short
           overbought conditions.
        */

        score -= 5;

        reasons.push(
            "RSI overheated"
        );

    }

    else if (
        rsi <= 32
    ) {

        /*
           Don't blindly long
           oversold conditions.
        */

        score += 5;

        reasons.push(
            "RSI oversold"
        );

    }


    /* ===============================
       MACD
       =============================== */

    const macd =
        calculateMACD();


    if (macd > 0) {

        score += 15;

        bullishEvidence++;

        reasons.push(
            "MACD positive"
        );

    }

    else if (macd < 0) {

        score -= 15;

        bearishEvidence++;

        reasons.push(
            "MACD negative"
        );

    }


    /* ===============================
       VWAP
       =============================== */

    const vwap =
        calculateVWAP();


    if (
        market.price > vwap
    ) {

        score += 10;

        bullishEvidence++;

        reasons.push(
            "Price above VWAP"
        );

    }

    else if (
        market.price < vwap
    ) {

        score -= 10;

        bearishEvidence++;

        reasons.push(
            "Price below VWAP"
        );

    }


    /* ===============================
       MARKET STRUCTURE
       =============================== */

    const bos =
        detectBOS();


    const choch =
        detectCHOCH();


    if (
        bos === "BULLISH BOS"
    ) {

        score += 20;

        bullishEvidence++;

        reasons.push(
            "Bullish break of structure"
        );

    }

    else if (
        bos === "BEARISH BOS"
    ) {

        score -= 20;

        bearishEvidence++;

        reasons.push(
            "Bearish break of structure"
        );

    }


    if (
        choch === "BULLISH CHOCH"
    ) {

        score += 12;

        bullishEvidence++;

        reasons.push(
            "Bullish structure shift"
        );

    }

    else if (
        choch === "BEARISH CHOCH"
    ) {

        score -= 12;

        bearishEvidence++;

        reasons.push(
            "Bearish structure shift"
        );

    }


    /* ===============================
       VOLUME
       =============================== */

    const volumeRatio =
        calculateVolumeRatio();


    if (
        volumeRatio >= 1.5
    ) {

        /*
           High volume confirms
           market activity but does
           not automatically determine
           direction.
        */

        if (score > 0) {

            score += 8;

            bullishEvidence++;

            reasons.push(
                "High volume confirms buyers"
            );

        }

        else if (score < 0) {

            score -= 8;

            bearishEvidence++;

            reasons.push(
                "High volume confirms sellers"
            );

        }

    }


    /* ===============================
       LIQUIDITY MAGNET
       =============================== */

    const magnet =
        detectLiquidityMagnet();


    if (
        magnet.type === "BUY SIDE" &&
        score > 0
    ) {

        score += 5;

        reasons.push(
            "Upside liquidity nearby"
        );

    }

    else if (
        magnet.type === "SELL SIDE" &&
        score < 0
    ) {

        score -= 5;

        reasons.push(
            "Downside liquidity nearby"
        );

    }


    /* ===============================
       MARKET CONDITION FILTER
       =============================== */

    const condition =
        detectMarketCondition();


    /*
       Low volatility means the market
       may not have enough movement for
       a strong directional call.
    */

    if (
        condition === "LOW VOLATILITY"
    ) {

        score *= 0.65;

        reasons.push(
            "Low volatility filter"
        );

    }


    /*
       Range markets require stronger
       evidence before producing a signal.
    */

    if (
        condition === "RANGE MARKET"
    ) {

        score *= 0.80;

        reasons.push(
            "Range market filter"
        );

    }


    return {

        score,

        bullishEvidence,

        bearishEvidence,

        reasons

    };

}


/* ===============================
   FINAL SIGNAL GENERATOR
   =============================== */

function generateSignal() {

    const data =
        calculateSignalScore();


    const score =
        data.score;


    let signal =
        "WAIT";


    /*
       Strong confirmation required
       before LONG or SHORT.
    */

    if (
        score >= 45 &&
        data.bullishEvidence >= 3
    ) {

        signal =
            "LONG";

    }

    else if (
        score <= -45 &&
        data.bearishEvidence >= 3
    ) {

        signal =
            "SHORT";

    }


    /*
       Confidence is based on:
       - score strength
       - evidence count
       - directional agreement
    */

    let confidence =
        50;


    const absoluteScore =
        Math.abs(score);


    confidence +=
        Math.min(
            30,
            absoluteScore * 0.45
        );


    const evidence =
        Math.max(
            data.bullishEvidence,
            data.bearishEvidence
        );


    confidence +=
        Math.min(
            15,
            evidence * 2
        );


    /*
       WAIT should not pretend to
       have high confidence.
    */

    if (
        signal === "WAIT"
    ) {

        confidence =
            Math.min(
                64,
                confidence
            );

    }

    else {

        confidence =
            Math.min(
                95,
                confidence
            );

    }


    return {

        signal,

        confidence,

        score,

        bullishEvidence:
            data.bullishEvidence,

        bearishEvidence:
            data.bearishEvidence,

        reasons:
            data.reasons

    };

}


/* ===============================
   MOMENTUM STATUS
   =============================== */

function getMomentumStatus(
    signal
) {

    const rsi =
        calculateRSI(14);


    const macd =
        calculateMACD();


    if (
        signal === "LONG"
    ) {

        if (
            rsi >= 55 &&
            macd > 0
        ) {

            return "STRONG BUY PRESSURE";

        }

        return "BUY PRESSURE";

    }


    if (
        signal === "SHORT"
    ) {

        if (
            rsi <= 45 &&
            macd < 0
        ) {

            return "STRONG SELL PRESSURE";

        }

        return "SELL PRESSURE";

    }


    if (
        rsi > 50
    ) {

        return "MIXED / SLIGHT BUY";

    }


    if (
        rsi < 50
    ) {

        return "MIXED / SLIGHT SELL";

    }


    return "NEUTRAL";

}


/* ===============================
   LIQUIDITY STATUS
   =============================== */

function getLiquidityStatus() {

    const magnet =
        detectLiquidityMagnet();


    if (
        magnet.type === "WAITING"
    ) {

        return "WAITING";

    }


    if (
        magnet.type === "NONE"
    ) {

        return "NO CLEAR MAGNET";

    }


    const distance =
        magnet.distance * 100;


    if (
        distance <= 0.20
    ) {

        return (
            magnet.type +
            " VERY CLOSE"
        );

    }


    if (
        distance <= 0.50
    ) {

        return (
            magnet.type +
            " NEARBY"
        );

    }


    return (
        magnet.type +
        " @ " +
        magnet.price.toFixed(2)
    );

}


/* ===============================
   DISPLAY SIGNAL
   =============================== */

function displaySignal(data) {

    signalBox.textContent =
        data.signal;


    confidenceBox.textContent =
        data.confidence.toFixed(0) +
        "%";


    momentumBox.textContent =
        getMomentumStatus(
            data.signal
        );


    liquidityBox.textContent =
        getLiquidityStatus();


    /*
       Signal colours use your
       existing design colours.
    */

    if (
        data.signal === "LONG"
    ) {

        signalBox.style.color =
            "#00ff88";

    }

    else if (
        data.signal === "SHORT"
    ) {

        signalBox.style.color =
            "#ff4d6d";

    }

    else {

        signalBox.style.color =
            "#ffd166";

    }


    signalTime.textContent =
        "Analysis: " +
        new Date().toLocaleTimeString();


    /*
       Voice
    */

    if (
        data.signal === "LONG"
    ) {

        speak(
            "Market direction is Long"
        );

    }

    else if (
        data.signal === "SHORT"
    ) {

        speak(
            "Market direction is Short"
        );

    }

    else {

        speak(
            "Market direction is Wait"
        );

    }


    /*
       Console gives transparent
       information about why the
       signal was generated.
    */

    console.log(
        "FINAL MARKET SIGNAL",
        {

            signal:
                data.signal,

            confidence:
                data.confidence,

            score:
                data.score,

            bullishEvidence:
                data.bullishEvidence,

            bearishEvidence:
                data.bearishEvidence,

            reasons:
                data.reasons,

            liquidity:
                detectLiquidityMagnet(),

            trend:
                detectTrend(),

            structure:
                detectStructure(),

            bos:
                detectBOS(),

            choch:
                detectCHOCH(),

            fvg:
                detectFVG(),

            orderBlock:
                detectOrderBlock(),

            marketCondition:
                detectMarketCondition()

        }
    );

}


/* ===============================
   SCAN BUTTON
   =============================== */

scanBtn.onclick = function () {

    if (
        scanning
    ) {

        return;

    }


    /*
       Don't generate a signal until
       enough real candles exist.
    */

    if (
        closes.length < 200
    ) {

        scanStatus.textContent =
            "Collecting real market data...";


        engineStatus.textContent =
            "Need more candle history";


        return;

    }


    scanning = true;

    scanBtn.disabled = true;


    let seconds = 10;


    scanTimer.textContent =
        seconds;


    scanStatus.textContent =
        "Analyzing live market...";


    engineStatus.textContent =
        "Running multi-factor engine...";


    /*
       Recalculate indicators before
       the scan starts.
    */

    updateIndicators();

    updateMarketIntelligence();


    const timer =
        setInterval(
            function () {

                seconds--;


                scanTimer.textContent =
                    seconds;


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        timer
                    );


                    /*
                       Generate from the
                       latest live price.
                    */

                    const result =
                        generateSignal();


                    displaySignal(
                        result
                    );


                    scanTimer.textContent =
                        "READY";


                    scanStatus.textContent =
                        "Analysis Complete";


                    engineStatus.textContent =
                        "Engine Ready";


                    scanBtn.disabled =
                        false;


                    scanning =
                        false;

                }

            },
            1000
        );

};


/* ===============================
   VOICE SYSTEM
   =============================== */

function speak(text) {

    voiceText.textContent =
        text;


    if (
        "speechSynthesis" in window
    ) {

        speechSynthesis.cancel();


        const message =
            new SpeechSynthesisUtterance(
                text
            );


        message.rate =
            0.9;


        message.pitch =
            1;


        speechSynthesis.speak(
            message
        );

    }

}


/* ===============================
   ENGINE READY
   =============================== */

setTimeout(
    function () {

        if (
            closes.length >= 200
        ) {

            engineStatus.textContent =
                "Engine Ready";

            scanStatus.textContent =
                "Ready for live analysis";

        }

    },
    5000
);

    
