/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   REAL MARKET DATA + LIVE CHART ENGINE
   ================================================== */


/* ===============================
   DOM ELEMENTS
   =============================== */

const btcPrice =
    document.getElementById("btcPrice");

const priceChange =
    document.getElementById("priceChange");

const priceTime =
    document.getElementById("priceTime");

const marketState =
    document.getElementById("marketState");

const scanBtn =
    document.getElementById("scanBtn");

const marketStatus =
    document.getElementById("marketStatus");


/* ===============================
   HIDE BACKGROUND-ONLY SECTIONS
   =============================== */

/*
   Indicators calculations will still run
   in JavaScript, but the visual card stays
   hidden as requested.

   Trade Management is also hidden because
   TP/SL is not part of this scanner.
*/

const indicatorCard =
    document.querySelector(".indicators-card");

if (indicatorCard) {
    indicatorCard.style.display = "none";
}


const riskCard =
    document.querySelector(".risk-card");

if (riskCard) {
    riskCard.style.display = "none";
}


/* ===============================
   MARKET STORAGE
   =============================== */

let candles = [];

let closes = [];

let opens = [];

let highs = [];

let lows = [];

let volumes = [];

let timestamps = [];


let market = {

    price: 0,

    previousPrice: 0,

    volume: 0,

    change24h: 0,

    change24hPercent: 0,

    high24h: 0,

    low24h: 0,

    quoteVolume24h: 0,

    lastUpdate: 0

};


/* ===============================
   ENGINE STATE
   =============================== */

let dataReady = false;

let socket = null;

let tickerSocket = null;

let reconnectTimer = null;

let tickerReconnectTimer = null;

let chart = null;


/* ===============================
   BINANCE ENDPOINTS
   =============================== */

const BINANCE_API =
    "https://api.binance.com";


const KLINE_URL =
    BINANCE_API +
    "/api/v3/klines" +
    "?symbol=BTCUSDT" +
    "&interval=1m" +
    "&limit=500";


const TICKER_URL =
    BINANCE_API +
    "/api/v3/ticker/24hr" +
    "?symbol=BTCUSDT";


/* ===============================
   NUMBER SAFETY
   =============================== */

function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


/* ===============================
   PRICE FORMAT
   =============================== */

function formatPrice(value) {

    const number =
        safeNumber(value);

    if (!number) {
        return "$0.00";
    }

    return "$" +
        number.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


/* ===============================
   VOLUME FORMAT
   =============================== */

function formatVolume(value) {

    const number =
        safeNumber(value);

    if (number >= 1000) {

        return (
            number / 1000
        ).toFixed(2) + "K BTC";

    }

    return (
        number.toFixed(2) +
        " BTC"
    );

}


/* ===============================
   24H CHANGE DISPLAY
   =============================== */

function update24HourDisplay() {

    const change =
        market.change24hPercent;


    priceChange.textContent =
        (
            change >= 0
                ? "+"
                : ""
        ) +
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


/* ===============================
   PRICE DISPLAY
   =============================== */

function updatePriceDisplay() {

    btcPrice.textContent =
        formatPrice(
            market.price
        );


    update24HourDisplay();


    if (
        market.lastUpdate
    ) {

        priceTime.textContent =
            "LIVE";

    }

}


/* ===============================
   HISTORY LOADER
   =============================== */

async function loadHistory() {

    try {

        marketState.textContent =
            "LOADING DATA";


        const response =
            await fetch(
                KLINE_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Binance history request failed"
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            throw new Error(
                "No candle data received"
            );

        }


        /*
         * Reset arrays before loading.
         */

        candles = [];

        closes = [];

        opens = [];

        highs = [];

        lows = [];

        volumes = [];

        timestamps = [];


        data.forEach(
            item => {

                const candle = {

                    time:
                        safeNumber(item[0]),

                    open:
                        safeNumber(item[1]),

                    high:
                        safeNumber(item[2]),

                    low:
                        safeNumber(item[3]),

                    close:
                        safeNumber(item[4]),

                    volume:
                        safeNumber(item[5])

                };


                candles.push(
                    candle
                );


                opens.push(
                    candle.open
                );


                highs.push(
                    candle.high
                );


                lows.push(
                    candle.low
                );


                closes.push(
                    candle.close
                );


                volumes.push(
                    candle.volume
                );


                timestamps.push(
                    candle.time
                );

            }
        );


        /*
         * Set initial market price.
         */

        const last =
            candles[
                candles.length - 1
            ];


        market.price =
            last.close;


        market.previousPrice =
            last.open;


        market.volume =
            last.volume;


        market.lastUpdate =
            Date.now();


        dataReady = true;


        updatePriceDisplay();

        createChart();


        marketState.textContent =
            "DATA READY";


        /*
         * Get 24H ticker immediately.
         */

        await load24HourTicker();


        /*
         * Start live streams after
         * historical data is ready.
         */

        connectKlineSocket();

        connectTickerSocket();


    }

    catch (error) {

        console.error(
            "History error:",
            error
        );


        marketState.textContent =
            "DATA ERROR";


        priceTime.textContent =
            "Unable to load market data";

    }

}


/* ===============================
   24H TICKER
   =============================== */

async function load24HourTicker() {

    try {

        const response =
            await fetch(
                TICKER_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "24H ticker failed"
            );

        }


        const data =
            await response.json();


        market.change24hPercent =
            safeNumber(
                data.priceChangePercent
            );


        market.change24h =
            safeNumber(
                data.priceChange
            );


        market.high24h =
            safeNumber(
                data.highPrice
            );


        market.low24h =
            safeNumber(
                data.lowPrice
            );


        market.quoteVolume24h =
            safeNumber(
                data.quoteVolume
            );


        if (
            safeNumber(data.lastPrice) > 0
        ) {

            market.price =
                safeNumber(
                    data.lastPrice
                );

        }


        market.lastUpdate =
            Date.now();


        updatePriceDisplay();

    }

    catch (error) {

        console.error(
            "24H ticker error:",
            error
        );

    }

}


/* ===============================
   LIVE KLINE WEBSOCKET
   =============================== */

function connectKlineSocket() {

    if (socket) {

        try {
            socket.close();
        }

        catch (error) {
            console.warn(error);
        }

    }


    socket =
        new WebSocket(
            "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
        );


    socket.onopen =
        () => {

            marketState.textContent =
                "LIVE";

            engineLiveState();

        };


    socket.onmessage =
        event => {

            try {

                const payload =
                    JSON.parse(
                        event.data
                    );


                if (!payload.k) {
                    return;
                }


                updateLiveCandle(
                    payload.k
                );

            }

            catch (error) {

                console.error(
                    "Kline parse error:",
                    error
                );

            }

        };


    socket.onerror =
        error => {

            console.error(
                "Kline WebSocket error:",
                error
            );

            marketState.textContent =
                "RECONNECTING";

        };


    socket.onclose =
        () => {

            marketState.textContent =
                "RECONNECTING";


            clearTimeout(
                reconnectTimer
            );


            reconnectTimer =
                setTimeout(
                    connectKlineSocket,
                    3000
                );

        };

}


/* ===============================
   LIVE 24H WEBSOCKET
   =============================== */

function connectTickerSocket() {

    if (tickerSocket) {

        try {
            tickerSocket.close();
        }

        catch (error) {
            console.warn(error);
        }

    }


    tickerSocket =
        new WebSocket(
            "wss://stream.binance.com:9443/ws/btcusdt@ticker"
        );


    tickerSocket.onmessage =
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                /*
                 * Binance 24H ticker:
                 *
                 * c = last price
                 * p = price change
                 * P = percentage change
                 * h = 24H high
                 * l = 24H low
                 * v = base volume
                 * q = quote volume
                 */

                market.price =
                    safeNumber(data.c);


                market.change24h =
                    safeNumber(data.p);


                market.change24hPercent =
                    safeNumber(data.P);


                market.high24h =
                    safeNumber(data.h);


                market.low24h =
                    safeNumber(data.l);


                market.volume24h =
                    safeNumber(data.v);


                market.quoteVolume24h =
                    safeNumber(data.q);


                market.lastUpdate =
                    Date.now();


                updatePriceDisplay();


            }

            catch (error) {

                console.error(
                    "Ticker parse error:",
                    error
                );

            }

        };


    tickerSocket.onerror =
        error => {

            console.error(
                "Ticker WebSocket error:",
                error
            );

        };


    tickerSocket.onclose =
        () => {

            clearTimeout(
                tickerReconnectTimer
            );


            tickerReconnectTimer =
                setTimeout(
                    connectTickerSocket,
                    3000
                );

        };

}


