/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 1
        BINANCE LIVE DATA ENGINE
==================================================*/


//================ GLOBAL VARIABLES =================


let btcPrice = 0;

let previousPrice = 0;

let candleData = [];

let socket;

let currentCandle = {};



//================ CLOCK =================


function updateClock(){

    const now = new Date();

    const time = 
    now.getHours().toString().padStart(2,"0")
    + ":" +
    now.getMinutes().toString().padStart(2,"0")
    + ":" +
    now.getSeconds().toString().padStart(2,"0");


    const clock = document.getElementById("clock");

    if(clock){

        clock.innerText = time;

    }

}


setInterval(updateClock,1000);



//================ BINANCE WEBSOCKET =================


// BTCUSDT 1 Hour Candle Stream

function connectBinance(){


    socket = new WebSocket(

    "wss://stream.binance.com:9443/ws/btcusdt@kline_1h"

    );



    socket.onopen = function(){


        console.log(
        "Binance WebSocket Connected"
        );


        updateConnection(true);


    };



    socket.onmessage = function(event){


        const data = JSON.parse(event.data);


        handleCandle(data);


    };



    socket.onerror = function(error){


        console.log(
        "WebSocket Error",
        error
        );


        updateConnection(false);


    };



    socket.onclose = function(){


        console.log(
        "Connection Closed Reconnecting..."
        );


        updateConnection(false);


        setTimeout(
            connectBinance,
            5000
        );


    };


}




//================ HANDLE CANDLE =================


function handleCandle(data){


    const candle = data.k;



    currentCandle = {


        time:
        candle.t,


        open:
        Number(candle.o),


        high:
        Number(candle.h),


        low:
        Number(candle.l),


        close:
        Number(candle.c),


        volume:
        Number(candle.v),


        closed:
        candle.x


    };



    btcPrice =
    currentCandle.close;



    updatePrice();



    saveCandle();



}



//================ SAVE CANDLES =================


function saveCandle(){


    if(currentCandle.closed){


        candleData.push(
            currentCandle
        );



        // Keep last 500 candles

        if(candleData.length > 500){


            candleData.shift();


        }


        console.log(
            "Candle Saved",
            candleData.length
        );


    }


}



//================ UPDATE PRICE =================


function updatePrice(){


    const priceBox =
    document.getElementById(
        "btcPrice"
    );


    const changeBox =
    document.getElementById(
        "btcChange"
    );



    if(priceBox){


        priceBox.innerText =

        "$" +

        btcPrice.toLocaleString(
            "en-US",
            {
                maximumFractionDigits:2
            }
        );


    }




    if(previousPrice !== 0){


        let change =

        (
            (btcPrice - previousPrice)
            /
            previousPrice
        )
        *
        100;



        if(changeBox){


            changeBox.innerText =

            change.toFixed(2)
            +
            "%";


            if(change >= 0){


                changeBox.style.color =
                "#00ff9d";


            }

            else{


                changeBox.style.color =
                "#ff4d6d";


            }


        }


    }



    previousPrice =
    btcPrice;


}




//================ CONNECTION STATUS =================


function updateConnection(status){


    const box =
    document.querySelector(
        ".connection"
    );


    if(!box) return;



    if(status){


        box.innerText =
        "LIVE";


        box.classList.add(
            "online"
        );


    }

    else{


        box.innerText =
        "OFFLINE";


        box.classList.remove(
            "online"
        );


    }


}





//================ START SYSTEM =================


connectBinance();



/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 2
          LIVE CHART ENGINE
==================================================*/


//================ CHART VARIABLES =================


let chart;

let candleSeries;

let volumeSeries;



//================ CREATE CHART =================


function createChart(){


    const chartContainer = 
    document.getElementById(
        "chart"
    );


    if(!chartContainer){

        console.log(
            "Chart container missing"
        );

        return;

    }



    chart = 
    LightweightCharts.createChart(

        chartContainer,

        {

            layout:{

                background:{
                    color:"#080b12"
                },

                textColor:"#c8d1dc"

            },


            grid:{

                vertLines:{
                    color:"rgba(255,255,255,0.05)"
                },


                horzLines:{
                    color:"rgba(255,255,255,0.05)"
                }

            },


            crosshair:{

                mode:
                LightweightCharts.CrosshairMode.Normal

            },


            rightPriceScale:{

                borderColor:
                "rgba(255,255,255,0.1)"

            },


            timeScale:{

                borderColor:
                "rgba(255,255,255,0.1)",

                timeVisible:true

            }


        }


    );





    //================ CANDLE SERIES =================



    candleSeries = chart.addCandlestickSeries({

        upColor:"#00ff9d",

        downColor:"#ff4d6d",

        borderVisible:false,

        wickUpColor:"#00ff9d",

        wickDownColor:"#ff4d6d"


    });





    //================ VOLUME SERIES =================



    volumeSeries = 
    chart.addHistogramSeries({

        color:"#3aa8ff",

        priceFormat:{

            type:"volume"

        },


        priceScaleId:""


    });



    chart.priceScale("")
    .applyOptions({

        scaleMargins:{

            top:0.8,

            bottom:0

        }


    });



    window.addEventListener(
        "resize",
        resizeChart
    );


    resizeChart();


}





