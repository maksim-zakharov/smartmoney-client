import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, Divider, Form, Input, Radio, Row, Slider, SliderSingleProps, Space} from "antd";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {Chart} from "./TestChart";
import {calculateEMA} from "../../symbolFuturePairs";
import {
    createRectangle2,
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
    calculateOB,
    calculatePositionsByFakeouts, calculatePositionsByIFC,
    calculatePositionsByOrderblocks,
    calculateStructure,
    calculateSwings,
    calculateTrend,
    khrustikCalculateSwings,
    tradinghubCalculateSwings,
    tradinghubCalculateTrendNew, tradinghubCalculateTrendNew2,
} from "../samurai_patterns";
import {isBusinessDay, isUTCTimestamp, LineStyle, Time} from "lightweight-charts";
import {DatesPicker} from "../DatesPicker";
import {calculate} from "../sm_scripts";
import {SessionHighlighting} from "../lwc-plugins/session-highlighting";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

enum StrategySource {
    TradingHub = 'tradinghub',
    Dobrunia = 'dobrunia',
    Khrustik = 'khrustik',
}

export const TestPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [swipType, setSwipType] = useState(StrategySource.TradingHub);
    const [structureType, setStructureType] = useState(StrategySource.TradingHub);
    const [obType, setOBType] = useState(StrategySource.Dobrunia);
    const [data, setData] = useState([]);

    const trandsType = searchParams.get('trandsType') || StrategySource.TradingHub;
    const setTrandsType = (values) => {
        searchParams.set('trandsType', values);
        setSearchParams(searchParams)
    }

    const checkboxValues = (searchParams.get('checkboxes') || "tradeOB,BOS,swings").split(',');
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

    const [token, setToken] = useState();

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    useEffect(() => {
            fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData);

    }, [tf, ticker, fromDate, toDate]);

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
        tradeIFC: checkboxValues.includes('tradeIFC'),
        limitOrderTrade: checkboxValues.includes('limitOrderTrade'),
        tradeOB: checkboxValues.includes('tradeOB'),
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
    
    const {ema, swings, structure, highParts, lowParts, trend, boses, orderBlocks, fakeouts, positions} = useMemo(() => {
        const swipsMap = {
            'samurai':calculateSwings,
            [StrategySource.Khrustik]: khrustikCalculateSwings,
            [StrategySource.TradingHub] : tradinghubCalculateSwings
        }
        const swipCallback = swipsMap[swipType]  || calculateSwings;
        const ema = calculateEMA(
            data.map((h) => h.close),
            100
        )[1];

        let {highs, lows, swings: _swings} =swipCallback(data);
        const {structure, highParts, lowParts} = calculateStructure(highs, lows, data)

        let trend = [];
        let boses = [];
        let orderBlocks = [];
        if(trandsType === StrategySource.TradingHub){
            const {trend: thTrend, boses: thBoses, swings: thSwings} = tradinghubCalculateTrendNew(_swings, data);
            _swings = thSwings;
            highs = thSwings.filter(t => t?.side === 'high');
            lows = thSwings.filter(t => t?.side === 'low');
            trend = thTrend;
            boses = thBoses;
            orderBlocks = calculateOB(highParts, lowParts, data, trend, config.excludeIDM, obType !== 'samurai');
        } else if(trandsType === StrategySource.Dobrunia){
            const {trend: thTrend, boses: thBoses, swings: thSwings, orderBlocks: thOrderBlocks} = tradinghubCalculateTrendNew2(_swings, data, obType !== 'samurai');
            _swings = thSwings;
            highs = thSwings.filter(t => t?.side === 'high');
            lows = thSwings.filter(t => t?.side === 'low');
            trend = thTrend;
            boses = thBoses;
            orderBlocks = thOrderBlocks;
        } else {
            trend = calculateTrend(highParts, lowParts, data, config.withTrendConfirm, config.excludeTrendSFP, config.excludeWick).trend;
            boses = calculateCrosses(highParts, lowParts, data, trend).boses;
            orderBlocks = calculateOB(highParts, lowParts, data, trend, config.excludeIDM, obType !== 'samurai');
        }

        const fakeouts = calculateFakeout(highParts, lowParts, data)

        const positions = [];

        if(config.tradeOB){
            const fakeoutPositions = calculatePositionsByOrderblocks(orderBlocks, data, maxDiff, multiStop, config.limitOrderTrade);
            positions.push(...fakeoutPositions);
        }
        if(config.tradeFakeouts){
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, multiStop);
            positions.push(...fakeoutPositions);
        }
        if(config.tradeIFC){
            const fakeoutPositions = calculatePositionsByIFC(data, _swings, maxDiff, multiStop);
            positions.push(...fakeoutPositions);
        }

        return { ema, swings: {highs, lows}, structure, highParts, lowParts, trend, boses, orderBlocks, fakeouts, positions: positions.sort((a, b) => a.openTime - b.openTime)};
    }, [swipType, trandsType, structureType, config.tradeOB, config.tradeIFC, config.limitOrderTrade, config.withTrendConfirm, config.excludeTrendSFP, config.tradeFakeouts, config.excludeWick, config.excludeIDM, obType, data, maxDiff, multiStop])

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



    // const {trend: newTrend} = calculateTrend(highParts, lowParts, data, withTrendConfirm, excludeTrendSFP);
    // const breakingBlocks: any[] = calculateBreakingBlocks(boses, data);
    // let orderBlocks = calculateOB(highParts, lowParts, data, newTrend, excludeIDM, withMove);

    // if(excludeIDM){
    //     const idmIndexes = boses.filter(bos => bos.text === 'IDM').map(bos => bos.from.index)
    //     orderBlocks = orderBlocks.filter(ob => !idmIndexes.includes(ob.index))
    // }

