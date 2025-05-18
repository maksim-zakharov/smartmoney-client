import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {
    ColorType,
    createChart,
    CrosshairMode,
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    SeriesMarker,
    SeriesType,
    Time
} from "lightweight-charts";
import moment from 'moment';
import {createSeries, defaultSeriesOptions, uniqueBy} from "../utils";
import {ensureDefined} from "../lwc-plugins/helpers/assertions";
import {isInsideBar} from "../THUltimate/utils.ts";
import {TLineSeries} from "./TestChart.tsx";
import {withErrorBoundary} from "../ErrorBoundary.tsx";

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

const {
    backgroundColor = "rgb(30,44,57)",
    color = "rgb(166,189,213)",
    borderColor = "rgba(44,60,75, 0.6)",
    // backgroundColor = "white",
    lineColor = "#2962FF",
    textColor = "black",
    areaTopColor = "#2962FF",
    areaBottomColor = "rgba(41, 98, 255, 0.28)"
} = {
    backgroundColor: "white",
    lineColor: "#2962FF",
    textColor: "black",
    areaTopColor: "#2962FF",
    areaBottomColor: "rgba(41, 98, 255, 0.28)"
};

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

interface Props {
    markers: SeriesMarker<Time>[],
    lineSerieses: TLineSeries[],
    hideInternalCandles?: boolean,
    primitives: ISeriesPrimitive<any>[],
    seriesType?: any,
    showVolume?: boolean,
    data: any[],
    ema: any[],
    height?: number,
    width?: number,
    toolTipLeft?: string;
    toolTipTop?: string;
}

