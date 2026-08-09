/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   REAL-TIME MARKET DATA + MOVING LINE CHART
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

const priceCanvas =
    document.getElementById("priceChart");


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
   DATA SETTINGS
   =============================== */

const SYMBOL = "BTCUSDT";

const INTERVAL = "1m";

const HISTORY_LIMIT = 500;


/* ===============================
   NUMBER FORMAT
   =============================== */

function formatPrice(value) {

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
        Number(market.changePercent);


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
}


/* ===============================
   HISTORICAL KLINES
   =============================== */

async function loadHistory() {

    try {

        marketState.textContent =
            "LOADING DATA";


        const response =
            await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${HISTORY_LIMIT}`
            );


        if (!response.ok) {

            throw new Error(
                "Binance history request failed"
            );

        }


        const data =
            await response.json();


        candles = [];

        closes = [];

        highs = [];

        lows = [];

        volumes = [];


        data.forEach(item => {

            const candle = {

                time: Number(item[0]),

                open: Number(item[1]),

                high: Number(item[2]),

                low: Number(item[3]),

                close: Number(item[4]),

                volume: Number(item[5])

            };


            candles.push(candle);

            closes.push(candle.close);

            highs.push(candle.high);

            lows.push(candle.low);

            volumes.push(candle.volume);

        });


        if (closes.length === 0) {

            throw new Error(
                "No BTC market data received"
            );

        }


        market.price =
            closes[closes.length - 1];


        updatePriceUI();

        createChart();


        marketState.textContent =
            "LIVE";


        priceTime.textContent =
            "Live Market Price";


    }

    catch (error) {

        console.error(
            "History error:",
            error
        );


        marketState.textContent =
            "DATA ERROR";

        priceTime.textContent =
            "Waiting for market data...";
    }
}


/* ===============================
   24 HOUR TICKER
   =============================== */

async function load24HourChange() {

    try {

        const response =
            await fetch(
                `https://api.binance.com/api/v3/ticker/24hr?symbol=${SYMBOL}`
            );


        if (!response.ok) {

            throw new Error(
                "24H ticker request failed"
            );

        }


        const data =
            await response.json();


        market.change =
            Number(data.priceChange);


        market.changePercent =
            Number(data.priceChangePercent);


        if (Number.isFinite(Number(data.lastPrice))) {

            market.price =
                Number(data.lastPrice);

        }


        updatePriceUI();

    }

    catch (error) {

        console.error(
            "24H ticker error:",
            error
        );

    }
}


/* ===============================
   BINANCE WEBSOCKET
   =============================== */

let socket = null;

let reconnectTimer = null;


function connectSocket() {

    if (
        socket &&
        (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
        )
    ) {

        return;

    }


    marketState.textContent =
        "CONNECTING";


    socket =
        new WebSocket(
            "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@kline_1m"
        );


    socket.onopen = () => {

        marketState.textContent =
            "LIVE";

        console.log(
            "BTC WebSocket connected"
        );

    };


    socket.onmessage = event => {

        try {

            const packet =
                JSON.parse(event.data);


            const data =
                packet.data;


            if (!data) {
                return;
            }


            /* =========================
               24H TICKER
            ========================= */

            if (data.e === "24hrTicker") {

                market.price =
                    Number(data.c);

                market.change =
                    Number(data.p);

                market.changePercent =
                    Number(data.P);

                market.volume =
                    Number(data.v);

                updatePriceUI();

            }


            /* =========================
               LIVE 1M CANDLE
            ========================= */

            if (data.e === "kline") {

                updateLiveCandle(
                    data.k
                );

            }

        }

        catch (error) {

            console.error(
                "WebSocket message error:",
                error
            );

        }

    };


    socket.onerror = error => {

        console.error(
            "WebSocket error:",
            error
        );

        marketState.textContent =
            "RECONNECTING";

    };


    socket.onclose = () => {

        marketState.textContent =
            "RECONNECTING";


        clearTimeout(
            reconnectTimer
        );


        reconnectTimer =
            setTimeout(
                connectSocket,
                3000
            );

    };

}


/* ===============================
   UPDATE LIVE CANDLE
   =============================== */