//================ RESIZE =================


function resizeChart(){


    const container =
    document.getElementById(
        "chart"
    );


    if(chart && container){


        chart.resize(

            container.clientWidth,

            container.clientHeight

        );


    }


}



//================ LOAD OLD DATA =================


function loadChartHistory(){


    if(

        candleData.length === 0 ||
        !candleSeries

    ){

        return;

    }



    let candles = candleData.map(
        candle => ({

            time:
            candle.time / 1000,


            open:
            candle.open,


            high:
            candle.high,


            low:
            candle.low,


            close:
            candle.close


        })

    );



    let volumes = candleData.map(
        candle => ({

            time:
            candle.time / 1000,


            value:
            candle.volume,


            color:
            candle.close >= candle.open

            ?

            "#00ff9d"

            :

            "#ff4d6d"


        })

    );



    candleSeries.setData(
        candles
    );


    volumeSeries.setData(
        volumes
    );


    chart.timeScale()
    .fitContent();


}





//================ UPDATE LIVE CANDLE =================


function updateLiveChart(){


    if(

        !candleSeries ||
        !currentCandle.time

    ){

        return;

    }



    candleSeries.update({

        time:
        currentCandle.time / 1000,


        open:
        currentCandle.open,


        high:
        currentCandle.high,


        low:
        currentCandle.low,


        close:
        currentCandle.close


    });



    volumeSeries.update({

        time:
        currentCandle.time / 1000,


        value:
        currentCandle.volume,


        color:

        currentCandle.close >=
        currentCandle.open

        ?

        "#00ff9d"

        :

        "#ff4d6d"


    });



}



//================ OVERRIDE CANDLE HANDLER =================


// Part 1 ke handleCandle ko extend kar rahe hain


const oldHandleCandle =
handleCandle;



handleCandle = function(data){


    oldHandleCandle(data);


    updateLiveChart();


};




//================ START CHART =================


window.addEventListener(

"load",

function(){


    createChart();



    setTimeout(

        loadChartHistory,

        2000

    );


}

);



/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 3
          INDICATOR ENGINE
==================================================*/


//================ INDICATOR STORAGE =================


let indicators = {

    ema20:0,

    ema50:0,

    ema100:0,

    ema200:0,

    rsi:0,

    macd:0,

    bollinger:{

        upper:0,

        middle:0,

        lower:0

    },

    vwap:0,

    atr:0,

    adx:0

};



//================ EMA =================


function calculateEMA(values, period){


    if(values.length < period){

        return 0;

    }


    let multiplier =
    2 / (period + 1);


    let ema =
    values
    .slice(0,period)
    .reduce(
        (a,b)=>a+b,
        0
    )
    /
    period;



    for(
        let i = period;
        i < values.length;
        i++
    ){


        ema =

        (

            values[i] - ema

        )

        *

        multiplier

        +

        ema;


    }


    return ema;


}





//================ RSI =================


function calculateRSI(values,period=14){


    if(values.length <= period){

        return 0;

    }



    let gains = 0;

    let losses = 0;



    for(
        let i = values.length-period;
        i < values.length;
        i++
    ){


        let diff =
        values[i]
        -
        values[i-1];



        if(diff >=0){

            gains += diff;

        }

        else{

            losses -= diff;

        }


    }



    let rs =
    gains /
    (losses || 1);



    return 100 -
    (
        100 /
        (1+rs)
    );


}





//================ MACD =================


function calculateMACD(values){


    let ema12 =
    calculateEMA(
        values,
        12
    );


    let ema26 =
    calculateEMA(
        values,
        26
    );


    return ema12 - ema26;


}





//================ BOLLINGER BANDS =================


function calculateBollinger(values,period=20){


    if(values.length < period){

        return {

            upper:0,

            middle:0,

            lower:0

        };

    }



    let slice =
    values.slice(
        -period
    );



    let mean =
    slice.reduce(
        (a,b)=>a+b,
        0
    )
    /
    period;



    let variance =

    slice.reduce(

        (sum,value)=>{

            return sum +
            Math.pow(
                value-mean,
                2
            );

        },

        0

    )
    /
    period;



    let deviation =
    Math.sqrt(
        variance
    );



    return {


        upper:
        mean +
        (deviation*2),


        middle:
        mean,


        lower:
        mean -
        (deviation*2)


    };


}





//================ VWAP =================


function calculateVWAP(candles){


    let totalVolume = 0;

    let totalValue = 0;



    candles.forEach(
        candle=>{


            let typical =

            (

                candle.high +
                candle.low +
                candle.close

            )
            /
            3;



            totalValue +=
            typical *
            candle.volume;



            totalVolume +=
            candle.volume;


        }

    );



    return totalVolume

    ?

    totalValue /
    totalVolume

    :

    0;


}





