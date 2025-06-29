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

export const SI_CNY_Page = () => {
  const [token, setToken] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.005);
  const [_data, setData] = useState({ cnyData: [], ucnyData: [], siData: [] });
  const { siData, ucnyData, cnyData } = _data;

  const month = '6.25';

  const SI_data = useMemo(() => {
    const { filteredStockCandles: ucnyCandles, filteredFuturesCandles: cnyCandles } = getCommonCandles(ucnyData, cnyData);

    return ucnyCandles
      .map((ucnyCandle, index) => {
        const cnyCandle = cnyCandles[index];
        if (!cnyCandle) {
          return null;
        }
        if (!ucnyCandle) {
          return null;
        }

        return {
          open: cnyCandle.open * ucnyCandle.open,
          close: cnyCandle.close * ucnyCandle.close,
          high: cnyCandle.high * ucnyCandle.high,
          low: cnyCandle.low * ucnyCandle.low,
          time: cnyCandle.time,
        } as HistoryObject;
      })
      .filter(Boolean);
  }, [ucnyData, cnyData]);

  const data = useMemo(() => {
    if (SI_data?.length && siData?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(SI_data, siData);

      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 1000)).filter(Boolean);
    }
    return SI_data;
  }, [SI_data, siData]);

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
    token &&
      Promise.all([
        fetchCandlesFromAlor(`SI-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`CNY-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`UCNY-${month}`, tf, fromDate, toDate, null, token),
      ]).then(([siData, cnyData, ucnyData]) => setData({ siData, ucnyData, cnyData }));
  }, [tf, fromDate, toDate, token]);

  const avg = 1;
  const sellLineData = useMemo(() => data.map((s) => avg + diff), [data, diff]);
  const sellLineDatax2 = useMemo(() => data.map((s) => avg + diff * 2), [data, diff]);
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
            color: 'rgb(157, 43, 56)',
            lineWidth: 1,
            priceLineVisible: false,
            data: sellLineDatax2,
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
      <Typography.Title>SI-sint</Typography.Title>
      <Chart data={SI_data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>SI-{month}</Typography.Title>
      <Chart data={siData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>UCNY-{month}</Typography.Title>
      <Chart data={ucnyData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>CNY-{month}</Typography.Title>
      <Chart data={cnyData} tf={tf} maximumFractionDigits={3} />
    </>
  );
};
