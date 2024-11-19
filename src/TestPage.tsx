import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {
    ColorType,
    createChart,
    CrosshairMode,
    isBusinessDay,
    isUTCTimestamp,
    LineStyle,
    Time,
} from "lightweight-charts";
import moment from "moment/moment";
import {useSearchParams} from "react-router-dom";
import {calculate} from "./sm_scripts";
import {Checkbox, Slider} from "antd";
import {SessionHighlighting} from "./lwc-plugins/session-highlighting";

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

const Chart: FC<{
    smPatterns?: boolean,
    trend?: boolean,
    data: any[],
    ema: any[],
    withBug,
    windowLength: number,
    tf: number
}> = ({trend, smPatterns, data, tf, ema, windowLength}) => {

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
            if (!data.length) return;

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
            //     text: v.isCHoCH ? 'CHoCH' : 'BOS',
            //     color: markerColors.bullColor
            // })),
            //     ...btmPlots.filter(Boolean).map(v => ({
            //         ...v,
            //         position: 'belowBar',
            //         text: v.isCHoCH ? 'CHoCH' : 'BOS',
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

            let idms=[]
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

                lineSeries.setMarkers([{color: marker.color, time: marker.textTime, shape: marker.shape, position: marker.position, text: marker.text}])

                if(marker.idmIndex){
                    idms.push({color: marker.color, time: data[marker.idmIndex].time * 1000, shape: 'text', position: marker.position, text: 'IDM'})
                }
            })

            newSeries.setMarkers(idms.sort((a: any, b: any) => a.time - b.time));

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);

                chart.remove();
            };
        },
        [trend, smPatterns, data, ema, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, windowLength, tf]
    );

    return <div
        ref={chartContainerRef}
    />
}

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf) {
    const url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX&from=${Math.floor(new Date("2024-11-01T00:00:00Z").getTime() / 1000)}&to=${Math.floor(new Date("2024-12-31:00:00Z").getTime() / 1000)}`;

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

function calculateEMA(
    prices,
    period
) {
    const alpha = 2 / (period + 1);
    let ema = prices[0];
    const array = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * alpha + ema * (1 - alpha);
        array.push(ema);
    }

    return [ema, array];
}

export const TestPage = () => {
    const [data, setData] = useState([]);
    const [ema, setEma] = useState([]);
    const [checkboxValues, setCheckboxValues] = useState([]);
    const [windowLength, setWindowLength] = useState(5);
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '900';
    useMemo(() => {
        setEma(calculateEMA(
            data.map((h) => h.close),
            100
        )[1]);
    }, [data])

    useEffect(() => {
        fetchCandlesFromAlor(ticker, tf).then(setData);
    }, [tf, ticker]);

    const config = useMemo(() => ({
        smPatterns: true,
        trend: checkboxValues.includes('trend'),
    }), [checkboxValues])

    return <>
        <Slider defaultValue={windowLength} onChange={setWindowLength}/>
        <Checkbox.Group onChange={setCheckboxValues}>
            <Checkbox key="trend" value="trend">Тренд</Checkbox>
        </Checkbox.Group>
        <Chart data={data} ema={ema} windowLength={windowLength} tf={Number(tf)} {...config} />
    </>
}

export default TestPage;