/* ===============================
   UPDATE CURRENT CANDLE
   =============================== */

function updateLiveCandle(data) {

    const openTime =
        safeNumber(
            data.t
        );


    const open =
        safeNumber(
            data.o
        );


    const high =
        safeNumber(
            data.h
        );


    const low =
        safeNumber(
            data.l
        );


    const close =
        safeNumber(
            data.c
        );


    const volume =
        safeNumber(
            data.v
        );


    if (!close) {
        return;
    }


    const lastIndex =
        candles.length - 1;


    /*
     * If Binance has moved to a new
     * 1-minute candle, create a new one.
     */

    if (
        lastIndex < 0 ||
        candles[lastIndex].time !==
        openTime
    ) {

        const newCandle = {

            time:
                openTime,

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


        candles.push(
            newCandle
        );


        opens.push(
            open
        );


        highs.push(
            high
        );


        lows.push(
            low
        );


        closes.push(
            close
        );


        volumes.push(
            volume
        );


        timestamps.push(
            openTime
        );


        /*
         * Keep memory controlled.
         */

        if (
            candles.length > 600
        ) {

            candles.shift();

            opens.shift();

            highs.shift();

            lows.shift();

            closes.shift();

            volumes.shift();

            timestamps.shift();

        }

    }

    else {

        /*
         * Update the current live candle.
         */

        candles[lastIndex].open =
            open;

        candles[lastIndex].high =
            high;

        candles[lastIndex].low =
            low;

        candles[lastIndex].close =
            close;

        candles[lastIndex].volume =
            volume;


        opens[lastIndex] =
            open;

        highs[lastIndex] =
            high;

        lows[lastIndex] =
            low;

        closes[lastIndex] =
            close;

        volumes[lastIndex] =
            volume;

    }


    market.previousPrice =
        market.price;


    market.price =
        close;


    market.volume =
        volume;


    market.lastUpdate =
        Date.now();


    updatePriceDisplay();


    updateChart(
        close
    );

}


/* ===============================
   MOVING LINE CHART
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
        canvas.getContext(
            "2d"
        );


    if (chart) {

        chart.destroy();

        chart = null;

    }


    /*
     * Use the latest 150 points so
     * the chart remains smooth.
     */

    const chartData =
        closes.slice(-150);


    const labels =
        chartData.map(
            () => ""
        );


    chart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels:
                        labels,

                    datasets: [

                        {

                            label:
                                "BTC/USDT",

                            data:
                                chartData,

                            borderColor:
                                "#00f5ff",

                            backgroundColor:
                                "rgba(0,245,255,0.08)",

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            pointRadius:
                                0,

                            pointHoverRadius:
                                0,

                            fill:
                                true

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
                                false

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

            }
        );

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


    dataset.data.push(
        safeNumber(price)
    );


    chart.data.labels.push(
        ""
    );


    /*
     * Keep the chart moving smoothly.
     */

    const MAX_POINTS = 150;


    while (
        dataset.data.length >
        MAX_POINTS
    ) {

        dataset.data.shift();

        chart.data.labels.shift();

    }


    chart.update(
        "none"
    );

}


/* ===============================
   LIVE ENGINE STATUS
   =============================== */

function engineLiveState() {

    const engine =
        document.getElementById(
            "engineStatus"
        );


    if (!engine) {
        return;
    }


    if (
        dataReady
    ) {

        engine.textContent =
            "Engine Ready";

    }

}


/* ===============================
   DATA HEALTH CHECK
   =============================== */

function hasEnoughMarketData() {

    return (
        candles.length >= 200 &&
        closes.length >= 200 &&
        highs.length >= 200 &&
        lows.length >= 200 &&
        volumes.length >= 200
    );

}


/* ===============================
   CURRENT PRICE HELPER
   =============================== */

function getCurrentPrice() {

    return safeNumber(
        market.price
    );

}


/* ===============================
   INITIAL START
   =============================== */

loadHistory();


/* ===============================
   PERIODIC 24H FALLBACK
   =============================== */

setInterval(
    () => {

        load24HourTicker();

    },
    30000
);






/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   BACKGROUND INDICATOR ENGINE
   ================================================== */


/* ===============================
   INDICATOR STATE
   =============================== */

let indicatorState = {

    rsi: 50,

    ema20: 0,

    ema50: 0,

    ema200: 0,

    macd: 0,

    macdSignal: 0,

    macdHistogram: 0,

    vwap: 0,

    atr: 0,

    atrPercent: 0,

    volatilityPercent: 0,

    volatilityState: "WAITING",

    volume: 0,

    averageVolume: 0,

    volumeRatio: 1,

    volumeState: "WAITING"

};