//================ ATR =================


function calculateATR(candles,period=14){


    if(candles.length < period){

        return 0;

    }



    let trs = [];



    for(
        let i=1;
        i<candles.length;
        i++
    ){


        let high =
        candles[i].high;


        let low =
        candles[i].low;


        let previous =
        candles[i-1].close;



        let tr = Math.max(

            high-low,

            Math.abs(
                high-previous
            ),

            Math.abs(
                low-previous
            )

        );



        trs.push(tr);


    }



    return calculateEMA(
        trs,
        period
    );


}





//================ BASIC ADX =================


function calculateADX(candles){


    if(candles.length < 20){

        return 0;

    }



    let movement = [];


    for(
        let i=1;
        i<candles.length;
        i++
    ){


        movement.push(

            Math.abs(

                candles[i].close -
                candles[i-1].close

            )

        );


    }



    let avg =

    movement.reduce(
        (a,b)=>a+b,
        0
    )
    /
    movement.length;



    return Math.min(

        100,

        avg /
        candles[candles.length-1].close
        *
        10000

    );


}





//================ RUN ALL INDICATORS =================


function calculateIndicators(){


    if(
        candleData.length < 50
    ){

        return;

    }



    let closes =

    candleData.map(

        candle =>
        candle.close

    );



    indicators.ema20 =
    calculateEMA(
        closes,
        20
    );


    indicators.ema50 =
    calculateEMA(
        closes,
        50
    );


    indicators.ema100 =
    calculateEMA(
        closes,
        100
    );


    indicators.ema200 =
    calculateEMA(
        closes,
        200
    );


    indicators.rsi =
    calculateRSI(
        closes
    );


    indicators.macd =
    calculateMACD(
        closes
    );


    indicators.bollinger =
    calculateBollinger(
        closes
    );


    indicators.vwap =
    calculateVWAP(
        candleData
    );


    indicators.atr =
    calculateATR(
        candleData
    );


    indicators.adx =
    calculateADX(
        candleData
    );



    updateIndicatorUI();


}





//================ UPDATE UI =================


function updateIndicatorUI(){


    const ids = {


        ema20:"ema20",

        ema50:"ema50",

        ema100:"ema100",

        ema200:"ema200",

        rsi:"rsiValue",

        macd:"macdValue",

        vwap:"vwapValue",

        atr:"atrValue",

        adx:"adxValue"


    };



    for(
        let key in ids
    ){


        let element =
        document.getElementById(
            ids[key]
        );


        if(element){


            element.innerText =

            Number(
                indicators[key]
            )
            .toFixed(2);


        }


    }



    let bb =
    document.getElementById(
        "bbValue"
    );


    if(bb){


        bb.innerText =

        indicators.bollinger.middle
        .toFixed(2);


    }


}



//================ AUTO UPDATE =================


setInterval(

function(){


    calculateIndicators();


},

3000

);



/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 4
     SUPPORT RESISTANCE + TRENDLINE ENGINE
==================================================*/


//================ STORAGE =================


let marketStructure = {

    supports:[],

    resistances:[],

    swingHighs:[],

    swingLows:[],

    trendDirection:"NEUTRAL"

};



let supportLines = [];

let resistanceLines = [];

let trendLineSeries = [];



//================ SWING HIGH DETECTION =================


function findSwingHighs(candles,range=3){


    let highs = [];



    for(
        let i=range;
        i<candles.length-range;
        i++
    ){


        let current =
        candles[i].high;


        let isHigh = true;



        for(
            let x=1;
            x<=range;
            x++
        ){


            if(

                current <= candles[i-x].high ||
                current <= candles[i+x].high

            ){

                isHigh=false;

                break;

            }


        }



        if(isHigh){


            highs.push({

                price:current,

                time:candles[i].time

            });


        }


    }



    return highs;


}





//================ SWING LOW DETECTION =================


function findSwingLows(candles,range=3){


    let lows = [];



    for(
        let i=range;
        i<candles.length-range;
        i++
    ){


        let current =
        candles[i].low;


        let isLow = true;



        for(
            let x=1;
            x<=range;
            x++
        ){


            if(

                current >= candles[i-x].low ||
                current >= candles[i+x].low

            ){

                isLow=false;

                break;

            }


        }



        if(isLow){


            lows.push({

                price:current,

                time:candles[i].time

            });


        }


    }



    return lows;


}





//================ CLUSTER LEVELS =================


function createLevels(points,distance=500){


    let levels=[];



    points.forEach(point=>{


        let found =
        levels.find(level=>

            Math.abs(
                level.price -
                point.price
            )
            <
            distance

        );



        if(found){


            found.count++;


            found.price =

            (

                found.price +
                point.price

            )
            /
            2;


        }

        else{


            levels.push({

                price:
                point.price,

                count:1

            });


        }


    });



    return levels

    .sort(

        (a,b)=>

        b.count-a.count

    )

    .slice(
        0,
        5
    );


}





