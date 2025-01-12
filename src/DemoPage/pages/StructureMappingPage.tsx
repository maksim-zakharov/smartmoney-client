import {Divider, Space, Typography} from "antd";
import img_3 from "../../assets/img_3.png"
import img_4 from "../../assets/img_4.png"
import img_5 from "../../assets/img_5.png"
import img_6 from "../../assets/img_6.png"
import img_7 from "../../assets/img_7.png"
import img_8 from "../../assets/img_8.png"
import React, {useEffect, useMemo, useState} from "react";
import {CandlesBuilder, fetchCandlesFromAlor, notTradingTime} from "../../utils";
import {drawBOS, markHHLL, Swing, tradinghubCalculateSwings, tradinghubCalculateTrendNew} from "../../samurai_patterns";
import {LineStyle, Time} from "lightweight-charts";
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import {Chart} from "../../TestPage/TestChart";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {HistoryObject} from "../../api";

const BOSChart = ({data}) => {
    const {swings: swings1} = tradinghubCalculateSwings(data);

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }

    let bosses1 = markHHLL(data, swings1);
    swings1[3] = {...swings1[3], text: 'LL'} as Swing;

    bosses1 = drawBOS(data, swings1, bosses1);
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

    return <Chart width={300} height={200} markers={allMarkers1} lineSerieses={_lineSerieses1} primitives={[]} data={data} ema={[]}/>
}

const data1: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 83, low: 82, volume: 0, time: 9},
 ];

const data2: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 86, low: 82, volume: 0, time: 9},
    {open: 86, high: 87, close: 80, low: 79, volume: 0, time: 10},
];

const data3: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 86, low: 82, volume: 0, time: 9},
    {open: 86, high: 90, close: 89, low: 81, volume: 0, time: 10},
];

const data4: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 86, low: 82, volume: 0, time: 9},
    {open: 86, high: 87, close: 85, low: 83, volume: 0, time: 10},
    {open: 85, high: 91, close: 90, low: 83, volume: 0, time: 11},
    {open: 90, high: 91, close: 87, low: 86, volume: 0, time: 12},
    {open: 87, high: 88, close: 81, low: 80, volume: 0, time: 13},
];

const data5: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 86, low: 82, volume: 0, time: 9},
 ];

const data6: HistoryObject[] = [
    {open: 99, high: 100, close: 91, low: 90, volume: 0, time: 1},
    {open: 91, high: 92, close: 90, low: 85, volume: 0, time: 2},
    {open: 90, high: 91, close: 85, low: 84, volume: 0, time: 3},
    {open: 85, high: 90, close: 89, low: 84, volume: 0, time: 4},
    {open: 89, high: 94, close: 93, low: 88, volume: 0, time: 5},
    {open: 93, high: 96, close: 94, low: 92, volume: 0, time: 6},
    {open: 94, high: 95, close: 91, low: 90, volume: 0, time: 7},
    {open: 91, high: 92, close: 87, low: 86, volume: 0, time: 8},
    {open: 87, high: 88, close: 86, low: 82, volume: 0, time: 9},
    {open: 86, high: 87, close: 83, low: 81, volume: 0, time: 10},
];

const StructureMappingPage = () => {
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

    let {highs, lows, swings, boses} = useMemo(() => {
        let {highs, lows, swings} = tradinghubCalculateSwings(data)

        const {trend, boses, swings: thSwings} = tradinghubCalculateTrendNew(swings, data);

        highs = thSwings.filter(t => t?.side === 'high');
        lows = thSwings.filter(t => t?.side === 'low');

        return {trend, boses, highs, lows, swings: thSwings}
    }, [data]);

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

    const lineSerieses = useMemo(() => {
        const markerColors = {
            bearColor: "rgb(157, 43, 56)",
            bullColor: "rgb(20, 131, 92)"
        }
        const _lineSerieses = [];
        _lineSerieses.push(...boses.filter(Boolean).map(marker => {
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
        return _lineSerieses;
    }, [boses]);

    return <>
        <Typography.Title level={3}>Inducement</Typography.Title>
        <Typography.Paragraph>
            Smart Money Concept basically backbone of two things Structure and Liquidity, in this part we are going to
            discussion in details about Break of Structure and Change of Character. to marking structure usually we need
            one thing that is inducement to confirm structure also to take entries. Inducement are very important to
            marking structure, now i am going to show you exactly that how you can draw advance structure in different
            different situation and what kind of criterias you should follow to marking structure.
        </Typography.Paragraph>
        <img src={img_3}/>
        <Space>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
        </Space>
        <Chart markers={markers} lineSerieses={lineSerieses} primitives={[]} data={data} ema={[]}/>
        <Typography.Title level={3}>BOS</Typography.Title>
        <img src={img_4}/>
        <Typography.Paragraph>
            Market is Bullish or Bearish doesn't Matter in both scenarios you need complete candle

            closure to confirm Break of structure if price candle sweep so those structure count as a

            Liquidity sweep / Stop hunt. Now i am going to show you some Bullish structure Diagrams

            that how you can identify valid and invalid BOS / CHoCH .
        </Typography.Paragraph>
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data1}/>
            <BOSChart width={300} height={200} markers={[]} lineSerieses={[]} primitives={[]} data={data2} ema={[]}/>
            <BOSChart width={300} height={200} markers={[]} lineSerieses={[]} primitives={[]} data={data3} ema={[]}/>
        </div>
        <div style={{    display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart width={300} height={200} markers={[]} lineSerieses={[]} primitives={[]} data={data4} ema={[]}/>
            <BOSChart width={300} height={200} markers={[]} lineSerieses={[]} primitives={[]} data={data5} ema={[]}/>
            <BOSChart width={300} height={200} markers={[]} lineSerieses={[]} primitives={[]} data={data6} ema={[]}/>
        </div>
        <img src={img_5}/>
        <img src={img_6}/>
        <Typography.Paragraph>
            These are Bullish and Bearish Chart explanations you need to understand every point very carefully and
            peacefully because once you understand Structure mapping clearly then rest things will be easy to
            understand. Again and again try to understand each point and topic as much possible then forward on next
            topic. This is game changer and unique way to structure mapping
            and invalid BOS / CHoCH .
        </Typography.Paragraph>
        <Typography.Title level={3}>Structure mapping</Typography.Title>
        <img src={img_7}/>
        <img src={img_8}/>
        <Divider/>
    </>;
}

export default StructureMappingPage;