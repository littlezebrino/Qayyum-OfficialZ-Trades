// ==========================================
// BTC SMART MONEY RADAR AI
// JavaScript Part 1/6
// Binance + Chart + Core Setup
// ==========================================



const BINANCE = {


    ticker:

    "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",



    candles:

    "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=200"


};








// ================================
// GLOBAL DATA
// ================================



let candlesData = [];


let btcPrice = 0;


let scanRunning = false;


let voiceEnabled = true;


let finalSignal = "WAIT";



let chart;









// ================================
// DOM ELEMENTS
// ================================


const priceBox =
document.getElementById("btcPrice");


const changeBox =
document.getElementById("change");



const statusBox =
document.getElementById("binanceStatus");



const chartStatus =
document.getElementById("chartStatus");



const scanButton =
document.getElementById("scanButton");









// ================================
// BINANCE CONNECTION
// ================================



async function connectBinance(){


    try{


        statusBox.innerHTML =

        "● Binance Connected";



        statusBox.style.color =

        "#22c55e";




        await loadMarket();



    }


    catch(error){


        console.log(
            "Binance Error:",
            error
        );



        statusBox.innerHTML =

        "● Binance Error";



        statusBox.style.color =

        "#ef4444";



    }


}









// ================================
// LOAD MARKET DATA
// ================================



async function loadMarket(){



    await getPrice();



    await getCandles();



    updateChart();



}









// ================================
// BTC PRICE
// ================================



async function getPrice(){


    let response =

    await fetch(
        BINANCE.ticker
    );



    let data =

    await response.json();




    btcPrice =

    Number(
        data.lastPrice
    );





    priceBox.innerHTML =

    "$" +

    btcPrice.toLocaleString();





    changeBox.innerHTML =

    Number(
        data.priceChangePercent
    )
    .toFixed(2)
    +

    "%";



}









// ================================
// GET 15 MIN CANDLES
// ================================



async function getCandles(){


    let response =

    await fetch(
        BINANCE.candles
    );



    let data =

    await response.json();




    candlesData =

    data.map(item=>{


        return {


            time:item[0],


            open:Number(item[1]),


            high:Number(item[2]),


            low:Number(item[3]),


            close:Number(item[4]),


            volume:Number(item[5])


        };


    });





    chartStatus.innerHTML =

    "BTC 15M Data Loaded";



}









// ================================
// CHART INITIALIZE
// ================================



function createChart(){



    let ctx =

    document
    .getElementById(
        "btcChart"
    );




    chart =

    new Chart(
        ctx,
        {

            type:"line",


            data:{


                labels:[],


                datasets:[

                    {

                        label:
                        "BTCUSDT",


                        data:[],


                        borderColor:
                        "#38bdf8",


                        backgroundColor:
                        "rgba(56,189,248,.15)",


                        tension:.3


                    }


                ]

            },



            options:{


                responsive:true,


                maintainAspectRatio:false



            }


        }

    );



}









// ================================
// UPDATE CHART
// ================================



function updateChart(){



    if(!chart){

        return;

    }





    let last =

    candlesData
    .slice(-50);




    chart.data.labels =

    last.map(
        x=>

        new Date(
            x.time
        )
        .toLocaleTimeString()

    );




    chart.data.datasets[0].data =

    last.map(
        x=>

        x.close

    );



    chart.update();



}









// ================================
// START
// ================================



window.onload = ()=>{


    createChart();



    connectBinance();



};


// ==========================================
// JavaScript Part 2/6
// Technical Analysis Core Engine
// ==========================================






// ================================
// EMA CALCULATION
// ================================



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
        let i=period;
        i<values.length;
        i++
    ){


        ema =

        (
            values[i]-ema
        )
        *
        multiplier

        +

        ema;


    }




    return ema;



}









// ================================
// RSI CALCULATION
// ================================



