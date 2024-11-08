import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {Card, Col, Layout, Row, Space, Statistic, Table, Tabs, TabsProps, theme} from "antd";
import {useCandlesQuery, usePortfolioQuery} from "./api";
import {
    ColorType,
    createChart,
    CrosshairMode,
    ISeriesApi,
    LineStyle,
    SeriesMarker,
    SeriesType,
    Time,
    UTCTimestamp
} from "lightweight-charts";
import moment from "moment";
import {useSearchParams} from "react-router-dom";
import {Point, Rectangle, RectangleDrawingToolOptions} from "./lwc-plugins/rectangle-drawing-tool.ts";
import {ensureDefined} from "./lwc-plugins/helpers/assertions.ts";

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const roundTime = (date: any, tf: string, utc: boolean = true) => {
    // const time = new Date(date).getTime() / 1000;
    // const diff = time % (Number(tf));
    // const roundedTime = time - diff;

    const timestamp = new Date(date).getTime() / 1000;

    // Конвертируем таймфрейм из минут в миллисекунды
    const timeframeMs = Number(tf);

    // Рассчитываем ближайшую "свечу", округляя до ближайшего целого
    const roundedTimestamp = Math.floor(timestamp / timeframeMs) * timeframeMs;

    return (utc ? timeToLocal(roundedTimestamp) : roundedTimestamp) as UTCTimestamp;
    // return timeToLocal(roundedTime) as UTCTimestamp;
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

export const createRectangle = (_series: ISeriesApi<SeriesType>, orderBlock, options: Partial<RectangleDrawingToolOptions>) => {
    const rectangle = new Rectangle(orderBlock.leftTop, orderBlock.rightBottom, {...options});
    ensureDefined(_series).attachPrimitive(rectangle);
}

export const ChartComponent = props => {
    const {
        data,
        emas,
        tf,
        markers,
        position, take, stop,
        orderBlock,
        imbalance,
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

                        return moment.unix(businessDayOrTimestamp / 1000).format('MMM D, YYYY HH:mm');
                    }
                },
                timeScale: {
                    rightOffset: 10,  // это создаст отступ на 10 временных единиц вправо
                    tickMarkFormatter: (time, tickMarkType, locale) => {
                        // Преобразуем время в формат, используя moment.js
                        return moment.unix(time / 1000).format('HH:mm'); // Измените формат, если нужно
                    },
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
                priceLineVisible: false,
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
            }

            if (imbalance) {
                createRectangle(newSeries, imbalance, {
                    fillColor: 'rgba(179, 199, 219, .2)',
                    showLabels: false,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderWidth: 2,
                    borderColor: '#222'
                })
            }

            if (orderBlock) {
                createRectangle(newSeries, orderBlock, {
                    fillColor: 'rgba(255, 100, 219, 0.2)',
                    showLabels: false,
                    borderWidth: 0,
                })
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
                    // baseLineColor: color,
                    // baseLineVisible: false,
                    priceLineVisible: false,
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

                const buyMarkers = markers.filter(p => p.position === "belowBar").sort((a: any, b: any) => a.time - b.time);

                buySeries.setData(Object.values<any>(buyMarkers.reduce((acc, curr) => ({
                    ...acc,
                    [curr.time as any]: curr
                }), {})).sort((a: any, b: any) => a.time - b.time));

                buySeries.setMarkers(buyMarkers);

                const sellSeries = chart.addLineSeries({
                    color: "rgba(255, 255, 255, 0)", // hide or show the line by setting opacity
                    lineVisible: false,
                    lastValueVisible: false, // hide value from y axis
                    priceLineVisible: false
                });

                const sellMarkers = markers.filter(p => p.position === "aboveBar").sort((a: any, b: any) => a.time - b.time);

                const values = Object.values<any>(sellMarkers.reduce((acc, curr) => ({
                    ...acc,
                    [curr.time as any]: curr
                }), {})).sort((a: any, b: any) => a.time - b.time)

                sellSeries.setData(values);

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

        const getPatternKey = useCallback(pattern => `${pattern.ticker}_${pattern.timeframe}_${pattern.liquidSweepTime}`, []);

        const [searchParams, setSearchParams] = useSearchParams();
        const symbol = searchParams.get("ticker") || "SBER";
        const tf = searchParams.get("tf") || "1800";

        const tab = searchParams.get('tab') || 'positions';

        const selectedKey = getPatternKey({
            ticker: searchParams.get("ticker"),
            timeframe: searchParams.get("tf"),
            liquidSweepTime: searchParams.get("liquidSweepTime")
        })

        const {data: portfolio = {}} = usePortfolioQuery(undefined, {
            pollingInterval: 10000
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
        if(!selectedPattern){
            return undefined;
        }
        if(selectedPattern.takeProfitTrade){
            return moment(selectedPattern.takeProfitTrade.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
        }
        if(selectedPattern.stopLossTrade){
            return moment(selectedPattern.stopLossTrade.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
        }
        if(selectedPattern.takeProfit){
            return moment(selectedPattern.takeProfit.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
        }
        if(selectedPattern.stopLoss){
            return moment(selectedPattern.stopLoss.date).add(+(Number(selectedPattern?.timeframe) / 3600), "days").unix().toString();
        }
        return undefined;
    }, [selectedPattern]);

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
            from: moment(selectedPattern?.liquidSweepTime).add(-(Number(selectedPattern?.timeframe) / 1800), "days").unix().toString(),
            to
        }, {
            skip: !symbol || !selectedPattern,
            pollingInterval: 10000,
        });

        const candles = data.candles.history;

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
                title: "Пересвип",
                dataIndex: "liquidSweepTime",
                key: "liquidSweepTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            {
                title: "ОБ",
                dataIndex: "orderblockTime",
                key: "orderblockTime",
                render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
            },
            {
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
                title: "Стоп цена",
                dataIndex: "stopLossTrade",
                key: "stopLossTrade",
                render: (value, row) => {
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
                render: (value, row) => value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-"
            },
            {
                title: "Тейк цена",
                dataIndex: "takeProfitTrade",
                key: "takeProfitTrade",
                render: (value, row) => {
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
                render: (value, row) => value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-"
            },
            {
                title: "Финрез",
                dataIndex: "PnL",
                key: "PnL",
                align: "right",
                render: (value, row) => row.PnL ? moneyFormat(row.PnL, "RUB", 2, 2) : "-"
            },
        ];

        function onSelect(record: any): void {
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

        const positions = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && p.limitTradeId && p.stopLoss?.status === "working"), [patterns]);
        const orders = useMemo(() => patterns.filter(p => !p.takeTradeId && !p.stopTradeId && !p.limitTradeId), [patterns]);
        const history = useMemo(() => patterns.filter(p => p.takeTradeId || p.stopTradeId).map(row => ({
            ...row,
            PnL: row.limitTrade?.side === "buy" ? accTradesOrdernoQtyMap[row.limitTrade?.orderno] * ((row.stopLossTrade?.price || row.takeProfitTrade?.price) - row.limitTrade?.price) : row.limitTrade?.side === "sell" ? accTradesOrdernoQtyMap[row.limitTrade?.orderno] * (row.limitTrade?.price - (row.stopLossTrade?.price || row.takeProfitTrade?.price)) : undefined
        })).sort((a, b) => b.limitTrade?.date.localeCompare(a.limitTrade?.date)), [accTradesOrdernoQtyMap, patterns]);

        const markers: SeriesMarker<Time>[] = useMemo(() => [tradesOrdernoMap[selectedPattern?.limitOrderNumber], tradesMap[selectedPattern?.stopTradeId], tradesMap[selectedPattern?.takeTradeId]].filter(Boolean).map(t => ({
                time: roundTime(t.date, tf, false) * 1000,
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

        const lastCandle = candles?.[candles?.length - 1];

        const orderBlock = useMemo(() => {
            if (selectedPattern?.orderblockHigh && selectedPattern?.orderblockLow && selectedPattern?.orderblockTime) {
                let rightTime;
                if (position)
                    rightTime = (roundTime(position.date, tf, false) + Number(tf) * 4) * 1000;
                if (lastCandle)
                    rightTime = (roundTime((lastCandle?.time * 1000), tf, false)) * 1000;
                if (!rightTime) {
                    return undefined;
                }

                const orderblockTime = new Date(selectedPattern?.orderblockTime).getTime();

                const leftTop = {
                    price: Number(selectedPattern?.orderblockHigh),
                    time: (orderblockTime) as Time
                } as Point
                const rightBottom = {
                    time: rightTime,
                    price: Number(selectedPattern?.orderblockLow)
                } as Point

                return {leftTop, rightBottom}
            }

            return undefined;
        }, [selectedPattern, position, lastCandle]);

        const imbalance = useMemo(() => {
            if (selectedPattern?.imbalanceHigh && selectedPattern?.imbalanceLow && selectedPattern?.imbalanceTime && selectedPattern?.orderblockHigh && selectedPattern?.orderblockLow && selectedPattern?.orderblockTime) {

                const orderBlockPrice = selectedPattern?.orderblockLow >= selectedPattern?.imbalanceHigh ? selectedPattern?.orderblockLow : selectedPattern?.orderblockHigh;
                const imbalancePrice = selectedPattern?.orderblockLow >= selectedPattern?.imbalanceHigh ? selectedPattern?.imbalanceHigh : selectedPattern?.imbalanceLow;

                const orderblockTime = new Date(selectedPattern?.orderblockTime).getTime();
                const imbalanceTime = new Date(selectedPattern?.imbalanceTime).getTime();

                const leftTop = {
                    price: Number(orderBlockPrice),
                    time: Number(orderblockTime) as Time
                } as Point
                const rightBottom = {time: Number(imbalanceTime), price: Number(imbalancePrice)} as Point

                return {leftTop, rightBottom}
            }

            return undefined;
        }, [selectedPattern]);

        const items: TabsProps["items"] = [
            {
                key: "positions",
                label: "Позиции",
                children:
                    <Table size="small" dataSource={positions} columns={positionsColumns}
                           pagination={{
                               pageSize: 16,
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
                               pageSize: 16,
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
                    <Table size="small" dataSource={history} columns={historyColumns as any} rowKey={getPatternKey}
                           pagination={{
                               pageSize: 16,
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

        const totalPnL = history.filter(p => p.PnL).reduce((acc, curr) => acc + curr.PnL, 0); // useMemo(() => history.filter(p => p.PnL && !blacklist[getPatternKey(p)]).reduce((acc, curr) => acc + curr.PnL, 0), [history, blacklist]);
        const losses = history.filter(p => p.PnL < 0).length
        // useMemo(() => history.filter(p => p.PnL < 0 && !blacklist[getPatternKey(p)]).length, [history, blacklist]);
        const profits = history.filter(p => p.PnL > 0).length
        // useMemo(() => history.filter(p => p.PnL > 0 && !blacklist[getPatternKey(p)]).length, [history, blacklist]);

        const emas = [{
            array: data.ema20, color: 'rgba(255, 0, 0, 0.65)', title: 'ema20'
        }, {
            array: data.ema50, color: 'rgba(255, 127, 0, 0.65)', title: 'ema50'
        }, {
            array: data.ema100, color: 'rgba(0, 255, 255, 0.65)', title: 'ema100'
        }, {
            array: data.ema200, color: 'rgba(0, 0, 255, 0.65)', title: 'ema200'
        }];

        return (
            <Layout>
                <Content
                    style={{
                        padding: 8,
                        margin: 0,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG
                    }}
                >
                    <Space direction="vertical" style={{width: '100%'}}>
                        <Row gutter={8}>
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
                        <div style={{display: 'grid', gridTemplateColumns: 'auto 1100px', gap: '8px'}}>
                            <ChartComponent {...props} data={candles} emas={emas} stop={stop} take={take} tf={tf}
                                            markers={markers}
                                            orderBlock={orderBlock}
                                            imbalance={imbalance}
                                            position={position}/>
                            <Tabs defaultActiveKey="positions" activeKey={tab} items={items} onChange={onChange}/>
                        </div>
                    </Space>
                </Content>
            </Layout>
        );
    }
;

export default App;