//================ SUPPORT RESISTANCE =================


function calculateSupportResistance(){


    if(
        candleData.length < 50
    ){

        return;

    }



    let highs =
    findSwingHighs(
        candleData
    );


    let lows =
    findSwingLows(
        candleData
    );



    marketStructure.swingHighs =
    highs;


    marketStructure.swingLows =
    lows;



    marketStructure.resistances =

    createLevels(
        highs
    );



    marketStructure.supports =

    createLevels(
        lows
    );



    drawSupportResistance();


}





//================ DRAW LEVELS =================


function drawSupportResistance(){


    if(!chart || !candleSeries){

        return;

    }



    supportLines.forEach(line=>{

        chart.removeSeries(line);

    });



    resistanceLines.forEach(line=>{

        chart.removeSeries(line);

    });



    supportLines=[];

    resistanceLines=[];




    marketStructure.supports
    .forEach(level=>{


        let line =

        chart.addLineSeries({

            color:"#00ff9d",

            lineWidth:1,

            priceLineVisible:false

        });



        line.setData([

            {

                time:
                candleData[0].time/1000,

                value:
                level.price

            },

            {

                time:
                candleData[
                candleData.length-1
                ]
                .time/1000,

                value:
                level.price

            }

        ]);



        supportLines.push(line);



    });





    marketStructure.resistances
    .forEach(level=>{


        let line =

        chart.addLineSeries({

            color:"#ff4d6d",

            lineWidth:1,

            priceLineVisible:false

        });



        line.setData([

            {

                time:
                candleData[0].time/1000,

                value:
                level.price

            },

            {

                time:
                candleData[
                candleData.length-1
                ]
                .time/1000,

                value:
                level.price

            }

        ]);



        resistanceLines.push(line);



    });


}





//================ TREND DETECTION =================


function calculateTrend(){


    let ema20 =
    indicators.ema20;


    let ema50 =
    indicators.ema50;



    if(
        ema20 > ema50
    ){


        marketStructure.trendDirection =
        "BULLISH";


    }

    else if(
        ema20 < ema50
    ){


        marketStructure.trendDirection =
        "BEARISH";


    }

    else{


        marketStructure.trendDirection =
        "SIDEWAYS";


    }



    let trendBox =
    document.getElementById(
        "trendStatus"
    );



    if(trendBox){


        trendBox.innerText =
        marketStructure.trendDirection;


    }


}





//================ TRENDLINE DATA =================


function calculateTrendline(){


    if(
        marketStructure.swingLows.length < 2
    ){

        return;

    }



    let points =
    marketStructure.swingLows
    .slice(-2);



    let series =

    chart.addLineSeries({

        color:"#3aa8ff",

        lineWidth:2

    });



    series.setData([

        {

            time:
            points[0].time/1000,

            value:
            points[0].price

        },

        {

            time:
            points[1].time/1000,

            value:
            points[1].price

        }

    ]);



    trendLineSeries.push(series);


}





//================ AUTO ENGINE =================


setInterval(

function(){


    calculateSupportResistance();


    calculateTrend();


    calculateTrendline();


},

10000

);


/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 5
          PATTERN DETECTION ENGINE
==================================================*/


//================ PATTERN STORAGE =================


let detectedPatterns = [];



//================ HELPERS =================


function getRecentCandles(count=50){

    return candleData.slice(-count);

}



function getHighs(candles){

    return candles.map(
        c=>c.high
    );

}



function getLows(candles){

    return candles.map(
        c=>c.low
    );

}




//================ DOUBLE TOP =================


function detectDoubleTop(candles){


    let highs =
    getHighs(candles);



    let max1 =
    Math.max(
        ...highs.slice(0,-10)
    );


    let max2 =
    Math.max(
        ...highs.slice(-10)
    );



    let difference =

    Math.abs(
        max1-max2
    )
    /
    max1;



    if(
        difference < 0.015
    ){

        return {

            name:"Double Top",

            bias:"BEARISH",

            confidence:75

        };

    }


    return null;

}





//================ DOUBLE BOTTOM =================


function detectDoubleBottom(candles){


    let lows =
    getLows(candles);



    let min1 =
    Math.min(
        ...lows.slice(0,-10)
    );


    let min2 =
    Math.min(
        ...lows.slice(-10)
    );



    let difference =

    Math.abs(
        min1-min2
    )
    /
    min1;



    if(
        difference < 0.015
    ){

        return {

            name:"Double Bottom",

            bias:"BULLISH",

            confidence:75

        };

    }


    return null;


}





//================ RISING WEDGE =================


