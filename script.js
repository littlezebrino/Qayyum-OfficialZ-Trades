
/* =========================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 1
   LIVE BINANCE DATA + WEBSOCKET + SIMPLE LINE CHART
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const btcPrice =
    document.getElementById("btcPrice");

const priceChange =
    document.getElementById("priceChange");

const priceTime =
    document.getElementById("priceTime");

const marketState =
    document.getElementById("marketState");

const marketStatus =
    document.getElementById("marketStatus");

const priceChart =
    document.getElementById("priceChart");

const scanBtn =
    document.getElementById("scanBtn");


/* =========================================================
   OPTIONAL DOM ELEMENTS
   These will be used by later JS parts.
========================================================= */

const scanTimer =
    document.getElementById("scanTimer");

const scanStatus =
    document.getElementById("scanStatus");

const engineStatus =
    document.getElementById("engineStatus");

const signal =
    document.getElementById("signal");

const confidence =
    document.getElementById("confidence");

const momentum =
    document.getElementById("momentum");

const liquidity =
    document.getElementById("liquidity");

const trend =
    document.getElementById("trend");

const structure =
    document.getElementById("structure");

const marketVolume =
    document.getElementById("marketVolume");

const marketVolatility =
    document.getElementById("marketVolatility");

const voiceText =
    document.getElementById("voiceText");


/* =========================================================
   BINANCE CONNECTION
========================================================= */

const BINANCE_REST =
    "https://api.binance.com";

const BINANCE_WS =
    "wss://stream.binance.com:9443/ws";


const SYMBOL =
    "BTCUSDT";

const WS_SYMBOL =
    SYMBOL.toLowerCase();


/* =========================================================
   HISTORICAL DATA
   1-minute candles
========================================================= */

const KLINE_URL =
    BINANCE_REST +
    "/api/v3/klines" +
    "?symbol=" +
    SYMBOL +
    "&interval=1m" +
    "&limit=500";


const TICKER_URL =
    BINANCE_REST +
    "/api/v3/ticker/24hr" +
    "?symbol=" +
    SYMBOL;


/* =========================================================
   MARKET STORAGE
========================================================= */

let candles = [];

let opens = [];

let highs = [];

let lows = [];

let closes = [];

let volumes = [];

let timestamps = [];


/* =========================================================
   LIVE MARKET OBJECT
========================================================= */

const market = {

    price: 0,

    previousPrice: 0,

    change24h: 0,

    change24hPercent: 0,

    high24h: 0,

    low24h: 0,

    volume24h: 0,

    quoteVolume24h: 0,

    candleVolume: 0,

    lastUpdate: 0,

    connected: false

};


/* =========================================================
   ENGINE STATE
========================================================= */

let dataReady = false;

let historyLoaded = false;

let tickerSocket = null;

let klineSocket = null;

let tickerReconnectTimer = null;

let klineReconnectTimer = null;

let chart = null;

let lastChartUpdate = 0;


/* =========================================================
   SAFETY HELPERS
========================================================= */

function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


/* =========================================================
   PRICE FORMATTER
========================================================= */

