import React, {FC, useEffect, useRef} from "react";
import {
    ColorType,
    createChart,
    CrosshairMode,
    isBusinessDay,
    isUTCTimestamp,
    LineStyle,
    Time
} from "lightweight-charts";
import {calculate} from "../sm_scripts";
import {
    calculateBreakingBlocks,
    calculateCrosses, calculateOB, calculatePositions,
    calculateStructure,
    calculateSwings,
    calculateTrend
} from "../samurai_patterns";
import {SessionHighlighting} from "../lwc-plugins/session-highlighting";
import moment from 'moment';
import {createRectangle} from "../MainPage";

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

export const Chart: FC<{
    smPatterns?: boolean,
    excludeIDM?: boolean,
    imbalances?: boolean,
    withTrendConfirm?: boolean,
    maxDiff?: number
    multiStop?: number
    noDoubleSwing?: boolean,
    swings?: boolean,
    trend?: boolean,
    showOB?: boolean,
    positions?: boolean,
    showEndOB?: boolean,
    smartTrend?: boolean,
    noInternal?: boolean,
    BOS?: boolean,
    data: any[],
    ema: any[],
    withBug,
    windowLength: number,
    tf: number,
    onProfit: any
}> = ({maxDiff,withTrendConfirm, imbalances,excludeIDM,multiStop, BOS,positions: showPositions, onProfit, showEndOB, showOB, trend, noInternal, smartTrend, noDoubleSwing, swings, smPatterns, data, tf, ema, windowLength}) => {

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

    useEffect(
        () => {
            if (!data?.length) return;

            const handleResize = () => {
                chart.applyOptions({width: chartContainerRef.current.clientWidth});
            };

            const chart = createChart(chartContainerRef.current, {
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

                        return moment.unix(businessDayOrTimestamp / 1000).format('MMM D, YYYY HH:mm');
                    }
                },
                timeScale: {
                    rightOffset: 10,  // это создаст отступ на 10 временных единиц вправо
                    tickMarkFormatter: (time, tickMarkType, locale) => {
                        const date = new Date(time); // Переводим время в миллисекунды

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
                    // tickMarkFormatter: (time, tickMarkType, locale) => {
                    //     // Преобразуем время в формат, используя moment.js
                    //     return moment.unix(time / 1000).format('HH:mm'); // Измените формат, если нужно
                    // },
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
                height: chartContainerRef.current.height || 600,
            });

            const markerColors = {
                bearColor: "rgb(157, 43, 56)",
                bullColor: "rgb(20, 131, 92)"
            }

            const newSeries = chart.addCandlestickSeries({
                downColor: markerColors.bearColor,
                borderDownColor: "rgb(213, 54, 69)",
                upColor: markerColors.bullColor,
                borderUpColor: "rgb(11, 176, 109)",
                wickUpColor: "rgb(11, 176, 109)",
                wickDownColor: "rgb(213, 54, 69)",
                lastValueVisible: false,
                priceLineVisible: false,
            });
            newSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.05, // highest point of the series will be 10% away from the top
                    bottom: 0.2, // lowest point will be 40% away from the bottom
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
                color: d.open < d.close ? markerColors.bullColor : markerColors.bearColor
            })));

            newSeries.setData(data.map(t => ({...t, time: t.time * 1000})));

            const emaSeries = chart.addLineSeries({
                color: "rgb(255, 186, 102)",
                lineWidth: 1,
                priceLineVisible: false,
                // crossHairMarkerVisible: false
            });
            const emaSeriesData = data
                .map((extremum, i) => ({time: extremum.time * 1000, value: ema[i]}));
            // @ts-ignore
            emaSeries.setData(emaSeriesData);

            const {
                topPlots,
                btmPlots,
                markers,
                itrend
            } = calculate(data, markerColors, windowLength);

            let allMarkers = [];
            const {swings: swingsData, highs, lows} = calculateSwings(data);
            const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);
            const {trend: newTrend} = calculateTrend(highParts, lowParts, data, withTrendConfirm);
            const {boses} = calculateCrosses(highParts, lowParts, data, newTrend)
            // const breakingBlocks: any[] = calculateBreakingBlocks(boses, data);
            let orderBlocks = calculateOB(highParts, lowParts, data, newTrend, excludeIDM);
            // if(excludeIDM){
            //     const idmIndexes = boses.filter(bos => bos.text === 'IDM').map(bos => bos.from.index)
            //     orderBlocks = orderBlocks.filter(ob => !idmIndexes.includes(ob.index))
            // }

            const positions = calculatePositions(orderBlocks, data, maxDiff, multiStop);
            onProfit?.({positions})

            const lastCandle = data[data.length - 1];

            const checkShow = (ob) => {
                let result = false;
                if(showOB && !Boolean(ob.endCandle)){
                    result = true;
                }
                if(showEndOB && Boolean(ob.endCandle)){
                    result = true;
                }
                return result;
            }

            if(showPositions){
                const poses = positions.map(s => [{
                    color: s.side === 'long' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.openTime * 1000) as Time,
                    shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
                    position: s.side === 'short' ? 'aboveBar' : 'belowBar',
                    price: s.openPrice,
                    pnl: s.pnl,
                }, {
                    color: s.side === 'short' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.closeTime * 1000) as Time,
                    shape: s.side === 'short' ? 'arrowUp' : 'arrowDown',
                    position: s.side === (s.pnl > 0 ? 'long' : 'short') ? 'aboveBar' : 'belowBar',
                    price: s.pnl > 0 ? s.takeProfit : s.stopLoss,
                }])


                poses.forEach(([open , close]) => {
                    const lineSeries = chart.addLineSeries({
                        color: open.pnl > 0 ? markerColors.bullColor : markerColors.bearColor, // Цвет линии
                        priceLineVisible: false,
                        lastValueVisible: false,
                        lineWidth: 1,
                        lineStyle: LineStyle.LargeDashed,
                    });
                    lineSeries.setData([
                        {time: open.time as Time, value: open.price}, // начальная точка между свечками
                        {time: close.time as Time, value: close.price}, // конечная точка между свечками
                    ])

                    // lineSeries.setMarkers([open, close])
                })

                allMarkers.push(...poses.flat())
            }

            if(showOB || showEndOB || imbalances){
                allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
                    color: s.type === 'high' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.time * 1000) as Time,
                    shape: 'text',
                    position: s.type === 'high' ? 'aboveBar' : 'belowBar',
                    text: "OB"
                })));

                imbalances && orderBlocks.filter(checkShow).forEach(orderBlock => createRectangle(newSeries, {leftTop: {price: orderBlock.lastOrderblockCandle.high, time: orderBlock.lastOrderblockCandle.time * 1000}, rightBottom: {price: orderBlock.lastImbalanceCandle.low, time: (orderBlock.lastImbalanceCandle || lastCandle).time * 1000}}, {
                    fillColor: 'rgba(179, 199, 219, .3)',
                    showLabels: false,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderWidth: 2,
                    borderColor: '#222'
                }));

                orderBlocks.filter(checkShow).forEach(orderBlock => createRectangle(newSeries, {leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time * 1000}, rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time * 1000}}, {
                    fillColor: 'rgba(255, 100, 219, .3)',
                    showLabels: false,
                    borderWidth: 0,
                }));
            }

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

            BOS && boses.filter(Boolean).forEach(marker => {
                const color = marker.type === 'high' ? markerColors.bullColor: markerColors.bearColor
                const lineSeries = chart.addLineSeries({
                    color, // Цвет линии
                    priceLineVisible: false,
                    lastValueVisible: false,
                    lineWidth: 1,
                    lineStyle: LineStyle.LargeDashed,
                });
// 5. Устанавливаем данные для линии
                if(marker.from.time === marker.textCandle.time || marker.to.time === marker.textCandle.time){
                    lineSeries.setData([
                        {time: marker.from.time * 1000 as Time, value: marker.from.price}, // начальная точка между свечками
                        {time: marker.to.time * 1000 as Time, value: marker.from.price}, // конечная точка между свечками
                    ]);
                } else
                    lineSeries.setData([
                        {time: marker.from.time * 1000 as Time, value: marker.from.price}, // начальная точка между свечками
                        {time: marker.textCandle.time * 1000 as Time, value: marker.from.price}, // конечная точка между свечками
                        {time: marker.to.time * 1000 as Time, value: marker.from.price}, // конечная точка между свечками
                    ].sort((a, b) => a.time - b.time));

                lineSeries.setMarkers([{
                    color,
                    time: (marker.textCandle.time * 1000) as Time,
                    shape: 'text',
                    position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
                    text: marker.text
                }] as any)

                // if (marker.idmIndex) {
                //     crossesMarkers.push({
                //         color: marker.color,
                //         time: data[marker.idmIndex].time * 1000,
                //         shape: 'text',
                //         position: marker.position,
                //         text: 'IDM'
                //     })
                // }
            })

            if (noDoubleSwing) {
                // allMarkers.push(...structure.filter(Boolean).map(s => ({
                //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                //     time: (s.time * 1000) as Time,
                //     shape: 'circle',
                //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                //     // text: marker.text
                // })));
                allMarkers.push(...lowParts.filter(Boolean).map(s => ({
                    color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.time * 1000) as Time,
                    shape: 'circle',
                    position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                    // text: marker.text
                })));
                allMarkers.push(...highParts.filter(Boolean).map(s => ({
                    color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.time * 1000) as Time,
                    shape: 'circle',
                    position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                    // text: marker.text
                })));
            }
            if (swings) {

                allMarkers.push(...swingsData.filter(Boolean).map(s => ({
                    color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                    time: (s.time * 1000) as Time,
                    shape: 'circle',
                    position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                    // text: marker.text
                })));
            }

            if(noInternal){

                // allMarkers.push(...filteredExtremums.filter(Boolean).map(s => ({
                //     color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
                //     time: (s.time * 1000) as Time,
                //     shape: 'circle',
                //     position: s.side === 'high' ? 'aboveBar' : 'belowBar',
                //     // text: marker.text
                // })));
            }

            if (smartTrend) {

                function getDate(time: Time): Date {
                    if (isUTCTimestamp(time)) {
                        return new Date(time);
                    } else if (isBusinessDay(time)) {
                        return new Date(time.year, time.month, time.day);
                    } else {
                        return new Date(time);
                    }
                }

                const sessionHighlighter = (time: Time, index) => {
                    let tr = newTrend[index]; // .find(c => (c?.time * 1000) >= (time as number));

                    // let tr = newTrend.find(c => (c?.time * 1000) >= (time as number));
                    let trend = tr?.trend;
                    if (!tr) {
                        // tr = newTrend.findLast(c => (c?.time * 1000) <= (time as number));
                        // trend = tr.trend * -1;
                    }
                    if (!trend) {
                        // debugger
                        return 'gray';
                    }
                    if (trend > 0) {
                        return 'rgba(20, 131, 92, 0.4)';
                    }
                    if (trend < 0) {
                        return 'rgba(157, 43, 56, 0.4)';
                    }

                    const date = getDate(time);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        // Weekend 🏖️
                        return 'rgba(255, 152, 1, 0.08)'
                    }
                    return 'rgba(41, 98, 255, 0.08)';
                };

                const sessionHighlighting = new SessionHighlighting(sessionHighlighter);
                newSeries.attachPrimitive(sessionHighlighting);
            }

            if (trend) {

                function getDate(time: Time): Date {
                    if (isUTCTimestamp(time)) {
                        return new Date(time);
                    } else if (isBusinessDay(time)) {
                        return new Date(time.year, time.month, time.day);
                    } else {
                        return new Date(time);
                    }
                }

                const sessionHighlighter = (time: Time) => {
                    const index = data.findIndex(c => c.time * 1000 === time);
                    if (itrend._data[index] > 0) {
                        return 'rgba(20, 131, 92, 0.4)';
                    }
                    if (itrend._data[index] < 0) {
                        return 'rgba(157, 43, 56, 0.4)';
                    }
                    if (itrend._data[index] === 0) {
                        return 'gray';
                    }

                    const date = getDate(time);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        // Weekend 🏖️
                        return 'rgba(255, 152, 1, 0.08)'
                    }
                    return 'rgba(41, 98, 255, 0.08)';
                };

                const sessionHighlighting = new SessionHighlighting(sessionHighlighter);
                newSeries.attachPrimitive(sessionHighlighting);
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

            let idms = []
            smPatterns && markers.forEach(marker => {
                const lineSeries = chart.addLineSeries({
                    color: marker.color, // Цвет линии
                    priceLineVisible: false,
                    lastValueVisible: false,
                    lineWidth: 1,
                    lineStyle: LineStyle.LargeDashed,
                });
                // debugger

// 5. Устанавливаем данные для линии
                lineSeries.setData([
                    {time: marker.fromTime, value: marker.value}, // начальная точка между свечками
                    {time: marker.textTime, value: marker.value}, // начальная точка между свечками
                    {time: marker.toTime, value: marker.value}, // конечная точка между свечками
                ]);

                lineSeries.setMarkers([{
                    color: marker.color,
                    time: marker.textTime,
                    shape: marker.shape,
                    position: marker.position,
                    text: marker.text
                }])

                if (marker.idmIndex) {
                    idms.push({
                        color: marker.color,
                        time: data[marker.idmIndex].time * 1000,
                        shape: 'text',
                        position: marker.position,
                        text: 'IDM'
                    })
                }
            })

            smPatterns && allMarkers.push(...idms);

            newSeries.setMarkers(allMarkers.sort((a: any, b: any) => a.time - b.time));

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);

                chart.remove();
            };
        },
        [withTrendConfirm, imbalances, excludeIDM, multiStop, maxDiff, showPositions, showOB, showEndOB, BOS, trend, noInternal, smartTrend, noDoubleSwing, swings, smPatterns, data, ema, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, windowLength, tf]
    );

    return <div
        ref={chartContainerRef}
    />
}