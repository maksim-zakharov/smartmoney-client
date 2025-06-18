import {Button, Layout, Menu, Radio, Space} from "antd";
import {TickerSelect} from "./TickerSelect.tsx";
import {TimeframeSelect} from "./TimeframeSelect.tsx";
import {DatesPicker} from "./DatesPicker.tsx";
import dayjs, {type Dayjs} from "dayjs";
import {Chart} from "./SoloTestPage/UpdatedChart";
import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {
    bosesToLineSerieses,
    fetchCandlesFromAlor,
    orderblocksToImbalancePrimitives, orderblocksToOrderblocksPrimitives,
    swingsToMarkers
} from "./utils";
import {
    calculateTesting,
    defaultConfig,
    filterNearOrderblock
} from "./sm-lib/th_ultimate";
import {Time} from "lightweight-charts";
import Sider from "antd/es/layout/Sider";
import {Content} from "antd/es/layout/layout";
import useWindowDimensions from "./useWindowDimensions.tsx";
import {ItemType, MenuItemType} from "antd/es/menu/interface";
import {LeftOutlined, RightOutlined} from '@ant-design/icons';
import {THConfig} from "./sm-lib/models";
import {isNotSMT, notTradingTime} from "./sm-lib/utils";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

const NewTestingPage = () => {
    const [env, setEnv] = useState<'dev' | 'prod'>('dev');
    const [offset, setOffset] = useState(0);

    const {height, width, isMobile} = useWindowDimensions();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedKey = searchParams.get('tab') || 'swings';
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '300';
    const fromDate = searchParams.get('fromDate') || dayjs().add(-1, "week").unix();
    const toDate = searchParams.get('toDate') || dayjs().endOf('day').unix();

    const [data, setData] = useState([]);

    const setSelectedKey = (tf: string) => {
        searchParams.set('tab', tf);
        setSearchParams(searchParams)
    }

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

    let newStruct: THConfig = {};
    if (selectedKey === 'swings') {
        newStruct = {showHiddenSwings: true};
    }
    if (selectedKey === 'structure') {
        newStruct = {showHiddenSwings: false, showFake: false};
    }
    if(selectedKey === 'orderblocks'){
        newStruct = {showHiddenSwings: false, withMove: false, newSMT: true, showFake: false};
    }

    const currentCandle = data[data.length - 1 - offset];

    let {
        swings,
        trend,
        boses,
        orderBlocks
    } = calculateTesting(data.slice(0, data.length - offset), env === 'prod' ? defaultConfig  : newStruct);
    orderBlocks = orderBlocks.filter(isNotSMT)

    if(env === 'prod'){
        orderBlocks = filterNearOrderblock(
            orderBlocks
            // ОБ еще не сформировался
            .filter((p) => !p.endCandle),
            currentCandle
        );
    }
    const checkShow = (ob) => {
        const result = true;
        if(!ob){
            return false;
        }
        // if(!Boolean(ob.endCandle)){
        //     result = false;
        // }
        // if(config.showEndOB && Boolean(ob.endCandle)){
        //     result = true;
        // }
        // if(ob.text === 'SMT'){
        //     result = false;
        // }
        return isNotSMT(ob);
    }
    const primitives = useMemo(() => {
        const lastCandle = data[data.length - 1];
        const _primitives = [];
        if(selectedKey === 'orderblocks'){
            if(true){ // config.imbalances
                _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, checkShow, lastCandle));
            }
            _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, checkShow, lastCandle));
        }

        return _primitives;
    }, [orderBlocks, trend, data, selectedKey])


    const markers = useMemo(() => {
        const allMarkers = [];
        if (selectedKey === 'orderblocks') {
            allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
                color: s.side === 'low' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.textTime || s.time) as Time,
                shape: 'text',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.text
            })));
        }

        allMarkers.push(...swingsToMarkers(swings))

        return allMarkers;
    }, [swings, orderBlocks, selectedKey]);


    const lineSerieses = useMemo(() => {
        const _lineSerieses = [];
        if (selectedKey !== 'swings') { // config.BOS
            _lineSerieses.push(...bosesToLineSerieses(boses));
        }
        return _lineSerieses;
    }, [boses, selectedKey]);

    const items: ItemType<MenuItemType>[] = [
        {key: 'swings', label: 'Swings'},
        {key: 'structure', label: 'Структура'},
        {key: 'orderblocks', label: 'Ордер Блоки'},
    ]
    /**
     *
     *                         data[nextIndex].borderColor = "rgba(44,60,75, 1)";
     *                         data[nextIndex].wickColor = "rgba(44,60,75, 1)";
     *                         data[nextIndex].color = 'rgba(0, 0, 0, 0)';
     */

    return <Layout style={{height: '100%'}}>
        <Sider width={200}>
            <Menu
                mode="inline"
                defaultSelectedKeys={[selectedKey]}
                style={{height: '100%'}}
                items={items}
                onSelect={({key}) => setSelectedKey(key)}
            />
        </Sider>
        <Content style={{minHeight: 280, height: '100%', padding: '8px 8px 16px 16px'}}>
            <Space style={{alignItems: 'baseline', paddingBottom: '16px'}}>
                <TickerSelect value={ticker} onSelect={onSelectTicker}/>
                <TimeframeSelect value={tf} onChange={setSize}/>
                <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                             onChange={onChangeRangeDates}/>
                <Button style={{display: 'block'}} icon={<LeftOutlined/>} onClick={() => setOffset(prev => prev += 1)}/>
                <Button style={{display: 'block'}} icon={<RightOutlined/>}
                        onClick={() => setOffset(prev => prev < 0 ? prev : prev -= 1)}/>
                <Radio.Group value={env} onChange={(e) => setEnv(e.target.value)}>
                    <Radio.Button value="dev">Development</Radio.Button>
                    <Radio.Button value="prod">Production</Radio.Button>\
                </Radio.Group>
            </Space>

            <Chart height={height - 126} lineSerieses={lineSerieses} hideInternalCandles primitives={primitives}
                   markers={markers} data={data.map((d, i, array) => i >= array.length - 1 - offset ?
                {
                    ...d, borderColor: "rgba(44,60,75, 1)",
                    wickColor: "rgba(44,60,75, 1)",

                    color: 'rgba(0, 0, 0, 0)'
                } : d)}
                   ema={[]}/>
        </Content>
    </Layout>
}

export default NewTestingPage;