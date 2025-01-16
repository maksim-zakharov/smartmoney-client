import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, Divider, Form, Input, Row, Slider, SliderSingleProps, Space} from "antd";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {Chart} from "./TestChart";
import {
    createRectangle2,
    fetchCandlesFromAlor, fetchRiskRates,
    getSecurity,
    refreshToken
} from "../utils";
import {TickerSelect} from "../TickerSelect";
import {TimeframeSelect} from "../TimeframeSelect";
import {
    calculateFakeout,
    calculatePositionsByFakeouts, calculatePositionsByIFC,
    calculatePositionsByOrderblocks,
} from "../samurai_patterns";
import {isBusinessDay, isUTCTimestamp, LineStyle, Time} from "lightweight-charts";
import {DatesPicker} from "../DatesPicker";
import {SessionHighlighting} from "../lwc-plugins/session-highlighting";
import {
    calculateTesting, notTradingTime
} from "../th_ultimate";
import {useOrderblocksQuery} from "../api";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export const SoloTestPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState([]);

    const checkboxValues = (searchParams.get('checkboxes') || "tradeOB,BOS,swings,moreBOS").split(',');
    const setCheckboxValues = (values) => {
        searchParams.set('checkboxes', values.join(','));
        setSearchParams(searchParams)
    }

    const [windowLength, setWindowLength] = useState(5);
    const [maxDiff, setMaxDiff] = useState(0);
    const [multiStop, setMultiStop] = useState(5);
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '300';
    const fromDate = searchParams.get('fromDate') || dayjs('2024-10-01T00:00:00Z').startOf('day').unix();
    const toDate = searchParams.get('toDate') || dayjs('2025-10-01T00:00:00Z').endOf('day').unix();
    const [stopMargin, setStopMargin] = useState(100);
    const [security, setSecurity] = useState();

    const [riskRate, setRiskRate] = useState();

    const isShortSellPossible = riskRate?.isShortSellPossible || false;

    const [token, setToken] = useState();

    const {data: robotOB = []} = useOrderblocksQuery({symbol: ticker, tf, from: fromDate, to: toDate});

    const config = useMemo(() => ({
        swings: checkboxValues.includes('swings'),
        noInternal: checkboxValues.includes('noInternal'),
        smartTrend: checkboxValues.includes('smartTrend'),
        withTrendConfirm: checkboxValues.includes('withTrendConfirm'),
        removeInternal: checkboxValues.includes('removeInternal'),
        onlyExtremum: checkboxValues.includes('onlyExtremum'),
        removeEmpty: checkboxValues.includes('removeEmpty'),
        BOS: checkboxValues.includes('BOS'),
        showOB: checkboxValues.includes('showOB'),
        showEndOB: checkboxValues.includes('showEndOB'),
        imbalances: checkboxValues.includes('imbalances'),
        showPositions: checkboxValues.includes('showPositions'),
        tradeFakeouts: checkboxValues.includes('tradeFakeouts'),
        tradeIFC: checkboxValues.includes('tradeIFC'),
        limitOrderTrade: checkboxValues.includes('limitOrderTrade'),
        tradeOB: checkboxValues.includes('tradeOB'),
        showFakeouts: checkboxValues.includes('showFakeouts'),
        excludeTrendSFP: checkboxValues.includes('excludeTrendSFP'),
        excludeWick: checkboxValues.includes('excludeWick'),
        withMove: checkboxValues.includes('withMove'),
        moreBOS: checkboxValues.includes('moreBOS'),
        newSMT: checkboxValues.includes('newSMT'),
        showHiddenSwings: checkboxValues.includes('showHiddenSwings'),
        showRobotOB: checkboxValues.includes('showRobotOB'),
    }), [checkboxValues])

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    useEffect(() => {
        fetchRiskRates(ticker).then(setRiskRate)
    }, [ticker])

    useEffect(() => {
            fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData);
    }, [tf, ticker, fromDate, toDate]);

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
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
    
    const {swings, trend, boses, orderBlocks, fakeouts, positions} = useMemo(() => {
        const {swings, highs, lows, trend, boses, orderBlocks} = calculateTesting(data, config.withMove, config.moreBOS);

        const fakeouts = calculateFakeout(highs, lows, data)

        let positions = [];

        if(config.tradeOB){
            const fakeoutPositions = calculatePositionsByOrderblocks(orderBlocks, data, maxDiff, multiStop, config.limitOrderTrade);
            positions.push(...fakeoutPositions);
        }
        if(config.tradeFakeouts){
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, multiStop);
            positions.push(...fakeoutPositions);
        }
        if(config.tradeIFC){
            const fakeoutPositions = calculatePositionsByIFC(data, swings, trend, maxDiff, multiStop);
            positions.push(...fakeoutPositions);
        }

        if(!isShortSellPossible){
            positions = positions.filter(p => p.side !== 'short');
        }

        return { swings: {highs, lows}, trend, boses, orderBlocks, fakeouts, positions: positions.sort((a, b) => a.openTime - b.openTime)};
    }, [isShortSellPossible, config.newSMT, config.showHiddenSwings, config.moreBOS, config.withMove, config.removeEmpty, config.onlyExtremum, config.removeInternal, config.tradeOB, config.tradeIFC, config.limitOrderTrade, config.withTrendConfirm, config.excludeTrendSFP, config.tradeFakeouts, config.excludeWick, data, maxDiff, multiStop])

    const robotEqualsPercent = useMemo(() => {
        if(!config.showRobotOB || !robotOB.length){
            return 0;
        }

        const robotOBMap = robotOB.reduce((acc, curr) => {
            const key = curr.time;
            acc[key] = curr;
            return acc;
        }, {});

        const total = orderBlocks.length;
        const current = orderBlocks.filter(o =>
            robotOBMap[o.time]
            && robotOBMap[o.time].index === o.index

            && robotOBMap[o.time].startCandle.time === o.startCandle.time
            && robotOBMap[o.time].startCandle.high === o.startCandle.high
            && robotOBMap[o.time].startCandle.low === o.startCandle.low
            && robotOBMap[o.time].startCandle.close === o.startCandle.close
            && robotOBMap[o.time].startCandle.open === o.startCandle.open

            && robotOBMap[o.time].lastImbalanceCandle.time === o.lastImbalanceCandle.time
            && robotOBMap[o.time].lastImbalanceCandle.high === o.lastImbalanceCandle.high
            && robotOBMap[o.time].lastImbalanceCandle.low === o.lastImbalanceCandle.low
            && robotOBMap[o.time].lastImbalanceCandle.close === o.lastImbalanceCandle.close
            && robotOBMap[o.time].lastImbalanceCandle.open === o.lastImbalanceCandle.open

            && robotOBMap[o.time].endCandle?.time === o.endCandle?.time
            && robotOBMap[o.time].endCandle?.high === o.endCandle?.high
            && robotOBMap[o.time].endCandle?.low === o.endCandle?.low
            && robotOBMap[o.time].endCandle?.close === o.endCandle?.close
            && robotOBMap[o.time].endCandle?.open === o.endCandle?.open
        ).length;

        return (current / total) * 100;
    }, [robotOB, config.showRobotOB, orderBlocks]);

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
    }, [stopMargin, security?.lotsize, positions])

    const primitives = useMemo(() => {
        const lastCandle = data[data.length - 1];
        const _primitives = [];
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
            if(config.imbalances){
                _primitives.push(...orderBlocks.filter(checkShow).map(orderBlock => createRectangle2({
                    leftTop: {
                        price: orderBlock.lastOrderblockCandle.high,
                        time: orderBlock.lastOrderblockCandle.time
                    },
                    rightBottom: {
                        price: orderBlock.lastImbalanceCandle[orderBlock.type],
                        time: (orderBlock.endCandle || lastCandle).time
                    }
                }, {
                    fillColor: 'rgba(179, 199, 219, .3)',
                    showLabels: false,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderWidth: 2,
                    borderColor: '#222'
                })));
                if(config.showRobotOB)
                _primitives.push(...robotOB.filter(checkShow).map(orderBlock => createRectangle2({
                    leftTop: {
                        price: orderBlock.lastOrderblockCandle.high,
                        time: orderBlock.lastOrderblockCandle.time
                    },
                    rightBottom: {
                        price: orderBlock.lastImbalanceCandle[orderBlock.type],
                        time: (orderBlock.endCandle || lastCandle).time
                    }
                }, {
                    fillColor: 'rgba(179, 199, 219, .3)',
                    showLabels: false,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderWidth: 2,
                    borderColor: '#222'
                })));
            }
            if(config.showRobotOB)
                _primitives.push(...robotOB.filter(checkShow).map(orderBlock =>
                    createRectangle2({
                            leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time},
                            rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time}
                        },
                        {
                            fillColor: orderBlock.type === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                            showLabels: false,
                            borderWidth: 0,
                        })));
            _primitives.push(...orderBlocks.filter(checkShow).map(orderBlock =>
                createRectangle2({
                        leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time},
                        rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time}
                    },
                    {
                        fillColor: orderBlock.type === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                        showLabels: false,
                        borderWidth: 0,
                    })));
        }
        function getDate(time: Time): Date {
            if (isUTCTimestamp(time)) {
                return new Date(time);
            } else if (isBusinessDay(time)) {
                return new Date(time.year, time.month, time.day);
            } else {
                return new Date(time);
            }
        }

        if (config.smartTrend) {
            const sessionHighlighter = (time: Time, index) => {
                let tr = trend[index]; // .find(c => (c?.time * 1000) >= (time as number));

                // let tr = newTrend.find(c => (c?.time * 1000) >= (time as number));
                let _trend = tr?.trend;
                if (!tr) {
                    // tr = newTrend.findLast(c => (c?.time * 1000) <= (time as number));
                    // trend = tr.trend * -1;
                }
                if (!_trend) {
                    // debugger
                    return 'gray';
                }
                if (_trend > 0) {
                    return 'rgba(20, 131, 92, 0.4)';
                }
                if (_trend < 0) {
                    return 'rgba(157, 43, 56, 0.4)';
                }

                const date = getDate(time);
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Weekend 🏖️
                    return 'rgba(255, 152, 1, 0.08)'
                }
                return 'rgba(41, 98, 255, 0.08)';
            };

            const sessionHighlighting = new SessionHighlighting(sessionHighlighter);
            _primitives.push(sessionHighlighting);
        }

        return _primitives;
    }, [robotOB, config.showRobotOB, orderBlocks, config.smartTrend, trend, config.imbalances, config.showOB, config.showEndOB, config.imbalances, data])

    const poses = useMemo(() => positions.map(s => [{
        color: s.side === 'long' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.openTime) as Time,
        shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
        position: s.side === 'short' ? 'aboveBar' : 'belowBar',
        price: s.openPrice,
        pnl: s.pnl,
    }, {
        color: s.side === 'short' ? markerColors.bullColor : markerColors.bearColor,
        time: (s.closeTime) as Time,
        shape: s.side === 'short' ? 'arrowUp' : 'arrowDown',
        position: s.side === (s.pnl > 0 ? 'long' : 'short') ? 'aboveBar' : 'belowBar',
        price: s.pnl > 0 ? s.takeProfit : s.stopLoss,
    }]), [positions]);

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
                time: (s.textTime || s.time) as Time,
                shape: 'text',
                position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                text: s.text
            })));

            if(config.showRobotOB){
                allMarkers.push(...robotOB.filter(checkShow).map(s => ({
                    color: s.type === 'low' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.textTime || s.time) as Time,
                    shape: 'text',
                    position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                    text: s.text
                })));
            }
        }
        if(config.swings){
            // allMarkers.push(...swings.swings.filter(Boolean).map(s => ({
            //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            //     time: (s.time) as Time,
            //     shape: 'circle',
            //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            //     // text: marker.text
            // })));
            allMarkers.push(...swings.highs.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.isIFC ? 'IFC' : s.text
            })));
            allMarkers.push(...swings.lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.isIFC ? 'IFC' : s.text
            })));
        }

        if(config.showFakeouts){
            allMarkers.push(...fakeouts.map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'text',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: "SFP"
            })))
        }

        if(config.showPositions){
            allMarkers.push(...poses.flat())
        }

        return allMarkers;
    }, [swings, poses, config.showRobotOB, robotOB, orderBlocks, config.showOB, config.showPositions, config.showEndOB, config.imbalances, config.swings, fakeouts, config.showFakeouts]);

    const lineSerieses = useMemo(() => {
        const _lineSerieses = [];
        if(config.showPositions){
            _lineSerieses.push(...poses.map(([open, close]) => ({
                options: {
                    color: open.pnl > 0 ? markerColors.bullColor : markerColors.bearColor, // Цвет линии
                    priceLineVisible: false,
                    lastValueVisible: false,
                    lineWidth: 1,
                    lineStyle: LineStyle.LargeDashed,
                },
                data: [
                    {time: open.time as Time, value: open.price}, // начальная точка между свечками
                    {time: close.time as Time, value: close.price}, // конечная точка между свечками
                ]
            })));
        }
        if(config.BOS){
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
    }, [poses, config.showPositions, config.BOS, boses]);

    const maxRR = 10;

    const marksRR: SliderSingleProps['marks'] = {
        [1]: 1,
        [5]: 5,
        [maxRR]: maxRR,
    };

    const marksPR: SliderSingleProps['marks'] = {
        [0]: 0,
        [0.5]: 0.5,
        [1]: 1,
    };

    return <>
        <Divider plain orientation="left">Риски</Divider>
        <Space>
            <Row>
                <Form.Item label="Риск на сделку">
                    <Input value={stopMargin} onChange={(e) => setStopMargin(Number(e.target.value))}/>
                </Form.Item>
                <Form.Item label="Risk Rate">
                    <Slider style={{width: 200}} marks={marksRR} defaultValue={multiStop} onChange={setMultiStop} min={1} max={10} step={1}/>
                </Form.Item>
                <Form.Item label="Percent Rate">
                    <Slider style={{width: 200}} defaultValue={maxDiff} marks={marksPR} onChange={setMaxDiff} min={0} max={1} step={0.1}/>
                </Form.Item>
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
                    <div>Совпадений с роботом: {(robotEqualsPercent).toFixed(2)}%</div>
                </Space>
                <Slider style={{width: 200}} defaultValue={windowLength} onChange={setWindowLength}/>
            </Row>
        </Space>
        <Checkbox.Group onChange={setCheckboxValues} value={checkboxValues}>
            <Checkbox key="swings" value="swings">Swings</Checkbox>
            <Checkbox key="smartTrend" value="smartTrend">Умный тренд</Checkbox>
            <Checkbox key="BOS" value="BOS">Структуры</Checkbox>
            <Checkbox key="showOB" value="showOB">Актуальные OB</Checkbox>
            <Checkbox key="showEndOB" value="showEndOB">Отработанные OB</Checkbox>
            <Checkbox key="imbalances" value="imbalances">Имбалансы</Checkbox>
            <Checkbox key="showPositions" value="showPositions">Сделки</Checkbox>
            <Checkbox key="tradeFakeouts" value="tradeFakeouts">Торговать ложные пробои</Checkbox>
            <Checkbox key="tradeOB" value="tradeOB">Торговать OB</Checkbox>
            <Checkbox key="limitOrderTrade" value="limitOrderTrade">Торговать лимитками</Checkbox>
            <Checkbox key="tradeIFC" value="tradeIFC">Торговать IFC</Checkbox>
            <Checkbox key="withMove" value="withMove">Двигать Имбаланс</Checkbox>
            <Checkbox key="moreBOS" value="moreBOS">Более точные BOS</Checkbox>
            <Checkbox key="showHiddenSwings" value="showHiddenSwings">Показывать скрытые точки</Checkbox>
            <Checkbox key="showRobotOB" value="showRobotOB">Показывать ОБ с робота</Checkbox>
            <Checkbox key="newSMT" value="newSMT">Предугадывать SMT</Checkbox>
            {/*<Checkbox key="showFakeouts" value="showFakeouts">Ложные пробои</Checkbox>*/}
            {/*<Checkbox key="excludeTrendSFP" value="excludeTrendSFP">Исключить Fake BOS</Checkbox>*/}
            {/*<Checkbox key="excludeWick" value="excludeWick">Игнорировать пробитие фитилем</Checkbox>*/}
            {/*<Checkbox key="removeInternal" value="removeInternal">Игнорировать внутреннюю структуру</Checkbox>*/}
            {/*<Checkbox key="removeEmpty" value="removeEmpty">Удалить пустые точки</Checkbox>*/}
            {/*<Checkbox key="onlyExtremum" value="onlyExtremum">БОСЫ только на экстремумах</Checkbox>*/}
        </Checkbox.Group>
        <Space style={{alignItems: 'baseline'}}>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
        </Space>
        <Chart lineSerieses={lineSerieses} hideInternalCandles primitives={primitives} markers={markers} data={data}
               ema={[]}/>
    </>;
}

export default SoloTestPage;