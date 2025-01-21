import {Layout, Menu, Space} from "antd";
import {TickerSelect} from "./TickerSelect.tsx";
import {TimeframeSelect} from "./TimeframeSelect.tsx";
import {DatesPicker} from "./DatesPicker.tsx";
import dayjs, {type Dayjs} from "dayjs";
import {Chart} from "./SoloTestPage/TestChart.tsx";
import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {fetchCandlesFromAlor} from "./utils.ts";
import {calculateTesting, notTradingTime} from "./th_ultimate.ts";
import {LineStyle, Time} from "lightweight-charts";
import Sider from "antd/es/layout/Sider";
import {Content} from "antd/es/layout/layout";
import useWindowDimensions from "./useWindowDimensions.tsx";
import {ItemType, MenuItemType} from "antd/es/menu/interface";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

const NewTestingPage = () => {
    const [selectedKey, setSelectedKey] = useState('swings');
    const {height, width, isMobile} = useWindowDimensions();
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

    let newStruct = {newStructure: true, moreBOS: true, showHiddenSwings: true};
    if(selectedKey === 'swings'){
        newStruct = {newStructure: true, moreBOS: true, showHiddenSwings: true};
    }

    const {swings, highs, lows, trend, boses, orderBlocks} = calculateTesting(data, newStruct);

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
                text: selectedKey !== 'swings' ? s.isIFC ? 'IFC' : s.text : undefined
            })));
            allMarkers.push(...lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: selectedKey !== 'swings' ? s.isIFC ? 'IFC' : s.text : undefined
            })));
        // }

        return allMarkers;
    }, [swings, orderBlocks, selectedKey]);


    const lineSerieses = useMemo(() => {
        const _lineSerieses = [];
        if(selectedKey !== 'swings'){ // config.BOS
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
        }
        return _lineSerieses;
    }, [boses, selectedKey]);

    const items: ItemType<MenuItemType>[] = [
        {key: 'swings', label: 'Swings'},
        {key: 'idm', label: 'IDM'},
    ]

    return <Layout style={{ height: '100%' }}>
            <Sider width={200}>
                <Menu
                    mode="inline"
                    defaultSelectedKeys={[selectedKey]}
                    style={{ height: '100%' }}
                    items={items}
                    onSelect={({key}) => setSelectedKey(key)}
                />
            </Sider>
            <Content style={{ minHeight: 280, height: '100%', padding: '8px 8px 16px 16px' }}>
                <Space style={{alignItems: 'baseline', paddingBottom: '16px'}}>
                    <TickerSelect value={ticker} onSelect={onSelectTicker}/>
                    <TimeframeSelect value={tf} onChange={setSize}/>
                    <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                                 onChange={onChangeRangeDates}/>
                </Space>
                <Chart height={height - 126} lineSerieses={lineSerieses} hideInternalCandles primitives={[]} markers={markers} data={data}
                       ema={[]}/>
            </Content>
        </Layout>
}

export default NewTestingPage;