import React, {useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {
    Button,
    Checkbox,
    Divider,
    Form,
    Input,
    InputNumber,
    Radio,
    Row,
    Slider,
    SliderSingleProps,
    Space,
    Table
} from "antd";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {Chart} from "./TestChart";
import {
    bosesToLineSerieses,
    fetchCandlesFromAlor,
    fetchRiskRates,
    getSecurity, orderblocksToImbalancePrimitives, orderblocksToOrderblocksPrimitives,
    refreshToken,
    swingsToMarkers
} from "../utils";
import {TickerSelect} from "../TickerSelect";
import {TimeframeSelect} from "../TimeframeSelect";
import {iterationCalculatePositions,} from "../samurai_patterns";
import {isBusinessDay, isUTCTimestamp, LineStyle, Time} from "lightweight-charts";
import {DatesPicker} from "../DatesPicker";
import {SessionHighlighting} from "../lwc-plugins/session-highlighting";
import {calculateTesting} from "../THUltimate/th_ultimate";
import {Security, useOrderblocksQuery} from "../api";
import {LeftOutlined, RightOutlined} from "@ant-design/icons";

import {notTradingTime} from "../THUltimate/utils.ts";
import moment from "moment";
import {moneyFormat} from "../MainPage/MainPage.tsx";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export const SoloTestPage = () => {
    const [env, setEnv] = useState<'dev' | 'prod'>('dev');
    const [offset, setOffset] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState([]);

    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const holdDuration = 500; // 2 секунды

    const checkboxValues = new Set((searchParams.get('checkboxes') || "tradeOB,BOS,swings,showEndOB,limitOrderTrade,newSMT").split(','));
    const setCheckboxValues = (values) => {
        searchParams.set('checkboxes', values.join(','));
        setSearchParams(searchParams)
    }

    const [windowLength, setWindowLength] = useState(5);
    const [maxDiff, setMaxDiff] = useState(1);
    const [multiStop, setMultiStop] = useState(5);
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '300';
    const fromDate = searchParams.get('fromDate') || dayjs('2024-10-01T00:00:00Z').startOf('day').unix();
    const toDate = searchParams.get('toDate') || dayjs('2025-10-01T00:00:00Z').endOf('day').unix();
    const [stopMargin, setStopMargin] = useState(50);
    const [stopPaddingPercent, setstopPaddingPercent] = useState(0);
    const [security, setSecurity] = useState<Security>();

    const [riskRate, setRiskRate] = useState();

    const isShortSellPossible = riskRate?.isShortSellPossible || false;

    const [token, setToken] = useState();

    const {data: robotOB = []} = useOrderblocksQuery({symbol: ticker, tf, from: fromDate, to: toDate});

    const config = useMemo(() => ({
        swings: checkboxValues.has('swings'),
        noInternal: checkboxValues.has('noInternal'),
        smartTrend: checkboxValues.has('smartTrend'),
        withTrendConfirm: checkboxValues.has('withTrendConfirm'),
        onlyExtremum: checkboxValues.has('onlyExtremum'),
        removeEmpty: checkboxValues.has('removeEmpty'),
        BOS: checkboxValues.has('BOS'),
        showOB: checkboxValues.has('showOB'),
        showSMT: checkboxValues.has('showSMT'),
        showEndOB: checkboxValues.has('showEndOB'),
        imbalances: checkboxValues.has('imbalances'),
        showPositions: checkboxValues.has('showPositions'),
        limitOrderTrade: checkboxValues.has('limitOrderTrade'),
        tradeOB: checkboxValues.has('tradeOB'),
        tradeOBIDM: checkboxValues.has('tradeOBIDM'),
        tradeIDMIFC: checkboxValues.has('tradeIDMIFC'),
        excludeWick: checkboxValues.has('excludeWick'),
        withMove: checkboxValues.has('withMove'),
        newSMT: checkboxValues.has('newSMT'),
        showFake: checkboxValues.has('showFake'),
        showHiddenSwings: checkboxValues.has('showHiddenSwings'),
        showRobotOB: checkboxValues.has('showRobotOB'),
        showIFC: checkboxValues.has('showIFC'),
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
        searchParams.set('fromDate', value[0].startOf('day').unix());
        searchParams.set('toDate', value[1].endOf('day').unix());
        setSearchParams(searchParams);
    }

    const {swings, trend, boses, orderBlocks, positions} = useMemo(() => {
        let {swings, trend, boses, orderBlocks} = calculateTesting(offset >= 0 ? data.slice(0, data.length - offset) : data.slice(-offset, data.length), config);

        let positions = [];

        if (config.tradeOB) {
            const fakeoutPositions = iterationCalculatePositions(data, swings as any, orderBlocks, maxDiff, multiStop, config.limitOrderTrade, stopPaddingPercent);
            positions.push(...fakeoutPositions);
        }

        if (!isShortSellPossible) {
            positions = positions.filter(p => p.side !== 'short');
        }

        return {swings, trend, boses, orderBlocks, positions: positions.sort((a, b) => a.openTime - b.openTime)};
    }, [offset, isShortSellPossible, stopPaddingPercent, config.showIFC, config.showFake, config.newSMT, config.showHiddenSwings, config.withMove, config.removeEmpty, config.onlyExtremum, config.tradeIDMIFC, config.tradeOBIDM, config.tradeOB, config.tradeIFC, config.limitOrderTrade, config.withTrendConfirm, config.tradeFakeouts, config.excludeWick, data, maxDiff, multiStop])
console.log(positions)
    const robotEqualsPercent = useMemo(() => {
        if (!config.showRobotOB || !robotOB.length) {
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
        if (!security) {
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
        if (config.showOB || config.showEndOB || config.imbalances) {
            const checkShow = (ob) => {
                let result = false;
                if (!ob) {
                    return false;
                }
                if (config.showOB && !Boolean(ob.endCandle)) {
                    result = true;
                }
                if (config.showEndOB && Boolean(ob.endCandle)) {
                    result = true;
                }
                if (ob.isSMT && !config.showSMT) {
                    result = false;
                }
                return result;
            }
            if (config.imbalances) {
                _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, checkShow, lastCandle));
                if (config.showRobotOB)
                    _primitives.push(...orderblocksToImbalancePrimitives(robotOB, checkShow, lastCandle));
            }
            if (config.showRobotOB)
                _primitives.push(...orderblocksToOrderblocksPrimitives(robotOB, checkShow, lastCandle));
            _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, checkShow, lastCandle));
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
    }, [robotOB, config.showRobotOB, orderBlocks, config.smartTrend, trend, config.imbalances, config.showSMT, config.showOB, config.showEndOB, config.imbalances, data])

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
        if (config.showOB || config.showEndOB || config.imbalances) {
            const checkShow = (ob) => {
                let result = false;
                if (!ob) {
                    return false;
                }
                if (config.showOB && !Boolean(ob.endCandle)) {
                    result = true;
                }
                if (config.showEndOB && Boolean(ob.endCandle)) {
                    result = true;
                }
                if (ob.isSMT && !config.showSMT) {
                    result = false;
                }
                return result;
            }
            allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
                color: s.side === 'low' ? markerColors.bullColor : markerColors.bearColor,
                time: (s.textTime || s.time) as Time,
                shape: 'text',
                position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                text: s.text
            })));

            if (config.showRobotOB) {
                allMarkers.push(...robotOB.filter(checkShow).map(s => ({
                    color: s.type === 'low' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.textTime || s.time) as Time,
                    shape: 'text',
                    position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                    text: s.text
                })));
            }
        }
        if (config.swings) {
            allMarkers.push(...swingsToMarkers(swings))
        }

        if (config.showPositions) {
            allMarkers.push(...poses.flat())
        }

        return allMarkers;
    }, [swings, poses, config.showRobotOB, robotOB, orderBlocks, config.showSMT, config.showOB, config.showPositions, config.showEndOB, config.imbalances, config.swings]);

    const lineSerieses = useMemo(() => {
        const _lineSerieses = [];
        if (config.showPositions) {
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
        if (config.BOS) {
            _lineSerieses.push(...bosesToLineSerieses(boses));
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

    const handleMouseDown = (func) => {
        holdTimerRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                // Ваша цикличная логика здесь
                func();
            }, 50);
        }, holdDuration);
    }

    const handleMouseUp = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    const historyColumns = [
        {
            title: "Паттерн",
            dataIndex: "name",
            key: "name"
        },
        {
            title: "Тип",
            dataIndex: "side",
            key: "side",
            render: (value, row) => row?.side || "-"
        },
        {
            title: "Время входа",
            dataIndex: "openTime",
            key: "openTime",
            // colSpan: 2,
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 4 : 1,
            }),
            render: (value, row) => moment(row?.openTime * 1000).format('YYYY-MM-DD HH:mm')
        },
        {
            title: "Стоп цена",
            dataIndex: "stopLoss",
            key: "stopLoss",
            render: (value, row) => {
                const percent = row.openPrice > row?.stopLoss ? row.openPrice / row?.stopLoss : row?.stopLoss / row.openPrice

                return `${row?.stopLoss} (${((percent - 1) * 100).toFixed(2)}%)`;
            }
        },
        {
            title: "Тейк цена",
            dataIndex: "takeProfit",
            key: "takeProfit",
            render: (value, row) => {
                const percent = row.openPrice > row?.takeProfit ? row.openPrice / row?.takeProfit : row?.takeProfit / row.openPrice

                return `${row?.takeProfit} (${((percent - 1) * 100).toFixed(2)}%)`;
            }
        },
        {
            title: "Время выхода",
            dataIndex: "closeTime",
            key: "closeTime",
            // colSpan: 2,
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 4 : 1,
            }),
            render: (value, row) => moment(row?.closeTime * 1000).format('YYYY-MM-DD HH:mm')
        },
        {
            title: "Финрез",
            dataIndex: "pnl",
            key: "pnl",
            align: "right",
            render: (value, row) => row.pnl ? moneyFormat(row.pnl * row.quantity * security?.lotsize, "RUB", 2, 2) : "-"
        },
    ].filter(Boolean);

    return <>
        <Divider plain orientation="left">Риски</Divider>
        <Space>
            <Row>
                <Form.Item label="Риск на сделку">
                    <Input style={{width: 80}} value={stopMargin}
                           onChange={(e) => setStopMargin(Number(e.target.value))}/>
                </Form.Item>
                <Form.Item label="Отступ стопа в %">
                    <InputNumber style={{width: 80}} value={stopPaddingPercent}
                                 onChange={(e) => setstopPaddingPercent(Number(e))}/>
                </Form.Item>
                <Form.Item label="Risk Rate">
                    <Slider style={{width: 200}} marks={marksRR} defaultValue={multiStop} onChange={setMultiStop}
                            min={1} max={10} step={1}/>
                </Form.Item>
                <Form.Item label="Percent Rate">
                    <Slider style={{width: 200}} defaultValue={maxDiff} marks={marksPR} onChange={setMaxDiff} min={0}
                            max={1} step={0.1}/>
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
        <Checkbox.Group onChange={setCheckboxValues} value={Array.from(checkboxValues)}>
            <Checkbox key="swings" value="swings">Swings</Checkbox>
            <Checkbox key="smartTrend" value="smartTrend">Умный тренд</Checkbox>
            <Checkbox key="BOS" value="BOS">Структуры</Checkbox>
            <Checkbox key="showSMT" value="showSMT">Показывать SMT</Checkbox>
            <Checkbox key="showOB" value="showOB">Актуальные OB</Checkbox>
            <Checkbox key="showEndOB" value="showEndOB">Отработанные OB</Checkbox>
            <Checkbox key="imbalances" value="imbalances">Имбалансы</Checkbox>
            <Checkbox key="showPositions" value="showPositions">Сделки</Checkbox>
            <Checkbox key="tradeOB" value="tradeOB">Торговать OB</Checkbox>
            <Checkbox key="tradeOBIDM" value="tradeOBIDM">Торговать OB_IDM</Checkbox>
            <Checkbox key="tradeIDMIFC" value="tradeIDMIFC">Торговать IDM_IFC</Checkbox>
            <Checkbox key="limitOrderTrade" value="limitOrderTrade">Торговать лимитками</Checkbox>
            <Checkbox key="withMove" value="withMove">Двигать Имбаланс</Checkbox>
            <Checkbox key="showHiddenSwings" value="showHiddenSwings">Показывать скрытые точки</Checkbox>
            <Checkbox key="showRobotOB" value="showRobotOB">Показывать ОБ с робота</Checkbox>
            <Checkbox key="newSMT" value="newSMT">Предугадывать SMT</Checkbox>
            <Checkbox key="showFake" value="showFake">Fake BOS</Checkbox>
        </Checkbox.Group>
        {offset}
        {data.length}
        <Space style={{alignItems: 'baseline'}}>
            <TickerSelect value={ticker} onSelect={onSelectTicker}/>
            <TimeframeSelect value={tf} onChange={setSize}/>
            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                         onChange={onChangeRangeDates}/>
            <Button onClick={() => setOffset(prev => prev = data.length - 2)}>Начало</Button>
            <Button style={{display: 'block'}} icon={<LeftOutlined/>} onMouseDown={() => handleMouseDown(() => setOffset(prev => prev += 1))} onMouseUp={handleMouseUp} onClick={() => setOffset(prev => prev += 1)}/>
            <Button style={{display: 'block'}} icon={<RightOutlined/>}
                    onMouseDown={() => handleMouseDown(() => setOffset(prev => prev -= 1))} onMouseUp={handleMouseUp}
                    onClick={() => setOffset(prev => prev -= 1)}/>
            <Radio.Group value={env} onChange={(e) => setEnv(e.target.value)}>
                <Radio.Button value="dev">Development</Radio.Button>
                <Radio.Button value="prod">Production</Radio.Button>\
            </Radio.Group>
        </Space>
        <Chart lineSerieses={lineSerieses} hideInternalCandles primitives={primitives} markers={markers}
               data={data.map((d, i, array) => (offset >=0 && i >= array.length - 1 - offset) || (offset < 0 && i <= -offset) ?
                   {
                       ...d, borderColor: "rgba(44,60,75, 1)",
                       wickColor: "rgba(44,60,75, 1)",

                       color: 'rgba(0, 0, 0, 0)'
                   } : d)}
               ema={[]}/>
        <Table size="small" dataSource={positions} columns={historyColumns as any}
               pagination={{
                   pageSize: 10,
               }}
               onRow={(record) => {
                   return {
                       style: record.pnl < 0 ? {
                           backgroundColor: "#d1261b66",
                           color: "rgb(255, 117, 132)"
                       } : record.pnl > 0 ? {
                           backgroundColor: "#15785566",
                           color: "rgb(44, 232, 156)"
                       } : undefined,
                       className: "hoverable",
                   };
               }}/>
    </>;
}

export default SoloTestPage;