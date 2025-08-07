import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { useAppSelector } from './store';
import { useGetCTraderSymbolsQuery, useGetInstrumentByIdQuery } from './api';
import { moneyFormat } from './MainPage/MainPage';
import { normalizePrice } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';

const FigiLabel = ({ uid }) => {
  const { data } = useGetInstrumentByIdQuery({ uid });

  return (
    <div className="flex gap-2">
      <div
        className="img"
        style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${data?.brand.logoName.replace('.png', '')}x160.png")` }}
      ></div>
      {data?.ticker}
    </div>
  );
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

  const instrumentTypeMap = {
    etf: 'Фонды',
    share: 'Акции',
    futures: 'Фьючерсы',
    currency: 'Валюты',
    bond: 'Облигации',
  };

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
      <div className="flex gap-2">
        <Table wrapperClassName="pt-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead>Тип инструмента</TableHead>
              <TableHead>Лотов</TableHead>
              <TableHead>Количество</TableHead>
              <TableHead>Средняя цена позиции</TableHead>
              <TableHead>Текущая цена</TableHead>
              <TableHead className="text-right">Доход</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tinkoffPortfolio?.positions || []).map((invoice, index) => (
              <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
                <TableCell>
                  <FigiLabel uid={invoice.instrumentUid} />
                </TableCell>
                <TableCell>{instrumentTypeMap[invoice.instrumentType]}</TableCell>
                <TableCell>{invoice.quantityLots}</TableCell>
                <TableCell>{invoice.quantity}</TableCell>
                <TableCell>{invoice.averagePositionPrice}</TableCell>
                <TableCell>{invoice.currentPrice}</TableCell>
                <TableCell
                  className={
                    invoice.expectedYield > 0 ? 'text-right profitCell' : invoice.expectedYield < 0 ? 'text-right lossCell' : 'text-right'
                  }
                >
                  {moneyFormat(invoice.expectedYield)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Table wrapperClassName="pt-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead>Использованная маржа</TableHead>
              <TableHead className="text-right">Своп</TableHead>
              <TableHead className="text-right">Чистая прибыль USDT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cTraderPositions?.position || []).map((invoice, index) => (
              <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
                <TableCell>{map.get(invoice.tradeData.symbolId)?.symbolName}</TableCell>
                <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>
                <TableCell className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}>
                  {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}
                </TableCell>
                <TableCell
                  className={
                    pnl.get(invoice.positionId) > 0
                      ? 'text-right profitCell'
                      : pnl.get(invoice.positionId) < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(pnl.get(invoice.positionId), 'USD', 0, 2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
