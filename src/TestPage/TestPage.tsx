import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, Divider, Input, Radio, Slider, Space} from "antd";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {Chart} from "./TestChart";
import {calculateEMA} from "../../symbolFuturePairs";
import {fetchCandlesFromAlor, fillTrendByMinorData, getSecurity, notTradingTime, refreshToken} from "../utils";
import {TickerSelect} from "../TickerSelect";
import {TimeframeSelect} from "../TimeframeSelect";
import {
    calculateFakeout,
    calculateOB, calculatePositionsByFakeouts, calculatePositionsByOrderblocks,
    calculateStructure,
    calculateSwings,
    calculateTrend,
    khrustikCalculateSwings,
    Trend
} from "../samurai_patterns";
import {Time} from "lightweight-charts";
import {DatesPicker} from "../DatesPicker";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export const TestPage = () => {
    const [swipType, setSwipType] = useState('samurai');
    const [obType, setOBType] = useState('samurai');
    const [data, setData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [ema, setEma] = useState([]);
    const [checkboxValues, setCheckboxValues] = useState(['showPositions', 'showEndOB']);
    const [windowLength, setWindowLength] = useState(5);
    const [maxDiff, setMaxDiff] = useState(0);
    const [multiStop, setMultiStop] = useState(5);
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '900';
    const trendTF = searchParams.get('trendTF') || '900';
    const fromDate = searchParams.get('fromDate') || dayjs('2024-10-01T00:00:00Z').startOf('day').unix();
    const toDate = searchParams.get('toDate') || dayjs('2025-10-01T00:00:00Z').endOf('day').unix();
    const [{positions}, onPositions] = useState({positions: []});
    const [stopMargin, setStopMargin] = useState(100);
    const [security, setSecurity] = useState();

    const profit = useMemo(() => {
        if(!security){
            return {
                PnL: 0,
                profits: 0,
                losses: 0
            }
        }
        const recalculatePositions = positions.map((curr) => {
            const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
            const stopLossMarginPerLot = diff * security?.lotsize
            curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
            curr.newPnl = curr.pnl * curr.quantity * security?.lotsize;

            return curr;
        });
        return {
            PnL: recalculatePositions.reduce((acc, curr) => acc + curr.newPnl, 0),
            profits: recalculatePositions.filter(p => p.newPnl > 0).length,
            losses: recalculatePositions.filter(p => p.newPnl < 0).length
        };
    }, [positions, stopMargin, security?.lotsize])

    const [token, setToken] = useState();

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    useEffect(() => {
        data && setEma(calculateEMA(
            data.map((h) => h.close),
            100
        )[1]);
    }, [data])

    useEffect(() => {
        if(tf === trendTF){
            fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData);
        } else {
            Promise.all([fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData), fetchCandlesFromAlor(ticker, trendTF, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setTrendData)])
        }
    }, [tf, trendTF, ticker, fromDate, toDate]);

    const config = useMemo(() => ({
        smPatterns: checkboxValues.includes('smPatterns'),
        oldTrend: checkboxValues.includes('oldTrend'),
        swings: checkboxValues.includes('swings'),
        noDoubleSwing: checkboxValues.includes('noDoubleSwing'),
        noInternal: checkboxValues.includes('noInternal'),
        smartTrend: checkboxValues.includes('smartTrend'),
        withTrendConfirm: checkboxValues.includes('withTrendConfirm'),
        BOS: checkboxValues.includes('BOS'),
        showOB: checkboxValues.includes('showOB'),
        showEndOB: checkboxValues.includes('showEndOB'),
        imbalances: checkboxValues.includes('imbalances'),
        showPositions: checkboxValues.includes('showPositions'),
        tradeFakeouts: checkboxValues.includes('tradeFakeouts'),
        excludeIDM: checkboxValues.includes('excludeIDM'),
        showFakeouts: checkboxValues.includes('showFakeouts'),
        excludeTrendSFP: checkboxValues.includes('excludeTrendSFP'),
        excludeWick: checkboxValues.includes('excludeWick'),
        withMove: checkboxValues.includes('withMove'),
    }), [checkboxValues])

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
        setSearchParams(searchParams)
    }

    const setTrendSize = (tf: string) => {
        searchParams.set('trendTF', tf);
        setSearchParams(searchParams)
    }

    const onSelectTicker = (ticker) => {
        searchParams.set('ticker', ticker);
        setSearchParams(searchParams)
    }

    const onChangeRangeDates = (value: Dayjs[], dateString) => {
        console.log('Selected Time: ', value);
        console.log('Formatted Selected Time: ', dateString);

        searchParams.set('fromDate', value[0].startOf('day').unix());
        searchParams.set('toDate', value[1].endOf('day').unix());
        setSearchParams(searchParams);
    }

    const swipCallback = useCallback(swipType === 'samurai' ? calculateSwings : khrustikCalculateSwings, [swipType]);

    const _data = useMemo(() => {
        if(tf === trendTF){
            return data;
        } else {
            return trendData;
        }
    } ,[tf, trendTF, data, trendData])

    const swings = useMemo(() => swipCallback(_data) ,[swipCallback, _data])

    const {structure, highParts, lowParts} = useMemo(() => calculateStructure(swings.highs, swings.lows, _data) ,[_data, swings])

    const trend: Trend[] = useMemo(() => {
        if(tf === trendTF){
            if(!data.length){
                return [];
            }
            return calculateTrend(highParts, lowParts, data, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick).trend;
        } else {
            if(!trendData.length){
                return [];
            }
            let newTrend = calculateTrend(highParts, lowParts, trendData, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick).trend;

            newTrend = fillTrendByMinorData(newTrend, trendData, data)

            return newTrend;
        }
    }, [tf, trendTF, data, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick, trendData, highParts, lowParts]);

    const orderBlocks = useMemo(() => calculateOB(highParts, lowParts, _data, trend, config.excludeIDM, obType !== 'samurai') ,[highParts, lowParts, _data, trend, config.excludeIDM, obType])

    const fakeouts = useMemo(() => calculateFakeout(highParts, lowParts, _data), [highParts, lowParts, _data]);

    const rectangles = useMemo(() => {
        const lastCandle = _data[_data.length - 1];
        const _rectangles = [];
        if(config.showOB || config.showEndOB || config.imbalances){
            const checkShow = (ob) => {
                let result = false;
                if(config.showOB && !Boolean(ob.endCandle)){
                    result = true;
                }
                if(config.showEndOB && Boolean(ob.endCandle)){
                    result = true;
                }
                return result;
            }
            config.imbalances && _rectangles.push(...orderBlocks.filter(checkShow).map(orderBlock => ({
                leftTop: {
                    price: orderBlock.lastOrderblockCandle.high,
                    time: orderBlock.lastOrderblockCandle.time * 1000
                },
                rightBottom: {
                    price: orderBlock.lastImbalanceCandle.low,
                    time: (orderBlock.lastImbalanceCandle || lastCandle).time * 1000
                },
                options: {
                    fillColor: 'rgba(179, 199, 219, .3)',
                    showLabels: false,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderWidth: 2,
                    borderColor: '#222'
                }
            })));
            _rectangles.push(...orderBlocks.filter(checkShow).map(orderBlock => ({leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time * 1000}, rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time * 1000},
                options: {
                    fillColor: orderBlock.type === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                    showLabels: false,
                    borderWidth: 0,
                }})));
        }

        return _rectangles;
    }, [orderBlocks, config.imbalances, config.showOB, config.showEndOB, config.imbalances, _data])

    const markers = useMemo(() => {
        const allMarkers = [];
        if(config.showOB || config.showEndOB || config.imbalances) {
            const checkShow = (ob) => {
                let result = false;
                if(config.showOB && !Boolean(ob.endCandle)){
                    result = true;
                }
                if(config.showEndOB && Boolean(ob.endCandle)){
                    result = true;
                }
                return result;
            }
            allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
                color: s.type === 'low' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'text',
                position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                text: "OB"
            })));
        }
        if(config.swings){
            // allMarkers.push(...swings.swings.filter(Boolean).map(s => ({
            //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            //     time: (s.time * 1000) as Time,
            //     shape: 'circle',
            //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            //     // text: marker.text
            // })));
            allMarkers.push(...swings.highs.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })));
            allMarkers.push(...swings.lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })));
        }
        if(config.noDoubleSwing){
            allMarkers.push(...lowParts.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })));
            allMarkers.push(...highParts.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })))
        }

        if(config.showFakeouts){
            allMarkers.push(...fakeouts.map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time * 1000) as Time,
                shape: 'text',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: "SFP"
            })))
        }

        return allMarkers;
    }, [swings, lowParts, highParts, orderBlocks, config.showOB, config.showEndOB, config.imbalances, config.swings, config.noDoubleSwing, fakeouts, config.showFakeouts]);

    const _positions = useMemo(() => {
        const positions = calculatePositionsByOrderblocks(orderBlocks, _data, maxDiff, multiStop);
        if(config.tradeFakeouts){
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, _data, multiStop);
            positions.push(...fakeoutPositions);
        }
        return positions.sort((a, b) => a.openTime - b.openTime);
    }, [orderBlocks, fakeouts, _data, maxDiff, multiStop, config.tradeFakeouts]);

    return <>
        <Divider plain orientation="left">Общее</Divider>
        <Space>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates}/>
        </Space>
        <Divider plain orientation="left">Структура</Divider>
        <Space>
            <Radio.Group onChange={e => setSwipType(e.target.value)}
                         value={swipType}>
                <Radio value="samurai">Свипы по самураю</Radio>
                <Radio value="khrustik">Свипы по хрустику</Radio>
            </Radio.Group>
            <Radio.Group onChange={e => setOBType(e.target.value)}
                         value={obType}>
                <Radio value="samurai">ОБ по самураю</Radio>
                <Radio value="dobrinya">ОБ по добрыне</Radio>
            </Radio.Group>
            <TimeframeSelect value={trendTF} onChange={setTrendSize}/>
        </Space>
        <Divider plain orientation="left">Инструмент</Divider>
        <Space>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <Input value={stopMargin} onChange={(e) => setStopMargin(Number(e.target.value))}/>
            <Space>
                <div>Профит: {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(profit.PnL)}</div>
                <div>Прибыльных: {profit.profits}</div>
                    <div>Убыточных: {profit.losses}</div>
                    <div>Винрейт: {((profit.profits / (profit.profits + profit.losses)) * 100).toFixed(2)}%</div>
            </Space>
        </Space>
        <Slider defaultValue={windowLength} onChange={setWindowLength}/>
        <Slider defaultValue={maxDiff} onChange={setMaxDiff} min={0} max={1} step={0.1}/>
        <Slider defaultValue={multiStop} onChange={setMultiStop} min={1} max={5} step={1}/>
        <Checkbox.Group onChange={setCheckboxValues}>
            <Checkbox key="smPatterns" value="smPatterns">smPatterns</Checkbox>
            <Checkbox key="oldTrend" value="oldTrend">Тренд</Checkbox>
            <Checkbox key="swings" value="swings">Swings</Checkbox>
            <Checkbox key="noDoubleSwing" value="noDoubleSwing">Исключить свинги подряд</Checkbox>
            {/*<Checkbox key="noInternal" value="noInternal">Исключить внутренние свинги</Checkbox>*/}
            <Checkbox key="smartTrend" value="smartTrend">Умный тренд</Checkbox>
            <Checkbox key="withTrendConfirm" value="withTrendConfirm">Тренд с подтверждением</Checkbox>
            <Checkbox key="BOS" value="BOS">Структуры</Checkbox>
            <Checkbox key="showOB" value="showOB">Актуальные OB</Checkbox>
            <Checkbox key="showEndOB" value="showEndOB">Отработанные OB</Checkbox>
            <Checkbox key="imbalances" value="imbalances">Имбалансы</Checkbox>
            <Checkbox key="showPositions" value="showPositions">Сделки</Checkbox>
            <Checkbox key="tradeFakeouts" value="tradeFakeouts">Торговать ложные пробои</Checkbox>
            <Checkbox key="showFakeouts" value="showFakeouts">Ложные пробои</Checkbox>
            <Checkbox key="excludeIDM" value="excludeIDM">Исключить IDM</Checkbox>
            <Checkbox key="excludeTrendSFP" value="excludeTrendSFP">Исключить Fake BOS</Checkbox>
            <Checkbox key="excludeWick" value="excludeWick">Игнорировать пробитие фитилем</Checkbox>
        </Checkbox.Group>
        <Chart maxDiff={maxDiff} positions={_positions} rectangles={rectangles} orderBlocks={orderBlocks} markers={markers} trend={trend} multiStop={multiStop} data={data} ema={ema} windowLength={windowLength} tf={Number(tf)} {...config} onProfit={onPositions} />
    </>;
}

export default TestPage;