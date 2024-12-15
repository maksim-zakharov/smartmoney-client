import React, {FC, useEffect, useRef} from "react";
import {
    ColorType,
    CrosshairMode, LineData,
    SeriesMarker, SeriesOptionsMap, Time
} from "lightweight-charts";
import {
    OrderBlock
} from "../samurai_patterns";
import moment from 'moment';
import {useChartApi, useSeriesApi} from "../utils";

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

export const Chart: FC<{
    markers: SeriesMarker<any>[],
    lineSerieses: {
        options: SeriesOptionsMap['Line'],
        data?: LineData<Time>[],
        markers?: SeriesMarker<Time>[]
    }[],
    primitives: any[],
    data: any[],
    ema: any[],
}> = ({
          lineSerieses,
          markers,
                              primitives,
          data,
          ema,
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

    const chartContainerRef = useRef<any>();

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
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.height || 500,
    }

    const chartApi = useChartApi(chartContainerRef.current!, options)

    useSeriesApi({
        chartApi,
        showVolume: true,
        seriesType: 'Candlestick',
        data,
        ema,
        lineSerieses,
        priceLines: [],
        markers,
        primitives,
        options
    })

    return <div
        ref={chartContainerRef}
    />
};