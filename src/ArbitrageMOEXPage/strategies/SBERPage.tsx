import {
  Card,
  Checkbox,
  Col,
  ColorPicker,
  DatePicker,
  Divider,
  Layout,
  Row,
  Select,
  Slider,
  Space,
  Statistic,
  Table,
  TimeRangePickerProps,
  Typography,
} from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import { TickerSelect } from '../../TickerSelect';
import dayjs, { type Dayjs } from 'dayjs';
// import { Chart } from '../../Chart';
import { Chart } from '../../SoloTestPage/UpdatedChart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment/moment';
import Decimal from 'decimal.js';
import {
  calculateMultiple,
  createRectangle2,
  fetchCandlesFromAlor,
  getCommonCandles,
  getDividents,
  getSecurity,
  refreshToken,
} from '../../utils.ts';
import { calculateBollingerBands, calculateCandle, calculateEMA, symbolFuturePairs } from '../../../symbolFuturePairs.ts';
import { fetchSecurityDetails } from '../ArbitrageMOEXPage';
import { LineStyle, Time } from 'lightweight-charts';
import { finishPosition } from '../../samurai_patterns.ts';
import { Security } from '../../api.ts';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import FormItem from 'antd/es/form/FormItem';
import { calculateDiscountedDividends } from '../../sm-lib/utils.ts';

const { RangePicker } = DatePicker;

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

const storageState = localStorage.getItem('colors') ? JSON.parse(localStorage.getItem('colors')) : {};
const defaultState = Object.assign(
  {
    ema: 'rgb(255, 186, 102)',
    bbEma: 'rgb(255, 186, 102)',
    zeroLevel: 'rgb(255, 186, 102)',
    truthPrice: 'rgb(255, 186, 102)',
  },
  storageState,
);

