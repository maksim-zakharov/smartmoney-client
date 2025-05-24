import {Card, Checkbox, Col, Divider, Form, Input, Radio, Row, Slider, Space, Statistic, Table} from "antd";
import {TickerSelect} from "./TickerSelect";
import React, {useEffect, useMemo, useState} from "react";
import FormItem from "antd/es/form/FormItem";
import {TimeframeSelect} from "./TimeframeSelect";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {moneyFormat} from "./MainPage/MainPage.tsx";
import moment from 'moment';
import {calculatePositionsByOrderblocks} from "./samurai_patterns";
import {
    fetchCandlesFromAlor,
    fetchRiskRates,
    getSecurity,
    persision,
    refreshToken,
    uniqueBy
} from "./utils";
import {symbolFuturePairs} from "../symbolFuturePairs";
import {Chart} from "./SoloTestPage/UpdatedChart";
import {DatesPicker} from "./DatesPicker";
import {Link} from "react-router-dom";
import {calculateTesting, POIType} from "./THUltimate/th_ultimate";
import {
    cacheCandles,
    cacheRiskRates,
    cacheSecurity,
    getCachedCandles,
    getCachedRiskRates,
    getCachedSecurity
} from "./cacheService.ts";
import {HistoryObject} from "./THUltimate/th_ultimate.ts";

import {notTradingTime} from "./THUltimate/th_ultimate.ts";

