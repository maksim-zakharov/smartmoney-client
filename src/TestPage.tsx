import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {ColorType, createChart, CrosshairMode} from "lightweight-charts";
import moment from "moment/moment";
import {useSearchParams} from "react-router-dom";


const Chart: FC<{ data: any[], ema: any[] }> = ({data, ema}) => {

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

            newSeries.setData(data.map(t => ({...t, time: t.time * 1000})));

            chart.timeScale().fitContent();

            const emaSeries = chart.addLineSeries({
                color: "rgb(255, 186, 102)",
                lineWidth: 1,
                // crossHairMarkerVisible: false
            });
            const emaSeriesData = data
                .map((extremum, i) => ({ time: extremum.time * 1000, value: ema[i] }));
            // @ts-ignore
            emaSeries.setData(emaSeriesData);

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);

                chart.remove();
            };
        },
        [data, ema, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]
    );

    return <div
        ref={chartContainerRef}
    />
}

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf) {
    const url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX&from=${Math.floor(new Date("2024-11-01T00:00:00Z").getTime() / 1000)}&to=${Math.floor(new Date("2024-11-21T00:00:00Z").getTime() / 1000)}`;

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

    return <Chart data={data} ema={ema}/>
}

export default TestPage;