function formatPrice(value) {

    const number =
        safeNumber(value);


    if (number <= 0) {

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


/* =========================================================
   PERCENT FORMATTER
========================================================= */

function formatPercent(value) {

    const number =
        safeNumber(value);


    return (
        number >= 0
            ? "+"
            : ""
    ) +
    number.toFixed(2) +
    "%";
}


/* =========================================================
   BTC VOLUME FORMATTER
========================================================= */

function formatBTCVolume(value) {

    const number =
        safeNumber(value);


    if (number >= 1000000) {

        return (
            number / 1000000
        ).toFixed(2) +
        "M BTC";
    }


    if (number >= 1000) {

        return (
            number / 1000
        ).toFixed(2) +
        "K BTC";
    }


    return (
        number.toFixed(2) +
        " BTC"
    );
}


/* =========================================================
   CONNECTION STATE
========================================================= */

function setConnectionState(
    state,
    color = null
) {

    if (marketState) {

        marketState.textContent =
            state;

    }


    if (marketStatus) {

        if (color) {

            marketStatus.style.color =
                color;

        }

    }
}


/* =========================================================
   PRICE DISPLAY
========================================================= */

function updatePriceDisplay() {

    if (!btcPrice) {
        return;
    }


    const currentPrice =
        safeNumber(
            market.price
        );


    /*
     * Never allow undefined,
     * NaN or invalid price.
     */

    btcPrice.textContent =
        formatPrice(
            currentPrice
        );


    /*
     * 24H percentage.
     */

    if (priceChange) {

        const change =
            safeNumber(
                market.change24hPercent
            );


        priceChange.textContent =
            formatPercent(
                change
            );


        if (change > 0) {

            priceChange.style.color =
                "#00ff88";

            priceChange.style.textShadow =
                "0 0 12px rgba(0,255,136,0.35)";

        }

        else if (change < 0) {

            priceChange.style.color =
                "#ff4d6d";

            priceChange.style.textShadow =
                "0 0 12px rgba(255,77,109,0.35)";

        }

        else {

            priceChange.style.color =
                "#ffd166";

            priceChange.style.textShadow =
                "none";

        }

    }


    /*
     * Live timestamp/status.
     */

    if (priceTime) {

        if (market.lastUpdate > 0) {

            priceTime.textContent =
                "LIVE • Binance Market Data";

        }

        else {

            priceTime.textContent =
                "Connecting to Binance...";

        }

    }
}


/* =========================================================
   LOAD HISTORICAL CANDLES
========================================================= */

async function loadHistory() {

    try {

        setConnectionState(
            "LOADING DATA",
            "#ffd166"
        );


        if (priceTime) {

            priceTime.textContent =
                "Loading live BTC market data...";

        }


        const response =
            await fetch(
                KLINE_URL,
                {
                    method: "GET",

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Binance historical data request failed: " +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data) ||
            data.length < 50
        ) {

            throw new Error(
                "Insufficient BTC candle data"
            );

        }


        /*
         * Reset all candle arrays.
         */

        candles = [];

        opens = [];

        highs = [];

        lows = [];

        closes = [];

        volumes = [];

        timestamps = [];


        /*
         * Convert Binance candles.
         */

        data.forEach(
            item => {

                const candle = {

                    time:
                        safeNumber(
                            item[0]
                        ),

                    open:
                        safeNumber(
                            item[1]
                        ),

                    high:
                        safeNumber(
                            item[2]
                        ),

                    low:
                        safeNumber(
                            item[3]
                        ),

                    close:
                        safeNumber(
                            item[4]
                        ),

                    volume:
                        safeNumber(
                            item[5]
                        )

                };


                if (
                    candle.close <= 0
                ) {

                    return;

                }


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
         * Make sure valid candles exist.
         */

        if (
            candles.length === 0
        ) {

            throw new Error(
                "No valid BTC candles received"
            );

        }


        const lastCandle =
            candles[
                candles.length - 1
            ];


        /*
         * Initial live price.
         */

        market.price =
            lastCandle.close;


        market.previousPrice =
            lastCandle.close;


        market.candleVolume =
            lastCandle.volume;


        market.lastUpdate =
            Date.now();


        historyLoaded = true;

        dataReady = true;


        updatePriceDisplay();


        /*
         * Build chart BEFORE
         * WebSocket starts.
         */

        createChart();


        setConnectionState(
            "DATA READY",
            "#00f5ff"
        );


        if (engineStatus) {

            engineStatus.textContent =
                "Engine Ready • Waiting for live stream";

        }


        /*
         * Load 24H data.
         */

        await load24HourTicker();


        /*
         * Start live streams.
         */

        connectTickerSocket();

        connectKlineSocket();


    }

    catch (error) {

        console.error(
            "History loading error:",
            error
        );


        dataReady = false;


        setConnectionState(
            "DATA ERROR",
            "#ff4d6d"
        );


        if (priceTime) {

            priceTime.textContent =
                "Binance data unavailable — retrying...";

        }


        /*
         * Retry historical data.
         */

        setTimeout(
            loadHistory,
            5000
        );

    }
}


/* =========================================================
   LOAD 24H TICKER
========================================================= */

async function load24HourTicker() {

    try {

        const response =
            await fetch(
                TICKER_URL,
                {
                    method: "GET",

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "24H ticker request failed: " +
                response.status
            );

        }


        const data =
            await response.json();


        /*
         * Binance:
         *
         * lastPrice       = c
         * priceChange     = p
         * priceChange%    = P
         * high             = h
         * low              = l
         * volume           = v
         * quote volume     = q
         */

        market.price =
            safeNumber(
                data.lastPrice
            );


        market.change24h =
            safeNumber(
                data.priceChange
            );


        market.change24hPercent =
            safeNumber(
                data.priceChangePercent
            );


        market.high24h =
            safeNumber(
                data.highPrice
            );


        market.low24h =
            safeNumber(
                data.lowPrice
            );


        market.volume24h =
            safeNumber(
                data.volume
            );


        market.quoteVolume24h =
            safeNumber(
                data.quoteVolume
            );


        market.lastUpdate =
            Date.now();


        updatePriceDisplay();


    }

    catch (error) {

        console.warn(
            "24H ticker error:",
            error
        );

    }
}


/* =========================================================
   LIVE 24H TICKER WEBSOCKET
========================================================= */

function connectTickerSocket() {

    /*
     * Close old socket.
     */

    if (tickerSocket) {

        try {

            tickerSocket.close();

        }

        catch (error) {

            console.warn(
                error
            );

        }

    }


    tickerSocket =
        new WebSocket(
            BINANCE_WS +
            "/" +
            WS_SYMBOL +
            "@ticker"
        );


    tickerSocket.onopen =
        () => {

            market.connected =
                true;


            setConnectionState(
                "LIVE",
                "#00ff88"
            );


            if (engineStatus) {

                engineStatus.textContent =
                    "Engine Live • Binance WebSocket Connected";

            }

        };


    tickerSocket.onmessage =
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                const livePrice =
                    safeNumber(
                        data.c
                    );


                /*
                 * Do not overwrite
                 * valid price with zero.
                 */

                if (
                    livePrice <= 0
                ) {

                    return;

                }


                market.previousPrice =
                    market.price;


                market.price =
                    livePrice;


                market.change24h =
                    safeNumber(
                        data.p
                    );


                market.change24hPercent =
                    safeNumber(
                        data.P
                    );


                market.high24h =
                    safeNumber(
                        data.h
                    );


                market.low24h =
                    safeNumber(
                        data.l
                    );


                market.volume24h =
                    safeNumber(
                        data.v
                    );


                market.quoteVolume24h =
                    safeNumber(
                        data.q
                    );


                market.lastUpdate =
                    Date.now();


                updatePriceDisplay();


                /*
                 * Update the visual chart
                 * from live price too.
                 *
                 * Throttled to avoid excessive
                 * Chart.js redraws.
                 */

                const now =
                    Date.now();


                if (
                    now - lastChartUpdate >= 1000
                ) {

                    updateChart(
                        market.price
                    );

                    lastChartUpdate =
                        now;

                }

            }

            catch (error) {

                console.error(
                    "Ticker WebSocket parse error:",
                    error
                );

            }

        };


    tickerSocket.onerror =
        error => {

            console.warn(
                "Ticker WebSocket error:",
                error
            );


            market.connected =
                false;


            setConnectionState(
                "RECONNECTING",
                "#ffd166"
            );

        };


    tickerSocket.onclose =
        () => {

            market.connected =
                false;


            setConnectionState(
                "RECONNECTING",
                "#ffd166"
            );


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


/* =========================================================
   LIVE 1-MINUTE KLINE WEBSOCKET
========================================================= */

function connectKlineSocket() {

    /*
     * Close previous connection.
     */

    if (klineSocket) {

        try {

            klineSocket.close();

        }

        catch (error) {

            console.warn(
                error
            );

        }

    }


    klineSocket =
        new WebSocket(
            BINANCE_WS +
            "/" +
            WS_SYMBOL +
            "@kline_1m"
        );


    klineSocket.onopen =
        () => {

            if (engineStatus) {

                engineStatus.textContent =
                    "Engine Live • 1m Market Stream Active";

            }

        };


    klineSocket.onmessage =
        event => {

            try {

                const payload =
                    JSON.parse(
                        event.data
                    );


                if (
                    !payload ||
                    !payload.k
                ) {

                    return;

                }


                updateLiveCandle(
                    payload.k
                );

            }

            catch (error) {

                console.error(
                    "Kline WebSocket parse error:",
                    error
                );

            }

        };


    klineSocket.onerror =
        error => {

            console.warn(
                "Kline WebSocket error:",
                error
            );

        };


    klineSocket.onclose =
        () => {

            clearTimeout(
                klineReconnectTimer
            );


            klineReconnectTimer =
                setTimeout(
                    connectKlineSocket,
                    3000
                );

        };
}


/* =========================================================
   UPDATE LIVE CANDLE
========================================================= */

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


    const 





/* =========================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 2
   HIDDEN TECHNICAL ANALYSIS ENGINE
========================================================= */


/* =========================================================
   NOTE
   This part does NOT create visible indicator panels.
   These calculations work in the background and are used
   later by the 30-second scanner decision engine.
========================================================= */


/* =========================================================
   GENERIC ARRAY HELPERS
========================================================= */

function average(values) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return 0;

    }


    const valid =
        values
            .map(safeNumber)
            .filter(
                value => value > 0
            );


    if (valid.length === 0) {

        return 0;

    }


    return (
        valid.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        valid.length
    );
}


/* =========================================================
   SUM
========================================================= */

function sum(values) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return 0;

    }


    return values.reduce(
        (total, value) =>
            total + safeNumber(value),
        0
    );
}


/* =========================================================
   PERCENT CHANGE
========================================================= */

function percentChange(
    oldValue,
    newValue
) {

    const oldNumber =
        safeNumber(oldValue);

    const newNumber =
        safeNumber(newValue);


    if (
        oldNumber <= 0 ||
        newNumber <= 0
    ) {

        return 0;

    }


    return (
        (
            newNumber -
            oldNumber
        ) /
        oldNumber
    ) * 100;
}


/* =========================================================
   EMA
========================================================= */

function calculateEMA(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length < period
    ) {

        return 0;

    }


    const safeValues =
        values.map(
            safeNumber
        );


    const multiplier =
        2 /
        (period + 1);


    /*
     * Start from SMA.
     */

    let ema =
        average(
            safeValues.slice(
                0,
                period
            )
        );


    for (
        let i = period;
        i < safeValues.length;
        i++
    ) {

        ema =
            (
                safeValues[i] -
                ema
            ) *
            multiplier +
            ema;

    }


    return safeNumber(
        ema
    );
}


