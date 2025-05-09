import React, {FC, useEffect, useRef} from "react";
import {
    ColorType, createChart,
    CrosshairMode, ISeriesPrimitive, LineData, SeriesMarker, SeriesOptionsMap, Time
} from "lightweight-charts";
import moment from 'moment';
import {createSeries, defaultSeriesOptions, getVisibleMarkers, uniqueBy} from "../utils";
import {ensureDefined} from "../lwc-plugins/helpers/assertions";


import {isInsideBar} from "../THUltimate/utils.ts";

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export type TLineSeries = {
    options: SeriesOptionsMap['Line'],
    data?: LineData<Time>[],
    markers?: SeriesMarker<Time>[]
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
                              height = 710
      }) => {

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

    const chartContainerRef = useRef<HTMLDivElement>();

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

    useEffect(() => {
        if (!chartContainerRef.current) {
            return;
        }
        const chartApi = createChart(chartContainerRef.current, options)

        const series = createSeries(chartApi, seriesType, defaultSeriesOptions[seriesType]);

        series.priceScale().applyOptions({
            scaleMargins: {
                top: 0.03, // highest point of the series will be 10% away from the top
                bottom: 0.3, // lowest point will be 40% away from the bottom
            },
        });

        if(hideInternalCandles){
            for (let i = 0; i < data.length; i++) {
                const currentCandle = data[i];
                let nextIndex = i + 1;
                let nextCandle = data[nextIndex];
                for (; nextIndex < data.length - 1; nextIndex++) {
                    nextCandle = data[nextIndex]
                    if(isInsideBar(currentCandle, nextCandle)){
                        data[nextIndex].borderColor = "rgba(44,60,75, 1)";
                        data[nextIndex].wickColor = "rgba(44,60,75, 1)";
                        data[nextIndex].color = 'rgba(0, 0, 0, 0)';
                        continue;
                    }
                    break;
                }
                let diff = nextIndex - i - 1;
                i+=diff;
            }
        }
        series?.setData(data);

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


        const timeCandleMap = new Map(data.map(d => [d.time, d]));

        if(chartContainerRef!.current.children.length > 1 && !chartContainerRef!.current.children[0].classList.contains('tv-lightweight-charts')){
            chartContainerRef!.current.children[0].remove();
        }

        const toolTip: any = document.createElement('div');
        toolTip.style =`position: absolute; display: none; z-index: 1000; top: 12px; left: 12px; right: 66px;`;
        chartContainerRef!.current.appendChild(toolTip);

        // update tooltip
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
                const candle: any = timeCandleMap.get(data.time)

                toolTip.innerHTML = `ОТКР: ${candle.open} МАКС: ${candle.high} МИН: ${candle.low} ЗАКР: ${candle.close}`; // ОБЪЕМ: ${shortNumberFormat(candle.volume)} ОБЪЕМ (деньги): ${moneyFormat(candle.volume * candle.close * lotSize)}`;

                toolTip.style.left = '12px';
                toolTip.style.top = '12px';
            }
        });

        const emaSeries = createSeries(chartApi, 'Line', {
            color: "rgb(255, 186, 102)",
            lineWidth: 1,
            priceLineVisible: false,
            // crossHairMarkerVisible: false
        });
        emaSeries?.setData(data
            .map((extremum, i) => ({time: extremum.time, value: ema[i]})));

        // const visibleMarkers = getVisibleMarkers(chartApi, markers);

        series.setMarkers(markers.sort((a, b) => a.time - b.time));

        primitives.forEach(primitive => ensureDefined(series).attachPrimitive(primitive))

        lineSerieses.forEach(lineSeriese => {
            const ls = createSeries(chartApi, 'Line', lineSeriese.options)

            const sortedData = lineSeriese.data.sort((a,b) => a.time - b.time);

            const unique = uniqueBy(v => v.time, sortedData);

            lineSeriese.data && ls.setData(unique);
            lineSeriese.markers && ls.setMarkers(lineSeriese.markers);
        })

        const handleResize = () => {
            chartApi?.applyOptions({width: chartContainerRef.current.clientWidth});
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            chartApi?.remove();
        };
    }, [showVolume, seriesType, chartContainerRef.current, data, markers, primitives, ema, lineSerieses, hideInternalCandles]);

    // const chartApi = useChartApi(chartContainerRef.current!, options)

    // useSeriesApi({
    //     chartApi,
    //     showVolume: true,
    //     seriesType: 'Candlestick',
    //     data,
    //     ema,
    //     lineSerieses,
    //     priceLines: [],
    //     markers,
    //     primitives,
    //     options
    // })

    return <div
        style={{position: 'relative'}}
        ref={chartContainerRef}
    />
};