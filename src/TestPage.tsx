import React, { useMemo, useState } from 'react';
import { Col, Row } from 'antd';
import { useAppSelector } from './store';
import { useGetCTraderSymbolsQuery, useGetInstrumentByIdQuery } from './api';
import { moneyFormat } from './MainPage/MainPage';
import { normalizePrice } from './utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { cn } from './lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { TWChart } from './components/TWChart.tsx';

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

  const handleSelectForex = (symbol: string) => () => {
    setSelected(symbol);
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
        acc[curr.tradeData.symbolId].usedMargin += curr.usedMargin;
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
          <Card>
            <CardHeader>
              <CardDescription>Портфель {tinkoffPortfolio?.accountId}</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  amount > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(amount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (акции)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalPnL > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalPnL)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (forex)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalPnLForex > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalPnLForex, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (общий)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalPnL + totalPnLForex > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalPnL + totalPnLForex * 80)}
              </CardTitle>
            </CardHeader>
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
            {(tinkoffPortfolio?.positions || [])
              .filter((r) => ['share', 'futures'].includes(r.instrumentType))
              .map((invoice, index) => (
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
      {selected && <TWChart ticker={selected} height={400} multiple={1} small />}
    </>
  );
};
