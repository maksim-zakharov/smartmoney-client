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
    smPatterns?: boolean,
    excludeIDM?: boolean,
    withTrendConfirm?: boolean,
    maxDiff?: number;
    multiStop?: number;
    oldTrend?: boolean,
    positions?: any[],
    tradeFakeouts?: boolean,
    excludeTrendSFP?: boolean,
    noInternal?: boolean,
    withMove?: boolean,
    data: any[],
    ema: any[],
    withBug,
    windowLength: number,
    orderBlocks: OrderBlock[],
    primitives: any[],
    onProfit: any;
}> = ({
          maxDiff,
          lineSerieses,
          markers,
                              primitives,
          orderBlocks,
          excludeTrendSFP,
          tradeFakeouts,
          withTrendConfirm,
          withMove,
          excludeIDM,
          multiStop,
          positions,
          oldTrend,
          noInternal,
          smPatterns,
          data,
          ema,
          windowLength
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

    const series = useSeriesApi({
        chartApi,
        showVolume: true,
        seriesType: 'Candlestick',
        data,
        lineSerieses,
        priceLines: [],
        markers,
        primitives,
        options
    })

    useEffect(
        () => {
            if (!series || !data?.length) {
                return;
            }

            // const {trend: newTrend} = calculateTrend(highParts, lowParts, data, withTrendConfirm, excludeTrendSFP);
            // const breakingBlocks: any[] = calculateBreakingBlocks(boses, data);
            // let orderBlocks = calculateOB(highParts, lowParts, data, newTrend, excludeIDM, withMove);

            // if(excludeIDM){
            //     const idmIndexes = boses.filter(bos => bos.text === 'IDM').map(bos => bos.from.index)
            //     orderBlocks = orderBlocks.filter(ob => !idmIndexes.includes(ob.index))
            // }

//             breakingBlocks.filter(Boolean).forEach(marker => {
//                 const color = marker.type === 'high' ? markerColors.bullColor: markerColors.bearColor
//                 const lineSeries = chart.addLineSeries({
//                     color, // Цвет линии
//                     priceLineVisible: false,
//                     lastValueVisible: false,
//                     lineWidth: 1,
//                     lineStyle: LineStyle.LargeDashed,
//                 });
// // 5. Устанавливаем данные для линии
//                 lineSeries.setData([
//                     {time: marker.fromTime * 1000 as Time, value: marker.price}, // начальная точка между свечками
//                     {time: marker.textCandle.time * 1000 as Time, value: marker.price}, // конечная точка между свечками
//                     {time: marker.toTime * 1000 as Time, value: marker.price}, // конечная точка между свечками
//                 ]);
//
//                 lineSeries.setMarkers([{
//                     color,
//                     time: (marker.textCandle.time * 1000) as Time,
//                     shape: 'text',
//                     position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
//                     text: marker.text
//                 }] as any)
//
//                 // if (marker.idmIndex) {
//                 //     crossesMarkers.push({
//                 //         color: marker.color,
//                 //         time: data[marker.idmIndex].time * 1000,
//                 //         shape: 'text',
//                 //         position: marker.position,
//                 //         text: 'IDM'
//                 //     })
//                 // }
//             })

            if (noInternal) {

                // allMarkers.push(...filteredExtremums.filter(Boolean).map(s => ({
                //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                //     time: (s.time * 1000) as Time,
                //     shape: 'circle',
                //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                //     // text: marker.text
                // })));
            }


            // smPatterns && [...topPlots.filter(Boolean).map(v => ({
            //     ...v,
            //     position: 'aboveBar',
            //     text: v.isCHoCH ? 'IDM' : 'BOS',
            //     color: markerColors.bullColor
            // })),
            //     ...btmPlots.filter(Boolean).map(v => ({
            //         ...v,
            //         position: 'belowBar',
            //         text: v.isCHoCH ? 'IDM' : 'BOS',
            //         color: markerColors.bearColor
            //     }))
            // ].forEach(plot => {
            //     const lineSeries = chart.addLineSeries({
            //         color: plot.color, // Цвет линии
            //         priceLineVisible: false,
            //         lastValueVisible: false,
            //         lineWidth: 1,
            //         lineStyle: LineStyle.LargeDashed,
            //     });
            //
            //     const textIndex = plot.to - Math.floor((plot.to - plot.from) / 2);
            //
            //     const fromCandle = data[plot.from];
            //     const toCandle = data[plot.to];
            //     const textCandle = data[textIndex];
            //
            //     lineSeries.setData([
            //         {time: fromCandle.time * 1000, value: plot.price}, // начальная точка между свечками
            //         {time: textCandle.time * 1000, value: plot.price}, // начальная точка между свечками
            //         {time: toCandle.time * 1000, value: plot.price}, // конечная точка между свечками
            //     ]);
            //
            //     lineSeries.setMarkers([{
            //         color: plot.color,
            //         time: textCandle.time * 1000,
            //         shape: 'text',
            //         position: plot.position,
            //         text: plot.text
            //     }])
            // })
        },
        [series, chartApi, orderBlocks, withMove, markers, excludeTrendSFP, tradeFakeouts, withTrendConfirm, excludeIDM, multiStop, maxDiff, positions, oldTrend, noInternal, smPatterns, data, ema, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, windowLength]
    );

    return <div
        ref={chartContainerRef}
    />
};