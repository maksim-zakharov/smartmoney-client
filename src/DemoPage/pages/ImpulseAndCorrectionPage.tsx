import {Divider, Space, Typography} from "antd";
import img from "../../assets/img.png"
import img_1 from "../../assets/img_1.png"
import img_2 from "../../assets/img_2.png"
import {Chart} from "../../TestPage/TestChart";
import React, {useEffect, useMemo, useState} from "react";
import {createRectangle2, fetchCandlesFromAlor, notTradingTime} from "../../utils";
import dayjs from 'dayjs';
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import type { Dayjs } from 'dayjs';
import {calculateOB, drawBOS, markHHLL, tradinghubCalculateSwings, Trend} from "../../samurai_patterns";
import {Time} from "lightweight-charts";
import {HistoryObject} from "../../api";
const BOSChart = ({data}: {data: HistoryObject[]}) => {
    debugger

    const {swings: swings1, highs, lows} = tradinghubCalculateSwings(data);

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }
    const allMarkers1 = [];
    allMarkers1.push(...highs.filter(Boolean).map(s => ({
        color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.time) as Time,
        shape: 'circle',
        position: s.side === 'high' ? 'aboveBar' : 'belowBar',
        text: s.text
    })));
    allMarkers1.push(...lows.filter(Boolean).map(s => ({
        color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.time) as Time,
        shape: 'circle',
        position: s.side === 'high' ? 'aboveBar' : 'belowBar',
        text: s.text
    })));

    return <Chart width={300} height={200} markers={allMarkers1} lineSerieses={[]} primitives={[]}
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

    let {highs, lows, swings} = useMemo(() => tradinghubCalculateSwings(data), [data]);

    const markers = useMemo(() => {
        const markerColors = {
            bearColor: "rgb(157, 43, 56)",
            bullColor: "rgb(20, 131, 92)"
        }
        const allMarkers = [];
        allMarkers.push(...highs.filter(Boolean).map(s => ({
            color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.time) as Time,
            shape: 'circle',
            position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text
        })));
        allMarkers.push(...lows.filter(Boolean).map(s => ({
            color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.time) as Time,
            shape: 'circle',
            position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text
        })));

        return allMarkers;
    }, [highs, lows, swings]);

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