export const SBERPage = () => {
  const [useHage, setuseHage] = useState<boolean>(false);
  const [security, setSecurity] = useState<Security>();
  const [token, setToken] = useState();
  const [details, setdetails] = useState();
  const [chartValues, onChangeChart] = useState({ filteredBuyMarkers: [], filteredSellMarkers: [] });
  const TresholdEnd = 0.001;
  const [_data, setData] = useState({ futureData: [], stockData: [], dividends: [] });
  const [searchParams, setSearchParams] = useSearchParams();
  const multi = Number(searchParams.get('multi'));
  const tickerStock = 'SBER';
  const _tickerFuture = 'SBERP';
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

  const [colors, setColors] = useState(defaultState);

  useEffect(() => {
    localStorage.setItem('colors', JSON.stringify(colors));
  }, [colors]);

  const expirationMonth = searchParams.get('expirationMonth') || '9.25';
  const setexpirationMonth = (value) => {
    searchParams.set('expirationMonth', value);
    setSearchParams(searchParams);
  };
  const expirationMonths = useMemo(() => {
    const startYear = 24;
    const months = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 1; j <= 4; j++) {
        months.push(`${3 * j}.${startYear + i}`);
      }
    }

    return months;
  }, []);

  const emaPeriod = Number(searchParams.get('emaPeriod') || 100);
  const setEmaPeriod = (value) => {
    searchParams.set('emaPeriod', value);
    setSearchParams(searchParams);
  };

  const bbMiltiplier = Number(searchParams.get('bbMiltiplier') || 2);
  const setbbMiltiplier = (value) => {
    searchParams.set('bbMiltiplier', value);
    setSearchParams(searchParams);
  };

  const emaBBPeriod = Number(searchParams.get('emaBBPeriod') || 20);
  const setEmaBBPeriod = (value) => {
    searchParams.set('emaBBPeriod', value);
    setSearchParams(searchParams);
  };

  const checkboxValues = new Set(
    (searchParams.get('checkboxes') || 'tradeOB,BOS,swings,showEndOB,showHiddenSwings,showPositions').split(','),
  );
  const setCheckboxValues = (values) => {
    searchParams.set('checkboxes', values.join(','));
    setSearchParams(searchParams);
  };

  const { stockData, futureData, dividends } = _data;

  const lastDividends = useMemo(() => (dividends ? dividends[dividends.length - 1] : undefined), [dividends]);
  const dividendPerShare = lastDividends?.dividendPerShare || 0;

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';
  const taxRate = 0.13;

  const lotsize = 1; // security?.lotsize;
  const fee = 0.04 / 100;

  useEffect(() => {
    token && getSecurity(tickerStock, token).then(setSecurity);
  }, [tickerStock, token]);

  /**
   *
   * @param spotPrice Цена акции (их свечки)
   * @param stockTime Время цены акции
   * @param expirationDate Дата экспироции фьюча
   * @param dividends Массив дивидендов
   */
  const calculateTruthFuturePrice = (spotPrice: number, stockTime: number, expirationDate: Dayjs, dividends = []) => {
    // Ставка ЦБ РФ (безрисковая ставка)
    const riskFreeRate = 0.2;
    // Ставка ЦБ КНР
    const cyR = 0; // 0.03;
    // Дней до экспирации
    const daysToExpiry = expirationDate.diff(dayjs(stockTime * 1000), 'day', true);

    // Рассчетная цена фьючерса
    const tradeCost = 0;

    // Проценты годовых по фьючу на текущий день
    const currentFutureFreeRatePercents = ((riskFreeRate - cyR) * daysToExpiry) / 365;

    // Стоимость финансирования
    const financingCost = spotPrice * currentFutureFreeRatePercents + tradeCost;
    // const truthPrice = spotPrice - currentFutureFreeRatePercents;

    // Дисконтированные дивиденды
    const discountedDividends = calculateDiscountedDividends(stockTime, daysToExpiry, riskFreeRate, dividends);

    // return truthPrice + discountedDividends;
    // Итоговая формула
    return spotPrice + financingCost - discountedDividends;
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
    riskFreeRate = 0.2,
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

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

  const tickerFuture = useMemo(() => {
    if (_tickerFuture) {
      return _tickerFuture;
    }

    const ticker = symbolFuturePairs.find((pair) => pair.stockSymbol === tickerStock)?.futuresSymbol;
    if (ticker) {
      return `${ticker}-${expirationMonth}`;
    }
    return ticker;
  }, [tickerStock, _tickerFuture, expirationMonth]);

  useEffect(() => {
    tickerFuture && token && fetchSecurityDetails(tickerFuture, token).then(setdetails);
  }, [tickerFuture, token]);

  const multiple = useMemo(
    () =>
      multi ||
      (_data.stockData?.length && _data.futureData?.length
        ? calculateMultiple(_data.stockData[_data.stockData.length - 1].close, _data.futureData[_data.futureData.length - 1].close)
        : 0),
    [_data, multi],
  );

  const stockTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.stockSymbol), []);
  const futureTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.futuresSymbol), []);

  useEffect(() => {
    tickerFuture &&
      token &&
      Promise.all([
        fetchCandlesFromAlor(tickerFuture, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(tickerStock, tf, fromDate, toDate, null, token),
        getDividents(tickerStock, token),
      ]).then(([futureData, stockData, dividends]) => setData({ stockData, futureData, dividends }));
  }, [tf, tickerStock, tickerFuture, fromDate, toDate, token]);

  const commonCandles = useMemo(() => getCommonCandles(stockData, futureData), [stockData, futureData]);

  const data = useMemo(() => {
    if (stockData?.length && futureData?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(stockData, futureData);

      return filteredFuturesCandles
        .map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple)))
        .filter(Boolean);
    }
    return stockData;
  }, [stockData, futureData, multiple]);

  const truthPriceSeriesData = useMemo(
    () => stockData.map(({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate)) / close, dividends),
    [stockData, dividends],
  );

  const sellLineData = useMemo(() => stockData.map((s) => 1 + 0.03), [stockData]);
  const zeroLineData = useMemo(() => stockData.map((s) => 1 * multi), [stockData, multi]);
  const buyLineData = useMemo(() => stockData.map((s) => 1 - 0.03), [stockData]);

  const ema = useMemo(
    () =>
      calculateEMA(
        data.map((h) => h.close),
        emaPeriod,
      )[1],
    [data, emaPeriod],
  );
  const BB = useMemo(
    () =>
      calculateBollingerBands(
        data.map((h) => h.close),
        emaBBPeriod,
        bbMiltiplier,
      ),
    [data, emaBBPeriod, bbMiltiplier],
  );

  const emaHigh = useMemo(
    () =>
      calculateEMA(
        data.map((h) => h.high),
        100,
      )[1],
    [data],
  );

  const emaLow = useMemo(
    () =>
      calculateEMA(
        data.map((h) => h.low),
        100,
      )[1],
    [data],
  );

  const sellEmaLineData = useMemo(() => ema.map((s) => s + 0.01 * multi), [ema, multi]);
  const buyEmaLineData = useMemo(() => ema.map((s) => s - 0.01 * multi), [ema, multi]);

  const sellEmaLineData2 = useMemo(() => ema.map((s) => s + 0.01 * 2 * multi), [ema, multi]);
  const buyEmaLineData2 = useMemo(() => ema.map((s) => s - 0.01 * 2 * multi), [ema, multi]);

  const buyEmaLineData3 = useMemo(() => ema.map((s) => s + 0.01 * 3 * multi), [ema, multi]);
  const sellEmaLineData3 = useMemo(() => ema.map((s) => s - 0.01 * 3 * multi), [ema, multi]);

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const sellPositions = [];
    const buyPositions = [];

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      // Если не коснулись верха - продаем фьюч, покупаем акцию
      if (candle.high >= BB.upper[i]) {
        // if (candle.high >= sellEmaLineData[i]) {
        let currentPosition: any = {
          side: 'short',
          openPrice: candle.high,
          stopLoss: candle.high,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];
          // if (candle.low > ema[j]) {
          if (candle.low > BB.middle[j]) {
            continue;
          }

          currentPosition = {
            ...currentPosition,
            closeTime: candle.time,
            takeProfit: candle.open,
            closePrice: candle.open,
          };

          currentPosition.pnl = currentPosition.openPrice - currentPosition.closePrice;
          sellPositions.push(currentPosition);

          i = j - 1;

          break;
        }
        // Если было закрытие - продолжаем цикл
        if (currentPosition.closeTime) {
          continue;
        }
      }
      if (candle.low <= BB.lower[i]) {
        // if (candle.low <= buyEmaLineData[i]) {
        let currentPosition: any = {
          side: 'long',
          openPrice: candle.low,
          stopLoss: candle.low,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];
          // if (candle.high <= ema[j]) {
          if (candle.high <= BB.middle[j]) {
            continue;
          }

          currentPosition = {
            ...currentPosition,
            closeTime: candle.time,
            takeProfit: candle.open,
            closePrice: candle.open,
          };

          currentPosition.pnl = currentPosition.closePrice - currentPosition.openPrice;
          buyPositions.push(currentPosition);

          i = j - 1;

          break;
        }
        // Если было закрытие - продолжаем цикл
        if (currentPosition.closeTime) {
          continue;
        }
      }
    }

    return [...buyPositions, ...sellPositions]
      .map(
        finishPosition({
          lotsize,
          fee,
          tf,
          ticker: tickerStock,
          stopMargin: 50,
          quantity: 1,
        }),
      )
      .sort((a, b) => b.openTime - a.openTime);
  }, [data, fee, lotsize, tickerStock, BB, sellEmaLineData, buyEmaLineData, ema]);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onSelectTicker = (type: 'stock' | 'future') => (ticker) => {
    searchParams.set(`ticker-${type}`, ticker);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    console.log('Selected Time: ', value);
    console.log('Formatted Selected Time: ', dateString);

    searchParams.set('fromDate', value[0].unix());
    searchParams.set('toDate', value[1].unix());
    setSearchParams(searchParams);
  };

  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: 'Сегодня', value: [dayjs().startOf('day'), dayjs()] },
    { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
    { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
    { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
    { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
    { label: 'Последние 182 дня', value: [dayjs().add(-182, 'd'), dayjs()] },
    { label: 'Последние 365 дней', value: [dayjs().add(-365, 'd'), dayjs()] },
  ];

  const ls = useMemo(() => {
    const markers = positions.map((s) => [
      {
        color: s.side === 'long' ? markerColors.bullColor : markerColors.bearColor,
        time: s.openTime as Time,
        shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
        position: s.side === 'short' ? 'aboveBar' : 'belowBar',
        price: s.openPrice,
        pnl: s.pnl,
      },
      {
        color: s.side === 'short' ? markerColors.bullColor : markerColors.bearColor,
        time: s.closeTime as Time,
        shape: s.side === 'short' ? 'arrowUp' : 'arrowDown',
        position: s.side === (s.pnl > 0 ? 'long' : 'short') ? 'aboveBar' : 'belowBar',
        price: s.pnl > 0 ? s.takeProfit : s.pnl < 0 ? s.stopLoss : s.takeProfit,
      },
    ]);

    const lineSerieses = markers.map(([open, close]) => ({
      options: {
        color: open.pnl > 0 ? markerColors.bullColor : open.pnl < 0 ? markerColors.bearColor : 'rgb(166,189,213)', // Цвет линии
        priceLineVisible: false,
        lastValueVisible: false,
        lineWidth: 1,
        lineStyle: LineStyle.LargeDashed,
      },
      data: [
        { time: open.time as Time, value: open.price }, // начальная точка между свечками
        { time: close.time as Time, value: close.price }, // конечная точка между свечками
      ],
    }));

    if (
      !ema.length ||
      !data.length ||
      !sellEmaLineData.length ||
      !buyEmaLineData.length ||
      !buyEmaLineData2.length ||
      !sellEmaLineData2.length ||
      !buyEmaLineData3.length ||
      !sellEmaLineData3.length
    ) {
      return [];
    }

    return [
      // ...lineSerieses,
      checkboxValues.has('enableEMA') && {
        id: 'ema',
        options: {
          color: colors.ema,
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: ema[i] })),
      },
      checkboxValues.has('enable1percent') && {
        id: 'buyEmaLineData',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineData[i] })),
      },
      checkboxValues.has('enable1percent') && {
        id: 'sellEmaLineData',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineData[i] })),
      },
      checkboxValues.has('enable2percent') && {
        id: 'buyEmaLineData2',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        // markers: positions
        //   .filter((s) => s.side === 'long')
        //   .map((extremum: any) => ({
        //     color: markerColors.bullColor,
        //     time: extremum.time as Time,
        //     shape: 'circle',
        //     position: 'belowBar',
        //   }))
        //   .sort((a, b) => a.time - b.time),
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineData2[i] })),
      },
      checkboxValues.has('enable2percent') && {
        id: 'sellEmaLineData2',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        // markers: positions
        //   .filter((s) => s.side === 'short')
        //   .map((extremum: any) => ({
        //     color: markerColors.bearColor,
        //     time: extremum.time as Time,
        //     shape: 'circle',
        //     position: 'aboveBar',
        //   }))
        //   .sort((a, b) => a.time - b.time),
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineData2[i] })),
      },
      checkboxValues.has('enable3percent') && {
        id: 'buyEmaLineData3',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineData3[i] })),
      },
      checkboxValues.has('enable3percent') && {
        id: 'sellEmaLineData3',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineData3[i] })),
      },
      checkboxValues.has('enableCalculateFuturePrice') && {
        id: 'truthPriceSeriesData',
        options: {
          color: colors.truthPrice,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: truthPriceSeriesData[i] })),
      },
      // {
      //   color: 'rgb(20, 131, 92)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: ArbitrageBuyPriceSeriesData,
      // },
      // {
      //   color: 'rgb(157, 43, 56)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: ArbitrageSellPriceSeriesData,
      // },
      // {
      //   color: 'rgb(157, 43, 56)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: sellLineData,
      //   lineStyle: LineStyle.Dashed,
      // },
      checkboxValues.has('enableZeroLine') && {
        id: 'zeroLineData',
        options: {
          color: colors.zeroLevel,
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: zeroLineData[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.upper',
        options: {
          color: colors.bbEma,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.upper[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.lower',
        options: {
          color: colors.bbEma,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.lower[i] })),
      },
      // {
      //   color: 'rgb(20, 131, 92)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: buyLineData,
      //   lineStyle: LineStyle.Dashed,
    ].filter(Boolean);
  }, [
    colors,
    sellEmaLineData3,
    buyEmaLineData3,
    sellEmaLineData2,
    buyEmaLineData2,
    sellEmaLineData,
    ema,
    buyEmaLineData,
    positions,
    checkboxValues,
  ]);

  const primitives = useMemo(() => {
    if (!BB.upper.length || !checkboxValues.has('enableBB')) {
      return [];
    }
    const _primitives = [];

    for (let i = 0; i < data.length; i++) {
      if (!BB.upper[i] || !BB.lower[i]) {
        continue;
      }
      _primitives.push(
        createRectangle2(
          {
            leftTop: {
              price: BB.upper[i],
              time: data[i].time,
            },
            rightBottom: {
              price: BB.lower[i],
              time: data[i].time,
            },
          },
          {
            fillColor: 'rgba(90, 200, 250, .3)',
            showLabels: false,
            borderWidth: 0.1,
          },
        ),
      );
    }

    return _primitives;
  }, [BB, data, checkboxValues]);

  const historyColumns = [
    {
      title: 'Тип',
      dataIndex: 'side',
      key: 'side',
      render: (value, row) => row?.side || '-',
    },
    {
      title: 'Время входа',
      dataIndex: 'openTime',
      key: 'openTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => moment(row?.openTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Цена входа',
      dataIndex: 'openPrice',
      key: 'openPrice',
    },
    {
      title: 'Объем',
      dataIndex: 'openVolume',
      key: 'openVolume',
    },
    {
      title: 'Стоп цена',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (value, row) => {
        const percent = row.openPrice > row?.stopLoss ? row.openPrice / row?.stopLoss : row?.stopLoss / row.openPrice;

        return `${row?.stopLoss} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
    },
    {
      title: 'Тейк цена',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      render: (value, row) => {
        const percent = row.openPrice > row?.takeProfit ? row.openPrice / row?.takeProfit : row?.takeProfit / row.openPrice;

        return `${row?.takeProfit} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
    },
    {
      title: 'Время выхода',
      dataIndex: 'closeTime',
      key: 'closeTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => moment(row?.closeTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'RR',
      dataIndex: 'RR',
      key: 'RR',
      align: 'right',
      render: (value) => value?.toFixed(2),
    },
    {
      title: 'Финрез',
      dataIndex: 'newPnl',
      key: 'newPnl',
      align: 'right',
      render: (value, row) => (row.newPnl ? `${row.newPnl.toFixed(2)}%` : '-'),
    },
  ].filter(Boolean);

  return (
    <Layout>
      <Content style={{ padding: 0, paddingRight: 20 }}>
        <div style={{ position: 'relative' }}>
          <Space style={{ top: 8, position: 'absolute', zIndex: 3, left: 8 }}>
            <TimeframeSelect value={tf} onChange={setSize} />
            <TickerSelect filterSymbols={stockTickers} value={tickerStock} onSelect={onSelectTicker('stock')} />
            <TickerSelect filterSymbols={futureTickers} value={_tickerFuture} onSelect={onSelectTicker('future')} />
            {/*<Select*/}
            {/*    value={tickerFuture}*/}
            {/*    showSearch*/}
            {/*    placeholder="Введи тикер"*/}
            {/*    onSelect={onSelectTicker('future')}*/}
            {/*    filterOption={(input, option) =>*/}
            {/*        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())*/}
            {/*    }*/}
            {/*    style={{width: 160}}*/}
            {/*    options={options}*/}
            {/*/>*/}
            <RangePicker
              presets={rangePresets}
              value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
              format="YYYY-MM-DD"
              style={{ width: '240px' }}
              onChange={onChangeRangeDates}
            />

            <Select
              value={expirationMonth}
              onSelect={setexpirationMonth}
              style={{ width: 80 }}
              options={expirationMonths.map((v) => ({ label: v, value: v }))}
            />
            {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
            {/*{positions.length}*/}
            {/*<Checkbox checked={useHage} onChange={(e) => setuseHage(e.target.checked)}>*/}
            {/*  Хеджировать акцией*/}
            {/*</Checkbox>*/}
          </Space>
          <Chart
            hideCross
            lineSerieses={ls}
            primitives={primitives}
            markers={[]}
            toolTipTop="40px"
            toolTipLeft="4px"
            data={data}
            ema={[]}
            onChange={onChangeChart}
            maximumFractionDigits={4}
          />
          <Row style={{ paddingBottom: '8px', paddingTop: 8 }} gutter={8}>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic
                  title="Общий финрез"
                  value={`${PnL.toFixed(2)}%`}
                  precision={2}
                  valueStyle={{
                    color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                  }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic title="Комиссия" value={`${Fee.toFixed(2)}%`} precision={2} valueStyle={{ color: 'rgb(255, 117, 132)' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic
                  title="Тейки"
                  value={new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                  }).format(profits)}
                  valueStyle={{ color: 'rgb(44, 232, 156)' }}
                  suffix={`(${!profits ? 0 : ((profits * 100) / (profits + losses)).toFixed(2)})%`}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic
                  title="Лоси"
                  value={new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                  }).format(losses)}
                  valueStyle={{ color: 'rgb(255, 117, 132)' }}
                  suffix={`(${!losses ? 0 : ((losses * 100) / (profits + losses)).toFixed(2)})%`}
                />
              </Card>
            </Col>
          </Row>
          <Table
            size="small"
            dataSource={positions}
            columns={historyColumns as any}
            pagination={{
              pageSize: 30,
            }}
            onRow={(record) => {
              return {
                style:
                  record.newPnl < 0
                    ? {
                        backgroundColor: '#d1261b66',
                        color: 'rgb(255, 117, 132)',
                      }
                    : record.newPnl > 0
                      ? {
                          backgroundColor: '#15785566',
                          color: 'rgb(44, 232, 156)',
                        }
                      : undefined,
                className: 'hoverable',
              };
            }}
          />
        </div>
      </Content>
      <Sider width="300px" style={{ marginRight: '-20px', padding: 20 }}>
        <Checkbox.Group
          onChange={setCheckboxValues}
          value={Array.from(checkboxValues)}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <Checkbox key="enableEMA" value="enableEMA">
            Скользящая средняя EMA
          </Checkbox>
          <Typography style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div>Период EMA</div>
            <ColorPicker
              value={colors.ema}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, ema: val.toRgbString() }))}
            />
          </Typography>
          <Slider value={emaPeriod} min={1} max={300} step={1} onChange={setEmaPeriod} />
          <Divider plain orientation="left" style={{ margin: '0 0 8px' }} />
          <Checkbox key="enableBB" value="enableBB">
            Индикатор Бойленджера
          </Checkbox>
          <Typography style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div>Период BB EMA</div>
            <ColorPicker
              value={colors.bbEma}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, bbEma: val.toRgbString() }))}
            />
          </Typography>
          <Slider value={emaBBPeriod} min={1} max={300} step={1} onChange={setEmaBBPeriod} />
          <FormItem label="Стандартное отклонение" layout="vertical" style={{ margin: 0 }}>
            <Slider value={bbMiltiplier} min={1} max={10} step={1} onChange={setbbMiltiplier} />
          </FormItem>
          <Divider plain orientation="left" style={{ margin: '0 0 8px' }} />
          <div style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <Checkbox key="enableCalculateFuturePrice" value="enableCalculateFuturePrice">
              Рассчетная цена фьюча
            </Checkbox>
            <ColorPicker
              value={colors.truthPrice}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, truthPrice: val.toRgbString() }))}
            />
          </div>
          <div style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <Checkbox key="enableZeroLine" value="enableZeroLine">
              Уровень единицы
            </Checkbox>
            <ColorPicker
              value={colors.zeroLevel}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, zeroLevel: val.toRgbString() }))}
            />
          </div>
          <Checkbox key="enable1percent" value="enable1percent">
            +-1% от машки
          </Checkbox>
          <Checkbox key="enable2percent" value="enable2percent">
            +-2% от машки
          </Checkbox>
          <Checkbox key="enable3percent" value="enable3percent">
            +-3% от машки
          </Checkbox>
        </Checkbox.Group>
      </Sider>
    </Layout>
  );
};
