import React, {useEffect, useMemo, useRef, useState} from "react";
import {Card, Col, Layout, Radio, RadioChangeEvent, Row, Space, Statistic, Table, Tabs, TabsProps, theme} from "antd";
import {useCandlesQuery, usePortfolioQuery} from "./api";
import {ColorType, createChart, CrosshairMode, LineStyle, SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";
import moment from "moment";
import {useSearchParams} from "react-router-dom";
import dayjs from "dayjs";
import {Point, RectangleDrawingTool} from "./lwc-plugins/rectangle-drawing-tool.ts";

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const roundTime = (date: string, tf: string) => {
    const time = new Date(date).getTime() / 1000;
    const diff = time % (Number(tf));
    const roundedTime = time - diff;
    return timeToLocal(roundedTime) as UTCTimestamp;
};

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

const {Content} = Layout;

export const ChartComponent = props => {
    const {
        data,
        emas,
        tf,
        markers,
        position, take, stop,
        orderBlock,
        colors: {
            backgroundColor = "rgb(30,44,57)",
            color = "rgb(166,189,213)",
            borderColor = "rgba(44,60,75, 0.6)",
            // backgroundColor = "white",
            lineColor = "#2962FF",
            textColor = "black",
            areaTopColor = "#2962FF",
            areaBottomColor = "rgba(41, 98, 255, 0.28)"
        } = {}
    } = props;

    const chartContainerRef = useRef<any>();

    useEffect(
        () => {
            if (!data.length) return;

            const handleResize = () => {
                chart.applyOptions({width: chartContainerRef.current.clientWidth});
            };

            const chart = createChart(chartContainerRef.current, {
                crosshair: {
                    mode: CrosshairMode.Normal
                },
                localization: {
                    locale: "ru-RU",
                    // priceFormatter,
                    timeFormatter: function (businessDayOrTimestamp) {

                        // if (LightweightCharts.isBusinessDay(businessDayOrTimestamp)) {
                        //     return 'Format for business day';
                        // }

                        return dayjs(businessDayOrTimestamp).format("MMM D, YYYY HH:mm");
                    }
                },
                grid: {
                    vertLines: {
                        color: borderColor
                    },

                    horzLines: {
                        color: borderColor
                    }
                },
                layout: {
                    // Фон
                    background: {type: ColorType.Solid, color: "rgb(30,44,57)"},
                    textColor: color
                },
                width: chartContainerRef.current.clientWidth,
                height: 700
            });

            const newSeries = chart.addCandlestickSeries({
                downColor: "rgb(157, 43, 56)",
                borderDownColor: "rgb(213, 54, 69)",
                upColor: "rgb(20, 131, 92)",
                borderUpColor: "rgb(11, 176, 109)",
                wickUpColor: "rgb(11, 176, 109)",
                wickDownColor: "rgb(213, 54, 69)",
                lastValueVisible: false,
                priceLineVisible: false
            });
            newSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.1, // highest point of the series will be 10% away from the top
                    bottom: 0.4, // lowest point will be 40% away from the bottom
                },
            });

            const volumeSeries = chart.addHistogramSeries({
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '', // set as an overlay by setting a blank priceScaleId
            });
            volumeSeries.priceScale().applyOptions({
                // set the positioning of the volume series
                scaleMargins: {
                    top: 0.7, // highest point of the series will be 70% away from the top
                    bottom: 0,
                },
            });
            volumeSeries?.setData(data.map((d: any) => ({
                ...d,
                time: d.time * 1000,
                value: d.volume,
                color: d.open < d.close ? 'rgb(20, 131, 92)' : 'rgb(157, 43, 56)'
            })));

            if (position) {
                newSeries.createPriceLine({
                    price: position.avgPrice || position.price,
                    color: "rgb(166, 189, 213)",
                    lineStyle: LineStyle.Solid,
                    lineWidth: 1
                });

                if (orderBlock) {
                    // const vertLine = new VertLine(chart, newSeries, orderBlock.time, {
                    //     showLabel: true,
                    //     labelText: "OB",
                    //     width: 1,
                    //     color: "rgb(166, 189, 213)",
                    //     labelTextColor: "rgb(166, 189, 213)",
                    //     labelBackgroundColor: "rgb(23, 35, 46)"
                    // });
                    // newSeries.attachPrimitive(vertLine);

                    new RectangleDrawingTool(
                        chart,
                        newSeries,
                        {
                            previewFillColor: 'rgba(179, 199, 219, .2)',
                            fillColor: 'rgba(179, 199, 219, .2)',
                            showLabels: false,
                        },
                        orderBlock
                    );
                }
            }

            if (take) {
                newSeries.createPriceLine({
                    price: take.stopPrice,
                    color: take.side === "buy" ? "rgb(20, 131, 92)" : "rgb(157, 43, 56)",
                    lineStyle: LineStyle.Dashed,
                    lineWidth: 1
                });
            }

            if (stop) {
                newSeries.createPriceLine({
                    price: stop.stopPrice,
                    color: stop.side === "buy" ? "rgb(20, 131, 92)" : "rgb(157, 43, 56)",
                    lineStyle: LineStyle.Dashed,
                    lineWidth: 1
                });
            }

            newSeries.setData(data.map(t => ({...t, time: t.time * 1000})));

            emas.forEach(({array, color, title}) => {
                const emaSeries = chart.addLineSeries({
                    priceLineColor: color,
                    baseLineColor: color,
                    color,
                    title,
                    lineWidth: 1
                });
                const momentData = data.map((d, i) => ({time: d.time * 1000, value: array[i]}));
                emaSeries.setData(momentData);
            })

            chart.timeScale().fitContent();


            if (markers && markers.length > 0) {
                const firstBuy: any = markers.find(p => p.position === "belowBar");
                const firstSell: any = markers.find(p => p.position === "aboveBar");

                firstBuy && newSeries.createPriceLine({
                    price: firstBuy.value,
                    color: "rgb(20, 131, 92)",
                    lineWidth: 1,
                    lineStyle: LineStyle.SparseDotted,
                    axisLabelVisible: true
                    // title: 'maximum price',
                });

                firstSell && newSeries.createPriceLine({
                    price: firstSell.value,
                    color: "rgb(157, 43, 56)",
                    lineWidth: 1,
                    lineStyle: LineStyle.SparseDotted,
                    axisLabelVisible: true
                    // title: 'maximum price',
                });

                const buySeries = chart.addLineSeries({
                    color: "rgba(255, 255, 255, 0)", // hide or show the line by setting opacity
                    lineVisible: false,
                    lastValueVisible: false, // hide value from y axis
                    priceLineVisible: false
                });

                const buyMarkers = markers.filter(p => p.position === "belowBar");

                buySeries.setData(Object.values(buyMarkers.reduce((acc, curr) => ({
                    ...acc,
                    [curr.time as any]: curr
                }), {})));

                buySeries.setMarkers(buyMarkers);

                const sellSeries = chart.addLineSeries({
                    color: "rgba(255, 255, 255, 0)", // hide or show the line by setting opacity
                    lineVisible: false,
                    lastValueVisible: false, // hide value from y axis
                    priceLineVisible: false
                });

                const sellMarkers = markers.filter(p => p.position === "aboveBar");

                sellSeries.setData(Object.values(sellMarkers.reduce((acc, curr) => ({
                    ...acc,
                    [curr.time as any]: curr
                }), {})));

                sellSeries.setMarkers(sellMarkers);
            }

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);

                chart.remove();
            };
        },
        [position, tf, take, stop, data, emas, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]
    );

    return (
        <div
            ref={chartContainerRef}
        />
    );
};