export const MultiTestPage = () => {
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState({});
    const [successSymbols, setSuccessSymbols] = useState<{ current: number, total: number }>({current: 0, total: 0});
    const [allSecurity, setAllSecurity] = useState({});
    const [allRiskRates, setAllRiskRates] = useState({});
    const [data, setData] = useState([]);
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [tradeOBIDM, settradeOBIDM] = useState<boolean>(false);
    const [tradeIDMIFC, settradeIDMIFC] = useState<boolean>(false);
    const [tradeCHoCHWithIDM, settradeCHoCHWithIDM] = useState<boolean>(false);
    const [tradeFlipWithIDM, settradeFlipWithIDM] = useState<boolean>(false);
    const [tradeOBEXT, settradeOBEXT] = useState<boolean>(false);
    const [tradeEXTIFC, settradeEXTIFC] = useState<boolean>(false);
    const [withMove, setwithMove] = useState<boolean>(false);
    const [showFake, setfakeBOS] = useState<boolean>(false);
    const [showSMT, setshowSMT] = useState<boolean>(false);
    const [newSMT, setnewSMT] = useState<boolean>(false);
    const [showHiddenSwings, setshowHiddenSwings] = useState<boolean>(true);
    const [ticker, onSelectTicker] = useState<string>('MTLR');
    const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<"default" | "max">("max");
    const [stopMargin, setStopMargin] = useState<number>(50)
    const [feePercent, setFeePercent] = useState<number>(0.04)
    const [baseTakePercent, setBaseTakePercent] = useState<number>(5)
    const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5)
    const [security, setSecurity] = useState();
    const [riskRates, setRiskRates] = useState();
    const [token, setToken] = useState();
    const fromDate = dayjs().add(-2, "week");
    const toDate = dayjs().endOf('day');
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([fromDate, toDate])

    const positions = useMemo(() => {
        let {swings, orderBlocks} = calculateTesting(data, {
            withMove,
            showHiddenSwings,
            newSMT,
            showFake,
            tradeIDMIFC,
            tradeCHoCHWithIDM,
            tradeFlipWithIDM,
            tradeOBEXT,
            tradeEXTIFC
        });

        const canTradeOrderBlocks = orderBlocks.filter((o) => [POIType.OB_EXT, POIType.EXT_LQ_IFC, POIType.IDM_IFC, POIType.CHOCH_IDM, POIType.FLIP_IDM].includes(o?.type) && (showSMT || !o.isSMT) && o.canTest);

        const lotsize = (security?.lotsize || 1)

        const fee = feePercent / 100

        let positions = calculatePositionsByOrderblocks(data, swings, canTradeOrderBlocks, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent)

        positions = uniqueBy(v => v.openTime, positions);

        const isShortSellPossible = riskRates?.isShortSellPossible || false;
        if (!isShortSellPossible) {
            positions = positions.filter(p => p.side !== 'short');
        }

        return positions.filter(p => Boolean(p.pnl)).map((curr) => {
            const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
            const stopLossMarginPerLot = diff * lotsize
            curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
            const openFee = curr.openPrice * curr.quantity * lotsize * fee;
            const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;

            curr.fee = openFee + closeFee;
            curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee

            curr.timeframe = tf;

            return curr;
        }).filter(s => s.quantity).sort((a, b) => b.openTime - a.openTime);
    }, [data, showFake, newSMT, showHiddenSwings, showSMT, withMove, tradeEXTIFC, tradeCHoCHWithIDM, tradeFlipWithIDM, tradeOBEXT, tradeIDMIFC, tradeOBIDM, feePercent, riskRates, security, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy]);

    const allPositions = useMemo(() => {
        return Object.entries(allData).map(([ticker, data]) => {
            let {swings, orderBlocks} = calculateTesting(data, {
                withMove,
                showHiddenSwings,
                newSMT,
                showFake,
                tradeOBIDM,
                tradeIDMIFC,
                tradeCHoCHWithIDM,
                tradeFlipWithIDM,
                tradeOBEXT,
                tradeEXTIFC
            });

            const canTradeOrderBlocks = orderBlocks.filter((o) => [POIType.OB_EXT, POIType.EXT_LQ_IFC, POIType.IDM_IFC, POIType.CHOCH_IDM, POIType.FLIP_IDM].includes(o?.type) && (showSMT || !o.isSMT) && o.canTest);

            const lotsize = (allSecurity[ticker]?.lotsize || 1)

            const fee = feePercent / 100;

            let positions = calculatePositionsByOrderblocks(data, swings, canTradeOrderBlocks, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent)

            const isShortSellPossible = allRiskRates[ticker]?.isShortSellPossible || false;
            if (!isShortSellPossible) {
                positions = positions.filter(p => p.side !== 'short');
            }

            return positions.filter(p => Boolean(p.pnl)).map((curr) => {
                const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
                const stopLossMarginPerLot = diff * lotsize
                curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
                curr.openVolume = curr.openPrice * curr.quantity * lotsize
                curr.closeVolume = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize
                const openFee = curr.openVolume * fee;
                const closeFee = curr.closeVolume * fee;
                curr.fee = openFee + closeFee;
                curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee;
                curr.ticker = ticker;
                curr.timeframe = tf;
                curr.RR = Math.abs(curr.takeProfit - curr.openPrice) / Math.abs(curr.stopLoss - curr.openPrice);

                return curr;
            });
        }).flat().filter(s => s.quantity).sort((a, b) => b.openTime - a.openTime)
    }, [tradeIDMIFC, tradeCHoCHWithIDM, tradeFlipWithIDM, tradeOBEXT, tradeEXTIFC, tradeOBIDM, showFake, showSMT, newSMT, showHiddenSwings, withMove, allData, feePercent, allRiskRates, allSecurity, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

    const fetchAllTickerCandles = async () => {
        setLoading(true);
        const result = {};
        const result1 = {};
        const result2 = {};
        const stockSymbols = symbolFuturePairs.map(curr => curr.stockSymbol);
        for (let i = 0; i < stockSymbols.length; i++) {
            result[stockSymbols[i]] = await loadData(stockSymbols[i], tf, dates[0].unix(), dates[1].unix()).then(candles => candles.filter(candle => !notTradingTime(candle)));
            if (token)
                result1[stockSymbols[i]] = await loadSecurity(stockSymbols[i], token);
            result2[stockSymbols[i]] = await loadRiskRate(stockSymbols[i]);
            setSuccessSymbols({total: stockSymbols.length * 2, current: i + 1});
        }
        setAllRiskRates(result2)
        setAllSecurity(result1)
        setAllData(result)
        setLoading(false);
    }

    useEffect(() => {
        if (isAllTickers) {
            fetchAllTickerCandles();
        }
    }, [isAllTickers, tf, dates, token])

    const {PnL, profits, losses, fee} = useMemo(() => {
        if (!security) {
            return {
                PnL: 0,
                profits: 0,
                losses: 0,
                fee: 0
            }
        }

        const array = isAllTickers ? allPositions : positions;

        return {
            PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
            fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
            profits: array.filter(p => p.newPnl > 0).length,
            losses: array.filter(p => p.newPnl < 0).length
        };
    }, [isAllTickers, allPositions, positions, security?.lotsize])

    const loadData = async (ticker: string, tf: string, from: number, to: number, useCache: boolean = true): Promise<HistoryObject[]> => {
        let data: HistoryObject[] = [];
        try {
            if (useCache) {
                data = await getCachedCandles(ticker);
            }

            if (!useCache || !data?.length) {
                data = await fetchCandlesFromAlor(ticker, tf, from, to);
                await cacheCandles(ticker, data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return data;
    };

    const loadSecurity = async (ticker: string, token: string, useCache: boolean = true): Promise<any> => {
        let data;
        try {
            if (useCache) {
                data = await getCachedSecurity(ticker);
            }

            if (!useCache || !data) {
                data = await getSecurity(ticker, token);
                await cacheSecurity(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return data;
    };

    const loadRiskRate = async (ticker: string, useCache: boolean = true): Promise<any> => {
        let data;
        try {
            if (useCache) {
                data = await getCachedRiskRates(ticker);
            }

            if (!useCache || !data) {
                data = await fetchRiskRates(ticker);
                await cacheRiskRates(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return data;
    };

    useEffect(() => {
        if (!isAllTickers && ticker) {

            loadData(ticker, tf, dates[0].unix(), dates[1].unix())
                .then(candles => candles.filter(candle => !notTradingTime(candle)))
                .then(setData)
                .finally(() =>
                    setLoading(false)
                );

        }
    }, [isAllTickers, tf, ticker, dates]);

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && loadSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    useEffect(() => {
        loadRiskRate(ticker).then(setRiskRates)
    }, [ticker])

    const minStep = security?.minstep || 0.01;

    const oldOneTickerColumns = [
        isAllTickers && {
            title: 'Ticker',
            dataIndex: 'ticker',
            key: 'ticker',
        }, {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'OpenTime',
            dataIndex: 'openTime',
            key: 'openTime',
            render: (val) => dayjs(val * 1000).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'Open Volume',
            dataIndex: 'openVolume',
            key: 'openVolume',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : minStep), persision(row.ticker ? allSecurity[ticker]?.minstep : minStep))
        },
        {
            title: 'OpenPrice',
            dataIndex: 'openPrice',
            key: 'openPrice',
        },
        {
            title: 'CloseTime',
            dataIndex: 'closeTime',
            key: 'closeTime',
            render: (val) => dayjs(val * 1000).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'Close Volume',
            dataIndex: 'closeVolume',
            key: 'closeVolume',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : minStep), persision(row.ticker ? allSecurity[ticker]?.minstep : minStep))
        },
        {
            title: 'StopLoss',
            dataIndex: 'stopLoss',
            key: 'stopLoss',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : minStep), persision(row.ticker ? allSecurity[ticker]?.minstep : minStep))
        },
        {
            title: 'TakeProfit',
            dataIndex: 'takeProfit',
            key: 'takeProfit',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : minStep), persision(row.ticker ? allSecurity[ticker]?.minstep : minStep))
        },
        {
            title: 'Side',
            dataIndex: 'side',
            key: 'side',
        },
        {
            title: 'PnL',
            dataIndex: 'newPnl',
            key: 'newPnl',
            render: (val) => moneyFormat(val, 'RUB', 2, 2)
        },
        {
            title: 'RR',
            dataIndex: 'RR',
            key: 'RR',
            render: (val) => val?.toFixed(2)
        },
        {
            title: "Действия",
            render: (value, row) => {
                return <Link to={`/new-testing?ticker=${row.ticker || ticker}&tf=${row.timeframe}&tab=orderblocks`}
                             target="_blank">Тестер</Link>;
            }
        }
    ].filter(Boolean);

    const rowClassName = (record: any, index: number) => {
        // Например, подсветим строку, если age == 32
        return record.newPnl < 0 ? 'sell' : 'buy';
    };

    const profitChartData = useMemo(() => {
        const data = isAllTickers ? allPositions : positions;

        return Object.entries(data.reduce((acc, curr) => {
            const date = moment(curr.openTime * 1000).format('YYYY-MM-DD');
            if (!acc[date]) {
                acc[date] = curr.newPnl;
            } else {
                acc[date] += curr.newPnl;
            }
            return acc;
        }, {}))
            .map(([date, PnL]) => ({time: moment(date, 'YYYY-MM-DD').unix(), value: PnL}))
            .sort((a, b) => a.time - b.time)
            .reduce((acc, curr, i) => {
                if (i === 0) {
                    acc = [curr];
                } else {
                    acc.push(({...curr, value: acc[i - 1].value + curr.value}))
                }

                return acc;
            }, []);
    }, [isAllTickers, allPositions, positions])

    return <Form layout="vertical">
        <Divider plain orientation="left">Инструмент</Divider>
        <Row gutter={8}>
            <Col>
                <FormItem label="Тикер">
                    <Space>
                        <Checkbox checked={isAllTickers}
                                  onChange={e => onCheckAllTickers(e.target.checked)}>Все</Checkbox>
                        <TickerSelect value={ticker} disabled={isAllTickers} onSelect={onSelectTicker}/>
                    </Space>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Таймфрейм">
                    <TimeframeSelect value={tf} onChange={onChangeTF}/>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Период">
                    <DatesPicker
                        value={dates}
                        onChange={onChangeRangeDates}/>
                </FormItem>
            </Col>
        </Row>
        <Row gutter={8} align="bottom">
            <Col>
                <FormItem>
                    <Checkbox checked={tradeOBIDM} onChange={e => settradeOBIDM(e.target.checked)}>Торговать
                        OB_IDM</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={tradeIDMIFC} onChange={e => settradeIDMIFC(e.target.checked)}>Торговать
                        IDM_IFC</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={tradeOBEXT} onChange={e => settradeOBEXT(e.target.checked)}>Торговать
                        OBEXT</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={tradeFlipWithIDM} onChange={e => settradeFlipWithIDM(e.target.checked)}>Торговать
                        FlipWithIDM</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={tradeCHoCHWithIDM} onChange={e => settradeCHoCHWithIDM(e.target.checked)}>Торговать
                        CHoCHWithIDM</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={tradeEXTIFC} onChange={e => settradeEXTIFC(e.target.checked)}>Торговать
                        EXT_IFC</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={withMove} onChange={e => setwithMove(e.target.checked)}>Двигать к
                        имбалансу</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={showFake} onChange={e => setfakeBOS(e.target.checked)}>Fake BOS</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={showSMT} onChange={e => setshowSMT(e.target.checked)}>Торговать SMT</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={newSMT} onChange={e => setnewSMT(e.target.checked)}>Предугадывать SMT</Checkbox>
                </FormItem>
            </Col>
            <Col>
                <FormItem>
                    <Checkbox checked={showHiddenSwings} onChange={e => setshowHiddenSwings(e.target.checked)}>Показывать
                        скрытые точки</Checkbox>
                </FormItem>
            </Col>
        </Row>
        <Divider plain orientation="left">Риски и комиссии</Divider>
        <Row gutter={8} align="bottom">
            <Col>
                <FormItem label="Тейк-профит стратегия">
                    <Radio.Group onChange={e => onChangeTakeProfitStrategy(e.target.value)}
                                 value={takeProfitStrategy}>
                        <Radio value="default">Стоп-лосс</Radio>
                        <Radio value="max">Экстремум</Radio>
                    </Radio.Group>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Базовый коэф. тейк-профита">
                    <Slider value={baseTakePercent} disabled={takeProfitStrategy === "max"}
                            onChange={setBaseTakePercent} min={1} step={1} max={20}/>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Max коэф. тейк-профита">
                    <Slider value={maxTakePercent} disabled={takeProfitStrategy === "default"}
                            onChange={setMaxTakePercent} min={0.1} step={0.1} max={1}/>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Риск на сделку">
                    <Input value={stopMargin} onChange={e => setStopMargin(Number(e.target.value))}/>
                </FormItem>
            </Col>
            <Col>
                <FormItem label="Размер комиссии в %">
                    <Slider value={feePercent} onChange={setFeePercent} min={0.01} step={0.01} max={0.4}/>
                </FormItem>
            </Col>
        </Row>
        <Row style={{paddingBottom: '8px'}} gutter={8}>
            <Col span={24}>
                <Chart height={400} showVolume={false} seriesType="Line" lineSerieses={[]} hideInternalCandles
                       primitives={[]} markers={[]} data={profitChartData}
                       ema={[]}/>
            </Col>
        </Row>
        <Row style={{paddingBottom: '8px'}} gutter={8}>
            <Col span={6}>
                <Card bordered={false}>
                    <Statistic
                        title="Общий финрез"
                        value={moneyFormat(PnL, 'RUB', 2, 2)}
                        precision={2}
                        valueStyle={{color: PnL > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false}>
                    <Statistic
                        title="Комиссия"
                        value={moneyFormat(fee, 'RUB', 2, 2)}
                        precision={2}
                        valueStyle={{color: "rgb(255, 117, 132)"}}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false}>
                    <Statistic
                        title="Тейки"
                        value={new Intl.NumberFormat('en-US',
                            {notation: 'compact'}).format(profits)}
                        valueStyle={{color: "rgb(44, 232, 156)"}}
                        suffix={`(${!profits ? 0 : (profits * 100 / (profits + losses)).toFixed(2)})%`}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false}>
                    <Statistic
                        title="Лоси"
                        value={new Intl.NumberFormat('en-US',
                            {notation: 'compact'}).format(losses)}
                        valueStyle={{color: "rgb(255, 117, 132)"}}
                        suffix={`(${!losses ? 0 : (losses * 100 / (profits + losses)).toFixed(2)})%`}
                    />
                </Card>
            </Col>
            {/*<Col span={6}>*/}
            {/*    <Card bordered={false}>*/}
            {/*        <Statistic*/}
            {/*            title="Просадка"*/}
            {/*            value={drawdowns || 0}*/}
            {/*            precision={2}*/}
            {/*            valueStyle={{color: "rgb(255, 117, 132)"}}*/}
            {/*            suffix={`%`}*/}
            {/*        />*/}
            {/*    </Card>*/}
            {/*</Col>*/}
        </Row>
        <Row gutter={8}>
            <Table style={{width: '100%'}} loading={{
                percent: +(successSymbols.current * 100 / successSymbols.total).toFixed(2),
                spinning: loading
            }} rowClassName={rowClassName} size="small"
                   columns={oldOneTickerColumns}
                   dataSource={isAllTickers ? allPositions : positions}/>
        </Row>
    </Form>;
}