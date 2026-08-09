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
   MARKET DATA STORAGE
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
   BINANCE API
   =============================== */

const BINANCE_API =
    "https://api.binance.com";


const KLINES_URL =
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
   CHART
   =============================== */

let chart = null;


/* ===============================
   FORMAT PRICE
   =============================== */

function formatPrice(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

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
   LOAD HISTORICAL DATA
   =============================== */

async function loadHistory() {

    try {

        marketState.textContent =
            "LOADING DATA";


        const response =
            await fetch(
                KLINES_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Binance Kline API error: " +
                response.status
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
           Clear old data first.
        */

        candles = [];
        closes = [];
        highs = [];
        lows = [];
        volumes = [];


        /*
           Convert Binance candles
           into clean numeric objects.
        */

        data.forEach(
            function(item) {

                const candle = {

                    time:
                        Number(item[0]),

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


                /*
                   Ignore invalid candles.
                */

                if (
                    Number.isFinite(
                        candle.close
                    ) &&
                    Number.isFinite(
                        candle.high
                    ) &&
                    Number.isFinite(
                        candle.low
                    ) &&
                    Number.isFinite(
                        candle.volume
                    )
                ) {

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

            }
        );


        if (
            closes.length < 50
        ) {

            throw new Error(
                "Insufficient candle data"
            );

        }


        /*
           Current market price.
        */

        market.price =
            closes[
                closes.length - 1
            ];


        market.volume =
            volumes[
                volumes.length - 1
            ];


        btcPrice.textContent =
            formatPrice(
                market.price
            );


        priceTime.textContent =
            "Live 1m market data";


        marketState.textContent =
            "DATA READY";


        /*
           Build chart only after
           historical data exists.
        */

        createChart();


        /*
           Get actual 24h ticker.
        */

        await update24HourChange();


        /*
           Allow other JS parts to
           update after data exists.
        */

        if (
            typeof updateIndicators ===
            "function"
        ) {

            updateIndicators();

        }


        if (
            typeof updateMarketIntelligence ===
            "function"
        ) {

            updateMarketIntelligence();

        }


        console.log(
            "BTC history loaded:",
            closes.length,
            "candles"
        );

    }
    catch (error) {

        console.error(
            "History loading error:",
            error
        );


        marketState.textContent =
            "DATA ERROR";


        priceTime.textContent =
            "Binance data unavailable";

    }

}


/* ===============================
   REAL 24H CHANGE
   =============================== */

async function update24HourChange() {

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
                "24h ticker error: " +
                response.status
            );

        }


        const data =
            await response.json();


        const percent =
            Number(
                data.priceChangePercent
            );


        const absoluteChange =
            Number(
                data.priceChange
            );


        if (
            !Number.isFinite(percent)
        ) {

            return;

        }


        market.change =
            Number.isFinite(
                absoluteChange
            )
                ? absoluteChange
                : 0;


        market.changePercent =
            percent;


        /*
           Positive = green
           Negative = red
           Neutral = yellow
        */

        let sign = "";

        if (percent > 0) {

            sign = "+";

            priceChange.style.color =
                "#00ff88";

        }
        else if (percent < 0) {

            priceChange.style.color =
                "#ff4d6d";

        }
        else {

            priceChange.style.color =
                "#ffd166";

        }


        priceChange.textContent =
            sign +
            percent.toFixed(2) +
            "%";


        /*
           Store 24h information
           for the scanner.
        */

        market.changePercent =
            percent;


    }
    catch (error) {

        console.error(
            "24h change error:",
            error
        );

    }

}


/* ===============================
   CREATE PRICE CHART
   =============================== */

function createChart() {

    const canvas =
        document.getElementById(
            "priceChart"
        );


    if (!canvas) {

        console.error(
            "priceChart canvas not found"
        );

        return;

    }


    const ctx =
        canvas.getContext("2d");


    /*
       Destroy old chart if one exists.
    */

    if (chart) {

        chart.destroy();

        chart = null;

    }


    /*
       Show latest 100 candles.
    */

    const chartPrices =
        closes.slice(-100);


    chart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels:
                        chartPrices.map(
                            function() {
                                return "";
                            }
                        ),

                    datasets: [

                        {

                            label:
                                "BTC/USDT",

                            data:
                                chartPrices,

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
                                3,

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
                                true,

                            displayColors:
                                false,

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            "BTC " +
                                            formatPrice(
                                                context.parsed.y
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
                                false

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

        createChart();

        return;

    }


    const dataset =
        chart.data.datasets[0].data;


    const labels =
        chart.data.labels;


    dataset.push(
        Number(price)
    );


    labels.push("");


    /*
       Keep chart lightweight.
    */

    if (
        dataset.length > 100
    ) {

        dataset.shift();

        labels.shift();

    }


    chart.update(
        "none"
    );

}


/* ===============================
   UPDATE CURRENT CANDLE
   =============================== */

function updateLiveCandle(data) {

    if (
        !candles.length
    ) {

        return;

    }


    const candleTime =
        Number(data.t);


    const lastIndex =
        candles.length - 1;


    const last =
        candles[lastIndex];


    /*
       Binance sends the current
       candle repeatedly.

       If its opening time changes,
       a new 1-minute candle started.
    */

    if (
        candleTime >
        last.time
    ) {

        const newCandle = {

            time:
                candleTime,

            open:
                Number(data.o),

            high:
                Number(data.h),

            low:
                Number(data.l),

            close:
                Number(data.c),

            volume:
                Number(data.v)

        };


        candles.push(
            newCandle
        );

        closes.push(
            newCandle.close
        );

        highs.push(
            newCandle.high
        );

        lows.push(
            newCandle.low
        );

        volumes.push(
            newCandle.volume
        );


        /*
           Keep maximum 500 candles.
        */

        if (
            candles.length > 500
        ) {

            candles.shift();

            closes.shift();

            highs.shift();

            lows.shift();

            volumes.shift();

        }


        updateChart(
            newCandle.close
        );

    }
    else {

        /*
           Update current live candle.
        */

        last.close =
            Number(data.c);

        last.high =
            Number(data.h);

        last.low =
            Number(data.l);

        last.volume =
            Number(data.v);


        closes[lastIndex] =
            last.close;

        highs[lastIndex] =
            last.high;

        lows[lastIndex] =
            last.low;

        volumes[lastIndex] =
            last.volume;


        /*
           Update only the last
           chart point.
        */

        if (chart) {

            const dataset =
                chart.data.datasets[0].data;


            if (
                dataset.length > 0
            ) {

                dataset[
                    dataset.length - 1
                ] =
                    last.close;


                chart.update(
                    "none"
                );

            }

        }

    }


    /*
       Update global market state.
    */

    market.price =
        Number(data.c);

    market.volume =
        Number(data.v);


    btcPrice.textContent =
        formatPrice(
            market.price
        );


    priceTime.textContent =
        "Live • " +
        new Date()
            .toLocaleTimeString();


    /*
       Make sure status shows LIVE.
    */

    if (
        marketState.textContent !==
        "LIVE"
    ) {

        marketState.textContent =
            "LIVE";

    }

}


/* ===============================
   BINANCE WEBSOCKET
   =============================== */

let socket = null;


function connectSocket() {

    /*
       Close previous socket safely.
    */

    if (socket) {

        try {

            socket.close();

        }
        catch (error) {

            console.log(
                "Socket close:",
                error
            );

        }

    }


    marketState.textContent =
        "CONNECTING";


    socket =
        new WebSocket(
            "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
        );


    socket.onopen =
        function() {

            marketState.textContent =
                "LIVE";


            console.log(
                "Binance WebSocket connected"
            );

        };


    socket.onmessage =
        function(event) {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );


                if (
                    !message.k
                ) {

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


    socket.onerror =
        function(error) {

            console.error(
                "Binance WebSocket error:",
                error
            );


            marketState.textContent =
                "ERROR";

        };


    socket.onclose =
        function() {

            marketState.textContent =
                "RECONNECTING";


            /*
               Automatically reconnect.
            */

            setTimeout(
                connectSocket,
                3000
            );

        };

}


/* ===============================
   PERIODIC DATA REFRESH
   =============================== */

/*
   24h ticker is refreshed separately
   from the WebSocket because the
   WebSocket above is for candles.
*/

setInterval(
    function() {

        update24HourChange();

    },
    15000
);


/* ===============================
   START MARKET ENGINE
   =============================== */

loadHistory();

connectSocket();





/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   INDICATORS ENGINE
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

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


/* ===============================
   WILDER RSI
   =============================== */

function calculateRSI(period = 14) {

    if (
        closes.length <
        period + 1
    ) {

        return 50;

    }


    /*
       Start with the first
       period of price changes.
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
        else if (change < 0) {

            lossSum += Math.abs(
                change
            );

        }

    }


    let averageGain =
        gainSum / period;

    let averageLoss =
        lossSum / period;


    /*
       Continue Wilder smoothing
       through the remaining candles.
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
                (
                    averageGain *
                    (period - 1)
                ) +
                gain
            ) / period;


        averageLoss =
            (
                (
                    averageLoss *
                    (period - 1)
                ) +
                loss
            ) / period;

    }


    /*
       Handle extreme cases correctly.

       If there are no losses RSI = 100.
       If there are no gains RSI = 0.
       But this should only happen when
       the actual data supports it.
    */

    if (
        averageLoss === 0
    ) {

        if (
            averageGain === 0
        ) {

            return 50;

        }

        return 100;

    }


    if (
        averageGain === 0
    ) {

        return 0;

    }


    const rs =
        averageGain /
        averageLoss;


    const rsi =
        100 -
        (
            100 /
            (1 + rs)
        );


    /*
       Prevent floating point
       values outside the range.
    */

    return Math.min(
        100,
        Math.max(
            0,
            rsi
        )
    );

}


/* ===============================
   EMA
   =============================== */

function calculateEMA(period) {

    if (
        closes.length <
        period
    ) {

        return 0;

    }


    /*
       Correct EMA seed:
       SMA of the first period.
    */

    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum += closes[i];

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

function calculateEMASeries(period) {

    if (
        closes.length <
        period
    ) {

        return [];

    }


    const series = [];


    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum += closes[i];

    }


    let ema =
        sum / period;


    series.push(
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


        series.push(
            ema
        );

    }


    return series;

}


/* ===============================
   MACD
   =============================== */

function calculateMACD() {

    if (
        closes.length < 35
    ) {

        return 0;

    }


    const ema12 =
        calculateEMA(12);

    const ema26 =
        calculateEMA(26);


    return (
        ema12 -
        ema26
    );

}


/* ===============================
   MACD SIGNAL
   =============================== */

function calculateMACDDetails() {

    if (
        closes.length < 35
    ) {

        return {

            macd: 0,

            signal: 0,

            histogram: 0

        };

    }


    const ema12Series =
        calculateEMASeries(12);

    const ema26Series =
        calculateEMASeries(26);


    /*
       Align EMA12 and EMA26.
    */

    const offset =
        ema12Series.length -
        ema26Series.length;


    const macdSeries = [];


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


    if (
        macdSeries.length < 9
    ) {

        return {

            macd:
                macdSeries[
                    macdSeries.length - 1
                ] || 0,

            signal: 0,

            histogram: 0

        };

    }


    /*
       Calculate 9-period EMA
       of the MACD series.
    */

    const period = 9;


    let signalSum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        signalSum +=
            macdSeries[i];

    }


    let signal =
        signalSum / period;


    const multiplier =
        2 /
        (period + 1);


    for (
        let i = period;
        i < macdSeries.length;
        i++
    ) {

        signal =
            (
                (
                    macdSeries[i] -
                    signal
                ) *
                multiplier
            ) +
            signal;

    }


    const macd =
        macdSeries[
            macdSeries.length - 1
        ];


    return {

        macd: macd,

        signal: signal,

        histogram:
            macd - signal

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


    let totalVolume = 0;

    let totalValue = 0;


    candles.forEach(
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
        totalVolume <= 0
    ) {

        return market.price;

    }


    return (
        totalValue /
        totalVolume
    );

}


/* ===============================
   ATR - WILDER
   =============================== */

function calculateATR(period = 14) {

    if (
        candles.length <
        period + 1
    ) {

        return 0;

    }


    const trueRanges = [];


    for (
        let i = 1;
        i < candles.length;
        i++
    ) {

        const current =
            candles[i];

        const previous =
            candles[i - 1];


        const trueRange =
            Math.max(

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


        trueRanges.push(
            trueRange
        );

    }


    if (
        trueRanges.length <
        period
    ) {

        return 0;

    }


    /*
       First ATR = simple average.
    */

    let atr = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        atr +=
            trueRanges[i];

    }


    atr /=
        period;


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
                (
                    atr *
                    (period - 1)
                ) +
                trueRanges[i]
            ) /
            period;

    }


    return atr;

}


/* ===============================
   VOLUME ANALYSIS
   =============================== */

function analyzeVolume() {

    if (
        volumes.length < 20
    ) {

        return "COLLECTING";

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            function(total, value) {

                return total +
                    safeNumber(value);

            },
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
        current /
        average;


    if (
        ratio >= 1.5
    ) {

        return "HIGH";

    }


    if (
        ratio <= 0.7
    ) {

        return "LOW";

    }


    return "NORMAL";

}


/* ===============================
   VOLUME RATIO
   =============================== */

function getVolumeRatio() {

    if (
        volumes.length < 20
    ) {

        return 1;

    }


    const recent =
        volumes.slice(-20);


    const average =
        recent.reduce(
            function(total, value) {

                return total +
                    safeNumber(value);

            },
            0
        ) / recent.length;


    if (
        average <= 0
    ) {

        return 1;

    }


    return (
        safeNumber(
            volumes[
                volumes.length - 1
            ]
        ) /
        average
    );

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


    /*
       Use standard deviation of
       recent percentage returns.

       This is more meaningful than
       simply high - low.
    */

    const recent =
        closes.slice(-21);


    const returns = [];


    for (
        let i = 1;
        i < recent.length;
        i++
    ) {

        if (
            recent[i - 1] === 0
        ) {

            continue;

        }


        const change =
            (
                (
                    recent[i] -
                    recent[i - 1]
                ) /
                recent[i - 1]
            ) * 100;


        returns.push(
            change
        );

    }


    if (
        returns.length === 0
    ) {

        return 0;

    }


    const mean =
        returns.reduce(
            function(a, b) {
                return a + b;
            },
            0
        ) /
        returns.length;


    const variance =
        returns.reduce(
            function(total, value) {

                return total +
                    Math.pow(
                        value - mean,
                        2
                    );

            },
            0
        ) /
        returns.length;


    return Math.sqrt(
        variance
    );

}


/* ===============================
   MOMENTUM
   =============================== */

function calculateMomentum() {

    if (
        closes.length < 10
    ) {

        return 0;

    }


    const current =
        closes[
            closes.length - 1
        ];


    const previous =
        closes[
            closes.length - 10
        ];


    if (
        previous === 0
    ) {

        return 0;

    }


    return (
        (
            current -
            previous
        ) /
        previous
    ) * 100;

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


    const macdDetails =
        calculateMACDDetails();


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

    if (rsiBox) {

        rsiBox.textContent =
            rsi.toFixed(2);

    }


    /*
       EMA
    */

    if (ema20Box) {

        ema20Box.textContent =
            ema20 > 0
                ? ema20.toFixed(2)
                : "--";

    }


    if (ema50Box) {

        ema50Box.textContent =
            ema50 > 0
                ? ema50.toFixed(2)
                : "--";

    }


    if (ema200Box) {

        ema200Box.textContent =
            ema200 > 0
                ? ema200.toFixed(2)
                : "--";

    }


    /*
       MACD
    */

    if (macdBox) {

        macdBox.textContent =
            macdDetails.macd.toFixed(2);

    }


    /*
       VWAP
    */

    if (vwapBox) {

        vwapBox.textContent =
            vwap.toFixed(2);

    }


    /*
       ATR
    */

    if (atrBox) {

        atrBox.textContent =
            atr.toFixed(2);

    }


    /*
       Volume
    */

    if (volumeBox) {

        volumeBox.textContent =
            volume;

    }


    /*
       Volatility
    */

    if (volatilityBox) {

        volatilityBox.textContent =
            volatility.toFixed(3) +
            "%";

    }

}


/* ===============================
   INDICATOR AUTO UPDATE
   =============================== */

setInterval(
    function() {

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
    function() {

        if (
            closes.length >= 50
        ) {

            updateIndicators();

        }

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

const marketConditionBox =
    document.getElementById("marketCondition");


/* ===============================
   UTILITY
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
   SWING HIGH / LOW DETECTION
   =============================== */

function findSwingPoints(
    data = candles,
    strength = 2
) {

    const swingHighs = [];
    const swingLows = [];


    if (
        data.length <
        (strength * 2 + 1)
    ) {

        return {
            highs: swingHighs,
            lows: swingLows
        };

    }


    for (
        let i = strength;
        i < data.length - strength;
        i++
    ) {

        const current =
            data[i];


        let isHigh = true;
        let isLow = true;


        /*
           Swing High
        */

        for (
            let j = 1;
            j <= strength;
            j++
        ) {

            if (
                current.high <=
                data[i - j].high ||
                current.high <=
                data[i + j].high
            ) {

                isHigh = false;

                break;

            }

        }


        /*
           Swing Low
        */

        for (
            let j = 1;
            j <= strength;
            j++
        ) {

            if (
                current.low >=
                data[i - j].low ||
                current.low >=
                data[i + j].low
            ) {

                isLow = false;

                break;

            }

        }


        if (isHigh) {

            swingHighs.push({

                index: i,

                price:
                    current.high,

                time:
                    current.time

            });

        }


        if (isLow) {

            swingLows.push({

                index: i,

                price:
                    current.low,

                time:
                    current.time

            });

        }

    }


    return {

        highs: swingHighs,

        lows: swingLows

    };

}


/* ===============================
   GET IMPORTANT LEVELS
   =============================== */

function getSwingLevels() {

    const recent =
        getRecentCandles(100);


    if (
        recent.length < 10
    ) {

        return {

            high: market.price,

            low: market.price,

            previousHigh: market.price,

            previousLow: market.price

        };

    }


    const swings =
        findSwingPoints(
            recent,
            2
        );


    let swingHigh =
        Math.max(
            ...recent.map(
                function(candle) {
                    return candle.high;
                }
            )
        );


    let swingLow =
        Math.min(
            ...recent.map(
                function(candle) {
                    return candle.low;
                }
            )
        );


    let previousHigh =
        swingHigh;


    let previousLow =
        swingLow;


    if (
        swings.highs.length > 0
    ) {

        swingHigh =
            swings.highs[
                swings.highs.length - 1
            ].price;


        if (
            swings.highs.length > 1
        ) {

            previousHigh =
                swings.highs[
                    swings.highs.length - 2
                ].price;

        }

    }


    if (
        swings.lows.length > 0
    ) {

        swingLow =
            swings.lows[
                swings.lows.length - 1
            ].price;


        if (
            swings.lows.length > 1
        ) {

            previousLow =
                swings.lows[
                    swings.lows.length - 2
                ].price;

        }

    }


    return {

        high: swingHigh,

        low: swingLow,

        previousHigh: previousHigh,

        previousLow: previousLow

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
       Strong bullish structure.
    */

    if (
        current > ema20 &&
        ema20 > ema50
    ) {

        return "BULLISH";

    }


    /*
       Strong bearish structure.
    */

    if (
        current < ema20 &&
        ema20 < ema50
    ) {

        return "BEARISH";

    }


    /*
       Mixed EMA structure.
    */

    if (
        current > ema50 &&
        ema20 > ema50
    ) {

        return "BULLISH WEAK";

    }


    if (
        current < ema50 &&
        ema20 < ema50
    ) {

        return "BEARISH WEAK";

    }


    return "SIDEWAYS";

}


/* ===============================
   PRICE STRUCTURE
   =============================== */

function detectStructure() {

    if (
        candles.length < 30
    ) {

        return "WAITING";

    }


    const levels =
        getSwingLevels();


    const current =
        market.price;


    /*
       Higher high / higher low
       structure.
    */

    if (
        levels.high >
        levels.previousHigh &&
        levels.low >=
        levels.previousLow
    ) {

        return "HIGHER HIGH / LOW";

    }


    /*
       Lower high / lower low.
    */

    if (
        levels.high <
        levels.previousHigh &&
        levels.low <=
        levels.previousLow
    ) {

        return "LOWER HIGH / LOW";

    }


    return "MIXED STRUCTURE";

}


/* ===============================
   BREAK OF STRUCTURE
   =============================== */

function detectBOS() {

    if (
        candles.length < 20
    ) {

        return "WAITING";

    }


    const recent =
        getRecentCandles(40);


    const current =
        market.price;


    /*
       Use completed candles before
       the current live candle.
    */

    const previousCandles =
        recent.slice(
            0,
            Math.max(
                1,
                recent.length - 1
            )
        );


    const previousHigh =
        Math.max(
            ...previousCandles.map(
                function(candle) {
                    return candle.high;
                }
            )
        );


    const previousLow =
        Math.min(
            ...previousCandles.map(
                function(candle) {
                    return candle.low;
                }
            )
        );


    if (
        current >
        previousHigh
    ) {

        return "BULLISH BOS";

    }


    if (
        current <
        previousLow
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
        candles.length < 60
    ) {

        return "WAITING";

    }


    const currentTrend =
        detectTrend();


    const recent =
        getRecentCandles(30);


    const older =
        candles.slice(
            -60,
            -30
        );


    if (
        recent.length < 10 ||
        older.length < 10
    ) {

        return "WAITING";

    }


    const recentHigh =
        Math.max(
            ...recent.map(
                function(c) {
                    return c.high;
                }
            )
        );


    const recentLow =
        Math.min(
            ...recent.map(
                function(c) {
                    return c.low;
                }
            )
        );


    const olderHigh =
        Math.max(
            ...older.map(
                function(c) {
                    return c.high;
                }
            )
        );


    const olderLow =
        Math.min(
            ...older.map(
                function(c) {
                    return c.low;
                }
            )
        );


    /*
       Bearish reversal from bullish
       structure.
    */

    if (
        currentTrend === "BEARISH" &&
        recentLow < olderLow
    ) {

        return "BEARISH CHOCH";

    }


    /*
       Bullish reversal from bearish
       structure.
    */

    if (
        currentTrend === "BULLISH" &&
        recentHigh > olderHigh
    ) {

        return "BULLISH CHOCH";

    }


    return "NO CHOCH";

}


/* ===============================
   LIQUIDITY ZONES
   =============================== */

function calculateLiquidityZone() {

    const recent =
        getRecentCandles(100);


    if (
        recent.length === 0
    ) {

        return {

            resistance:
                market.price,

            support:
                market.price

        };

    }


    /*
       Recent swing levels.
    */

    const swings =
        findSwingPoints(
            recent,
            2
        );


    let resistance =
        Math.max(
            ...recent.map(
                function(c) {
                    return c.high;
                }
            )
        );


    let support =
        Math.min(
            ...recent.map(
                function(c) {
                    return c.low;
                }
            )
        );


    if (
        swings.highs.length > 0
    ) {

        resistance =
            swings.highs[
                swings.highs.length - 1
            ].price;

    }


    if (
        swings.lows.length > 0
    ) {

        support =
            swings.lows[
                swings.lows.length - 1
            ].price;

    }


    return {

        resistance:
            resistance,

        support:
            support

    };

}


/* ===============================
   LIQUIDITY MAGNET
   =============================== */

function detectLiquidity() {

    const zone =
        calculateLiquidityZone();


    const current =
        market.price;


    const distanceHigh =
        Math.abs(
            zone.resistance -
            current
        );


    const distanceLow =
        Math.abs(
            current -
            zone.support
        );


    /*
       Percentage distance helps
       avoid misleading absolute
       comparisons.
    */

    const highPercent =
        current > 0
            ? (
                distanceHigh /
                current
            ) * 100
            : 0;


    const lowPercent =
        current > 0
            ? (
                distanceLow /
                current
            ) * 100
            : 0;


    /*
       If price is close to resistance,
       buy-side liquidity is nearby.
    */

    if (
        highPercent <= 0.20
    ) {

        return (
            "BUY-SIDE LIQUIDITY @ " +
            zone.resistance.toFixed(2)
        );

    }


    /*
       If price is close to support,
       sell-side liquidity is nearby.
    */

    if (
        lowPercent <= 0.20
    ) {

        return (
            "SELL-SIDE LIQUIDITY @ " +
            zone.support.toFixed(2)
        );

    }


    /*
       Otherwise choose the nearest
       liquidity magnet.
    */

    if (
        distanceHigh <
        distanceLow
    ) {

        return (
            "BUY-SIDE MAGNET @ " +
            zone.resistance.toFixed(2)
        );

    }


    return (
        "SELL-SIDE MAGNET @ " +
        zone.support.toFixed(2)
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


    const recent =
        getRecentCandles(10);


    /*
       Check the latest completed
       3-candle formations.
    */

    for (
        let i = recent.length - 3;
        i >= 0;
        i--
    ) {

        const first =
            recent[i];

        const middle =
            recent[i + 1];

        const third =
            recent[i + 2];


        /*
           Bullish FVG:
           first high < third low.
        */

        if (
            first.high <
            third.low
        ) {

            return "BULLISH FVG";

        }


        /*
           Bearish FVG:
           first low > third high.
        */

        if (
            first.low >
            third.high
        ) {

            return "BEARISH FVG";

        }

    }


    return "NONE";

}


/* ===============================
   ORDER BLOCK
   =============================== */

function detectOrderBlock() {

    if (
        candles.length < 10
    ) {

        return "NONE";

    }


    const recent =
        getRecentCandles(10);


    const last =
        recent[
            recent.length - 1
        ];


    const previous =
        recent[
            recent.length - 2
        ];


    /*
       Strong bullish displacement.
    */

    if (
        last.close >
        previous.high &&
        last.close >
        last.open
    ) {

        return "BULLISH OB";

    }


    /*
       Strong bearish displacement.
    */

    if (
        last.close <
        previous.low &&
        last.close <
        last.open
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
        candles.length < 50
    ) {

        return "WAITING";

    }


    const atr =
        calculateATR(14);


    const price =
        market.price;


    if (
        price <= 0 ||
        atr <= 0
    ) {

        return "WAITING";

    }


    const atrPercent =
        (
            atr /
            price
        ) * 100;


    const trend =
        detectTrend();


    const volatility =
        calculateVolatility();


    /*
       Extremely active market.
    */

    if (
        atrPercent >= 0.50 ||
        volatility >= 0.20
    ) {

        return "HIGH VOLATILITY";

    }


    /*
       Low volatility + sideways.
    */

    if (
        trend === "SIDEWAYS" &&
        atrPercent < 0.15
    ) {

        return "LOW VOLATILITY RANGE";

    }


    if (
        trend === "SIDEWAYS"
    ) {

        return "RANGE MARKET";

    }


    return "TRENDING MARKET";

}


/* ===============================
   MARKET BIAS CONTEXT
   =============================== */

function getMarketContext() {

    const trend =
        detectTrend();


    const bos =
        detectBOS();


    const choch =
        detectCHOCH();


    const rsi =
        calculateRSI();


    const macd =
        calculateMACDDetails();


    const vwap =
        calculateVWAP();


    let bullishPoints = 0;

    let bearishPoints = 0;


    /*
       Trend.
    */

    if (
        trend === "BULLISH"
    ) {

        bullishPoints += 2;

    }
    else if (
        trend === "BULLISH WEAK"
    ) {

        bullishPoints += 1;

    }


    if (
        trend === "BEARISH"
    ) {

        bearishPoints += 2;

    }
    else if (
        trend === "BEARISH WEAK"
    ) {

        bearishPoints += 1;

    }


    /*
       BOS.
    */

    if (
        bos === "BULLISH BOS"
    ) {

        bullishPoints += 2;

    }


    if (
        bos === "BEARISH BOS"
    ) {

        bearishPoints += 2;

    }


    /*
       CHOCH.
    */

    if (
        choch === "BULLISH CHOCH"
    ) {

        bullishPoints += 1;

    }


    if (
        choch === "BEARISH CHOCH"
    ) {

        bearishPoints += 1;

    }


    /*
       RSI.
    */

    if (
        rsi >= 50 &&
        rsi <= 68
    ) {

        bullishPoints += 1;

    }


    if (
        rsi <= 50 &&
        rsi >= 32
    ) {

        bearishPoints += 1;

    }


    /*
       MACD.
    */

    if (
        macd.histogram > 0
    ) {

        bullishPoints += 1;

    }
    else if (
        macd.histogram < 0
    ) {

        bearishPoints += 1;

    }


    /*
       VWAP.
    */

    if (
        market.price >
        vwap
    ) {

        bullishPoints += 1;

    }
    else if (
        market.price <
        vwap
    ) {

        bearishPoints += 1;

    }


    return {

        bullish:
            bullishPoints,

        bearish:
            bearishPoints,

        difference:
            bullishPoints -
            bearishPoints

    };

}


/* ===============================
   UPDATE INTELLIGENCE
   =============================== */

function updateMarketIntelligence() {

    if (
        candles.length < 50
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
        detectLiquidity();


    const condition =
        detectMarketCondition();


    /*
       Trend box.
    */

    if (trendBox) {

        trendBox.textContent =
            trend;

    }


    /*
       Structure box.
    */

    if (structureBox) {

        structureBox.textContent =
            bos +
            " | " +
            choch +
            " | " +
            structure;

    }


    /*
       Liquidity box.
    */

    if (liquidityZoneBox) {

        liquidityZoneBox.textContent =
            liquidity;

    }


    /*
       Market condition.
    */

    if (marketConditionBox) {

        marketConditionBox.textContent =
            condition;

    }

}


/* ===============================
   AUTO UPDATE
   =============================== */

setInterval(
    function() {

        if (
            candles.length >= 50
        ) {

            updateMarketIntelligence();

        }

    },
    5000
);


/* ===============================
   INITIAL UPDATE
   =============================== */

setTimeout(
    function() {

        if (
            candles.length >= 50
        ) {

            updateMarketIntelligence();

        }

    },
    2000
);





/* ==================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4 FINAL
   REAL MARKET SCANNER ENGINE
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


let scanning = false;


/* ===============================
   MACD DETAILS
   =============================== */

/*
   Part 3 uses this function.
   We calculate proper EMA12/EMA26
   and MACD signal line here.
*/

function calculateEMAFromArray(
    values,
    period
) {

    if (
        values.length < period
    ) {

        return 0;

    }


    const multiplier =
        2 / (period + 1);


    let ema =
        values[0];


    for (
        let i = 1;
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


function calculateMACDDetails() {

    if (
        closes.length < 35
    ) {

        return {

            macd: 0,

            signal: 0,

            histogram: 0

        };

    }


    const ema12 =
        calculateEMAFromArray(
            closes,
            12
        );


    const ema26 =
        calculateEMAFromArray(
            closes,
            26
        );


    const macd =
        ema12 - ema26;


    /*
       Build MACD history for a
       more meaningful signal line.
    */

    const macdHistory = [];


    for (
        let i = 26;
        i < closes.length;
        i++
    ) {

        const slice =
            closes.slice(
                0,
                i + 1
            );


        const fast =
            calculateEMAFromArray(
                slice,
                12
            );


        const slow =
            calculateEMAFromArray(
                slice,
                26
            );


        macdHistory.push(
            fast - slow
        );

    }


    const signal =
        calculateEMAFromArray(
            macdHistory,
            9
        );


    const histogram =
        macd - signal;


    return {

        macd,

        signal,

        histogram

    };

}


/*
   Compatibility function.
*/

function calculateMACD() {

    return calculateMACDDetails().macd;

}


/* ===============================
   SCORING ENGINE
   =============================== */

function calculateFinalScore() {

    let score = 0;

    const reasons = [];

    const warnings = [];


    /* =========================
       TREND
       ========================= */

    const trend =
        detectTrend();


    if (
        trend === "BULLISH"
    ) {

        score += 20;

        reasons.push(
            "Bullish EMA trend"
        );

    }
    else if (
        trend === "BULLISH WEAK"
    ) {

        score += 10;

        reasons.push(
            "Weak bullish trend"
        );

    }
    else if (
        trend === "BEARISH"
    ) {

        score -= 20;

        reasons.push(
            "Bearish EMA trend"
        );

    }
    else if (
        trend === "BEARISH WEAK"
    ) {

        score -= 10;

        reasons.push(
            "Weak bearish trend"
        );

    }
    else {

        warnings.push(
            "Trend not confirmed"
        );

    }


    /* =========================
       RSI
       ========================= */

    const rsi =
        calculateRSI();


    /*
       RSI is NOT allowed to
       jump directly into a signal.
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
        rsi < 48
    ) {

        score -= 10;

        reasons.push(
            "Bearish RSI zone"
        );

    }
    else if (
        rsi > 70
    ) {

        /*
           Overbought does not
           automatically mean SHORT.
        */

        warnings.push(
            "RSI overbought"
        );

    }
    else if (
        rsi < 30
    ) {

        /*
           Oversold does not
           automatically mean LONG.
        */

        warnings.push(
            "RSI oversold"
        );

    }


    /* =========================
       MACD
       ========================= */

    const macdData =
        calculateMACDDetails();


    if (
        macdData.histogram > 0
    ) {

        score += 12;

        reasons.push(
            "MACD bullish"
        );

    }
    else if (
        macdData.histogram < 0
    ) {

        score -= 12;

        reasons.push(
            "MACD bearish"
        );

    }


    /* =========================
       VWAP
       ========================= */

    const vwap =
        calculateVWAP();


    if (
        market.price > vwap
    ) {

        score += 10;

        reasons.push(
            "Price above VWAP"
        );

    }
    else if (
        market.price < vwap
    ) {

        score -= 10;

        reasons.push(
            "Price below VWAP"
        );

    }


    /* =========================
       MARKET STRUCTURE
       ========================= */

    const bos =
        detectBOS();


    if (
        bos === "BULLISH BOS"
    ) {

        score += 18;

        reasons.push(
            "Bullish break of structure"
        );

    }
    else if (
        bos === "BEARISH BOS"
    ) {

        score -= 18;

        reasons.push(
            "Bearish break of structure"
        );

    }


    /* =========================
       CHOCH
       ========================= */

    const choch =
        detectCHOCH();


    if (
        choch === "BULLISH CHOCH"
    ) {

        score += 8;

        reasons.push(
            "Bullish CHOCH"
        );

    }
    else if (
        choch === "BEARISH CHOCH"
    ) {

        score -= 8;

        reasons.push(
            "Bearish CHOCH"
        );

    }


    /* =========================
       VOLUME
       ========================= */

    const volumeState =
        analyzeVolume();


    if (
        volumeState === "HIGH"
    ) {

        /*
           High volume confirms
           movement but does not
           decide direction alone.
        */

        if (
            score > 0
        ) {

            score += 7;

            reasons.push(
                "High volume supports buyers"
            );

        }
        else if (
            score < 0
        ) {

            score -= 7;

            reasons.push(
                "High volume supports sellers"
            );

        }

    }


    /* =========================
       LIQUIDITY
       ========================= */

    const liquidity =
        detectLiquidity();


    if (
        liquidity.includes(
            "BUY-SIDE"
        )
    ) {

        if (
            score > 0
        ) {

            score += 5;

            reasons.push(
                "Buy-side liquidity nearby"
            );

        }

    }


    if (
        liquidity.includes(
            "SELL-SIDE"
        )
    ) {

        if (
            score < 0
        ) {

            score -= 5;

            reasons.push(
                "Sell-side liquidity nearby"
            );

        }

    }


    /* =========================
       VOLATILITY FILTER
       ========================= */

    const condition =
        detectMarketCondition();


    if (
        condition ===
        "HIGH VOLATILITY"
    ) {

        warnings.push(
            "High volatility"
        );

    }


    /* =========================
       FINAL
       ========================= */

    let signal =
        "WAIT";


    /*
       Strong confirmation required.
       This prevents every small
       movement from becoming LONG
       or SHORT.
    */

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


    return {

        signal,

        score,

        reasons,

        warnings,

        trend,

        rsi,

        macd:
            macdData,

        vwap,

        bos,

        choch,

        volume:
            volumeState,

        liquidity,

        condition

    };

}


/* ===============================
   CONFIDENCE
   =============================== */

function calculateConfidence(
    data
) {

    const absoluteScore =
        Math.abs(data.score);


    /*
       Confidence is based on
       actual agreement between
       market factors.
    */

    let confidence =
        50 +
        absoluteScore * 0.75;


    /*
       Penalize uncertainty.
    */

    if (
        data.signal ===
        "WAIT"
    ) {

        confidence =
            50 +
            Math.min(
                15,
                absoluteScore * 0.5
            );

    }


    if (
        data.warnings.length >= 2
    ) {

        confidence -= 8;

    }


    return Math.min(
        95,
        Math.max(
            50,
            confidence
        )
    );

}


/* ===============================
   MOMENTUM
   =============================== */

function calculateMomentum(
    data
) {

    const score =
        data.score;


    if (
        score >= 45
    ) {

        return "STRONG BUY";

    }


    if (
        score >= 20
    ) {

        return "BUY PRESSURE";

    }


    if (
        score <= -45
    ) {

        return "STRONG SELL";

    }


    if (
        score <= -20
    ) {

        return "SELL PRESSURE";

    }


    return "NEUTRAL";

}


/* ===============================
   RISK LEVELS
   =============================== */

function calculateRiskLevels(
    signal
) {

    const atr =
        calculateATR(14);


    const entry =
        market.price;


    /*
       No valid ATR means no fake
       risk numbers.
    */

    if (
        !atr ||
        atr <= 0 ||
        !entry
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


    if (
        signal === "LONG"
    ) {

        stop =
            entry -
            atr * 1.5;


        target =
            entry +
            atr * 3;

    }
    else if (
        signal === "SHORT"
    ) {

        stop =
            entry +
            atr * 1.5;


        target =
            entry -
            atr * 3;

    }


    let rr = 0;


    if (
        signal !== "WAIT" &&
        stop !== entry
    ) {

        rr =
            Math.abs(
                target - entry
            ) /
            Math.abs(
                entry - stop
            );

    }


    return {

        entry,

        stop,

        target,

        rr

    };

}


/* ===============================
   DISPLAY SIGNAL
   =============================== */

function displayFinalResult(
    data
) {

    if (!data) {

        return;

    }


    const confidence =
        calculateConfidence(
            data
        );


    const momentum =
        calculateMomentum(
            data
        );


    const risk =
        calculateRiskLevels(
            data.signal
        );


    /* =========================
       SIGNAL
       ========================= */

    if (signalBox) {

        signalBox.textContent =
            data.signal;


        if (
            data.signal ===
            "LONG"
        ) {

            signalBox.style.color =
                "#00ff88";

        }
        else if (
            data.signal ===
            "SHORT"
        ) {

            signalBox.style.color =
                "#ff4d6d";

        }
        else {

            signalBox.style.color =
                "#ffd166";

        }

    }


    /* =========================
       CONFIDENCE
       ========================= */

    if (confidenceBox) {

        confidenceBox.textContent =
            confidence.toFixed(0) +
            "%";

    }


    /* =========================
       MOMENTUM
       ========================= */

    if (momentumBox) {

        momentumBox.textContent =
            momentum;

    }


    /* =========================
       LIQUIDITY
       ========================= */

    if (liquidityBox) {

        liquidityBox.textContent =
            data.liquidity;

    }


    /* =========================
       RISK
       ========================= */

    if (entryBox) {

        entryBox.textContent =
            risk.entry
                ? risk.entry.toFixed(2)
                : "--";

    }


    if (stopBox) {

        stopBox.textContent =
            risk.stop
                ? risk.stop.toFixed(2)
                : "--";

    }


    if (targetBox) {

        targetBox.textContent =
            risk.target
                ? risk.target.toFixed(2)
                : "--";

    }


    if (rrBox) {

        rrBox.textContent =
            risk.rr
                ? risk.rr.toFixed(2)
                : "--";

    }


    /* =========================
       TIME
       ========================= */

    if (signalTime) {

        signalTime.textContent =
            "Analysis: " +
            new Date()
                .toLocaleTimeString();

    }


    /* =========================
       VOICE
       ========================= */

    if (
        data.signal ===
        "LONG"
    ) {

        speak(
            "Long market bias detected"
        );

    }
    else if (
        data.signal ===
        "SHORT"
    ) {

        speak(
            "Short market bias detected"
        );

    }
    else {

        speak(
            "Market direction is not sufficiently confirmed"
        );

    }

}


/* ===============================
   SCAN ENGINE
   =============================== */

async function runScan() {

    if (
        scanning
    ) {

        return;

    }


    /*
       Require enough real candles.
    */

    if (
        candles.length < 100
    ) {

        if (scanStatus) {

            scanStatus.textContent =
                "Collecting live market data...";

        }

        if (engineStatus) {

            engineStatus.textContent =
                "Waiting for market data";

        }

        return;

    }


    scanning = true;


    if (scanBtn) {

        scanBtn.disabled =
            true;

    }


    if (engineStatus) {

        engineStatus.textContent =
            "Analyzing live market...";

    }


    if (scanStatus) {

        scanStatus.textContent =
            "Scanning indicators...";

    }


    let seconds = 5;


    if (scanTimer) {

        scanTimer.textContent =
            seconds;

    }


    const timer =
        setInterval(
            function() {

                seconds--;


                if (scanTimer) {

                    scanTimer.textContent =
                        seconds;
                }


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        timer
                    );


                    /*
                       IMPORTANT:
                       Generate result only
                       after the countdown.
                    */

                    const result =
                        calculateFinalScore();


                    displayFinalResult(
                        result
                    );


                    if (scanTimer) {

                        scanTimer.textContent =
                            "READY";

                    }


                    if (scanStatus) {

                        scanStatus.textContent =
                            "Analysis Complete";

                    }


                    if (engineStatus) {

                        engineStatus.textContent =
                            "Engine Ready";

                    }


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
   SCAN BUTTON
   =============================== */

if (scanBtn) {

    scanBtn.onclick =
        runScan;

}


/* ===============================
   VOICE SYSTEM
   =============================== */

function speak(text) {

    if (voiceText) {

        voiceText.textContent =
            text;

    }


    /*
       Browser speech is optional.
       Scanner still works if browser
       blocks speech.
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


        speechSynthesis.speak(
            message
        );

    }
    catch (error) {

        console.log(
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
        candles.length < 100
    ) {

        engineStatus.textContent =
            "Collecting market data...";

        return;

    }


    if (
        !market.price
    ) {

        engineStatus.textContent =
            "Waiting for live price...";

        return;

    }


    engineStatus.textContent =
        "Engine Ready";

}


/* ===============================
   AUTO ENGINE STATUS
   =============================== */

setInterval(
    updateEngineStatus,
    3000
);


/* ===============================
   INITIAL STATUS
   =============================== */

setTimeout(
    updateEngineStatus,
    3000
);