const App: React.FC = () => {
    const {
        token: {colorBgContainer, borderRadiusLG}
    } = theme.useToken();

    const [selectedEma, setSelectedEma] = useState(undefined);
    const [searchParams, setSearchParams] = useSearchParams();
    const symbol = searchParams.get("symbol") || "SBER";
    const tf = searchParams.get("tf") || "1800";
    const from = searchParams.get("from") || moment().add(-7, "days").unix();
    const takeOrderNumber = searchParams.get("takeOrderNumber") || "";
    const stopOrderNumber = searchParams.get("stopOrderNumber") || "";
    const limitOrderNumber = searchParams.get("limitOrderNumber") || "";

    const stopTradeId = searchParams.get("stopTradeId") || "";
    const limitTradeId = searchParams.get("limitTradeId") || "";
    const takeTradeId = searchParams.get("takeTradeId") || "";

    const orderblockLow = searchParams.get("orderblockLow") || "";
    const orderblockHigh = searchParams.get("orderblockHigh") || "";
    const orderblockTime = searchParams.get("orderblockTime") || "";
    const orderblockOpen = searchParams.get("orderblockOpen") || "";

    const {
        data = {
            candles: {
                history: []
            }
        }
    } = useCandlesQuery({
        symbol,
        tf,
        emaPeriod: 100,
        from
    }, {
        skip: !symbol
    });

    const candles = data.candles.history;

    const {data: portfolio = {}} = usePortfolioQuery();

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

    const tradesOrdernoMap = useMemo(() => portfolio?.trades?.reduce((acc, curr) => {
        acc[curr.orderno] = curr;
        return acc;
    }, {}) || {}, [portfolio?.trades]);


    const getCandleIndex = (time: number) => {
        const index = candles.findIndex(c => c.time === roundTime(time, tf));
        index === -1 && console.log(index);
        return index
    }
    // Получить индекс свечки на которой была
    const patterns = useMemo(() => (portfolio.patterns || []).map(p => ({
        ...p,
        limit: ordersMap[p.limitOrderNumber],
        limitTrade: tradesMap[p.limitTradeId],
        stopLoss: stopordersMap[p.stopOrderNumber],
        stopLossTrade: tradesMap[p.stopTradeId],
        takeProfit: stopordersMap[p.takeOrderNumber],
        takeProfitTrade: tradesMap[p.takeTradeId]
    })).filter((r) => !data?.[selectedEma] || (r.side === 'buy' ? data?.[selectedEma][getCandleIndex(new Date(r.limitTrade.date).getTime())] < Number(r.limitTrade.price) : data?.[selectedEma][getCandleIndex(new Date(r.limitTrade.date).getTime())] > Number(r.limitTrade.price))), [portfolio.patterns, stopordersMap, ordersMap, tradesMap, selectedEma, data]);

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
        {
            title: "Время пересвипа",
            dataIndex: "liquidSweepTime",
            key: "liquidSweepTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "Время ОБ",
            dataIndex: "orderblockTime",
            key: "orderblockTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "Цена входа",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value) => value?.price || "-"
        },
        {
            title: "Время входа",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value, row) => row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
        },
        {
            title: "Стоп-лосс",
            dataIndex: "stopLoss",
            key: "stopLoss",
            render: (value) => value?.stopPrice || "-"
        },
        // {
        //   title: "stopLossTime",
        //   dataIndex: "stopLoss",
        //   key: "stopLoss",
        //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
        // },
        {
            title: "Тейк-профит",
            dataIndex: "takeProfit",
            key: "takeProfit",
            render: (value) => value?.stopPrice || "-"
        }
        // {
        //   title: "takeProfitTime",
        //   dataIndex: "takeProfit",
        //   key: "takeProfit",
        //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
        // },
    ];

    const columns = [
        {
            title: "Ticker",
            dataIndex: "ticker",
            key: "ticker"
        },
        {
            title: "pattern",
            dataIndex: "pattern",
            key: "pattern"
        },
        {
            title: "liquidSweepTime",
            dataIndex: "liquidSweepTime",
            key: "liquidSweepTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "orderblockTime",
            dataIndex: "orderblockTime",
            key: "orderblockTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "limit",
            dataIndex: "limit",
            key: "limit",
            render: (value) => value?.price || "-"
        },
        {
            title: "limitTime",
            dataIndex: "limit",
            key: "limit",
            render: (value) => value?.updateTime ? moment(value?.updateTime).format("YYYY-MM-DD HH:mm") : "-"
        },
        {
            title: "stopLoss",
            dataIndex: "stopLoss",
            key: "stopLoss",
            render: (value) => value?.stopPrice || "-"
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
        }
        // {
        //   title: "takeProfitTime",
        //   dataIndex: "takeProfit",
        //   key: "takeProfit",
        //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
        // },
    ];

    const historyColumns = [
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
        {
            title: "Тип",
            dataIndex: "side",
            key: "side",
            render: (value, row) => row?.limitTrade?.side || "-"
        },
        {
            title: "Время пересвип",
            dataIndex: "liquidSweepTime",
            key: "liquidSweepTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "Время ОБ",
            dataIndex: "orderblockTime",
            key: "orderblockTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        {
            title: "Цена входа",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value) => value?.price || "-"
        },
        {
            title: "Время входа",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value, row) => row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
        },
        {
            title: "Стоп-лосс",
            dataIndex: "stopLossTrade",
            key: "stopLossTrade",
            render: (value) => value?.price || "-"
        },
        {
            title: "Тейк-профит",
            dataIndex: "takeProfitTrade",
            key: "takeProfitTrade",
            render: (value) => value?.price || "-"
        },
        {
            title: "Финрез",
            dataIndex: "PnL",
            key: "PnL",
            align: "right",
            render: (value, row) => row.PnL ? moneyFormat(row.PnL, "RUB", 2, 2) : "-"
        }
    ];

    function onSelect(record: any): void {
        searchParams.set("symbol", record.ticker);
        searchParams.set("tf", record.timeframe);
        const diff = Number(record.timeframe) / 900;
        searchParams.set("from", moment(record.liquidSweepTime).add(-diff, "days").unix().toString());
        searchParams.set("stopOrderNumber", record.stopOrderNumber);
        searchParams.set("limitOrderNumber", record.limitOrderNumber);
        searchParams.set("takeOrderNumber", record.takeOrderNumber);

        searchParams.set("orderblockOpen", record.orderblockOpen);
        searchParams.set("orderblockHigh", record.orderblockHigh);
        searchParams.set("orderblockLow", record.orderblockLow);
        searchParams.set("orderblockTime", new Date(record.orderblockTime).getTime().toString());

        searchParams.set("stopTradeId", record.stopTradeId);
        searchParams.set("limitTradeId", record.limitTradeId);
        searchParams.set("takeTradeId", record.takeTradeId);
        setSearchParams(searchParams);
    }

    // const position = useMemo(() => portfolio?.positions?.find(p => p.symbol === symbol), [symbol, portfolio?.positions]);
    const position = useMemo(() => tradesOrdernoMap[limitOrderNumber], [limitOrderNumber, tradesOrdernoMap]);

    // const stop = useMemo(() => portfolio?.stoporders?.find(p => p.symbol === symbol && p.status === "working" && (p.side === "buy" ? p.condition === "LessOrEqual" : p.condition === "MoreOrEqual")), [symbol, portfolio?.positions]);

    // const take = useMemo(() => portfolio?.stoporders?.find(p => p.symbol === symbol && p.status === "working" && (p.side === "sell" ? p.condition === "LessOrEqual" : p.condition === "MoreOrEqual")), [symbol, portfolio?.positions]);

    const stop = useMemo(() => stopordersMap[stopOrderNumber], [stopOrderNumber, stopordersMap]);

    const take = useMemo(() => stopordersMap[takeOrderNumber], [takeOrderNumber, stopordersMap]);

    const onChange = (key: string) => {
        console.log(key);
    };

    const positions = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && p.limitTradeId && p.stopLoss?.status === "working"), [patterns]);
    const orders = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && !p.limitTradeId), [patterns]);
    const history = useMemo(() => patterns.filter(p => p.takeTradeId || p.stopTradeId).map(row => ({
        ...row,
        PnL: row.limitTrade?.side === "buy" ? row.limitTrade?.qtyUnits * ((row.stopLossTrade?.price || row.takeProfitTrade?.price) - row.limitTrade?.price) : row.limitTrade?.side === "sell" ? row.limitTrade?.qtyUnits * (row.limitTrade?.price - (row.stopLossTrade?.price || row.takeProfitTrade?.price)) : undefined
    })), [patterns]);

    const markers: SeriesMarker<Time>[] = useMemo(() => [tradesOrdernoMap[limitOrderNumber], tradesMap[stopTradeId], tradesMap[takeTradeId]].filter(Boolean).map(t => ({
            time: roundTime(t.date, tf) * 1000,
            position: t.side === "buy" ? "belowBar" : "aboveBar",
            color: t.side === "buy" ? "rgb(19,193,123)" : "rgb(255,117,132)",
            shape: t.side === "buy" ? "arrowUp" : "arrowDown",
            // size: t.volume,
            id: t.id,
            value: t.price,
            size: 2
            // text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
        }))
        , [tradesOrdernoMap, limitOrderNumber, stopTradeId, takeTradeId, tradesMap]);

    const orderBlock = useMemo(() => {
        if (orderblockHigh && orderblockLow && orderblockTime && position) {

            const leftTop = {price: Number(orderblockHigh), time: Number(orderblockTime) as Time} as Point
            const rightBottom = {time: roundTime(position.date, tf) * 1000, price: Number(orderblockLow)} as Point

            return {leftTop, rightBottom}
        }

        return undefined;
    }, [orderblockHigh, orderblockLow, orderblockTime, position]);

    const items: TabsProps["items"] = [
        {
            key: "1",
            label: "Позиции",
            children:
                <Table size="small" dataSource={positions} columns={positionsColumns}
                       onRow={(record) => {
                           return {
                               onClick: () => onSelect(record),
                               className: "hoverable",
                               style: symbol === record.ticker ? {backgroundColor: "rgba(179, 199, 219, .2)"} : undefined
                           };
                       }}/>
        },
        {
            key: "2",
            label: "Заявки",
            children:
                <Table size="small" dataSource={orders} columns={columns}
                       onRow={(record) => {
                           return {
                               onClick: () => onSelect(record)
                           };
                       }}/>
        },
        {
            key: "3",
            label: "История сделок",
            children:
                <Table size="small" dataSource={history} columns={historyColumns as any}
                       pagination={{
                           pageSize: 15
                       }}
                       onRow={(record) => {
                           return {
                               style: record.PnL < 0 ? {
                                   backgroundColor: "#d1261b66",
                                   color: "rgb(255, 117, 132)"
                               } : record.PnL > 0 ? {
                                   backgroundColor: "#15785566",
                                   color: "rgb(44, 232, 156)"
                               } : undefined,
                               onClick: () => onSelect(record)
                           };
                       }}/>
        }
    ];

    const totalPnL = useMemo(() => history.filter(p => p.PnL).reduce((acc, curr) => acc + curr.PnL, 0), [history]);
    const losses =
        useMemo(() => history.filter(p => p.PnL < 0).length, [history]);
    const profits =
        useMemo(() => history.filter(p => p.PnL > 0).length, [history]);

    const emas = [{
        array: data.ema20, color: 'rgba(255, 0, 0, 0.65)', title: 'ema20'
    }, {
        array: data.ema50, color: 'rgba(255, 127, 0, 0.65)', title: 'ema50'
    }, {
        array: data.ema100, color: 'rgba(0, 255, 255, 0.65)', title: 'ema100'
    }, {
        array: data.ema200, color: 'rgba(0, 0, 255, 0.65)', title: 'ema200'
    }];

    const onChangeCheckbox = (key: RadioChangeEvent) => {
        setSelectedEma(key.target.value);
    };

    return (
        <Layout>
            <Content
                style={{
                    padding: 24,
                    margin: 0,
                    minHeight: 280,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG
                }}
            >
                <Radio.Group onChange={onChangeCheckbox} value={selectedEma}>
                    {emas.map(ema => <Radio value={ema.title}>{ema.title}</Radio>)}
                </Radio.Group>
                <Space direction="vertical" style={{width: '100%'}}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Общий финрез"
                                    value={moneyFormat(totalPnL, 'RUB', 2, 2)}
                                    precision={2}
                                    valueStyle={{color: totalPnL > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Прибыльных сделок"
                                    value={profits}
                                    valueStyle={{color: "rgb(44, 232, 156)"}}
                                    suffix={`(${!profits ? 0 : (profits * 100 / (profits + losses)).toFixed(2)})%`}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Убыточных сделок"
                                    value={losses}
                                    valueStyle={{color: "rgb(255, 117, 132)"}}
                                    suffix={`(${!losses ? 0 : (losses * 100 / (profits + losses)).toFixed(2)})%`}
                                />
                            </Card>
                        </Col>
                    </Row>
                    <div style={{display: 'grid', gridTemplateColumns: 'auto 1000px'}}>
                        <ChartComponent {...props} data={candles} emas={emas} stop={stop} take={take} tf={tf}
                                        markers={markers}
                                        orderBlock={orderBlock}
                                        position={position}/>
                        <Tabs defaultActiveKey="1" items={items} onChange={onChange}/>
                    </div>
                </Space>
            </Content>
        </Layout>
    );
};

export default App;
