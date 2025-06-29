import { DatePicker, Slider, Space, TimeRangePickerProps } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../Chart';
import { LineStyle } from 'lightweight-charts';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateMultiple, fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils.ts';
import moment from 'moment';
import { calculateCandle } from '../../../symbolFuturePairs.ts';

const { RangePicker } = DatePicker;

export const CNTLPage = () => {
  const [token, setToken] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.015);
  const tickerStock = 'CNTL';
  const tickerFuture = 'CNTLP';
  const [_data, setData] = useState({ futureData: [], stockData: [] });
  const { stockData, futureData } = _data;

  const multiple = useMemo(
    () =>
      _data.stockData?.length && _data.futureData?.length
        ? calculateMultiple(_data.stockData[_data.stockData.length - 1].close, _data.futureData[_data.futureData.length - 1].close)
        : 0,
    [_data],
  );

  const data = useMemo(() => {
    if (stockData?.length && futureData?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(stockData, futureData);

      return filteredFuturesCandles
        .map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple)))
        .filter(Boolean);
    }
    return stockData;
  }, [stockData, futureData, multiple]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

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

  useEffect(() => {
    tickerFuture &&
      token &&
      Promise.all([
        fetchCandlesFromAlor(tickerFuture, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(tickerStock, tf, fromDate, toDate, null, token),
      ]).then(([futureData, stockData]) => setData({ stockData, futureData }));
  }, [tf, tickerStock, tickerFuture, fromDate, toDate, token]);

  const avg = 0.7;
  const sellLineData = useMemo(() => stockData.map((s) => avg + diff), [stockData, diff]);
  const zeroLineData = useMemo(() => stockData.map((s) => avg), [stockData]);
  const buyLineData = useMemo(() => stockData.map((s) => avg - diff), [stockData, diff]);

  return (
    <>
      <Slider value={diff} min={0.01} max={0.05} step={0.001} onChange={setDiff} />
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
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
        {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
      </Space>
      <Chart
        data={data}
        tf={tf}
        maximumFractionDigits={3}
        customSeries={[
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
