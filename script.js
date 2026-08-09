```javascript
/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   REAL-TIME MARKET DATA ENGINE
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

const priceChart =
    document.getElementById("priceChart");


/* ===============================
   MARKET STORAGE
   =============================== */

let candles = [];

let closes = [];

let highs = [];

let lows = [];

let volumes = [];


/* ===============================
   MARKET OBJECT
   =============================== */

let market = {

    price: 0,

    volume: 0,

    change: 0,

    changePercent: 0

};


/* ===============================
   BINANCE API
   =============================== */

const BINANCE_API =
    "https://api.binance.com";


/* ===============================
   CHART SETTINGS
   =============================== */

let chart = null;


/*
   Only the latest 120 points are
   displayed so the line stays
   smooth and readable.
*/

const MAX_CHART_POINTS = 120;


/* ===============================
   FORMAT PRICE
   =============================== */

function formatPrice(price) {

    if (
        !Number.isFinite(price)
    ) {

        return "$0.00";

    }


    return "$" +
        price.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


/* ===============================
   UPDATE PRICE DISPLAY
   =============================== */

function updatePriceDisplay() {

    if (
        !Number.isFinite(
            market.price
        )
    ) {

        return;

    }


    btcPrice.textContent =
        formatPrice(
            market.price
        );


    /*
       Real Binance 24H percentage.
    */

    const change =
        market.changePercent;


    if (
        Number.isFinite(change)
    ) {

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

    }

}


/* ===============================
   LOAD HISTORICAL CANDLES
   =============================== */

async function loadHistory() {

    try {

        marketState.textContent =
            "LOADING DATA";


        const response =
            await fetch(
                BINANCE_API +
                "/api/v3/klines" +
                "?symbol=BTCUSDT" +
                "&interval=1m" +
                "&limit=500"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Historical data request failed"
            );

        }


        const data =
            await response.json();


        /*
           Clear old data before loading.
        */

        candles = [];

        closes = [];

        highs = [];

        lows = [];

        volumes = [];


        data.forEach(
            function(item) {

                const candle = {

                    time:
                        Number(item[0]),

                    open:
                        parseFloat(item[1]),

                    high:
                        parseFloat(item[2]),

                    low:
                        parseFloat(item[3]),

                    close:
                        parseFloat(item[4]),

                    volume:
                        parseFloat(item[5])

                };


                candles.push(
                    candle
                );

                closes.push(
                    candle.close
                );

                highs.push(
                    candle.high
                );

                lows.push(
                    candle.low
                );

                volumes.push(
                    candle.volume
                );

            }
        );


        if (
            closes.length === 0
        ) {

            throw new Error(
                "No candle data received"
            );

        }


        market.price =
            closes[
                closes.length - 1
            ];


        market.volume =
            volumes[
                volumes.length - 1
            ];


        /*
           Create chart from real
           historical BTC prices.
        */

        createPriceChart();


        updatePriceDisplay();


        /*
           Get actual 24H ticker separately.
        */

        await update24HourData();


        marketState.textContent =
            "LIVE";


    }
    catch (error) {

        console.error(
            "History error:",
            error
        );


        marketState.textContent =
            "DATA ERROR";

    }

}


/* ===============================
   REAL 24H DATA
   =============================== */

async function update24HourData() {

    try {

        const response =
            await fetch(
                BINANCE_API +
                "/api/v3/ticker/24hr" +
                "?symbol=BTCUSDT"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "24H ticker request failed"
            );

        }


        const data =
            await response.json();


        const lastPrice =
            parseFloat(
                data.lastPrice
            );


        const volume =
            parseFloat(
                data.volume
            );


        const changePercent =
            parseFloat(
                data.priceChangePercent
            );


        if (
            Number.isFinite(
                lastPrice
            )
        ) {

            market.price =
                lastPrice;

        }


        if (
            Number.isFinite(
                volume
            )
        ) {

            market.volume =
                volume;

        }


        if (
            Number.isFinite(
                changePercent
            )
        ) {

            market.changePercent =
                changePercent;

        }


        updatePriceDisplay();

    }
    catch (error) {

        console.error(
            "24H data error:",
            error
        );

    }

}


/* ===============================
   LIVE BINANCE WEBSOCKET
   =============================== */

let socket = null;

let reconnectTimer = null;


function connectSocket() {

    /*
       Prevent multiple sockets.
    */

    if (
        socket &&
        (
            socket.readyState ===
            WebSocket.OPEN ||

            socket.readyState ===
            WebSocket.CONNECTING
        )
    ) {

        return;

    }


    socket =
        new WebSocket(
            "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
        );


    socket.onopen =
        function() {

            marketState.textContent =
                "LIVE";

        };


    socket.onmessage =
        function(event) {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                const kline =
                    data.k;


                if (!kline) {

                    return;

                }


                const close =
                    parseFloat(
                        kline.c
                    );


                const high =
                    parseFloat(
                        kline.h
                    );


                const low =
                    parseFloat(
                        kline.l
                    );


                const volume =
                    parseFloat(
                        kline.v
                    );


                const candleTime =
                    Number(
                        kline.t
                    );


                if (
                    !Number.isFinite(
                        close
                    )
                ) {

                    return;

                }


                market.price =
                    close;

                market.volume =
                    volume;


                /*
                   Update current candle
                   instead of adding a new
                   point on every WebSocket
                   tick.
                */

                updateLiveCandle({

                    time:
                        candleTime,

                    high:
                        high,

                    low:
                        low,

                    close:
                        close,

                    volume:
                        volume

                });


                updatePriceDisplay();


            }
            catch (error) {

                console.error(
                    "WebSocket message error:",
                    error
                );

            }

        };


    socket.onerror =
        function(error) {

            console.error(
                "WebSocket error:",
                error
            );

            marketState.textContent =
                "RECONNECTING";

        };


    socket.onclose =
        function() {

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

    if (
        candles.length === 0
    ) {

        return;

    }


    const lastIndex =
        candles.length - 1;


    const last =
        candles[lastIndex];


    /*
       Same 1-minute candle:
       update it.

       New candle:
       add it.
    */

    if (
        last.time === data.time
    ) {

        last.high =
            data.high;

        last.low =
            data.low;

        last.close =
            data.close;

        last.volume =
            data.volume;


        closes[lastIndex] =
            data.close;

        highs[lastIndex] =
            data.high;

        lows[lastIndex] =
            data.low;

        volumes[lastIndex] =
            data.volume;

    }
    else {

        const newCandle = {

            time:
                data.time,

            open:
                data.close,

            high:
                data.high,

            low:
                data.low,

            close:
                data.close,

            volume:
                data.volume

        };


        candles.push(
            newCandle
        );

        closes.push(
            data.close
        );

        highs.push(
            data.high
        );

        lows.push(
            data.low
        );

        volumes.push(
            data.volume
        );


        /*
           Keep memory controlled.
        */

        if (
            candles.length > 600
        ) {

            candles.shift();

            closes.shift();

            highs.shift();

            lows.shift();

            volumes.shift();

        }

    }


    updateLiveChart(
        data.close
    );

}


/* ===============================
   CREATE MOVING LINE CHART
   =============================== */

function createPriceChart() {

    if (
        !priceChart
    ) {

        return;

    }


    const ctx =
        priceChart.getContext(
            "2d"
        );


    /*
       Destroy previous chart
       before recreating.
    */

    if (chart) {

        chart.destroy();

        chart = null;

    }


    /*
       Show latest historical
       prices only.
    */

    const chartData =
        closes.slice(
            -MAX_CHART_POINTS
        );


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            200
        );


    gradient.addColorStop(
        0,
        "rgba(0,245,255,0.28)"
    );


    gradient.addColorStop(
        1,
        "rgba(0,245,255,0)"
    );


    chart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels:
                        chartData.map(
                            function() {
                                return "";
                            }
                        ),

                    datasets: [

                        {

                            label:
                                "BTC Price",

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
                                0

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
                                false,

                            grid: {

                                display:
                                    false

                            }

                        },


                        y: {

                            display:
                                false,

                            grid: {

                                display:
                                    false

                            }

                        }

                    },


                    elements: {

                        line: {

                            capBezierPoints:
                                true

                        }

                    }

                }

            }
        );

}


/* ===============================
   UPDATE LIVE CHART
   =============================== */

function updateLiveChart(
    price
) {

    if (
        !chart
    ) {

        createPriceChart();

        return;

    }


    const dataset =
        chart.data.datasets[0];


    /*
       IMPORTANT:
       Update the last point for
       the current 1-minute candle.

       This makes the line move
       smoothly with BTC price
       instead of creating hundreds
       of fake points per minute.
    */

    if (
        dataset.data.length === 0
    ) {

        dataset.data.push(
            price
        );

        chart.data.labels.push(
            ""
        );

    }
    else {

        dataset.data[
            dataset.data.length - 1
        ] = price;

    }


    /*
       When a new minute candle
       arrives, add a new point.
    */

    const lastChartPrice =
        dataset.data[
            dataset.data.length - 1
        ];


    if (
        lastChartPrice !== price
    ) {

        dataset.data.push(
            price
        );

        chart.data.labels.push(
            ""
        );

    }


    /*
       Keep chart compact.
    */

    while (
        dataset.data.length >
        MAX_CHART_POINTS
    ) {

        dataset.data.shift();

        chart.data.labels.shift();

    }


    chart.update(
        "none"
    );

}


/* ===============================
   24H DATA REFRESH
   =============================== */

setInterval(
    update24HourData,
    5000
);


/* ===============================
   START MARKET ENGINE
   =============================== */

loadHistory();

connectSocket();
```