function detectRisingWedge(candles){


    let highs =
    getHighs(candles);


    let lows =
    getLows(candles);



    let highTrend =

    highs[highs.length-1]
    >
    highs[0];



    let lowTrend =

    lows[lows.length-1]
    >
    lows[0];



    if(
        highTrend &&
        lowTrend
    ){

        return {

            name:"Rising Wedge",

            bias:"BEARISH",

            confidence:70

        };

    }



    return null;

}





//================ FALLING WEDGE =================


function detectFallingWedge(candles){


    let highs =
    getHighs(candles);


    let lows =
    getLows(candles);



    let highDown =

    highs[highs.length-1]
    <
    highs[0];



    let lowDown =

    lows[lows.length-1]
    <
    lows[0];



    if(
        highDown &&
        lowDown
    ){

        return {

            name:"Falling Wedge",

            bias:"BULLISH",

            confidence:70

        };

    }



    return null;

}





//================ TRIANGLE =================


function detectTriangle(candles){


    let highs =
    getHighs(candles);


    let lows =
    getLows(candles);



    let highSlope =

    highs[highs.length-1]
    -
    highs[0];



    let lowSlope =

    lows[lows.length-1]
    -
    lows[0];




    if(
        highSlope < 0 &&
        lowSlope > 0
    ){

        return {

            name:"Symmetrical Triangle",

            bias:"BREAKOUT",

            confidence:65

        };

    }



    if(
        highSlope < 0 &&
        Math.abs(lowSlope)<highSlope
    ){

        return {

            name:"Descending Triangle",

            bias:"BEARISH",

            confidence:65

        };

    }



    if(
        lowSlope > 0 &&
        Math.abs(highSlope)<lowSlope
    ){

        return {

            name:"Ascending Triangle",

            bias:"BULLISH",

            confidence:65

        };

    }


    return null;


}





//================ FLAG DETECTION =================


function detectFlag(candles){


    let first =
    candles[0].close;


    let last =
    candles[candles.length-1].close;



    let move =

    (
        last-first
    )
    /
    first;



    if(
        move > 0.05
    ){

        return {

            name:"Bull Flag",

            bias:"BULLISH",

            confidence:60

        };

    }



    if(
        move < -0.05
    ){

        return {

            name:"Bear Flag",

            bias:"BEARISH",

            confidence:60

        };

    }



    return null;


}





//================ HEAD SHOULDERS =================


function detectHeadShoulders(candles){


    let highs =
    getHighs(candles);



    let middle =
    highs[
        Math.floor(
            highs.length/2
        )
    ];



    let left =
    highs[5];


    let right =
    highs[
        highs.length-5
    ];



    if(

        middle > left &&
        middle > right

    ){

        return {

            name:"Head & Shoulders",

            bias:"BEARISH",

            confidence:65

        };

    }


    return null;


}





//================ RUN PATTERN SCAN =================


function scanPatterns(){


    let candles =
    getRecentCandles();



    if(
        candles.length < 30
    ){

        return;

    }



    let results=[];



    let patterns=[

        detectDoubleTop(candles),

        detectDoubleBottom(candles),

        detectRisingWedge(candles),

        detectFallingWedge(candles),

        detectTriangle(candles),

        detectFlag(candles),

        detectHeadShoulders(candles)

    ];



    patterns.forEach(
        pattern=>{


            if(pattern){

                results.push(pattern);

            }


        }

    );



    detectedPatterns =
    results;



    updatePatternUI();


}





//================ UPDATE PATTERN PANEL =================


function updatePatternUI(){


    let box =
    document.getElementById(
        "patternList"
    );



    if(!box){

        return;

    }



    if(
        detectedPatterns.length===0
    ){

        box.innerHTML =
        "No Pattern Detected";


        return;

    }



    box.innerHTML="";



    detectedPatterns.forEach(
        p=>{


            box.innerHTML += `

            <div class="pattern-item">

            ${p.name}

            <br>

            Bias:
            ${p.bias}

            <br>

            Confidence:
            ${p.confidence}%

            </div>

            `;


        }

    );


}





//================ AUTO SCAN =================


setInterval(

function(){


    scanPatterns();


},

15000

);


/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 6
       CANDLESTICK PATTERN ENGINE
==================================================*/


//================ STORAGE =================


let detectedCandles = [];



//================ HELPERS =================


function lastCandles(count){

    return candleData.slice(-count);

}



function candleBody(candle){

    return Math.abs(
        candle.close -
        candle.open
    );

}



function isBullish(candle){

    return candle.close > candle.open;

}



function isBearish(candle){

    return candle.close < candle.open;

}





//================ BULLISH ENGULFING =================


function bullishEngulfing(candles){


    let c1 =
    candles[candles.length-2];


    let c2 =
    candles[candles.length-1];



    if(

        isBearish(c1) &&

        isBullish(c2) &&

        c2.open < c1.close &&

        c2.close > c1.open

    ){

        return {

            name:"Bullish Engulfing",

            bias:"BULLISH",

            confidence:80

        };

    }


    return null;

}





//================ BEARISH ENGULFING =================


