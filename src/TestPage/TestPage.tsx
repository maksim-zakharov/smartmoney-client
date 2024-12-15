import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, Divider, Input, Radio, Slider, Space} from "antd";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {Chart} from "./TestChart";
import {calculateEMA} from "../../symbolFuturePairs";
import {
    createRectangle2,
    createSeries,
    fetchCandlesFromAlor,
    fillTrendByMinorData,
    getSecurity,
    notTradingTime,
    refreshToken
} from "../utils";
import {TickerSelect} from "../TickerSelect";
import {TimeframeSelect} from "../TimeframeSelect";
import {
    calculateCrosses,
    calculateFakeout,
    calculateOB, calculatePositionsByFakeouts, calculatePositionsByOrderblocks,
    calculateStructure,
    calculateSwings,
    calculateTrend,
    khrustikCalculateSwings,
    Trend
} from "../samurai_patterns";
import {isBusinessDay, isUTCTimestamp, LineStyle, Time} from "lightweight-charts";
import {DatesPicker} from "../DatesPicker";
import {withErrorBoundary} from "../ErrorBoundary";
import {calculate} from "../sm_scripts";
import {SessionHighlighting} from "../lwc-plugins/session-highlighting";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export const TestPage = () => {
    const [swipType, setSwipType] = useState('samurai');
    const [obType, setOBType] = useState('samurai');
    const [data, setData] = useState([]);
    const [trendData, setTrendData] = useState([]);
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
    const [stopMargin, setStopMargin] = useState(100);
    const [security, setSecurity] = useState();

    const [token, setToken] = useState();

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

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
    
    const {ema, swings, structure, highParts, lowParts, trend, boses, orderBlocks, fakeouts, positions, _data} = useMemo(() => {
        const swipCallback = swipType === 'samurai' ? calculateSwings : khrustikCalculateSwings;
        const _data =tf === trendTF ? data : trendData;
        const ema = calculateEMA(
            _data.map((h) => h.close),
            100
        )[1];

        const swings =swipCallback(_data);
        const {structure, highParts, lowParts} = calculateStructure(swings.highs, swings.lows, _data)

        let trend = [];
        if(tf === trendTF){
            trend = calculateTrend(highParts, lowParts, data, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick).trend;
        } else {
            trend = calculateTrend(highParts, lowParts, data, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick).trend;

            trend = fillTrendByMinorData(trend, trendData, data)
        }

        const boses = calculateCrosses(highParts, lowParts, _data, trend).boses
        const orderBlocks = calculateOB(highParts, lowParts, _data, trend, config.excludeIDM, obType !== 'samurai');
        const fakeouts = calculateFakeout(highParts, lowParts, _data)

        const positions = calculatePositionsByOrderblocks(orderBlocks, _data, maxDiff, multiStop);
        if(config.tradeFakeouts){
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, _data, multiStop);
            positions.push(...fakeoutPositions);
        }

        return {_data, ema, swings, structure, highParts, lowParts, trend, boses, orderBlocks, fakeouts, positions: positions.sort((a, b) => a.openTime - b.openTime)};
    }, [swipType, config.withTrendConfirm, config.excludeTrendSFP, config.tradeFakeouts, config.excludeWick, config.excludeIDM, obType, data, trendData, maxDiff, multiStop])

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

    const {
        topPlots,
        btmPlots,
        markers: oldMarkers,
        itrend
    } = useMemo(() => calculate(_data, markerColors, windowLength), [_data, markerColors, windowLength]);

    const primitives = useMemo(() => {
        const lastCandle = _data[_data.length - 1];
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
                        price: orderBlock.lastImbalanceCandle.low,
                        time: (orderBlock.lastImbalanceCandle || lastCandle).time
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

        if (config.oldTrend) {
            const sessionHighlighter = (time: Time) => {
                const index = _data.findIndex(c => c.time * 1000 === time);
                if (itrend._data[index] > 0) {
                    return 'rgba(20, 131, 92, 0.4)';
                }
                if (itrend._data[index] < 0) {
                    return 'rgba(157, 43, 56, 0.4)';
                }
                if (itrend._data[index] === 0) {
                    return 'gray';
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
    }, [orderBlocks, config.oldTrend, config.smartTrend, itrend, trend, config.imbalances, config.showOB, config.showEndOB, config.imbalances, _data])

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
                time: (s.time) as Time,
                shape: 'text',
                position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                text: "OB"
            })));
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
                // text: marker.text
            })));
            allMarkers.push(...swings.lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })));
        }
        if(config.noDoubleSwing){
            allMarkers.push(...lowParts.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })));
            allMarkers.push(...highParts.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                // text: marker.text
            })))
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
    }, [swings, lowParts, poses, highParts, orderBlocks, config.showOB, config.showPositions, config.showEndOB, config.imbalances, config.swings, config.noDoubleSwing, fakeouts, config.showFakeouts]);

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
        let idms = []
        if(config.smPatterns){
            _lineSerieses.push(...oldMarkers.map(marker => ({
                options: {
                    color: marker.color, // Цвет линии
                    priceLineVisible: false,
                    lastValueVisible: false,
                    lineWidth: 1,
                    lineStyle: LineStyle.LargeDashed,
                },
                data: [
                    {time: marker.fromTime, value: marker.value}, // начальная точка между свечками
                    {time: marker.textTime, value: marker.value}, // начальная точка между свечками
                    {time: marker.toTime, value: marker.value}, // конечная точка между свечками
                ],
                markers: [{
                    color: marker.color,
                    time: marker.textTime,
                    shape: marker.shape,
                    position: marker.position,
                    text: marker.text
                }]

                // if (marker.idmIndex) {
                //     idms.push({
                //         color: marker.color,
                //         time: data[marker.idmIndex].time * 1000,
                //         shape: 'text',
                //         position: marker.position,
                //         text: 'IDM'
                //     })
                // }

                // smPatterns && allMarkers.push(...idms);
            })   ))
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

                // if (marker.idmIndex) {
                //     crossesMarkers.push({
                //         color: marker.color,
                //         time: data[marker.idmIndex].time,
                //         shape: 'text',
                //         position: marker.position,
                //         text: 'IDM'
                //     })
                // }
                return {options, data, markers}
            }));
        }
        return _lineSerieses;
    }, [poses, config.showPositions, config.BOS, boses]);

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
        <Chart maxDiff={maxDiff} lineSerieses={lineSerieses} primitives={primitives} orderBlocks={orderBlocks} markers={markers} trend={trend} multiStop={multiStop} data={_data} ema={ema} windowLength={windowLength} tf={Number(tf)} {...config} />
    </>;
}

export default TestPage;