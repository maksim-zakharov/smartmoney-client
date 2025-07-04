import React, { FC, useEffect, useRef } from 'react';
import { ColorType, createChart, CrosshairMode, Time } from 'lightweight-charts';
import moment from 'moment';

function capitalizeFirstLetter(str) {
  return str[0].toUpperCase() + str.slice(1);
}

export const Chart: FC<{
  data: any[];
  inputTreshold?: number;
  tf: number;
  onChange?: (value: any) => any;
  maximumFractionDigits?: number;
  customSeries?: any[];
}> = ({ data, inputTreshold, tf, onChange, maximumFractionDigits, customSeries }) => {
  const {
    backgroundColor = 'rgb(30,44,57)',
    color = 'rgb(166,189,213)',
    borderColor = 'rgba(44,60,75, 0.6)',
    // backgroundColor = "white",
    lineColor = '#2962FF',
    textColor = 'black',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
  } = {
    backgroundColor: 'white',
    lineColor: '#2962FF',
    textColor: 'black',
    areaTopColor: '#2962FF',
    areaBottomColor: 'rgba(41, 98, 255, 0.28)',
  };

  const chartContainerRef = useRef<any>();

  useEffect(() => {
    if (!data?.length) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      localization: {
        locale: 'ru-RU',
        // priceFormatter,
        timeFormatter: function (businessDayOrTimestamp) {
          // if (LightweightCharts.isBusinessDay(businessDayOrTimestamp)) {
          //     return 'Format for business day';
          // }

          return moment.unix(businessDayOrTimestamp / 1000).format('MMM D, YYYY HH:mm');
        },
        priceFormatter: (price) => {
          const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: maximumFractionDigits || 8, // Минимальное количество знаков после запятой
            maximumFractionDigits: maximumFractionDigits || 8, // Максимальное количество знаков после запятой
          });
          return formatter.format(price);
        },
      },
      timeScale: {
        rightOffset: 10, // это создаст отступ на 10 временных единиц вправо
        tickMarkFormatter: (time, tickMarkType, locale) => {
          const date = new Date(time); // Переводим время в миллисекунды

          // Если это первый день месяца
          if (date.getDate() === 1) {
            return capitalizeFirstLetter(date.toLocaleString(locale, { month: 'long' })).slice(0, 3); // Название месяца
          }

          // Часы (для секций 12 и 18 часов)
          const hours = date.getHours();
          if (hours >= 0 && hours <= 10) {
            return date.toLocaleString(locale, { day: 'numeric' });
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
          color: borderColor,
        },

        horzLines: {
          color: borderColor,
        },
      },
      layout: {
        // Фон
        background: { type: ColorType.Solid, color: 'rgb(30,44,57)' },
        textColor: color,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.height || 600,
    });

    const markerColors = {
      bearColor: 'rgb(157, 43, 56)',
      bullColor: 'rgb(20, 131, 92)',
    };

    const newSeries = chart.addCandlestickSeries({
      downColor: markerColors.bearColor,
      borderDownColor: 'rgb(213, 54, 69)',
      upColor: markerColors.bullColor,
      borderUpColor: 'rgb(11, 176, 109)',
      wickUpColor: 'rgb(11, 176, 109)',
      wickDownColor: 'rgb(213, 54, 69)',
      priceFormat: {
        precision: 12,
      },
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
    volumeSeries?.setData(
      data.map((d: any) => ({
        ...d,
        time: d.time * 1000,
        value: d.volume,
        color: d.open < d.close ? markerColors.bullColor : markerColors.bearColor,
      })),
    );

    newSeries.setData(data.map((t) => ({ ...t, time: t.time * 1000 })));

    // const emaSeries = chart.addLineSeries({
    //   color: 'rgb(255, 186, 102)',
    //   lineWidth: 1,
    //   priceLineVisible: false,
    // });
    //
    // const ema = calculateEMA(
    //   data.map((h) => h.close),
    //   100,
    // )[1];
    //
    // const emaSeriesData = data.map((extremum, i) => ({ time: extremum.time * 1000, value: ema[i] }));
    // // @ts-ignore
    // emaSeries.setData(emaSeriesData);

    if (customSeries) {
      customSeries.forEach(({ data: _data, ...options }) => {
        const emaSeries = chart.addLineSeries(options);

        const emaSeriesData = data.map((extremum, i) => ({ time: extremum.time * 1000, value: _data[i] }));
        // @ts-ignore
        emaSeries.setData(emaSeriesData);
      });
    }

    const sellSeries = chart.addLineSeries({
      color: markerColors.bearColor,
      lineWidth: 1,
      priceLineVisible: false,
    });

    if (inputTreshold) {
      const sellSeriesData = data.map((extremum, i) => ({ time: extremum.time * 1000, index: i, value: ema[i] + inputTreshold }));
      // @ts-ignore
      sellSeries.setData(sellSeriesData);

      const filteredSellMarkers = sellSeriesData.filter((extremum, i) => data[i]?.high > extremum.value && data[i]?.low < extremum.value);

      const sellMarkers = filteredSellMarkers.map((extremum) => ({
        color: markerColors.bearColor,
        time: extremum.time as Time,
        shape: 'circle',
        position: 'aboveBar',
      }));

      const buySeries = chart.addLineSeries({
        color: markerColors.bullColor,
        lineWidth: 1,
        priceLineVisible: false,
      });

      const buySeriesData = data.map((extremum, i) => ({ time: extremum.time * 1000, index: i, value: ema[i] - inputTreshold }));
      // @ts-ignore
      buySeries.setData(buySeriesData);

      const filteredBuyMarkers = buySeriesData.filter((extremum, i) => data[i]?.high > extremum.value && data[i]?.low < extremum.value);

      const buyMarkers = filteredBuyMarkers.map((extremum) => ({
        color: markerColors.bullColor,
        time: extremum.time as Time,
        shape: 'circle',
        position: 'belowBar',
      }));

      onChange?.({ filteredBuyMarkers, filteredSellMarkers });

      newSeries.setMarkers([...sellMarkers, ...buyMarkers].sort((a, b) => a.time - b.time) as any[]);
    }

    chart.timeScale().setVisibleRange({
      from: moment().add(-2, 'month').unix() * 1000,
      to: moment().unix() * 1000,
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      chart.remove();
    };
  }, [
    customSeries,
    inputTreshold,
    data,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
    tf,
    borderColor,
    color,
    onChange,
    maximumFractionDigits,
  ]);

  return <div ref={chartContainerRef} />;
};
