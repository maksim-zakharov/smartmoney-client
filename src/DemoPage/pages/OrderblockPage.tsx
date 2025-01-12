import {Typography} from "antd";
import img15 from "../../assets/img_15.png"
import img16 from "../../assets/img_16.png"
import img17 from "../../assets/img_17.png"
import img18 from "../../assets/img_18.png"
import {calculateOB, drawBOS, markHHLL, Swing, tradinghubCalculateSwings, Trend} from "../../samurai_patterns";
import {LineStyle, Time} from "lightweight-charts";
import {Chart} from "../../TestPage/TestChart";
import React from "react";
import {HistoryObject} from "../../api";
import {createRectangle2} from "../../utils";

const BOSChart = ({data}) => {
    const {swings: swings1, highs, lows} = tradinghubCalculateSwings(data);

    let bosses1 = markHHLL(data, swings1);
    bosses1 = drawBOS(data, swings1, bosses1);

    const trends = data.map((candle, index) => ({trend: -1, time: candle.time, index}) as Trend);

    const orderBlocks = calculateOB(highs, lows, data, bosses1, trends);
    const lastCandle = data[data.length - 1];
    const _primitives = [];
    _primitives.push(...orderBlocks.map(orderBlock => createRectangle2({
        leftTop: {
            price: orderBlock.lastOrderblockCandle.high,
            time: orderBlock.lastOrderblockCandle.time
        },
        rightBottom: {
            price: orderBlock.lastImbalanceCandle.high,
            time: (orderBlock.endCandle || lastCandle).time
        }
    }, {
        fillColor: 'rgba(179, 199, 219, .3)',
        showLabels: false,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderWidth: 2,
        borderColor: '#222'
    })));
    _primitives.push(...orderBlocks.map(orderBlock =>
        createRectangle2({
                leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time},
                rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time}
            },
            {
                fillColor: orderBlock.type === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                showLabels: false,
                borderWidth: 0,
            })));

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }
    const allMarkers1 = [];
    allMarkers1.push(...swings1.filter(Boolean).map(s => ({
        color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.time) as Time,
        shape: 'circle',
        position: s.side === 'high' ? 'aboveBar' : 'belowBar',
        text: s.text
    })));

    const _lineSerieses1 = [];
    _lineSerieses1.push(...bosses1.filter(Boolean).map(marker => {
        const color = marker.type === 'high' ? markerColors.bullColor : markerColors.bearColor
        const options = {
            color, // Цвет линии
            priceLineVisible: false,
            lastValueVisible: false,
            lineWidth: 1,
            lineStyle: LineStyle.LargeDashed,
        };
        let data = [];
        let markers = [];
// 5. Устанавливаем данные для линии
        if (marker.from.time === marker.textCandle.time || marker.to.time === marker.textCandle.time) {
            data = [
                {time: marker.from.time as Time, value: marker.from.price}, // начальная точка между свечками
                {time: marker.to.time as Time, value: marker.from.price}, // конечная точка между свечками
            ];
        } else
            data = [
                {time: marker.from.time as Time, value: marker.from.price}, // начальная точка между свечками
                {time: marker.textCandle.time as Time, value: marker.from.price}, // конечная точка между свечками
                {time: marker.to.time as Time, value: marker.from.price}, // конечная точка между свечками
            ].sort((a, b) => a.time - b.time);

        markers = [{
            color,
            time: (marker.textCandle.time) as Time,
            shape: 'text',
            position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
            text: marker.text
        }]
        return {options, data, markers}
    }));

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