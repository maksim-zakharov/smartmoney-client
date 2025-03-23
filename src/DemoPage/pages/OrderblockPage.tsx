import {Typography} from "antd";
import img15 from "../../assets/img_15.png"
import img16 from "../../assets/img_16.png"
import img17 from "../../assets/img_17.png"
import img18 from "../../assets/img_18.png"
import {Chart} from "../../SoloTestPage/TestChart";
import React from "react";
import {
    orderblocksToImbalancePrimitives,
    orderblocksToOrderblocksPrimitives,
    swingsToMarkers
} from "../../utils";
import {
    calculatePOI, StateManager
} from "../../THUltimate/th_ultimate_oneIt.ts";
import {HistoryObject, Trend} from "../../THUltimate/models.ts";

const BOSChart = ({data, trend = -1}: {data: HistoryObject[], trend: number}) => {
    const manager = new StateManager(data);
    manager.calculateSwingsOld();

    manager.markHHLLOld();
    manager.drawBOSOld();

    const trends = data.map((candle, index) => ({trend, time: candle.time}) as Trend);

    const orderBlocks = calculatePOI(manager);
    const lastCandle = data[data.length - 1];
    const _primitives = [];
    _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, ob => true, lastCandle));
    _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, () => true, lastCandle));

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }
    const allMarkers1 = [];
    allMarkers1.push(...swingsToMarkers(manager.swings))

    const _lineSerieses1 = [];

    return <Chart width={300} height={200} markers={allMarkers1} lineSerieses={_lineSerieses1} primitives={_primitives}
                  data={data} ema={[]}/>
};

const data1: HistoryObject[] = [
    {open: 60, high: 61, close: 50, low: 48, volume: 0, time: 1},
    {open: 50, high: 62, close: 60, low: 49, volume: 0, time: 2},
    {open: 60, high: 71, close: 70, low: 59, volume: 0, time: 3},
    {open: 70, high: 81, close: 80, low: 69, volume: 0, time: 4},
    {open: 80, high: 83, close: 72, low: 70, volume: 0, time: 5},
    {open: 72, high: 73, close: 59, low: 58, volume: 0, time: 6},
    {open: 59, high: 60, close: 48, low: 47, volume: 0, time: 7},
    {open: 48, high: 49, close: 40, low: 39, volume: 0, time: 8},
    {open: 40, high: 52, close: 46, low: 38, volume: 0, time: 9},
    {open: 46, high: 47, close: 42, low: 41, volume: 0, time: 10},
    {open: 42, high: 43, close: 35, low: 34, volume: 0, time: 11},
    {open: 35, high: 36, close: 31, low: 30, volume: 0, time: 12},
];

const data2: HistoryObject[] = [
    {open: 60, high: 61, close: 50, low: 48, volume: 0, time: 1},
    {open: 50, high: 62, close: 60, low: 49, volume: 0, time: 2},
    {open: 60, high: 71, close: 70, low: 59, volume: 0, time: 3},
    {open: 70, high: 81, close: 80, low: 69, volume: 0, time: 4},
    {open: 80, high: 83, close: 68, low: 67, volume: 0, time: 5},
    {open: 68, high: 70, close: 65, low: 64, volume: 0, time: 6},
    {open: 65, high: 68, close: 48, low: 47, volume: 0, time: 7},
    {open: 48, high: 55, close: 40, low: 39, volume: 0, time: 8},
    {open: 40, high: 52, close: 46, low: 38, volume: 0, time: 9},
    {open: 46, high: 47, close: 37, low: 36, volume: 0, time: 10},
    {open: 37, high: 38, close: 35, low: 34, volume: 0, time: 11},
    {open: 35, high: 36, close: 31, low: 30, volume: 0, time: 12},
];

const data3: HistoryObject[] = [
    {open: 50, high: 63, close: 60, low: 48, volume: 0, time: 1},
    {open: 60, high: 62, close: 50, low: 47, volume: 0, time: 2},
    {open: 50, high: 51, close: 40, low: 38, volume: 0, time: 3},
    {open: 40, high: 41, close: 30, low: 28, volume: 0, time: 4},
    {open: 30, high: 43, close: 42, low: 26, volume: 0, time: 5},
    {open: 42, high: 46, close: 45, low: 40, volume: 0, time: 6},
    {open: 45, high: 68, close: 66, low: 43, volume: 0, time: 7},
    {open: 66, high: 71, close: 70, low: 63, volume: 0, time: 8},
    {open: 70, high: 73, close: 65, low: 64, volume: 0, time: 9},
    {open: 65, high: 81, close: 80, low: 64, volume: 0, time: 10},
    {open: 80, high: 86, close: 85, low: 79, volume: 0, time: 11},
    {open: 85, high: 91, close: 90, low: 84, volume: 0, time: 12},
];

const data4: HistoryObject[] = [
    {open: 50, high: 63, close: 60, low: 47, volume: 0, time: 1},
    {open: 60, high: 62, close: 52, low: 47, volume: 0, time: 2},
    {open: 52, high: 54, close: 40, low: 38, volume: 0, time: 3},
    {open: 40, high: 52, close: 50, low: 36, volume: 0, time: 4},
    {open: 50, high: 52, close: 40, low: 34, volume: 0, time: 5},
    {open: 40, high: 58, close: 56, low: 38, volume: 0, time: 6},
    {open: 56, high: 60, close: 58, low: 54, volume: 0, time: 7},
    {open: 58, high: 68, close: 66, low: 56, volume: 0, time: 8},
    {open: 66, high: 74, close: 72, low: 62, volume: 0, time: 9},
    {open: 72, high: 74, close: 64, low: 60, volume: 0, time: 10},
    {open: 64, high: 76, close: 74, low: 63, volume: 0, time: 11},
    {open: 74, high: 82, close: 80, low: 72, volume: 0, time: 12},
];

const OrderblockPage = () => {

    return <>
        <Typography.Paragraph>
            Order Block is main Part in Smart Money Concept during entries . Order Block means where
            Smart Traders Entered for buys and sells . to mark any Bullish / Bearish Order Block Price must
            be proper imbalance and taken out Prev Candle High Low to confirm Order Block .Now we
            are going to discuss in more details that how we can identify and trade it. price generally
            react from Decesional Order Block or Extreme Order block .
        </Typography.Paragraph>
        <img src={img15}/>
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data1}/>
            <BOSChart data={data2}/>
        </div>
        <img src={img16}/>
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
        <BOSChart data={data3} trend={1}/>
        <BOSChart data={data4} trend={1}/>
        </div>
        <Typography.Paragraph>
            Now you can understand more better clearly that how things actually work in order Block , to
            mark oder Block Proper imbalance and Liquidity Sweep Order Block .in upcoming chapters
            we 'll discuss Entries Parts in more details . these are just examples to identify valid OB .
        </Typography.Paragraph>
        <img src={img17}/>
        <img src={img18}/>
    </>
}

export default OrderblockPage;