//             breakingBlocks.filter(Boolean).forEach(marker => {
//                 const color = marker.type === 'high' ? markerColors.bullColor: markerColors.bearColor
//                 const lineSeries = chart.addLineSeries({
//                     color, // Цвет линии
//                     priceLineVisible: false,
//                     lastValueVisible: false,
//                     lineWidth: 1,
//                     lineStyle: LineStyle.LargeDashed,
//                 });
// // 5. Устанавливаем данные для линии
//                 lineSeries.setData([
//                     {time: marker.fromTime * 1000 as Time, value: marker.price}, // начальная точка между свечками
//                     {time: marker.textCandle.time * 1000 as Time, value: marker.price}, // конечная точка между свечками
//                     {time: marker.toTime * 1000 as Time, value: marker.price}, // конечная точка между свечками
//                 ]);
//
//                 lineSeries.setMarkers([{
//                     color,
//                     time: (marker.textCandle.time * 1000) as Time,
//                     shape: 'text',
//                     position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
//                     text: marker.text
//                 }] as any)
//
//                 // if (marker.idmIndex) {
//                 //     crossesMarkers.push({
//                 //         color: marker.color,
//                 //         time: data[marker.idmIndex].time * 1000,
//                 //         shape: 'text',
//                 //         position: marker.position,
//                 //         text: 'IDM'
//                 //     })
//                 // }
//             })

    // if (noInternal) {

        // allMarkers.push(...filteredExtremums.filter(Boolean).map(s => ({
        //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
        //     time: (s.time * 1000) as Time,
        //     shape: 'circle',
        //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
        //     // text: marker.text
        // })));
    // }


    // smPatterns && [...topPlots.filter(Boolean).map(v => ({
    //     ...v,
    //     position: 'aboveBar',
    //     text: v.isCHoCH ? 'IDM' : 'BOS',
    //     color: markerColors.bullColor
    // })),
    //     ...btmPlots.filter(Boolean).map(v => ({
    //         ...v,
    //         position: 'belowBar',
    //         text: v.isCHoCH ? 'IDM' : 'BOS',
    //         color: markerColors.bearColor
    //     }))
    // ].forEach(plot => {
    //     const lineSeries = chart.addLineSeries({
    //         color: plot.color, // Цвет линии
    //         priceLineVisible: false,
    //         lastValueVisible: false,
    //         lineWidth: 1,
    //         lineStyle: LineStyle.LargeDashed,
    //     });
    //
    //     const textIndex = plot.to - Math.floor((plot.to - plot.from) / 2);
    //
    //     const fromCandle = data[plot.from];
    //     const toCandle = data[plot.to];
    //     const textCandle = data[textIndex];
    //
    //     lineSeries.setData([
    //         {time: fromCandle.time * 1000, value: plot.price}, // начальная точка между свечками
    //         {time: textCandle.time * 1000, value: plot.price}, // начальная точка между свечками
    //         {time: toCandle.time * 1000, value: plot.price}, // конечная точка между свечками
    //     ]);
    //
    //     lineSeries.setMarkers([{
    //         color: plot.color,
    //         time: textCandle.time * 1000,
    //         shape: 'text',
    //         position: plot.position,
    //         text: plot.text
    //     }])
    // })

    const {
        topPlots,
        btmPlots,
        markers: oldMarkers,
        itrend
    } = useMemo(() => calculate(data, markerColors, windowLength), [data, markerColors, windowLength]);

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
                const index = data.findIndex(c => c.time * 1000 === time);
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
    }, [orderBlocks, config.oldTrend, config.smartTrend, itrend, trend, config.imbalances, config.showOB, config.showEndOB, config.imbalances, data])

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
                text: s.text
            })));
            allMarkers.push(...swings.lows.filter(Boolean).map(s => ({
                color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.time) as Time,
                shape: 'circle',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.text
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
        <Space style={{alignItems: 'baseline'}}>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
            <Divider plain orientation="left" type="vertical"/>

            <Row>
                <Form.Item label="Свипы">
                    <Radio.Group onChange={e => setSwipType(e.target.value)}
                                 value={swipType}>
                        <Radio value={StrategySource.TradingHub}>{StrategySource.TradingHub}</Radio>
                        {/*<Radio value="samurai">самурай</Radio>*/}
                        {/*<Radio value="khrustik">хрустик</Radio>*/}
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Тренд">
                    <Radio.Group onChange={e => setTrandsType(e.target.value)}
                                 value={trandsType}>
                        <Radio value={StrategySource.TradingHub}>{StrategySource.TradingHub}</Radio>
                        <Radio value={StrategySource.Dobrunia}>{StrategySource.Dobrunia}</Radio>
                        {/*<Radio value="samurai">самурай</Radio>*/}
                        <Radio value={StrategySource.Khrustik}>{StrategySource.Khrustik}</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Босы">
                    <Radio.Group onChange={e => setStructureType(e.target.value)}
                                 value={structureType}>
                        <Radio value={StrategySource.TradingHub}>{StrategySource.TradingHub}</Radio>
                        {/*<Radio value="samurai">самурай</Radio>*/}
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="ОБ">
                    <Radio.Group onChange={e => setOBType(e.target.value)}
                                 value={obType}>
                        {/*<Radio value="samurai">самурай</Radio>*/}
                        <Radio value={StrategySource.Dobrunia}>{StrategySource.Dobrunia}</Radio>
                    </Radio.Group>
                </Form.Item>
            </Row>
        </Space>
        <Divider plain orientation="left">Риски</Divider>
        <Space>
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
            </Space>
        </Space>
        <Slider defaultValue={windowLength} onChange={setWindowLength}/>
        <Checkbox.Group onChange={setCheckboxValues} value={checkboxValues}>
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
            <Checkbox key="tradeOB" value="tradeOB">Торговать OB</Checkbox>
            <Checkbox key="limitOrderTrade" value="limitOrderTrade">Торговать лимитками</Checkbox>
            <Checkbox key="tradeIFC" value="tradeIFC">Торговать IFC</Checkbox>
            <Checkbox key="showFakeouts" value="showFakeouts">Ложные пробои</Checkbox>
            <Checkbox key="excludeIDM" value="excludeIDM">Исключить IDM</Checkbox>
            <Checkbox key="excludeTrendSFP" value="excludeTrendSFP">Исключить Fake BOS</Checkbox>
            <Checkbox key="excludeWick" value="excludeWick">Игнорировать пробитие фитилем</Checkbox>
        </Checkbox.Group>
        <Chart lineSerieses={lineSerieses} hideInternalCandles primitives={primitives} markers={markers} data={data}
               ema={ema}/>
    </>;
}

export default TestPage;