/* =========================================================
   SMA
========================================================= */

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


    return average(
        values.slice(
            -period
        )
    );
}


/* =========================================================
   RSI
========================================================= */

function calculateRSI(
    values,
    period = 14
) {

    if (
        !Array.isArray(values) ||
        values.length <= period
    ) {

        return 50;

    }


    const prices =
        values.map(
            safeNumber
        );


    let gains = 0;

    let losses = 0;


    /*
     * Initial average gain/loss.
     */

    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const difference =
            prices[i] -
            prices[i - 1];


        if (
            difference > 0
        ) {

            gains += difference;

        }

        else {

            losses +=
                Math.abs(
                    difference
                );

        }

    }


    let averageGain =
        gains / period;


    let averageLoss =
        losses / period;


    /*
     * Wilder smoothing.
     */

    for (
        let i = period + 1;
        i < prices.length;
        i++
    ) {

        const difference =
            prices[i] -
            prices[i - 1];


        const gain =
            difference > 0
                ? difference
                : 0;


        const loss =
            difference < 0
                ? Math.abs(difference)
                : 0;


        averageGain =
            (
                (
                    averageGain *
                    (period - 1)
                ) +
                gain
            ) /
            period;


        averageLoss =
            (
                (
                    averageLoss *
                    (period - 1)
                ) +
                loss
            ) /
            period;

    }


    if (
        averageLoss === 0
    ) {

        return 100;

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


    return Math.max(
        0,
        Math.min(
            100,
            rsi
        )
    );
}


/* =========================================================
   ATR
========================================================= */

function calculateATR(
    highValues,
    lowValues,
    closeValues,
    period = 14
) {

    if (
        highValues.length <= period ||
        lowValues.length <= period ||
        closeValues.length <= period
    ) {

        return 0;

    }


    const trueRanges = [];


    for (
        let i = 1;
        i < closeValues.length;
        i++
    ) {

        const high =
            safeNumber(
                highValues[i]
            );

        const low =
            safeNumber(
                lowValues[i]
            );

        const previousClose =
            safeNumber(
                closeValues[i - 1]
            );


        const range1 =
            high - low;


        const range2 =
            Math.abs(
                high -
                previousClose
            );


        const range3 =
            Math.abs(
                low -
                previousClose
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
        trueRanges.length < period
    ) {

        return 0;

    }


    return average(
        trueRanges.slice(
            -period
        )
    );
}


/* =========================================================
   ATR PERCENT
========================================================= */

function calculateATRPercent(
    atr,
    price
) {

    const safeATR =
        safeNumber(atr);

    const safePrice =
        safeNumber(price);


    if (
        safeATR <= 0 ||
        safePrice <= 0
    ) {

        return 0;

    }


    return (
        safeATR /
        safePrice
    ) * 100;
}


/* =========================================================
   RECENT HIGH
========================================================= */

function getRecentHigh(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return 0;

    }


    const section =
        values.slice(
            -period
        );


    return Math.max(
        ...section.map(
            safeNumber
        )
    );
}


/* =========================================================
   RECENT LOW
========================================================= */

function getRecentLow(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return 0;

    }


    const section =
        values.slice(
            -period
        );


    return Math.min(
        ...section.map(
            safeNumber
        )
    );
}


/* =========================================================
   PRICE POSITION INSIDE RANGE
========================================================= */

function calculateRangePosition(
    price,
    low,
    high
) {

    const current =
        safeNumber(price);

    const rangeLow =
        safeNumber(low);

    const rangeHigh =
        safeNumber(high);


    if (
        rangeHigh <= rangeLow
    ) {

        return 50;

    }


    return (
        (
            current -
            rangeLow
        ) /
        (
            rangeHigh -
            rangeLow
        )
    ) * 100;
}


/* =========================================================
   MOMENTUM
========================================================= */

function calculateMomentum(
    values,
    shortPeriod = 5,
    longPeriod = 20
) {

    if (
        values.length <
        longPeriod + 1
    ) {

        return 0;

    }


    const current =
        safeNumber(
            values[
                values.length - 1
            ]
        );


    const shortPast =
        safeNumber(
            values[
                values.length -
                1 -
                shortPeriod
            ]
        );


    const longPast =
        safeNumber(
            values[
                values.length -
                1 -
                longPeriod
            ]
        );


    const shortMomentum =
        percentChange(
            shortPast,
            current
        );


    const longMomentum =
        percentChange(
            longPast,
            current
        );


    /*
     * Weighted toward recent momentum.
     */

    return (
        shortMomentum * 0.65
    ) +
    (
        longMomentum * 0.35
    );
}


/* =========================================================
   MOMENTUM CLASSIFICATION
========================================================= */

function classifyMomentum(
    momentumValue
) {

    const value =
        safeNumber(
            momentumValue
        );


    if (value >= 0.35) {

        return "Bullish";

    }


    if (value <= -0.35) {

        return "Bearish";

    }


    return "Neutral";
}


/* =========================================================
   VOLUME ANALYSIS
========================================================= */

function analyzeVolume(
    volumeValues,
    period = 20
) {

    if (
        volumeValues.length <
        period + 1
    ) {

        return {

            current: 0,

            average: 0,

            ratio: 1,

            state: "Normal",

            pressure: 0

        };

    }


    const current =
        safeNumber(
            volumeValues[
                volumeValues.length - 1
            ]
        );


    const previousVolumes =
        volumeValues.slice(
            -period - 1,
            -1
        );


    const averageVolume =
        average(
            previousVolumes
        );


    if (
        averageVolume <= 0
    ) {

        return {

            current: current,

            average: 0,

            ratio: 1,

            state: "Normal",

            pressure: 0

        };

    }


    const ratio =
        current /
        averageVolume;


    let state =
        "Normal";


    if (
        ratio >= 1.50
    ) {

        state =
            "High";

    }

    else if (
        ratio <= 0.70
    ) {

        state =
            "Low";

    }


    /*
     * Volume pressure is not direction
     * by itself. It measures participation.
     */

    const pressure =
        Math.max(
            -1,
            Math.min(
                1,
                ratio - 1
            )
        );


    return {

        current:
            current,

        average:
            averageVolume,

        ratio:
            ratio,

        state:
            state,

        pressure:
            pressure

    };
}


