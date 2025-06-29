import { DatePicker, Slider, Space, TimeRangePickerProps, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect.tsx';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../Chart.tsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';

const { RangePicker } = DatePicker;

export const SI_GOLD_Page = () => {
  const [token, setToken] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.015);
  const [_data, setData] = useState({ GD_Data: [], GLDRUBF_Data: [], siData: [] });
  const { siData, GLDRUBF_Data, GD_Data } = _data;

  const month = '9.25';

  const GOLD_data = useMemo(() => {
    const { filteredStockCandles: ucnyCandles, filteredFuturesCandles: cnyCandles } = getCommonCandles(siData, GD_Data);

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
  }, [siData, GD_Data]);

  const data = useMemo(() => {
    if (GOLD_data?.length && GLDRUBF_Data?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(GOLD_data, GLDRUBF_Data);

      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 1)).filter(Boolean);
    }
    return GOLD_data;
  }, [GOLD_data, GLDRUBF_Data]);

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
        fetchCandlesFromAlor(`GOLD-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`GLDRUBF`, tf, fromDate, toDate, null, token),
      ]).then(([siData, GD_Data, GLDRUBF_Data]) => setData({ siData, GLDRUBF_Data, GD_Data }));
  }, [tf, fromDate, toDate, token]);

  const avg = 0.946;
  // const sellLineData = useMemo(() => stockData.map((s) => avg + diff), [stockData, diff]);
  // const zeroLineData = useMemo(() => stockData.map((s) => avg), [stockData]);
  // const buyLineData = useMemo(() => stockData.map((s) => avg - diff), [stockData, diff]);

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
      <Chart data={data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GOLD-sint</Typography.Title>
      <Chart data={GOLD_data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>SI-{month}</Typography.Title>
      <Chart data={siData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GLDRUBF</Typography.Title>
      <Chart data={GLDRUBF_Data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GD-{month}</Typography.Title>
      <Chart data={GD_Data} tf={tf} maximumFractionDigits={3} />
    </>
  );
};