/* ===============================
   BASIC ARRAY CHECK
   =============================== */

function validNumber(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


/* ===============================
   SMA
   =============================== */

function calculateSMA(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return 0;

    }


    const recent =
        values.slice(-period);


    const sum =
        recent.reduce(
            (total, value) =>
                total + safeNumber(value),
            0
        );


    return sum / period;

}


/* ===============================
   EMA
   =============================== */

function calculateEMA(
    period,
    values = closes
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return 0;

    }


    /*
     * Start with SMA rather than the
     * first candle. This gives a much
     * more stable EMA.
     */

    let ema =
        calculateSMA(
            values.slice(
                0,
                period
            ),
            period
        );


    const multiplier =
        2 / (period + 1);


    for (
        let i = period;
        i < values.length;
        i++
    ) {

        const price =
            safeNumber(
                values[i]
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
   EMA SERIES
   =============================== */

function calculateEMASeries(
    period,
    values = closes
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return [];

    }


    let ema =
        calculateSMA(
            values.slice(
                0,
                period
            ),
            period
        );


    const multiplier =
        2 / (period + 1);


    const result = [];


    /*
     * Fill the initial period so
     * indexes remain aligned.
     */

    for (
        let i = 0;
        i < period - 1;
        i++
    ) {

        result.push(
            null
        );

    }


    result.push(
        ema
    );


    for (
        let i = period;
        i < values.length;
        i++
    ) {

        const price =
            safeNumber(
                values[i]
            );


        ema =
            (
                price - ema
            ) *
            multiplier +
            ema;


        result.push(
            ema
        );

    }


    return result;

}


/* ===============================
   WILDER RSI
   =============================== */

function calculateRSI(
    period = 14,
    values = closes
) {

    if (
        !Array.isArray(values) ||
        values.length <= period
    ) {

        return 50;

    }


    /*
     * Initial Wilder averages.
     */

    let gainSum = 0;

    let lossSum = 0;


    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const change =
            safeNumber(
                values[i]
            ) -
            safeNumber(
                values[i - 1]
            );


        if (change > 0) {

            gainSum += change;

        }

        else {

            lossSum +=
                Math.abs(change);

        }

    }


    let averageGain =
        gainSum / period;


    let averageLoss =
        lossSum / period;


    /*
     * Continue Wilder smoothing
     * through the remaining candles.
     */

    for (
        let i = period + 1;
        i < values.length;
        i++
    ) {

        const change =
            safeNumber(
                values[i]
            ) -
            safeNumber(
                values[i - 1]
            );


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
                averageGain *
                (period - 1) +
                gain
            ) / period;


        averageLoss =
            (
                averageLoss *
                (period - 1) +
                loss
            ) / period;

    }


    /*
     * Avoid forcing RSI to 100.
     * A zero loss does not automatically
     * mean we should blindly use 100.
     */

    if (
        averageGain === 0 &&
        averageLoss === 0
    ) {

        return 50;

    }


    if (
        averageLoss === 0
    ) {

        return 99;

    }


    if (
        averageGain === 0
    ) {

        return 1;

    }


    const relativeStrength =
        averageGain /
        averageLoss;


    const rsi =
        100 -
        (
            100 /
            (
                1 +
                relativeStrength
            )
        );


    return Math.min(
        99,
        Math.max(
            1,
            rsi
        )
    );

}


/* ===============================
   MACD
   =============================== */

function calculateMACDData() {

    if (
        closes.length < 50
    ) {

        return {

            macd: 0,

            signal: 0,

            histogram: 0

        };

    }


    const ema12Series =
        calculateEMASeries(
            12,
            closes
        );


    const ema26Series =
        calculateEMASeries(
            26,
            closes
        );


    const macdSeries = [];


    for (
        let i = 0;
        i < closes.length;
        i++
    ) {

        if (
            ema12Series[i] === null ||
            ema26Series[i] === null
        ) {

            continue;

        }


        macdSeries.push(
            ema12Series[i] -
            ema26Series[i]
        );

    }


    if (
        macdSeries.length < 9
    ) {

        return {

            macd: 0,

            signal: 0,

            histogram: 0

        };

    }


    const signal =
        calculateEMA(
            9,
            macdSeries
        );


    const macd =
        macdSeries[
            macdSeries.length - 1
        ];


    const histogram =
        macd - signal;


    return {

        macd,

        signal,

        histogram

    };

}


/* ===============================
   TYPICAL PRICE
   =============================== */

function getTypicalPrice(
    candle
) {

    return (
        safeNumber(candle.high) +
        safeNumber(candle.low) +
        safeNumber(candle.close)
    ) / 3;

}


/* ===============================
   VWAP
   =============================== */