/* =========================================================
   BUY / SELL VOLUME PRESSURE
========================================================= */

function calculateVolumeDirection(
    openValues,
    closeValues,
    volumeValues,
    period = 20
) {

    const start =
        Math.max(
            0,
            closeValues.length -
            period
        );


    let bullishVolume = 0;

    let bearishVolume = 0;


    for (
        let i = start;
        i < closeValues.length;
        i++
    ) {

        const open =
            safeNumber(
                openValues[i]
            );

        const close =
            safeNumber(
                closeValues[i]
            );

        const volume =
            safeNumber(
                volumeValues[i]
            );


        if (
            close > open
        ) {

            bullishVolume +=
                volume;

        }

        else if (
            close < open
        ) {

            bearishVolume +=
                volume;

        }

    }


    const total =
        bullishVolume +
        bearishVolume;


    if (
        total <= 0
    ) {

        return 0;

    }


    return (
        (
            bullishVolume -
            bearishVolume
        ) /
        total
    );
}


/* =========================================================
   MARKET STRUCTURE
========================================================= */

function analyzeStructure() {

    if (
        candles.length < 30
    ) {

        return {

            state: "Neutral",

            score: 0,

            recentHigh: 0,

            recentLow: 0

        };

    }


    const current =
        getCurrentPrice();


    const shortHigh =
        getRecentHigh(
            highs,
            10
        );


    const shortLow =
        getRecentLow(
            lows,
            10
        );


    const mediumHigh =
        getRecentHigh(
            highs,
            30
        );


    const mediumLow =
        getRecentLow(
            lows,
            30
        );


    let score = 0;


    /*
     * Breakout / breakdown context.
     */

    if (
        current >
        shortHigh
    ) {

        score += 2;

    }


    if (
        current <
        shortLow
    ) {

        score -= 2;

    }


    /*
     * Location within medium range.
     */

    const position =
        calculateRangePosition(
            current,
            mediumLow,
            mediumHigh
        );


    if (
        position >= 70
    ) {

        score += 1;

    }

    else if (
        position <= 30
    ) {

        score -= 1;

    }


    let state =
        "Neutral";


    if (
        score >= 2
    ) {

        state =
            "Bullish";

    }

    else if (
        score <= -2
    ) {

        state =
            "Bearish";

    }


    return {

        state:
            state,

        score:
            score,

        recentHigh:
            mediumHigh,

        recentLow:
            mediumLow,

        rangePosition:
            position

    };
}


/* =========================================================
   TREND ANALYSIS
========================================================= */

function analyzeTrend() {

    const current =
        getCurrentPrice();


    const ema9 =
        calculateEMA(
            closes,
            9
        );


    const ema21 =
        calculateEMA(
            closes,
            21
        );


    const ema50 =
        calculateEMA(
            closes,
            50
        );


    let score = 0;


    if (
        current > ema9
    ) {

        score += 1;

    }

    else {

        score -= 1;

    }


    if (
        ema9 > ema21
    ) {

        score += 1;

    }

    else {

        score -= 1;

    }


    if (
        ema21 > ema50
    ) {

        score += 1;

    }

    else {

        score -= 1;

    }


    let state =
        "Neutral";


    if (
        score >= 2
    ) {

        state =
            "Bullish";

    }

    else if (
        score <= -2
    ) {

        state =
            "Bearish";

    }


    return {

        state:
            state,

        score:
            score,

        ema9:
            ema9,

        ema21:
            ema21,

        ema50:
            ema50

    };
}


/* =========================================================
   VOLATILITY ANALYSIS
========================================================= */

function analyzeVolatility() {

    const price =
        getCurrentPrice();


    const atr =
        calculateATR(
            highs,
            lows,
            closes,
            14
        );


    const atrPercent =
        calculateATRPercent(
            atr,
            price
        );


    /*
     * These are deliberately broad
     * BTC 1-minute classifications.
     */

    let state =
        "Normal";


    if (
        atrPercent >= 0.18
    ) {

        state =
            "High";

    }

    else if (
        atrPercent <= 0.07
    ) {

        state =
            "Low";

    }


    return {

        atr:
            atr,

        percent:
            atrPercent,

        state:
            state

    };
}


/* =========================================================
   MARKET SNAPSHOT
   MASTER BACK-END ANALYSIS
========================================================= */

function buildMarketSnapshot() {

    if (
        !hasEnoughMarketData()
    ) {

        return null;

    }


    const price =
        getCurrentPrice();


    const trendData =
        analyzeTrend();


    const structureData =
        analyzeStructure();


    const volumeData =
        analyzeVolume(
            volumes,
            20
        );


    const volumeDirection =
        calculateVolumeDirection(
            opens,
            closes,
            volumes,
            20
        );


    const momentumValue =
        calculateMomentum(
            closes,
            5,
            20
        );


    const momentumState =
        classifyMomentum(
            momentumValue
        );


    const rsi =
        calculateRSI(
            closes,
            14
        );


    const volatilityData =
        analyzeVolatility();


    const recentHigh =
        getRecentHigh(
            highs,
            30
        );


    const recentLow =
        getRecentLow(
            lows,
            30
        );


    const rangePosition =
        calculateRangePosition(
            price,
            recentLow,
            recentHigh
        );


    return {

        price:

            price,

        trend:

            trendData,

        structure:

            structureData,

        volume:

            volumeData,

        volumeDirection:

            volumeDirection,

        momentum:

            {

                value:
                    momentumValue,

                state:
                    momentumState

            },

        rsi:

            rsi,

        volatility:

            volatilityData,

        recentHigh:

            recentHigh,

        recentLow:

            recentLow,

        rangePosition:

            rangePosition,

        timestamp:

            Date.now()

    };
}


/* =========================================================
   ANALYSIS DEBUG HELPER
   Not displayed in UI.
========================================================= */

