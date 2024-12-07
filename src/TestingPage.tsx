import {
    Card,
    Checkbox,
    Col,
    DatePicker,
    Form,
    Input,
    Radio,
    Row,
    Slider,
    Space,
    Statistic,
    Table,
    TimeRangePickerProps
} from "antd";
import {TickerSelect} from "./TickerSelect";
import React, {useEffect, useMemo, useState} from "react";
import FormItem from "antd/es/form/FormItem";
import {TimeframeSelect} from "./TimeframeSelect";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {moneyFormat} from "./MainPage";
import {
    calculateCrosses, calculateFakeout,
    calculateOB, calculatePositionsByFakeouts,
    calculatePositionsByOrderblocks,
    calculateStructure,
    calculateSwings,
    calculateTrend
} from "./samurai_patterns";
import {calculateDrawdowns, fetchCandlesFromAlor, getSecurity, notTradingTime, persision, refreshToken} from "./utils";
import {symbolFuturePairs} from "../symbolFuturePairs";

const {RangePicker} = DatePicker;

export const TestingPage = () => {
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState({});
    const [allSecurity, setAllSecurity] = useState({});
    const [data, setData] = useState([]);
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [excludeIDM, setExcludeIDM] = useState<boolean>(false);
    const [confirmTrend, setConfirmTrend] = useState<boolean>(false);
    const [tradeFakeouts, setTradeFakeouts] = useState<boolean>(false);
    const [ticker, onSelectTicker] = useState<string>('MTLR');
    const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<"default" | "max">("default");
    const [stopMargin, setStopMargin] = useState<number>(50)
    const [feePercent, setFeePercent] = useState<number>(0.04)
    const [baseTakePercent, setBaseTakePercent] = useState<number>(5)
    const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5)
    const [security, setSecurity] = useState();
    const [token, setToken] = useState();
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([dayjs('2024-10-01T00:00:00Z'), dayjs('2025-10-01T00:00:00Z')])

    const positions = useMemo(() => {
        const {swings: swingsData, highs, lows} = calculateSwings(data);
        const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);
        const {trend: newTrend} = calculateTrend(highParts, lowParts, data, confirmTrend);
        let orderBlocks = calculateOB(highParts, lowParts, data, newTrend, excludeIDM);
        if(excludeIDM){
            // const {boses} = calculateCrosses(highParts, lowParts, data, newTrend)
            // const idmIndexes = boses.filter(bos => bos.text === 'IDM').map(bos => bos.from.index)
            // orderBlocks = orderBlocks.filter(ob => !idmIndexes.includes(ob.index))
        }

        const lotsize = (security?.lotsize || 1)

        const fee = feePercent / 100

        const positions = calculatePositionsByOrderblocks(orderBlocks, data, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent)
        if(tradeFakeouts){
            const fakeouts = calculateFakeout(highParts, lowParts, data)
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, baseTakePercent);
            positions.push(...fakeoutPositions);
        }

        return positions.map((curr) => {
            const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
            const stopLossMarginPerLot = diff * lotsize
            curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
            const openFee = curr.openPrice * curr.quantity * lotsize * fee;
            const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;

            curr.fee = openFee + closeFee;
            curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee;

            return curr;
        }).filter(s => s.quantity).sort((a, b) => b.closeTime - a.closeTime);
    }, [data, tradeFakeouts, confirmTrend, excludeIDM, feePercent, security, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

    const allPositions = useMemo(() => {
        return Object.entries(allData).map(([ticker, data]) => {
            const {swings: swingsData, highs, lows} = calculateSwings(data);
            const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);
            const {trend: newTrend} = calculateTrend(highParts, lowParts, data, confirmTrend);
            let orderBlocks = calculateOB(highParts, lowParts, data, newTrend, excludeIDM);
            if(excludeIDM){
                // const {boses} = calculateCrosses(highParts, lowParts, data, newTrend)
                // const idmIndexes = boses.filter(bos => bos.text === 'IDM').map(bos => bos.from.index)
                // orderBlocks = orderBlocks.filter(ob => !idmIndexes.includes(ob.index))
            }

            const lotsize = (allSecurity[ticker]?.lotsize || 1)

            const fee = feePercent / 100;

            const positions = calculatePositionsByOrderblocks(orderBlocks, data, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent)
            if(tradeFakeouts){
                const fakeouts = calculateFakeout(highParts, lowParts, data)
                const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, baseTakePercent);
                positions.push(...fakeoutPositions);
            }

            return positions.map((curr) => {
                const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
                const stopLossMarginPerLot = diff * lotsize
                curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
                const openFee = curr.openPrice * curr.quantity * lotsize * fee;
                const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;
                curr.fee = openFee + closeFee;
                curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee;
                curr.ticker = ticker;

                return curr;
            });
        }).flat().filter(s => s.quantity).sort((a, b) => b.closeTime - a.closeTime)
    }, [excludeIDM, tradeFakeouts, confirmTrend, allData, feePercent, allSecurity, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

    const fetchAllTickerCandles = async () => {
        setLoading(true);
        const result = {};
        const result1 = {};
        const stockSymbols = symbolFuturePairs.map(curr => curr.stockSymbol);
        for (let i = 0; i < stockSymbols.length; i++) {
            result[stockSymbols[i]] = await fetchCandlesFromAlor(stockSymbols[i], tf, dates[0].unix(), dates[1].unix()).then(candles => candles.filter(candle => !notTradingTime(candle)));
            if(token)
            result1[stockSymbols[i]] = await getSecurity(stockSymbols[i], token);
        }
        setAllSecurity(result1)
        setAllData(result)
        setLoading(false);
    }

    useEffect(() => {
        if(isAllTickers){
            fetchAllTickerCandles();
        }
    }, [isAllTickers, tf, dates, token])

    const {PnL, profits, losses, fee} = useMemo(() => {
        if(!security){
            return {
                PnL: 0,
                profits: 0,
                losses: 0,
                fee: 0
            }
        }

        const array = isAllTickers? allPositions : positions;

        return {
            PnL: array.reduce((acc, curr) => acc + curr.newPnl, 0),
            fee: array.reduce((acc, curr) => acc + curr.fee, 0),
            profits: array.filter(p => p.newPnl > 0).length,
            losses: array.filter(p => p.newPnl < 0).length
        };
    }, [isAllTickers, allPositions, positions, security?.lotsize])

    useEffect(() => {
        !isAllTickers && ticker && fetchCandlesFromAlor(ticker, tf, dates[0].unix(), dates[1].unix()).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData).finally(() =>
            setLoading(false));
    }, [isAllTickers, tf, ticker, dates]);

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    const rangePresets: TimeRangePickerProps['presets'] = [
        { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
        { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
        { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
        { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
        { label: 'Последние 182 дня', value: [dayjs().add(-182, 'd'), dayjs()] },
        { label: 'Последние 365 дней', value: [dayjs().add(-365, 'd'), dayjs()] },
    ];

    const oldOneTickerColumns = [
        isAllTickers && {
            title: 'Ticker',
            dataIndex: 'ticker',
            key: 'ticker',
        },
        {
            title: 'OpenTime',
            dataIndex: 'openTime',
            key: 'openTime',
            render: (val) => dayjs(val * 1000).format('DD.MM.YYYY HH:mm')
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
            title: 'StopLoss',
            dataIndex: 'stopLoss',
            key: 'stopLoss',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : security?.minstep), persision(row.ticker ? allSecurity[ticker]?.minstep : security?.minstep))
        },
        {
            title: 'TakeProfit',
            dataIndex: 'takeProfit',
            key: 'takeProfit',
            render: (val, row) => moneyFormat(val, 'RUB', persision(row.ticker ? allSecurity[ticker]?.minstep : security?.minstep), persision(row.ticker ? allSecurity[ticker]?.minstep : security?.minstep))
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
    ].filter(Boolean);

    const rowClassName = (record: any, index: number) => {
        // Например, подсветим строку, если age == 32
        return record.newPnl < 0 ? 'sell' : 'buy';
    };

    return <div style={{width: 'max-content', minWidth: "1800px"}}>
        <Form layout="vertical">
            <Row gutter={8}>
                <Col>
                    <FormItem label="Тикер">
                        <Space>
                            <Checkbox value={isAllTickers}
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
                        <RangePicker
                            presets={rangePresets}
                            value={dates}
                            format="YYYY-MM-DD"
                            onChange={onChangeRangeDates}/>
                    </FormItem>
                </Col>
            </Row>
            <Row gutter={8} align="bottom">
                <Col>
                    <FormItem label="Тейк-профит стратегия">
                        <Radio.Group onChange={e => onChangeTakeProfitStrategy(e.target.value)} value={takeProfitStrategy}>
                            <Radio value="default">Стоп-лосс</Radio>
                            <Radio value="max">Экстремум</Radio>
                        </Radio.Group>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox value={excludeIDM} onChange={e => setExcludeIDM(e.target.checked)}>Исключить IDM</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox value={confirmTrend} onChange={e => setConfirmTrend(e.target.checked)}>Подтвержденный тренд</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox value={tradeFakeouts} onChange={e => setTradeFakeouts(e.target.checked)}>Ложные пробои</Checkbox>
                    </FormItem>
                </Col>
            </Row>
            <Row gutter={8} align="bottom">
                <Col>
                    <FormItem label="Базовый коэф. тейк-профита">
                        <Slider value={baseTakePercent} disabled={takeProfitStrategy === "max"} onChange={setBaseTakePercent} min={1} step={1} max={20}/>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Max коэф. тейк-профита">
                        <Slider value={maxTakePercent} disabled={takeProfitStrategy === "default"} onChange={setMaxTakePercent} min={0.1} step={0.1} max={1}/>
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
            <Row gutter={8}>
                <Col span={12} style={{display: 'none'}}>
                    <FormItem label="Old Dobrynia">
                        <Row gutter={8}>
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
                                        value={profits}
                                        valueStyle={{color: "rgb(44, 232, 156)"}}
                                        suffix={`(${!profits ? 0 : (profits * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Лоси"
                                        value={losses}
                                        valueStyle={{color: "rgb(255, 117, 132)"}}
                                        suffix={`(${!losses ? 0 : (losses * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    <Table loading={loading} rowClassName={rowClassName} size="small" columns={oldOneTickerColumns}/>
                    </FormItem>
                </Col>
                <Col span={12}>
                    <FormItem label="New Samurai">
                        <Row gutter={8}>
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
                                            { notation:'compact' }).format(profits)}
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
                                            { notation:'compact' }).format(losses)}
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
                    <Table loading={loading} rowClassName={rowClassName} size="small" columns={oldOneTickerColumns} dataSource={isAllTickers ? allPositions : positions}/>
                    </FormItem>
                </Col>
            </Row>
        </Form>
    </div>;
}