import React, {useCallback, useMemo, useState} from "react";
import {Card, Col, Row, Select, Slider, SliderSingleProps, Space, Statistic, Table, Tabs, TabsProps, theme} from "antd";
import {useCandlesQuery, usePortfolioQuery, useSecurityQuery} from "../api.ts";
import moment from "moment";
import {Link, useSearchParams} from "react-router-dom";
import useWindowDimensions from "../useWindowDimensions.tsx";

import {notTradingTime} from "../th_ultimate.ts";
import {PositionsTable} from "./PositionsTable.tsx";
import {HistoryTable} from "./HistoryTable.tsx";
import {OrdersTable} from "./OrdersTable.tsx";
import {StatisticWidgets} from "./StatisticWidgets.tsx";
import {MainPageChart} from "./MainPageChart.tsx";
import {calculateProdPositionFee} from "../samurai_patterns.ts";

export const moneyFormat = (
    money: number,
    currency: string = "RUB",
    minimumFractionDigits: number = 0,
    maximumFractionDigits: number = 0
) => {
    const options: Intl.NumberFormatOptions = {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits
    };
    const numberFormat = new Intl.NumberFormat("ru-RU", options);

    return numberFormat.format(money);
};

const MainPage: React.FC = () => {
        const [stopFrom, setStopFrom] = useState(0);
        const [stopTo, setStopTo] = useState(100);

        const {height, width, isMobile} = useWindowDimensions();
        const {
            token: {colorBgContainer, borderRadiusLG}
        } = theme.useToken();

        const getPatternKey = useCallback(pattern => pattern?.type === 'summary' ? pattern.openDate : `${pattern?.ticker}_${pattern?.timeframe}_${pattern?.liquidSweepTime}`, []);

        const [searchParams, setSearchParams] = useSearchParams();
        const symbol = searchParams.get("ticker") || "SBER";
        const tf = searchParams.get("tf") || "1800";

        const tab = searchParams.get('tab') || 'positions';

        const selectedKey = getPatternKey({
            ticker: searchParams.get("ticker"),
            timeframe: searchParams.get("tf"),
            liquidSweepTime: searchParams.get("liquidSweepTime")
        })

    const minDate = moment('2025-05-30T00:00:00.000Z');
    const min = minDate.unix()
    const max = moment().unix()

    const [{fromDate, toDate}, setDates] = useState({
        fromDate: min,
        toDate: 9999999999999
    });

        const {data: portfolio = {}} = usePortfolioQuery({
            fromDate
        });

        const ordersMap = useMemo(() => portfolio?.orders?.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {}) || {}, [portfolio?.orders]);

        const stopordersMap = useMemo(() => portfolio?.stoporders?.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {}) || {}, [portfolio?.stoporders]);

        const tradesMap = useMemo(() => portfolio?.trades?.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {}) || {}, [portfolio?.trades]);

        const accTradesOrdernoQtyMap = useMemo(() => portfolio?.trades?.reduce((acc, curr) => {
            if (!acc[curr.orderno]) {
                acc[curr.orderno] = 0;
            }
            acc[curr.orderno] += curr.qtyUnits;
            return acc;
        }, {}) || {}, [portfolio?.trades]);

        const tradesOrdernoMap = useMemo(() => portfolio?.trades?.reduce((acc, curr) => {
            acc[curr.orderno] = curr;
            return acc;
        }, {}) || {}, [portfolio?.trades]);

        // Получить индекс свечки на которой была
        const patterns = useMemo(() => (portfolio.patterns || []).map(p => ({
            ...p,
            limit: ordersMap[p.limitOrderNumber],
            limitTrade: tradesMap[p.limitTradeId],
            stopLoss: stopordersMap[p.stopOrderNumber],
            stopLossTrade: tradesMap[p.stopTradeId],
            takeProfit: stopordersMap[p.takeOrderNumber],
            takeProfitTrade: tradesMap[p.takeTradeId]
        })), [portfolio.patterns, stopordersMap, ordersMap, tradesMap]);

        const selectedPattern = useMemo(() => patterns.find(p => getPatternKey(p) === selectedKey), [selectedKey, patterns])

        const to = useMemo(() => {
            if (!selectedPattern) {
                return undefined;
            }
            if (selectedPattern.takeProfitTrade) {
                return moment(selectedPattern.takeProfitTrade.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
            }
            if (selectedPattern.stopLossTrade) {
                return moment(selectedPattern.stopLossTrade.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
            }
            if (selectedPattern.takeProfit) {
                return moment(selectedPattern.takeProfit.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
            }
            if (selectedPattern.stopLoss) {
                return moment(selectedPattern.stopLoss.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
            }
            return undefined;
        }, [selectedPattern]);

        const {
            data = {
                candles: []
            }
        } = useCandlesQuery({
            symbol,
            tf,
            emaPeriod: 100,
            from: moment(selectedPattern?.liquidSweepTime).add(-1, "week").unix().toString(),
            to
        }, {
            skip: !symbol || !selectedPattern,
            // pollingInterval: 10000,
        });

        const {data: security} = useSecurityQuery({symbol});

        const candles = data.candles.filter(candle => !notTradingTime(candle));

        function onSelect(record: any): void {
            if (record.type === 'summary') {
                return;
            }
            searchParams.set("ticker", record.ticker);
            searchParams.set("tf", record.timeframe);
            searchParams.set("liquidSweepTime", record.liquidSweepTime);
            setSearchParams(searchParams);
        }

        const position = useMemo(() => tradesOrdernoMap[selectedPattern?.limitOrderNumber], [selectedPattern, tradesOrdernoMap]);

        const stop = useMemo(() => stopordersMap[selectedPattern?.stopOrderNumber], [selectedPattern, stopordersMap]);

        const take = useMemo(() => stopordersMap[selectedPattern?.takeOrderNumber], [selectedPattern, stopordersMap]);

        const onChange = (key: string) => {
            searchParams.set('tab', key);
            setSearchParams(searchParams);
        };

        const [selectedTicker, setSelectedTicker] = useState();
        const [selectedTF, setSelectedTF] = useState();
        const [selectedName, setSelectedName] = useState();

        const positions = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && p.limitTradeId && p.stopLoss?.status === "working"), [patterns]);

        const orders = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && !p.limitTradeId), [patterns]);

        const history = useMemo(() => patterns.filter(p => {
            const baseBool = (!selectedTicker || p.ticker === selectedTicker)
                && (!selectedName || p.pattern === selectedName)
                && (!selectedTF || p.timeframe === selectedTF)
                && (!!p.takeTradeId || !!p.stopTradeId);

            const value = p?.stopLoss;
            if (!value) {
                return baseBool;
            }

            let percent = p.limitTrade?.price > value?.stopPrice ? p.limitTrade?.price / value?.stopPrice : value?.stopPrice / p.limitTrade?.price;
            percent = (percent - 1) * 100;

            return baseBool && percent > stopFrom && percent < stopTo;
        })
            .filter(row => row.limitTrade?.price && (row.stopLossTrade?.price || row.takeProfitTrade?.price))
            .map(row => ({
                ...row,
                Fee: calculateProdPositionFee(row),
                PnL: row.limitTrade?.side === "buy" ?
                    accTradesOrdernoQtyMap[row.limitTrade?.orderno] * ((row.stopLossTrade?.price || row.takeProfitTrade?.price) - row.limitTrade?.price) - calculateProdPositionFee(row)
                    : row.limitTrade?.side === "sell" ?
                        accTradesOrdernoQtyMap[row.limitTrade?.orderno] * (row.limitTrade?.price - (row.stopLossTrade?.price || row.takeProfitTrade?.price)) - calculateProdPositionFee(row) : undefined
            }))
            .sort((a, b) => b.limitTrade?.date.localeCompare(a.limitTrade?.date)), [stopFrom, stopTo, selectedName, selectedTicker, selectedTF, accTradesOrdernoQtyMap, patterns]);


        const pageSize = 12;

        const items: TabsProps["items"] = [
            {
                key: "positions",
                label: "Позиции",
                children:
                    <PositionsTable pageSize={pageSize} onSelect={onSelect} positions={positions} accTradesOrdernoQtyMap={accTradesOrdernoQtyMap} />
            },
            {
                key: "orders",
                label: "Заявки",
                children:
                    <OrdersTable ordersMap={ordersMap} orders={orders} pageSize={pageSize} onSelect={onSelect} />
            },
            {
                key: "history",
                label: "История сделок",
                children:
                    <HistoryTable history={history} pageSize={pageSize} onSelect={onSelect} selectedPattern={selectedPattern} getPatternKey={getPatternKey} />
            }
        ];

        const diff = max - min;
        const length = 10;
        const part = Math.floor(diff / length);
        const betweedDates = new Array(length).fill(0).map((v, i) => moment((i * part + min) * 1000));

        const marks: SliderSingleProps['marks'] = {
            [min]: minDate.format('YYYY-MM-DD'),
            [max]: moment(max * 1000).format('YYYY-MM-DD'),
        };

        betweedDates.forEach(date => marks[date.unix()] = date.format('YYYY-MM-DD'))

        const timeframeLabelMap = {
            300: 'M5',
            900: 'M15',
            1800: 'M30'
        }

        const TabExtra = () => {

            const tfOptions = useMemo(() => Object.entries(timeframeLabelMap).map(([value, label]) => ({
                value,
                label
            })), []);

            const nameOptions = useMemo(() => Array.from(new Set(history.map(h => h.pattern))).map((value) => ({
                value,
                label: value
            })), []);
            const tickerOptions = useMemo(() => Array.from(new Set(history.map(h => h.ticker))).sort().map((value) => ({
                value,
                label: value
            })), []);

            return <Space>
                {/*<InputNumber placeholder="Stop from" value={stopFrom} onChange={setStopFrom} />*/}
                {/*<InputNumber placeholder="Stop to" value={stopTo} onChange={setStopTo} />*/}
                <Select style={{width: 200}} allowClear placeholder="Выберите тикер" options={tickerOptions}
                        value={selectedTicker} onChange={setSelectedTicker}/>
                <Select style={{width: 200}} allowClear placeholder="Выберите паттерн" options={nameOptions}
                        value={selectedName} onChange={setSelectedName}/>
                <Select style={{width: 200}} allowClear placeholder="Выберите таймфрейм" options={tfOptions}
                        value={selectedTF} onChange={setSelectedTF}/>
            </Space>
        }

        return (
            <Space direction="vertical" style={{width: '100%'}}>
                <div style={{margin: '0 40px'}}>
                    <Slider range defaultValue={[fromDate, toDate]} marks={marks}
                            onChange={([fromDate, toDate]) => setDates({fromDate, toDate})}
                            tooltip={{formatter: val => moment(val * 1000).format('YYYY-MM-DD')}}
                            min={min} step={60 * 60 * 24} max={moment().unix()}/>
                </div>

                <StatisticWidgets history={history} timeframeLabelMap={timeframeLabelMap} fromDate={fromDate} toDate={toDate}/>

                <Row gutter={8}>
                    <Col span={width > 1200 ? 16 : 24}>
                        <Tabs defaultActiveKey="positions" activeKey={tab} items={items} onChange={onChange}
                              tabBarExtraContent={width > 1200 && <TabExtra/>}/>
                    </Col>
                    <MainPageChart selectedPattern={selectedPattern} tf={tf} candles={candles} tradesMap={tradesMap} tradesOrdernoMap={tradesOrdernoMap}/>
                </Row>
            </Space>
        );
    }
;
export const summ = (numbers: number[]) =>
    numbers.reduce((acc, curr) => acc + curr, 0);

export default MainPage;
