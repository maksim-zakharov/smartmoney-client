import React, { useMemo, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { useAppSelector } from './store';
import { useGetCTraderSymbolsQuery, useGetInstrumentByIdQuery } from './api';
import { moneyFormat } from './MainPage/MainPage';
import { normalizePrice } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { cn } from './lib/utils.ts';

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

const ForexLabel = ({ ticker }) => {
  const map = {
    XAUUSD_xp: 'GoldFut2',
    XAGUSD_xp: 'SilverFut',
    XPDUSD_xp: 'Palladium',
    XPTUSD_xp: 'Platinum',
    USDCNH_xp: 'USDCNY',
    EURUSD_xp: 'EURUSD3',
  };

  return (
    <div className="flex gap-2">
      <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${map[ticker]}x160.png")` }}></div>
      {ticker}
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

  const [selected, setSelected] = useState();

  const pairMap = {
    EURUSD_xp: 'EDU5',
  };

  const handleSelectForex = (symbol: string) => () => {
    setSelected(pairMap[symbol]);
  };

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

  const cTraderPositionsMapped = useMemo(() => {
    const positionMap = (cTraderPositions?.position || []).reduce((acc, curr) => {
      if (!acc[curr.tradeData.symbolId]) {
        acc[curr.tradeData.symbolId] = { ...curr, PnL: pnl.get(curr.positionId), volume: curr.tradeData.volume };
      } else {
        acc[curr.tradeData.symbolId].PnL += pnl.get(curr.positionId);
        acc[curr.tradeData.symbolId].swap += curr.swap;
        acc[curr.tradeData.symbolId].volume += curr.tradeData.volume;
      }

      return acc;
    }, {});

    return Object.entries(positionMap)
      .map(([key, value]) => value)
      .sort((a, b) => b.PnL - a.PnL);
  }, [cTraderPositions?.position, pnl]);

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
              <TableRow
                key={invoice.invoice}
                className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === instrumentTypeMap[invoice.instrumentType] && 'rowHover')}
              >
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
              <TableHead>Лотов</TableHead>
              <TableHead>Использованная маржа</TableHead>
              <TableHead className="text-right">Своп</TableHead>
              <TableHead className="text-right">Чистая прибыль USDT</TableHead>
              <TableHead className="text-right">Чистая прибыль RUB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cTraderPositionsMapped.map((invoice, index) => (
              <TableRow
                key={invoice.invoice}
                className={index % 2 ? 'rowOdd' : 'rowEven'}
                onClick={handleSelectForex(map.get(invoice.tradeData.symbolId)?.symbolName)}
              >
                <TableCell>
                  <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />
                </TableCell>
                <TableCell>{invoice.volume / 10000}</TableCell>
                <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>
                <TableCell className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}>
                  {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}
                </TableCell>
                <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>
                  {moneyFormat(invoice.PnL, 'USD', 0, 2)}
                </TableCell>
                <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>
                  {moneyFormat(invoice.PnL * 80, 'RUB', 0, 2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
