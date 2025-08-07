import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic, Table } from 'antd';
import { useAppSelector } from './store';
import { useGetCTraderSymbolsQuery, useGetInstrumentByIdQuery } from './api';
import { moneyFormat } from './MainPage/MainPage.tsx';
import { normalizePrice } from './utils.ts';

const FigiLabel = ({ uid }) => {
  const { data } = useGetInstrumentByIdQuery({ uid });

  return data?.ticker;
};

export const TestPage = () => {
  const { tinkoffAccounts, tinkoffPortfolio, tinkoffOrders, cTraderPositions, cTraderPositionPnL, cTraderAccount, cTraderSymbols } =
    useAppSelector((state) => state.alorSlice);

  const map = useMemo(() => new Map<number, any>(cTraderSymbols?.map((s) => [s.symbolId, s])), [cTraderSymbols]);

  useGetCTraderSymbolsQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      skip: !cTraderAccount?.ctidTraderAccountId,
    },
  );

  const pnl = new Map<number, number>(
    (cTraderPositionPnL?.positionUnrealizedPnL || []).map((p) => [
      p.positionId,
      normalizePrice(parseInt(p.netUnrealizedPnL, 10), cTraderPositionPnL.moneyDigits),
    ]),
  );

  const portfolioColumns = [
    {
      title: 'Ticker',
      dataIndex: 'instrumentUid',
      key: 'instrumentUid',
      render: (value, row) => <FigiLabel uid={value} />,
    },
    {
      title: 'instrumentType',
      dataIndex: 'instrumentType',
      key: 'instrumentType',
      render: (value, row) => {
        const map = {
          etf: 'Фонды',
          share: 'Акции',
          futures: 'Фьючерсы',
          currency: 'Валюты',
          bond: 'Облигации',
        };

        return map[value];
      },
    },
    {
      title: 'quantityLots',
      dataIndex: 'quantityLots',
      key: 'quantityLots',
    },
    {
      title: 'quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'averagePositionPrice',
      dataIndex: 'averagePositionPrice',
      key: 'averagePositionPrice',
    },
    {
      title: 'currentPrice',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
    },
    {
      title: 'expectedYield',
      dataIndex: 'expectedYield',
      key: 'expectedYield',
    },
  ];

  const ctraderPositionsColumns = [
    {
      title: 'Ticker',
      dataIndex: 'positionId',
      key: 'positionId',
      render: (value, row) => map.get(row.tradeData.symbolId)?.symbolName,
    },
    {
      title: 'usedMargin',
      dataIndex: 'usedMargin',
      key: 'usedMargin',
      render: (value, row) => normalizePrice(parseInt(row.usedMargin, 10), row.moneyDigits),
    },
    {
      title: 'swap',
      dataIndex: 'swap',
      key: 'swap',
      render: (value, row) => normalizePrice(parseInt(row.swap, 10), row.moneyDigits),
    },
    {
      title: 'expectedYield',
      dataIndex: 'expectedYield',
      key: 'expectedYield',
      render: (value, row) => pnl.get(row.positionId),
    },
  ];

  const bondsMargin = useMemo(
    () =>
      (tinkoffPortfolio?.positions || [])
        .filter((p) => ['bond', 'etf'].includes(p.instrumentType))
        .reduce((acc, cur) => acc + cur.quantity * cur.currentPrice, 0),
    [tinkoffPortfolio?.positions],
  );

  const totalPnL = useMemo(
    () =>
      (tinkoffPortfolio?.positions || [])
        .filter((p) => ['share', 'futures'].includes(p.instrumentType))
        .reduce((acc, cur) => acc + cur.expectedYield, 0),
    [tinkoffPortfolio?.positions],
  );

  const totalPnLForex = useMemo(
    () => (cTraderPositions?.position || []).reduce((acc, cur) => acc + pnl.get(cur.positionId), 0),
    [cTraderPositions?.position, pnl],
  );

  const amount = (tinkoffPortfolio?.totalAmountPortfolio || 0) - bondsMargin;

  return (
    <>
      <Row gutter={[8, 8]}>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title={`Портфель ${tinkoffPortfolio?.accountId}`}
              value={moneyFormat(amount)}
              precision={2}
              valueStyle={{
                color: amount > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="Текущий финрез (акции)"
              value={moneyFormat(totalPnL)}
              precision={2}
              valueStyle={{
                color: totalPnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="Текущий финрез (forex)"
              value={moneyFormat(totalPnLForex, 'USD')}
              precision={2}
              valueStyle={{
                color: totalPnLForex > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title="Текущий финрез (общий)"
              value={moneyFormat(totalPnL + totalPnLForex * 80)}
              precision={2}
              valueStyle={{
                color: totalPnL + totalPnLForex * 80 > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
              }}
            />
          </Card>
        </Col>
      </Row>
      <Table
        style={{ paddingTop: 8 }}
        size="small"
        dataSource={tinkoffPortfolio?.positions || []}
        columns={portfolioColumns as any}
        pagination={false}
        onRow={(record) => {
          return {
            style:
              record.expectedYield < 0
                ? {
                    backgroundColor: '#d1261b66',
                    color: 'rgb(255, 117, 132)',
                  }
                : record.expectedYield > 0
                  ? {
                      backgroundColor: '#15785566',
                      color: 'rgb(44, 232, 156)',
                    }
                  : undefined,
          };
        }}
      />
      <Table
        style={{ paddingTop: 8 }}
        size="small"
        dataSource={cTraderPositions?.position || []}
        columns={ctraderPositionsColumns as any}
        pagination={false}
        onRow={(record) => {
          return {
            style:
              pnl.get(record.positionId) < 0
                ? {
                    backgroundColor: '#d1261b66',
                    color: 'rgb(255, 117, 132)',
                  }
                : pnl.get(record.positionId) > 0
                  ? {
                      backgroundColor: '#15785566',
                      color: 'rgb(44, 232, 156)',
                    }
                  : undefined,
          };
        }}
      />
    </>
  );
};
