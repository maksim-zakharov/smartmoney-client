import {Divider, Space, Typography} from "antd";
import img from "../../assets/img.png"
import img_1 from "../../assets/img_1.png"
import img_2 from "../../assets/img_2.png"
import {Chart} from "../../TestPage/TestChart";
import React, {useEffect, useMemo, useState} from "react";
import {fetchCandlesFromAlor, notTradingTime} from "../../utils";
import dayjs from 'dayjs';
import {TickerSelect} from "../../TickerSelect";
import {TimeframeSelect} from "../../TimeframeSelect";
import {DatesPicker} from "../../DatesPicker";
import type { Dayjs } from 'dayjs';
import {tradinghubCalculateSwings} from "../../samurai_patterns";
import {Time} from "lightweight-charts";

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