function bearishEngulfing(candles){


    let c1 =
    candles[candles.length-2];


    let c2 =
    candles[candles.length-1];



    if(

        isBullish(c1) &&

        isBearish(c2) &&

        c2.open > c1.close &&

        c2.close < c1.open

    ){

        return {

            name:"Bearish Engulfing",

            bias:"BEARISH",

            confidence:80

        };

    }



    return null;


}





//================ HAMMER =================


function hammer(candles){


    let c =
    candles[candles.length-1];



    let body =
    candleBody(c);


    let lowerWick =

    Math.min(
        c.open,
        c.close
    )
    -
    c.low;



    let upperWick =

    c.high -
    Math.max(
        c.open,
        c.close
    );



    if(

        lowerWick > body*2 &&

        upperWick < body

    ){

        return {

            name:"Hammer",

            bias:"BULLISH",

            confidence:70

        };

    }



    return null;


}





//================ INVERTED HAMMER =================


function invertedHammer(candles){


    let c =
    candles[candles.length-1];


    let body =
    candleBody(c);


    let upperWick =
    c.high -
    Math.max(
        c.open,
        c.close
    );


    let lowerWick =
    Math.min(
        c.open,
        c.close
    )
    -
    c.low;



    if(

        upperWick > body*2 &&

        lowerWick < body

    ){

        return {

            name:"Inverted Hammer",

            bias:"BULLISH",

            confidence:65

        };

    }



    return null;


}





//================ SHOOTING STAR =================


function shootingStar(candles){


    let c =
    candles[candles.length-1];


    let body =
    candleBody(c);


    let upperWick =

    c.high -
    Math.max(
        c.open,
        c.close
    );


    let lowerWick =

    Math.min(
        c.open,
        c.close
    )
    -
    c.low;



    if(

        upperWick > body*3 &&

        lowerWick < body

    ){

        return {

            name:"Shooting Star",

            bias:"BEARISH",

            confidence:70

        };

    }



    return null;


}





//================ DOJI =================


function doji(candles){


    let c =
    candles[candles.length-1];


    let body =
    candleBody(c);


    if(

        body <
        (
            c.high -
            c.low
        )
        *
        0.1

    ){

        return {

            name:"Doji",

            bias:"NEUTRAL",

            confidence:60

        };

    }



    return null;


}





//================ MORNING STAR =================


function morningStar(candles){


    if(candles.length < 3){

        return null;

    }



    let a =
    candles[candles.length-3];


    let b =
    candles[candles.length-2];


    let c =
    candles[candles.length-1];



    if(

        isBearish(a) &&

        candleBody(b) < candleBody(a)*0.4 &&

        isBullish(c) &&

        c.close > a.open

    ){

        return {

            name:"Morning Star",

            bias:"BULLISH",

            confidence:85

        };

    }


    return null;


}





//================ EVENING STAR =================


function eveningStar(candles){


    if(candles.length < 3){

        return null;

    }



    let a =
    candles[candles.length-3];


    let b =
    candles[candles.length-2];


    let c =
    candles[candles.length-1];



    if(

        isBullish(a) &&

        candleBody(b) < candleBody(a)*0.4 &&

        isBearish(c) &&

        c.close < a.open

    ){

        return {

            name:"Evening Star",

            bias:"BEARISH",

            confidence:85

        };

    }


    return null;


}





//================ THREE SOLDIERS =================


function threeWhiteSoldiers(candles){


    if(candles.length < 3){

        return null;

    }



    let x =
    candles.slice(-3);



    if(

        x.every(isBullish)

    ){

        return {

            name:"Three White Soldiers",

            bias:"BULLISH",

            confidence:80

        };

    }


    return null;


}





//================ THREE BLACK CROWS =================


function threeBlackCrows(candles){


    if(candles.length < 3){

        return null;

    }



    let x =
    candles.slice(-3);



    if(

        x.every(isBearish)

    ){

        return {

            name:"Three Black Crows",

            bias:"BEARISH",

            confidence:80

        };

    }


    return null;


}





//================ SCAN CANDLES =================


function scanCandlestickPatterns(){


    if(
        candleData.length < 5
    ){

        return;

    }



    let candles =
    lastCandles(5);



    let results=[];



    let patterns=[


        bullishEngulfing(candles),

        bearishEngulfing(candles),

        hammer(candles),

        invertedHammer(candles),

        shootingStar(candles),

        doji(candles),

        morningStar(candles),

        eveningStar(candles),

        threeWhiteSoldiers(candles),

        threeBlackCrows(candles)


    ];



    patterns.forEach(

        pattern=>{

            if(pattern){

                results.push(pattern);

            }

        }

    );



    detectedCandles =
    results;



    updateCandleUI();


}





//================ UPDATE UI =================


