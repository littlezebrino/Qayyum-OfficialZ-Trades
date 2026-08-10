// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 1
// LIVE PRICE + MARKET CANDLES + CHART
// ==========================================


// ===============================
// ELEMENTS
// ===============================

const btcPrice =
    document.getElementById("btcPrice");

const priceChange =
    document.getElementById("priceChange");

const scanBtn =
    document.getElementById("scanBtn");

const scanTimer =
    document.getElementById("scanTimer");

const scanStatus =
    document.getElementById("scanStatus");

const signal =
    document.getElementById("signal");

const confidence =
    document.getElementById("confidence");

const momentum =
    document.getElementById("momentum");

const liquidity =
    document.getElementById("liquidity");

const rsiBox =
    document.getElementById("rsi");

const emaBox =
    document.getElementById("ema");

const volumeBox =
    document.getElementById("volume");

const volatilityBox =
    document.getElementById("volatility");

const voiceText =
    document.getElementById("voiceText");


// ===============================
// MARKET VARIABLES
// ===============================

// Live price history for chart

let prices = [];


// Proper 1-minute candle data
// used by indicators

let candleCloses = [];

let candleVolumes = [];

let candleHighs = [];

let candleLows = [];


// Current live market values

let currentPrice = 0;

let currentVolume = 0;

let dayChange = 0;


// Scanner state

let lastSignal = "WAIT";

let scanning = false;


// ===============================
// BINANCE LIVE TRADE SOCKET
// ===============================

let socket = null;


function connectMarketSocket() {

    socket =
        new WebSocket(
            "wss://stream.binance.com:9443/ws/btcusdt@trade"
        );


    socket.onopen = () => {

        console.log(
            "BTC live market connected"
        );

    };


    socket.onmessage = (event) => {

        try {

            const data =
                JSON.parse(
                    event.data
                );


            const price =
                parseFloat(data.p);


            const quantity =
                parseFloat(data.q);


            if (
                !Number.isFinite(price) ||
                price <= 0
            ) {

                return;

            }


            currentPrice = price;


            currentVolume =
                Number.isFinite(quantity)
                    ? quantity
                    : 0;


            // ===============================
            // LIVE PRICE DISPLAY
            // ===============================

            btcPrice.textContent =
                "$" +
                currentPrice.toLocaleString(
                    "en-US",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );


            // ===============================
            // LIVE PRICE HISTORY
            // ===============================

            prices.push(
                currentPrice
            );


            if (
                prices.length > 300
            ) {

                prices.shift();

            }


            // ===============================
            // LIVE CHART
            // ===============================

            updateChart(
                currentPrice
            );

        }

        catch (error) {

            console.error(
                "Live market data error:",
                error
            );

        }

    };


    socket.onerror = (error) => {

        console.error(
            "Binance socket error:",
            error
        );

    };


    socket.onclose = () => {

        console.log(
            "BTC socket closed. Reconnecting..."
        );


        setTimeout(
            connectMarketSocket,
            3000
        );

    };

}


// Start live connection

connectMarketSocket();


// ===============================
// GET 24H CHANGE
// ===============================

async function get24HourChange() {

    try {

        const response =
            await fetch(
                "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
            );


        if (!response.ok) {

            throw new Error(
                "24H ticker request failed"
            );

        }


        const data =
            await response.json();


        dayChange =
            parseFloat(
                data.priceChangePercent
            );


        if (
            !Number.isFinite(
                dayChange
            )
        ) {

            return;

        }


        priceChange.textContent =
            (
                dayChange >= 0
                    ? "+"
                    : ""
            ) +
            dayChange.toFixed(2) +
            "%";


        priceChange.style.color =
            dayChange >= 0
                ? "#00ff88"
                : "#ff4d6d";

    }

    catch (error) {

        console.error(
            "24H change error:",
            error
        );

    }

}


// Initial 24H change

get24HourChange();


// Refresh 24H change

setInterval(
    get24HourChange,
    10000
);


// ===============================
// LOAD REAL 1-MINUTE CANDLES
// ===============================
//
// These candles are used for:
// RSI
// EMA
// Volume
// Volatility
// Market structure
//
// This is deliberately separate
// from the live trade stream.
// ===============================

