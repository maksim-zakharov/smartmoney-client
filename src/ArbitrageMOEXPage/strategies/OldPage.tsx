import { Checkbox, DatePicker, Slider, Space, TimeRangePickerProps } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect.tsx';
import { TickerSelect } from '../../TickerSelect.tsx';
import dayjs, { type Dayjs } from 'dayjs';
import { moneyFormat } from '../../MainPage/MainPage.tsx';
import { Chart } from '../../Chart.tsx';
import { LineStyle } from 'lightweight-charts';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment/moment';
import Decimal from 'decimal.js';
import { calculateMultiple, fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils.ts';
import { calculateCandle, calculateEMA, symbolFuturePairs } from '../../../symbolFuturePairs.ts';
import { fetchSecurityDetails } from '../ArbitrageMOEXPage.tsx';

const { RangePicker } = DatePicker;

export const OldPage = () => {
  const [useHage, setuseHage] = useState<boolean>(false);
  const [token, setToken] = useState();
  const [details, setdetails] = useState();
  const [chartValues, onChangeChart] = useState({ filteredBuyMarkers: [], filteredSellMarkers: [] });
  const [inputTreshold, onChange] = useState(0.01); // 0.6%
  const TresholdEnd = 0.001;
  const fee = 0.0004; // 0.04%
  const [_data, setData] = useState({ futureData: [], stockData: [] });
  const [searchParams, setSearchParams] = useSearchParams();
  const tickerStock = searchParams.get('ticker-stock') || 'SBER';
  const multi = Number(searchParams.get('multi'));
  const _tickerFuture = searchParams.get('ticker-future');
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

  const { stockData, futureData } = _data;

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';
  const taxRate = 0.13;

  /**
   *
   * @param stockPrice Цена акции (их свечки)
   * @param stockTime Время цены акции
   * @param expirationDate Дата экспироции фьюча
   */
  const calculateTruthFuturePrice = (stockPrice: number, stockTime: number, expirationDate: Dayjs) => {
    // Ставка ЦБ РФ
    const ruR = 0.2;
    // Ставка ЦБ КНР
    const cyR = 0.03;
    // Сколько осталось дней до экспирации
    const t = expirationDate.diff(dayjs(stockTime * 1000), 'day');

    // Рассчетная цена фьючерса
    const price = stockPrice * (1 + ((ruR - cyR) * t) / 365);

    return price;
  };

  /**
   * Рассчитывает порог арбитража (справедливая премия + издержки)
   * @param stockPrice - Цена акции
   * @param stockTime - Время цены
   * @param expirationDate - Дата экспирации
   * @param taxRate - Налог (например, 0.13 для НДФЛ)
   * @param borrowRate - Ставка по займу (например, 0.20 для 20%)
   */
  const calculateArbitrageThreshold = (
    stockPrice: number,
    stockTime: number,
    expirationDate: Dayjs,
    // commission = 0.004,
    taxRate = 0.13,
    borrowRate = 0.2,
  ) => {
    // Биржевой сбор - процент поделил на 100, 0.00462 - за валютный фьючерс (например Юань)
    const exchangeCommission = new Decimal(0.00462).div(100); // 0.0000462 (0.00462%)
    // Комиссия брокера - 50% биржевого сбора
    const brokerCommission = exchangeCommission.mul(0.5); // 0.0000231
    const totalCommissionRate = exchangeCommission.plus(brokerCommission).toNumber(); // 0.0000693 (0.00693%)

    const truthPrice = calculateTruthFuturePrice(stockPrice, stockTime, expirationDate);

    // Дни до экспирации (дробные)
    const t = expirationDate.diff(dayjs(stockTime * 1000), 'day', true);

    // Издержки:
    const tradeCost = stockPrice * totalCommissionRate * 2; // Покупка + продажа

    // Если бабки берем в кредит
    const borrowCost = stockPrice * ((borrowRate * t) / 365);
    const totalCost = tradeCost + borrowCost;

    // Пороговая цена фьючерса
    const thresholdPrice = truthPrice + totalCost;

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
      return `${ticker}-6.25`;
    }
    return ticker;
  }, [tickerStock, _tickerFuture]);

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

  useEffect(() => {
    tickerFuture &&
      token &&
      Promise.all([
        fetchCandlesFromAlor(tickerFuture, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(tickerStock, tf, fromDate, toDate, null, token),
      ]).then(([futureData, stockData]) => setData({ stockData, futureData }));
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
    () => stockData.map(({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate)) / close),
    [stockData],
  );

  const ArbitrageBuyPriceSeriesData = useMemo(
    () => stockData.map(({ close, time }) => calculateArbitrageThreshold(close, time, dayjs(expirationDate), taxRate, 0) + 0.015),
    [calculateArbitrageThreshold, stockData],
  );

  const ArbitrageSellPriceSeriesData = useMemo(
    () => stockData.map(({ close, time }) => calculateArbitrageThreshold(close, time, dayjs(expirationDate), taxRate, 0) - 0.015),
    [calculateArbitrageThreshold, stockData],
  );

  const sellLineData = useMemo(() => stockData.map((s) => 1 + 0.03), [stockData]);
  const zeroLineData = useMemo(() => stockData.map((s) => 1), [stockData]);
  const buyLineData = useMemo(() => stockData.map((s) => 1 - 0.03), [stockData]);

  const ema = useMemo(
    () =>
      calculateEMA(
        data.map((h) => h.close),
        100,
      )[1],
    [data],
  );

  const profit = useMemo(() => {
    let PnL = 0;
    let buyTrades = 0;
    let sellTrades = 0;
    for (let i = 0; i < chartValues.filteredBuyMarkers.length; i++) {
      const marker = chartValues.filteredBuyMarkers[i];
      const stockCandle = commonCandles.filteredStockCandles[marker.index];
      PnL += inputTreshold - fee * 2; // (stockCandle.close * inputTreshold);
      buyTrades++;
    }
    for (let i = 0; i < chartValues.filteredSellMarkers.length; i++) {
      const marker = chartValues.filteredSellMarkers[i];
      const stockCandle = commonCandles.filteredStockCandles[marker.index];
      PnL += inputTreshold - fee * 2; // (stockCandle.close * inputTreshold);
      sellTrades++;
    }

    return {
      PnL: new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2, // Минимальное количество знаков после запятой
        maximumFractionDigits: 2, // Максимальное количество знаков после запятой
      }).format(PnL * 100),
      buyTrades,
      sellTrades,
    };
  }, [chartValues, inputTreshold, commonCandles]);

  const searchEndPosition = (side: 'buy' | 'sell', type: string, openTime: number, commonData: any[], data: any[]) => {
    const openCandle = commonData.find((f) => f.time === openTime / 1000);

    const endTime = data.find((d, index) => d.time > openCandle?.time && Math.abs(d.close - ema[index]) < TresholdEnd)?.time;

    const closeCandle = commonData.find((f) => f.time === endTime);

    const priceType = side === 'buy' ? 'low' : 'high';

    const currentPosition = {
      side,
      type,
      openPrice: openCandle?.[priceType],
      closePrice: closeCandle?.[priceType],
      openTime: openCandle?.time,
      closeTime: closeCandle?.time,
      PnL: 0,
    };

    if (currentPosition.closePrice && currentPosition.openPrice) {
      currentPosition.PnL = currentPosition.closePrice - currentPosition.openPrice;
    }

    return currentPosition;
  };

  const positions = useMemo(() => {
    const result = {
      positions: [],
      totalPnL: 0,
    };

    for (let i = 0; i < chartValues.filteredBuyMarkers.length; i++) {
      const marker = chartValues.filteredBuyMarkers[i];

      result.positions.push(searchEndPosition('buy', 'future', marker.time, futureData, data));

      if (useHage) {
        const stockPosition = searchEndPosition('sell', 'stock', marker.time, stockData, data);

        stockPosition.PnL *= multiple;
        result.positions.push(stockPosition);
      }
    }

    for (let i = 0; i < chartValues.filteredSellMarkers.length; i++) {
      const marker = chartValues.filteredSellMarkers[i];

      result.positions.push(searchEndPosition('sell', 'future', marker.time, futureData, data));

      if (useHage) {
        const stockPosition = searchEndPosition('buy', 'stock', marker.time, stockData, data);

        stockPosition.PnL *= multiple;
        result.positions.push(stockPosition);
      }
    }

    result.totalPnL = result.positions.reduce((acc, curr) => acc + curr.PnL, 0);

    return result;
  }, [
    chartValues.filteredBuyMarkers,
    chartValues.filteredSellMarkers,
    useHage,
    multiple,
    data,
    ema,
    futureData,
    searchEndPosition,
    stockData,
  ]);

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

  return (
    <>
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
        <TickerSelect filterSymbols={stockTickers} value={tickerStock} onSelect={onSelectTicker('stock')} />
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
          onChange={onChangeRangeDates}
        />
        {profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}
        <Checkbox checked={useHage} onChange={(e) => setuseHage(e.target.checked)}>
          Хеджировать акцией
        </Checkbox>
      </Space>
      <Slider value={inputTreshold} min={0.001} max={0.03} step={0.001} onChange={onChange} />
      <Chart
        data={data}
        tf={tf}
        onChange={onChangeChart}
        maximumFractionDigits={3}
        customSeries={[
          // {
          //   color: 'rgb(255, 186, 102)',
          //   lineWidth: 1,
          //   priceLineVisible: false,
          //   data: truthPriceSeriesData,
          // },
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
          {
            color: 'rgb(157, 43, 56)',
            lineWidth: 1,
            priceLineVisible: false,
            data: sellLineData,
            lineStyle: LineStyle.Dashed,
          },
          {
            color: 'rgb(255, 186, 102)',
            lineWidth: 1,
            priceLineVisible: false,
            data: zeroLineData,
            lineStyle: LineStyle.Dashed,
          },
          {
            color: 'rgb(20, 131, 92)',
            lineWidth: 1,
            priceLineVisible: false,
            data: buyLineData,
            lineStyle: LineStyle.Dashed,
          },
        ]}
      />
    </>
  );
};
