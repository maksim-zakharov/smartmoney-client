import {Divider, Space, Typography} from "antd";
import img from "../../assets/img.png"
import img_1 from "../../assets/img_1.png"
import img_2 from "../../assets/img_2.png"
import {Chart} from "../../SoloTestPage/TestChart";
import React, {useEffect, useMemo, useState} from "react";
import {createRectangle2, fetchCandlesFromAlor} from "../../utils";
import dayjs from 'dayjs';
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import type { Dayjs } from 'dayjs';
import {LineStyle, Time} from "lightweight-charts";
import {
    calculatePOI,
    deleteEmptySwings,
    drawBOS,
    HistoryObject,
    markHHLL, notTradingTime, StateManager,
    tradinghubCalculateSwings,
    Trend
} from "../../th_ultimate";
const BOSChart = ({data}: {data: HistoryObject[]}) => {
    const manager = new StateManager(data);
    let swings = tradinghubCalculateSwings(manager);

    let boses = markHHLL(manager);
    boses = drawBOS(data, manager.swings, boses);

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }

    const _lineSerieses1 = [];
    _lineSerieses1.push(...boses.filter(Boolean).map(marker => {
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
    const allMarkers1 = [];
    allMarkers1.push(...swings.filter(Boolean).map(s => ({
        color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.time) as Time,
        shape: 'circle',
        position: s.side === 'high' ? 'aboveBar' : 'belowBar',
        text: s.text
    })));

    return <Chart width={300} height={200} markers={allMarkers1} lineSerieses={_lineSerieses1} primitives={[]}
                  data={data} ema={[]}/>
};

const data1: HistoryObject[] = [
    {open: 90, high: 92, close: 80, low: 77, volume: 0, time: 1},
    {open: 80, high: 82, close: 70, low: 68, volume: 0, time: 2},
    {open: 70, high: 72, close: 60, low: 58, volume: 0, time: 3},
    {open: 60, high: 75, close: 73, low: 69, volume: 0, time: 4},
    {open: 73, high: 82, close: 80, low: 72, volume: 0, time: 5},
    {open: 80, high: 84, close: 66, low: 64, volume: 0, time: 6},
    {open: 66, high: 70, close: 63, low: 61, volume: 0, time: 7},
    {open: 63, high: 66, close: 50, low: 48, volume: 0, time: 8},
    {open: 50, high: 56, close: 54, low: 49, volume: 0, time: 9},
    {open: 54, high: 62, close: 60, low: 52, volume: 0, time: 10},
    {open: 60, high: 63, close: 54, low: 50, volume: 0, time: 11},
    {open: 54, high: 56, close: 48, low: 46, volume: 0, time: 12},
];
const data2: HistoryObject[] = [
    {open: 90, high: 92, close: 80, low: 77, volume: 0, time: 1},
    {open: 80, high: 84, close: 76, low: 74, volume: 0, time: 2},
    {open: 76, high: 86, close: 70, low: 68, volume: 0, time: 3},
    {open: 70, high: 80, close: 78, low: 69, volume: 0, time: 4},
    {open: 78, high: 84, close: 82, low: 76, volume: 0, time: 5},
    {open: 82, high: 84, close: 66, low: 64, volume: 0, time: 6},
    {open: 66, high: 70, close: 63, low: 61, volume: 0, time: 7},
    {open: 63, high: 66, close: 50, low: 48, volume: 0, time: 8},
    {open: 50, high: 56, close: 54, low: 46, volume: 0, time: 9},
    {open: 54, high: 62, close: 60, low: 52, volume: 0, time: 10},
    {open: 60, high: 63, close: 54, low: 50, volume: 0, time: 11},
    {open: 54, high: 56, close: 48, low: 46, volume: 0, time: 12},
];

const data3: HistoryObject[] = [
    {open: 10, high: 22, close: 20, low: 8, volume: 0, time: 1},
    {open: 20, high: 32, close: 30, low: 18, volume: 0, time: 2},
    {open: 30, high: 42, close: 40, low: 28, volume: 0, time: 3},
    {open: 40, high: 41, close: 26, low: 24, volume: 0, time: 4},
    {open: 26, high: 28, close: 18, low: 16, volume: 0, time: 5},
    {open: 18, high: 32, close: 30, low: 14, volume: 0, time: 6},
    {open: 30, high: 36, close: 34, low: 26, volume: 0, time: 7},
    {open: 34, high: 54, close: 50, low: 30, volume: 0, time: 8},
    {open: 50, high: 52, close: 44, low: 42, volume: 0, time: 9},
    {open: 44, high: 46, close: 34, low: 32, volume: 0, time: 10},
    {open: 34, high: 44, close: 40, low: 32, volume: 0, time: 11},
    {open: 40, high: 56, close: 54, low: 38, volume: 0, time: 12},
];
const data4: HistoryObject[] = [
    {open: 10, high: 22, close: 20, low: 8, volume: 0, time: 1},
    {open: 20, high: 32, close: 30, low: 18, volume: 0, time: 2},
    {open: 30, high: 42, close: 40, low: 12, volume: 0, time: 3},
    {open: 40, high: 41, close: 26, low: 24, volume: 0, time: 4},
    {open: 26, high: 28, close: 18, low: 16, volume: 0, time: 5},
    {open: 18, high: 32, close: 30, low: 14, volume: 0, time: 6},
    {open: 30, high: 36, close: 34, low: 26, volume: 0, time: 7},
    {open: 34, high: 54, close: 50, low: 30, volume: 0, time: 8},
    {open: 50, high: 56, close: 44, low: 42, volume: 0, time: 9},
    {open: 44, high: 46, close: 34, low: 32, volume: 0, time: 10},
    {open: 34, high: 44, close: 40, low: 32, volume: 0, time: 11},
    {open: 40, high: 56, close: 54, low: 38, volume: 0, time: 12},
];

const ImpulseAndCorrectionPage = () => {
    const [data, setData] = useState([]);
    const [ticker, onSelectTicker] = useState('SBER');
    const [tf, setSize] = useState('300');
    const [{fromDate, toDate}, setDates] = useState({
        fromDate: dayjs('2024-10-01T00:00:00Z').startOf('day').unix(),
        toDate: dayjs('2025-10-01T00:00:00Z').endOf('day').unix()
    })

    const onChangeRangeDates = (value: Dayjs[], dateString) => {
        setDates({fromDate: value[0].unix(), toDate: value[1].unix()})
    }

    useEffect(() => {
        fetchCandlesFromAlor(ticker, tf, fromDate, toDate)
            .then(candles => candles
                .filter(candle => !notTradingTime(candle))
            ).then(setData);
    }, [tf, ticker, fromDate, toDate]);

    let swings = useMemo(() => {
        const manager = new StateManager(data);
        tradinghubCalculateSwings(manager)

        return manager.swings;
    }, [data]);

    const markers = useMemo(() => {
        const markerColors = {
            bearColor: "rgb(157, 43, 56)",
            bullColor: "rgb(20, 131, 92)"
        }
        const allMarkers = [];
        allMarkers.push(...swings.filter(Boolean).map(s => ({
            color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.time) as Time,
            shape: 'circle',
            position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text
        })));

        return allMarkers;
    }, [swings]);

    return <>
        <Typography.Paragraph>When Market momentum is very strong to the upside or downside those types strong

            unhealthy price action is called Impulsive Move, Price generally move in two way impulse and

            correction. you can understand like this in impulsive move lots of institutional and Banks

            Buying Momentum and correction phase retail traders trying to buy sell and market move in a

            particular range. Now i am going to explain you here in details that how its looks.</Typography.Paragraph>
        <img src={img}/>
        <img src={img_1}/>
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
        <BOSChart data={data1}/>
        <BOSChart data={data2}/>
        </div>
        <Typography.Paragraph>
            When Price taken out Prev Candle High / Low then candle colors not matter may be Bullish or bearish in both
            scenarios are valid. one more thing Price taken out High/Low then sometimes candle close or Sweep Prev
            Candle High Low . Both scenarios are valid.
        </Typography.Paragraph>
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data3}/>
            <BOSChart data={data4}/>
        </div>
        <img src={img_2}/>
        <Divider/>
        <Space>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
        </Space>
        <Chart markers={markers} lineSerieses={[]} primitives={[]} data={data} ema={[]}/>
    </>;
};

export default ImpulseAndCorrectionPage;