function getAnalysisSummary() {

    const snapshot =
        buildMarketSnapshot();


    if (!snapshot) {

        return {

            ready:
                false

        };

    }


    return {

        ready:
            true,

        price:
            snapshot.price,

        trend:
            snapshot.trend.state,

        structure:
            snapshot.structure.state,

        momentum:
            snapshot.momentum.state,

        rsi:
            Nu




/* =========================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 3
   30-SECOND DECISION + SIGNAL ENGINE
========================================================= */


/* =========================================================
   SCANNER DOM
========================================================= */

const scanTimer =
    document.getElementById(
        "scanTimer"
    );

const scanStatus =
    document.getElementById(
        "scanStatus"
    );

const engineStatus =
    document.getElementById(
        "engineStatus"
    );

const signalElement =
    document.getElementById(
        "signal"
    );

const confidenceElement =
    document.getElementById(
        "confidence"
    );

const momentumElement =
    document.getElementById(
        "momentum"
    );

const liquidityElement =
    document.getElementById(
        "liquidity"
    );

const trendElement =
    document.getElementById(
        "trend"
    );

const structureElement =
    document.getElementById(
        "structure"
    );

const marketVolumeElement =
    document.getElementById(
        "marketVolume"
    );

const marketVolatilityElement =
    document.getElementById(
        "marketVolatility"
    );

const voiceText =
    document.getElementById(
        "voiceText"
    );


/* =========================================================
   SCANNER STATE
========================================================= */

let scanRunning =
    false;

let scanInterval =
    null;

let scanSeconds =
    30;

let lastSignal =
    "WAIT";

let lastConfidence =
    0;

let lastLiquidity =
    0;


/* =========================================================
   SCANNER CONSTANTS
========================================================= */

const SCAN_DURATION =
    30;


/*
 * Liquidity magnet requirements.
 *
 * Minimum distance:
 * $300
 *
 * Preferred maximum distance:
 * $800
 */

const LIQUIDITY_MIN_DISTANCE =
    300;

const LIQUIDITY_MAX_DISTANCE =
    800;


/* =========================================================
   UI COLOR HELPERS
========================================================= */

function setSignalColor(
    signal
) {

    if (!signalElement) {
        return;
    }


    if (
        signal === "LONG"
    ) {

        signalElement.style.color =
            "#00ff88";

        signalElement.style.textShadow =
            "0 0 25px rgba(0,255,136,0.65)";

    }

    else if (
        signal === "SHORT"
    ) {

        signalElement.style.color =
            "#ff4d6d";

        signalElement.style.textShadow =
            "0 0 25px rgba(255,77,109,0.65)";

    }

    else {

        signalElement.style.color =
            "#ffd166";

        signalElement.style.textShadow =
            "0 0 20px rgba(255,209,102,0.45)";

    }
}


/* =========================================================
   CONFIDENCE COLOR
========================================================= */

function setConfidenceColor(
    confidence
) {

    if (!confidenceElement) {
        return;
    }


    const value =
        safeNumber(
            confidence
        );


    if (
        value >= 75
    ) {

        confidenceElement.style.color =
            "#00ff88";

    }

    else if (
        value >= 55
    ) {

        confidenceElement.style.color =
            "#ffd166";

    }

    else {

        confidenceElement.style.color =
            "#ff9f43";

    }
}


/* =========================================================
   ANALYSIS UI UPDATE
========================================================= */

function updateIntelligenceUI(
    snapshot
) {

    if (!snapshot) {
        return;
    }


    if (trendElement) {

        trendElement.textContent =
            snapshot.trend.state;

    }


    if (structureElement) {

        structureElement.textContent =
            snapshot.structure.state;

    }


    if (marketVolumeElement) {

        const volumeRatio =
            safeNumber(
                snapshot.volume.ratio
            );


        marketVolumeElement.textContent =
            snapshot.volume.state +
            " (" +
            volumeRatio.toFixed(2) +
            "x)";

    }


    if (marketVolatilityElement) {

        marketVolatilityElement.textContent =
            snapshot.volatility.state +
            " (" +
            snapshot.volatility.percent.toFixed(3) +
            "%)";

    }


    if (momentumElement) {

        momentumElement.textContent =
            snapshot.momentum.state;

    }
}


/* =========================================================
   LIQUIDITY ZONE DETECTION
========================================================= */


/*
 * Finds meaningful recent price levels.
 *
 * This does NOT use a random price.
 * It searches recent swing highs/lows and
 * then selects a level within the desired
 * distance from current BTC price.
 */

function findLiquidityCandidates(
    snapshot
) {

    if (!snapshot) {

        return [];

    }


    const currentPrice =
        safeNumber(
            snapshot.price
        );


    if (
        currentPrice <= 0
    ) {

        return [];

    }


    const candidates = [];


    /*
     * Recent swing highs.
     */

    const highPeriods = [
        10,
        20,
        30,
        50,
        80,
        120
    ];


    highPeriods.forEach(
        period => {

            if (
                highs.length >= period
            ) {

                const level =
                    getRecentHigh(
                        highs,
                        period
                    );


                if (
                    level > 0
                ) {

                    candidates.push({

                        price:
                            level,

                        side:
                            "ABOVE",

                        source:
                            "Recent High",

                        period:
                            period

                    });

                }

            }

        }
    );


    /*
     * Recent swing lows.
     */

    const lowPeriods = [
        10,
        20,
        30,
        50,
        80,
        120
    ];


    lowPeriods.forEach(
        period => {

            if (
                lows.length >= period
            ) {

                const level =
                    getRecentLow(
                        lows,
                        period
                    );


                if (
                    level > 0
                ) {

                    candidates.push({

                        price:
                            level,

                        side:
                            "BELOW",

                        source:
                            "Recent Low",

                        period:
                            period

                    });

                }

            }

        }
    );


    /*
     * Remove levels that are too close.
     */

    return candidates.filter(
        candidate => {

            const distance =
                Math.abs(
                    candidate.price -
                    currentPrice
                );


            return (
                distance >=
                LIQUIDITY_MIN_DISTANCE &&
                distance <=
                LIQUIDITY_MAX_DISTANCE
            );

        }
    );
}


/* =========================================================
   LIQUIDITY MAGNET SCORING
========================================================= */

function scoreLiquidityCandidate(
    candidate,
    snapshot,
    signal
) {

    const currentPrice =
        safeNumber(
            snapshot.price
        );


    const distance =
        Math.abs(
            candidate.price -
            currentPrice
        );


    let score = 0;


    /*
     * Prefer levels around the middle
     * of the allowed $300-$800 zone.
     */

    const idealDistance =
        550;


    const distancePenalty =
        Math.abs(
            distance -
            idealDistance
        ) / 250;


    score +=
        Math.max(
            0,
            50 -
            (
                distancePenalty *
                50
            )
        );


    /*
     * Direction compatibility.
     */

    if (
        signal === "LONG" &&
        candidate.side === "ABOVE"
    ) {

        score += 35;

    }


    if (
        signal === "SHORT" &&
        candidate.side === "BELOW"
    ) {

        score += 35;

    }


    /*
     * Recent levels get more weight.
     */

    if (
        candidate.period <= 30
    ) {

        score += 15;

    }

    else if (
        candidate.period <= 50
    ) {

        score += 10;

    }

    else {

        score += 5;

    }


    return score;
}


/* =========================================================
   FIND FINAL LIQUIDITY MAGNET
========================================================= */

function calculateLiquidityMagnet(
    snapshot,
    signal
) {

    if (
        !snapshot ||
        signal === "WAIT"
    ) {

        return {

            price:
                0,

            distance:
                0,

            valid:
                false

        };

    }


    const candidates =
        findLiquidityCandidates(
            snapshot
        );


    if (
        candidates.length === 0
    ) {

        return {

            price:
                0,

            distance:
                0,

            valid:
                false

        };

    }


    let best =
        null;

    let bestScore =
        -Infinity;


    candidates.forEach(
        candidate => {

            const score =
                scoreLiquidityCandidate(
                    candidate,
                    snapshot,
                    signal
                );


            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                best =
                    candidate;

            }

        }
    );


    if (!best) {

        return {

            price:
                0,

            distance:
                0,

            valid:
                false

        };

    }


    const distance =
        Math.abs(
            best.price -
            snapshot.price
        );


    /*
     * Final safety check.
     */

    if (
        distance <
        LIQUIDITY_MIN_DISTANCE ||
        distance >
        LIQUIDITY_MAX_DISTANCE
    ) {

        return {

            price:
                0,

            distance:
                0,

            valid:
                false

        };

    }


    return {

        price:
            best.price,

        distance:
            distance,

        side:
            best.side,

        source:
            best.source,

        period:
            best.period,

        score:
            bestScore,

        valid:
            true

    };
}


/* =========================================================
   SIGNAL SCORE ENGINE
========================================================= */


/*
 * Each independent market component contributes
 * to bullish or bearish pressure.
 *
 * The final signal is NOT based on one indicator.
 */

function calculateSignalScore(
    snapshot
) {

    if (!snapshot) {

        return {

            bullish:
                0,

            bearish:
                0,

            net:
                0

        };

    }


    let bullish =
        0;

    let bearish =
        0;


    /* -----------------------------------------
       TREND
    ----------------------------------------- */

    if (
        snapshot.trend.score >= 2
    ) {

        bullish += 24;

    }

    else if (
        snapshot.trend.score <= -2
    ) {

        bearish += 24;

    }


    /* -----------------------------------------
       STRUCTURE
    ----------------------------------------- */

    if (
        snapshot.structure.score >= 2
    ) {

        bullish += 20;

    }

    else if (
        snapshot.structure.score <= -2
    ) {

        bearish += 20;

    }


    /* -----------------------------------------
       MOMENTUM
    ----------------------------------------- */

    if (
        snapshot.momentum.value >= 0.35
    ) {

        bullish += 18;

    }

    else if (
        snapshot.momentum.value <= -0.35
    ) {

        bearish += 18;

    }


    /* -----------------------------------------
       RSI
    ----------------------------------------- */

    const rsi =
        safeNumber(
            snapshot.rsi
        );


    /*
     * RSI is treated as context,
     * not an automatic buy/sell trigger.
     */

    if (
        rsi >= 52 &&
        rsi <= 68
    ) {

        bullish += 10;

    }

    else if (
        rsi <= 48 &&
        rsi >= 32
    ) {

        bearish += 10;

    }

    /*
     * Extreme RSI reduces confidence
     * instead of blindly reversing.
     */

    if (
        rsi > 75
    ) {

        bullish -= 4;

    }

    if (
        rsi < 25
    ) {

        bearish -= 4;

    }


    /* -----------------------------------------
       VOLUME
    ----------------------------------------- */

    if (
        snapshot.volume.ratio >= 1.15
    ) {

        if (
            snapshot.volumeDirection > 0.15
        ) {

            bullish += 12;

        }

        else if (
            snapshot.volumeDirection < -0.15
        ) {

            bearish += 12;

        }

    }


    /* -----------------------------------------
       VOLATILITY
    ----------------------------------------- */

    /*
     * Normal volatility is preferred.
     *
     * Extremely high volatility reduces
     * directional confidence.
     */

    if (
        snapshot.volatility.state ===
        "Normal"
    ) {

        if (
            bullish > bearish
        ) {

            bullish += 5;

        }

        else if (
            bearish > bullish
        ) {

            bearish += 5;

        }

    }


    if (
        snapshot.volatility.state ===
        "High"
    ) {

        bullish *= 0.90;

        bearish *= 0.90;

    }


    return {

        bullish:
            Math.max(
                0,
                bullish
            ),

        bearish:
            Math.max(
                0,
                bearish
            ),

        net:
            bullish -
            bearish

    };
}


/* =========================================================
   FINAL SIGNAL
========================================================= */

function determineSignal(
    score
) {

    if (!score) {

        return {

            signal:
                "WAIT",

            confidence:
                0

        };

    }


    const bullish =
        safeNumber(
            score.bullish
        );

    const bearish =
        safeNumber(
            score.bearish
        );


    const total =
        bullish +
        bearish;


    if (
        total <= 0
    ) {

        return {

            signal:
                "WAIT",

            confidence:
                0

        };

    }


    const difference =
        Math.abs(
            bullish -
            bearish
        );


    /*
     * Confidence is based on directional
     * separation rather than pretending
     * to be a probability.
     */

    let confidence =
        (
            difference /
            total
        ) * 100;


    /*
     * Keep confidence in a useful range.
     */

    confidence =
        Math.max(
            0,
            Math.min(
                95,
                confidence
            )
        );


    let signal =
        "WAIT";


    /*
     * Require meaningful separation.
     */

    if (
        bullish >= bearish + 18 &&
        confidence >= 55
    ) {

        signal =
            "LONG";

    }

    else if (
        bearish >= bullish + 18 &&
        confidence >= 55
    ) {

        signal =
            "SHORT";

    }


    return {

        signal:
            signal,

        confidence:
            Math.round(
                confidence
            ),

        bullish:
            bullish,

        bearish:
            bearish

    };
}


/* =========================================================
   COMPLETE SCAN
========================================================= */

function performMarketScan() {

    if (
        !dataReady ||
        !hasEnoughMarketData()
    ) {

        return {

            signal:
                "WAIT",

            confidence:
                0,

            liquidity:
                null,

            snapshot:
                null,

            reason:
                "Insufficient market data"

        };

    }


    const snapshot =
        buildMarketSnapshot();


    if (!snapshot) {

        return {

            signal:
                "WAIT",

            confidence:
                0,

            liquidity:
                null,

            snapshot:
                null,

            reason:
                "Snapshot unavailable"

        };

    }


    const score =
        calculateSignalScore(
            snapshot
        );


    const decision =
        determineSignal(
            score
        );


    const liquidity =
        calculateLiquidityMagnet(
            snapshot,
            decision.signal
        );


    /*
     * If directional signal has no valid
     * liquidity zone in the required band,
     * downgrade to WAIT rather than invent
     * a target.
     */

    if (
        (
            decision.signal === "LONG" ||
            decision.signal === "SHORT"
        ) &&
        !liquidity.valid
    ) {

        decision.signal =
            "WAIT";

        decision.confidence =
            Math.min(
                decision.confidence,
                52
            );

    }


    return {

        signal:
            decision.signal,

        confidence:
            decision.confidence,

        liquidity:
            liquidity,

        snapshot:
            snapshot,

        score:
            score,

        reason:
            "Multi-factor market analysis"

    };
}


/* =========================================================
   DISPLAY SCAN RESULT
========================================================= */

function displayScanResult(
    result
) {

    if (!result) {
        return;
    }


    lastSignal =
        result.signal;


    lastConfidence =
        result.confidence;


    /*
     * SIGNAL
     */

    if (signalElement) {

        signalElement.textContent =
            result.signal;

    }


    setSignalColor(
        result.signal
    );


    /*
     * CONFIDENCE
     */

    if (confidenceElement) {

        confidenceElement.textContent =
            result.confidence +
            "%";

    }


    setConfidenceColor(
        result.confidence
    );


    /*
     * MOMENTUM
     */

    if (
        result.snapshot &&
        momentumElement
    ) {

        momentumElement.textContent =
            result.snapshot
                .momentum
                .state;

    }


    /*
     * LIQUIDITY MAGNET
     */

    if (liquidityElement) {

        if (
            result.liquidity &&
            result.liquidity.valid
        ) {

            lastLiquidity =
                result.liquidity.price;


            liquidityElement.textContent =
                formatPrice(
                    result.liquidity.price
                ) +
                "  (" +
                Math.round(
                    result.liquidity.distance
                ) +
                "$)";

        }

        else {

            lastLiquidity =
                0;

            liquidityElement.textContent =
                "No valid zone";

        }

    }


    /*
     * MARKET INTELLIGENCE
     */

    if (
        result.snapshot
    ) {

        updateIntelligenceUI(
            result.snapshot




/* =========================================================
   BTC QUANTUM SCANNER PRO
   JAVASCRIPT PART 4
   FINAL INTEGRATION + LIVE DATA HEALTH + UI SYNC
========================================================= */


/* =========================================================
   FINAL ENGINE CONFIGURATION
========================================================= */

const ENGINE_CONFIG = {

    chartPoints:
        150,

    tickerRefresh:
        30000,

    healthCheck:
        10000,

    staleAfter:
        15000

};


/* =========================================================
   LIVE DATA HEALTH
========================================================= */

let lastKlineMessage =
    0;

let lastTickerMessage =
    0;

let engineHealthy =
    false;


/* =========================================================
   SAFE TEXT UPDATE
========================================================= */

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }

    element.textContent =
        String(value);
}


/* =========================================================
   PRICE COLOR
========================================================= */

function updatePriceDirectionColor() {

    if (!btcPrice) {
        return;
    }

    const current =
        safeNumber(
            market.price
        );

    const previous =
        safeNumber(
            market.previousPrice
        );


    if (
        current > previous &&
        previous > 0
    ) {

        btcPrice.style.color =
            "#00ff88";

        btcPrice.style.textShadow =
            "0 0 20px rgba(0,255,136,0.35)";

    }

    else if (
        current < previous &&
        previous > 0
    ) {

        btcPrice.style.color =
            "#ff4d6d";

        btcPrice.style.textShadow =
            "0 0 20px rgba(255,77,109,0.35)";

    }

    else {

        btcPrice.style.color =
            "#00f5ff";

        btcPrice.style.textShadow =
            "0 0 15px rgba(0,245,255,0.25)";

    }
}


/* =========================================================
   OVERRIDE PRICE DISPLAY WITH FINAL SYNC
========================================================= */

function syncPriceUI() {

    if (
        !market ||
        safeNumber(market.price) <= 0
    ) {

        setText(
            btcPrice,
            "$0.00"
        );

        return;

    }


    setText(
        btcPrice,
        formatPrice(
            market.price
        )
    );


    update24HourDisplay();

    updatePriceDirectionColor();


    setText(
        priceTime,
        "LIVE MARKET PRICE"
    );
}


/* =========================================================
   LIVE VOLUME FORMAT
========================================================= */

function formatLargeQuoteVolume(
    value
) {

    const number =
        safeNumber(value);


    if (
        number <= 0
    ) {

        return "--";

    }


    if (
        number >= 1_000_000_000
    ) {

        return (
            number /
            1_000_000_000
        ).toFixed(2) +
        "B USDT";

    }


    if (
        number >= 1_000_000
    ) {

        return (
            number /
            1_000_000
        ).toFixed(2) +
        "M USDT";

    }


    if (
        number >= 1_000
    ) {

        return (
            number /
            1_000
        ).toFixed(2) +
        "K USDT";

    }


    return (
        number.toFixed(2) +
        " USDT"
    );
}


/* =========================================================
   VOLUME DISPLAY HELPER
========================================================= */

function getVolumeState(
    ratio
) {

    const value =
        safeNumber(ratio);


    if (
        value >= 1.50
    ) {

        return "High";

    }


    if (
        value <= 0.70
    ) {

        return "Low";

    }


    return "Normal";
}


/* =========================================================
   VOLATILITY DISPLAY HELPER
========================================================= */

function getVolatilityState(
    atrPercent
) {

    const value =
        safeNumber(
            atrPercent
        );


    if (
        value >= 0.18
    ) {

        return "High";

    }


    if (
        value <= 0.07
    ) {

        return "Low";

    }


    return "Normal";
}


/* =========================================================
   FINAL MARKET INTELLIGENCE SYNC
========================================================= */

function syncMarketIntelligence() {

    if (
        !dataReady ||
        !hasEnoughMarketData()
    ) {

        return;

    }


    const snapshot =
        buildMarketSnapshot();


    if (!snapshot) {
        return;
    }


    /*
     * Trend
     */

    setText(
        trendElement,
        snapshot.trend.state
    );


    /*
     * Structure
     */

    setText(
        structureElement,
        snapshot.structure.state
    );


    /*
     * Real volume
     */

    const volumeRatio =
        safeNumber(
            snapshot.volume.ratio
        );


    const volumeState =
        getVolumeState(
            volumeRatio
        );


    setText(
        marketVolumeElement,
        volumeState +
        " • " +
        volumeRatio.toFixed(2) +
        "x"
    );


    /*
     * Real volatility
     */

    const volatilityPercent =
        safeNumber(
            snapshot.volatility.percent
        );


    const volatilityState =
        getVolatilityState(
            volatilityPercent
        );


    setText(
        marketVolatilityElement,
        volatilityState +
        " • " +
        volatilityPercent.toFixed(3) +
        "%"
    );


    /*
     * Momentum
     */

    setText(
        momentumElement,
        snapshot.momentum.state
    );
}


/* =========================================================
   24H MARKET DATA SYNC
========================================================= */

function sync24HourData() {

    if (
        !market
    ) {

        return;

    }


    update24HourDisplay();


    /*
     * Keep 24H ticker price authoritative.
     */

    if (
        safeNumber(
            market.price
        ) > 0
    ) {

        syncPriceUI();

    }
}


/* =========================================================
   KLINE MESSAGE HEALTH
========================================================= */

function markKlineAlive() {

    lastKlineMessage =
        Date.now();

    engineHealthy =
        true;
}


/* =========================================================
   TICKER MESSAGE HEALTH
========================================================= */

function markTickerAlive() {

    lastTickerMessage =
        Date.now();

    engineHealthy =
        true;
}


/* =========================================================
   FINAL KLINE UPDATE WRAPPER
========================================================= */

const originalUpdateLiveCandle =
    updateLiveCandle;


/*
 * Wrap existing kline handler without
 * changing its core calculation.
 */

updateLiveCandle =
    function(data) {

        markKlineAlive();

        originalUpdateLiveCandle(
            data
        );

        syncPriceUI();

        syncMarketIntelligence();
    };


/* =========================================================
   FINAL TICKER MESSAGE TRACKER
========================================================= */


/*
 * WebSocket ticker handler already updates
 * market.price and 24H fields.
 *
 * This interval verifies that those values
 * remain healthy.
 */


/* =========================================================
   CHART VISUAL POLISH
========================================================= */

function refreshChartVisuals() {

    if (!chart) {
        return;
    }


    const dataset =
        chart.data.datasets[0];


    if (!dataset) {
        return;
    }


    /*
     * Make chart color follow the latest
     * short-term price direction.
     */

    const current =
        safeNumber(
            market.price
        );


    const previous =
        safeNumber(
            market.previousPrice
        );


    if (
        current > previous
    ) {

        dataset.borderColor =
            "#00ff88";

        dataset.backgroundColor =
            "rgba(0,255,136,0.08)";

    }

    else if (
        current < previous
    ) {

        dataset.borderColor =
            "#ff4d6d";

        dataset.backgroundColor =
            "rgba(255,77,109,0.08)";

    }

    else {

        dataset.borderColor =
            "#00f5ff";

        dataset.backgroundColor =
            "rgba(0,245,255,0.08)";

    }


    chart.update(
        "none"
    );
}


/* =========================================================
   CHART UPDATE WRAPPER
========================================================= */

const originalUpdateChart =
    updateChart;


updateChart =
    function(price) {

        originalUpdateChart(
            price
        );

        refreshChartVisuals();
    };


/* =========================================================
   WEBSOCKET HEALTH CHECK
========================================================= */

function checkConnectionHealth() {

    const now =
        Date.now();


    const klineAge =
        now -
        lastKlineMessage;


    const tickerAge =
        now -
        lastTickerMessage;


    /*
     * If both streams are healthy,
     * show LIVE.
     */

    if (
        klineAge <=
        ENGINE_CONFIG.staleAfter &&
        tickerAge <=
        ENGINE_CONFIG.staleAfter
    ) {

        engineHealthy =
            true;


        if (
            marketState
        ) {

            marketState.textContent =
                "LIVE";

        }


        if (
            marketStatus
        ) {

            marketStatus.style.borderColor =
                "rgba(0,255,136,0.35)";

        }

        return;
    }


    /*
     * If either stream becomes stale,
     * don't pretend the market is live.
     */

    engineHealthy =
        false;


    if (
        marketState
    ) {

        marketState.textContent =
            "RECONNECTING";

    }


    if (
        marketStatus
    ) {

        marketStatus.style.borderColor =
            "rgba(255,77,109,0.35)";

    }


    /*
     * Attempt reconnect if needed.
     */

    if (
        klineAge >
        ENGINE_CONFIG.staleAfter
    ) {

        try {

            if (
                !socket ||
                socket.readyState !==
                WebSocket.OPEN
            ) {

                connectKlineSocket();

            }

        }

        catch (error) {

            console.warn(
                "Kline recovery:",
                error
            );

        }

    }


    if (
        tickerAge >
        ENGINE_CONFIG.staleAfter
    ) {

        try {

            if (
                !tickerSocket ||
                tickerSocket.readyState !==
                WebSocket.OPEN
            ) {

                connectTickerSocket();

            }

        }

        catch (error) {

            console.warn(
                "Ticker recovery:",
                error
            );

        }

    }
}


/* =========================================================
   ENGINE STATUS SYNC
========================================================= */

function syncEngineStatus() {

    if (!engineStatus) {
        return;
    }


    if (
        !dataReady
    ) {

        engineStatus.textContent =
            "Engine Initializing...";

        return;

    }


    if (
        scanRunning
    ) {

        engineStatus.textContent =
            "Engine Scanning";

        return;

    }


    if (
        engineHealthy
    ) {

        engineStatus.textContent =
            "Engine Ready";

    }

    else {

        engineStatus.textContent =
            "Market Reconnecting";

    }
}


/* =========================================================
   FINAL LIVE UI LOOP
========================================================= */

setInterval(
    () => {

        syncPriceUI();

        sync24HourData();

        syncMarketIntelligence();

        syncEngineStatus();

    },
    3000
);


/* =========================================================
   CONNECTION HEALTH LOOP
========================================================= */

setInterval(
    checkConnectionHealth,
    ENGINE_CONFIG.healthCheck
);


/* =========================================================
   INITIAL DATA VALIDATION
========================================================= */

function validateMarketData() {

    if (
        !Array.isArray(candles) ||
        !Array.isArray(closes) ||
        !Array.isArray(opens) ||
        !Array.isArray(highs) ||
        !Array.isArray(lows) ||
        !Array.isArray(volumes)
    ) {

        console.error(
            "Market arrays are invalid."
        );

        return false;

    }


    if (
        closes.length === 0
    ) {

        return false;

    }


    const currentPrice =
        safeNumber(
            market.price
        );


    if (
        currentPrice <= 0
    ) {

        return false;

    }


    return true;
}


/* =========================================================
   STARTUP HEALTH CHECK
========================================================= */

function finalStartupCheck() {

    const valid =
        validateMarketData();


    if (!valid) {

        if (
            marketState
        ) {

            marketState.textContent =
                "LOADING DATA";

        }

        if (
            engineStatus
        ) {

            engineStatus.textContent =
                "Waiting for market feed...";

        }

        return;

    }


    syncPriceUI();

    sync24HourData();

    syncMarketIntelligence();

    syncEngineStatus();


    if (
        voiceText &&
        !scanRunning
    ) {

        voiceText.textContent =
            "Live BTC market feed connected. Scanner ready.";

    }
}


/* =========================================================
   RUN FINAL STARTUP CHECK
========================================================= */

setTimeout(
    finalStartupCheck,
    2000
);


/* =========================================================
   PERIODIC FINAL VALIDATION
========================================================= */

setInterval(
    () => {

        if (
            dataReady
        ) {

            finalStartupCheck();

        }

    },
    15000
);


/* =========================================================
   CLEANUP BEFORE PAGE CLOSE
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        clearInterval(
            scanInterval
        );


        clearTimeout(
            reconnectTimer
        );


        clearTimeout(
            tickerReconnectTimer
        );


        try {

            if (socket) {

                socket.close();

            }

        }

        catch (error) {

            console.warn(error);

        }


        try {

            if (tickerSocket) {

                tickerSocket.close();

            }

        }

        catch (error) {

            console.warn(error);

        }

    }
);


/* =========================================================
   FINAL CONSOLE STATUS
========================================================= */

console.log(
    "BTC Quantum Scanner Pro loaded."
);

console.log(
    "Live WebSocket market feed enabled."
);

console.log(
    "30-second scanner engine enabled."
);

console.log(
    "Hidden technical analysis engine enabled."
);

console.log(
    "Liquidity magnet engine enabled."
);

        