function calculateVWAP(
    lookback = 200
) {

    if (
        candles.length === 0
    ) {

        return 0;

    }


    const recent =
        candles.slice(
            -lookback
        );


    let totalVolume = 0;

    let totalValue = 0;


    recent.forEach(
        candle => {

            const volume =
                safeNumber(
                    candle.volume
                );


            const typicalPrice =
                getTypicalPrice(
                    candle
                );


            totalValue +=
                typicalPrice *
                volume;


            totalVolume +=
                volume;

        }
    );


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
   TRUE RANGE
   =============================== */

function calculateTrueRange(
    index
) {

    if (
        index <= 0 ||
        index >= candles.length
    ) {

        return 0;

    }


    const current =
        candles[index];


    const previous =
        candles[index - 1];


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


    return Math.max(

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

}


/* ===============================
   WILDER ATR
   =============================== */

function calculateATR(
    period = 14
) {

    if (
        candles.length <= period
    ) {

        return 0;

    }


    const start =
        Math.max(
            1,
            candles.length -
            period -
            100
        );


    const trueRanges = [];


    for (
        let i = start;
        i < candles.length;
        i++
    ) {

        trueRanges.push(
            calculateTrueRange(i)
        );

    }


    if (
        trueRanges.length <
        period
    ) {

        return 0;

    }


    /*
     * Initial ATR.
     */

    let atr =
        trueRanges
            .slice(
                0,
                period
            )
            .reduce(
                (
                    total,
                    value
                ) =>
                    total + value,
                0
            ) /
        period;


    /*
     * Wilder smoothing.
     */

    for (
        let i = period;
        i < trueRanges.length;
        i++
    ) {

        atr =
            (
                atr *
                (period - 1) +
                trueRanges[i]
            ) / period;

    }


    return atr;

}


/* ===============================
   ATR PERCENTAGE
   =============================== */

function calculateATRPercent() {

    const price =
        getCurrentPrice();


    const atr =
        calculateATR(14);


    if (
        price <= 0 ||
        atr <= 0
    ) {

        return 0;

    }


    return (
        atr /
        price
    ) * 100;

}


/* ===============================
   REALIZED VOLATILITY
   =============================== */

function calculateVolatilityPercent(
    period = 20
) {

    if (
        closes.length <
        period + 1
    ) {

        return 0;

    }


    const recent =
        closes.slice(
            -(period + 1)
        );


    const returns = [];


    for (
        let i = 1;
        i < recent.length;
        i++
    ) {

        const previous =
            safeNumber(
                recent[i - 1]
            );


        const current =
            safeNumber(
                recent[i]
            );


        if (
            previous <= 0 ||
            current <= 0
        ) {

            continue;

        }


        const percentageReturn =
            (
                (
                    current -
                    previous
                ) /
                previous
            ) * 100;


        returns.push(
            percentageReturn
        );

    }


    if (
        returns.length < 2
    ) {

        return 0;

    }


    const mean =
        returns.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        ) /
        returns.length;


    const variance =
        returns.reduce(
            (
                total,
                value
            ) =>
                total +
                Math.pow(
                    value - mean,
                    2
                ),
            0
        ) /
        returns.length;


    /*
     * Approximate 20-minute realized
     * volatility as percentage.
     */

    return Math.sqrt(
        variance
    );

}


/* ===============================
   VOLATILITY CLASSIFICATION
   =============================== */

function classifyVolatility(
    atrPercent,
    realizedPercent
) {

    /*
     * ATR is the primary market
     * movement measurement.
     *
     * Realized volatility confirms it.
     */

    if (
        atrPercent <= 0
    ) {

        return "WAITING";

    }


    const combined =
        (
            atrPercent +
            realizedPercent
        ) / 2;


    if (
        combined < 0.12
    ) {

        return "LOW";

    }


    if (
        combined >= 0.35
    ) {

        return "HIGH";

    }


    return "NORMAL";

}


/* ===============================
   VOLUME ANALYSIS
   =============================== */

function analyzeVolume(
    period = 20
) {

    if (
        volumes.length <
        period + 1
    ) {

        return {

            current: 0,

            average: 0,

            ratio: 1,

            state: "WAITING"

        };

    }


    const current =
        safeNumber(
            volumes[
                volumes.length - 1
            ]
        );


    /*
     * Don't include the current candle
     * when calculating its comparison
     * average.
     */

    const previousVolumes =
        volumes.slice(
            -(period + 1),
            -1
        );


    const average =
        previousVolumes.reduce(
            (
                total,
                value
            ) =>
                total +
                safeNumber(value),
            0
        ) /
        previousVolumes.length;


    if (
        average <= 0
    ) {

        return {

            current,

            average: 0,

            ratio: 1,

            state: "NORMAL"

        };

    }


    const ratio =
        current /
        average;


    let state =
        "NORMAL";


    if (
        ratio >= 1.5
    ) {

        state =
            "HIGH";

    }

    else if (
        ratio <= 0.7
    ) {

        state =
            "LOW";

    }


    return {

        current,

        average,

        ratio,

        state

    };

}


/* ===============================
   MOMENTUM
   =============================== */

function calculateMomentum() {

    if (
        closes.length < 20
    ) {

        return {

            direction:
                "NEUTRAL",

            strength:
                0

        };

    }


    const current =
        closes[
            closes.length - 1
        ];


    const previous =
        closes[
            closes.length - 11
        ];


    if (
        previous <= 0
    ) {

        return {

            direction:
                "NEUTRAL",

            strength:
                0

        };

    }


    const change =
        (
            (
                current -
                previous
            ) /
            previous
        ) * 100;


    const strength =
        Math.min(
            100,
            Math.abs(change) * 20
        );


    if (
        change > 0.08
    ) {

        return {

            direction:
                "BULLISH",

            strength

        };

    }


    if (
        change < -0.08
    ) {

        return {

            direction:
                "BEARISH",

            strength

        };

    }


    return {

        direction:
            "NEUTRAL",

        strength

    };

}


/* ===============================
   UPDATE INDICATOR STATE
   =============================== */

function updateIndicatorState() {

    if (
        !hasEnoughMarketData()
    ) {

        return false;

    }


    const rsi =
        calculateRSI(14);


    const ema20 =
        calculateEMA(20);


    const ema50 =
        calculateEMA(50);


    const ema200 =
        calculateEMA(200);


    const macdData =
        calculateMACDData();


    const vwap =
        calculateVWAP(200);


    const atr =
        calculateATR(14);


    const atrPercent =
        calculateATRPercent();


    const realizedVolatility =
        calculateVolatilityPercent(20);


    const volatilityState =
        classifyVolatility(
            atrPercent,
            realizedVolatility
        );


    const volumeData =
        analyzeVolume(20);


    indicatorState = {

        rsi,

        ema20,

        ema50,

        ema200,

        macd:
            macdData.macd,

        macdSignal:
            macdData.signal,

        macdHistogram:
            macdData.histogram,

        vwap,

        atr,

        atrPercent,

        volatilityPercent:
            realizedVolatility,

        volatilityState,

        volume:
            volumeData.current,

        averageVolume:
            volumeData.average,

        volumeRatio:
            volumeData.ratio,

        volumeState:
            volumeData.state

    };


    return true;

}


/* ===============================
   INDICATOR SNAPSHOT
   =============================== */

function getIndicatorSnapshot() {

    updateIndicatorState();


    return {

        rsi:
            indicatorState.rsi,

        ema20:
            indicatorState.ema20,

        ema50:
            indicatorState.ema50,

        ema200:
            indicatorState.ema200,

        macd:
            indicatorState.macd,

        macdSignal:
            indicatorState.macdSignal,

        macdHistogram:
            indicatorState.macdHistogram,

        vwap:
            indicatorState.vwap,

        atr:
            indicatorState.atr,

        atrPercent:
            indicatorState.atrPercent,

        volatilityPercent:
            indicatorState.volatilityPercent,

        volatilityState:
            indicatorState.volatilityState,

        volume:
            indicatorState.volume,

        averageVolume:
            indicatorState.averageVolume,

        volumeRatio:
            indicatorState.volumeRatio,

        volumeState:
            indicatorState.volumeState

    };

}


/* ===============================
   BACKGROUND UPDATE
   =============================== */

setInterval(
    () => {

        if (
            hasEnoughMarketData()
        ) {

            updateIndicatorState();

        }

    },
    3000
);




/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 3
   MARKET INTELLIGENCE + LIQUIDITY ENGINE
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

const marketConditionBox =
    document.getElementById("marketCondition");


/* ===============================
   INTELLIGENCE STATE
   =============================== */

let intelligenceState = {

    trend: "WAITING",

    structure: "WAITING",

    structureDirection: "NONE",

    rangeHigh: 0,

    rangeLow: 0,

    rangeSize: 0,

    liquidityMagnet: 0,

    liquiditySide: "WAITING",

    liquidityDistance: 0,

    liquidityStrength: 0,

    marketCondition: "WAITING",

    volatility: "WAITING",

    volume: "WAITING"

};


/* ===============================
   HELPER
   =============================== */

function getRecentCandles(
    count = 100
) {

    return candles.slice(
        -count
    );

}


/* ===============================
   PRICE RANGE
   =============================== */

function getMarketRange(
    count = 100
) {

    const recent =
        getRecentCandles(count);


    if (
        recent.length < 10
    ) {

        return {

            high: 0,

            low: 0,

            size: 0

        };

    }


    const high =
        Math.max(
            ...recent.map(
                candle =>
                    safeNumber(
                        candle.high
                    )
            )
        );


    const low =
        Math.min(
            ...recent.map(
                candle =>
                    safeNumber(
                        candle.low
                    )
            )
        );


    return {

        high,

        low,

        size:
            high - low

    };

}


/* ===============================
   TREND DETECTION
   =============================== */

function detectTrend() {

    if (
        closes.length < 200
    ) {

        return "WAITING";

    }


    const price =
        getCurrentPrice();


    const ema20 =
        indicatorState.ema20;


    const ema50 =
        indicatorState.ema50;


    const ema200 =
        indicatorState.ema200;


    if (
        !price ||
        !ema20 ||
        !ema50 ||
        !ema200
    ) {

        return "WAITING";

    }


    /*
     * Strong bullish alignment.
     */

    if (
        price > ema20 &&
        ema20 > ema50 &&
        ema50 > ema200
    ) {

        return "BULLISH";

    }


    /*
     * Strong bearish alignment.
     */

    if (
        price < ema20 &&
        ema20 < ema50 &&
        ema50 < ema200
    ) {

        return "BEARISH";

    }


    /*
     * Check shorter structure even when
     * 200 EMA alignment is mixed.
     */

    if (
        price > ema20 &&
        ema20 > ema50
    ) {

        return "BULLISH";

    }


    if (
        price < ema20 &&
        ema20 < ema50
    ) {

        return "BEARISH";

    }


    return "SIDEWAYS";

}


/* ===============================
   LOCAL SWING HIGH
   =============================== */

function isSwingHigh(
    index,
    left = 3,
    right = 3
) {

    if (
        index < left ||
        index >=
            candles.length - right
    ) {

        return false;

    }


    const value =
        safeNumber(
            candles[index].high
        );


    for (
        let i = 1;
        i <= left;
        i++
    ) {

        if (
            value <=
            safeNumber(
                candles[index - i].high
            )
        ) {

            return false;

        }

    }


    for (
        let i = 1;
        i <= right;
        i++
    ) {

        if (
            value <
            safeNumber(
                candles[index + i].high
            )
        ) {

            return false;

        }

    }


    return true;

}


/* ===============================
   LOCAL SWING LOW
   =============================== */

function isSwingLow(
    index,
    left = 3,
    right = 3
) {

    if (
        index < left ||
        index >=
            candles.length - right
    ) {

        return false;

    }


    const value =
        safeNumber(
            candles[index].low
        );


    for (
        let i = 1;
        i <= left;
        i++
    ) {

        if (
            value >=
            safeNumber(
                candles[index - i].low
            )
        ) {

            return false;

        }

    }


    for (
        let i = 1;
        i <= right;
        i++
    ) {

        if (
            value >
            safeNumber(
                candles[index + i].low
            )
        ) {

            return false;

        }

    }


    return true;

}


/* ===============================
   COLLECT SWING LEVELS
   =============================== */

function collectSwingLevels(
    lookback = 250
) {

    const start =
        Math.max(
            3,
            candles.length -
            lookback
        );


    const highsFound = [];

    const lowsFound = [];


    for (
        let i = start;
        i <
            candles.length - 3;
        i++
    ) {

        if (
            isSwingHigh(i)
        ) {

            highsFound.push({

                price:
                    safeNumber(
                        candles[i].high
                    ),

                index:
                    i,

                volume:
                    safeNumber(
                        candles[i].volume
                    )

            });

        }


        if (
            isSwingLow(i)
        ) {

            lowsFound.push({

                price:
                    safeNumber(
                        candles[i].low
                    ),

                index:
                    i,

                volume:
                    safeNumber(
                        candles[i].volume
                    )

            });

        }

    }


    return {

        highs:
            highsFound,

        lows:
            lowsFound

    };

}


/* ===============================
   LIQUIDITY CLUSTERING
   =============================== */

function clusterLiquidityLevels(
    levels,
    tolerancePercent = 0.12
) {

    if (
        !levels.length
    ) {

        return [];

    }


    const sorted =
        [...levels].sort(
            (a, b) =>
                a.price -
                b.price
        );


    const clusters = [];


    sorted.forEach(
        level => {

            let matched = null;


            for (
                const cluster
                of clusters
            ) {

                const averagePrice =
                    cluster.price;


                const distancePercent =
                    Math.abs(
                        level.price -
                        averagePrice
                    ) /
                    averagePrice *
                    100;


                if (
                    distancePercent <=
                    tolerancePercent
                ) {

                    matched =
                        cluster;

                    break;

                }

            }


            if (
                matched
            ) {

                matched.levels.push(
                    level
                );


                matched.price =
                    matched.levels.reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            item.price,
                        0
                    ) /
                    matched.levels.length;


                matched.volume +=
                    level.volume;

            }

            else {

                clusters.push({

                    price:
                        level.price,

                    volume:
                        level.volume,

                    levels:
                        [level]

                });

            }

        }
    );


    return clusters;

}


