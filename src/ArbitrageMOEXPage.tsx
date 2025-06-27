import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Checkbox, DatePicker, Slider, Space, TimeRangePickerProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Chart } from './Chart';
import { calculateCandle, calculateEMA, symbolFuturePairs } from '../symbolFuturePairs';
import moment from 'moment';
import { calculateMultiple, fetchCandlesFromAlor, getCommonCandles, refreshToken } from './utils';
import { TickerSelect } from './TickerSelect';
import { TimeframeSelect } from './TimeframeSelect';
import { moneyFormat } from './MainPage/MainPage.tsx';

const { RangePicker } = DatePicker;

export const ArbitrageMOEXPage = () => {
  const [useHage, setuseHage] = useState<boolean>(false);
  const [token, setToken] = useState();
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

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

  const tickerFuture = useMemo(() => {
    if (_tickerFuture) {
      return _tickerFuture;
    }

    const ticker = symbolFuturePairs.find((pair) => pair.stockSymbol === tickerStock)?.futuresSymbol;
    if (ticker) {
      return `${ticker}-9.25`;
    }
    return ticker;
  }, [tickerStock, _tickerFuture]);

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

  console.log(positions);

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
      <Chart inputTreshold={inputTreshold} data={data} tf={tf} onChange={onChangeChart} />
      <Chart data={futureData} tf={tf} />
      <Chart data={stockData} tf={tf} />
    </>
  );
};