function calculateRSI(values, period=14){



    if(values.length <= period){

        return 50;

    }




    let gain = 0;

    let loss = 0;





    for(
        let i=1;
        i<=period;
        i++
    ){



        let difference =

        values[i]
        -
        values[i-1];




        if(difference > 0){


            gain += difference;


        }

        else{


            loss += Math.abs(
                difference
            );


        }



    }





    let averageGain =

    gain / period;




    let averageLoss =

    loss / period;





    if(averageLoss===0){

        return 100;

    }





    let rs =

    averageGain /
    averageLoss;




    let rsi =

    100 -
    (
        100 /
        (1+rs)
    );




    return Number(
        rsi.toFixed(2)
    );


}









// ================================
// ATR VOLATILITY
// ================================



function calculateATR(data, period=14){



    if(data.length <= period){

        return 0;

    }




    let ranges=[];




    for(
        let i=1;
        i<data.length;
        i++
    ){



        let current =

        data[i];



        let previous =

        data[i-1];




        let range =

        Math.max(

            current.high-current.low,


            Math.abs(
                current.high -
                previous.close
            ),



            Math.abs(
                current.low -
                previous.close
            )


        );



        ranges.push(range);



    }





    let atr =

    ranges
    .slice(-period)
    .reduce(
        (a,b)=>a+b,
        0
    )
    /
    period;



    return Number(
        atr.toFixed(2)
    );


}









// ================================
// MARKET VALUES
// ================================



function getMarketValues(){



    let closes =

    candlesData.map(

        candle=>

        candle.close

    );





    let ema20 =

    calculateEMA(
        closes,
        20
    );





    let ema50 =

    calculateEMA(
        closes,
        50
    );





    let rsi =

    calculateRSI(
        closes
    );





    let atr =

    calculateATR(
        candlesData
    );





    return {


        ema20,

        ema50,

        rsi,

        atr


    };


}









// ================================
// TREND DETECTOR
// ================================



function detectTrend(){



    let values =

    getMarketValues();





    let trend =

    "SIDEWAYS";





    if(
        values.ema20 >
        values.ema50
    ){


        trend =
        "BULLISH";


    }




    else if(
        values.ema20 <
        values.ema50
    ){


        trend =
        "BEARISH";


    }






    document
    .getElementById(
        "trend"
    )
    .innerHTML =

    trend;





    return trend;



}









// ================================
// MOMENTUM SCORE
// ================================



function calculateMomentum(){



    let values =

    getMarketValues();





    let score = 50;





    if(
        values.ema20 >
        values.ema50
    ){


        score +=20;


    }

    else{


        score -=20;


    }





    if(
        values.rsi > 55
    ){


        score +=20;


    }


    else if(
        values.rsi <45
    ){


        score -=20;


    }





    score =

    Math.max(
        0,
        Math.min(
            100,
            score
        )
    );





    document
    .getElementById(
        "momentum"
    )
    .innerHTML =

    score+"%";





    document
    .getElementById(
        "momentumText"
    )
    .innerHTML =

    values.rsi > 50

    ?

    "Buying Pressure"

    :

    "Selling Pressure";





    return score;



       }


// ==========================================
// JavaScript Part 3/6
// Smart Money Concept Engine
// ==========================================






// ================================
// FIND RECENT HIGH / LOW
// ================================



function getStructureLevels(){



    let recent =

    candlesData
    .slice(-30);




    let highs =

    recent.map(
        candle=>
        candle.high
    );




    let lows =

    recent.map(
        candle=>
        candle.low
    );





    return {


        high:
        Math.max(...highs),


        low:
        Math.min(...lows)


    };


}









// ================================
// LIQUIDITY SWEEP DETECTION
// ================================



function detectLiquidity(){



    let levels =

    getStructureLevels();



    let last =

    candlesData[
        candlesData.length-1
    ];




    let result =

    "NO LIQUIDITY EVENT";





    if(
        last.high >
        levels.high
    ){


        result =
        "BUY SIDE LIQUIDITY TAKEN";


    }





    else if(
        last.low <
        levels.low
    ){


        result =
        "SELL SIDE LIQUIDITY TAKEN";


    }






    document
    .getElementById(
        "liquidity"
    )
    .innerHTML =

    result;





    return result;



}









// ================================
// BREAK OF STRUCTURE
// ================================



