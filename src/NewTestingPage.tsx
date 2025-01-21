import {Space} from "antd";
import {TickerSelect} from "./TickerSelect.tsx";
import {TimeframeSelect} from "./TimeframeSelect.tsx";
import {DatesPicker} from "./DatesPicker.tsx";
import dayjs, {type Dayjs} from "dayjs";
import {Chart} from "./SoloTestPage/TestChart.tsx";
import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {fetchCandlesFromAlor} from "./utils.ts";
import {calculateTesting, notTradingTime} from "./th_ultimate.ts";
import {Time} from "lightweight-charts";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

const NewTestingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '300';
    const fromDate = searchParams.get('fromDate') || dayjs('2024-10-01T00:00:00Z').startOf('day').unix();
    const toDate = searchParams.get('toDate') || dayjs('2025-10-01T00:00:00Z').endOf('day').unix();

    const [data, setData] = useState([]);

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
        setSearchParams(searchParams)
    }

    const onSelectTicker = (ticker) => {
        searchParams.set('ticker', ticker);
        setSearchParams(searchParams)
    }

    const onChangeRangeDates = (value: Dayjs[], dateString) => {
        searchParams.set('fromDate', value[0].startOf('day').unix());
        searchParams.set('toDate', value[1].endOf('day').unix());
        setSearchParams(searchParams);
    }

    useEffect(() => {
        fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData);
    }, [tf, ticker, fromDate, toDate]);

    const newStruct = {newStructure: true, showHiddenSwings: true}

    const {swings, highs, lows, trend, boses, orderBlocks} = calculateTesting(data, {...newStruct});

    const markers = useMemo(() => {
        const allMarkers = [];
        if(false) {
            const checkShow = (ob) => {
                let result = true;
                // if(config.showOB && !Boolean(ob.endCandle)){
                //     result = true;
                // }
                // if(config.showEndOB && Boolean(ob.endCandle)){
                //     result = true;
                // }
                // if(ob.text === 'SMT' && !config.showSMT){
                //     result = false;
                // }
                return result;
            }
            allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
                color: s.type === 'low' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.textTime || s.time) as Time,
                shape: 'text',
                position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                text: s.text
            })));
        }
        // if(config.swings){
            // allMarkers.push(...swings.swings.filter(Boolean).map(s => ({
            //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            //     time: (s.time) as Time,
            //     shape: 'circle',
            //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            //     // text: marker.text
            // })));
            allMarkers.push(...highs.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.isIFC ? 'IFC' : s.text
            })));
            allMarkers.push(...lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.isIFC ? 'IFC' : s.text
            })));
        // }

        return allMarkers;
    }, [swings, orderBlocks]);

    return <>
        <Space style={{alignItems: 'baseline'}}>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
        </Space>
        <Chart lineSerieses={[]} hideInternalCandles primitives={[]} markers={markers} data={data}
               ema={[]}/>
    </>
}

export default NewTestingPage;