```javascript
/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   ANALYSIS INDICATORS ENGINE
   ================================================== */


/*
   NOTE:
   Indicators are intentionally kept
   in the JavaScript engine.

   They do NOT need visible HTML boxes.
   The scanner uses them internally
   for LONG / SHORT / WAIT analysis.
*/


/* ===============================
   SAFE NUMBER HELPER
   =============================== */

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


/* ===============================
   RSI - WILDER METHOD
   =============================== */

function calculateRSI(period = 14) {

    if (
        closes.length <
        period + 1
    ) {

        return 50;

    }


    /*
       Use Wilder's smoothing rather
       than simple gain/loss averaging.
    */

    let gains = 0;

    let losses = 0;


    /*
       Initial average.
    */

    const start =
        closes.length -
        period -
        1;


    for (
        let i = start + 1;
        i <= start + period;
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
                Math.abs(change);

        }

    }


    let avgGain =
        gains / period;

    let avgLoss =
        losses / period;


    /*
       Continue Wilder smoothing
       through the available data.
    */

    for (
        let i =
            start + period + 1;

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
                (
                    avgGain *
                    (period - 1)
                ) +
                gain
            ) / period;


        avgLoss =
            (
                (
                    avgLoss *
                    (period - 1)
                ) +
                loss
            ) / period;

    }


    /*
       Avoid RSI jumping to 100
       when there are only gains.
    */

    if (
        avgGain === 0 &&
        avgLoss === 0
    ) {

        return 50;

    }


    if (
        avgLoss === 0
    ) {

        return 99;

    }


    const rs =
        avgGain /
        avgLoss;


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
   EMA
   =============================== */

function calculateEMA(period = 20) {

    if (
        closes.length <
        period
    ) {

        return 0;

    }


    /*
       Start EMA from SMA instead
       of using the first candle.
    */

    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum +=
            closes[i];

    }


    let ema =
        sum / period;


    const multiplier =
        2 /
        (period + 1);


    for (
        let i = period;
        i < closes.length;
        i++
    ) {

        ema =
            (
                (
                    closes[i] -
                    ema
                ) *
                multiplier
            ) +
            ema;

    }


    return ema;

}


/* ===============================
   EMA SERIES
   =============================== */

function calculateEMASeries(
    period = 20
) {

    if (
        closes.length <
        period
    ) {

        return [];

    }


    const result = [];


    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum +=
            closes[i];

    }


    let ema =
        sum / period;


    result.push(
        ema
    );


    const multiplier =
        2 /
        (period + 1);


    for (
        let i = period;
        i < closes.length;
        i++
    ) {

        ema =
            (
                (
                    closes[i] -
                    ema
                ) *
                multiplier
            ) +
            ema;


        result.push(
            ema
        );

    }


    return result;

}


/* ===============================
   MACD
   =============================== */

function calculateMACD() {

    if (
        closes.length <
        35
    ) {

        return {

            value: 0,

            signal: 0,

            histogram: 0

        };

    }


    const ema12 =
        calculateEMA(12);


    const ema26 =
        calculateEMA(26);


    const value =
        ema12 -
        ema26;


    /*
       Build a proper MACD series
       for the signal-line calculation.
    */

    const ema12Series =
        calculateEMASeries(12);


    const ema26Series =
        calculateEMASeries(26);


    const macdSeries = [];


    /*
       Align the two EMA series.
    */

    const offset =
        Math.max(
            0,
            ema12Series.length -
            ema26Series.length
        );


    for (
        let i = 0;
        i < ema26Series.length;
        i++
    ) {

        macdSeries.push(
            ema12Series[
                i + offset
            ] -
            ema26Series[i]
        );

    }


    let signal = 0;


    if (
        macdSeries.length >= 9
    ) {

        const last9 =
            macdSeries.slice(-9);


        signal =
            last9.reduce(
                (
                    total,
                    item
                ) =>
                    total + item,
                0
            ) / 9;


        /*
           Smooth signal line.
        */

        const multiplier =
            2 / 10;


        signal =
            (
                (
                    value -
                    signal
                ) *
                multiplier
            ) +
            signal;

    }


    return {

        value:
            safeNumber(value),

        signal:
            safeNumber(signal),

        histogram:
            safeNumber(
                value - signal
            )

    };

}


/* ===============================
   VWAP
   =============================== */

function calculateVWAP() {

    if (
        candles.length === 0
    ) {

        return 0;

    }


    /*
       Use the loaded intraday candles.
    */

    let totalVolume = 0;

    let totalValue = 0;


    const recentCandles =
        candles.slice(-500);


    recentCandles.forEach(
        function(candle) {

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

        }
    );


    if (
        totalVolume === 0
    ) {

        return market.price;

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
    period = 14
) {

    if (
        candles.length <
        period + 1
    ) {

        return 0;

    }


    const trueRanges = [];


    const start =
        candles.length -
        period;


    for (
        let i = start;
        i < candles.length;
        i++
    ) {

        const current =
            candles[i];


        const previous =
            candles[i - 1];


        if (
            !current ||
            !previous
        ) {

            continue;

        }


        const range1 =
            current.high -
            current.low;


        const range2 =
            Math.abs(
                current.high -
                previous.close
            );


        const range3 =
            Math.abs(
                current.low -
                previous.close
            );


        const trueRange =
            Math.max(
                range1,
                range2,
                range3
            );


        trueRanges.push(
            trueRange
        );

    }


    if (
        trueRanges.length === 0
    ) {

        return 0;

    }


    return (
        trueRanges.reduce(
            (
                total,
                value
            ) =>
                total + value,
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
        volumes.length < 20
    ) {

        return {

            value: 0,

            average: 0,

            ratio: 1,

            state: "COLLECTING"

        };

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        ) / recent.length;


    const current =
        volumes[
            volumes.length - 1
        ];


    const ratio =
        average > 0
            ? current / average
            : 1;


    let state =
        "NORMAL";


    if (
        ratio >= 1.5
    ) {

        state =
            "HIGH";

    }
    else if (
        ratio <= 0.70
    ) {

        state =
            "LOW";

    }


    return {

        value:
            safeNumber(current),

        average:
            safeNumber(average),

        ratio:
            safeNumber(ratio, 1),

        state:
            state

    };

}


/* ===============================
   BACKWARD-COMPATIBLE VOLUME
   =============================== */

function analyzeVolume() {

    return getVolumeAnalysis()
        .state;

}


/* ===============================
   VOLATILITY
   =============================== */

function calculateVolatility() {

    if (
        candles.length < 20
    ) {

        return {

            value: 0,

            percent: 0,

            state: "COLLECTING"

        };

    }


    const recent =
        candles.slice(-20);


    const highs20 =
        recent.map(
            candle =>
                candle.high
        );


    const lows20 =
        recent.map(
            candle =>
                candle.low
        );


    const highest =
        Math.max(
            ...highs20
        );


    const lowest =
        Math.min(
            ...lows20
        );


    const range =
        highest -
        lowest;


    const price =
        market.price;


    const percent =
        price > 0
            ? (
                range /
                price
            ) * 100
            : 0;


    let state =
        "NORMAL";


    /*
       These thresholds are deliberately
       moderate for BTC 1-minute data.
    */

    if (
        percent >= 1.20
    ) {

        state =
            "HIGH";

    }
    else if (
        percent <= 0.35
    ) {

        state =
            "LOW";

    }


    return {

        value:
            safeNumber(range),

        percent:
            safeNumber(percent),

        state:
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

            value: 0,

            state: "NEUTRAL"

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
        previous === 0
    ) {

        return {

            value: 0,

            state: "NEUTRAL"

        };

    }


    const percent =
        (
            (
                current -
                previous
            ) /
            previous
        ) * 100;


    let state =
        "NEUTRAL";


    if (
        percent >= 0.15
    ) {

        state =
            "BULLISH";

    }
    else if (
        percent <= -0.15
    ) {

        state =
            "BEARISH";

    }


    return {

        value:
            safeNumber(percent),

        state:
            state

    };

}


/* ===============================
   INTERNAL INDICATOR SNAPSHOT
   =============================== */

function getIndicatorSnapshot() {

    const rsi =
        calculateRSI();


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
        calculateATR();


    const volume =
        getVolumeAnalysis();


    const volatility =
        calculateVolatility();


    const momentum =
        calculateMomentum();


    return {

        rsi,

        ema20,

        ema50,

        ema200,

        macd,

        vwap,

        atr,

        volume,

        volatility,

        momentum

    };

}


/* ===============================
   ENGINE READY CHECK
   =============================== */

function indicatorsReady() {

    return (
        closes.length >= 200 &&
        candles.length >= 200
    );

}
```




