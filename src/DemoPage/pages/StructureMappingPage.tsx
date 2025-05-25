import {Divider, Space, Typography} from "antd";
import img_3 from "../../assets/img_3.png"
import img_4 from "../../assets/img_4.png"
import img_5 from "../../assets/img_5.png"
import img_6 from "../../assets/img_6.png"
import img_7 from "../../assets/img_7.png"
import img_8 from "../../assets/img_8.png"
import React, {useEffect, useMemo, useState} from "react";
import {bosesToLineSerieses, fetchCandlesFromAlor, swingsToMarkers} from "../../utils";
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import {Chart} from "../../SoloTestPage/UpdatedChart";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    StateManager, tradinghubCalculateTrendNew
} from "../../th_ultimate.ts";
import {HistoryObject, Swing} from "../../th_ultimate.ts";

import {notTradingTime} from "../../th_ultimate.ts";

const BOSChart = ({data, text = 'LL'}) => {
    const manager = new StateManager(data);
    manager.calculateSwings();

    // manager.markHHLLOld();
    manager.swings[3] = {...manager.swings[3], text} as Swing;

    // manager.drawBOSOld();
    const allMarkers1 = [];
    allMarkers1.push(...swingsToMarkers(manager.swings))

    const _lineSerieses1 = bosesToLineSerieses(manager.boses);

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

const data7: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 37, close: 35, low: 24, volume: 0, time: 10},
];

const data8: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 35, close: 27, low: 24, volume: 0, time: 10},
    {open: 27, high: 32, close: 31, low: 26, volume: 0, time: 11},
    {open: 31, high: 32, close: 23, low: 22, volume: 0, time: 12},
    {open: 23, high: 28, close: 27, low: 22, volume: 0, time: 13},
    {open: 27, high: 37, close: 36, low: 26, volume: 0, time: 14},
];

const data9: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 35, close: 27, low: 24, volume: 0, time: 10},
    {open: 27, high: 37, close: 36, low: 26, volume: 0, time: 11},
];

const data10: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 35, close: 27, low: 24, volume: 0, time: 10},
];

const data11: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 35, close: 27, low: 24, volume: 0, time: 10},
    {open: 27, high: 32, close: 31, low: 26, volume: 0, time: 11},
];

const data12: HistoryObject[] = [
    {open: 10, high: 21, close: 20, low: 9, volume: 0, time: 1},
    {open: 20, high: 30, close: 21, low: 19, volume: 0, time: 2},
    {open: 21, high: 31, close: 30, low: 20, volume: 0, time: 3},
    {open: 30, high: 33, close: 32, low: 28, volume: 0, time: 4},
    {open: 30, high: 31, close: 23, low: 21, volume: 0, time: 5},
    {open: 23, high: 24, close: 15, low: 14, volume: 0, time: 6},
    {open: 15, high: 16, close: 14, low: 12, volume: 0, time: 7},
    {open: 14, high: 18, close: 17, low: 13, volume: 0, time: 8},
    {open: 17, high: 26, close: 25, low: 16, volume: 0, time: 9},
    {open: 25, high: 35, close: 27, low: 24, volume: 0, time: 10},
    {open: 27, high: 38, close: 31, low: 26, volume: 0, time: 11},
    {open: 31, high: 34, close: 23, low: 22, volume: 0, time: 12},
    {open: 23, high: 37, close: 34, low: 22, volume: 0, time: 13},
];

const StructureMappingPage = () => {
    const [data, setData] = useState([]);
    const [ticker, onSelectTicker] = useState('MTLR');
    const [tf, setSize] = useState('300');
    const [{fromDate, toDate}, setDates] = useState({
        fromDate: 1732050000,
        toDate: 1732222799
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

    let {swings, boses} = useMemo(() => {
        const manager = new StateManager(data);
        manager.calculateSwingsOld()

         tradinghubCalculateTrendNew(manager, {});

        return {trend: manager.trend, boses: manager.boses, swings: manager.swings}
    }, [data]);

    const markers = useMemo(() => swingsToMarkers(swings), [swings]);

    const lineSerieses = useMemo(() => bosesToLineSerieses(boses), [boses]);

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
        <div style={{    display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data7} text="HH"/>
            <BOSChart data={data8} text="HH"/>
            <BOSChart data={data9} text="HH"/>
        </div>
        <div style={{    display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data10} text="HH"/>
            <BOSChart data={data11} text="HH"/>
            <BOSChart data={data12} text="HH"/>
        </div>
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