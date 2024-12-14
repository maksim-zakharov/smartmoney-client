// Функция для получения данных из Alor API
import {HistoryObject} from "./api";

import dayjs from 'dayjs';
import {Trend} from "./samurai_patterns";
import {
    AreaSeriesPartialOptions, BarSeriesPartialOptions, CandlestickSeriesPartialOptions,
    ChartOptions,
    createChart,
    DeepPartial, HistogramSeriesPartialOptions,
    IChartApi, ISeriesApi, ISeriesPrimitive, LineData, LineSeriesPartialOptions, PriceLineOptions,
    SeriesDataItemTypeMap,
    SeriesMarker, SeriesOptionsMap,
    SeriesType,
    Time
} from "lightweight-charts";
import {Options} from "@vitejs/plugin-react";
import {useEffect, useMemo, useState} from "react";
import {createRectangle} from "./MainPage";
import {Rectangle, RectangleDrawingToolOptions} from "./lwc-plugins/rectangle-drawing-tool";
import {ensureDefined} from "./lwc-plugins/helpers/assertions";

export async function fetchCandlesFromAlor(symbol, tf, fromDate?, toDate?, limit?) {
    let url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX`;
    if(limit){
        url += `&limit=${limit}`;
    }
    if(fromDate){
        url += `&from=${fromDate}`;
    }
    if(toDate){
        url += `&to=${toDate}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Ошибка при запросе данных");
        }

        const data = await response.json();
        return data.history;
    } catch (error) {
        console.error("Ошибка получения данных:", error);
    }
}

export const refreshToken = () => fetch(`https://oauth.alor.ru/refresh?token=${localStorage.getItem("token")}`, {
    method: "POST",
}).then(r => r.json()).then(r => r.AccessToken);

export const getSecurity = (symbol, token) => fetch(`https://api.alor.ru/md/v2/Securities/MOEX/${symbol}`, {
    headers: {
        "Authorization": `Bearer ${token}`,
    }
}).then(r => r.json())

export function getCommonCandles(stockCandles: HistoryObject[], futuresCandles: HistoryObject[]) {
    // Создаем множества временных меток для акций и фьючерсов
    const stockTimes = new Set(stockCandles.map(candle => candle.time));
    const futuresTimes = new Set(futuresCandles.map(candle => candle.time));

    // Находим пересечение временных меток
    const commonTimes = new Set([...stockTimes].filter(time => futuresTimes.has(time)));

    // Оставляем только те свечи, время которых есть в обоих массивах
    const filteredStockCandles = stockCandles.filter(candle => commonTimes.has(candle.time));
    const filteredFuturesCandles = futuresCandles.filter(candle => commonTimes.has(candle.time));

    return { filteredStockCandles, filteredFuturesCandles };
}

export function calculateMultiple(stockPrice: number, futurePrice: number) {
    const diffs = stockPrice / futurePrice;
    let dif;
    let diffsNumber = 1;
    if(diffs < 0.00009){
        diffsNumber = 100000;
    }
    else if(diffs < 0.0009){
        diffsNumber = 10000;
    }
    else if(diffs < 0.009){
        diffsNumber = 1000;
    }
    else if(diffs < 0.09){
        diffsNumber = 100;
    }
    else if(diffs < 0.9){
        diffsNumber = 10;
    }

    return diffsNumber;
}

export const calculateTakeProfit = ({
                                        side,
                                        openPrice,
                                        stopLoss,
                                        candles,
                                        multiStop = 1,
    maxDiff = 1
                                    }: { multiStop?: number, maxDiff?: number, side: 'short' | 'long', openPrice: number, stopLoss: number, candles: HistoryObject[] }): number => {
    if (maxDiff > 0) {
        const max = side === 'long' ? Math.max(...candles.map(c => c.high)) : Math.min(...candles.map(c => c.low));

        return side === 'long' ? openPrice + (max - openPrice) *  maxDiff : openPrice - (openPrice - max) * maxDiff;
    }
    return side === 'long' ? openPrice + Math.abs(stopLoss - openPrice) * multiStop : openPrice - Math.abs(stopLoss - openPrice) * multiStop;
};

export const persision = (num: number) => num ? num.toString().split('.')[1]?.length : 0;

export const notTradingTime = (candle: HistoryObject) => {
    const hours = new Date(candle.time * 1000).getHours();
    const minutes = new Date(candle.time * 1000).getMinutes();

    // Открытие утреннего аукциона
    if (hours > 2 && hours < 10) {
        return true;
    }

    // Открытие утренней сессии
    // хз удалять ли
    // if (hours === 10 && minutes === 0) {
    //   return true;
    // }

    // закрытие дневной сессии
    if (hours === 18 && minutes >= 45) {
        return true;
    }

    // Открытие вечерней сессии
    // хз удалять ли
    // if (hours === 19 && minutes === 0) {
    //   return true;
    // }

    return false;
};