function detectBOS(){



    let levels =

    getStructureLevels();




    let last =

    candlesData[
        candlesData.length-1
    ];





    let bos =

    "NONE";





    if(
        last.close >
        levels.high
    ){


        bos =
        "BULLISH BOS";


    }




    else if(
        last.close <
        levels.low
    ){


        bos =
        "BEARISH BOS";


    }






    document
    .getElementById(
        "bos"
    )
    .innerHTML =

    bos;





    return bos;



}









// ================================
// CHoCH DETECTION
// ================================



function detectCHoCH(){



    let previous =

    candlesData
    .slice(-5,-1);




    let current =

    candlesData[
        candlesData.length-1
    ];





    let previousHigh =

    Math.max(

        ...previous.map(
            x=>x.high
        )

    );





    let previousLow =

    Math.min(

        ...previous.map(
            x=>x.low
        )

    );





    let choch =

    "NO CHANGE";





    if(
        current.close >
        previousHigh
    ){


        choch =
        "BULLISH CHoCH";


    }





    else if(
        current.close <
        previousLow
    ){


        choch =
        "BEARISH CHoCH";


    }






    document
    .getElementById(
        "choch"
    )
    .innerHTML =

    choch;





    return choch;



}









// ================================
// ORDER FLOW PRESSURE
// ================================



function calculateOrderFlow(){



    let last =

    candlesData
    .slice(-20);





    let buyVolume = 0;

    let sellVolume = 0;





    last.forEach(candle=>{





        if(
            candle.close >
            candle.open
        ){


            buyVolume +=
            candle.volume;


        }

        else{


            sellVolume +=
            candle.volume;


        }




    });







    let pressure =

    (
        buyVolume /
        (
            buyVolume +
            sellVolume
        )
    )
    *
    100;






    pressure =

    Number(
        pressure.toFixed(2)
    );





    let text =





    pressure > 55

    ?

    "BUYERS DOMINATING"

    :

    pressure <45

    ?

    "SELLERS DOMINATING"

    :

    "BALANCED";







    document
    .getElementById(
        "orderFlow"
    )
    .innerHTML =

    text;





    return pressure;



}









// ================================
// SMART MONEY SCORE
// ================================



function calculateSmartMoney(){



    let score = 50;





    let liquidity =

    detectLiquidity();





    let bos =

    detectBOS();





    let choch =

    detectCHoCH();





    let flow =

    calculateOrderFlow();







    if(
        liquidity.includes("BUY")
    ){


        score +=10;


    }



    if(
        liquidity.includes("SELL")
    ){


        score -=10;


    }







    if(
        bos.includes("BULLISH")
    ){


        score +=15;


    }



    if(
        bos.includes("BEARISH")
    ){


        score -=15;


    }







    if(
        choch.includes("BULLISH")
    ){


        score +=10;


    }




    if(
        choch.includes("BEARISH")
    ){


        score -=10;


    }







    if(flow >55){


        score +=10;


    }


    else if(flow <45){


        score -=10;


    }






    score =

    Math.max(
        0,
        Math.min(
            100,
            score
        )
    );






    document
    .getElementById(
        "smartMoney"
    )
    .innerHTML =

    score+"%";






    document
    .getElementById(
        "smartMoneyText"
    )
    .innerHTML =


    score >=60

    ?

    "Smart Money Buying"

    :

    score <=40

    ?

    "Smart Money Selling"

    :

    "Neutral";






    return score;



        }



// ==========================================
// JavaScript Part 4/6
// Final Signal Decision Engine
// ==========================================






// ================================
// VOLATILITY SCANNER
// ================================



function volatilityScanner(){



    let values =

    getMarketValues();





    let volatility =

    (
        values.atr /
        btcPrice
    )
    *
    100;






    let score =

    volatility * 100;






    score =

    Number(
        score.toFixed(2)
    );





    document
    .getElementById(
        "volatility"
    )
    .innerHTML =

    score+"%";






    let text =





    score > 1.5

    ?

    "Explosion Risk"

    :

    score > .8

    ?

    "Increasing"

    :

    "Stable";






    document
    .getElementById(
        "volatilityText"
    )
    .innerHTML =

    text;





    return score;



}









