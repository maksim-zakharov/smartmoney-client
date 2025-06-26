import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Checkbox, DatePicker, Radio, Select, Slider, Space, TimeRangePickerProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Chart } from './Chart';
import { calculateCandle, symbolFuturePairs } from '../symbolFuturePairs';
import moment from 'moment';
import { calculateMultiple, fetchCandlesFromAlor, getCommonCandles } from './utils';
import { TickerSelect } from './TickerSelect';
import { TimeframeSelect } from './TimeframeSelect';

const { RangePicker } = DatePicker;

export const ArbitrageMOEXPage = () => {
  const [chartValues, onChangeChart] = useState({ filteredBuyMarkers: [], filteredSellMarkers: [] });
  const [inputTreshold, onChange] = useState(0.006); // 0.6%
  const fee = 0.0004; // 0.04%
  const [stockData, setStockData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tickerStock = searchParams.get('ticker-stock') || 'SBER';
  const multi = Number(searchParams.get('multi'));
  const tickerFuture = searchParams.get('ticker-future') || 'SBRF-12.24';
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

  // const tickerFuture = useMemo(() => {
  //   const ticker = symbolFuturePairs.find((pair) => pair.stockSymbol === tickerStock)?.futuresSymbol;
  //   if (ticker) {
  //     return `${ticker}-6.25`;
  //   }
  //   return ticker;
  // }, [tickerStock]);

  const multiple = useMemo(
    () =>
      multi ??
      (stockData?.length && futureData?.length
        ? calculateMultiple(stockData[stockData.length - 1].close, futureData[futureData.length - 1].close)
        : 0),
    [futureData, stockData, multi],
  );

  const stockTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.stockSymbol), []);

  useEffect(() => {
    tickerStock && fetchCandlesFromAlor(tickerStock, tf, fromDate, toDate).then(setStockData);
  }, [tf, tickerStock, fromDate, toDate]);

  useEffect(() => {
    tickerFuture && fetchCandlesFromAlor(tickerFuture, tf, fromDate, toDate).then(setFutureData);
  }, [tf, tickerFuture, fromDate, toDate]);

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
        {profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades}
      </Space>
      <Slider value={inputTreshold} min={0.001} max={0.03} step={0.001} onChange={onChange} />
      <Chart inputTreshold={inputTreshold} data={data} tf={tf} onChange={onChangeChart} />
    </>
  );
};