function updateLiveCandle(data) {

    if (!data) {
        return;
    }


    const candleTime =
        Number(data.t);

    const close =
        Number(data.c);

    const high =
        Number(data.h);

    const low =
        Number(data.l);

    const volume =
        Number(data.v);


    market.price =
        close;

    market.volume =
        volume;


    updatePriceUI();


    if (candles.length === 0) {

        return;

    }


    const last =
        candles[candles.length - 1];


    /* =========================
       SAME CANDLE
    ========================= */

    if (
        Number(last.time) === candleTime
    ) {

        last.close = close;

        last.high = high;

        last.low = low;

        last.volume = volume;


        closes[
            closes.length - 1
        ] = close;


        highs[
            highs.length - 1
        ] = high;


        lows[
            lows.length - 1
        ] = low;


        volumes[
            volumes.length - 1
        ] = volume;


        updateChartLastPoint(
            close
        );

    }


    /* =========================
       NEW CANDLE
    ========================= */

    else if (
        candleTime > Number(last.time)
    ) {

        const newCandle = {

            time: candleTime,

            open: Number(data.o),

            high: high,

            low: low,

            close: close,

            volume: volume

        };


        candles.push(newCandle);

        closes.push(close);

        highs.push(high);

        lows.push(low);

        volumes.push(volume);


        /* Keep memory controlled */

        if (candles.length > 500) {

            candles.shift();

            closes.shift();

            highs.shift();

            lows.shift();

            volumes.shift();

        }


        addChartPoint(close);

    }


    priceTime.textContent =
        "Live Market Price";
}


/* ===============================
   CHART
   =============================== */

let chart = null;


function createChart() {

    if (!priceCanvas) {
        return;
    }


    const ctx =
        priceCanvas.getContext("2d");


    if (chart) {

        chart.destroy();

        chart = null;

    }


    const chartData =
        closes.slice(-120);


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

                    labels: labels,

                    datasets: [

                        {

                            label: "BTC",

                            data: chartData,

                            borderColor:
                                "#00f5ff",

                            backgroundColor:
                                "rgba(0,245,255,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 0,

                            pointHoverRadius: 0,

                            fill: true

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    animation: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },


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

                            display: false,

                            beginAtZero: false

                        }

                    },


                    elements: {

                        line: {

                            capBezierPoints: true

                        }

                    }

                }

            }
        );
}


/* ===============================
   UPDATE LAST CHART POINT
   =============================== */

function updateChartLastPoint(price) {

    if (!chart) {
        return;
    }


    const data =
        chart.data.datasets[0].data;


    if (data.length === 0) {

        data.push(price);

    }

    else {

        data[data.length - 1] =
            price;

    }


    chart.update("none");
}


/* ===============================
   ADD NEW CHART POINT
   =============================== */

function addChartPoint(price) {

    if (!chart) {

        createChart();

        return;

    }


    chart.data.datasets[0].data.push(
        price
    );

    chart.data.labels.push("");


    const maxPoints = 120;


    while (
        chart.data.datasets[0].data.length >
        maxPoints
    ) {

        chart.data.datasets[0].data.shift();

        chart.data.labels.shift();

    }


    chart.update("none");
}


/* ===============================
   PERIODIC 24H REFRESH
   =============================== */

setInterval(
    load24HourChange,
    30000
);


/* ===============================
   START MARKET ENGINE
   =============================== */

(async function startMarketEngine() {

    await loadHistory();

    await load24HourChange();

    connectSocket();

})();





/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   BACKGROUND INDICATOR ENGINE
   ================================================== */


/* ===============================
   INDICATOR SETTINGS
   =============================== */

const RSI_PERIOD = 14;

const EMA_FAST = 20;

const EMA_SLOW = 50;

const EMA_TREND = 200;

const MACD_FAST = 12;

const MACD_SLOW = 26;

const MACD_SIGNAL = 9;

const ATR_PERIOD = 14;


/* ===============================
   SAFE DATA CHECK
   =============================== */

function hasEnoughData(period = 50) {

    return (
        Array.isArray(closes) &&
        closes.length >= period
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

        return null;

    }


    const slice =
        values.slice(
            values.length - period
        );


    const sum =
        slice.reduce(
            (total, value) =>
                total + Number(value),
            0
        );


    return sum / period;

}


/* ===============================
   PROPER EMA
   =============================== */

