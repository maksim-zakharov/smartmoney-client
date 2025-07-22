import { Slider, Space, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../Chart';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCommonCandles } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { useGetHistoryQuery } from '../../api/alor.api.ts';
import { Exchange } from 'alor-api';
import { useAppSelector } from '../../store.ts';
import { DatesPicker } from '../../DatesPicker.tsx';

export const SI_GOLD_Page = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.015);

  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);
  const expirationMonth = searchParams.get('expirationMonth') || '9.25';

  const { data: _siData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: `SI-${expirationMonth}`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !apiAuth,
    },
  );

  const siData = _siData?.history || [];

  const { data: _cnyData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: `GLDRUBF`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !apiAuth,
    },
  );

  const GLDRUBF_Data = _cnyData?.history || [];

  const { data: _ucnyData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: `GOLD-${expirationMonth}`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !apiAuth,
    },
  );

  const GD_Data = _ucnyData?.history || [];

  const GOLD_data = useMemo(() => {
    const { filteredStockCandles: ucnyCandles, filteredFuturesCandles: cnyCandles } = getCommonCandles(GLDRUBF_Data, siData);

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
          open: ucnyCandle.open / cnyCandle.open,
          close: ucnyCandle.close / cnyCandle.close,
          high: ucnyCandle.high / cnyCandle.high,
          low: ucnyCandle.low / cnyCandle.low,
          time: ucnyCandle.time,
        } as HistoryObject;
      })
      .filter(Boolean);
  }, [GLDRUBF_Data, siData]);

  const data = useMemo(() => {
    if (GOLD_data?.length && GD_Data?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(GOLD_data, GD_Data);

      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 3110000)).filter(Boolean);
    }
    return GOLD_data;
  }, [GOLD_data, GD_Data]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    console.log('Selected Time: ', value);
    console.log('Formatted Selected Time: ', dateString);

    searchParams.set('fromDate', value[0].unix());
    searchParams.set('toDate', value[1].unix());
    setSearchParams(searchParams);
  };

  const avg = 0.946;
  // const sellLineData = useMemo(() => stockData.map((s) => avg + diff), [stockData, diff]);
  // const zeroLineData = useMemo(() => stockData.map((s) => avg), [stockData]);
  // const buyLineData = useMemo(() => stockData.map((s) => avg - diff), [stockData, diff]);

  return (
    <>
      <Slider value={diff} min={0.01} max={0.05} step={0.001} onChange={setDiff} />
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
        <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
        {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
      </Space>
      <Chart data={data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GOLD-sint</Typography.Title>
      <Chart data={GOLD_data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>SI-{expirationMonth}</Typography.Title>
      <Chart data={siData} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GLDRUBF</Typography.Title>
      <Chart data={GLDRUBF_Data} tf={tf} maximumFractionDigits={3} />
      <Typography.Title>GD-{expirationMonth}</Typography.Title>
      <Chart data={GD_Data} tf={tf} maximumFractionDigits={3} />
    </>
  );
};
