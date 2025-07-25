// Функция для получения данных из Alor API

import dayjs, { type Dayjs } from 'dayjs';
import {
  AreaSeriesPartialOptions,
  BarSeriesPartialOptions,
  CandlestickSeriesPartialOptions,
  HistogramSeriesPartialOptions,
  IChartApi,
  LineSeriesPartialOptions,
  LineStyle,
  SeriesMarker,
  SeriesType,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import { Options } from '@vitejs/plugin-react';
import { Rectangle, RectangleDrawingToolOptions } from './lwc-plugins/rectangle-drawing-tool';
import { TLineSeries } from './SoloTestPage/UpdatedChart';
import moment from 'moment';
import { Cross, HistoryObject, POI, Swing, Trend } from './sm-lib/models';
import Decimal from 'decimal.js';

export async function getDividents(ticker, token) {
  const url = `https://api.alor.ru/instruments/v1/${ticker}/stock/dividends`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе данных');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка получения данных:', error);
  }
}
export async function fetchRisk(token) {
  const url = `https://api.alor.ru/md/v2/Clients/MOEX/D90487/risk`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе данных');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка получения данных:', error);
  }
}

export async function fetchRiskRates(symbol, token, riskCategoryId?: string) {
  const url = `https://api.alor.ru/md/v2/risk/rates?riskCategoryId=${riskCategoryId || 1}&ticker=${symbol}&exchange=MOEX`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе данных');
    }

    const data = await response.json();
    return data.list[0];
  } catch (error) {
    console.error('Ошибка получения данных:', error);
  }
}

export async function fetchCandlesFromAlor(symbol, tf, fromDate?, toDate?, limit?, token?) {
  let url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX`;
  if (limit) {
    url += `&limit=${limit}`;
  }
  if (fromDate) {
    url += `&from=${fromDate}`;
  }
  if (toDate) {
    url += `&to=${toDate}`;
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе данных');
    }

    const data = await response.json();
    return data.history;
  } catch (error) {
    console.error('Ошибка получения данных:', error);
  }
}

export const refreshToken = () =>
  fetch(`https://oauth.alor.ru/refresh?token=${localStorage.getItem('token')}`, {
    method: 'POST',
  })
    .then((r) => r.json())
    .then((r) => r.AccessToken);