```javascript
/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 3
   MARKET INTELLIGENCE ENGINE
   ================================================== */


/* ===============================
   INTELLIGENCE DOM ELEMENTS
   =============================== */

const trendBox =
    document.getElementById("trend");

const structureBox =
    document.getElementById("structure");

const liquidityZoneBox =
    document.getElementById("liquidityZone");

const marketConditionBox =
    document.getElementById("marketCondition");


/*
   New optional elements.
   If an element does not exist,
   the engine simply continues.
*/

const liquidityMagnetBox =
    document.getElementById("liquidityMagnet");

const volatilityValueBox =
    document.getElementById("volatilityValue");

const volatilityStateBox =
    document.getElementById("volatilityState");

const volumeValueBox =
    document.getElementById("volumeValue");

const volumeStateBox =
    document.getElementById("volumeState");

const marketStructureBox =
    document.getElementById("marketStructure");


/* ===============================
   SWING LEVELS
   =============================== */

function getSwingLevels(
    lookback = 50
) {

    if (
        highs.length === 0 ||
        lows.length === 0
    ) {

        return {

            high: market.price,

            low: market.price

        };

    }


    const recentHighs =
        highs.slice(
            -lookback
        );


    const recentLows =
        lows.slice(
            -lookback
        );


    return {

        high:
            Math.max(
                ...recentHighs
            ),

        low:
            Math.min(
                ...recentLows
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


    const current =
        market.price;


    /*
       Strong bullish alignment.
    */

    if (
        current > ema20 &&
        ema20 > ema50
    ) {

        return "BULLISH";

    }


    /*
       Strong bearish alignment.
    */

    if (
        current < ema20 &&
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
        closes.length < 30
    ) {

        return "WAITING";

    }


    const recent =
        closes.slice(-20);


    const older =
        closes.slice(-40, -20);


    const recentHigh =
        Math.max(
            ...recent
        );


    const recentLow =
        Math.min(
            ...recent
        );


    const olderHigh =
        Math.max(
            ...older
        );


    const olderLow =
        Math.min(
            ...older
        );


    /*
       Higher highs + higher lows.
    */

    if (
        recentHigh > olderHigh &&
        recentLow > olderLow
    ) {

        return "HIGHER HIGH / HIGHER LOW";

    }


    /*
       Lower highs + lower lows.
    */

    if (
        recentHigh < olderHigh &&
        recentLow < olderLow
    ) {

        return "LOWER HIGH / LOWER LOW";

    }


    return "RANGE / MIXED";

}


/* ===============================
   BREAK OF STRUCTURE
   =============================== */

function detectBOS() {

    if (
        closes.length < 60
    ) {

        return "WAITING";

    }


    /*
       Use previous candles rather
       than including the current
       candle in the reference level.
    */

    const referenceHighs =
        highs.slice(-51, -1);


    const referenceLows =
        lows.slice(-51, -1);


    if (
        referenceHighs.length === 0 ||
        referenceLows.length === 0
    ) {

        return "WAITING";

    }


    const previousHigh =
        Math.max(
            ...referenceHighs
        );


    const previousLow =
        Math.min(
            ...referenceLows
        );


    const price =
        market.price;


    if (
        price > previousHigh
    ) {

        return "BULLISH BOS";

    }


    if (
        price < previousLow
    ) {

        return "BEARISH BOS";

    }


    return "NO BOS";

}


/* ===============================
   CHANGE OF CHARACTER
   =============================== */

function detectCHOCH() {

    if (
        closes.length < 60
    ) {

        return "WAITING";

    }


    const trend =
        detectTrend();


    const current =
        market.price;


    const previous =
        closes[
            closes.length - 31
        ];


    const move =
        previous !== 0
            ? (
                (
                    current -
                    previous
                ) /
                previous
            ) * 100
            : 0;


    /*
       Only call it CHOCH when the
       movement is meaningful.
    */

    if (
        trend === "BULLISH" &&
        move > 0.20
    ) {

        return "BULLISH SHIFT";

    }


    if (
        trend === "BEARISH" &&
        move < -0.20
    ) {

        return "BEARISH SHIFT";

    }


    return "NO CLEAR SHIFT";

}


/* ===============================
   LIQUIDITY MAGNET
   =============================== */

function calculateLiquidityMagnet() {

    if (
        candles.length < 30
    ) {

        return {

            price:
                market.price,

            side:
                "WAITING",

            distance:
                0

        };

    }


    /*
       Use a larger structural window
       so the magnet is not only a few
       dollars away from BTC price.
    */

    const recentHighs =
        highs.slice(-120, -1);


    const recentLows =
        lows.slice(-120, -1);


    if (
        recentHighs.length === 0 ||
        recentLows.length === 0
    ) {

        return {

            price:
                market.price,

            side:
                "WAITING",

            distance:
                0

        };

    }


    const structuralHigh =
        Math.max(
            ...recentHighs
        );


    const structuralLow =
        Math.min(
            ...recentLows
        );


    const current =
        market.price;


    const distanceHigh =
        Math.abs(
            structuralHigh -
            current
        );


    const distanceLow =
        Math.abs(
            current -
            structuralLow
        );


    /*
       Do not call a level a useful
       magnet if it is extremely close
       to current price.

       Select the stronger structural
       side instead.
    */

    let magnetPrice;

    let side;


    if (
        distanceHigh >=
        distanceLow
    ) {

        magnetPrice =
            structuralHigh;

        side =
            "BUY-SIDE LIQUIDITY";

    }
    else {

        magnetPrice =
            structuralLow;

        side =
            "SELL-SIDE LIQUIDITY";

    }


    return {

        price:
            magnetPrice,

        side:
            side,

        distance:
            Math.abs(
                magnetPrice -
                current
            )

    };

}


/* ===============================
   LIQUIDITY ZONE
   =============================== */

function calculateLiquidityZone() {

    const levels =
        getSwingLevels(50);


    return {

        resistance:
            levels.high,

        support:
            levels.low

    };

}


/* ===============================
   DISPLAY LIQUIDITY MAGNET
   =============================== */

function displayLiquidityMagnet() {

    const magnet =
        calculateLiquidityMagnet();


    if (
        !liquidityMagnetBox
    ) {

        return magnet;

    }


    if (
        magnet.side ===
        "WAITING"
    ) {

        liquidityMagnetBox.textContent =
            "WAITING";

        return magnet;

    }


    liquidityMagnetBox.textContent =
        magnet.side +
        " " +
        formatPrice(
            magnet.price
        );


    return magnet;

}


/* ===============================
   VOLATILITY INTELLIGENCE
   =============================== */

function updateVolatilityDisplay() {

    const volatility =
        calculateVolatility();


    if (
        volatilityValueBox
    ) {

        volatilityValueBox.textContent =
            formatPrice(
                volatility.value
            );

    }


    if (
        volatilityStateBox
    ) {

        volatilityStateBox.textContent =
            volatility.state;

    }


    return volatility;

}


/* ===============================
   VOLUME INTELLIGENCE
   =============================== */

function updateVolumeDisplay() {

    const volume =
        getVolumeAnalysis();


    if (
        volumeValueBox
    ) {

        /*
           BTC volume in 24H-style
           readable format.
        */

        volumeValueBox.textContent =
            volume.value.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 2
                }
            ) +
            " BTC";

    }


    if (
        volumeStateBox
    ) {

        volumeStateBox.textContent =
            volume.state;

    }


    return volume;

}


/* ===============================
   MARKET CONDITION
   =============================== */

function detectMarketCondition() {

    const trend =
        detectTrend();


    const volatility =
        calculateVolatility();


    const momentum =
        calculateMomentum();


    if (
        volatility.state ===
        "HIGH"
    ) {

        return "HIGH VOLATILITY";

    }


    if (
        trend === "BULLISH" &&
        momentum.state === "BULLISH"
    ) {

        return "BULLISH TREND";

    }


    if (
        trend === "BEARISH" &&
        momentum.state === "BEARISH"
    ) {

        return "BEARISH TREND";

    }


    if (
        trend === "SIDEWAYS"
    ) {

        return "RANGE MARKET";

    }


    return "MIXED CONDITIONS";

}


/* ===============================
   COMPLETE INTELLIGENCE UPDATE
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


    const bos =
        detectBOS();


    const choch =
        detectCHOCH();


    const zone =
        calculateLiquidityZone();


    const magnet =
        calculateLiquidityMagnet();


    const condition =
        detectMarketCondition();


    /*
       Existing intelligence fields.
    */

    if (
        trendBox
    ) {

        trendBox.textContent =
            trend;

    }


    if (
        structureBox
    ) {

        structureBox.textContent =
            bos +
            " | " +
            choch;

    }


    if (
        liquidityZoneBox
    ) {

        /*
           No @ symbol.
        */

        liquidityZoneBox.textContent =
            "Support " +
            formatPrice(
                zone.support
            ) +
            " | Resistance " +
            formatPrice(
                zone.resistance
            );

    }


    if (
        marketConditionBox
    ) {

        marketConditionBox.textContent =
            condition;

    }


    /*
       New intelligence fields.
    */

    displayLiquidityMagnet();

    updateVolatilityDisplay();

    updateVolumeDisplay();


    if (
        marketStructureBox
    ) {

        marketStructureBox.textContent =
            structure;

    }


    return {

        trend,

        structure,

        bos,

        choch,

        zone,

        magnet,

        condition

    };

}


/* ===============================
   AUTO INTELLIGENCE REFRESH
   =============================== */

setInterval(
    function() {

        if (
            closes.length >= 50
        ) {

            updateMarketIntelligence();

        }

    },
    3000
);


/* ===============================
   INITIAL INTELLIGENCE START
   =============================== */

setTimeout(
    function() {

        if (
            closes.length >= 50
        ) {

            updateMarketIntelligence();

        }

    },
    2000
);
```