function calculateEMA(
    period,
    values = closes
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return null;

    }


    const multiplier =
        2 / (period + 1);


    let ema =
        calculateSMA(
            values.slice(0, period),
            period
        );


    if (!Number.isFinite(ema)) {

        return null;

    }


    for (
        let i = period;
        i < values.length;
        i++
    ) {

        const price =
            Number(values[i]);


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
   WILDER RSI
   =============================== */

function calculateRSI(
    period = RSI_PERIOD
) {

    if (
        !Array.isArray(closes) ||
        closes.length <= period
    ) {

        return null;

    }


    let gain = 0;

    let loss = 0;


    /* Initial Wilder averages */

    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const change =
            Number(closes[i]) -
            Number(closes[i - 1]);


        if (change > 0) {

            gain += change;

        }

        else {

            loss += Math.abs(change);

        }

    }


    let avgGain =
        gain / period;

    let avgLoss =
        loss / period;


    /* Continue Wilder smoothing */

    for (
        let i = period + 1;
        i < closes.length;
        i++
    ) {

        const change =
            Number(closes[i]) -
            Number(closes[i - 1]);


        const currentGain =
            change > 0
                ? change
                : 0;


        const currentLoss =
            change < 0
                ? Math.abs(change)
                : 0;


        avgGain =
            (
                (avgGain * (period - 1)) +
                currentGain
            ) / period;


        avgLoss =
            (
                (avgLoss * (period - 1)) +
                currentLoss
            ) / period;

    }


    /* Prevent RSI from jumping to 100 */

    if (avgGain === 0 && avgLoss === 0) {

        return 50;

    }


    if (avgLoss === 0) {

        return 99;

    }


    if (avgGain === 0) {

        return 1;

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

function calculateMACD() {

    if (
        closes.length <
        MACD_SLOW + MACD_SIGNAL
    ) {

        return {

            value: null,

            signal: null,

            histogram: null

        };

    }


    const fastMultiplier =
        2 / (MACD_FAST + 1);


    const slowMultiplier =
        2 / (MACD_SLOW + 1);


    let fastEMA =
        calculateSMA(
            closes.slice(
                0,
                MACD_FAST
            ),
            MACD_FAST
        );


    let slowEMA =
        calculateSMA(
            closes.slice(
                0,
                MACD_SLOW
            ),
            MACD_SLOW
        );


    if (
        !Number.isFinite(fastEMA) ||
        !Number.isFinite(slowEMA)
    ) {

        return {

            value: null,

            signal: null,

            histogram: null

        };

    }


    const macdValues = [];


    for (
        let i = 0;
        i < closes.length;
        i++
    ) {

        const price =
            Number(closes[i]);


        if (i >= MACD_FAST) {

            fastEMA =
                (
                    price - fastEMA
                ) *
                fastMultiplier +
                fastEMA;

        }


        if (i >= MACD_SLOW) {

            slowEMA =
                (
                    price - slowEMA
                ) *
                slowMultiplier +
                slowEMA;


            macdValues.push(
                fastEMA - slowEMA
            );

        }

    }


    if (
        macdValues.length <
        MACD_SIGNAL
    ) {

        return {

            value: null,

            signal: null,

            histogram: null

        };

    }


    const signal =
        calculateEMA(
            MACD_SIGNAL,
            macdValues
        );


    const value =
        macdValues[
            macdValues.length - 1
        ];


    return {

        value: value,

        signal: signal,

        histogram:
            value - signal

    };

}


/* ===============================
   VWAP
   =============================== */

function calculateVWAP() {

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {

        return null;

    }


    let totalVolume = 0;

    let totalValue = 0;


    candles.forEach(
        candle => {

            const high =
                Number(candle.high);

            const low =
                Number(candle.low);

            const close =
                Number(candle.close);

            const volume =
                Number(candle.volume);


            if (
                !Number.isFinite(high) ||
                !Number.isFinite(low) ||
                !Number.isFinite(close) ||
                !Number.isFinite(volume)
            ) {

                return;

            }


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

        }
    );


    if (totalVolume === 0) {

        return null;

    }


    return (
        totalValue /
        totalVolume
    );

}


/* ===============================
   ATR
   =============================== */

function calculateATR(
    period = ATR_PERIOD
) {

    if (
        !Array.isArray(candles) ||
        candles.length <= period
    ) {

        return null;

    }


    const trueRanges = [];


    const start =
        Math.max(
            1,
            candles.length - period
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
            Number(current.high);

        const low =
            Number(current.low);

        const previousClose =
            Number(previous.close);


        const range =
            Math.max(

                high - low,

                Math.abs(
                    high - previousClose
                ),

                Math.abs(
                    low - previousClose
                )

            );


        trueRanges.push(range);

    }


    if (trueRanges.length === 0) {

        return null;

    }


    return (
        trueRanges.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        trueRanges.length
    );

}


/* ===============================
   VOLUME ANALYSIS
   =============================== */

function getVolumeAnalysis() {

    if (
        !Array.isArray(volumes) ||
        volumes.length < 20
    ) {

        return {

            value: 0,

            average: 0,

            status: "COLLECTING"

        };

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            (sum, value) =>
                sum + Number(value),
            0
        ) / recent.length;


    const current =
        Number(
            volumes[
                volumes.length - 1
            ]
        );


    let status =
        "NORMAL";


    if (
        current >
        average * 1.5
    ) {

        status = "HIGH";

    }

    else if (
        current <
        average * 0.7
    ) {

        status = "LOW";

    }


    return {

        value: current,

        average: average,

        status: status

    };

}


/* ===============================
   VOLATILITY
   =============================== */

function getVolatilityAnalysis() {

    if (
        !Array.isArray(closes) ||
        closes.length < 20
    ) {

        return {

            value: 0,

            percent: 0,

            status: "COLLECTING"

        };

    }


    const recent =
        closes.slice(-20);


    const high =
        Math.max(...recent);


    const low =
        Math.min(...recent);


    const value =
        high - low;


    const currentPrice =
        Number(
            market.price
        );


    const percent =
        currentPrice > 0
            ? (
                value /
                currentPrice
            ) * 100
            : 0;


    let status =
        "NORMAL";


    if (percent >= 2) {

        status = "HIGH";

    }

    else if (percent <= 0.7) {

        status = "LOW";

    }


    return {

        value: value,

        percent: percent,

        status: status

    };

}


/* ===============================
   INDICATOR SNAPSHOT
   =============================== */

function getIndicatorSnapshot() {

    const rsi =
        calculateRSI();


    const ema20 =
        calculateEMA(
            EMA_FAST
        );


    const ema50 =
        calculateEMA(
            EMA_SLOW
        );


    const ema200 =
        calculateEMA(
            EMA_TREND
        );


    const macd =
        calculateMACD();


    const vwap =
        calculateVWAP();


    const atr =
        calculateATR();


    const volume =
        getVolumeAnalysis();


    const volatility =
        getVolatilityAnalysis();


    return {

        rsi,

        ema20,

        ema50,

        ema200,

        macd,

        vwap,

        atr,

        volume,

        volatility

    };

}


/* ===============================
   BACKGROUND UPDATE
   =============================== */

let latestIndicators = null;


function updateBackgroundIndicators() {

    if (
        closes.length < 50
    ) {

        return;

    }


    latestIndicators =
        getIndicatorSnapshot();

}


setInterval(
    updateBackgroundIndicators,
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

const marketVolumeBox =
    document.getElementById("marketVolume");

const marketVolatilityBox =
    document.getElementById("marketVolatility");


/* ===============================
   LIQUIDITY SETTINGS
   =============================== */

const MIN_MAGNET_DISTANCE = 300;

const PREFERRED_MAGNET_DISTANCE = 400;

const MAX_MAGNET_DISTANCE = 1500;

const LIQUIDITY_LOOKBACK = 120;


/* ===============================
   BASIC PRICE HELPERS
   =============================== */

function getCurrentPrice() {

    const price =
        Number(market.price);

    return Number.isFinite(price)
        ? price
        : 0;

}


/* ===============================
   RECENT SWING LEVELS
   =============================== */

function getLiquidityLevels() {

    if (
        !Array.isArray(candles) ||
        candles.length < 10
    ) {

        return {

            highs: [],

            lows: []

        };

    }


    const recent =
        candles.slice(
            -LIQUIDITY_LOOKBACK
        );


    const highs = [];

    const lows = [];


    /*
     * Find local swing highs/lows.
     * These are actual candle-derived
     * market levels, not random prices.
     */

    for (
        let i = 2;
        i < recent.length - 2;
        i++
    ) {

        const current =
            recent[i];


        const high =
            Number(current.high);

        const low =
            Number(current.low);


        const leftHigh =
            Number(recent[i - 1].high);

        const rightHigh =
            Number(recent[i + 1].high);

        const leftLow =
            Number(recent[i - 1].low);

        const rightLow =
            Number(recent[i + 1].low);


        if (
            high >= leftHigh &&
            high >= rightHigh
        ) {

            highs.push(high);

        }


        if (
            low <= leftLow &&
            low <= rightLow
        ) {

            lows.push(low);

        }

    }


    /*
     * Also include recent extreme levels.
     */

    const recentHigh =
        Math.max(
            ...recent.map(
                candle =>
                    Number(candle.high)
            )
        );


    const recentLow =
        Math.min(
            ...recent.map(
                candle =>
                    Number(candle.low)
            )
        );


    if (Number.isFinite(recentHigh)) {

        highs.push(recentHigh);

    }


    if (Number.isFinite(recentLow)) {

        lows.push(recentLow);

    }


    return {

        highs: [
            ...new Set(
                highs
                    .filter(Number.isFinite)
                    .map(
                        value =>
                            Number(
                                value.toFixed(2)
                            )
                    )
            )
        ],

        lows: [
            ...new Set(
                lows
                    .filter(Number.isFinite)
                    .map(
                        value =>
                            Number(
                                value.toFixed(2)
                            )
                    )
            )
        ]

    };

}


/* ===============================
   CLUSTER SIMILAR LEVELS
   =============================== */

function clusterLiquidityLevels(
    levels
) {

    if (!levels.length) {

        return [];

    }


    const sorted =
        [...levels].sort(
            (a, b) => a - b
        );


    const clusters = [];

    let currentCluster = [
        sorted[0]
    ];


    /*
     * BTC levels close to each other
     * are treated as one liquidity zone.
     */

    for (
        let i = 1;
        i < sorted.length;
        i++
    ) {

        const previous =
            currentCluster[
                currentCluster.length - 1
            ];


        const current =
            sorted[i];


        if (
            Math.abs(
                current - previous
            ) <= 80
        ) {

            currentCluster.push(
                current
            );

        }

        else {

            clusters.push(
                currentCluster
            );

            currentCluster = [
                current
            ];

        }

    }


    clusters.push(
        currentCluster
    );


    return clusters.map(
        cluster => {

            const average =
                cluster.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / cluster.length;


            return {

                price:
                    Number(
                        average.toFixed(2)
                    ),

                strength:
                    cluster.length

            };

        }
    );

}


/* ===============================
   LIQUIDITY MAGNET
   =============================== */

function findLiquidityMagnet(
    direction
) {

    const price =
        getCurrentPrice();


    if (
        !price ||
        candles.length < 20
    ) {

        return {

            price: null,

            distance: 0,

            side: "NONE",

            strength: 0

        };

    }


    const levels =
        getLiquidityLevels();


    let rawLevels;


    /*
     * LONG:
     * look ABOVE current price.
     *
     * SHORT:
     * look BELOW current price.
     */

    if (direction === "LONG") {

        rawLevels =
            levels.highs.filter(
                level =>
                    level >
                    price +
                    MIN_MAGNET_DISTANCE
            );

    }

    else if (direction === "SHORT") {

        rawLevels =
            levels.lows.filter(
                level =>
                    level <
                    price -
                    MIN_MAGNET_DISTANCE
            );

    }

    else {

        /*
         * WAIT has no directional magnet.
         */

        return {

            price: null,

            distance: 0,

            side: "NONE",

            strength: 0

        };

    }


    const clusters =
        clusterLiquidityLevels(
            rawLevels
        );


    if (!clusters.length) {

        return {

            price: null,

            distance: 0,

            side: "NONE",

            strength: 0

        };

    }


    /*
     * Score each candidate.
     *
     * Stronger swing cluster gets
     * preference, while a reasonable
     * distance is also preferred.
     */

    const candidates =
        clusters
            .map(level => {

                const distance =
                    Math.abs(
                        level.price -
                        price
                    );


                const distanceScore =
                    Math.max(
                        0,
                        1 -
                        Math.abs(
                            distance -
                            PREFERRED_MAGNET_DISTANCE
                        ) /
                        PREFERRED_MAGNET_DISTANCE
                    );


                const strengthScore =
                    Math.min(
                        level.strength,
                        5
                    ) / 5;


                let score =
                    (
                        distanceScore * 0.55
                    ) +
                    (
                        strengthScore * 0.45
                    );


                /*
                 * Very distant levels are
                 * still allowed but receive
                 * lower preference.
                 */

                if (
                    distance >
                    MAX_MAGNET_DISTANCE
                ) {

                    score *= 0.35;

                }


                return {

                    price:
                        level.price,

                    distance:
                        distance,

                    strength:
                        level.strength,

                    score:
                        score

                };

            })
            .sort(
                (a, b) =>
                    b.score - a.score
            );


    const selected =
        candidates[0];


    if (!selected) {

        return {

            price: null,

            distance: 0,

            side: "NONE",

            strength: 0

        };

    }


    return {

        price:
            selected.price,

        distance:
            selected.distance,

        side:
            direction === "LONG"
                ? "UP"
                : "DOWN",

        strength:
            selected.strength

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


    const price =
        getCurrentPrice();


    const ema20 =
        calculateEMA(20);


    const ema50 =
        calculateEMA(50);


    if (
        !Number.isFinite(ema20) ||
        !Number.isFinite(ema50)
    ) {

        return "WAITING";

    }


    /*
     * Strong bullish structure.
     */

    if (
        price > ema20 &&
        ema20 > ema50
    ) {

        return "BULLISH";

    }


    /*
     * Strong bearish structure.
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

function detectMarketStructure() {

    if (
        candles.length < 20
    ) {

        return "WAITING";

    }


    const recent =
        candles.slice(-20);


    const firstClose =
        Number(
            recent[0].close
        );


    const lastClose =
        Number(
            recent[recent.length - 1].close
        );


    const highs =
        recent.map(
            candle =>
                Number(candle.high)
        );


    const lows =
        recent.map(
            candle =>
                Number(candle.low)
        );


    const highest =
        Math.max(...highs);


    const lowest =
        Math.min(...lows);


    /*
     * Breakout above recent structure.
     */

    if (
        lastClose >= highest * 0.9995 &&
        lastClose > firstClose
    ) {

        return "BULLISH BOS";

    }


    /*
     * Breakdown below recent structure.
     */

    if (
        lastClose <= lowest * 1.0005 &&
        lastClose < firstClose
    ) {

        return "BEARISH BOS";

    }


    /*
     * Direction based on recent movement.
     */

    const movement =
        lastClose -
        firstClose;


    const movementPercent =
        Math.abs(
            movement /
            firstClose
        ) * 100;


    if (
        movementPercent < 0.25
    ) {

        return "RANGE";

    }


    if (movement > 0) {

        return "BULLISH";

    }


    if (movement < 0) {

        return "BEARISH";

    }


    return "RANGE";

}


/* ===============================
   MARKET CONDITION
   =============================== */

function detectMarketCondition() {

    const volatility =
        getVolatilityAnalysis();


    const trend =
        detectTrend();


    if (
        volatility.status === "HIGH"
    ) {

        return "HIGH VOLATILITY";

    }


    if (
        trend === "SIDEWAYS"
    ) {

        return "RANGE MARKET";

    }


    if (
        trend === "WAITING"
    ) {

        return "COLLECTING DATA";

    }


    return "TRENDING MARKET";

}


/* ===============================
   FORMAT VOLUME
   =============================== */

function formatVolume(value) {

    if (!Number.isFinite(value)) {

        return "--";

    }


    if (value >= 1000000) {

        return (
            (value / 1000000)
                .toFixed(2) +
            "M BTC"
        );

    }


    if (value >= 1000) {

        return (
            (value / 1000)
                .toFixed(2) +
            "K BTC"
        );

    }


    return (
        value.toFixed(2) +
        " BTC"
    );

}


/* ===============================
   UPDATE INTELLIGENCE UI
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
        detectMarketStructure();


    const volume =
        getVolumeAnalysis();


    const volatility =
        getVolatilityAnalysis();


    trendBox.textContent =
        trend;


    structureBox.textContent =
        structure;


    marketVolumeBox.textContent =
        formatVolume(
            volume.value
        ) +
        " • " +
        volume.status;


    marketVolatilityBox.textContent =
        volatility.value.toFixed(2) +
        " • " +
        volatility.status;

}


/* ===============================
   PERIODIC INTELLIGENCE UPDATE
   =============================== */

setInterval(
    updateMarketIntelligence,
    3000
);


/* ===============================
   INITIAL UPDATE
   =============================== */

setTimeout(
    updateMarketIntelligence,
    2500
);




/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   SCANNER + SIGNAL + LIQUIDITY + VOICE
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

const voiceText =
    document.getElementById("voiceText");


/* ===============================
   SCANNER SETTINGS
   =============================== */

const SCAN_SECONDS = 30;

const MIN_DATA_FOR_SCAN = 100;

let scanning = false;


/* ===============================
   SCORE LIMITS
   =============================== */

const MAX_SCORE = 100;


/* ===============================
   SAFE SCORE
   =============================== */

function clampScore(value) {

    return Math.max(
        -MAX_SCORE,
        Math.min(
            MAX_SCORE,
            value
        )
    );

}


/* ===============================
   FINAL SCORING ENGINE
   =============================== */

function calculateScore() {

    let score = 0;

    const reasons = [];

    const indicators =
        getIndicatorSnapshot();


    const trend =
        detectTrend();


    const structure =
        detectMarketStructure();


    const price =
        getCurrentPrice();


    if (
        !price ||
        !indicators
    ) {

        return {

            score: 0,

            reasons: [
                "Insufficient market data"
            ]

        };

    }


    /* =========================
       TREND
    ========================= */

    if (trend === "BULLISH") {

        score += 25;

        reasons.push(
            "Bullish trend"
        );

    }

    else if (trend === "BEARISH") {

        score -= 25;

        reasons.push(
            "Bearish trend"
        );

    }


    /* =========================
       EMA STRUCTURE
    ========================= */

    if (
        Number.isFinite(
            indicators.ema20
        ) &&
        Number.isFinite(
            indicators.ema50
        )
    ) {

        if (
            price >
            indicators.ema20 &&
            indicators.ema20 >
            indicators.ema50
        ) {

            score += 15;

            reasons.push(
                "EMA bullish alignment"
            );

        }

        else if (
            price <
            indicators.ema20 &&
            indicators.ema20 <
            indicators.ema50
        ) {

            score -= 15;

            reasons.push(
                "EMA bearish alignment"
            );

        }

    }


    /* =========================
       RSI
    ========================= */

    const rsi =
        Number(indicators.rsi);


    if (Number.isFinite(rsi)) {

        /*
         * Avoid treating RSI 70+ as
         * an automatic short.
         */

        if (
            rsi >= 52 &&
            rsi <= 68
        ) {

            score += 10;

            reasons.push(
                "Positive RSI momentum"
            );

        }

        else if (
            rsi >= 32 &&
            rsi <= 48
        ) {

            score -= 10;

            reasons.push(
                "Negative RSI momentum"
            );

        }

        else if (rsi < 25) {

            score += 8;

            reasons.push(
                "Deep oversold"
            );

        }

        else if (rsi > 75) {

            score -= 8;

            reasons.push(
                "Deep overbought"
            );

        }

    }


    /* =========================
       MACD
    ========================= */

    if (
        indicators.macd &&
        Number.isFinite(
            indicators.macd.histogram
        )
    ) {

        const histogram =
            indicators.macd.histogram;


        if (histogram > 0) {

            score += 15;

            reasons.push(
                "MACD bullish"
            );

        }

        else if (histogram < 0) {

            score -= 15;

            reasons.push(
                "MACD bearish"
            );

        }

    }


    /* =========================
       VWAP
    ========================= */

    if (
        Number.isFinite(
            indicators.vwap
        )
    ) {

        if (
            price >
            indicators.vwap
        ) {

            score += 10;

            reasons.push(
                "Price above VWAP"
            );

        }

        else if (
            price <
            indicators.vwap
        ) {

            score -= 10;

            reasons.push(
                "Price below VWAP"
            );

        }

    }


    /* =========================
       MARKET STRUCTURE
    ========================= */

    if (
        structure ===
        "BULLISH BOS"
    ) {

        score += 15;

        reasons.push(
            "Bullish structure break"
        );

    }

    else if (
        structure ===
        "BEARISH BOS"
    ) {

        score -= 15;

        reasons.push(
            "Bearish structure break"
        );

    }

    else if (
        structure ===
        "BULLISH"
    ) {

        score += 5;

    }

    else if (
        structure ===
        "BEARISH"
    ) {

        score -= 5;

    }


    /* =========================
       VOLUME CONFIRMATION
    ========================= */

    if (
        indicators.volume &&
        indicators.volume.status ===
        "HIGH"
    ) {

        /*
         * High volume confirms the
         * existing direction instead
         * of blindly adding bullish points.
         */

        if (score > 0) {

            score += 8;

            reasons.push(
                "High volume confirms buyers"
            );

        }

        else if (score < 0) {

            score -= 8;

            reasons.push(
                "High volume confirms sellers"
            );

        }

    }


    return {

        score:
            clampScore(score),

        reasons:
            reasons

    };

}


/* ===============================
   SIGNAL GENERATION
   =============================== */

function generateSignal() {

    const result =
        calculateScore();


    const score =
        result.score;


    let signal =
        "WAIT";


    /*
     * Require stronger agreement
     * before producing directional bias.
     */

    if (score >= 45) {

        signal =
            "LONG";

    }

    else if (score <= -45) {

        signal =
            "SHORT";

    }


    /*
     * Confidence here is an internal
     * signal-strength score, NOT a
     * guaranteed probability of profit.
     */

    let confidence;


    if (signal === "WAIT") {

        confidence =
            Math.min(
                64,
                50 +
                Math.abs(score) * 0.35
            );

    }

    else {

        confidence =
            Math.min(
                95,
                55 +
                (
                    Math.abs(score) -
                    45
                ) * 0.75
            );

    }


    return {

        signal:
            signal,

        confidence:
            confidence,

        score:
            score,

        reasons:
            result.reasons

    };

}


/* ===============================
   MOMENTUM TEXT
   =============================== */

function getMomentum(signal) {

    const indicators =
        getIndicatorSnapshot();


    if (!indicators) {

        return "NEUTRAL";

    }


    const rsi =
        Number(indicators.rsi);


    const macd =
        indicators.macd;


    if (
        signal === "LONG"
    ) {

        if (
            Number.isFinite(rsi) &&
            rsi >= 60
        ) {

            return "STRONG BUY";

        }

        return "BUY PRESSURE";

    }


    if (
        signal === "SHORT"
    ) {

        if (
            Number.isFinite(rsi) &&
            rsi <= 40
        ) {

            return "STRONG SELL";

        }

        return "SELL PRESSURE";

    }


    if (
        macd &&
        Number.isFinite(
            macd.histogram
        )
    ) {

        if (
            Math.abs(
                macd.histogram
            ) < 1
        ) {

            return "NEUTRAL";

        }

    }


    return "NEUTRAL";

}


/* ===============================
   LIQUIDITY DISPLAY
   =============================== */

function getLiquidityDisplay(
    signal
) {

    if (
        signal === "WAIT"
    ) {

        return "Waiting";

    }


    const magnet =
        findLiquidityMagnet(
            signal
        );


    if (
        !magnet ||
        !Number.isFinite(
            magnet.price
        )
    ) {

        return "No clear magnet";

    }


    const distance =
        Math.round(
            magnet.distance
        );


    /*
     * No "@" symbol.
     */

    return (
        "$" +
        magnet.price.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) +
        "  •  " +
        distance +
        " away"
    );

}


/* ===============================
   SIGNAL COLOUR
   =============================== */

function setSignalColour(
    signal
) {

    if (
        signal === "LONG"
    ) {

        signalBox.style.color =
            "#00ff88";

        signalBox.style.textShadow =
            "0 0 20px rgba(0,255,136,.35)";

    }

    else if (
        signal === "SHORT"
    ) {

        signalBox.style.color =
            "#ff4d6d";

        signalBox.style.textShadow =
            "0 0 20px rgba(255,77,109,.35)";

    }

    else {

        signalBox.style.color =
            "#ffd166";

        signalBox.style.textShadow =
            "0 0 20px rgba(255,209,102,.25)";

    }

}


/* ===============================
   VOICE
   =============================== */

function speak(text) {

    voiceText.textContent =
        text;


    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();


        const message =
            new SpeechSynthesisUtterance(
                text
            );


        message.rate =
            0.9;

        message.pitch =
            1;


        window.speechSynthesis.speak(
            message
        );

    }

}


/* ===============================
   DISPLAY RESULT
   =============================== */

function displaySignal(data) {

    const signal =
        data.signal;


    signalBox.textContent =
        signal;


    confidenceBox.textContent =
        data.confidence.toFixed(0) +
        "%";


    momentumBox.textContent =
        getMomentum(
            signal
        );


    liquidityBox.textContent =
        getLiquidityDisplay(
            signal
        );


    setSignalColour(
        signal
    );


    /* =========================
       VOICE
    ========================= */

    if (
        signal === "LONG"
    ) {

        speak(
            "Long opportunity detected"
        );

    }

    else if (
        signal === "SHORT"
    ) {

        speak(
            "Short opportunity detected"
        );

    }

    else {

        speak(
            "Market is neutral"
        );

    }


    /* =========================
       STATUS
    ========================= */

    if (
        signal === "LONG"
    ) {

        scanStatus.textContent =
            "Bullish analysis complete";

    }

    else if (
        signal === "SHORT"
    ) {

        scanStatus.textContent =
            "Bearish analysis complete";

    }

    else {

        scanStatus.textContent =
            "No clear directional setup";

    }


    engineStatus.textContent =
        "Engine Ready";

}


/* ===============================
   SCAN BUTTON
   =============================== */

scanBtn.addEventListener(
    "click",
    startScan
);


/* ===============================
   START 30 SECOND SCAN
   =============================== */

function startScan() {

    if (scanning) {

        return;

    }


    /*
     * Wait until enough historical
     * data is available.
     */

    if (
        closes.length <
        MIN_DATA_FOR_SCAN
    ) {

        scanStatus.textContent =
            "Collecting more market data...";

        engineStatus.textContent =
            "Engine warming up";

        return;

    }


    scanning = true;

    scanBtn.disabled = true;


    let seconds =
        SCAN_SECONDS;


    scanTimer.textContent =
        seconds;


    scanStatus.textContent =
        "Scanning market...";


    engineStatus.textContent =
        "Analysing price structure";


    /*
     * Countdown.
     */

    const timer =
        setInterval(
            () => {

                seconds--;

                scanTimer.textContent =
                    seconds;


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        timer
                    );


                    completeScan();

                }

            },
            1000
        );

}