const ChartFC: FC<Props> = ({
                                lineSerieses,
                                markers,
                                hideInternalCandles,
                                primitives,
                                seriesType = 'Candlestick',
                                showVolume = true,
                                data,
                                ema,
                                width,
                                height = 610,
                                toolTipLeft,
                                toolTipTop
                            }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi>(null);
    const seriesRef = useRef<ISeriesApi<SeriesType>>(null);
    const volumeSeriesRef = useRef<any>(null);
    const emaSeriesRef = useRef<any>(null);
    const lineSeriesRefs = useRef<{ [id: string]: ISeriesApi<SeriesType> }>({});
    const toolTipRef = useRef<HTMLDivElement | null>(null);
    const prevPrimitivesRef = useRef<ISeriesPrimitive<any>[]>([]);
    const timeDataRef = useRef<Map<Time, any>>(new Map([]));

    // Состояние для хранения видимого диапазона
    const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);

    // Инициализация графика (один раз)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const options = {
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            localization: {
                locale: "ru-RU",
                // priceFormatter,
                timeFormatter: function (businessDayOrTimestamp) {

                    // if (LightweightCharts.isBusinessDay(businessDayOrTimestamp)) {
                    //     return 'Format for business day';
                    // }

                    return moment.unix(businessDayOrTimestamp).format('MMM D, YYYY HH:mm');
                }
            },
            timeScale: {
                rightOffset: 10,  // это создаст отступ на 10 временных единиц вправо
                tickMarkFormatter: (time, tickMarkType, locale) => {
                    const date = new Date(time * 1000); // Переводим время в миллисекунды

                    // Если это первый день месяца
                    if (date.getDate() === 1) {
                        return capitalizeFirstLetter(date.toLocaleString(locale, {month: 'long'})).slice(0, 3); // Название месяца
                    }

                    // Часы (для секций 12 и 18 часов)
                    const hours = date.getHours();
                    if (hours >= 0 && hours <= 10) {
                        return date.toLocaleString(locale, {day: 'numeric'});
                    }

                    // Дата (день месяца)
                    return `${hours}:00`;
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
            width: width || chartContainerRef.current?.clientWidth,
            height: chartContainerRef.current?.clientHeight || height,
        }

        const chartApi = createChart(chartContainerRef.current, options);

        chartApiRef.current = chartApi;

        // Создаем основные серии
        const series = createSeries(chartApi, seriesType, defaultSeriesOptions[seriesType]);
        seriesRef.current = series;

        // Обработчик изменения размера
        const handleResize = () => {
            chartApi.applyOptions({width: chartContainerRef.current?.clientWidth});
        };
        window.addEventListener('resize', handleResize);

        // Создаем tooltip
        const toolTip = document.createElement('div');
        toolTip.style.cssText = `position: absolute; display: none; z-index: 1000; top: 12px; left: 12px; right: 66px;`;
        chartContainerRef.current.appendChild(toolTip);
        toolTipRef.current = toolTip;

        // Подписка на изменение видимого диапазона
        chartApi.timeScale().subscribeVisibleLogicalRangeChange(() => {
            const newVisibleRange = chartApi.timeScale().getVisibleRange();
            if (newVisibleRange) {
                setVisibleRange({from: newVisibleRange.from, to: newVisibleRange.to});
            }
        });

        // Подписка на события
        chartApi.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef!.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef!.current.clientHeight
            ) {
                toolTip.style.display = 'none';
            } else {
                // time will be in the same format that we supplied to setData.
                toolTip.style.display = 'flex';
                const data = param.seriesData.get(series);
                // symbol ОТКР МАКС МИН ЗАКР ОБЪЕМ
                const candle: any = timeDataRef.current.get(data.time)

                toolTip.innerHTML = `ОТКР: ${candle.open} МАКС: ${candle.high} МИН: ${candle.low} ЗАКР: ${candle.close}`; // ОБЪЕМ: ${shortNumberFormat(candle.volume)} ОБЪЕМ (деньги): ${moneyFormat(candle.volume * candle.close * lotSize)}`;

                toolTip.style.left = toolTipLeft || '12px';
                toolTip.style.top = toolTipTop || '12px';
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            chartApi.remove();
            if (toolTipRef.current) {
                chartContainerRef.current?.removeChild(toolTipRef.current);
            }
        };
    }, []);

    // Обновление данных основной серии
    useEffect(() => {
        if (!chartApiRef.current || !seriesRef.current || !data) return;

        timeDataRef.current = new Map(data.map(d => [d.time, d]));

        // Сохраняем текущий видимый диапазон
        const timeScale = chartApiRef.current.timeScale();
        const currentVisibleRange = timeScale.getVisibleRange();

        // Обработка hideInternalCandles
        let processedData = [...data];
        if (hideInternalCandles) {
            for (let i = 0; i < data.length; i++) {
                const currentCandle = data[i];
                let nextIndex = i + 1;
                let nextCandle = data[nextIndex];
                for (; nextIndex < data.length - 1; nextIndex++) {
                    nextCandle = data[nextIndex]
                    if (isInsideBar(currentCandle, nextCandle)) {
                        data[nextIndex].borderColor = "rgba(44,60,75, 1)";
                        data[nextIndex].wickColor = "rgba(44,60,75, 1)";
                        data[nextIndex].color = 'rgba(0, 0, 0, 0)';
                        continue;
                    }
                    break;
                }
                let diff = nextIndex - i - 1;
                i += diff;
            }
        }

        seriesRef.current.setData(processedData);

        // Восстанавливаем диапазон
        if (currentVisibleRange) {
            timeScale.setVisibleRange(currentVisibleRange);
        }
    }, [data, hideInternalCandles]);

    // Фильтрация линий по видимому диапазону
    const filteredLineSerieses = useMemo(() => {
        if (!visibleRange || !lineSerieses) return lineSerieses;
        return lineSerieses.filter(series => {
            const pointsInRange = series.data.filter(d =>
                d.time >= visibleRange.from && d.time <= visibleRange.to
            )
            return Boolean(pointsInRange.length)
        }).map(series => {
            const pointsInRange = series.data.filter(d =>
                d.time >= visibleRange.from && d.time <= visibleRange.to
            );
            // Добавляем граничные точки, если линия пересекает диапазон
            const beforePoints = series.data.filter(d => d.time < visibleRange.from);
            const afterPoints = series.data.filter(d => d.time > visibleRange.to);
            const minPoint = beforePoints[beforePoints.length - 1];
            const maxPoint = afterPoints[0];
            return {
                ...series,
                data: [
                    ...(minPoint ? [minPoint] : []),
                    ...pointsInRange,
                    ...(maxPoint ? [maxPoint] : [])
                ]
            };
        });
    }, [lineSerieses, visibleRange]);

    // Фильтрация маркеров по видимому диапазону
    const filteredMarkers = useMemo(() => {
        if (!visibleRange || !markers) return markers;
        return markers.filter(m =>
            m.time >= visibleRange.from && m.time <= visibleRange.to
        );
    }, [markers, visibleRange]);

    // Обновление маркеров
    useEffect(() => {
        if (seriesRef.current && filteredMarkers) {
            seriesRef.current.setMarkers([...filteredMarkers].sort((a, b) => a.time - b.time));
        }
    }, [filteredMarkers]);

    // Обновление EMA
    useEffect(() => {
        if (emaSeriesRef.current && ema && data) {
            const emaData = data.map((d, i) => ({time: d.time, value: ema[i]}));
            emaSeriesRef.current.setData(emaData);
        }
    }, [ema, data]);

    // Обновление линий (lineSeries)
    useEffect(() => {
        if (!chartApiRef.current || !filteredLineSerieses) return;
        // Находим линий для удаления

        const currentLineIds = Object.keys(lineSeriesRefs.current);
        const newLineIds = filteredLineSerieses.map(lineSeries => lineSeries.data[0]?.time?.toString());

        // Удаление устаревших линий
        currentLineIds.forEach(lineId => {
            if (!newLineIds.includes(lineId)) {
                chartApiRef.current.removeSeries(lineSeriesRefs.current[lineId])
                delete lineSeriesRefs.current[lineId];
            }
        });

        filteredLineSerieses.forEach((lineSeries, index) => {
            const id = lineSeries.data[0]?.time?.toString();
            let ls = lineSeriesRefs.current[id];
            if (!ls) {
                ls = createSeries(chartApiRef.current, 'Line', lineSeries.options);
                lineSeriesRefs.current[id] = ls;
            }
            const sortedData = [...lineSeries.data].sort((a, b) => a.time - b.time);
            const uniqueData = uniqueBy((v: any) => v.time, sortedData);
            ls.setData(uniqueData);
            if (lineSeries.markers) {
                ls.setMarkers(lineSeries.markers);
            }
        });
    }, [filteredLineSerieses]);

    useEffect(() => {
        if (!chartApiRef.current) return;

        const volumeSeries = createSeries(chartApiRef.current, 'Histogram', {
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

        volumeSeriesRef.current = volumeSeries;
    }, []);

    // Обновление данных основной серии
    useEffect(() => {
        if (!chartApiRef.current || !volumeSeriesRef.current || !data) return;

        // Сохраняем текущий видимый диапазон
        const timeScale = chartApiRef.current.timeScale();
        const currentVisibleRange = timeScale.getVisibleRange();

        let processedData = [...data.map((d: any) => ({
            ...d,
            // time: d.time * 1000,
            value: d.volume,
            color: d.open < d.close ? markerColors.bullColor : markerColors.bearColor
        }))];
        if (showVolume) {
            volumeSeriesRef.current.setData(processedData);

            // Восстанавливаем диапазон
            if (currentVisibleRange) {
                timeScale.setVisibleRange(currentVisibleRange);
            }
        } else
            volumeSeriesRef.current.setData([]);
    }, [data, showVolume]);

    useEffect(() => {
        if (!seriesRef.current) return;

        const series = seriesRef.current;
        const prevPrimitives = prevPrimitivesRef.current;

        // Находим примитивы для удаления
        const toRemove = prevPrimitives.filter(p =>
            !primitives.includes(p)
        );

        // Находим примитивы для добавления
        const toAdd = primitives.filter(p =>
            !prevPrimitives.includes(p)
        );

        // Удаляем старые примитивы
        toRemove.forEach(primitive => {
            try {
                series.detachPrimitive(primitive);
            } catch (e) {
                console.warn('Failed to detach primitive:', e);
            }
        });

        // Добавляем новые примитивы
        toAdd.forEach(primitive => {
            ensureDefined(series).attachPrimitive(primitive);
        });

        // Сохраняем текущие примитивы для следующего сравнения
        prevPrimitivesRef.current = [...primitives];

    }, [primitives]); // Зависимость от массива примитивов

    return <div ref={chartContainerRef} style={{position: 'relative', height, width: width || '100%'}}/>;
};

export const Chart = withErrorBoundary(ChartFC)