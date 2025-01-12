import {
    Card,
    Checkbox,
    Col,
    DatePicker, Divider,
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
import React, {useCallback, useEffect, useMemo, useState} from "react";
import FormItem from "antd/es/form/FormItem";
import {TimeframeSelect} from "./TimeframeSelect";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {moneyFormat} from "./MainPage";
import moment from 'moment';
import {
    calculateCrosses,
    calculateFakeout,
    calculateOB,
    calculatePositionsByFakeouts,
    calculatePositionsByIFC,
    calculatePositionsByOrderblocks,
    calculateStructure,
    calculateSwings,
    calculateTrend,
    khrustikCalculateSwings,
    tradinghubCalculateSwings,
    tradinghubCalculateTrendNew,
    tradinghubCalculateTrendNew2
} from "./samurai_patterns";
import {
    fetchCandlesFromAlor,
    fillTrendByMinorData,
    getSecurity,
    notTradingTime,
    persision,
    refreshToken, uniqueBy
} from "./utils";
import {symbolFuturePairs} from "../symbolFuturePairs";
import {Chart} from "./TestPage/TestChart";
import {DatesPicker} from "./DatesPicker";
import {Link} from "react-router-dom";

export const TestingPage = () => {
    const [swipType, setSwipType] = useState('tradinghub');
    const [trandsType, setTrandsType] = useState('tradinghub');
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState({});
    const [allSecurity, setAllSecurity] = useState({});
    const [data, setData] = useState([]);
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [removeInternal, setremoveInternal] = useState<boolean>(true);
    const [onlyExtremum, setonlyExtremum] = useState<boolean>(true);
    const [confirmTrend, setConfirmTrend] = useState<boolean>(false);
    const [tradeFakeouts, setTradeFakeouts] = useState<boolean>(false);
    const [tradeIFC, setTradeIFC] = useState<boolean>(false);
    const [tradeOB, setTradeOB] = useState<boolean>(true);
    const [limitOrderTrade, setLimitOrderTrade] = useState<boolean>(false);
    const [excludeTrendSFP, setExcludeTrendSFP] = useState<boolean>(false);
    const [excludeWick, setExcludeWick] = useState<boolean>(false);
    const [ticker, onSelectTicker] = useState<string>('MTLR');
    const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<"default" | "max">("default");
    const [stopMargin, setStopMargin] = useState<number>(50)
    const [feePercent, setFeePercent] = useState<number>(0.04)
    const [baseTakePercent, setBaseTakePercent] = useState<number>(5)
    const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5)
    const [security, setSecurity] = useState();
    const [token, setToken] = useState();
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([dayjs('2024-10-01T00:00:00Z'), dayjs('2025-10-01T00:00:00Z')])

    const swipCallback = useCallback((...args) => {
        const swipsMap = {
            'samurai':calculateSwings,
            'khrustik': khrustikCalculateSwings,
            'tradinghub' : tradinghubCalculateSwings
        }
        const swipCallback = swipsMap[swipType]  || calculateSwings;
        return swipCallback(...args)
    }, [swipType]);

    const swings = useMemo(() => {
            if(!data.length){
                return [];
            }
            return swipCallback(data);
    } ,[swipCallback, tf, data])

    const trend = useMemo(() => {
            if(!data.length){
                return [];
            }
            let {swings: swingsData, highs, lows} = swings;
            const {trend: thTrend, boses: thBoses, swings: thSwings} = tradinghubCalculateTrendNew(swingsData, data);
            swingsData = thSwings;
            highs = thSwings.filter(t => t?.side === 'high');
            lows = thSwings.filter(t => t?.side === 'low');
            const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);
            const trend = calculateTrend(highParts, lowParts, data, confirmTrend, excludeTrendSFP, excludeWick).trend;
            return thTrend;

            return trend;
    }, [tf, swings, confirmTrend, excludeWick, excludeTrendSFP]);

    const positions = useMemo(() => {
        let {swings: swingsData, highs, lows} = swipCallback(data);
        const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);

        let trend = [];
        let boses = [];
        let orderBlocks = [];
        if(trandsType === 'tradinghub'){
            const {trend: thTrend, boses: thBoses, swings: thSwings} = tradinghubCalculateTrendNew(swingsData, data, removeInternal, false, onlyExtremum);
            swingsData = thSwings;
            highs = thSwings.filter(t => t?.side === 'high');
            lows = thSwings.filter(t => t?.side === 'low');
            trend = thTrend;
            boses = thBoses;
            orderBlocks = calculateOB(highParts, lowParts, data, boses, trend);
        } else if(trandsType === 'dobrinya'){
            const {trend: thTrend, boses: thBoses, swings: thSwings, orderBlocks: thOrderBlocks} = tradinghubCalculateTrendNew2(swingsData, data);
            swingsData = thSwings;
            highs = thSwings.filter(t => t?.side === 'high');
            lows = thSwings.filter(t => t?.side === 'low');
            trend = thTrend;
            boses = thBoses;
            orderBlocks = thOrderBlocks;
        } else {
            trend = calculateTrend(highParts, lowParts, data, confirmTrend, excludeTrendSFP).trend;
            boses = calculateCrosses(highParts, lowParts, data, trend).boses;
            orderBlocks = calculateOB(highParts, lowParts, data, boses, trend);
        }

        const lotsize = (security?.lotsize || 1)

        const fee = feePercent / 100

        let positions = [];
        if (tradeOB) {
            const fakeoutPositions = calculatePositionsByOrderblocks(orderBlocks, data, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent, limitOrderTrade)
            positions.push(...fakeoutPositions);
        }
        if (tradeFakeouts) {
            const fakeouts = calculateFakeout(highParts, lowParts, data)
            const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, baseTakePercent);
            positions.push(...fakeoutPositions);
        }

        if (tradeIFC) {
            const fakeoutPositions = calculatePositionsByIFC(data, swingsData, trend,takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent);
            positions.push(...fakeoutPositions);
        }

        positions = uniqueBy(v => v.openTime, positions);

        return positions.map((curr) => {
            const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
            const stopLossMarginPerLot = diff * lotsize
            curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
            const openFee = curr.openPrice * curr.quantity * lotsize * fee;
            const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;

            curr.fee = openFee + closeFee;
            curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee

            curr.timeframe = tf;

            return curr;
        }).filter(s => s.quantity).sort((a, b) => b.closeTime - a.closeTime);
    }, [data, trandsType, tradeOB, limitOrderTrade, tradeIFC, trend, onlyExtremum, removeInternal, excludeTrendSFP, tradeFakeouts, confirmTrend, feePercent, security, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy]);

    const allPositions = useMemo(() => {
        return Object.entries(allData).map(([ticker, data]) => {
            let {swings: swingsData, highs, lows} = swipCallback(data);
            const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);

            let trend = [];
            let boses = [];
            let orderBlocks = [];
            if(trandsType === 'tradinghub'){
                const {trend: thTrend, boses: thBoses, swings: thSwings} = tradinghubCalculateTrendNew(swingsData, data, removeInternal, false, onlyExtremum);
                swingsData = thSwings;
                highs = thSwings.filter(t => t?.side === 'high');
                lows = thSwings.filter(t => t?.side === 'low');
                trend = thTrend;
                boses = thBoses;
                orderBlocks = calculateOB(highParts, lowParts, data, boses, trend);
            } else if(trandsType === 'dobrinya'){
                const {trend: thTrend, boses: thBoses, swings: thSwings, orderBlocks: thOrderBlocks} = tradinghubCalculateTrendNew2(swingsData, data);
                swingsData = thSwings;
                highs = thSwings.filter(t => t?.side === 'high');
                lows = thSwings.filter(t => t?.side === 'low');
                trend = thTrend;
                boses = thBoses;
                orderBlocks = thOrderBlocks;
            } else {
                trend = calculateTrend(highParts, lowParts, data, confirmTrend, excludeTrendSFP).trend;
                boses = calculateCrosses(highParts, lowParts, data, trend).boses;
                orderBlocks = calculateOB(highParts, lowParts, data, boses, trend);
            }

            const lotsize = (allSecurity[ticker]?.lotsize || 1)

            const fee = feePercent / 100;

            const positions = [];
            if(tradeOB){
                const fakeoutPositions = calculatePositionsByOrderblocks(orderBlocks, data, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent, limitOrderTrade)
                positions.push(...fakeoutPositions);
            }
            if(tradeFakeouts){
                const fakeouts = calculateFakeout(highParts, lowParts, data)
                const fakeoutPositions = calculatePositionsByFakeouts(fakeouts, data, baseTakePercent);
                positions.push(...fakeoutPositions);
            }

            if(tradeIFC){
                const fakeoutPositions = calculatePositionsByIFC(data, swingsData,trend, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent);
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
                curr.timeframe = tf;

                return curr;
            });
        }).flat().filter(s => s.quantity).sort((a, b) => b.closeTime - a.closeTime)
    }, [swipCallback, trandsType, limitOrderTrade, tradeOB, tradeIFC, removeInternal, onlyExtremum, excludeWick, excludeTrendSFP, tradeFakeouts, confirmTrend, allData, feePercent, allSecurity, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

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
        if(!isAllTickers && ticker){

                fetchCandlesFromAlor(ticker, tf, dates[0].unix(), dates[1].unix()).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setData).finally(() =>
                    setLoading(false));

        }
    }, [isAllTickers, tf, ticker, dates]);

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    const oldOneTickerColumns = [
        isAllTickers && {
            title: 'Ticker',
            dataIndex: 'ticker',
            key: 'ticker',
        },{
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
        {
            title: "Действия",
            render: (value, row) => {
                return <Link to={`/test?ticker=${row.ticker}&trendTF=${row.timeframe}&tf=${row.timeframe}`}
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
            if(!acc[date]){
                acc[date] = curr.newPnl;
            } else {
                acc[date] += curr.newPnl;
            }
            return acc;
        }, {}))
            .map(([date, PnL]) => ({time: moment(date, 'YYYY-MM-DD').unix(), value: PnL}))
            .sort((a, b) => a.time - b.time)
            .reduce((acc, curr, i) => {
                if(i === 0){
                    acc = [curr];
                } else {
                    acc.push(({...curr, value: acc[i - 1].value + curr.value}))
                }

                return acc;
            }, []);
    }, [isAllTickers, allPositions, positions])

    return <div style={{width: 'max-content', minWidth: "1800px"}}>
        <Form layout="vertical">
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
                        <Checkbox checked={onlyExtremum} onChange={e => setonlyExtremum(e.target.checked)}>БОСЫ только на экстремумах</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={removeInternal} onChange={e => setremoveInternal(e.target.checked)}>Игнорировать внутреннюю структуру</Checkbox>
                    </FormItem>
                </Col><Col>
                    <FormItem>
                        <Checkbox checked={tradeFakeouts} onChange={e => setTradeFakeouts(e.target.checked)}>Торговать Ложные
                            пробои</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={tradeIFC} onChange={e => setTradeIFC(e.target.checked)}>Торговать IFC</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={tradeOB} onChange={e => setTradeOB(e.target.checked)}>Торговать OB</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={limitOrderTrade} onChange={e => setLimitOrderTrade(e.target.checked)}>Торговать лимитками</Checkbox>
                    </FormItem>
                </Col>
            </Row>
            <Divider plain orientation="left">Тренд</Divider>
            <Row gutter={8} align="bottom">
                <Col>
                    <FormItem>
                        <Checkbox checked={confirmTrend} onChange={e => setConfirmTrend(e.target.checked)}>Подтвержденный
                            тренд</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={excludeTrendSFP} onChange={e => setExcludeTrendSFP(e.target.checked)}>Исключить
                            Fake BOS</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={excludeWick} onChange={e => setExcludeWick(e.target.checked)}>Игнорировать пробитие фитилем</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Radio.Group onChange={e => setSwipType(e.target.value)}
                                     value={swipType}>
                            <Radio value="tradinghub">Свипы по tradinghub</Radio>
                            {/*<Radio value="samurai">Свипы по самураю</Radio>*/}
                            {/*<Radio value="khrustik">Свипы по хрустику</Radio>*/}
                        </Radio.Group>
                    </FormItem>
                </Col>
                <Col>
                    <Form.Item label="Тренд">
                        <Radio.Group onChange={e => setTrandsType(e.target.value)}
                                     value={trandsType}>
                            <Radio value="tradinghub">tradinghub</Radio>
                            {/*<Radio value="dobrinya">dobrinya</Radio>*/}
                            {/*<Radio value="samurai">самурай</Radio>*/}
                            {/*<Radio value="khrustik">хрустику</Radio>*/}
                        </Radio.Group>
                    </Form.Item>
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
                        <Table loading={loading} rowClassName={rowClassName} size="small"
                               columns={oldOneTickerColumns}/>
                    </FormItem>
                </Col>
                <Col span={12}>
                    <Chart showVolume={false} seriesType="Line" lineSerieses={[]} hideInternalCandles primitives={[]} markers={[]} data={profitChartData}
                           ema={[]}/>
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
                        <Table loading={loading} rowClassName={rowClassName} size="small" columns={oldOneTickerColumns}
                               dataSource={isAllTickers ? allPositions : positions}/>
                    </FormItem>
                </Col>
            </Row>
        </Form>
    </div>;
}