/* ===============================
   COMPLETE SCAN
   =============================== */

function completeScan() {

    try {

        scanStatus.textContent =
            "Finalising analysis...";


        engineStatus.textContent =
            "Calculating market bias";


        /*
         * Refresh latest data before
         * making the final decision.
         */

        updateBackgroundIndicators();

        updateMarketIntelligence();


        const result =
            generateSignal();


        displaySignal(
            result
        );


        scanTimer.textContent =
            "READY";


    }

    catch (error) {

        console.error(
            "Scanner error:",
            error
        );


        scanTimer.textContent =
            "READY";


        scanStatus.textContent =
            "Analysis error — retry";


        engineStatus.textContent =
            "Engine Ready";

    }


    scanBtn.disabled =
        false;

    scanning =
        false;

}


/* ===============================
   ENGINE STATUS
   =============================== */

setInterval(
    () => {

        if (
            !scanning &&
            marketState.textContent ===
            "LIVE"
        ) {

            engineStatus.textContent =
                "Engine Ready";

        }

    },
    5000
);


/* ===============================
   INITIAL STATE
   =============================== */

signalBox.textContent =
    "WAIT";


confidenceBox.textContent =
    "0%";


momentumBox.textContent =
    "Neutral";


liquidityBox.textContent =
    "Waiting";


voiceText.textContent =
    "Voice system ready";