async function loadMarketCandles() {

    try {

        const response =
            await fetch(
                "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200"
            );


        if (!response.ok) {

            throw new Error(
                "Kline request failed"
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data)
        ) {

            return;

        }


        candleCloses = [];

        candleVolumes = [];

        candleHighs = [];

        candleLows = [];


        data.forEach(
            (candle) => {

                const high =
                    parseFloat(
                        candle[2]
                    );

                const low =
                    parseFloat(
                        candle[3]
                    );

                const close =
                    parseFloat(
                        candle[4]
                    );

                const volume =
                    parseFloat(
                        candle[5]
                    );


                if (
                    Number.isFinite(high) &&
                    Number.isFinite(low) &&
                    Number.isFinite(close) &&
                    Number.isFinite(volume)
                ) {

                    candleHighs.push(
                        high
                    );

                    candleLows.push(
                        low
                    );

                    candleCloses.push(
                        close
                    );

                    candleVolumes.push(
                        volume
                    );

                }

            }
        );


        // Use latest candle close
        // as fallback if live price
        // is not available yet.

        if (
            currentPrice <= 0 &&
            candleCloses.length
        ) {

            currentPrice =
                candleCloses[
                    candleCloses.length - 1
                ];

        }


        // Update indicators after
        // fresh candle data arrives.

        if (
            typeof updateIndicators ===
            "function"
        ) {

            updateIndicators();

        }

    }

    catch (error) {

        console.error(
            "Market candle error:",
            error
        );

    }

}


// Load candles immediately

loadMarketCandles();


// Refresh 1-minute candle data
// every 15 seconds so indicators
// remain current without abusing API.

setInterval(
    loadMarketCandles,
    15000
);


// ===============================
// LIVE PRICE CHART
// ===============================

let chart = null;