function updateCandleUI(){


    let box =
    document.getElementById(
        "candlePatterns"
    );



    if(!box){

        return;

    }



    if(
        detectedCandles.length===0
    ){

        box.innerHTML =
        "No Candle Pattern";


        return;

    }



    box.innerHTML="";



    detectedCandles.forEach(

        c=>{


            box.innerHTML += `

            <div class="pattern-item">

            🕯 ${c.name}

            <br>

            Bias:
            ${c.bias}

            <br>

            Confidence:
            ${c.confidence}%

            </div>

            `;


        }

    );


}





//================ AUTO RUN =================


setInterval(

function(){

    scanCandlestickPatterns();

},

5000

);



/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 7
             AI SIGNAL ENGINE
==================================================*/


//================ SIGNAL STORAGE =================


let aiSignal = {

    signal:"WAIT",

    bias:"NEUTRAL",

    confidence:0,

    reasons:[]

};



//================ SCORE VARIABLES =================


function generateAISignal(){


    if(
        candleData.length < 50
    ){

        return;

    }



    let bullishScore = 0;

    let bearishScore = 0;


    let reasons = [];





    //================ EMA ANALYSIS =================


    if(
        indicators.ema20 >
        indicators.ema50
    ){

        bullishScore += 15;

        reasons.push(
            "EMA bullish alignment"
        );


    }

    else{


        bearishScore += 15;

        reasons.push(
            "EMA bearish alignment"
        );


    }





    //================ RSI =================


    if(
        indicators.rsi < 30
    ){

        bullishScore += 15;

        reasons.push(
            "RSI oversold"
        );


    }

    else if(

        indicators.rsi > 70

    ){

        bearishScore += 15;

        reasons.push(
            "RSI overbought"
        );

    }





    //================ MACD =================


    if(
        indicators.macd > 0
    ){

        bullishScore += 10;

        reasons.push(
            "MACD positive"
        );

    }

    else{


        bearishScore += 10;

        reasons.push(
            "MACD negative"
        );

    }





    //================ BOLLINGER =================


    let price =
    btcPrice;


    let bb =
    indicators.bollinger;



    if(
        price <= bb.lower
    ){

        bullishScore += 15;

        reasons.push(
            "Bollinger lower band bounce"
        );

    }


    if(
        price >= bb.upper
    ){

        bearishScore += 15;

        reasons.push(
            "Bollinger upper rejection"
        );

    }





    //================ PATTERN ANALYSIS =================


    detectedPatterns.forEach(

        pattern=>{


            if(
                pattern.bias==="BULLISH"
            ){

                bullishScore += 10;

                reasons.push(
                    pattern.name
                );


            }


            if(
                pattern.bias==="BEARISH"
            ){

                bearishScore += 10;

                reasons.push(
                    pattern.name
                );

            }


        }

    );





    //================ CANDLE ANALYSIS =================


    detectedCandles.forEach(

        candle=>{


            if(
                candle.bias==="BULLISH"
            ){

                bullishScore += 8;

                reasons.push(
                    candle.name
                );


            }


            if(
                candle.bias==="BEARISH"
            ){

                bearishScore += 8;

                reasons.push(
                    candle.name
                );


            }


        }

    );





    //================ FINAL DECISION =================


    let total =

    bullishScore +
    bearishScore;



    let confidence =

    total === 0

    ?

    0

    :

    Math.max(
        bullishScore,
        bearishScore
    )
    /
    total
    *
    100;





    if(
        bullishScore >
        bearishScore
    ){


        aiSignal.signal =
        "BUY";


        aiSignal.bias =
        "LONG BIAS";



    }

    else if(

        bearishScore >
        bullishScore

    ){


        aiSignal.signal =
        "SELL";


        aiSignal.bias =
        "SHORT BIAS";


    }

    else{


        aiSignal.signal =
        "WAIT";


        aiSignal.bias =
        "NEUTRAL";


    }




    aiSignal.confidence =
    Math.round(
        confidence
    );


    aiSignal.reasons =
    reasons;



    updateAISignalUI();


}





//================ UPDATE UI =================


function updateAISignalUI(){


    let signal =
    document.getElementById(
        "signalStatus"
    );


    let bias =
    document.getElementById(
        "biasStatus"
    );


    let summary =
    document.getElementById(
        "aiSummary"
    );


    let confidence =
    document.getElementById(
        "confidencePercent"
    );



    if(signal){


        signal.innerText =
        aiSignal.signal;


        signal.className =
        aiSignal.signal.toLowerCase();


    }



    if(bias){


        bias.innerText =
        aiSignal.bias;


    }




    if(confidence){


        confidence.innerText =

        aiSignal.confidence
        +
        "%";


    }




    if(summary){


        summary.innerHTML =

        `

        <b>${aiSignal.signal}</b>

        <br><br>

        Confidence:

        ${aiSignal.confidence}%

        <br><br>

        Reasons:

        <br>

        ${aiSignal.reasons.join(
            "<br>"
        )}

        `;


    }


}





//================ AUTO AI SCAN =================


setInterval(

function(){


    generateAISignal();


},

5000

);



