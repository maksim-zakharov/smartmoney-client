import { Table } from 'antd';
import React, { FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import moment from 'moment/moment';
import { moneyFormat } from './MainPage';
import useWindowDimensions from '../useWindowDimensions';

export const OrdersTable: FC<{ pageSize: number; orders: any[]; onSelect: (row: any) => void; ordersMap: any }> = ({
  pageSize,
  onSelect,
  orders,
  ordersMap,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbol = searchParams.get('ticker') || 'SBER';
  const { width } = useWindowDimensions();

  const columns = [
    {
      title: 'Тикер',
      dataIndex: 'ticker',
      key: 'ticker',
    },
    {
      title: 'Паттерн',
      dataIndex: 'pattern',
      key: 'pattern',
    },
    width > 1200 && {
      title: 'Время пересвипа',
      dataIndex: 'liquidSweepTime',
      key: 'liquidSweepTime',
      render: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
    },
    width > 1200 && {
      title: 'Время ОБ',
      dataIndex: 'orderblockTime',
      key: 'orderblockTime',
      render: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Вход',
      dataIndex: 'limit',
      key: 'limit',
      render: (value) => value?.price || '-',
    },
    {
      title: 'Время',
      dataIndex: 'limit',
      key: 'limit',
      render: (value) => (value?.updateTime ? moment(value?.updateTime).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Стоп-лосс',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (value, row) => {
        if (!value?.stopPrice) {
          return '-';
        }
        // const orderblockOpen = Number(row.orderblockOpen);
        // const imbalanceOpen = Number(row.imbalanceOpen);
        const limitOrder = ordersMap[Number(row.limitOrderNumber)];
        if (!limitOrder) {
          return '-';
        }
        const side = limitOrder.side; //  orderblockOpen < imbalanceOpen ? 'buy' : 'sell';
        const openPrice = side === 'buy' ? Number(row.orderblockHigh) : Number(row.orderblockLow);
        const stopLoss = value?.stopPrice;

        const percent = side === 'buy' ? openPrice / stopLoss : stopLoss / openPrice;

        const PnL = side === 'buy' ? openPrice - stopLoss : stopLoss - openPrice;

        return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * limitOrder?.qtyUnits, 'RUB', 2, 2)})`;
      },
    },
    // {
    //   title: "stopLossTime",
    //   dataIndex: "stopLoss",
    //   key: "stopLoss",
    //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
    // },
    {
      title: 'takeProfit',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      render: (value) => value?.stopPrice || '-',
    },
    {
      title: 'Действия',
      render: (value, row) => {
        return (
          <Link
            to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2CnewSMT%2CsmartTrend`}
            target="_blank"
          >
            Тестер
          </Link>
        );
      },
    },
    // {
    //   title: "takeProfitTime",
    //   dataIndex: "takeProfit",
    //   key: "takeProfit",
    //   render: (value) =>  value?.transTime ? moment(value?.transTime).format("YYYY-MM-DD HH:mm") : '-'
    // },
  ].filter(Boolean);

  return (
    <Table
      size="small"
      dataSource={orders}
      columns={columns}
      pagination={{
        pageSize,
      }}
      onRow={(record: any) => {
        return {
          onClick: () => onSelect(record),
          className: 'hoverable',
          style: symbol === record.ticker ? { backgroundColor: 'rgba(179, 199, 219, .2)' } : undefined,
        };
      }}
    />
  );
};