/* ===============================
   LIQUIDITY MAGNET
   =============================== */

function calculateLiquidityMagnet(
    direction = "WAIT"
) {

    const price =
        getCurrentPrice();


    if (
        price <= 0 ||
        candles.length < 50
    ) {

        return {

            price: 0,

            side: "WAITING",

            distance: 0,

            strength: 0

        };

    }


    const swings =
        collectSwingLevels(
            250
        );


    const highClusters =
        clusterLiquidityLevels(
            swings.highs
        );


    const lowClusters =
        clusterLiquidityLevels(
            swings.lows
        );


    /*
     * Remove levels that are on the
     * wrong side of the current price.
     */

    const upside =
        highClusters
            .filter(
                level =>
                    level.price >
                    price
            );


    const downside =
        lowClusters
            .filter(
                level =>
                    level.price <
                    price
            );


    /*
     * Give repeated liquidity levels
     * more importance.
     */

    function scoreLevel(
        level
    ) {

        const distance =
            Math.abs(
                level.price -
                price
            );


        const touches =
            level.levels.length;


        const volumeScore =
            level.volume > 0
                ? Math.min(
                    3,
                    level.volume /
                    Math.max(
                        1,
                        indicatorState.averageVolume
                    )
                )
                : 0;


        /*
         * A level is stronger when:
         * - multiple swings formed there
         * - volume was present
         * - it is not immediately next
         *   to current price
         */

        let score =
            touches * 3 +
            volumeScore;


        /*
         * Prefer meaningful distance for
         * directional signals.
         *
         * This does NOT invent a price.
         */

        if (
            distance >= 300
        ) {

            score += 5;

        }

        else if (
            distance >= 200
        ) {

            score += 2;

        }

        else {

            score -= 2;

        }


        return score;

    }


    let candidates = [];


    if (
        direction === "LONG"
    ) {

        candidates =
            upside.map(
                level => ({

                    ...level,

                    side:
                        "UPSIDE",

                    score:
                        scoreLevel(
                            level
                        )

                })
            );

    }

    else if (
        direction === "SHORT"
    ) {

        candidates =
            downside.map(
                level => ({

                    ...level,

                    side:
                        "DOWNSIDE",

                    score:
                        scoreLevel(
                            level
                        )

                })
            );

    }

    else {

        /*
         * WAIT:
         * consider both sides and select
         * the strongest meaningful pool.
         */

        candidates =
            [
                ...upside.map(
                    level => ({

                        ...level,

                        side:
                            "UPSIDE",

                        score:
                            scoreLevel(
                                level
                            )

                    })
                ),

                ...downside.map(
                    level => ({

                        ...level,

                        side:
                            "DOWNSIDE",

                        score:
                            scoreLevel(
                                level
                            )

                    })
                )

            ];

    }


    /*
     * If directional candidates exist,
     * prefer the strongest valid level.
     */

    if (
        candidates.length > 0
    ) {

        candidates.sort(
            (a, b) =>
                b.score -
                a.score
        );


        const best =
            candidates[0];


        const distance =
            Math.abs(
                best.price -
                price
            );


        return {

            price:
                best.price,

            side:
                best.side,

            distance,

            strength:
                best.score

        };

    }


    /*
     * Fallback:
     * use actual recent range boundary.
     */

    const range =
        getMarketRange(
            100
        );


    let fallbackPrice = 0;

    let fallbackSide =
        "RANGE";


    if (
        direction === "LONG"
    ) {

        fallbackPrice =
            range.high;

        fallbackSide =
            "UPSIDE";

    }

    else if (
        direction === "SHORT"
    ) {

        fallbackPrice =
            range.low;

        fallbackSide =
            "DOWNSIDE";

    }

    else {

        const highDistance =
            Math.abs(
                range.high -
                price
            );


        const lowDistance =
            Math.abs(
                price -
                range.low
            );


        if (
            highDistance <
            lowDistance
        ) {

            fallbackPrice =
                range.high;

            fallbackSide =
                "UPSIDE";

        }

        else {

            fallbackPrice =
                range.low;

            fallbackSide =
                "DOWNSIDE";

        }

    }


    return {

        price:
            fallbackPrice,

        side:
            fallbackSide,

        distance:
            Math.abs(
                fallbackPrice -
                price
            ),

        strength:
            1

    };

}


