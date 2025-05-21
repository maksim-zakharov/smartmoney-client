import {Divider, Space, Typography} from "antd";
import img from "../../assets/img.png"
import img_1 from "../../assets/img_1.png"
import img_2 from "../../assets/img_2.png"
import {Chart} from "../../SoloTestPage/UpdatedChart";
import React, {useEffect, useMemo, useState} from "react";
import {bosesToLineSerieses, fetchCandlesFromAlor, swingsToMarkers} from "../../utils";
import dayjs from 'dayjs';
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import type { Dayjs } from 'dayjs';
import {
    StateManager,
} from "../../THUltimate/th_ultimate.ts";
import Paragraph from "antd/es/typography/Paragraph";
import {HistoryObject} from "../../THUltimate/models.ts";

import {notTradingTime} from "../../THUltimate/th_ultimate.ts";
const BOSChart = ({data}: {data: HistoryObject[]}) => {
    const manager = new StateManager(data);
    manager.calculateSwings();

    manager.markHHLLOld();
    // manager.drawBOSOld();

    const _lineSerieses1 = bosesToLineSerieses(manager.boses);
    const allMarkers1 = [];

    allMarkers1.push(...swingsToMarkers(manager.swings));

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
        manager.calculateSwingsOld()

        return manager.swings;
    }, [data]);

    const markers = useMemo(() => swingsToMarkers(swings), [swings]);

    return <>
        <Typography.Paragraph italic>When Market momentum is very strong to the upside or downside those types strong

            unhealthy price action is called Impulsive Move, Price generally move in two way impulse and

            correction. you can understand like this in impulsive move lots of institutional and Banks

            Buying Momentum and correction phase retail traders trying to buy sell and market move in a

            particular range. Now i am going to explain you here in details that how its looks.</Typography.Paragraph>
        <img src={img}/>
        <img src={img_1}/>
        <Paragraph>
            <ol>
                <li>Это правильный откат, потому что свеча М является самой низкой в движении, после чего свеча K пробивает свечу M сверху.</li>
                <li>Это не откат, потому что свечи A и N снова внутри свечи H</li>
            </ol>
            <ol>
                <li>Свеча H одновременно пробила свечу K и снизу и сверху. Это движение называется корректирующим.</li>
                <li>Это не откат, потому что свечи A и N снова внутри свечи H</li>
                <li>Это правильный откат, потому что самая низкая свеча это U а не H и свеча B пробила максимум свечи
                    U.
                </li>
            </ol>
        </Paragraph>
        <div style={{
            display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data1}/>
            <BOSChart data={data2}/>
        </div>
        <Typography.Paragraph italic>
            When Price taken out Prev Candle High / Low then candle colors not matter may be Bullish or bearish in both
            scenarios are valid. one more thing Price taken out High/Low then sometimes candle close or Sweep Prev
            Candle High Low . Both scenarios are valid.
        </Typography.Paragraph>
        <Paragraph>
            <ol>
                <li>Свеча M является самой высокой свечой движения.</li>
                <li>Минимум свечи М пробивается свечой K.</li>
                <li>Поэтому это движение является правильным откатом.</li>
                <li>Свеча H является самой высокой свечой движения.</li>
                <li>Свеча A и N являются внутренними свечами для H (не пробивают снизу)</li>
                <li>Поэтому это движение не является правильным откатом.</li>
            </ol>
            <ol>
                <li>Свеча H является максимальной свечой движения</li>
                <li>И при этом она пробивает лой предыдущей свечи K.</li>
                <li>Поэтому это движение является правильным откатом.</li>
                <li>Свечи A и N внутренние для H, поэтому не являются правильным откатом.</li>
                <li>Свеча U выше свечи H</li>
                <li>Свеча B пробивает свечу U снизу, поэтому это движение является правильным откатом.</li>
            </ol>
        </Paragraph>
        <div style={{
            display: 'flex',

            flexDirection: 'row',
            gap: '8px',
            marginBottom: '8px'
        }}>
            <BOSChart data={data3}/>
            <BOSChart data={data4}/>
        </div>
        <img src={img_2}/>
        <Paragraph>
            <ol>
                <li>После хай вершины, искали лоу. Красная свеча сделала лоу, но так как она не сделала свип хай, и после нее все свечи внутренние - и этот свип лоу нельзя засчитать</li>
                <li>Вот следующая бычья свеча обновила локальный лоу, после чего был свип хай</li>
                <li>Далее на картинке бычья свеча сделала свип хай, но все некст свечи были внутренними, поэтому зеленой свечой мы обновили предыдущую красную</li>
                <li>Далее у нас правильный откат, потому что зеленая свеча пересвипнула пинбар, <br/> дальше внутренняя черная свеча не пересвипнула зеленую не сверху ни снизу, <br/> а
                    следующая зеленая свеча пересвипнула черную снизу, и сверху, но хай зафиксировали только на следующей свече</li>
            </ol>
        </Paragraph>
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