```javascript
/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   REAL MARKET SCANNER ENGINE
   ================================================== */


/* ===============================
   FINAL DOM ELEMENTS
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


/* ===============================
   SCANNER STATE
   =============================== */

let scanning = false;

let scanInterval = null;

const SCAN_SECONDS = 30;


/* ===============================
   SCORE LIMITS
   =============================== */

const SCORE_LIMIT = 100;


/* ===============================
   CLAMP HELPER
   =============================== */

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );

}


/* ===============================
   PRICE DISTANCE
   =============================== */

function priceDistancePercent(
    from,
    to
) {

    if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from === 0
    ) {

        return 0;

    }


    return Math.abs(
        (
            (
                to -
                from
            ) /
            from
        ) * 100
    );

}


/* ===============================
   REAL MARKET SCORE
   =============================== */

function calculateScore() {

    const indicators =
        getIndicatorSnapshot();


    const intelligence =
        updateMarketIntelligence();


    let score = 0;

    const reasons = [];


    /* ==========================
       TREND
       ========================== */

    if (
        intelligence.trend ===
        "BULLISH"
    ) {

        score += 25;

        reasons.push(
            "Bullish trend alignment"
        );

    }
    else if (
        intelligence.trend ===
        "BEARISH"
    ) {

        score -= 25;

        reasons.push(
            "Bearish trend alignment"
        );

    }


    /* ==========================
       EMA STRUCTURE
       ========================== */

    if (
        indicators.ema20 > 0 &&
        indicators.ema50 > 0
    ) {

        if (
            indicators.ema20 >
            indicators.ema50 &&
            market.price >
            indicators.ema20
        ) {

            score += 12;

            reasons.push(
                "Price above EMA structure"
            );

        }
        else if (
            indicators.ema20 <
            indicators.ema50 &&
            market.price <
            indicators.ema20
        ) {

            score -= 12;

            reasons.push(
                "Price below EMA structure"
            );

        }

    }


    /* ==========================
       RSI
       ========================== */

    const rsi =
        indicators.rsi;


    /*
       Do NOT treat RSI 70+ as
       automatically bearish.

       Strong trends can stay
       overbought.

       Same for oversold.
    */

    if (
        rsi >= 52 &&
        rsi <= 68
    ) {

        score += 10;

        reasons.push(
            "Bullish RSI zone"
        );

    }
    else if (
        rsi >= 32 &&
        rsi <= 48
    ) {

        score -= 10;

        reasons.push(
            "Bearish RSI zone"
        );

    }
    else if (
        rsi > 68
    ) {

        /*
           Strong momentum but
           increased reversal risk.
        */

        score += 3;

        reasons.push(
            "Strong RSI momentum"
        );

    }
    else if (
        rsi < 32
    ) {

        score -= 3;

        reasons.push(
            "Weak RSI momentum"
        );

    }


    /* ==========================
       MACD
       ========================== */

    const macd =
        indicators.macd;


    if (
        macd.histogram > 0
    ) {

        score += 15;

        reasons.push(
            "MACD bullish"
        );

    }
    else if (
        macd.histogram < 0
    ) {

        score -= 15;

        reasons.push(
            "MACD bearish"
        );

    }


    /* ==========================
       VWAP
       ========================== */

    if (
        indicators.vwap > 0
    ) {

        if (
            market.price >
            indicators.vwap
        ) {

            score += 10;

            reasons.push(
                "Price above VWAP"
            );

        }
        else {

            score -= 10;

            reasons.push(
                "Price below VWAP"
            );

        }

    }


    /* ==========================
       MOMENTUM
       ========================== */

    if (
        indicators.momentum.state ===
        "BULLISH"
    ) {

        score += 8;

        reasons.push(
            "Positive momentum"
        );

    }
    else if (
        indicators.momentum.state ===
        "BEARISH"
    ) {

        score -= 8;

        reasons.push(
            "Negative momentum"
        );

    }


    /* ==========================
       MARKET STRUCTURE
       ========================== */

    if (
        intelligence.structure ===
        "HIGHER HIGH / HIGHER LOW"
    ) {

        score += 12;

        reasons.push(
            "Higher-high structure"
        );

    }
    else if (
        intelligence.structure ===
        "LOWER HIGH / LOWER LOW"
    ) {

        score -= 12;

        reasons.push(
            "Lower-high structure"
        );

    }


    /* ==========================
       BREAK OF STRUCTURE
       ========================== */

    if (
        intelligence.bos ===
        "BULLISH BOS"
    ) {

        score += 12;

        reasons.push(
            "Bullish structure break"
        );

    }
    else if (
        intelligence.bos ===
        "BEARISH BOS"
    ) {

        score -= 12;

        reasons.push(
            "Bearish structure break"
        );

    }


    /* ==========================
       VOLUME CONFIRMATION
       ========================== */

    if (
        indicators.volume.state ===
        "HIGH"
    ) {

        /*
           High volume confirms
           the direction only when
           momentum agrees.
        */

        if (
            indicators.momentum.state ===
            "BULLISH"
        ) {

            score += 8;

            reasons.push(
                "High volume with bullish momentum"
            );

        }
        else if (
            indicators.momentum.state ===
            "BEARISH"
        ) {

            score -= 8;

            reasons.push(
                "High volume with bearish momentum"
            );

        }

    }


    /* ==========================
       VOLATILITY FILTER
       ========================== */

    if (
        indicators.volatility.state ===
        "HIGH"
    ) {

        /*
           High volatility does not
           automatically create LONG
           or SHORT.

           It reduces confidence.
        */

        score *= 0.88;

        reasons.push(
            "High volatility risk"
        );

    }


    score =
        clamp(
            score,
            -SCORE_LIMIT,
            SCORE_LIMIT
        );


    return {

        score,

        reasons,

        indicators,

        intelligence

    };

}


/* ===============================
   SIGNAL GENERATOR
   =============================== */

function generateSignal() {

    const analysis =
        calculateScore();


    const score =
        analysis.score;


    let signal =
        "WAIT";


    /*
       Strong confirmation required
       before displaying LONG/SHORT.
    */

    if (
        score >= 42
    ) {

        signal =
            "LONG";

    }
    else if (
        score <= -42
    ) {

        signal =
            "SHORT";

    }


    /*
       Confidence is based on the
       actual agreement of factors,
       not a random percentage.
    */

    const agreement =
        Math.abs(score);


    let confidence =
        50 +
        (
            agreement *
            0.45
        );


    /*
       WAIT should remain lower
       confidence because there is
       no confirmed direction.
    */

    if (
        signal === "WAIT"
    ) {

        confidence =
            50 +
            (
                Math.min(
                    agreement,
                    30
                ) *
                0.25
            );

    }


    confidence =
        clamp(
            confidence,
            50,
            95
        );


    return {

        signal,

        confidence,

        score,

        reasons:
            analysis.reasons,

        indicators:
            analysis.indicators,

        intelligence:
            analysis.intelligence

    };

}


/* ===============================
   TRADE LEVEL CALCULATION
   =============================== */

function calculateRisk(
    signal
) {

    const atr =
        calculateATR();


    const entry =
        market.price;


    /*
       ATR unavailable:
       do not invent a fake level.
    */

    if (
        !Number.isFinite(atr) ||
        atr <= 0
    ) {

        return {

            entry,

            stop: 0,

            target: 0,

            rr: 0

        };

    }


    let stop = 0;

    let target = 0;


    /*
       These are supporting levels,
       not the actual signal.

       LONG:
       risk = 1.5 ATR
       target = 3 ATR

       SHORT:
       inverse.
    */

    if (
        signal === "LONG"
    ) {

        stop =
            entry -
            (
                atr * 1.5
            );


        target =
            entry +
            (
                atr * 3
            );

    }
    else if (
        signal === "SHORT"
    ) {

        stop =
            entry +
            (
                atr * 1.5
            );


        target =
            entry -
            (
                atr * 3
            );

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

        rr

    };

}


/* ===============================
   DISPLAY RESULT
   =============================== */

function displaySignal(
    data
) {

    if (
        !data
    ) {

        return;

    }


    /*
       MAIN SIGNAL
    */

    signalBox.textContent =
        data.signal;


    /*
       CONFIDENCE
    */

    confidenceBox.textContent =
        data.confidence.toFixed(0) +
        "%";


    /*
       SIGNAL COLORS
    */

    if (
        data.signal ===
        "LONG"
    ) {

        signalBox.style.color =
            "#00ff88";

        momentumBox.textContent =
            "BUY PRESSURE";


        speak(
            "Long opportunity detected"
        );

    }
    else if (
        data.signal ===
        "SHORT"
    ) {

        signalBox.style.color =
            "#ff4d6d";

        momentumBox.textContent =
            "SELL PRESSURE";


        speak(
            "Short opportunity detected"
        );

    }
    else {

        signalBox.style.color =
            "#ffd166";

        momentumBox.textContent =
            "NEUTRAL";


        speak(
            "Market is neutral"
        );

    }


    /*
       LIQUIDITY MAGNET
    */

    const magnet =
        calculateLiquidityMagnet();


    if (
        magnet &&
        magnet.side !==
        "WAITING"
    ) {

        liquidityBox.textContent =
            magnet.side +
            " " +
            formatPrice(
                magnet.price
            );

    }
    else {

        liquidityBox.textContent =
            "WAITING";

    }


    /*
       TRADE LEVELS
    */

    const risk =
        calculateRisk(
            data.signal
        );


    if (
        data.signal ===
        "WAIT"
    ) {

        /*
           No misleading TP/SL for
           a neutral market.
        */

        entryBox.textContent =
            "—";

        stopBox.textContent =
            "—";

        targetBox.textContent =
            "—";

        rrBox.textContent =
            "—";

    }
    else {

        entryBox.textContent =
            formatPrice(
                risk.entry
            );


        stopBox.textContent =
            formatPrice(
                risk.stop
            );


        targetBox.textContent =
            formatPrice(
                risk.target
            );


        rrBox.textContent =
            risk.rr.toFixed(2);

    }


    /*
       Do NOT display a live timestamp
       under Final Analysis.
    */

    if (
        signalTime
    ) {

        signalTime.textContent =
            "";

    }


    /*
       Update intelligence immediately.
    */

    updateMarketIntelligence();


    /*
       Save latest result for the
       rest of the engine.
    */

    window.latestScan =
        data;

}


/* ===============================
   SCAN BUTTON
   =============================== */

if (
    scanBtn
) {

    scanBtn.onclick =
        function() {

            if (
                scanning
            ) {

                return;

            }


            /*
               Need enough historical
               candles for EMA200 and
               structure analysis.
            */

            if (
                !indicatorsReady()
            ) {

                scanStatus.textContent =
                    "Collecting market data...";

                engineStatus.textContent =
                    "Waiting for enough data";

                return;

            }


            scanning =
                true;


            scanBtn.disabled =
                true;


            let seconds =
                SCAN_SECONDS;


            scanTimer.textContent =
                seconds;


            scanStatus.textContent =
                "Analyzing live market...";


            engineStatus.textContent =
                "Multi-factor engine running";


            /*
               Perform an immediate
               market refresh before
               starting the countdown.
            */

            update24HourData();


            clearInterval(
                scanInterval
            );


            scanInterval =
                setInterval(
                    function() {

                        seconds--;

                        scanTimer.textContent =
                            seconds;


                        /*
                           Keep market data
                           fresh during scan.
                        */

                        update24HourData();


                        updateMarketIntelligence();


                        if (
                            seconds <= 0
                        ) {

                            clearInterval(
                                scanInterval
                            );


                            scanInterval =
                                null;


                            /*
                               Final calculation
                               happens from the
                               latest real data.
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

}


/* ===============================
   VOICE ENGINE
   =============================== */

function speak(
    text
) {

    if (
        voiceText
    ) {

        voiceText.textContent =
            text;

    }


    /*
       Browser speech is optional.
       The analysis itself does not
       depend on speech synthesis.
    */

    if (
        typeof speechSynthesis ===
        "undefined"
    ) {

        return;

    }


    try {

        speechSynthesis.cancel();


        const message =
            new SpeechSynthesisUtterance(
                text
            );


        message.rate =
            0.9;


        message.pitch =
            1;


        message.volume =
            1;


        speechSynthesis.speak(
            message
        );

    }
    catch (error) {

        console.warn(
            "Voice unavailable:",
            error
        );

    }

}


/* ===============================
   ENGINE STATUS
   =============================== */

function updateEngineStatus() {

    if (
        !engineStatus
    ) {

        return;

    }


    if (
        indicatorsReady()
    ) {

        engineStatus.textContent =
            "Engine Ready";

    }
    else {

        engineStatus.textContent =
            "Collecting Market Data";

    }

}


/* ===============================
   BACKGROUND ENGINE CHECK
   =============================== */

setInterval(
    function() {

        updateEngineStatus();

        updateMarketIntelligence();

    },
    5000
);


/* ===============================
   INITIAL STATE
   =============================== */

if (
    signalBox
) {

    signalBox.textContent =
        "WAIT";

}


if (
    confidenceBox
) {

    confidenceBox.textContent =
        "0%";

}


if (
    momentumBox
) {

    momentumBox.textContent =
        "NEUTRAL";

}


if (
    liquidityBox
) {

    liquidityBox.textContent =
        "Searching...";

}


if (
    voiceText
) {

    voiceText.textContent =
        "Voice system ready";

}
```


