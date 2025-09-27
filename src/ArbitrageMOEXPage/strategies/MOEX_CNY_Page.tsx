import { DatePicker, Slider, Space, TimeRangePickerProps, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../Chart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateTruthFuturePrice, fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { LineStyle } from 'lightweight-charts';
import { useGetSecurityDetailsQuery } from '../../api/alor.api';

const { RangePicker } = DatePicker;

export const MOEX_CNY_Page = () => {
  const [token, setToken] = useState();

  const month = '6.25';

  const { data: details } = useGetSecurityDetailsQuery({ ticker: `CNY-${month}` });
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.005);
  const [_data, setData] = useState({ cnyData: [], ucnyData: [], siData: [] });
  const { siData, ucnyData, cnyData } = _data;

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';

  const _data2 = useMemo(() => {
    const { filteredStockCandles: leftCandles, filteredFuturesCandles } = getCommonCandles(siData, cnyData);

    return filteredFuturesCandles
      .map((rightCandle, index) => {
        const leftCandle = leftCandles[index];
        if (!leftCandle) {
          return null;
        }
        if (!rightCandle) {
          return null;
        }

        const open = leftCandle.open / rightCandle.open;
        const close = leftCandle.close / rightCandle.close;
        const high = leftCandle.high / rightCandle.high;
        const low = leftCandle.low / rightCandle.low;

        return {
          open,
          close,
          high,
          low,
          time: leftCandle.time,
        } as HistoryObject;
      })
      .filter(Boolean);
  }, [siData, cnyData]);

  const data = useMemo(() => {
    if (_data2?.length && ucnyData?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(_data2, ucnyData);
      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 4.5)).filter(Boolean);
    }
    return _data2;
  }, [_data2, ucnyData]);

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
        fetchCandlesFromAlor(`IMOEXF`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`CNY-${month}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`MOEXCNY-${month}`, tf, fromDate, toDate, null, token),
      ]).then(([siData, cnyData, ucnyData]) => setData({ siData, ucnyData, cnyData }));
  }, [tf, fromDate, toDate, token]);

  const avg = 1;
  const sellLineData = useMemo(() => data.map((s) => avg + 0.002), [data, diff]);
  const sellLineDatax2 = useMemo(() => data.map((s) => avg + 0.003), [data, diff]);
  const zeroLineData = useMemo(() => data.map((s) => avg), [data]);
  const buyLineData = useMemo(() => data.map((s) => avg - 0.002), [data, diff]);
  const buyLineDatax2 = useMemo(() => data.map((s) => avg - 0.003), [data, diff]);

  const truthPriceSeriesData = useMemo(
    () => _data2.map(({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate), []) / close),
    [_data2, expirationDate],
  );

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
            lineStyle: LineStyle.Dashed,
            data: truthPriceSeriesData,
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
      <Chart data={_data2} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>SI-{month}</Typography.Title>
      <Chart data={siData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>UCNY-{month}</Typography.Title>
      <Chart data={ucnyData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>CNY-{month}</Typography.Title>
      <Chart data={cnyData} tf={tf} maximumFractionDigits={3} />
    </>
  );
};