/*==================================================
        QUANTUM AI BTC DASHBOARD
              JAVASCRIPT PART 8
          FINAL SYSTEM INTEGRATION
==================================================*/


//================ TRADE SETUP =================


let tradeSetup = {

    entry:0,

    stopLoss:0,

    takeProfit:0,

    riskReward:0

};





//================ CALCULATE TRADE PLAN =================


function calculateTradeSetup(){


    if(
        !btcPrice
    ){

        return;

    }



    let atr =
    indicators.atr;



    if(
        atr === 0
    ){

        return;

    }





    // LONG SETUP


    if(
        aiSignal.bias === "LONG BIAS"
    ){


        tradeSetup.entry =
        btcPrice;


        tradeSetup.stopLoss =

        btcPrice - 
        (atr * 2);



        tradeSetup.takeProfit =

        btcPrice +
        (atr * 4);



    }





    // SHORT SETUP


    else if(

        aiSignal.bias === "SHORT BIAS"

    ){


        tradeSetup.entry =
        btcPrice;


        tradeSetup.stopLoss =

        btcPrice +
        (atr * 2);



        tradeSetup.takeProfit =

        btcPrice -
        (atr * 4);



    }



    else{


        tradeSetup.entry = 0;

        tradeSetup.stopLoss = 0;

        tradeSetup.takeProfit = 0;


    }




    let risk =

    Math.abs(

        tradeSetup.entry -
        tradeSetup.stopLoss

    );


    let reward =

    Math.abs(

        tradeSetup.takeProfit -
        tradeSetup.entry

    );



    tradeSetup.riskReward =

    risk

    ?

    reward / risk

    :

    0;



    updateTradeUI();


}





//================ UPDATE TRADE UI =================


function updateTradeUI(){


    let entry =
    document.getElementById(
        "entryPrice"
    );


    let stop =
    document.getElementById(
        "stopLoss"
    );


    let target =
    document.getElementById(
        "takeProfit"
    );


    let rr =
    document.getElementById(
        "riskReward"
    );



    if(entry){


        entry.innerText =

        tradeSetup.entry

        ?

        "$"+tradeSetup.entry.toFixed(2)

        :

        "--";


    }




    if(stop){


        stop.innerText =

        tradeSetup.stopLoss

        ?

        "$"+tradeSetup.stopLoss.toFixed(2)

        :

        "--";


    }




    if(target){


        target.innerText =

        tradeSetup.takeProfit

        ?

        "$"+tradeSetup.takeProfit.toFixed(2)

        :

        "--";


    }




    if(rr){


        rr.innerText =

        tradeSetup.riskReward

        ?

        tradeSetup.riskReward.toFixed(2)+"R"

        :

        "--";


    }


}





//================ MARKET STRUCTURE =================


function updateMarketStructure(){


    let trend =
    document.getElementById(
        "marketTrend"
    );


    let momentum =
    document.getElementById(
        "marketMomentum"
    );


    let volatility =
    document.getElementById(
        "marketVolatility"
    );


    let volume =
    document.getElementById(
        "marketVolume"
    );


    let strength =
    document.getElementById(
        "marketStrength"
    );



    if(trend){

        trend.innerText =
        marketStructure.trendDirection;

    }



    if(momentum){

        if(indicators.rsi > 50){

            momentum.innerText =
            "Bullish";

        }

        else{

            momentum.innerText =
            "Bearish";

        }

    }




    if(volatility){

        volatility.innerText =

        indicators.atr.toFixed(2);

    }





    if(volume){

        let last =

        candleData[
            candleData.length-1
        ];


        volume.innerText =

        last

        ?

        last.volume.toFixed(0)

        :

        "--";


    }




    if(strength){

        strength.innerText =

        indicators.adx.toFixed(2);

    }


}





//================ ALERT SYSTEM =================


let lastSignal = "";



function checkAlerts(){


    if(
        aiSignal.signal !== lastSignal
    ){


        let alertBox =
        document.getElementById(
            "alertContainer"
        );



        if(alertBox){


            alertBox.innerHTML =

            `

            <div class="pattern-item">

            🚨 ${aiSignal.signal}

            <br>

            ${aiSignal.bias}

            <br>

            Confidence:
            ${aiSignal.confidence}%

            </div>

            `;


        }



        lastSignal =
        aiSignal.signal;


    }


}





//================ SETTINGS MODAL =================


let settings =
document.getElementById(
    "settingsModal"
);



let closeSettings =
document.getElementById(
    "closeSettings"
);



if(closeSettings){


    closeSettings.onclick =
    function(){


        settings.style.display =
        "none";


    };


}





//================ FINAL ENGINE LOOP =================


setInterval(

function(){


    calculateTradeSetup();


    updateMarketStructure();


    checkAlerts();


},

3000

);





//================ SYSTEM READY =================


console.log(

"Quantum AI Dashboard Loaded Successfully"

);
