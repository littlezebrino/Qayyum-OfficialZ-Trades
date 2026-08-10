// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 1
// ==========================================


// ===============================
// ELEMENTS
// ===============================

const btcPrice = document.getElementById("btcPrice");
const priceChange = document.getElementById("priceChange");

const scanBtn = document.getElementById("scanBtn");
const scanTimer = document.getElementById("scanTimer");
const scanStatus = document.getElementById("scanStatus");

const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");

const momentum = document.getElementById("momentum");
const liquidity = document.getElementById("liquidity");

const rsiBox = document.getElementById("rsi");
const emaBox = document.getElementById("ema");
const volumeBox = document.getElementById("volume");
const volatilityBox = document.getElementById("volatility");

const voiceText = document.getElementById("voiceText");


// ===============================
// MARKET VARIABLES
// ===============================

let prices = [];

let volumes = [];

let currentPrice = 0;

let currentVolume = 0;

let dayChange = 0;

let lastSignal = "WAIT";

let scanning = false;


// ===============================
// BINANCE LIVE PRICE
// ===============================

let socket;


// Create Binance WebSocket connection

function connectMarketSocket() {

    socket = new WebSocket(
        "wss://stream.binance.com:9443/ws/btcusdt@trade"
    );


    socket.onopen = () => {

        console.log("BTC market connection established");

    };


    socket.onmessage = (event) => {

        try {

            const data = JSON.parse(event.data);


            currentPrice = parseFloat(data.p);

            currentVolume = parseFloat(data.q);


            if (
                !Number.isFinite(currentPrice) ||
                currentPrice <= 0
            ) {

                return;

            }


            // Display live BTC price

            btcPrice.textContent =
                "$" + currentPrice.toLocaleString(
                    "en-US",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );


            // Store price data

            prices.push(currentPrice);

            volumes.push(currentVolume);


            // Keep enough recent data
            // without allowing unlimited memory growth

            if (prices.length > 500) {

                prices.shift();

            }


            if (volumes.length > 500) {

                volumes.shift();

            }


            // Update chart

            updateChart(currentPrice);


            // Update visible indicators

            updateIndicators();

        }

        catch (error) {

            console.error(
                "Market data error:",
                error
            );

        }

    };


    socket.onerror = (error) => {

        console.error(
            "Binance WebSocket error:",
            error
        );

    };


    socket.onclose = () => {

        console.log(
            "Market connection closed. Reconnecting..."
        );


        setTimeout(
            connectMarketSocket,
            3000
        );

    };

}


// Start market connection

connectMarketSocket();


// ===============================
// 24H BTC CHANGE
// ===============================

