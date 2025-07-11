import React, { useEffect, useRef } from 'react';
import { useAppSelector } from './store.ts';
import { createSeries, defaultSeriesOptions } from './utils.ts';
import { ColorType, createChart, CrosshairMode, IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import moment from 'moment/moment';
import { Exchange, Format } from 'alor-api';

function capitalizeFirstLetter(str) {
  return str[0].toUpperCase() + str.slice(1);
}

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

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

export const TestPage = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const api = useAppSelector((state) => state.alorSlice.api);
  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);
  const chartApiRef = useRef<IChartApi>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType>>(null);

  useEffect(() => {
    if (!api || !apiAuth) {
      return;
    }
    api.subscriptions.candles(
      {
        format: Format.Simple,
        exchange: Exchange.MOEX,
        code: 'SBER',
        tf: '15',
      },
      (candle) => seriesRef.current.update(candle),
    );
  }, [api, apiAuth]);

  // Инициализация графика (один раз)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const options = {
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

          return moment.unix(businessDayOrTimestamp).format('MMM D, YYYY HH:mm');
        },
        priceFormatter: (price) => {
          const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 8, // Минимальное количество знаков после запятой
            maximumFractionDigits: 8, // Максимальное количество знаков после запятой
          });
          return formatter.format(price);
        },
      },
      timeScale: {
        lockVisibleTimeRangeOnResize: true, // Блокирует сдвиг при изменении размера
        // rightOffset: 10, // это создаст отступ на 10 временных единиц вправо
        rightOffset: 12, // Отступ справа (в пикселях)
        fixLeftEdge: true, // Фиксирует левую границу
        fixRightEdge: true, // Фиксирует правую границу
        tickMarkFormatter: (time, tickMarkType, locale) => {
          const date = new Date(time * 1000); // Переводим время в миллисекунды

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
      width: chartContainerRef.current?.clientWidth,
      height: chartContainerRef.current?.clientHeight,
    };

    const chartApi = createChart(chartContainerRef.current, options);

    chartApiRef.current = chartApi;

    // Создаем основные серии
    const series = createSeries(chartApi, 'Candlestick', defaultSeriesOptions['Candlestick']);
    seriesRef.current = series;

    // Обработчик изменения размера
    const handleResize = () => {
      chartApi.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartApi.remove();
    };
  }, []);

  return <div ref={chartContainerRef} style={{ position: 'relative', height: 400, width: '100%' }} />;
};