// ===============================
// CREATE CHART
// ===============================

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


    chart =
        new Chart(
            ctx,
            {

                type: "line",


                data: {

                    labels: [],


                    datasets: [

                        {

                            label: "BTC",

                            data: [],

                            borderColor:
                                "#00f5ff",

                            borderWidth: 2,

                            tension: 0.4,

                            pointRadius: 0,

                            fill: false

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    animation: false,


                    plugins: {

                        legend: {

                            display: false

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

            }
        );

}


// Create chart

createChart();


// ===============================
// UPDATE CHART
// ===============================

function updateChart(price) {

    if (
        !chart ||
        !Number.isFinite(price)
    ) {

        return;

    }


    chart.data.labels.push(
        ""
    );


    chart.data.datasets[0]
        .data.push(
            price
        );


    // Keep only recent points

    if (
        chart.data.labels.length > 60
    ) {

        chart.data.labels.shift();

        chart.data.datasets[0]
            .data.shift();

    }


    chart.update(
        "none"
    );

            }



// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 2
// MARKET INTELLIGENCE
// ==========================================


// ===============================
// RSI
// ===============================

function calculateRSI(
    data,
    period = 14
) {

    if (
        !Array.isArray(data) ||
        data.length < period + 1
    ) {

        return null;

    }


    let gains = [];

    let losses = [];


    // Calculate candle-to-candle changes

    for (
        let i = 1;
        i < data.length;
        i++
    ) {

        const change =
            data[i] -
            data[i - 1];


        gains.push(
            change > 0
                ? change
                : 0
        );


        losses.push(
            change < 0
                ? Math.abs(change)
                : 0
        );

    }


    // Use Wilder's RSI method

    let averageGain = 0;

    let averageLoss = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        averageGain +=
            gains[i];

        averageLoss +=
            losses[i];

    }


    averageGain /=
        period;

    averageLoss /=
        period;


    for (
        let i = period;
        i < gains.length;
        i++
    ) {

        averageGain =
            (
                (
                    averageGain *
                    (period - 1)
                ) +
                gains[i]
            ) /
            period;


        averageLoss =
            (
                (
                    averageLoss *
                    (period - 1)
                ) +
                losses[i]
            ) /
            period;

    }


    // No movement

    if (
        averageGain === 0 &&
        averageLoss === 0
    ) {

        return 50;

    }


    // Only gains

    if (
        averageLoss === 0
    ) {

        return 100;

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


    return Math.max(
        0,
        Math.min(
            100,
            rsi
        )
    );

}


// ===============================
// EMA
// ===============================

function calculateEMA(
    data,
    period = 20
) {

    if (
        !Array.isArray(data) ||
        data.length < period
    ) {

        return null;

    }


    // Start EMA from SMA

    let sum = 0;


    for (
        let i = 0;
        i < period;
        i++
    ) {

        sum += data[i];

    }


    let ema =
        sum / period;


    const multiplier =
        2 /
        (period + 1);


    for (
        let i = period;
        i < data.length;
        i++
    ) {

        ema =
            (
                data[i] -
                ema
            ) *
            multiplier +
            ema;

    }


    return ema;

}


// ===============================
// EMA TREND
// ===============================

function getEMATrend() {

    if (
        candleCloses.length < 25
    ) {

        return "NEUTRAL";

    }


    const ema20 =
        calculateEMA(
            candleCloses,
            20
        );


    if (
        ema20 === null
    ) {

        return "NEUTRAL";

    }


    const price =
        candleCloses[
            candleCloses.length - 1
        ];


    /*
       Small neutral zone prevents
       EMA from flipping constantly
       when price is almost equal
       to the EMA.
    */

    const neutralDistance =
        ema20 * 0.0005;


    if (
        price >
        ema20 + neutralDistance
    ) {

        return "BULLISH";

    }


    if (
        price <
        ema20 - neutralDistance
    ) {

        return "BEARISH";

    }


    return "NEUTRAL";

}


// ===============================
// VOLUME ANALYSIS
// ===============================

function analyzeVolume() {

    if (
        candleVolumes.length < 20
    ) {

        return {

            value: "Collecting",

            power: "NORMAL"

        };

    }


    const recentVolumes =
        candleVolumes.slice(
            -20
        );


    const currentVolume =
        recentVolumes[
            recentVolumes.length - 1
        ];


    const previousVolumes =
        recentVolumes.slice(
            0,
            -1
        );


    const averageVolume =
        previousVolumes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        previousVolumes.length;


    if (
        !Number.isFinite(
            currentVolume
        ) ||
        !Number.isFinite(
            averageVolume
        ) ||
        averageVolume <= 0
    ) {

        return {

            value: "Collecting",

            power: "NORMAL"

        };

    }


    const volumeRatio =
        currentVolume /
        averageVolume;


    let power;


    if (
        volumeRatio >= 1.5
    ) {

        power = "HIGH";

    }

    else if (
        volumeRatio <= 0.7
    ) {

        power = "LOW";

    }

    else {

        power = "NORMAL";

    }


    return {

        value:
            currentVolume.toFixed(
                2
            ) +
            " BTC",

        power: power

    };

}


// ===============================
// VOLATILITY
// ===============================

function analyzeVolatility() {

    if (
        candleCloses.length < 20 ||
        candleHighs.length < 20 ||
        candleLows.length < 20
    ) {

        return "Collecting";

    }


    const start =
        Math.max(
            0,
            candleCloses.length - 20
        );


    let totalRange = 0;


    for (
        let i = start;
        i < candleCloses.length;
        i++
    ) {

        const high =
            candleHighs[i];

        const low =
            candleLows[i];


        if (
            Number.isFinite(high) &&
            Number.isFinite(low)
        ) {

            totalRange +=
                high - low;

        }

    }


    const candleCount =
        candleCloses.length -
        start;


    if (
        candleCount <= 0
    ) {

        return "Collecting";

    }


    const averageRange =
        totalRange /
        candleCount;


    const referencePrice =
        candleCloses[
            candleCloses.length - 1
        ];


    if (
        referencePrice <= 0
    ) {

        return "Collecting";

    }


    const volatilityPercent =
        (
            averageRange /
            referencePrice
        ) *
        100;


    let level;


    if (
        volatilityPercent >= 0.30
    ) {

        level = "HIGH";

    }

    else if (
        volatilityPercent >= 0.12
    ) {

        level = "MEDIUM";

    }

    else {

        level = "LOW";

    }


    return (
        volatilityPercent.toFixed(2) +
        "% " +
        level
    );

}


// ===============================
// UPDATE MARKET INTELLIGENCE
// ===============================

function updateIndicators() {

    if (
        candleCloses.length < 20
    ) {

        rsiBox.textContent =
            "--";

        emaBox.textContent =
            "NEUTRAL";

        volumeBox.textContent =
            "Collecting";

        volatilityBox.textContent =
            "Collecting";

        return;

    }


    // ===============================
    // RSI
    // ===============================

    const rsi =
        calculateRSI(
            candleCloses,
            14
        );


    if (
        rsi === null
    ) {

        rsiBox.textContent =
            "--";

    }

    else {

        rsiBox.textContent =
            rsi.toFixed(1);

    }


    // ===============================
    // EMA TREND
    // ===============================

    const emaTrend =
        getEMATrend();


    emaBox.textContent =
        emaTrend;


    // ===============================
    // VOLUME
    // ===============================

    const volume =
        analyzeVolume();


    volumeBox.textContent =
        volume.value +
        " " +
        volume.power;


    // ===============================
    // VOLATILITY
    // ===============================

    volatilityBox.textContent =
        analyzeVolatility();

            }






// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 3
// MARKET STRUCTURE + LIQUIDITY MAGNET
// ==========================================


// ===============================
// MARKET STRUCTURE
// ===============================

function marketStructure() {

    if (
        candleCloses.length < 40
    ) {

        return "NEUTRAL";

    }


    const recent =
        candleCloses.slice(
            -40
        );


    const midpoint =
        Math.floor(
            recent.length / 2
        );


    const firstHalf =
        recent.slice(
            0,
            midpoint
        );


    const secondHalf =
        recent.slice(
            midpoint
        );


    const firstAverage =
        firstHalf.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        firstHalf.length;


    const secondAverage =
        secondHalf.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        secondHalf.length;


    const difference =
        secondAverage -
        firstAverage;


    const neutralRange =
        currentPrice *
        0.0003;


    if (
        difference >
        neutralRange
    ) {

        return "UPTREND";

    }


    if (
        difference <
        -neutralRange
    ) {

        return "DOWNTREND";

    }


    return "SIDEWAYS";

}


// ===============================
// LIQUIDITY MAGNET
// ===============================

function calculateLiquidityMagnet(
    direction
) {

    if (
        candleCloses.length < 50
    ) {

        return "Building Liquidity";

    }


    const recentHighs =
        candleHighs.slice(
            -50
        );


    const recentLows =
        candleLows.slice(
            -50
        );


    const recentCloses =
        candleCloses.slice(
            -50
        );


    if (
        recentHighs.length === 0 ||
        recentLows.length === 0 ||
        recentCloses.length === 0
    ) {

        return "Building Liquidity";

    }


    const high =
        Math.max(
            ...recentHighs
        );


    const low =
        Math.min(
            ...recentLows
        );


    const range =
        high - low;


    if (
        !Number.isFinite(range) ||
        range <= 0
    ) {

        return "Building Liquidity";

    }


    /*
       Liquidity Magnet is NOT TP
       and NOT SL.

       It is a calculated potential
       price/liquidity area based on
       recent market range.
    */


    const dynamicDistance =
        Math.max(
            currentPrice *
            0.0015,

            range *
            0.8
        );


    let target;

    let type;


    // ===============================
    // LONG
    // ===============================

    if (
        direction === "LONG"
    ) {

        /*
           For a long bias, look toward
           the buy-side liquidity area.
        */

        target =
            Math.max(
                high,
                currentPrice +
                dynamicDistance
            );


        type =
            "BUY SIDE LIQUIDITY";

    }


    // ===============================
    // SHORT
    // ===============================

    else if (
        direction === "SHORT"
    ) {

        /*
           For a short bias, look toward
           the sell-side liquidity area.
        */

        target =
            Math.min(
                low,
                currentPrice -
                dynamicDistance
            );


        type =
            "SELL SIDE LIQUIDITY";

    }


    // ===============================
    // WAIT / NEUTRAL
    // ===============================

    else {

        const highDistance =
            Math.abs(
                high -
                currentPrice
            );


        const lowDistance =
            Math.abs(
                currentPrice -
                low
            );


        if (
            highDistance <=
            lowDistance
        ) {

            target =
                high;


            type =
                "BUY SIDE LIQUIDITY";

        }

        else {

            target =
                low;


            type =
                "SELL SIDE LIQUIDITY";

        }

    }


    if (
        !Number.isFinite(target)
    ) {

        return "Building Liquidity";

    }


    return (
        "$" +
        target.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) +
        " " +
        type
    );

}


// ===============================
// UPDATE LIQUIDITY DISPLAY
// ===============================

function updateLiquidityDisplay() {

    liquidity.textContent =
        calculateLiquidityMagnet(
            lastSignal
        );

            }





// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 4 - FINAL
// 30 SECOND SCANNER + FINAL ANALYSIS
// ==========================================


// ===============================
// SCANNER STATE
// ===============================

let scanInterval = null;


// ===============================
// SCAN BUTTON
// ===============================

scanBtn.addEventListener(
    "click",
    startScan
);


// ===============================
// START SCAN
// ===============================

function startScan() {

    if (scanning) {

        return;

    }


    /*
       Scanner ko proper candle data
       chahiye. Kam data par fake
       result nahi dena.
    */

    if (
        candleCloses.length < 50
    ) {

        scanStatus.textContent =
            "Collecting market data...";

        voiceText.textContent =
            "Market data is still being collected.";

        return;

    }


    scanning = true;

    scanBtn.disabled = true;


    let seconds = 30;


    scanTimer.textContent =
        seconds;


    scanStatus.textContent =
        "Analyzing market momentum + liquidity...";


    voiceText.textContent =
        "Market analysis in progress.";


    scanInterval =
        setInterval(
            () => {

                seconds--;


                scanTimer.textContent =
                    seconds;


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        scanInterval
                    );

                    scanInterval =
                        null;


                    runAnalysis();

                }

            },
            1000
        );

}


// ===============================
// FINAL ANALYSIS
// ===============================

function runAnalysis() {

    if (
        candleCloses.length < 50 ||
        currentPrice <= 0
    ) {

        finishScan();

        return;

    }


    let longScore = 0;

    let shortScore = 0;


    // ===============================
    // RSI
    // ===============================

    const rsi =
        calculateRSI(
            candleCloses,
            14
        );


    if (
        rsi !== null
    ) {

        /*
           Oversold can support LONG.
        */

        if (
            rsi < 35
        ) {

            longScore += 20;

        }

        /*
           Healthy bullish zone.
        */

        else if (
            rsi >= 35 &&
            rsi < 55
        ) {

            longScore += 10;

        }


        /*
           Overbought can support SHORT.
        */

        else if (
            rsi > 70
        ) {

            shortScore += 20;

        }

        /*
           Weakening momentum.
        */

        else if (
            rsi >= 60 &&
            rsi <= 70
        ) {

            shortScore += 10;

        }

    }


    // ===============================
    // EMA TREND
    // ===============================

    const emaTrend =
        getEMATrend();


    if (
        emaTrend === "BULLISH"
    ) {

        longScore += 25;

    }

    else if (
        emaTrend === "BEARISH"
    ) {

        shortScore += 25;

    }

    /*
       NEUTRAL = no score.
    */


    // ===============================
    // MARKET STRUCTURE
    // ===============================

    const structure =
        marketStructure();


    if (
        structure === "UPTREND"
    ) {

        longScore += 20;

    }

    else if (
        structure === "DOWNTREND"
    ) {

        shortScore += 20;

    }


    // ===============================
    // VOLUME
    // ===============================

    const volume =
        analyzeVolume();


    if (
        volume.power === "HIGH"
    ) {

        /*
           High volume confirms
           the currently stronger side.
        */

        if (
            longScore >
            shortScore
        ) {

            longScore += 15;

        }

        else if (
            shortScore >
            longScore
        ) {

            shortScore += 15;

        }

    }

    else if (
        volume.power === "LOW"
    ) {

        /*
           Low volume reduces
           directional confidence.
        */

        longScore -= 5;

        shortScore -= 5;

    }


    // ===============================
    // VOLATILITY
    // ===============================

    const volatility =
        analyzeVolatility();


    if (
        volatility.includes(
            "HIGH"
        )
    ) {

        /*
           High volatility only adds
           a small confirmation when
           direction already exists.
        */

        if (
            longScore >
            shortScore
        ) {

            longScore += 5;

        }

        else if (
            shortScore >
            longScore
        ) {

            shortScore += 5;

        }

    }


    // ===============================
    // SCORE DIFFERENCE
    // ===============================

    const difference =
        longScore -
        shortScore;


    let result;


    // ===============================
    // LONG
    // ===============================

    if (
        longScore >= 45 &&
        difference >= 15
    ) {

        result =
            "LONG";

    }


    // ===============================
    // SHORT
    // ===============================

    else if (
        shortScore >= 45 &&
        difference <= -15
    ) {

        result =
            "SHORT";

    }


    // ===============================
    // WAIT
    // ===============================

    else {

        result =
            "WAIT";

    }


    // ===============================
    // CONFIDENCE
    // ===============================

    let confidenceScore;


    if (
        result === "WAIT"
    ) {

        confidenceScore =
            Math.min(
                60,
                40 +
                Math.abs(
                    difference
                )
            );

    }

    else {

        confidenceScore =
            Math.min(
                95,
                50 +
                Math.abs(
                    difference
                )
            );

    }


    confidence.textContent =
        Math.round(
            confidenceScore
        ) +
        "%";


    // ===============================
    // MOMENTUM
    // ===============================

    if (
        result === "LONG"
    ) {

        momentum.textContent =
            "BUY PRESSURE";

    }

    else if (
        result === "SHORT"
    ) {

        momentum.textContent =
            "SELL PRESSURE";

    }

    else {

        momentum.textContent =
            "Neutral";

    }


    // ===============================
    // FINAL SIGNAL
    // ===============================

    lastSignal =
        result;


    signal.textContent =
        result;


    if (
        result === "LONG"
    ) {

        signal.style.color =
            "#00ff88";

    }

    else if (
        result === "SHORT"
    ) {

        signal.style.color =
            "#ff4d6d";

    }

    else {

        signal.style.color =
            "#ffd166";

    }


    // ===============================
    // LIQUIDITY MAGNET
    // ===============================

    liquidity.textContent =
        calculateLiquidityMagnet(
            lastSignal
        );


    // ===============================
    // VOICE
    // ===============================

    if (
        result === "LONG"
    ) {

        speak(
            "Long opportunity detected."
        );

    }

    else if (
        result === "SHORT"
    ) {

        speak(
            "Short opportunity detected."
        );

    }

    else {

        speak(
            "Market is neutral. Wait for another opportunity."
        );

    }


    // ===============================
    // SCAN COMPLETE
    // ===============================

    scanTimer.textContent =
        "READY";


    scanStatus.textContent =
        "Analysis completed";


    scanning = false;

    scanBtn.disabled = false;

}


// ===============================
// FINISH SCAN
// ===============================

function finishScan() {

    if (
        scanInterval
    ) {

        clearInterval(
            scanInterval
        );

        scanInterval =
            null;

    }


    scanning = false;

    scanBtn.disabled = false;

    scanTimer.textContent =
        "READY";

}


// ===============================
// VOICE
// ===============================

function speak(text) {

    voiceText.textContent =
        text;


    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.rate =
        0.9;


    speech.pitch =
        1;


    window.speechSynthesis.speak(
        speech
    );

}


// ===============================
// INITIAL DISPLAY
// ===============================

signal.textContent =
    "WAIT";


signal.style.color =
    "#ffd166";


confidence.textContent =
    "0%";


momentum.textContent =
    "Neutral";


liquidity.textContent =
    "Building Liquidity";


voiceText.textContent =
    "Voice system ready";




