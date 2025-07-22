import { Slider, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
import { Chart } from '../../SoloTestPage/UpdatedChart';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateTruthFuturePrice, getCommonCandles } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { useGetHistoryQuery, useGetSecurityDetailsQuery } from '../../api/alor.api.ts';
import { Exchange } from 'alor-api';
import { useAppSelector } from '../../store.ts';
import { DatesPicker } from '../../DatesPicker.tsx';
import { LineStyle } from 'lightweight-charts';

export const SI_GOLD_Page = ({ onlyChart, height, seriesType = 'Candlestick' }: any) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [diff, setDiff] = useState<number>(0.015);

  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);
  const expirationMonth = searchParams.get('expirationMonth') || '9.25';

  const { data: details } = useGetSecurityDetailsQuery({ ticker: `SI-${expirationMonth}` });

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';

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
  const commonCandles = getCommonCandles(GLDRUBF_Data, siData);

  const truthPriceSeriesDivsData = useMemo(
    () =>
      commonCandles.filteredStockCandles.map(
        ({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate), []) / close,
      ),
    [commonCandles.filteredStockCandles, expirationDate],
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

      const res = filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, 31100)).filter(Boolean);
      if (seriesType === 'Line') {
        return res.map((r) => ({ ...r, value: r.close }));
      }

      return res;
    }
    return GOLD_data;
  }, [GOLD_data, GD_Data, seriesType]);

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

  const ls = useMemo(() => {
    if (!data.length) {
      return [];
    }
    const startDateMap = {
      '3.25': '2024-12-20',
      '6.25': '2025-03-20',
      '9.25': '2025-06-20',
      '12.25': '2025-09-20',
    };

    const t = startDateMap[expirationMonth];
    const from = dayjs(`${t}`);
    const to = dayjs(expirationDate);

    const rate = 0.2;
    const ratePerQuartal = rate / 4;

    return [
      {
        id: 'rate',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((d, i) => ({ time: d.time, value: truthPriceSeriesDivsData[i] })),

        //   [
        //   { time: from.unix(), value: 100 - ratePerQuartal * 100 },
        //   { time: to.unix(), value: 100 },
        // ],
      },
    ].filter(Boolean);
  }, [data, expirationDate, expirationMonth, truthPriceSeriesDivsData]);

  if (onlyChart) {
    return (
      <div className="relative" style={{ height }}>
        <div
          style={{
            top: 8,
            position: 'absolute',
            zIndex: 3,
            left: 8,
            gap: 8,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Typography.Text>GLDRUBF/SI/GD</Typography.Text>
          {/*<TimeframeSelect value={tf} onChange={setSize} />*/}
          <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
          {/*<Radio.Group value={feePerTrade} onChange={(e) => setFeePerTrade(Number(e.target.value))}>*/}
          {/*  <Radio.Button value={0.1}>0.1%</Radio.Button>*/}
          {/*  <Radio.Button value={0.04}>0.04%</Radio.Button>*/}
          {/*  <Radio.Button value={0.025}>0.025%</Radio.Button>*/}
          {/*  <Radio.Button value={0.015}>0.015%</Radio.Button>*/}
          {/*</Radio.Group>*/}
          {/*<Radio.Group value={minimumTradeDiff} onChange={(e) => setMinimumTradeDiff(Number(e.target.value))}>*/}
          {/*  <Radio.Button value={0.001}>0.1%</Radio.Button>*/}
          {/*  <Radio.Button value={0.002}>0.2%</Radio.Button>*/}
          {/*  <Radio.Button value={0.003}>0.3%</Radio.Button>*/}
          {/*</Radio.Group>*/}
          {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
        </div>
        <Chart
          hideCross
          height={height}
          lineSerieses={ls}
          primitives={[]}
          seriesType={seriesType}
          markers={[]}
          toolTipTop="40px"
          toolTipLeft="4px"
          data={data}
          ema={[]}
          maximumFractionDigits={4}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Slider value={diff} min={0.01} max={0.05} step={0.001} onChange={setDiff} />
      <div
        style={{
          top: 8,
          position: 'absolute',
          zIndex: 3,
          left: 8,
          gap: 8,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TimeframeSelect value={tf} onChange={setSize} />
        <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
        {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
      </div>
      <Chart
        hideCross
        lineSerieses={ls}
        primitives={[]}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        data={data}
        ema={[]}
        maximumFractionDigits={4}
      />
      {/*<Typography.Title>GOLD-sint</Typography.Title>*/}
      {/*<Chart*/}
      {/*  hideCross*/}
      {/*  lineSerieses={[]}*/}
      {/*  primitives={[]}*/}
      {/*  seriesType={[]}*/}
      {/*  markers={[]}*/}
      {/*  toolTipTop="40px"*/}
      {/*  toolTipLeft="4px"*/}
      {/*  data={data}*/}
      {/*  ema={[]}*/}
      {/*  maximumFractionDigits={4}*/}
      {/*/>*/}
      {/*<Typography.Title>SI-{expirationMonth}</Typography.Title>*/}
      {/*<Chart*/}
      {/*  hideCross*/}
      {/*  lineSerieses={[]}*/}
      {/*  primitives={[]}*/}
      {/*  seriesType={[]}*/}
      {/*  markers={[]}*/}
      {/*  toolTipTop="40px"*/}
      {/*  toolTipLeft="4px"*/}
      {/*  data={siData}*/}
      {/*  ema={[]}*/}
      {/*  maximumFractionDigits={4}*/}
      {/*/>*/}
      {/*<Typography.Title>GLDRUBF</Typography.Title>*/}
      {/*<Chart*/}
      {/*  hideCross*/}
      {/*  lineSerieses={[]}*/}
      {/*  primitives={[]}*/}
      {/*  seriesType={[]}*/}
      {/*  markers={[]}*/}
      {/*  toolTipTop="40px"*/}
      {/*  toolTipLeft="4px"*/}
      {/*  data={GLDRUBF_Data}*/}
      {/*  ema={[]}*/}
      {/*  maximumFractionDigits={4}*/}
      {/*/>*/}
      {/*<Typography.Title>GD-{expirationMonth}</Typography.Title>*/}
      {/*<Chart*/}
      {/*  hideCross*/}
      {/*  lineSerieses={[]}*/}
      {/*  primitives={[]}*/}
      {/*  seriesType={[]}*/}
      {/*  markers={[]}*/}
      {/*  toolTipTop="40px"*/}
      {/*  toolTipLeft="4px"*/}
      {/*  data={GD_Data}*/}
      {/*  ema={[]}*/}
      {/*  maximumFractionDigits={4}*/}
      {/*/>*/}
    </div>
  );
};