/* ===============================
   BREAK OF STRUCTURE
   =============================== */

function detectStructure() {

    if (
        candles.length < 60
    ) {

        return {

            label:
                "WAITING",

            direction:
                "NONE",

            rangeHigh:
                0,

            rangeLow:
                0,

            rangeSize:
                0

        };

    }


    const price =
        getCurrentPrice();


    const recent =
        candles.slice(
            -60
        );


    const previous =
        recent.slice(
            0,
            -5
        );


    const high =
        Math.max(
            ...previous.map(
                candle =>
                    safeNumber(
                        candle.high
                    )
            )
        );


    const low =
        Math.min(
            ...previous.map(
                candle =>
                    safeNumber(
                        candle.low
                    )
            )
        );


    const rangeSize =
        high - low;


    let direction =
        "NONE";


    let label =
        "RANGE";


    if (
        price >
        high
    ) {

        direction =
            "BULLISH";

        label =
            "BULLISH BOS";

    }

    else if (
        price <
        low
    ) {

        direction =
            "BEARISH";

        label =
            "BEARISH BOS";

    }

    else {

        /*
         * Inside the structure range.
         * Trend still gives directional context.
         */

        const trend =
            detectTrend();


        if (
            trend === "BULLISH"
        ) {

            direction =
                "BULLISH";

            label =
                "BULLISH RANGE";

        }

        else if (
            trend === "BEARISH"
        ) {

            direction =
                "BEARISH";

            label =
                "BEARISH RANGE";

        }

        else {

            direction =
                "NEUTRAL";

            label =
                "NEUTRAL RANGE";

        }

    }


    return {

        label,

        direction,

        rangeHigh:
            high,

        rangeLow:
            low,

        rangeSize

    };

}


/* ===============================
   MARKET CONDITION
   =============================== */

function detectMarketCondition() {

    const trend =
        detectTrend();


    const atrPercent =
        indicatorState.atrPercent;


    const volatilityState =
        indicatorState.volatilityState;


    if (
        trend === "WAITING"
    ) {

        return "WAITING FOR DATA";

    }


    if (
        volatilityState === "HIGH"
    ) {

        return (
            "HIGH VOLATILITY | " +
            atrPercent.toFixed(2) +
            "%"
        );

    }


    if (
        trend === "SIDEWAYS"
    ) {

        return (
            "RANGE MARKET | " +
            volatilityState
        );

    }


    if (
        trend === "BULLISH"
    ) {

        return (
            "BULLISH TREND | " +
            volatilityState
        );

    }


    if (
        trend === "BEARISH"
    ) {

        return (
            "BEARISH TREND | " +
            volatilityState
        );

    }


    return (
        "MIXED MARKET | " +
        volatilityState
    );

}


/* ===============================
   INTELLIGENCE DISPLAY
   =============================== */