export const calculateMOEXFutureFee = (side: 'buy' | 'sell', security: any, brokerFee = 0.5):number => {
    const cfiCodeExchangeFeeMap = {
        // Валюта
        'FFXCSX': 0.00660,
        // Акции
        'FFXPSX': 0.01980,
        // Товарка
        'FCXCSX': 0.01320
    }

    const exchangeFeePercent = cfiCodeExchangeFeeMap[security.cfiCode];
    if(!exchangeFeePercent){
        return 0;
    }

    const margin = side === 'buy'? security.marginbuy : security.marginsell;
    const exchangeFee = margin * exchangeFeePercent;

    return exchangeFee * (1 + brokerFee);
}

export const calculateFutureQuantityByStopMargin  = (stopMargin: number, openPrice: number, stopPrice: number) => {
    const loss = Math.abs(stopPrice - openPrice);
    return Math.floor(stopMargin / loss);
}

function getDateOnly(dateString) {
    return dayjs(dateString).format('YYYY-MM-DD'); // Возвращаем дату в формате "год-месяц-день"
}

export const groupedTrades = trades => trades.reduce((acc, trade) => {
    const date = getDateOnly(trade.openTime * 1000);
    if (!acc[date]) {
        acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
}, {});

export const calculateDrawdowns = (positions) => {

    const trades = groupedTrades(positions);
    const allDates = Object.keys(trades).sort();
    const cumulativePnLs = [];
    allDates.forEach(date => {
        let cumulativePnL = 0;
        // Суммируем PnL для всех сделок этого дня
        trades[date].forEach(trade => {
            cumulativePnL += trade.pnl;
        });
        cumulativePnLs.push({value: cumulativePnL});
    });
    const drawdown = calculateDrawdown(cumulativePnLs)
    return drawdown;

// Массив всех дат в порядке возрастания
//     const allDates = Object.keys(trades).sort();

// Переменные для накопленного PnL и расчета просадки
    let cumulativePnL = 0;
    let maxPnL = 0;
    const dailyDrawdowns = [];

// Для каждого дня считаем накопленный PnL и просадку
    allDates.forEach(date => {
        // Суммируем PnL для всех сделок этого дня
        trades[date].forEach(trade => {
            cumulativePnL += trade.pnl;
        });

        // Вычисляем просадку за период (смотрим на текущий накопленный PnL и максимум за этот период)
        maxPnL = Math.max(maxPnL, cumulativePnL);
        const drawdown = cumulativePnL - maxPnL;

        // Сохраняем результаты для этого дня
        dailyDrawdowns.push({
            date,
            cumulativePnL,
            maxPnL,
            drawdown
        });
    });

    return dailyDrawdowns;
};

export const calculateDrawdown = (positions: { value: number }[]): number => {
    if (!positions.length) {
        return 0;
    }

    return maxDrawdown_(positions.map(p => p.value), 0, positions.length - 1)[0];
}

function maxDrawdown_(equityCurve, idxStart, idxEnd) {
    // Initialisations
    let highWaterMark = -Infinity;
    let maxDd = -Infinity;
    let idxHighWaterMark = -1;
    let idxStartMaxDd = -1;
    let idxEndMaxDd = -1;

    // Loop over all the values to compute the maximum drawdown
    for (let i = idxStart; i < idxEnd + 1; ++i) {
        if (equityCurve[i] > highWaterMark) {
            highWaterMark = equityCurve[i];
            idxHighWaterMark = i;
        }

        const dd = (highWaterMark - equityCurve[i]) / highWaterMark;

        if (dd > maxDd) {
            maxDd = dd;
            idxStartMaxDd = idxHighWaterMark;
            idxEndMaxDd = i;
        }
    }

    // Return the computed values
    return [maxDd, idxStartMaxDd, idxEndMaxDd];
}

export const fillTrendByMinorData = (newTrend: Trend[], trendData: HistoryObject[], data: HistoryObject[]) => {
    if(!newTrend.length){
        return [];
    }
    if(!trendData.length){
        return [];
    }
    if(!data.length){
        return [];
    }
    // let lastTrendIndex = newTrend.findIndex(Boolean)
    // if(lastTrendIndex < 0){
    //     return [];
    // }
    // const modifiedTrend = [];
    //
    // for (let i = 0; i < data.length; i++) {
    //     let lastTrend = newTrend[lastTrendIndex];
    //     let lastTrendCandle = trendData[lastTrendIndex];
    //     if(!lastTrendCandle){
    //         modifiedTrend.push(modifiedTrend[modifiedTrend.length - 1]);
    //         continue;
    //     }
    //     modifiedTrend.push(lastTrend);
    //     if(lastTrendCandle.time < data[i].time){
    //         lastTrendIndex++;
    //         lastTrendCandle = trendData[lastTrendIndex];
    //         lastTrend = newTrend[lastTrendIndex]
    //     }
    // }

    let lastTrendIndex = newTrend.findIndex(Boolean);
    if(lastTrendIndex < 0){
        return [];
    }
    const modifiedTrend = [];

    for (let i = 0; i < data.length; i++) {
        let lastTrend = newTrend[lastTrendIndex];
        let lastTrendCandle = trendData[lastTrendIndex];
        modifiedTrend.push(lastTrend ?? modifiedTrend[modifiedTrend.length - 1]);
        if (lastTrendCandle && lastTrendCandle.time < data[i].time) {
            lastTrendIndex++;
            lastTrendCandle = trendData[lastTrendIndex];
            lastTrend = newTrend[lastTrendIndex];
        }
    }

    return modifiedTrend;
}

export const getVisibleMarkers = (chartApi: IChartApi, markers: SeriesMarker<Time>[]) => {
    const timeScale = chartApi.timeScale();

    try {
        const timeRange = timeScale.getVisibleRange();

        if (!timeRange) {
            return [];
        }

        if (!markers?.length) {
            return [];
        }

        const { from, to } = timeRange;
        const visibleMarkers = markers?.filter(({ time }) => time >= from && time <= to).sort((a, b) => a.time - b.time);

        return visibleMarkers as SeriesMarker<Time>[];
    } catch (e) {
        return [];
    }
};

function exhaustiveCheck(_: never) {}

export const createSeries = <T extends SeriesType>(chartApi: IChartApi, seriesType: T, options?: Options[T]) => {
    switch (seriesType) {
        case 'Area':
            return chartApi.addAreaSeries(options);
        case 'Bar':
            return chartApi.addBarSeries(options);
        case 'Candlestick':
            return chartApi.addCandlestickSeries(options);
        case 'Histogram':
            return chartApi.addHistogramSeries(options);
        case 'Line':
            return chartApi.addLineSeries(options);
        default:
            exhaustiveCheck(seriesType);

            throw new Error();
    }
};


export const useChartApi = (element?: HTMLElement, options: DeepPartial<ChartOptions> = {}) => {
    const [chartApi, setChartApi] = useState<IChartApi>();

    useEffect(() => {
        if (!element || chartApi) {
            return;
        }
        const _chartApi =
            Object.assign(createChart(element, options), {
                getContainer: () => element,
            })

        setChartApi(_chartApi);

        const handleResize = () => {
            _chartApi?.applyOptions({width: element.clientWidth});
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            // _chartApi?.remove();
        };
    }, [chartApi, element]);

    useEffect(() => {
        if (chartApi) {
            chartApi.applyOptions(options);
        }
    }, Object.values(options));

    return chartApi;
};

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

const defaultSeriesOptions = {
    Area: {
        backgroundColor: "white",
        lineColor: "#2962FF",
        textColor: "black",
        areaTopColor: "#2962FF",
        areaBottomColor: "rgba(41, 98, 255, 0.28)",
        topColor: 'rgba(51, 51, 51, 0.1)',
        bottomColor: 'rgba(51, 51, 51, 0)',
        lineWidth: 2,
    } as AreaSeriesPartialOptions,
    Bar: {
        upColor: markerColors.bullColor,
        downColor: markerColors.bearColor,
    } as BarSeriesPartialOptions,
    Candlestick: {
        downColor: markerColors.bearColor,
        borderDownColor: "rgb(213, 54, 69)",
        upColor: markerColors.bullColor,
        borderUpColor: "rgb(11, 176, 109)",
        wickUpColor: "rgb(11, 176, 109)",
        wickDownColor: "rgb(213, 54, 69)",
        // ... {
        //     upColor: '#00A127',
        //     downColor: '#E31C1C',
        //     wickUpColor: '#00A127',
        //     wickDownColor: '#E31C1C',
        //     borderVisible: false,
        // },
        lastValueVisible: false,
        priceLineVisible: false,
    } as CandlestickSeriesPartialOptions,
    Histogram: {} as HistogramSeriesPartialOptions,
    Line: {
        priceLineColor: "#2962FF",
    } as LineSeriesPartialOptions,
} as const;

export const useSeriesApi = <T extends SeriesType>({chartApi,
    seriesType,
    data,
    priceLines,
                                                       lineSerieses,
    markers,
                                                       primitives,
                                                       showVolume,
                                                       showEMA,
    options
}: {
    chartApi: IChartApi | undefined,
    seriesType: T,
    data: SeriesDataItemTypeMap<T>[],
    lineSerieses: {
        options: SeriesOptionsMap['Line'],
        data?: LineData<Time>[],
        markers?: SeriesMarker<Time>[]
    }[],
    priceLines
? : PriceLineOptions[],
    markers ? : SeriesMarker < Time > [],
    primitives?: any[],
    options ? : Options[T],
    showVolume?: boolean,
    showEMA?: boolean
}) => {
    const [_primitives, setPrimitives] = useState([]);
    const [_lineSerieses, setLineSerieses] = useState([]);
    const [seriesApi, setSeriesApi] = useState<ISeriesApi<SeriesType>>();
    const seriesOptions = useMemo(() => Object.assign(defaultSeriesOptions[seriesType], options), [options]);

    useEffect(() => {
        if (!chartApi || !data?.length || seriesApi) {
            return;
        }
        console.log('createSeries')

        const series = createSeries(chartApi, seriesType, seriesOptions);

        series.priceScale().applyOptions({
            scaleMargins: {
                top: 0.05, // highest point of the series will be 10% away from the top
                bottom: 0.2, // lowest point will be 40% away from the bottom
            },
        });

        if(showVolume){
            const volumeSeries = createSeries(chartApi, 'Histogram', {
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
                // time: d.time * 1000,
                value: d.volume,
                color: d.open < d.close ? markerColors.bullColor : markerColors.bearColor
            })));
        }

        if(showEMA){

            const emaSeries = createSeries(chartApi, 'Line', {
                color: "rgb(255, 186, 102)",
                lineWidth: 1,
                priceLineVisible: false,
                // crossHairMarkerVisible: false
            });
            const emaSeriesData = data
                .map((extremum, i) => ({time: extremum.time * 1000, value: ema[i]}));
            // @ts-ignore
            emaSeries.setData(emaSeriesData);
        }

        if (priceLines) {
            priceLines.forEach((priceLine) => series.createPriceLine(priceLine));
        }

        setSeriesApi(series);
    }, [chartApi, data, showVolume, showEMA, priceLines]);

    useEffect(() => {
        if (seriesApi && chartApi) {
            if (!markers?.length) {
                seriesApi.setMarkers([]);
            } else {
                const visibleMarkers = getVisibleMarkers(chartApi, markers);

                seriesApi.setMarkers(visibleMarkers);
            }
            console.log('setMarkers')
        }
    }, [markers, seriesApi, chartApi]);

    useEffect(() => {
        if (seriesApi && primitives) {
            setPrimitives(primitives.map(primitive => {
                ensureDefined(seriesApi).attachPrimitive(primitive)
                return primitive;
            }));
            console.log('setPrimitives')
        }

        return () => {
            _primitives?.forEach(primitive => ensureDefined(seriesApi).detachPrimitive(primitive));
            // @ts-ignore
            if(seriesApi?._internal__series){
                // @ts-ignore
                seriesApi._internal__series._private__primitives = [];
            }
        }
    }, [primitives, chartApi, seriesApi]);

    useEffect(() => {
        if (chartApi) {
            if (lineSerieses?.length){
                setLineSerieses(lineSerieses.map(lineSeriese => {
                    const ls = createSeries(chartApi, 'Line', lineSeriese.options)

                    lineSeriese.data && ls.setData(lineSeriese.data);
                    lineSeriese.markers && ls.setMarkers(lineSeriese.markers);

                    return ls;
                }));
            } else {
                if(chartApi){
                    _lineSerieses?.forEach(primitive => {
                        try {
                            chartApi.removeSeries(primitive)
                        }catch (e) {

                        }
                    });
                }
            }
            console.log('setLineSerieses')
        }

        return () => {
            if(chartApi){
                _lineSerieses?.forEach(primitive => {
                    try {
                        chartApi.removeSeries(primitive)
                    }catch (e) {

                    }
                });
            }
        }
    }, [lineSerieses, chartApi]);

    useEffect(() => {
        if (seriesApi) {
            seriesApi.applyOptions(seriesOptions);
            console.log('applyOptions')
        }
    }, [seriesOptions, seriesApi]);

    useEffect(() => {
        if (seriesApi && chartApi) {
            if (!data?.length) {
                seriesApi.setData([]);
            } else {
                seriesApi?.setData(data.map(t => ({...t})) as SeriesDataItemTypeMap[T][]);
            }
            console.log('setData')
        }
    }, [data, seriesApi]);

    return seriesApi;
};

export const createRectangle2 = (orderBlock, options: Partial<RectangleDrawingToolOptions>) => new Rectangle(orderBlock.leftTop, orderBlock.rightBottom, {...options})