// ================================
// FINAL AI SCORE
// ================================



function calculateFinalDecision(){



    let momentum =

    calculateMomentum();





    let smartMoney =

    calculateSmartMoney();





    let trend =

    detectTrend();





    let volatility =

    volatilityScanner();






    let total = 50;






    // MOMENTUM WEIGHT



    if(momentum >60){


        total +=20;


    }


    else if(momentum <40){


        total -=20;


    }






    // SMART MONEY WEIGHT



    if(smartMoney >60){


        total +=25;


    }


    else if(smartMoney <40){


        total -=25;


    }






    // TREND FILTER



    if(
        trend === "BULLISH"
    ){


        total +=15;


    }


    else if(
        trend === "BEARISH"
    ){


        total -=15;


    }






    // VOLATILITY FILTER



    if(volatility >2){


        total -=10;


    }






    total =

    Math.max(
        0,
        Math.min(
            100,
            total
        )
    );









    let signal =

    "WAIT";





    if(total >=65){


        signal =
        "LONG NOW";


    }



    else if(total <=35){


        signal =
        "SHORT NOW";


    }







    updateFinalSignal(
        signal,
        total
    );






    return {


        signal,

        confidence:total


    };



}









// ================================
// UPDATE SIGNAL UI
// ================================



function updateFinalSignal(
    signal,
    confidence
){



    let box =

    document
    .getElementById(
        "signal"
    );





    box.innerHTML =

    signal;





    box.classList.remove(

        "signal-long",

        "signal-short",

        "signal-wait"

    );







    if(
        signal === "LONG NOW"
    ){



        box.classList.add(
            "signal-long"
        );


    }





    else if(
        signal === "SHORT NOW"
    ){



        box.classList.add(
            "signal-short"
        );


    }



    else{


        box.classList.add(
            "signal-wait"
        );


    }








    document
    .getElementById(
        "confidence"
    )
    .innerHTML =

    confidence
    .toFixed(0)
    +"%";








    document
    .getElementById(
        "confidenceFill"
    )
    .style.width =

    confidence+"%";







    createTradePlan(
        signal
    );



}









// ================================
// ENTRY SL TARGET
// ================================



function createTradePlan(signal){



    let atr =

    getMarketValues()
    .atr;






    let entry =

    btcPrice;






    let stop = 0;

    let target = 0;







    if(
        signal === "LONG NOW"
    ){



        stop =

        entry - atr;



        target =

        entry + (atr*2);



    }





    else if(
        signal === "SHORT NOW"
    ){



        stop =

        entry + atr;



        target =

        entry - (atr*2);



    }







    else{


        stop = "--";

        target = "--";


    }






    document
    .getElementById(
        "entry"
    )
    .innerHTML =

    typeof entry==="number"

    ?

    "$"+entry.toFixed(2)

    :

    entry;







    document
    .getElementById(
        "stopLoss"
    )
    .innerHTML =

    stop==="--"

    ?

    "--"

    :

    "$"+stop.toFixed(2);







    document
    .getElementById(
        "target"
    )
    .innerHTML =

    target==="--"

    ?

    "--"

    :

    "$"+target.toFixed(2);







    document
    .getElementById(
        "explanation"
    )
    .innerHTML =



    signal+

    " generated using Momentum, Smart Money Structure, Trend and Volatility analysis.";



}


// ==========================================
// JavaScript Part 5/6
// Scan Controller + Voice + History
// ==========================================






// ================================
// VOICE ENGINE
// ================================



function speak(message){



    if(!voiceEnabled){

        return;

    }



    if(
        "speechSynthesis"
        in window
    ){


        window
        .speechSynthesis
        .cancel();




        let voice =

        new SpeechSynthesisUtterance(
            message
        );



        voice.rate = 1;


        voice.pitch = 1;





        window
        .speechSynthesis
        .speak(
            voice
        );

    }



}









// ================================
// SCAN PROGRESS
// ================================



