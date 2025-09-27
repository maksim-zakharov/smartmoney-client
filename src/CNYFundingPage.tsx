import { Chart } from './SoloTestPage/UpdatedChart';
import React, { useEffect, useMemo, useState } from 'react';
import { fetchCandlesFromAlor, fetchRisk, fetchRiskRates, getSecurity, refreshToken } from './utils';
import { notTradingTime } from './sm-lib/utils';
import dayjs, { type Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { Security } from './api/api';
import { Card, Col, Input, Layout, Row, Statistic, Table } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { TickerSelect } from './TickerSelect';
import { DatesPicker } from './DatesPicker';
import { TimeframeSelect } from './TimeframeSelect';

import moment from 'moment/moment';
import { moneyFormat } from './MainPage/MainPage';
import { LineStyle, Time } from 'lightweight-charts';
import { finishPosition } from './samurai_patterns';

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

export const CNYFundingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [token, setToken] = useState();
  const [security, setSecurity] = useState<Security>();
  const [riskRate, setRiskRate] = useState();
  const [data, setData] = useState([]);
  const ticker = searchParams.get('ticker') || 'MTLR';
  const tf = searchParams.get('tf') || '300';
  const fromDate = searchParams.get('fromDate') || dayjs().add(-2, 'week').unix();
  const toDate = searchParams.get('toDate') || dayjs().endOf('day').unix();
  const [balance, setBalance] = useState(18000);
  const [lotVolume, setlotVolume] = useState(877);
  const lotsize = security?.lotsize;
  const fee = 0.04 / 100;

  const quantity = useMemo(() => Math.floor(balance / lotVolume), [lotVolume, balance]);

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

  useEffect(() => {
    token && getSecurity(ticker, token).then(setSecurity);
  }, [ticker, token]);

  useEffect(() => {
    fetchRisk(token).then((r) => fetchRiskRates(ticker, token, r.riskCategoryId).then(setRiskRate));
  }, [ticker, token]);

  useEffect(() => {
    fetchCandlesFromAlor(ticker, tf, fromDate, toDate, undefined, token)
      .then((candles) => candles.filter((candle) => !notTradingTime(candle)))
      .then(setData);
  }, [tf, ticker, fromDate, toDate, token]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onSelectTicker = (ticker) => {
    searchParams.set('ticker', ticker);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    searchParams.set('fromDate', value[0].startOf('day').unix());
    searchParams.set('toDate', value[1].endOf('day').unix());
    setSearchParams(searchParams);
  };

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const _positions = [];

    const startTime = 'T15:00';
    const endTime = 'T15:40';

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const dateTime = new Date(candle.time * 1000).toISOString();
      if (!dateTime.includes(startTime)) {
        continue;
      }

      let currentPosition: any = {
        side: 'long',
        openPrice: candle.open,
        stopLoss: candle.high,
        openTime: candle.time,
      };

      for (let j = i + 1; j < data.length; j++) {
        const candle = data[j];
        const dateTime = new Date(candle.time * 1000).toISOString();
        if (!dateTime.includes(endTime)) {
          continue;
        }

        currentPosition = {
          ...currentPosition,
          closeTime: candle.time,
          takeProfit: candle.open,
          closePrice: candle.open,
        };

        currentPosition.pnl = currentPosition.openPrice - currentPosition.closePrice;
        _positions.push(currentPosition);

        i = j;

        break;
      }
    }

    return _positions
      .map(
        finishPosition({
          lotsize,
          fee,
          tf,
          ticker,
          stopMargin: balance,
          lotVolume,
          quantity,
        }),
      )
      .sort((a, b) => b.openTime - a.openTime);
  }, [data, fee, lotsize, quantity, lotVolume, balance, tf, ticker]);

  const markers = useMemo(
    () =>
      positions.map((s) => [
        {
          color: s.side === 'long' ? markerColors.bullColor : markerColors.bearColor,
          time: s.openTime as Time,
          shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
          position: s.side === 'short' ? 'aboveBar' : 'belowBar',
          price: s.openPrice,
          pnl: s.pnl,
        },
        {
          color: s.side === 'short' ? markerColors.bullColor : markerColors.bearColor,
          time: s.closeTime as Time,
          shape: s.side === 'short' ? 'arrowUp' : 'arrowDown',
          position: s.side === (s.pnl > 0 ? 'long' : 'short') ? 'aboveBar' : 'belowBar',
          price: s.pnl > 0 ? s.takeProfit : s.pnl < 0 ? s.stopLoss : s.takeProfit,
        },
      ]),
    [positions],
  );

  const lineSerieses = useMemo(
    () =>
      markers.map(([open, close]) => ({
        options: {
          color: open.pnl > 0 ? markerColors.bullColor : open.pnl < 0 ? markerColors.bearColor : 'rgb(166,189,213)', // Цвет линии
          priceLineVisible: false,
          lastValueVisible: false,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
        },
        data: [
          { time: open.time as Time, value: open.price }, // начальная точка между свечками
          { time: close.time as Time, value: close.price }, // конечная точка между свечками
        ],
      })),
    [markers],
  );

  const historyColumns = [
    {
      title: 'Паттерн',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'side',
      key: 'side',
      render: (value, row) => row?.side || '-',
    },
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
      title: 'Объем',
      dataIndex: 'openVolume',
      key: 'openVolume',
    },
    {
      title: 'Стоп цена',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (value, row) => {
        const percent = row.openPrice > row?.stopLoss ? row.openPrice / row?.stopLoss : row?.stopLoss / row.openPrice;

        return `${row?.stopLoss} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
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
      title: 'RR',
      dataIndex: 'RR',
      key: 'RR',
      align: 'right',
      render: (value) => value?.toFixed(2),
    },
    {
      title: 'Финрез',
      dataIndex: 'newPnl',
      key: 'newPnl',
      align: 'right',
      render: (value, row) => (row.newPnl ? moneyFormat(row.newPnl, 'RUB', 2, 2) : '-'),
    },
  ].filter(Boolean);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    if (!security) {
      return {
        PnL: 0,
        profits: 0,
        losses: 0,
        fee: 0,
      };
    }

    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions, security?.lotsize]);

  return (
    <Layout style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <Content
        style={{
          padding: '0',
          minHeight: 280,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          height: 'calc(100vh - 74px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', zIndex: 10, top: 4, left: 4, display: 'flex', gap: '8px' }}>
          <TickerSelect value={ticker} onSelect={onSelectTicker} />
          <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
          <TimeframeSelect value={tf} onChange={setSize} />
          <Input style={{ width: 80 }} value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
          <Input style={{ width: 80 }} value={lotVolume} onChange={(e) => setlotVolume(Number(e.target.value))} />
        </div>
        <Chart
          lineSerieses={lineSerieses}
          hideInternalCandles
          primitives={[]}
          markers={markers}
          toolTipTop="40px"
          toolTipLeft="4px"
          data={data}
          ema={[]}
        />
        <Row style={{ paddingBottom: '8px' }} gutter={8}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Общий финрез"
                value={moneyFormat(PnL, 'RUB', 2, 2)}
                precision={2}
                valueStyle={{
                  color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Комиссия"
                value={moneyFormat(Fee, 'RUB', 2, 2)}
                precision={2}
                valueStyle={{ color: 'rgb(255, 117, 132)' }}
              />
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
          {/*<Col span={6}>*/}
          {/*    <Card bordered={false}>*/}
          {/*        <Statistic*/}
          {/*            title="Просадка"*/}
          {/*            value={drawdowns || 0}*/}
          {/*            precision={2}*/}
          {/*            valueStyle={{color: "rgb(255, 117, 132)"}}*/}
          {/*            suffix={`%`}*/}
          {/*        />*/}
          {/*    </Card>*/}
          {/*</Col>*/}
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
      </Content>
    </Layout>
  );
};