export const getSecurity = (symbol, token) =>
  fetch(`https://api.alor.ru/md/v2/Securities/MOEX/${symbol}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((r) => r.json());

export function getCommonCandles(stockCandles: HistoryObject[], futuresCandles: HistoryObject[]) {
  // Создаем множества временных меток для акций и фьючерсов
  const stockTimes = new Set(stockCandles.map((candle) => candle.time));
  const futuresTimes = new Set(futuresCandles.map((candle) => candle.time));

  // Находим пересечение временных меток
  const commonTimes = new Set([...stockTimes].filter((time) => futuresTimes.has(time)));

  // Оставляем только те свечи, время которых есть в обоих массивах
  const filteredStockCandles = stockCandles.filter((candle) => commonTimes.has(candle.time));
  const filteredFuturesCandles = futuresCandles.filter((candle) => commonTimes.has(candle.time));

  return { filteredStockCandles, filteredFuturesCandles };
}

export function calculateMultiple(stockPrice: number, futurePrice: number) {
  const diffs = stockPrice / futurePrice;
  let dif;
  let diffsNumber = 1;
  if (diffs < 0.00009) {
    diffsNumber = 100000;
  } else if (diffs < 0.0009) {
    diffsNumber = 10000;
  } else if (diffs < 0.009) {
    diffsNumber = 1000;
  } else if (diffs < 0.09) {
    diffsNumber = 100;
  } else if (diffs < 0.9) {
    diffsNumber = 10;
  }

  return diffsNumber;
}

export const calculateRR = (p) => {
  const profitPrice = p.takeProfit?.stopPrice || p.takeProfitTrade?.price;
  let lossPrice = p.stopLoss?.stopPrice || p.stopLossTrade?.price;
  const openPrice = p.limit?.price || p.limitTrade?.price;

  if (!lossPrice) {
    lossPrice = p.limitTrade.side === 'buy' ? Number(p.liquidSweepLow) : Number(p.liquidSweepHigh);
  }

  if (!lossPrice || !profitPrice || !openPrice) {
    return 0;
  }

  return Math.abs(profitPrice - openPrice) / Math.abs(lossPrice - openPrice);
};

export const calculateTakeProfit = ({
  side,
  openPrice,
  stopLoss,
  maxPrice,
  multiStop = 1,
  maxDiff = 1,
}: {
  multiStop?: number;
  maxDiff?: number;
  side: 'short' | 'long';
  openPrice: number;
  stopLoss: number;
  maxPrice: number;
}): number => {
  if (maxDiff > 0) {
    const max = maxPrice;

    return side === 'long' ? openPrice + (max - openPrice) * maxDiff : openPrice - (openPrice - max) * maxDiff;
  }
  return side === 'long' ? openPrice + Math.abs(stopLoss - openPrice) * multiStop : openPrice - Math.abs(stopLoss - openPrice) * multiStop;
};

export const persision = (num: number) => (num ? num.toString().split('.')[1]?.length : 0);

export const calculateMOEXFutureFee = (side: 'buy' | 'sell', security: any, brokerFee = 0.5): number => {
  const cfiCodeExchangeFeeMap = {
    // Валюта
    FFXCSX: 0.0066,
    // Акции
    FFXPSX: 0.0198,
    // Товарка
    FCXCSX: 0.0132,
  };

  const exchangeFeePercent = cfiCodeExchangeFeeMap[security.cfiCode];
  if (!exchangeFeePercent) {
    return 0;
  }

  const margin = side === 'buy' ? security.marginbuy : security.marginsell;
  const exchangeFee = margin * exchangeFeePercent;

  return exchangeFee * (1 + brokerFee);
};

export const calculateFutureQuantityByStopMargin = (stopMargin: number, openPrice: number, stopPrice: number) => {
  const loss = Math.abs(stopPrice - openPrice);
  return Math.floor(stopMargin / loss);
};

function getDateOnly(dateString) {
  return dayjs(dateString).format('YYYY-MM-DD'); // Возвращаем дату в формате "год-месяц-день"
}

export const groupedTrades = (trades) =>
  trades.reduce((acc, trade) => {
    const date = getDateOnly(trade.openTime * 1000);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
  }, {});

export const calculateDrawdowns = (positions) => {
  const trades = groupedTrades(positions);
  const allDates = Object.keys(trades).sort();
  const cumulativePnLs = [];
  allDates.forEach((date) => {
    let cumulativePnL = 0;
    // Суммируем PnL для всех сделок этого дня
    trades[date].forEach((trade) => {
      cumulativePnL += trade.pnl;
    });
    cumulativePnLs.push({ value: cumulativePnL });
  });
  const drawdown = calculateDrawdown(cumulativePnLs);
  return drawdown;

  // Массив всех дат в порядке возрастания
  //     const allDates = Object.keys(trades).sort();

  // Переменные для накопленного PnL и расчета просадки
  let cumulativePnL = 0;
  let maxPnL = 0;
  const dailyDrawdowns = [];

  // Для каждого дня считаем накопленный PnL и просадку
  allDates.forEach((date) => {
    // Суммируем PnL для всех сделок этого дня
    trades[date].forEach((trade) => {
      cumulativePnL += trade.pnl;
    });

    // Вычисляем просадку за период (смотрим на текущий накопленный PnL и максимум за этот период)
    maxPnL = Math.max(maxPnL, cumulativePnL);
    const drawdown = cumulativePnL - maxPnL;

    // Сохраняем результаты для этого дня
    dailyDrawdowns.push({
      date,
      cumulativePnL,
      maxPnL,
      drawdown,
    });
  });

  return dailyDrawdowns;
};

export const calculateDrawdown = (positions: { value: number }[]): number => {
  if (!positions.length) {
    return 0;
  }

  return maxDrawdown_(
    positions.map((p) => p.value),
    0,
    positions.length - 1,
  )[0];
};

function maxDrawdown_(equityCurve, idxStart, idxEnd) {
  // Initialisations
  let highWaterMark = -Infinity;
  let maxDd = -Infinity;
  let idxHighWaterMark = -1;
  let idxStartMaxDd = -1;
  let idxEndMaxDd = -1;

  // Loop over all the values to compute the maximum drawdown
  for (let i = idxStart; i < idxEnd + 1; ++i) {
    if (equityCurve[i] > highWaterMark) {
      highWaterMark = equityCurve[i];
      idxHighWaterMark = i;
    }

    const dd = (highWaterMark - equityCurve[i]) / highWaterMark;

    if (dd > maxDd) {
      maxDd = dd;
      idxStartMaxDd = idxHighWaterMark;
      idxEndMaxDd = i;
    }
  }

  // Return the computed values
  return [maxDd, idxStartMaxDd, idxEndMaxDd];
}

export const fillTrendByMinorData = (newTrend: Trend[], trendData: HistoryObject[], data: HistoryObject[]) => {
  if (!newTrend.length) {
    return [];
  }
  if (!trendData.length) {
    return [];
  }
  if (!data.length) {
    return [];
  }
  // let lastTrendIndex = newTrend.findIndex(Boolean)
  // if(lastTrendIndex < 0){
  //     return [];
  // }
  // const modifiedTrend = [];
  //
  // for (let i = 0; i < data.length; i++) {
  //     let lastTrend = newTrend[lastTrendIndex];
  //     let lastTrendCandle = trendData[lastTrendIndex];
  //     if(!lastTrendCandle){
  //         modifiedTrend.push(modifiedTrend[modifiedTrend.length - 1]);
  //         continue;
  //     }
  //     modifiedTrend.push(lastTrend);
  //     if(lastTrendCandle.time < data[i].time){
  //         lastTrendIndex++;
  //         lastTrendCandle = trendData[lastTrendIndex];
  //         lastTrend = newTrend[lastTrendIndex]
  //     }
  // }

  let lastTrendIndex = newTrend.findIndex(Boolean);
  if (lastTrendIndex < 0) {
    return [];
  }
  const modifiedTrend = [];

  for (let i = 0; i < data.length; i++) {
    let lastTrend = newTrend[lastTrendIndex];
    let lastTrendCandle = trendData[lastTrendIndex];
    modifiedTrend.push(lastTrend ?? modifiedTrend[modifiedTrend.length - 1]);
    if (lastTrendCandle && lastTrendCandle.time < data[i].time) {
      lastTrendIndex++;
      lastTrendCandle = trendData[lastTrendIndex];
      lastTrend = newTrend[lastTrendIndex];
    }
  }

  return modifiedTrend;
};

export const getVisibleMarkers = (chartApi: IChartApi, markers: SeriesMarker<Time>[]) => {
  const timeScale = chartApi.timeScale();

  try {
    const timeRange = timeScale.getVisibleRange();

    if (!timeRange) {
      return [];
    }

    if (!markers?.length) {
      return [];
    }

    const { from, to } = timeRange;
    const visibleMarkers = markers?.filter(({ time }) => time >= from && time <= to).sort((a, b) => a.time - b.time);

    return visibleMarkers as SeriesMarker<Time>[];
  } catch (e) {
    return [];
  }
};

function exhaustiveCheck(_: never) {}

export const createSeries = <T extends SeriesType>(chartApi: IChartApi, seriesType: T, options?: Options[T]) => {
  switch (seriesType) {
    case 'Area':
      return chartApi.addAreaSeries(options);
    case 'Bar':
      return chartApi.addBarSeries(options);
    case 'Candlestick':
      return chartApi.addCandlestickSeries(options);
    case 'Histogram':
      return chartApi.addHistogramSeries(options);
    case 'Line':
      return chartApi.addLineSeries(options);
    default:
      exhaustiveCheck(seriesType);

      throw new Error();
  }
};

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

export const defaultSeriesOptions = {
  Area: {
    backgroundColor: 'white',
    lineColor: '#2962FF',
    textColor: 'black',
    areaTopColor: '#2962FF',
    areaBottomColor: 'rgba(41, 98, 255, 0.28)',
    topColor: 'rgba(51, 51, 51, 0.1)',
    bottomColor: 'rgba(51, 51, 51, 0)',
    lineWidth: 2,
  } as AreaSeriesPartialOptions,
  Bar: {
    upColor: markerColors.bullColor,
    downColor: markerColors.bearColor,
  } as BarSeriesPartialOptions,
  Candlestick: {
    downColor: markerColors.bearColor,
    borderDownColor: 'rgb(213, 54, 69)',
    upColor: markerColors.bullColor,
    borderUpColor: 'rgb(11, 176, 109)',
    wickUpColor: 'rgb(11, 176, 109)',
    wickDownColor: 'rgb(213, 54, 69)',
    // ... {
    //     upColor: '#00A127',
    //     downColor: '#E31C1C',
    //     wickUpColor: '#00A127',
    //     wickDownColor: '#E31C1C',
    //     borderVisible: false,
    // },
    // lastValueVisible: false,
    // priceLineVisible: false,
    // priceScaleId: 'right', // Привязываем к правой оси
    lastValueVisible: true, // Показывать последнее значение
    priceLineVisible: true, // Опционально: показать линию текущей цены
  } as CandlestickSeriesPartialOptions,
  Histogram: {} as HistogramSeriesPartialOptions,
  Line: {
    color: 'rgb(166,189,213)', // 'rgb(255, 186, 102)',
    lineColor: 'rgb(166,189,213)', // 'rgb(255, 186, 102)',
    priceLineColor: 'rgb(166,189,213)', // 'rgb(255, 186, 102)',
    lineWidth: 1,
  } as LineSeriesPartialOptions,
} as const;

export const createRectangle2 = (orderBlock, options: Partial<RectangleDrawingToolOptions>) =>
  new Rectangle(orderBlock.leftTop, orderBlock.rightBottom, { ...options });

export function uniqueBy<T>(selector: (val: T) => T[keyof T], sortedData: T[]) {
  let time;
  for (let i = 0; i < sortedData.length; i++) {
    const item = sortedData[i];
    if (!time) {
      time = selector(item);
      continue;
    } else {
      if (time === selector(item)) {
        sortedData.splice(i, 1);
      }
      time = selector(item);
    }
  }
  return sortedData;
}

export const swingsToMarkers = (swings: Swing[]) =>
  swings
    .filter(Boolean)
    .map((s) =>
      s.side === 'double'
        ? [
            {
              color: markerColors.bullColor,
              time: s.time as Time,
              shape: 'circle',
              position: 'aboveBar',
              text: s.text,
            },
            {
              color: markerColors.bearColor,
              time: s.time as Time,
              shape: 'circle',
              position: 'belowBar',
              text: s.text,
            },
          ]
        : [
            {
              color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
              time: s.time as Time,
              shape: 'circle',
              position: s.side === 'high' ? 'aboveBar' : 'belowBar',
              text: s.text,
            },
          ],
    )
    .flat() as SeriesMarker<Time>[];

export const bosesToLineSerieses = (boses: Cross[]) =>
  boses.filter(Boolean).map((marker) => {
    const color = marker.type === 'high' ? markerColors.bullColor : markerColors.bearColor;
    const options = {
      color, // Цвет линии
      priceLineVisible: false,
      lastValueVisible: false,
      lineWidth: 1,
      lineStyle: LineStyle.LargeDashed,
    };
    let data = [];
    let markers = [];
    // 5. Устанавливаем данные для линии
    if (marker.from.time === marker.textCandle.time || marker.to.time === marker.textCandle.time) {
      data = [
        { time: marker.from.time as Time, value: marker.from.price }, // начальная точка между свечками
        { time: marker.to.time as Time, value: marker.from.price }, // конечная точка между свечками
      ];
    } else
      data = [
        { time: marker.from.time as Time, value: marker.from.price }, // начальная точка между свечками
        { time: marker.textCandle.time as Time, value: marker.from.price }, // конечная точка между свечками
        { time: marker.to.time as Time, value: marker.from.price }, // конечная точка между свечками
      ].sort((a, b) => a.time - b.time);

    markers = [
      {
        color,
        time: marker.textCandle.time as Time,
        shape: 'text',
        position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
        text: marker.text,
      },
    ];
    return { options, data, markers } as TLineSeries;
  });

export const orderblocksToFVGPrimitives = (orderBlocks: POI[], filter: (ob: POI) => boolean, lastCandle: HistoryObject) =>
  orderBlocks
    .filter(filter)
    .map((orderBlock) => [
      createRectangle2(
        {
          leftTop: { price: orderBlock.startCandle.high, time: orderBlock.startCandle.time },
          rightBottom: {
            price: orderBlock.startCandle.low + (orderBlock.startCandle.high - orderBlock.startCandle.low) / 2,
            time: (orderBlock.endCandle || lastCandle).time,
          },
        },
        {
          fillColor: 'rgba(179, 199, 219, .3)',
          showLabels: false,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderTopWidth: orderBlock.side === 'high' ? 1 : 0,
          borderBottomWidth: orderBlock.side === 'low' ? 1 : 0,
          borderWidth: 1,
          borderColor: '#222',
        },
      ),
      createRectangle2(
        {
          leftTop: {
            price: orderBlock.startCandle.high - (orderBlock.startCandle.high - orderBlock.startCandle.low) / 2,
            time: orderBlock.startCandle.time,
          },
          rightBottom: { price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time },
        },
        {
          fillColor: 'rgba(179, 199, 219, .3)',
          showLabels: false,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderTopWidth: orderBlock.side === 'low' ? 1 : 0,
          borderBottomWidth: orderBlock.side === 'high' ? 1 : 0,
          borderWidth: 1,
          borderColor: '#222',
        },
      ),
    ])
    .flat();

export const orderblocksToImbalancePrimitives = (orderBlocks: POI[], filter: (ob: POI) => boolean, lastCandle: HistoryObject) =>
  orderBlocks.filter(filter).map((orderBlock) =>
    createRectangle2(
      {
        leftTop: {
          price: orderBlock.lastOrderblockCandle.high,
          time: orderBlock.lastOrderblockCandle.time,
        },
        rightBottom: {
          price: orderBlock.lastImbalanceCandle[orderBlock.side],
          time: orderBlock.lastImbalanceCandle.time,
        },
      },
      {
        fillColor: 'rgba(179, 199, 219, .3)',
        showLabels: false,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderWidth: 2,
        borderColor: '#222',
      },
    ),
  );

export const orderblocksToOrderblocksPrimitives = (orderBlocks: POI[], filter: (ob: POI) => boolean, lastCandle: HistoryObject) =>
  orderBlocks.filter(filter).map((orderBlock) =>
    createRectangle2(
      {
        leftTop: { price: orderBlock.startCandle.high, time: orderBlock.startCandle.time },
        rightBottom: { price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time },
      },
      {
        fillColor: orderBlock.side === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
        showLabels: false,
        borderWidth: 0,
      },
    ),
  );

export function timeToLocal(originalTime: number) {
  const d = new Date(originalTime * 1000);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

export const digitsAfterDot = (num) => {
  if (!num) {
    return 0;
  }

  return `${num}`.split('.')?.[1]?.length || 0;
};

export const roundTime = (date: any, tf: string, utc: boolean = true) => {
  const timestamp = new Date(date).getTime() / 1000;

  // Конвертируем таймфрейм из минут в миллисекунды
  const timeframeMs = Number(tf);

  // Рассчитываем ближайшую "свечу", округляя до ближайшего целого
  const roundedTimestamp = Math.floor(timestamp / timeframeMs) * timeframeMs;

  return (utc ? timeToLocal(roundedTimestamp) : roundedTimestamp) as UTCTimestamp;
};

export const formatDateTime = (value) => moment(value).format('YYYY-MM-DD HH:mm');

/**
 * Формула справедливой стоимости фьючерса (без учета дивидендов): F = S * (1 + r * t / 365)
 *
 * F - справедливая цена фьючерса
 *
 * S - текущая цена акции (спот)
 *
 * r - безрисковая ставка (например, ключевая ставка ЦБ в долях)
 *
 * t - количество дней до экспирации фьючерса
 *
 * 1 - базовая стоимость акции (тело)
 *
 * Более точная формула с экспанентой - F=S⋅e^(r⋅t)
 *
 *   const timeInYears = T / 365;
 *   return S * Math.exp(r * timeInYears);
 *
 * @param S Цена акции (их свечки)
 * @param stockTime Время цены акции
 * @param expirationDate Дата экспироции фьюча
 */
export const calculateTruthFuturePrice = (
  S: number,
  stockTime: number,
  expirationDate: Dayjs,
  dividends = [],
  rusRate: number = 0.2,
  otherRate: number = 0,
) => {
  // Ставка ЦБ РФ (безрисковая ставка)
  const r = rusRate - otherRate;
  // const r = 0.2 - 0.01;
  // const r = 0.2 - 0.0215;

  const dayjsStockTime = dayjs(stockTime * 1000);

  const daysToExpiry = expirationDate.diff(dayjsStockTime, 'day', true);
  const t = daysToExpiry / 365;
  // Стремится к единице сверху вниз
  // return S * (1 + r * t);
  // Правильный банковский вариант
  // return S * Math.exp(r * t);
  // Банк. вариант стремится к единице снизу вверх.
  const futurePriceWithoutDividends = S * (1 - (1 - Math.exp(-r * t)));
  // return futurePriceWithoutDividends;

  // 2. Вычитаем приведённую стоимость дивидендов
  let pvDividends = 0;
  dividends.forEach((div) => {
    const { dividendPerShare, exDividendDate } = div;
    // Компания не выплатила дивиденды
    if (!dividendPerShare) {
      return;
    }
    const dayjsExDividendDate = dayjs(exDividendDate, 'YYYY-MM-DDT00:00:00');

    const daysToDiv = dayjsExDividendDate.diff(dayjsStockTime, 'day', true);
    const tDiv = daysToDiv / 365;
    // Дивы уже прошли
    if (tDiv < 0) {
      return;
    }

    // Дивиденды, которые будут выплачены до экспирации
    if (tDiv <= t) {
      pvDividends += dividendPerShare * Math.exp(-r * (t - tDiv));
    }
  });

  return futurePriceWithoutDividends + pvDividends;
};

/**
 * Рассчитывает порог арбитража (справедливая премия + издержки)
 * @param stockPrice - Цена акции
 * @param stockTime - Время цены
 * @param expirationDate - Дата экспирации
 * @param taxRate - Налог (например, 0.13 для НДФЛ)
 * @param riskFreeRate - Безрисковая ставка (например, 0.20 для 20%)
 */
const calculateArbitrageThreshold = (
  stockPrice: number,
  stockTime: number,
  expirationDate: Dayjs,
  // commission = 0.004,
  // taxRate = 0.13,
  riskFreeRate = 0.18,
  dividends = [],
) => {
  // Биржевой сбор - процент поделил на 100, 0.00462 - за валютный фьючерс (например Юань)
  const exchangeCommission = new Decimal(0.00462).div(100); // 0.0000462 (0.00462%)
  // Комиссия брокера - 50% биржевого сбора
  const brokerCommission = exchangeCommission.mul(0.5); // 0.0000231
  const totalCommissionRate = exchangeCommission.plus(brokerCommission).toNumber(); // 0.0000693 (0.00693%)

  const truthPrice = calculateTruthFuturePrice(stockPrice, stockTime, expirationDate, dividends);

  // Дни до экспирации (дробные)
  const daysToExpiry = expirationDate.diff(dayjs(stockTime * 1000), 'day', true);

  // Издержки:
  const tradeCost = stockPrice * totalCommissionRate * 2; // Покупка + продажа

  // Стоимость финансирования
  const borrowCost = stockPrice * ((riskFreeRate * daysToExpiry) / 365);
  const totalCost = tradeCost + borrowCost;

  // Дисконтированные дивиденды
  let discountedDividends = 0;
  for (const div of dividends) {
    const { dividendPerShare, exDividendDate } = div;
    const daysToPayment = dayjs(exDividendDate, 'YYYY-MM-DDT00:00:00').diff(dayjs(stockTime * 1000), 'day', true);
    if (daysToPayment > 0 && daysToPayment <= daysToExpiry) {
      const daysToReinvest = daysToExpiry - daysToPayment;
      discountedDividends += dividendPerShare * (1 + (riskFreeRate * daysToReinvest) / 365);
    }
  }

  // Пороговая цена фьючерса
  const thresholdPrice = truthPrice + totalCost - discountedDividends;

  return thresholdPrice / stockPrice;
};

export function getOvernightDays(startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): number {
  // Проверяем, что даты валидны
  if (!startDate.isValid() || !endDate.isValid()) {
    return 0;
  }

  // Если endDate <= startDate, овернайта нет
  if (endDate <= startDate) {
    return 0;
  }

  // Находим начало следующего дня после startDate (00:00:00)
  const nextDayStart = startDate.add(1, 'day').startOf('day');

  // Если endDate раньше начала следующего дня, овернайта нет
  if (endDate < nextDayStart) {
    return 0;
  }

  // Считаем разницу в днях между nextDayStart и endDate
  const fullDays = endDate.diff(nextDayStart, 'day');

  // Если endDate >= nextDayStart, то хотя бы 1 день овернайта
  return fullDays + 1;
}
