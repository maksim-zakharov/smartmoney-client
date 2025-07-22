import { Card, Col, DatePicker, Radio, Row, Select, Statistic, Table, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
// import { Chart } from '../../Chart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCommonCandles, getOvernightDays } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { LineStyle } from 'lightweight-charts';
import { Chart } from '../../SoloTestPage/UpdatedChart';
import { useGetHistoryQuery, useGetSecurityDetailsQuery } from '../../api/alor.api.ts';
import { useTdCandlesQuery } from '../../twelveApi.ts';
import { Exchange } from 'alor-api';
import { useAppSelector } from '../../store.ts';
import { DatesPicker } from '../../DatesPicker.tsx';

const { RangePicker } = DatePicker;

export const Triangle_Page = ({ first, second, third, multiple, noExp, onlyChart, height, seriesType = 'Candlestick' }: any) => {
  // 3.21 6.20 9.19 12.18
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);

  const [feePerTrade, setFeePerTrade] = useState(0.04);
  const [minimumTradeDiff, setMinimumTradeDiff] = useState(0.001);

  const overnightFee = 0.08;

  const isThirdForex = third.includes(':');

  const expirationMonth = searchParams.get('expirationMonth') || '9.25';
  const setexpirationMonth = (value) => {
    searchParams.set('expirationMonth', value);
    setSearchParams(searchParams);
  };

  const { data: _siData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: noExp ? first : `${first}-${expirationMonth}`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !first || !apiAuth,
    },
  );

  const siData = _siData?.history || [];

  const { data: _cnyData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: noExp ? second : `${second}-${expirationMonth}`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !second || !apiAuth,
    },
  );

  const cnyData = _cnyData?.history || [];

  const { data: _ucnyData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: noExp ? third : `${third}-${expirationMonth}`,
      exchange: Exchange.MOEX,
    },
    {
      pollingInterval: 5000,
      skip: !third || !apiAuth,
    },
  );

  const ucnyData = _ucnyData?.history || [];

  const fxTfMap = {
    '60': '1min',
    '300': '5min',
    '900': '15min',
    '1800': '30min',
    // '900': '45min',
    '3600': '1h',
    // '900': '2h',
    '14400': '4h',
    // '900': '8h',
    D: '1day',
    // '900': '1week',
  };

  const { data: fxThirdData } = useTdCandlesQuery(
    {
      start_date: dayjs(fromDate * 1000).format('YYYY-MM-DD'),
      outputsize: 5000,
      symbol: third.split(':')[1],
      interval: fxTfMap[tf],
      apikey: '20dc749373754927b09d95723d963e88',
    },
    {
      skip: !isThirdForex,
    },
  );

  const fxThirdCandles = (fxThirdData?.values || []).map((v) => ({
    time: dayjs(v.datetime).unix(),
    open: Number(v.open),
    close: Number(v.close),
    low: Number(v.low),
    high: Number(v.high),
  }));

  useEffect(() => {
    if (isThirdForex) {
      // setData((prevState) => ({ ...prevState, ucnyData: fxThirdCandles }));
    }
  }, [isThirdForex, fxThirdCandles]);

  const startDateMap = {
    '3.25': '2024-12-20',
    '6.25': '2025-03-20',
    '9.25': '2025-06-20',
    '12.25': '2025-09-20',
  };

  const rate = 0.2;
  const ratePerQuartal = rate / 4;

  const { data: details } = useGetSecurityDetailsQuery({ ticker: third });

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';

  const expirationMonths = useMemo(() => {
    const startYear = 24;
    const months = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 1; j <= 4; j++) {
        months.push(`${3 * j}.${startYear + i}`);
      }
    }

    return months;
  }, []);

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

      const res = filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, multiple)).filter(Boolean);

      if (seriesType === 'Line') {
        return res.map((r) => ({ ...r, value: r.close }));
      }
      return res;
    }
    return _data2;
  }, [seriesType, _data2, ucnyData]);

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

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const buyPositions = [];

    let currentPosition;

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      const minStepGoal = 0.001;

      // Если позы еще нет
      if (!currentPosition) {
        // И появился сигнал на покупку
        if (candle.low <= 1 - minimumTradeDiff) {
          // Покупаем
          currentPosition = {
            side: 'long',
            openPrice: 1 - minimumTradeDiff,
            stopLoss: 1 - minimumTradeDiff,
            openTime: candle.time,
            qty: 1,
          };
        } else if (candle.high >= 1 + minimumTradeDiff) {
          // Покупаем
          currentPosition = {
            side: 'short',
            openPrice: 1 + minimumTradeDiff,
            stopLoss: 1 + minimumTradeDiff,
            openTime: candle.time,
            qty: 1,
          };
        }
      } else {
        // Если поза есть и сигнал на покупку усилился - усредняемся
        if (currentPosition.qty === 1 && currentPosition.side === 'short' && candle.high >= 1 + minimumTradeDiff + minStepGoal) {
          currentPosition.qty = 2;
          // continue;
        }
        if (currentPosition.qty === 2 && currentPosition.side === 'short' && candle.high >= 1 + minimumTradeDiff + minStepGoal * 2) {
          currentPosition.qty = 3;
          // continue;
        }

        if (currentPosition.qty === 1 && currentPosition.side === 'long' && candle.low <= 1 - minimumTradeDiff + minStepGoal) {
          currentPosition.qty = 2;
          // continue;
        }
        if (currentPosition.qty === 2 && currentPosition.side === 'long' && candle.low <= 1 - minimumTradeDiff + minStepGoal * 2) {
          currentPosition.qty = 3;
          // continue;
        }

        // Если цель не достигнута - мимо
        if (
          currentPosition &&
          ((currentPosition.side === 'long' && candle.high < 1) || (currentPosition.side === 'short' && candle.low > 1))
        ) {
          continue;
        }

        // Цель достигнута, закрываем позу
        currentPosition = {
          ...currentPosition,
          closeTime: candle.time,
          takeProfit: 1,
          closePrice: 1,
        };

        const percent =
          currentPosition.openPrice > currentPosition?.takeProfit
            ? currentPosition.openPrice / currentPosition?.takeProfit
            : currentPosition?.takeProfit / currentPosition.openPrice;

        const profit = (percent - 1) * 100 * currentPosition.qty;

        // Посчитать овернайт

        const startTime = dayjs(currentPosition.openTime * 1000);
        const endTime = dayjs(currentPosition.closeTime * 1000);

        const totalOvernightFee = getOvernightDays(startTime, endTime) * overnightFee;
        currentPosition.totalOvernightFee = totalOvernightFee;

        currentPosition.fee = totalOvernightFee + feePerTrade * 2;

        currentPosition.newPnl = profit - currentPosition.fee;
        buyPositions.push(currentPosition);

        currentPosition = null;
      }
    }

    return buyPositions.sort((a, b) => b.openTime - a.openTime);
  }, [data, feePerTrade, minimumTradeDiff]);

  const primitives = [];

  const ls = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const avg = 1;
    const sellLineDataSm = data.map((s) => avg + 0.005);
    const sellLineData = data.map((s) => avg + 0.01);
    const sellLineDatax2 = data.map((s) => avg + 0.015);
    const zeroLineData = data.map((s) => avg);
    const buyLineDataSmm = data.map((s) => avg - 0.001);
    const buyLineDataSm = data.map((s) => avg - 0.005);
    const buyLineData = data.map((s) => avg - 0.01);
    const buyLineDatax2 = data.map((s) => avg - 0.015);

    const t = startDateMap[expirationMonth];
    const from = dayjs(`${t}`);
    const to = dayjs(expirationDate);

    return [
      // {
      //   id: 'rate',
      //   options: {
      //     color: 'rgb(157, 43, 56)',
      //     lineWidth: 1,
      //     priceLineVisible: false,
      //     lineStyle: LineStyle.Dashed,
      //   },
      //   data: [
      //     { time: from.unix(), value: 1 - ratePerQuartal },
      //     { time: to.unix(), value: 1 },
      //   ],
      // },
      {
        id: 'sellLineDataSm',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellLineDataSm[i] })),
      },
      {
        id: 'sellLineData',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellLineData[i] })),
      },
      {
        id: 'sellLineDatax2',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellLineDatax2[i] })),
      },
      {
        id: 'zeroLineData',
        options: {
          color: 'rgb(255, 186, 102)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: zeroLineData[i] })),
      },
      {
        id: 'buyLineDataSm',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyLineDataSm[i] })),
      },
      {
        id: 'buyLineDataSmm',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyLineDataSmm[i] })),
      },
      {
        id: 'buyLineData',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyLineData[i] })),
      },
      {
        id: 'buyLineDatax2',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyLineDatax2[i] })),
      },
    ].filter(Boolean);
  }, [data, expirationDate, expirationMonth, ratePerQuartal, startDateMap]);

  const historyColumns = [
    {
      title: 'Время входа',
      dataIndex: 'openTime',
      key: 'openTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => moment(row?.openTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Цена входа',
      dataIndex: 'openPrice',
      key: 'openPrice',
    },
    {
      title: 'Тейк цена',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      render: (value, row) => {
        const percent = row.openPrice > row?.takeProfit ? row.openPrice / row?.takeProfit : row?.takeProfit / row.openPrice;

        return `${row?.takeProfit} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
    },
    {
      title: 'Время выхода',
      dataIndex: 'closeTime',
      key: 'closeTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => moment(row?.closeTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Овернайт',
      dataIndex: 'newPnl',
      key: 'totalOvernightFee',
      align: 'right',
      render: (value, row) => (row.totalOvernightFee ? `${row.totalOvernightFee.toFixed(2)}%` : '-'),
    },
    {
      title: 'Общ. комиссия',
      dataIndex: 'newPnl',
      key: 'fee',
      align: 'right',
      render: (value, row) => (row.fee ? `${row.fee.toFixed(2)}%` : '-'),
    },
    {
      title: 'Финрез',
      dataIndex: 'newPnl',
      key: 'newPnl',
      align: 'right',
      render: (value, row) => (row.newPnl ? `${row.newPnl.toFixed(2)}%` : '-'),
    },
  ].filter(Boolean);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions]);

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
          <Typography.Text>
            {first}/{second}/{third}
          </Typography.Text>
          <TimeframeSelect value={tf} onChange={setSize} />
          <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />

          {!noExp && (
            <Select
              value={expirationMonth}
              onSelect={setexpirationMonth}
              style={{ width: 160 }}
              options={expirationMonths.map((v) => ({ label: v, value: v }))}
            />
          )}
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
          primitives={primitives}
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

        <Select
          value={expirationMonth}
          onSelect={setexpirationMonth}
          style={{ width: 160 }}
          options={expirationMonths.map((v) => ({ label: v, value: v }))}
        />
        <Radio.Group value={feePerTrade} onChange={(e) => setFeePerTrade(Number(e.target.value))}>
          <Radio.Button value={0.1}>0.1%</Radio.Button>
          <Radio.Button value={0.04}>0.04%</Radio.Button>
          <Radio.Button value={0.025}>0.025%</Radio.Button>
          <Radio.Button value={0.015}>0.015%</Radio.Button>
        </Radio.Group>
        <Radio.Group value={minimumTradeDiff} onChange={(e) => setMinimumTradeDiff(Number(e.target.value))}>
          <Radio.Button value={0.001}>0.1%</Radio.Button>
          <Radio.Button value={0.002}>0.2%</Radio.Button>
          <Radio.Button value={0.003}>0.3%</Radio.Button>
        </Radio.Group>
        {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
      </div>
      <Chart
        hideCross
        lineSerieses={ls}
        primitives={primitives}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        data={data}
        ema={[]}
        maximumFractionDigits={4}
      />
      <Row style={{ paddingBottom: '8px' }} gutter={8}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Общий финрез"
              value={`${PnL.toFixed(2)}%`}
              precision={2}
              valueStyle={{
                color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="Комиссия" value={`${Fee.toFixed(2)}%`} precision={2} valueStyle={{ color: 'rgb(255, 117, 132)' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Тейки"
              value={new Intl.NumberFormat('en-US', {
                notation: 'compact',
              }).format(profits)}
              valueStyle={{ color: 'rgb(44, 232, 156)' }}
              suffix={`(${!profits ? 0 : ((profits * 100) / (profits + losses)).toFixed(2)})%`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="Лоси"
              value={new Intl.NumberFormat('en-US', {
                notation: 'compact',
              }).format(losses)}
              valueStyle={{ color: 'rgb(255, 117, 132)' }}
              suffix={`(${!losses ? 0 : ((losses * 100) / (profits + losses)).toFixed(2)})%`}
            />
          </Card>
        </Col>
      </Row>
      <Table
        size="small"
        dataSource={positions}
        columns={historyColumns as any}
        pagination={{
          pageSize: 30,
        }}
        onRow={(record) => {
          return {
            style:
              record.newPnl < 0
                ? {
                    backgroundColor: '#d1261b66',
                    color: 'rgb(255, 117, 132)',
                  }
                : record.newPnl > 0
                  ? {
                      backgroundColor: '#15785566',
                      color: 'rgb(44, 232, 156)',
                    }
                  : undefined,
            className: 'hoverable',
          };
        }}
      />
      <Typography.Title>SI-sint</Typography.Title>
      <Chart
        data={_data2}
        hideCross
        lineSerieses={[]}
        primitives={[]}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        ema={[]}
        maximumFractionDigits={3}
      />
      <Typography.Title>SI-{expirationMonth}</Typography.Title>
      <Chart
        data={siData}
        hideCross
        lineSerieses={[]}
        primitives={[]}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        ema={[]}
        maximumFractionDigits={3}
      />
      <Typography.Title>UCNY-{expirationMonth}</Typography.Title>
      <Chart
        data={ucnyData}
        hideCross
        lineSerieses={[]}
        primitives={[]}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        ema={[]}
        maximumFractionDigits={3}
      />
      <Typography.Title>CNY-{expirationMonth}</Typography.Title>
      <Chart
        data={cnyData}
        hideCross
        lineSerieses={[]}
        primitives={[]}
        markers={[]}
        toolTipTop="40px"
        toolTipLeft="4px"
        ema={[]}
        maximumFractionDigits={3}
      />
    </div>
  );
};
