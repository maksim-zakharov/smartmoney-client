import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic, Table } from 'antd';
import { useAppSelector } from './store';
import { useGetInstrumentByIdQuery } from './api';
import { moneyFormat } from './MainPage/MainPage.tsx';

const FigiLabel = ({ uid }) => {
  const { data } = useGetInstrumentByIdQuery({ uid });

  return data?.ticker;
};

export const TestPage = () => {
  const { tinkoffAccounts, tinkoffPortfolio, tinkoffOrders } = useAppSelector((state) => state.alorSlice);

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
          currency: 'Валюты',
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

  const totalPnL = useMemo(
    () => (tinkoffPortfolio?.positions || []).filter((p) => p.instrumentType === 'share').reduce((acc, cur) => acc + cur.expectedYield, 0),
    [tinkoffPortfolio?.positions],
  );

  return (
    <>
      <Row gutter={[8, 8]}>
        <Col span={4}>
          <Card bordered={false}>
            <Statistic
              title={`Портфель ${tinkoffPortfolio?.accountId}`}
              value={moneyFormat(tinkoffPortfolio?.totalAmountPortfolio || 0)}
              precision={2}
              valueStyle={{
                color: tinkoffPortfolio?.totalAmountPortfolio > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
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
    </>
  );
};
