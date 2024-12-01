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
import {Checkbox, Radio, Select, Slider, Space} from "antd";
import {SessionHighlighting} from "./lwc-plugins/session-highlighting";
import {
    calculateBreakingBlocks,
    calculateCrosses,
    calculateStructure,
    calculateSwings,
    calculateTrend
} from "./samurai_patterns.ts";
import {createRectangle} from "./MainPage";
import {Point} from "./lwc-plugins/rectangle-drawing-tool";

function capitalizeFirstLetter(str) {
    return str[0].toUpperCase() + str.slice(1);
}

const Chart: FC<{
    smPatterns?: boolean,
    noDoubleSwing?: boolean,
    swings?: boolean,
    trend?: boolean,
    smartTrend?: boolean,
    noInternal?: boolean,
    BOS?: boolean,
    BOS?: boolean,
    data: any[],
    ema: any[],
    withBug,
    windowLength: number,
    tf: number
}> = ({BOS, CHOCH, trend, noInternal, smartTrend, noDoubleSwing, swings, smPatterns, data, tf, ema, windowLength}) => {

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
            const {trend: newTrend, filteredExtremums} = calculateTrend(highParts, lowParts, data);
            const {crosses, boses} = calculateCrosses(highParts, lowParts, data, newTrend)
            const breakingBlocks: any[] = calculateBreakingBlocks(crosses, data);

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
                lineSeries.setData([
                    {time: marker.from.time * 1000 as Time, value: marker.from.price}, // начальная точка между свечками
                    {time: marker.textCandle.time * 1000 as Time, value: marker.from.price}, // конечная точка между свечками
                    {time: marker.to.time * 1000 as Time, value: marker.from.price}, // конечная точка между свечками
                ]);

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

            CHOCH && crosses.filter(Boolean).forEach(marker => {
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
                ]);

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
        [BOS, CHOCH, trend, noInternal, smartTrend, noDoubleSwing, swings, smPatterns, data, ema, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, windowLength, tf]
    );

    return <div
        ref={chartContainerRef}
    />
}

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf) {
    const url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX&from=${Math.floor(new Date("2024-10-01T00:00:00Z").getTime() / 1000)}&to=${Math.floor(new Date("2024-12-31:00:00Z").getTime() / 1000)}`;

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

const fetchSecurities = () => fetch('https://apidev.alor.ru/md/v2/Securities?exchange=MOEX&limit=10000').then(r => r.json())

export const TestPage = () => {
    const [securities, setSecurities] = useState([]);
    const [data, setData] = useState([]);
    const [ema, setEma] = useState([]);
    const [checkboxValues, setCheckboxValues] = useState([]);
    const [windowLength, setWindowLength] = useState(5);
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '900';
    useEffect(() => {
        setEma(calculateEMA(
            data.map((h) => h.close),
            100
        )[1]);
    }, [data])

    useEffect(() => {
        fetchSecurities().then(setSecurities)
    }, []);

    useEffect(() => {
        fetchCandlesFromAlor(ticker, tf).then(setData);
    }, [tf, ticker]);

    const config = useMemo(() => ({
        smPatterns: checkboxValues.includes('smPatterns'),
        trend: checkboxValues.includes('trend'),
        swings: checkboxValues.includes('swings'),
        noDoubleSwing: checkboxValues.includes('noDoubleSwing'),
        noInternal: checkboxValues.includes('noInternal'),
        smartTrend: checkboxValues.includes('smartTrend'),
        BOS: checkboxValues.includes('BOS'),
        CHOCH: checkboxValues.includes('CHOCH'),
    }), [checkboxValues])

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
        setSearchParams(searchParams)
    }

    const onSelectTicker = (ticker) => {
        searchParams.set('ticker', ticker);
        setSearchParams(searchParams)
    }

    const options = useMemo(() => securities.filter(s => !['Unknown'].includes(s.complexProductCategory) && !['TQIF', 'ROPD', 'TQIR', 'TQRD', 'TQPI', 'CETS', 'TQTF', 'TQCB', 'TQOB', 'FQBR'].includes(s.board) && ['RUB'].includes(s.currency)).sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
        label: s.symbol,
        value: s.symbol
    })), [securities]);

    return <>
        <Space>
            <Radio.Group value={tf} onChange={(e) => setSize(e.target.value)}>
                <Radio.Button value="300">5M</Radio.Button>
                <Radio.Button value="900">15M</Radio.Button>
                <Radio.Button value="1800">30M</Radio.Button>
                <Radio.Button value="3600">1H</Radio.Button>
            </Radio.Group>
            <Select
                value={ticker}
                showSearch
                placeholder="Введи тикер"
                onSelect={onSelectTicker}
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{width: 160}}
                options={options}
            />
        </Space>
        <Slider defaultValue={windowLength} onChange={setWindowLength}/>
        <Checkbox.Group onChange={setCheckboxValues}>
            <Checkbox key="smPatterns" value="smPatterns">smPatterns</Checkbox>
            <Checkbox key="trend" value="trend">Тренд</Checkbox>
            <Checkbox key="swings" value="swings">Swings</Checkbox>
            <Checkbox key="noDoubleSwing" value="noDoubleSwing">Исключить свинги подряд</Checkbox>
            {/*<Checkbox key="noInternal" value="noInternal">Исключить внутренние свинги</Checkbox>*/}
            <Checkbox key="smartTrend" value="smartTrend">Умный тренд</Checkbox>
            <Checkbox key="BOS" value="BOS">BOS</Checkbox>
            <Checkbox key="CHOCH" value="CHOCH">CHOCH</Checkbox>
        </Checkbox.Group>
        <Chart data={data} ema={ema} windowLength={windowLength} tf={Number(tf)} {...config} />
    </>
}

export default TestPage;