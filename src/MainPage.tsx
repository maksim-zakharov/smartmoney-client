import React, {useCallback, useMemo, useState} from "react";
import {Card, Col, Row, Select, Slider, SliderSingleProps, Space, Statistic, Table, Tabs, TabsProps, theme} from "antd";
import {useCandlesQuery, usePortfolioQuery, useSecurityQuery} from "./api";
import {SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";
import moment from "moment";
import {Link, useSearchParams} from "react-router-dom";
import useWindowDimensions from "./useWindowDimensions";
import {
    bosesToLineSerieses,
    orderblocksToImbalancePrimitives,
    orderblocksToOrderblocksPrimitives,
    swingsToMarkers
} from "./utils.ts";
import {calculateTesting, defaultConfig} from "./THUltimate/th_ultimate_oneIt.ts";
import {Chart} from "./SoloTestPage/TestChart.tsx";

import {notTradingTime} from "./THUltimate/utils.ts";

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

export const digitsAfterDot = (num) => {
    if (!num) {
        return 0;
    }

    return `${num}`.split('.')?.[1]?.length || 0;
};

const roundTime = (date: any, tf: string, utc: boolean = true) => {

    const timestamp = new Date(date).getTime() / 1000;

    // Конвертируем таймфрейм из минут в миллисекунды
    const timeframeMs = Number(tf);

    // Рассчитываем ближайшую "свечу", округляя до ближайшего целого
    const roundedTimestamp = Math.floor(timestamp / timeframeMs) * timeframeMs;

    return (utc ? timeToLocal(roundedTimestamp) : roundedTimestamp) as UTCTimestamp;
};


const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

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

        const {data: portfolio = {}} = usePortfolioQuery(undefined);

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

        const props = {
            colors: {
                backgroundColor: "white",
                lineColor: "#2962FF",
                textColor: "black",
                areaTopColor: "#2962FF",
                areaBottomColor: "rgba(41, 98, 255, 0.28)"
            }
        };

        const positionsColumns = [
            {
                title: "Тикер",
                dataIndex: "ticker",
                key: "ticker"
            },
            {
                title: "Паттерн",
                dataIndex: "pattern",
                key: "pattern"
            },
            width > 1200 && {
                title: "Время пересвипа",
                dataIndex: "liquidSweepTime",
                key: "liquidSweepTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            width > 1200 && {
                title: "Время ОБ",
                dataIndex: "orderblockTime",
                key: "orderblockTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            width > 1200 && {
                title: "Вход",
                dataIndex: "limitTrade",
                key: "limitTrade",
                render: (value) => value?.price || "-"
            },
            {
                title: "Время",
                dataIndex: "limitTrade",
                key: "limitTrade",
                render: (value, row) => row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
            },
            {
                title: "Стоп-лосс",
                dataIndex: "stopLoss",
                key: "stopLoss",
                render: (value, row) => {
                    if (!value?.stopPrice) {
                        return "-";
                    }
                    const openPrice = row.limitTrade?.price;
                    const stopLoss = value?.stopPrice

                    const side = openPrice > stopLoss ? 'buy' : 'sell';
                    const percent = side === 'buy' ? openPrice / stopLoss : stopLoss / openPrice

                    const PnL = side === 'buy' ? openPrice - stopLoss : stopLoss - openPrice;

                    return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * (accTradesOrdernoQtyMap[row.limitTrade?.orderno] || row.limitTrade?.qtyUnits), 'RUB', 2, 2)})`;
                }
            },
            {
                title: "Тейк-профит",
                dataIndex: "takeProfit",
                key: "takeProfit",
                render: (value, row) => {
                    if (!value?.stopPrice) {
                        return "-";
                    }
                    const openPrice = row.limitTrade?.price;
                    const takeProfit = value?.stopPrice

                    const side = openPrice > takeProfit ? 'buy' : 'sell';
                    const percent = side === 'buy' ? openPrice / takeProfit : takeProfit / openPrice

                    const PnL = side === 'buy' ? openPrice - takeProfit : takeProfit - openPrice;

                    return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * (accTradesOrdernoQtyMap[row.limitTrade?.orderno] || row.limitTrade?.qtyUnits), 'RUB', 2, 2)})`;
                }
            },
            width > 1200 && {
                title: "Действия",
                render: (value, row) => {
                    return <Link
                        to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2ClimitOrderTrade%2CnewSMT%2CsmartTrend`}
                        target="_blank">Тестер</Link>;
                }
            }
        ].filter(Boolean);

        const columns = [
            {
                title: "Тикер",
                dataIndex: "ticker",
                key: "ticker"
            },
            {
                title: "Паттерн",
                dataIndex: "pattern",
                key: "pattern"
            },
            width > 1200 && {
                title: "Время пересвипа",
                dataIndex: "liquidSweepTime",
                key: "liquidSweepTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            width > 1200 && {
                title: "Время ОБ",
                dataIndex: "orderblockTime",
                key: "orderblockTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            {
                title: "Вход",
                dataIndex: "limit",
                key: "limit",
                render: (value) => value?.price || "-"
            },
            {
                title: "Время",
                dataIndex: "limit",
                key: "limit",
                render: (value) => value?.updateTime ? moment(value?.updateTime).format("YYYY-MM-DD HH:mm") : "-"
            },
            {
                title: "Стоп-лосс",
                dataIndex: "stopLoss",
                key: "stopLoss",
                render: (value, row) => {
                    if (!value?.stopPrice) {
                        return "-";
                    }
                    // const orderblockOpen = Number(row.orderblockOpen);
                    // const imbalanceOpen = Number(row.imbalanceOpen);
                    const limitOrder = ordersMap[Number(row.limitOrderNumber)]
                    if (!limitOrder) {
                        return "-";
                    }
                    const side = limitOrder.side; //  orderblockOpen < imbalanceOpen ? 'buy' : 'sell';
                    const openPrice = side === 'buy' ? Number(row.orderblockHigh) : Number(row.orderblockLow);
                    const stopLoss = value?.stopPrice

                    const percent = side === 'buy' ? openPrice / stopLoss : stopLoss / openPrice

                    const PnL = side === 'buy' ? openPrice - stopLoss : stopLoss - openPrice;

                    return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * (limitOrder?.qtyUnits), 'RUB', 2, 2)})`;
                }
            },
            // {
            //   title: "stopLossTime",
            //   dataIndex: "stopLoss",
            //   key: "stopLoss",
            //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
            // },
            {
                title: "takeProfit",
                dataIndex: "takeProfit",
                key: "takeProfit",
                render: (value) => value?.stopPrice || "-"
            },
            {
                title: "Действия",
                render: (value, row) => {
                    return <Link
                        to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2ClimitOrderTrade%2CnewSMT%2CsmartTrend`}
                        target="_blank">Тестер</Link>;
                }
            }
            // {
            //   title: "takeProfitTime",
            //   dataIndex: "takeProfit",
            //   key: "takeProfit",
            //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
            // },
        ].filter(Boolean);

        const historyColumns = [
            {
                title: "Тикер",
                dataIndex: "ticker",
                key: "ticker"
            },
            width > 1200 && {
                title: "Паттерн",
                dataIndex: "pattern",
                key: "pattern"
            },
            width > 1200 && {
                title: "Тип",
                dataIndex: "side",
                key: "side",
                render: (value, row) => row?.type !== 'summary' ? row?.limitTrade?.side || "-" : ""
            },
            width > 1200 && {
                title: "Пересвип",
                dataIndex: "liquidSweepTime",
                key: "liquidSweepTime",
                render: (value, row) => row?.type !== 'summary' ? moment(value).format("YYYY-MM-DD HH:mm") : ""
            },
            width > 1200 && {
                title: "ОБ",
                dataIndex: "orderblockTime",
                key: "orderblockTime",
                render: (value, row) => row?.type !== 'summary' ? moment(value).format("YYYY-MM-DD HH:mm") : ""
            },
            width > 1200 && {
                title: "Вход",
                dataIndex: "limitTrade",
                key: "limitTrade",
                render: (value, row) => row?.type !== 'summary' ? value?.price || "-" : ""
            },
            {
                title: "Время",
                dataIndex: "limitTrade",
                key: "limitTrade",
                // colSpan: 2,
                onCell: (row, index) => ({
                    colSpan: row.type === 'summary' ? 4 : 1,
                }),
                render: (value, row) => {
                    if (row?.type !== 'summary') {
                        return row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
                    }

                    const formatDate = moment(row?.openDate).format('LL');

                    const percent = row.stats.profitTrades.length * 100 / (row.stats.profitTrades.length + row.stats.lossTrades.length)

                    return `${formatDate} Profits: ${row.stats.profitTrades.length} / Losses: ${row.stats.lossTrades.length} (Profit rate: ${percent.toFixed(0)}%)`
                }
            },
            {
                title: "Стоп цена",
                dataIndex: "stopLossTrade",
                key: "stopLossTrade",
                onCell: (row, index) => ({
                    colSpan: row.type === 'summary' ? 0 : 1,
                }),
                render: (value, row) => {
                    if (row.type === 'summary') {
                        return '';
                    }
                    if (!value?.price) {
                        return "-";
                    }
                    const percent = row.limitTrade?.price > value?.price ? row.limitTrade?.price / value?.price : value?.price / row.limitTrade?.price

                    return `${value?.price} (${((percent - 1) * 100).toFixed(2)}%)`;
                }
            },
            {
                title: "Стоп время",
                dataIndex: "stopLossTrade",
                key: "stopLossTrade",
                onCell: (row, index) => ({
                    colSpan: row.type === 'summary' ? 0 : 1,
                }),
                render: (value, row) => row?.type !== 'summary' ? value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-" : ""
            },
            {
                title: "Тейк цена",
                dataIndex: "takeProfitTrade",
                key: "takeProfitTrade",
                onCell: (row, index) => ({
                    colSpan: row.type === 'summary' ? 0 : 1,
                }),
                render: (value, row) => {
                    if (row.type === 'summary') {
                        return '';
                    }
                    if (!value?.price) {
                        return "-";
                    }
                    const percent = row.limitTrade?.price > value?.price ? row.limitTrade?.price / value?.price : value?.price / row.limitTrade?.price

                    return `${value?.price} (${((percent - 1) * 100).toFixed(2)}%)`;
                }
            },
            {
                title: "Тейк время",
                dataIndex: "takeProfitTrade",
                key: "takeProfitTrade",
                render: (value, row) => row?.type !== 'summary' ? value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-" : ""
            },
            {
                title: "Финрез",
                dataIndex: "PnL",
                key: "PnL",
                align: "right",
                render: (value, row) => row.PnL ? moneyFormat(row.PnL, "RUB", 2, 2) : "-"
            },
            width > 1200 && {
                title: "Действия",
                render: (value, row) => {
                    return row?.type !== 'summary' ?
                        <Link
                            to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2ClimitOrderTrade%2CnewSMT%2CsmartTrend`}
                            target="_blank">Тестер</Link> : '';
                }
            }
        ].filter(Boolean);

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
                PnL: row.limitTrade?.side === "buy" ?
                    accTradesOrdernoQtyMap[row.limitTrade?.orderno] * ((row.stopLossTrade?.price || row.takeProfitTrade?.price) - row.limitTrade?.price)
                    : row.limitTrade?.side === "sell" ?
                        accTradesOrdernoQtyMap[row.limitTrade?.orderno] * (row.limitTrade?.price - (row.stopLossTrade?.price || row.takeProfitTrade?.price)) : undefined
            }))
            .sort((a, b) => b.limitTrade?.date.localeCompare(a.limitTrade?.date)), [stopFrom, stopTo, selectedName, selectedTicker, selectedTF, accTradesOrdernoQtyMap, patterns]);

        const historyTableData = useMemo(() => {
            let data = history.map((p: any) => ({
                ...p,
                id: getPatternKey(p),
            }));

            const dayPositionsWithSummaryMap = {};
            for (let i = 0; i < data.length; i++) {
                const currentDay = moment(data[i].limitTrade?.date).format(
                    'YYYY-MM-DD',
                );
                if (!dayPositionsWithSummaryMap[currentDay]) {
                    const currentDayPositions = data.filter(
                        (p) => moment(p.limitTrade?.date).format('YYYY-MM-DD') === currentDay,
                    );

                    const profitTrades = currentDayPositions.filter(p => p.PnL > 0);
                    const lossTrades = currentDayPositions.filter(p => p.PnL < 0);

                    dayPositionsWithSummaryMap[currentDay] = [
                        {
                            type: 'summary',
                            PnL: summ(currentDayPositions.map((p) => p.PnL)),
                            openDate: currentDay,
                            stats: {
                                profitTrades,
                                lossTrades
                            }
                        },
                    ];
                    dayPositionsWithSummaryMap[currentDay].push(...currentDayPositions);
                }
            }

            data = Object.entries(dayPositionsWithSummaryMap)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([key, value]) => value)
                .flat();

            return data;
        }, [history]);

        const _markers: SeriesMarker<Time>[] = useMemo(() => [tradesOrdernoMap[selectedPattern?.limitOrderNumber], tradesMap[selectedPattern?.stopTradeId], tradesMap[selectedPattern?.takeTradeId]].filter(Boolean).map(t => ({
                time: roundTime(t.date, tf, false),
                position: t.side === "buy" ? "belowBar" : "aboveBar",
                color: t.side === "buy" ? "rgb(19,193,123)" : "rgb(255,117,132)",
                shape: t.side === "buy" ? "arrowUp" : "arrowDown",
                // size: t.volume,
                id: t.id,
                value: t.price,
                size: 2
                // text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
            }))
            , [tradesOrdernoMap, selectedPattern, tradesMap]);

        const pageSize = 12;

        const items: TabsProps["items"] = [
            {
                key: "positions",
                label: "Позиции",
                children:
                    <Table size="small" dataSource={positions} columns={positionsColumns}
                           pagination={{
                               pageSize,
                           }}
                           onRow={(record) => {
                               return {
                                   onClick: () => onSelect(record),
                                   className: "hoverable",
                                   style: symbol === record.ticker ? {backgroundColor: "rgba(179, 199, 219, .2)"} : undefined
                               };
                           }}/>
            },
            {
                key: "orders",
                label: "Заявки",
                children:
                    <Table size="small" dataSource={orders} columns={columns}
                           pagination={{
                               pageSize,
                           }}
                           onRow={(record: any) => {
                               return {
                                   onClick: () => onSelect(record),
                                   className: "hoverable",
                                   style: symbol === record.ticker ? {backgroundColor: "rgba(179, 199, 219, .2)"} : undefined
                               };
                           }}/>
            },
            {
                key: "history",
                label: "История сделок",
                children:
                    <Table size="small" dataSource={historyTableData} columns={historyColumns as any} rowKey={getPatternKey}
                           pagination={{
                               pageSize,
                           }}
                           onRow={(record) => {
                               return {
                                   style: getPatternKey(selectedPattern) === getPatternKey(record) ? {backgroundColor: "rgba(179, 199, 219, .2)"} : record.PnL < 0 ? {
                                       backgroundColor: "#d1261b66",
                                       color: "rgb(255, 117, 132)"
                                   } : record.PnL > 0 ? {
                                       backgroundColor: "#15785566",
                                       color: "rgb(44, 232, 156)"
                                   } : undefined,
                                   onClick: () => onSelect(record),
                                   className: "hoverable",
                               };
                           }}/>
            }
        ];

        const minDate = moment('2025-03-03T00:00:00.000Z');
        const min = minDate.unix()
        const max = moment().unix()

        const [{fromDate, toDate}, setDates] = useState({
            fromDate: min,
            toDate: 9999999999999
        });

        const filteredHistory = history.filter(c => moment(c.limitTrade?.date).unix() >= fromDate && moment(c.limitTrade?.date).unix() <= toDate);

        const NametotalPnL = useMemo(() => filteredHistory.filter(p => p.PnL).reduce((acc, curr) => {
            if (!acc[curr.pattern]) {
                acc[curr.pattern] = 0;
            }
            acc[curr.pattern] += curr.PnL;
            return acc;
        }, {}), [filteredHistory])
        const Namelosses = useMemo(() => filteredHistory.filter(p => p.PnL < 0).reduce((acc, curr) => {
            if (!acc[curr.pattern]) {
                acc[curr.pattern] = 0;
            }
            acc[curr.pattern]++;
            return acc;
        }, {}), [filteredHistory])
        const Nameprofits = useMemo(() => filteredHistory.filter(p => p.PnL > 0).reduce((acc, curr) => {
            if (!acc[curr.pattern]) {
                acc[curr.pattern] = 0;
            }
            acc[curr.pattern]++;
            return acc;
        }, {}), [filteredHistory])

        const totalPnL = useMemo(() => filteredHistory.filter(p => p.PnL).reduce((acc, curr) => {
            if (!acc[curr.timeframe]) {
                acc[curr.timeframe] = 0;
            }
            acc[curr.timeframe] += curr.PnL;
            return acc;
        }, {}), [filteredHistory])
        const losses = useMemo(() => filteredHistory.filter(p => p.PnL < 0).reduce((acc, curr) => {
            if (!acc[curr.timeframe]) {
                acc[curr.timeframe] = 0;
            }
            acc[curr.timeframe]++;
            return acc;
        }, {}), [filteredHistory])
        const profits = useMemo(() => filteredHistory.filter(p => p.PnL > 0).reduce((acc, curr) => {
            if (!acc[curr.timeframe]) {
                acc[curr.timeframe] = 0;
            }
            acc[curr.timeframe]++;
            return acc;
        }, {}), [filteredHistory])

        const timeframes = useMemo(() => Array.from(new Set(filteredHistory.filter(p => p.timeframe).map(p => p.timeframe))).sort((a, b) => a - b), [filteredHistory]);

        const names = useMemo(() => Array.from(new Set(filteredHistory.filter(p => p.pattern).map(p => p.pattern))).sort((a, b) => a - b), [filteredHistory]);

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

        const _cells = [
            ...names.map(name => <Card bordered={false}>
                <Statistic
                    title={`Общий финрез ${name}`}
                    value={moneyFormat(NametotalPnL[name], 'RUB', 2, 2)}
                    precision={2}
                    valueStyle={{color: NametotalPnL[name] > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                />
            </Card>),
            ...names.map(name => <Card bordered={false}>
                <Statistic
                    title={`Прибыльных сделок ${name}`}
                    value={Nameprofits[name]}
                    valueStyle={{color: "rgb(44, 232, 156)"}}
                    suffix={`(${!Nameprofits[name] ? 0 : (Nameprofits[name] * 100 / ((Nameprofits[name] || 0) + (Namelosses[name] || 0))).toFixed(2)})%`}
                />
            </Card>),
            ...names.map(name => <Card bordered={false}>
                <Statistic
                    title={`Убыточных сделок ${name}`}
                    value={Namelosses[name]}
                    valueStyle={{color: "rgb(255, 117, 132)"}}
                    suffix={`(${!Namelosses[name] ? 0 : (Namelosses[name] * 100 / ((Nameprofits[name] || 0) + (Namelosses[name] || 0))).toFixed(2)})%`}
                />
            </Card>),
            ...timeframes.map(tf =>
                <Card bordered={false}>
                    <Statistic
                        title={`Общий финрез ${timeframeLabelMap[tf]}`}
                        value={moneyFormat(totalPnL[tf], 'RUB', 2, 2)}
                        precision={2}
                        valueStyle={{color: totalPnL[tf] > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                    />
                </Card>),
            ...timeframes.map(tf => <Card bordered={false}>
                <Statistic
                    title={`Прибыльных сделок ${timeframeLabelMap[tf]}`}
                    value={profits[tf]}
                    valueStyle={{color: "rgb(44, 232, 156)"}}
                    suffix={`(${!profits[tf] ? 0 : (profits[tf] * 100 / ((profits[tf] || 0) + (losses[tf] || 0))).toFixed(2)})%`}
                />
            </Card>),
            ...timeframes.map(tf => <Card bordered={false}>
                <Statistic
                    title={`Убыточных сделок ${timeframeLabelMap[tf]}`}
                    value={losses[tf]}
                    valueStyle={{color: "rgb(255, 117, 132)"}}
                    suffix={`(${!losses[tf] ? 0 : (losses[tf] * 100 / ((profits[tf] || 0) + (losses[tf] || 0))).toFixed(2)})%`}
                />
            </Card>)
        ]


        const {swings, trend, boses, orderBlocks} = useMemo(() => calculateTesting(candles, defaultConfig), [candles])

        const primitives = useMemo(() => {
            const lastCandle = candles[candles.length - 1];
            const _primitives = [];
            const checkShow = (ob) => {
                let result = false;
                if (!ob) {
                    return false;
                }
                if (!Boolean(ob.endCandle)) {
                    result = true;
                }
                if (Boolean(ob.endCandle)) {
                    result = true;
                }
                if (ob.isSMT) {
                    result = false;
                }
                return result;
            }
            _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, checkShow, lastCandle));

            _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, checkShow, lastCandle));

            return _primitives;
        }, [orderBlocks, candles])

        const markers = useMemo(() => {
            const allMarkers: any[] = [..._markers];
            const checkShow = (ob) => {
                let result = false;
                if (!ob) {
                    return false;
                }
                if (!Boolean(ob.endCandle)) {
                    result = true;
                }
                if (Boolean(ob.endCandle)) {
                    result = true;
                }
                if (ob.isSMT) {
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

            allMarkers.push(...swingsToMarkers(swings))

            return allMarkers;
        }, [swings, orderBlocks, _markers]);

        const lineSerieses = useMemo(() => bosesToLineSerieses(boses), [boses]);

        const _rows = useMemo(() => {
            const _rows = [];
            const span = width > 1200 ? 4 : width > 440 ? 8 : 12;
            const multi = 24 / span;
            const rowsCount = Math.ceil(_cells.length * span / 24);
            for (let i = 0; i < rowsCount; i++) {
                const cells = _cells.slice(i * multi, i * multi + multi);
                _rows.push(cells.map(c => <Col span={span}>{c}</Col>));
            }

            return _rows;
        }, [_cells, width]);

        return (
            <Space direction="vertical" style={{width: '100%'}}>
                <div style={{margin: '0 40px'}}>
                    <Slider range defaultValue={[fromDate, toDate]} marks={marks}
                            onChange={([fromDate, toDate]) => setDates({fromDate, toDate})}
                            tooltip={{formatter: val => moment(val * 1000).format('YYYY-MM-DD')}}
                            min={min} step={60 * 60 * 24} max={moment().unix()}/>
                </div>

                {_rows.map(cells => <Row gutter={8}>
                    {cells}
                </Row>)}

                <Row gutter={8}>
                    <Col span={width > 1200 ? 16 : 24}>
                        <Tabs defaultActiveKey="positions" activeKey={tab} items={items} onChange={onChange}
                              tabBarExtraContent={width > 1200 && <TabExtra/>}/>
                    </Col>
                    {width > 1200 && <Col span={8}>
                        <Chart {...props} data={candles
                            .filter(candle => !notTradingTime(candle))} lineSerieses={lineSerieses} primitives={primitives}
                               ema={[]} markers={markers}/>
                    </Col>}
                </Row>
            </Space>
        );
    }
;
export const summ = (numbers: number[]) =>
    numbers.reduce((acc, curr) => acc + curr, 0);

export default MainPage;