function updateMarketIntelligence(
    preferredDirection = "WAIT"
) {

    if (
        !hasEnoughMarketData()
    ) {

        return;

    }


    updateIndicatorState();


    const trend =
        detectTrend();


    const structure =
        detectStructure();


    const magnet =
        calculateLiquidityMagnet(
            preferredDirection
        );


    const condition =
        detectMarketCondition();


    const volumeState =
        indicatorState.volumeState;


    const atrPercent =
        indicatorState.atrPercent;


    const volatilityState =
        indicatorState.volatilityState;


    intelligenceState = {

        trend,

        structure:
            structure.label,

        structureDirection:
            structure.direction,

        rangeHigh:
            structure.rangeHigh,

        rangeLow:
            structure.rangeLow,

        rangeSize:
            structure.rangeSize,

        liquidityMagnet:
            magnet.price,

        liquiditySide:
            magnet.side,

        liquidityDistance:
            magnet.distance,

        liquidityStrength:
            magnet.strength,

        marketCondition:
            condition,

        volatility:
            volatilityState,

        volume:
            volumeState

    };


    /*
     * TREND
     */

    trendBox.textContent =
        trend;


    /*
     * STRUCTURE
     *
     * Includes BOS/range + actual
     * structure range.
     */

    if (
        structure.rangeHigh > 0 &&
        structure.rangeLow > 0
    ) {

        structureBox.textContent =
            structure.label +
            " | Range " +
            formatPrice(
                structure.rangeLow
            ) +
            " - " +
            formatPrice(
                structure.rangeHigh
            );

    }

    else {

        structureBox.textContent =
            structure.label;

    }


    /*
     * LIQUIDITY MAGNET
     *
     * No "@"
     * No "No clear"
     */

    if (
        magnet.price > 0
    ) {

        const sideText =
            magnet.side === "UPSIDE"
     




/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   FINAL SIGNAL + SCANNER ENGINE
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
   SAFE UI HELPER
   =============================== */

function setText(
    element,
    value
) {

    if (element) {

        element.textContent =
            value;

    }

}


/* ===============================
   SIGNAL SCORING
   =============================== */

function calculateFinalScore() {

    const price =
        getCurrentPrice();

    if (
        !price ||
        !hasEnoughMarketData()
    ) {

        return {

            score: 0,

            confidence: 0,

            signal: "WAIT",

            momentum: "NEUTRAL",

            reasons: []

        };

    }


    updateIndicatorState();


    const trend =
        detectTrend();

    const structure =
        detectStructure();

    const rsi =
        indicatorState.rsi;

    const macd =
        indicatorState.macd;

    const vwap =
        indicatorState.vwap;

    const atrPercent =
        indicatorState.atrPercent;


    let score = 0;

    const reasons = [];


    /* ===============================
       TREND
       =============================== */

    if (
        trend === "BULLISH"
    ) {

        score += 25;

        reasons.push(
            "Bullish trend"
        );

    }

    else if (
        trend === "BEARISH"
    ) {

        score -= 25;

        reasons.push(
            "Bearish trend"
        );

    }


    /* ===============================
       EMA STRUCTURE
       =============================== */

    if (
        indicatorState.ema20 >
        indicatorState.ema50 &&
        indicatorState.ema50 >
        indicatorState.ema200
    ) {

        score += 15;

        reasons.push(
            "EMA bullish alignment"
        );

    }

    else if (
        indicatorState.ema20 <
        indicatorState.ema50 &&
        indicatorState.ema50 <
        indicatorState.ema200
    ) {

        score -= 15;

        reasons.push(
            "EMA bearish alignment"
        );

    }


    /* ===============================
       RSI
       =============================== */

    if (
        rsi >= 50 &&
        rsi <= 68
    ) {

        score += 8;

        reasons.push(
            "RSI supports upside"
        );

    }

    else if (
        rsi >= 32 &&
        rsi < 50
    ) {

        score -= 8;

        reasons.push(
            "RSI supports downside"
        );

    }

    else if (
        rsi > 72
    ) {

        score -= 8;

        reasons.push(
            "RSI overbought"
        );

    }

    else if (
        rsi < 28
    ) {

        score += 8;

        reasons.push(
            "RSI oversold"
        );

    }


    /* ===============================
       MACD
       =============================== */

    if (
        macd > 0
    ) {

        score += 12;

        reasons.push(
            "MACD positive"
        );

    }

    else if (
        macd < 0
    ) {

        score -= 12;

        reasons.push(
            "MACD negative"
        );

    }


    /* ===============================
       VWAP
       =============================== */

    if (
        vwap > 0 &&
        price > vwap
    ) {

        score += 8;

        reasons.push(
            "Price above VWAP"
        );

    }

    else if (
        vwap > 0 &&
        price < vwap
    ) {

        score -= 8;

        reasons.push(
            "Price below VWAP"
        );

    }


    /* ===============================
       MARKET STRUCTURE
       =============================== */

    if (
        structure.direction ===
        "BULLISH"
    ) {

        score += 15;

        reasons.push(
            "Bullish structure"
        );

    }

    else if (
        structure.direction ===
        "BEARISH"
    ) {

        score -= 15;

        reasons.push(
            "Bearish structure"
        );

    }


    /* ===============================
       MOMENTUM
       =============================== */

    let momentum =
        "NEUTRAL";


    if (
        score >= 35
    ) {

        momentum =
            "BUY PRESSURE";

    }

    else if (
        score <= -35
    ) {

        momentum =
            "SELL PRESSURE";

    }


    /* ===============================
       VOLATILITY FILTER
       =============================== */

    /*
     * Extremely low volatility means
     * the market has less directional
     * energy. It does not automatically
     * force LONG or SHORT.
     */

    if (
        atrPercent < 0.05
    ) {

        score *= 0.65;

        reasons.push(
            "Low volatility"
        );

    }


    /*
     * Extremely high volatility reduces
     * confidence rather than inventing
     * a direction.
     */

    if (
        atrPercent > 1.5
    ) {

        score *= 0.80;

        reasons.push(
            "High volatility"
        );

    }


    /* ===============================
       FINAL SIGNAL
       =============================== */

    let signal =
        "WAIT";


    if (
        score >= 35
    ) {

        signal =
            "LONG";

    }

    else if (
        score <= -35
    ) {

        signal =
            "SHORT";

    }


    /* ===============================
       CONFIDENCE
       =============================== */

    const absoluteScore =
        Math.abs(score);


    let confidence;


    if (
        signal === "WAIT"
    ) {

        confidence =
            Math.min(
                64,
                Math.max(
                    35,
                    40 +
                    absoluteScore
                )
            );

    }

    else {

        confidence =
            Math.min(
                95,
                Math.max(
                    55,
                    50 +
                    absoluteScore * 0.8
                )
            );

    }


    return {

        score,

        confidence,

        signal,

        momentum,

        reasons

    };

}


/* ===============================
   LIQUIDITY DIRECTION
   =============================== */

function getSignalLiquidity(
    signal
) {

    /*
     * Important:
     * WAIT also gets a real liquidity
     * calculation.
     */

    const magnet =
        calculateLiquidityMagnet(
            signal
        );


    if (
        !magnet ||
        !magnet.price
    ) {

        return null;

    }


    return magnet;

}


/* ===============================
   DISPLAY LIQUIDITY
   =============================== */

function displayLiquidity(
    magnet
) {

    if (
        !magnet ||
        !magnet.price
    ) {

        setText(
            liquidityBox,
            "CALCULATING"
        );

        return;

    }


    let direction =
        "RANGE";


    if (
        magnet.side ===
        "UPSIDE"
    ) {

        direction =
            "UPSIDE";

    }

    else if (
        magnet.side ===
        "DOWNSIDE"
    ) {

        direction =
            "DOWNSIDE";

    }


    /*
     * No @ symbol.
     */

    setText(

        liquidityBox,

        "LIQUIDITY MAGNET " +
        formatPrice(
            magnet.price
        ) +
        " | " +
        direction +
        " | Δ " +
        formatPrice(
            magnet.distance
        )

    );

}


/* ===============================
   SIGNAL COLORS
   =============================== */

function applySignalStyle(
    signal
) {

    if (!signalBox) {

        return;

    }


    if (
        signal === "LONG"
    ) {

        signalBox.style.color =
            "#00ff88";

    }

    else if (
        signal === "SHORT"
    ) {

        signalBox.style.color =
            "#ff4d6d";

    }

    else {

        signalBox.style.color =
            "#ffd166";

    }

}


/* ===============================
   VOICE
   =============================== */

function announceSignal(
    signal
) {

    let message;


    if (
        signal === "LONG"
    ) {

        message =
            "Long opportunity detected";

    }

    else if (
        signal === "SHORT"
    ) {

        message =
            "Short opportunity detected";

    }

    else {

        message =
            "Market is neutral";

    }


    setText(
        voiceText,
        message
    );


    if (
        typeof speechSynthesis !==
        "undefined"
    ) {

        speechSynthesis.cancel();


        const speech =
            new SpeechSynthesisUtterance(
                message
            );


        speech.rate =
            0.9;


        speech.pitch =
            1;


        speech.volume =
            1;


        speechSynthesis.speak(
            speech
        );

    }

}


/* ===============================
   FINAL RESULT DISPLAY
   =============================== */

function displayFinalResult(
    result
) {

    if (!result) {

        return;

    }


    setText(
        signalBox,
        result.signal
    );


    setText(

        confidenceBox,

        result.confidence
            .toFixed(0) +
        "%"

    );


    setText(
        momentumBox,
        result.momentum
    );


    applySignalStyle(
        result.signal
    );


    /*
     * Calculate liquidity after the
     * direction has been established.
     *
     * WAIT still receives a magnet.
     */

    const magnet =
        getSignalLiquidity(
            result.signal
        );


    displayLiquidity(
        magnet
    );


    /*
     * Keep this as analysis time,
     * not a live clock.
     */

    setText(
        signalTime,
        "Analysis complete"
    );


    announceSignal(
        result.signal
    );


    setText(
        scanStatus,
        "Analysis Complete"
    );


    setText(
        engineStatus,
        "Engine Ready"
    );


    /*
     * Log reasons for debugging.
     * Nothing extra is shown on the UI.
     */

    console.log(
        "BTC Scanner Result:",
        {

            signal:
                result.signal,

            score:
                result.score,

            confidence:
                result.confidence,

            momentum:
                result.momentum,

            reasons:
                result.reasons,

            liquidity:
                magnet

        }
    );

}


/* ===============================
   SCAN PROCESS
   =============================== */

function startScan() {

    if (
        scanning
    ) {

        return;

    }


    if (
        !hasEnoughMarketData()
    ) {

        setText(
            scanStatus,
            "Collecting live market data..."
        );

        setText(
            engineStatus,
            "Waiting for market data"
        );

        return;

    }


    scanning = true;


    if (scanBtn) {

        scanBtn.disabled =
            true;

    }


    let seconds = 30;


    setText(
        scanTimer,
        seconds
    );


    setText(
        scanStatus,
        "Scanning market..."
    );


    setText(
        engineStatus,
        "Multi-factor analysis running..."
    );


    /*
     * Update intelligence during scan
     * without changing the final signal.
     */

    updateMarketIntelligence(
        "WAIT"
    );


    const timer =
        setInterval(
            () => {

                seconds--;


                setText(
                    scanTimer,
                    seconds
                );


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        timer
                    );


                    /*
                     * Re-read live market data
                     * immediately before final
                     * calculation.
                     */

                    updateIndicatorState();


                    const result =
                        calculateFinalScore();


                    displayFinalResult(
                        result
                    );


                    /*
                     * Refresh intelligence using
                     * the actual final direction.
                     */

                    updateMarketIntelligence(
                        result.signal
                    );


                    setText(
                        scanTimer,
                        "READY"
                    );


                    if (scanBtn) {

                        scanBtn.disabled =
                            false;

                    }


                    scanning =
                        false;

                }

            },
            1000
        );

}


/* ===============================
   BUTTON CONNECTION
   =============================== */

if (scanBtn) {

    scanBtn.addEventListener(
        "click",
        startScan
    );

}


/* ===============================
   LIVE LIQUIDITY REFRESH
   =============================== */

setInterval(
    () => {

        if (
            !hasEnoughMarketData() ||
            scanning
        ) {

            return;

        }


        /*
         * If a previous signal exists,
         * keep calculating its appropriate
         * liquidity side.
         */

        const currentSignal =
            signalBox
                ? signalBox.textContent
                : "WAIT";


        const validSignal =
            (
                currentSignal === "LONG" ||
                currentSignal === "SHORT" ||
                currentSignal === "WAIT"
            )
                ? currentSignal
                : "WAIT";


        const magnet =
            calculateLiquidityMagnet(
                validSignal
            );


        displayLiquidity(
            magnet
        );


        updateMarketIntelligence(
            validSignal
        );

    },
    5000
);


/* ===============================
   ENGINE READY
   =============================== */

if (
    hasEnoughMarketData()
) {

    setText(
        engineStatus,
        "Engine Ready"
    );

           }
   