function startScanProgress(){



    let progress = 0;




    let bar =

    document
    .getElementById(
        "scanProgress"
    );




    let text =

    document
    .getElementById(
        "progressText"
    );






    return new Promise(
    resolve=>{



        let timer =

        setInterval(()=>{



            progress +=1.7;



            if(progress>=100){


                progress=100;


                clearInterval(
                    timer
                );


                text.innerHTML =

                "Analysis Completed";



                resolve();



            }

            else{


                bar.style.width =

                progress+"%";



                text.innerHTML =

                "Scanning market structure "
                +
                Math.floor(progress)
                +
                "%";



            }



        },1000);



    });



}









// ================================
// HISTORY SAVE
// ================================



function saveHistory(
    signal,
    confidence
){



    let box =

    document
    .getElementById(
        "history"
    );




    if(
        box.innerHTML.includes(
            "No signals"
        )
    ){

        box.innerHTML="";

    }






    let row =

    document.createElement(
        "div"
    );




    row.className =

    "history-row";





    row.innerHTML = `


    <span>

    ${new Date()
    .toLocaleTimeString()}

    </span>


    <span>

    ${signal}

    </span>


    <span>

    ${confidence.toFixed(0)}%

    </span>


    <span>

    BTCUSDT 15M

    </span>



    `;







    if(
        signal.includes(
            "LONG"
        )
    ){

        row.classList.add(
            "history-long"
        );


    }



    if(
        signal.includes(
            "SHORT"
        )
    ){

        row.classList.add(
            "history-short"
        );


    }






    box.prepend(
        row
    );



}









// ================================
// COMPLETE SCAN PROCESS
// ================================



async function runFullScan(){



    if(scanRunning){


        return;


    }





    scanRunning=true;





    scanButton.disabled=true;



    scanButton.innerHTML =

    "🔍 ANALYZING...";






    document
    .querySelector(
        ".scan-control"
    )
    .classList.add(
        "scanning"
    );






    try{





        await loadMarket();




        await startScanProgress();




        let result =

        calculateFinalDecision();







        let signal =

        result.signal;






        let confidence =

        result.confidence;








        speak(


        "Bitcoin analysis completed. "

        +

        signal

        +

        " with "

        +

        confidence.toFixed(0)

        +

        " percent confidence"

        );







        saveHistory(

            signal,

            confidence

        );







        finalSignal =

        signal;







    }

    catch(error){



        console.log(
            error
        );



        document
        .getElementById(
            "explanation"
        )
        .innerHTML =

        "Analysis error. Please retry.";





    }







    scanRunning=false;



    scanButton.disabled=false;



    scanButton.innerHTML =

    "🚀 SCAN NOW";




    document
    .querySelector(
        ".scan-control"
    )
    .classList.remove(
        "scanning"
    );



            }



// ==========================================
// JavaScript Part 6/6
// Final Connection + Startup Controller
// ==========================================






// ================================
// SCAN BUTTON EVENT
// ================================



scanButton.addEventListener(

    "click",

    ()=>{


        runFullScan();


    }

);









// ================================
// MARKET UI REFRESH
// ================================



function refreshMarketUI(){



    if(candlesData.length===0){

        return;

    }





    let values =

    getMarketValues();





    document
    .getElementById(
        "regime"
    )
    .innerHTML =



    values.ema20 >

    values.ema50

    ?

    "BULLISH TREND"

    :

    "BEARISH TREND";






    document
    .getElementById(
        "structure"
    )
    .innerHTML =

    detectBOS();







}









// ================================
// SAFE DATA CHECK
// ================================



function checkData(){



    if(
        candlesData.length < 50
    ){


        document
        .getElementById(
            "explanation"
        )
        .innerHTML =

        "Waiting for enough BTC market data...";



        return false;


    }





    return true;



}









// ================================
// PERIODIC PRICE UPDATE
// ================================



setInterval(
async()=>{


    try{


        await getPrice();


        refreshMarketUI();



    }


    catch(error){


        console.log(
            "Update Error",
            error
        );


    }



},
30000
);









// ================================
// INITIAL LOAD COMPLETE
// ================================



async function initializeAI(){



    await connectBinance();




    setTimeout(()=>{


        if(checkData()){


            refreshMarketUI();


        }



    },3000);



}









// ================================
// FINAL START
// ================================



initializeAI();



