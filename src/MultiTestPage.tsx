import {
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    Radio,
    Row,
    Slider,
    Space,
    Statistic,
    Table
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
    calculateFakeout,
    calculatePositionsByFakeouts,
    calculatePositionsByIFC,
    calculatePositionsByOrderblocks,
    calculateSwings,
    khrustikCalculateSwings
} from "./samurai_patterns";
import {
    fetchCandlesFromAlor, fetchRiskRates,
    getSecurity,
    persision,
    refreshToken, uniqueBy
} from "./utils";
import {symbolFuturePairs} from "../symbolFuturePairs";
import {Chart} from "./SoloTestPage/TestChart";
import {DatesPicker} from "./DatesPicker";
import {Link} from "react-router-dom";
import {
    calculateTesting, notTradingTime,
} from "./th_ultimate";

export const MultiTestPage = () => {
    const [swipType, setSwipType] = useState('tradinghub');
    const [trandsType, setTrandsType] = useState('tradinghub');
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState({});
    const [allSecurity, setAllSecurity] = useState({});
    const [allRiskRates, setAllRiskRates] = useState({});
    const [data, setData] = useState([]);
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [removeInternal, setremoveInternal] = useState<boolean>(true);
    const [onlyExtremum, setonlyExtremum] = useState<boolean>(true);
    const [confirmTrend, setConfirmTrend] = useState<boolean>(false);
    const [tradeFakeouts, setTradeFakeouts] = useState<boolean>(false);
    const [tradeIFC, setTradeIFC] = useState<boolean>(false);
    const [withMove, setwithMove] = useState<boolean>(false);
    const [moreBOS, setmoreBOS] = useState<boolean>(true);
    const [newSMT, setnewSMT] = useState<boolean>(true);
    const [showHiddenSwings, setshowHiddenSwings] = useState<boolean>(false);
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
    const [riskRates, setRiskRates] = useState();
    const [token, setToken] = useState();
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([dayjs('2024-10-01T00:00:00Z'), dayjs('2025-10-01T00:00:00Z')])

    const positions = useMemo(() => {
        const {swings, highParts, lowParts, trend, boses, orderBlocks} = calculateTesting(data, withMove, moreBOS);

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
            const fakeoutPositions = calculatePositionsByIFC(data, swings, trend,takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent);
            positions.push(...fakeoutPositions);
        }

        positions = uniqueBy(v => v.openTime, positions);

        const isShortSellPossible = riskRates?.isShortSellPossible || false;
        if(!isShortSellPossible){
            positions = positions.filter(p => p.side !== 'short');
        }

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
        }).filter(s => s.quantity).sort((a, b) => b.openTime - a.openTime);
    }, [data, trandsType, tradeOB, moreBOS, newSMT, showHiddenSwings, withMove, limitOrderTrade, tradeIFC, onlyExtremum, removeInternal, excludeTrendSFP, tradeFakeouts, confirmTrend, feePercent, riskRates, security, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy]);

    const allPositions = useMemo(() => {
        return Object.entries(allData).map(([ticker, data]) => {
            const {swings, highParts, lowParts, trend, boses, orderBlocks} = calculateTesting(data, withMove, moreBOS);

            const lotsize = (allSecurity[ticker]?.lotsize || 1)

            const fee = feePercent / 100;

            let positions = [];
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
                const fakeoutPositions = calculatePositionsByIFC(data, swings,trend, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent);
                positions.push(...fakeoutPositions);
            }

            const isShortSellPossible = allRiskRates[ticker]?.isShortSellPossible || false;
            if(!isShortSellPossible){
                positions = positions.filter(p => p.side !== 'short');
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
        }).flat().filter(s => s.quantity).sort((a, b) => b.openTime - a.openTime)
    }, [swipCallback, trandsType, limitOrderTrade, tradeOB, tradeIFC, moreBOS, newSMT, showHiddenSwings, withMove, removeInternal, onlyExtremum, excludeWick, excludeTrendSFP, tradeFakeouts, confirmTrend, allData, feePercent, allRiskRates, allSecurity, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

    const fetchAllTickerCandles = async () => {
        setLoading(true);
        const result = {};
        const result1 = {};
        const result2 = {};
        const stockSymbols = symbolFuturePairs.map(curr => curr.stockSymbol);
        for (let i = 0; i < stockSymbols.length; i++) {
            result[stockSymbols[i]] = await fetchCandlesFromAlor(stockSymbols[i], tf, dates[0].unix(), dates[1].unix()).then(candles => candles.filter(candle => !notTradingTime(candle)));
            if(token)
            result1[stockSymbols[i]] = await getSecurity(stockSymbols[i], token);
            result2[stockSymbols[i]] = await fetchRiskRates(stockSymbols[i]);
        }
        setAllRiskRates(result2)
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

    useEffect(() => {
       fetchRiskRates(ticker).then(setRiskRates)
    }, [ticker])

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
                return <Link to={`/test?ticker=${row.ticker}&trendTF=${row.timeframe}&tf=${row.timeframe}&checkboxes=tradeOB%2CBOS%2Cswings%2CshowOB%2CshowEndOB%2CmoreBOS`}
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
                {/*<Col>*/}
                {/*    <FormItem>*/}
                {/*        <Checkbox checked={onlyExtremum} onChange={e => setonlyExtremum(e.target.checked)}>БОСЫ только на экстремумах</Checkbox>*/}
                {/*    </FormItem>*/}
                {/*</Col>*/}
                {/*<Col>*/}
                {/*    <FormItem>*/}
                {/*        <Checkbox checked={removeInternal} onChange={e => setremoveInternal(e.target.checked)}>Игнорировать внутреннюю структуру</Checkbox>*/}
                {/*    </FormItem>*/}
                {/*</Col>*/}
                <Col>
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
                        <Checkbox checked={withMove} onChange={e => setwithMove(e.target.checked)}>Двигать к имбалансу</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={moreBOS} onChange={e => setmoreBOS(e.target.checked)}>Более точные BOS</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={newSMT} onChange={e => setnewSMT(e.target.checked)}>Предугадывать SMT</Checkbox>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem>
                        <Checkbox checked={showHiddenSwings} onChange={e => setshowHiddenSwings(e.target.checked)}>Показывать скрытые точки</Checkbox>
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