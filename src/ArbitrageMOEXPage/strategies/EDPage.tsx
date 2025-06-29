import { DatePicker, Slider, Space, TimeRangePickerProps, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../Chart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { LineStyle } from 'lightweight-charts';

const { RangePicker } = DatePicker;

export const EDPage = () => {
  const [token, setToken] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.005);
  const tickerStock = 'TATN';
  const tickerFuture = 'TATNP';
  const [_data, setData] = useState({ euData: [], edData: [], siData: [] });
  const { siData, edData, euData } = _data;

  const month = '6.25';

  const EUR_USD_data = useMemo(() => {
    const { filteredStockCandles: euCandles, filteredFuturesCandles: siCandles } = getCommonCandles(edData, siData);

    return euCandles
      .map((euCandle, index) => {
        const siCandle = siCandles[index];
        if (!siCandle) {
          return null;
        }
        if (!euCandle) {
          return null;
        }

        return {
          open: siCandle.open * euCandle.open,
          close: siCandle.close * euCandle.close,
          high: siCandle.high * euCandle.high,
          low: siCandle.low * euCandle.low,
          time: siCandle.time,
        } as HistoryObject;
      })
      .filter(Boolean);
  }, [edData, siData]);

  const data = useMemo(() => {
    if (EUR_USD_data?.length && euData?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(EUR_USD_data, euData);

      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 1)).filter(Boolean);
    }
    return EUR_USD_data;
  }, [EUR_USD_data, euData]);

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
        fetchCandlesFromAlor(`EU-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`ED-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`SI-${month}`, tf, fromDate, toDate, null, token),
      ]).then(([euData, edData, siData]) => setData({ siData, edData, euData }));
  }, [tf, tickerStock, tickerFuture, fromDate, toDate, token]);

  const avg = 1;
  const sellLineData = useMemo(() => data.map((s) => avg + diff), [data, diff]);
  const zeroLineData = useMemo(() => data.map((s) => avg), [data]);
  const buyLineData = useMemo(() => data.map((s) => avg - diff), [data, diff]);
  const buyLineDatax2 = useMemo(() => data.map((s) => avg - diff * 2), [data, diff]);

  return (
    <>
      <Slider value={diff} min={0.01} max={0.05} step={0.001} onChange={setDiff} />
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
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
          {
            color: 'rgb(20, 131, 92)',
            lineWidth: 1,
            priceLineVisible: false,
            data: buyLineDatax2,
            lineStyle: LineStyle.Dashed,
          },
        ]}
      />
      <Typography.Title>EUR_USD-sint</Typography.Title>
      <Chart data={EUR_USD_data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>EU-{month}</Typography.Title>
      <Chart data={euData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>ED-{month}</Typography.Title>
      <Chart data={edData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>SI-{month}</Typography.Title>
      <Chart data={siData} tf={tf} maximumFractionDigits={3} />
    </>
  );
};