async function get24HourChange() {

    try {

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
        );


        if (!response.ok) {

            throw new Error(
                "24H market request failed"
            );

        }


        const data = await response.json();


        dayChange =
            parseFloat(
                data.priceChangePercent
            );


        if (!Number.isFinite(dayChange)) {

            return;

        }


        priceChange.textContent =
            (dayChange >= 0 ? "+" : "") +
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


// Get initial 24H change

get24HourChange();


// Keep 24H change updated

setInterval(
    get24HourChange,
    10000
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
        canvas.getContext("2d");


    chart = new Chart(
        ctx,
        {

            type: "line",


            data: {

                labels: [],


                datasets: [

                    {

                        label: "BTC",

                        data: [],

                        borderColor: "#00f5ff",

                        borderWidth: 2,

                        tension: 0.4,

                        pointRadius: 0,

                        fill: false

                    }

                ]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,


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

    if (!chart) {

        return;

    }


    chart.data.labels.push("");

    chart.data.datasets[0].data.push(
        price
    );


    // Keep chart lightweight

    if (
        chart.data.labels.length > 60
    ) {

        chart.data.labels.shift();

        chart.data.datasets[0]
            .data.shift();

    }


    chart.update("none");

                }




// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 2
// INDICATORS ENGINE
// ==========================================


// ===============================
// RSI
// ===============================

function calculateRSI(data, period = 14) {

    if (
        !Array.isArray(data) ||
        data.length < period + 1
    ) {

        return null;

    }


    let gains = 0;

    let losses = 0;


    // Initial average gain/loss

    for (
        let i = data.length - period;
        i < data.length;
        i++
    ) {

        const change =
            data[i] - data[i - 1];


        if (change > 0) {

            gains += change;

        }

        else {

            losses += Math.abs(change);

        }

    }


    const averageGain =
        gains / period;


    const averageLoss =
        losses / period;


    // No losses means extremely strong momentum

    if (averageLoss === 0) {

        return 100;

    }


    const rs =
        averageGain / averageLoss;


    const rsi =
        100 -
        (100 / (1 + rs));


    // Keep RSI inside valid range

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


    // Start with SMA

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
        2 / (period + 1);


    // Continue EMA calculation

    for (
        let i = period;
        i < data.length;
        i++
    ) {

        ema =
            (
                data[i] - ema
            ) *
            multiplier +
            ema;

    }


    return ema;

}


// ===============================
// EMA TREND
// ===============================

function getEMATrend(
    data,
    period = 20
) {

    if (
        !Array.isArray(data) ||
        data.length < period + 5
    ) {

        return "NEUTRAL";

    }


    const ema =
        calculateEMA(
            data,
            period
        );


    if (ema === null) {

        return "NEUTRAL";

    }


    const latestPrice =
        data[data.length - 1];


    // Small neutral zone prevents
    // constant flipping around EMA

    const neutralRange =
        ema * 0.0005;


    if (
        latestPrice >
        ema + neutralRange
    ) {

        return "BULLISH";

    }


    if (
        latestPrice <
        ema - neutralRange
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
        !Array.isArray(volumes) ||
        volumes.length < 20
    ) {

        return {

            value: "Collecting",

            power: "NORMAL"

        };

    }


    const recentVolumes =
        volumes.slice(-20);


    const averageVolume =
        recentVolumes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        recentVolumes.length;


    const current =
        recentVolumes[
            recentVolumes.length - 1
        ];


    if (
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


    let power;


    if (
        current >
        averageVolume * 1.5
    ) {

        power = "HIGH";

    }

    else if (
        current <
        averageVolume * 0.7
    ) {

        power = "LOW";

    }

    else {

        power = "NORMAL";

    }


    return {

        value:
            current.toFixed(6) +
            " BTC",

        power: power

    };

}


// ===============================
// VOLATILITY
// ===============================

function analyzeVolatility() {

    if (
        !Array.isArray(prices) ||
        prices.length < 20
    ) {

        return "Collecting";

    }


    const recent =
        prices.slice(-20);


    const high =
        Math.max(...recent);


    const low =
        Math.min(...recent);


    const range =
        high - low;


    if (
        !Number.isFinite(range)
    ) {

        return "Collecting";

    }


    // Convert range into percentage
    // so volatility adapts to BTC price

    const volatilityPercent =
        (
            range /
            currentPrice
        ) * 100;


    let level;


    if (
        volatilityPercent >= 0.35
    ) {

        level = "HIGH";

    }

    else if (
        volatilityPercent >= 0.15
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
        !currentPrice ||
        prices.length < 20
    ) {

        rsiBox.textContent = "--";

        emaBox.textContent = "NEUTRAL";

        volumeBox.textContent = "Collecting";

        volatilityBox.textContent =
            "Collecting";

        return;

    }


    // RSI

    const rsi =
        calculateRSI(
            prices,
            14
        );


    if (rsi === null) {

        rsiBox.textContent = "--";

    }

    else {

        rsiBox.textContent =
            rsi.toFixed(1);

    }


    // EMA Trend

    const emaTrend =
        getEMATrend(
            prices,
            20
        );


    emaBox.textContent =
        emaTrend;


    // Volume

    const volume =
        analyzeVolume();


    volumeBox.textContent =
        volume.value +
        " " +
        volume.power;


    // Volatility

    volatilityBox.textContent =
        analyzeVolatility();

}






// ==========================================
// BTC QUANT SCANNER ENGINE
// JAVASCRIPT PART 3
// MARKET STRUCTURE + LIQUIDITY
// ==========================================


// ===============================
// MARKET STRUCTURE
// ===============================

function marketStructure() {

    if (
        !Array.isArray(prices) ||
        prices.length < 40
    ) {

        return "NEUTRAL";

    }


    const recent =
        prices.slice(-40);


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


    const threshold =
        currentPrice * 0.0003;


    if (
        difference > threshold
    ) {

        return "UPTREND";

    }


    if (
        difference < -threshold
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
        !Array.isArray(prices) ||
        prices.length < 50
    ) {

        return "Building Liquidity";

    }


    const recentPrices =
        prices.slice(-50);


    const high =
        Math.max(
            ...recentPrices
        );


    const low =
        Math.min(
            ...recentPrices
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
       Dynamic liquidity distance.

       This is NOT TP or SL.
       It is simply a calculated
       potential liquidity area.
    */

    const distance =
        Math.max(
            currentPrice * 0.0015,
            range * 0.8
        );


    let target;

    let type;


    // ===============================
    // LONG
    // ===============================

    if (
        direction === "LONG"
    ) {

        target =
            currentPrice +
            distance;


        type =
            "BUY SIDE LIQUIDITY";

    }


    // ===============================
    // SHORT
    // ===============================

    else if (
        direction === "SHORT"
    ) {

        target =
            currentPrice -
            distance;


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
            highDistance <
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
// LIQUIDITY DISPLAY
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
// SCANNER + SIGNAL + VOICE
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
// START 30 SECOND SCAN
// ===============================

function startScan() {

    if (scanning) {

        return;

    }


    if (prices.length < 50) {

        scanStatus.textContent =
            "Collecting market data. Please wait...";

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


                if (seconds <= 0) {

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
// FINAL MARKET ANALYSIS
// ===============================

function runAnalysis() {

    if (
        !currentPrice ||
        prices.length < 50
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
            prices,
            14
        );


    if (rsi !== null) {

        // Oversold = bullish opportunity

        if (rsi <= 35) {

            longScore += 20;

        }

        // Strong but not extreme bullish momentum

        else if (
            rsi > 35 &&
            rsi < 60
        ) {

            longScore += 10;

        }


        // Overbought = bearish pressure

        else if (rsi >= 70) {

            shortScore += 20;

        }

        // Weak momentum

        else if (
            rsi >= 60 &&
            rsi < 70
        ) {

            shortScore += 10;

        }

    }


    // ===============================
    // EMA TREND
    // ===============================

    const emaTrend =
        getEMATrend(
            prices,
            20
        );


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
           the stronger current side.
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
           Low volume reduces confidence.
           No direct bullish/bearish score.
        */

        longScore -= 5;

        shortScore -= 5;

    }


    // ===============================
    // VOLATILITY
    // ===============================

    const volatilityText =
        analyzeVolatility();


    if (
        volatilityText.includes(
            "HIGH"
        )
    ) {

        /*
           High volatility can support
           a directional move, but only
           when another side already leads.
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
    // FINAL SCORE
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

        result = "LONG";

    }


    // ===============================
    // SHORT
    // ===============================

    else if (
        shortScore >= 45 &&
        difference <= -15
    ) {

        result = "SHORT";

    }


    // ===============================
    // WAIT
    // ===============================

    else {

        result = "WAIT";

    }


    // ===============================
    // CONFIDENCE
    // ===============================

    const strongestScore =
        Math.max(
            longScore,
            shortScore
        );


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
    // SIGNAL DISPLAY
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
// FINISH SCAN SAFELY
// ===============================

function finishScan() {

    if (scanInterval) {

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
// VOICE SYSTEM
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


    speech.rate = 0.9;

    speech.pitch = 1;


    window.speechSynthesis.speak(
        speech
    );

}


// ===============================
// INITIAL STATE
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

