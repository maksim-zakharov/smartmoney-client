import React, {FC, useEffect, useRef, useState} from "react";
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

export const Chart: FC<{
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
}> = ({
          lineSerieses,
          markers,
          hideInternalCandles,
          primitives,
          seriesType = 'Candlestick',
          showVolume = true,
          data,
          ema,
          width,
          height = 610
      }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const emaSeriesRef = useRef<any>(null);
    const lineSeriesRefs = useRef<{ [id: string]: ISeriesApi<SeriesType> }>({});
    const toolTipRef = useRef<HTMLDivElement | null>(null);
    const handleResizeRef = useRef<() => void>();
    const prevPrimitivesRef = useRef<ISeriesPrimitive<any>[]>([]);

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
        handleResizeRef.current = handleResize;
        window.addEventListener('resize', handleResize);

        // Создаем tooltip
        const toolTip = document.createElement('div');
        toolTip.style.cssText = `position: absolute; display: none; z-index: 1000; top: 12px; left: 12px; right: 66px;`;
        chartContainerRef.current.appendChild(toolTip);
        toolTipRef.current = toolTip;

        // Подписка на события
        chartApi.subscribeCrosshairMove(param => {
            // ... ваша логика tooltip
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

    // Обновление маркеров
    useEffect(() => {
        if (seriesRef.current && markers) {
            seriesRef.current.setMarkers([...markers].sort((a, b) => a.time - b.time));
        }
    }, [markers]);

    // Обновление EMA
    useEffect(() => {
        if (emaSeriesRef.current && ema && data) {
            const emaData = data.map((d, i) => ({time: d.time, value: ema[i]}));
            emaSeriesRef.current.setData(emaData);
        }
    }, [ema, data]);

    // Обновление линий (lineSeries)
    useEffect(() => {
        if (!chartApiRef.current || !lineSerieses) return;
        // Находим линий для удаления

        const currentLineIds = Object.keys(lineSeriesRefs.current);
        const newLineIds = lineSerieses.map(lineSeries => lineSeries.data[0]?.time?.toString());

        // Удаление устаревших линий
        currentLineIds.forEach(lineId => {
            if (!newLineIds.includes(lineId)) {
                chartApiRef.current.removeSeries(lineSeriesRefs.current[lineId])
                delete lineSeriesRefs.current[lineId];
            }
        });

        lineSerieses.forEach((lineSeries, index) => {
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

    }, [lineSerieses]);

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

        // Обработка hideInternalCandles
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
        }
        else
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

    // Остальные эффекты для volume, primitives и т.д.

    return <div ref={chartContainerRef} style={{height, width: width || '100%'}}/>;
};