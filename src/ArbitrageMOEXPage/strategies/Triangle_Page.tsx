import { Card, Col, DatePicker, Row, Select, Space, Statistic, Table, TimeRangePickerProps, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import dayjs, { type Dayjs } from 'dayjs';
// import { Chart } from '../../Chart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCandlesFromAlor, getCommonCandles, refreshToken } from '../../utils.ts';
import moment from 'moment';
import { HistoryObject } from '../../sm-lib/models.ts';
import { calculateCandle } from '../../../symbolFuturePairs.js';
import { LineStyle } from 'lightweight-charts';
import { Chart } from '../../SoloTestPage/UpdatedChart';

const { RangePicker } = DatePicker;

export const Triangle_Page = ({ first, second, third, multiple }) => {
  const [token, setToken] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const [_data, setData] = useState({ cnyData: [], ucnyData: [], siData: [] });
  const { siData, ucnyData, cnyData } = _data;

  const expirationMonth = searchParams.get('expirationMonth') || '9.25';
  const setexpirationMonth = (value) => {
    searchParams.set('expirationMonth', value);
    setSearchParams(searchParams);
  };

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
      return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, multiple)).filter(Boolean);
    }
    return _data2;
  }, [_data, _data2, ucnyData]);

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
        fetchCandlesFromAlor(`${first}-${expirationMonth}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`${second}-${expirationMonth}`, tf, fromDate, toDate, null, token),
        fetchCandlesFromAlor(`${third}-${expirationMonth}`, tf, fromDate, toDate, null, token),
      ]).then(([siData, cnyData, ucnyData]) => setData({ siData, ucnyData, cnyData }));
  }, [tf, fromDate, toDate, token, expirationMonth, first, second, third]);

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const buyPositions = [];

    let currentPosition;

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      const goal = 0.001;
      const goal2 = 0.002;
      const goal3 = 0.003;

      // Если позы еще нет
      if (!currentPosition) {
        // И появился сигнал на покупку
        if (candle.low <= 1 - goal) {
          // Покупаем
          currentPosition = {
            side: 'long',
            openPrice: 1 - goal,
            stopLoss: 1 - goal,
            openTime: candle.time,
            qty: 1,
          };
        } else if (candle.high >= 1 + goal) {
          // Покупаем
          currentPosition = {
            side: 'short',
            openPrice: 1 + goal,
            stopLoss: 1 + goal,
            openTime: candle.time,
            qty: 1,
          };
        }
      } else {
        // Если поза есть и сигнал на покупку усилился - усредняемся
        if (currentPosition.qty === 1 && currentPosition.side === 'short' && candle.high >= 1 + goal2) {
          currentPosition.qty = 2;
          // continue;
        }
        if (currentPosition.qty === 2 && currentPosition.side === 'short' && candle.high >= 1 + goal3) {
          currentPosition.qty = 3;
          // continue;
        }

        if (currentPosition.qty === 1 && currentPosition.side === 'long' && candle.low <= 1 - goal2) {
          currentPosition.qty = 2;
          // continue;
        }
        if (currentPosition.qty === 2 && currentPosition.side === 'long' && candle.low <= 1 - goal3) {
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

        currentPosition.fee = 0;

        const percent =
          currentPosition.openPrice > currentPosition?.takeProfit
            ? currentPosition.openPrice / currentPosition?.takeProfit
            : currentPosition?.takeProfit / currentPosition.openPrice;
        currentPosition.newPnl = (percent - 1) * 100 * currentPosition.qty - currentPosition.fee;
        buyPositions.push(currentPosition);

        currentPosition = null;
      }
    }

    return buyPositions.sort((a, b) => b.openTime - a.openTime);
  }, [data]);

  const primitives = [];

  const ls = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const avg = 1;
    const sellLineData = data.map((s) => avg + 0.002);
    const sellLineDatax2 = data.map((s) => avg + 0.003);
    const zeroLineData = data.map((s) => avg);
    const buyLineData = data.map((s) => avg - 0.002);
    const buyLineDatax2 = data.map((s) => avg - 0.003);

    return [
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
  }, [data]);

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

  return (
    <>
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
        <RangePicker
          presets={rangePresets}
          value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
          format="YYYY-MM-DD"
          onChange={onChangeRangeDates}
        />
        <Select
          value={expirationMonth}
          onSelect={setexpirationMonth}
          style={{ width: 160 }}
          options={expirationMonths.map((v) => ({ label: v, value: v }))}
        />
        {/*{profit.PnL}% B:{profit.buyTrades} S:{profit.sellTrades} S:{moneyFormat(positions.totalPnL)}*/}
      </Space>
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
    </>
  );
};
