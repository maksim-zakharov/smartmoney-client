import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils';
import React, { useMemo, useState } from 'react';

const avg = (values: number[]) => {
  return values.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / values.length;
};

export const ArbitrageTable = ({
  bitstampTickers,
  mexcTickers,
  mexcSpotTickers,
  bingxTickers,
  gateTickers,
  bybitTickers,
  binanceTickers,
  htxTickers,
  kukoinTickers,
  bitgetTickers,
}) => {
  const [sorter, setSorter] = useState<any>({
    riseFallRate: 'desc',
  });

  const bitgetFuturesMap = useMemo(
    () => new Map<string, number>(bitgetTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPr)])),
    [bitgetTickers],
  );

  const kukoinFuturesMap = useMemo(
    () => new Map<string, number>(kukoinTickers.map((t) => [t.symbol.split('-USDT')[0], Number(t.last)])),
    [kukoinTickers],
  );

  const bybitFuturesMap = useMemo(
    () => new Map<string, number>(bybitTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [bybitTickers],
  );

  const binanceFuturesMap = useMemo(
    () => new Map<string, number>(binanceTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [binanceTickers],
  );

  const htxFuturesMap = useMemo(
    () => new Map<string, number>(htxTickers.map((t) => [t.contract_code.split('-USDT')[0], Number(t.close)])),
    [htxTickers],
  );

  const bitstampMap = useMemo(
    () => new Map<string, number>(bitstampTickers.map((t) => [t.pair.split('/USD-PERP')[0], Number(t.last)])),
    [bitstampTickers],
  );

  const gateFuturesMap = useMemo(
    () => new Map<string, number>(gateTickers.map((t) => [t.contract.split('_USDT')[0], Number(t.last)])),
    [gateTickers],
  );

  const bingxSpotMap = useMemo(
    () => new Map<string, number>(bingxTickers.map((t) => [t.symbol.split('-USDT')[0], Number(t.lastPrice)])),
    [bingxTickers],
  );

  const mexcSpotMap = useMemo(
    () => new Map<string, number>(mexcSpotTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [mexcSpotTickers],
  );

  const mexcFuturesMap = useMemo(
    () => new Map<string, number>(mexcTickers.map((t) => [t.symbol.split('_USDT')[0], Number(t.lastPrice)])),
    [mexcTickers],
  );

  const allTickers = useMemo(
    () =>
      new Set<string>(
        [
          ...bitstampTickers.map((t) => t.pair.split('/USD-PERP')[0]),
          ...bingxTickers.map((t) => t.symbol.split('-USDT')[0]),
          ...gateTickers.map((t) => t.contract.split('_USDT')[0]),
          ...htxTickers.map((t) => t.contract_code.split('-USDT')[0]),
          ...bybitTickers.map((t) => t.symbol.split('USDT')[0]),
          ...binanceTickers.map((t) => t.symbol.split('USDT')[0]),
          ...mexcSpotTickers.map((t) => t.symbol.split('USDT')[0]),
          ...mexcTickers.map((t) => t.symbol.split('_USDT')[0]),
          ...bitgetTickers.map((t) => t.symbol.split('USDT')[0]),
          ...kukoinTickers.map((t) => t.symbol.split('-USDT')[0]),
        ].filter((ticker) => !ticker.includes('-')),
      ),
    [bitstampTickers, mexcTickers],
  );

  const avgPrices = useMemo(
    () =>
      new Map<string, number>(
        Array.from(allTickers).map((ticker) => [
          ticker,
          avg(
            [
              bitgetFuturesMap.get(ticker),
              kukoinFuturesMap.get(ticker),
              bybitFuturesMap.get(ticker),
              binanceFuturesMap.get(ticker),
              htxFuturesMap.get(ticker),
              bitstampMap.get(ticker),
              gateFuturesMap.get(ticker),
              bingxSpotMap.get(ticker),
              mexcSpotMap.get(ticker),
              mexcFuturesMap.get(ticker),
            ].filter(Boolean),
          ),
        ]),
      ),
    [allTickers],
  );

  return (
    <Table wrapperClassName="pt-2 h-120">
      {/*<TableHeader>*/}
      {/*  <TableRow>*/}
      {/*    <TableHead className="w-[200px] text-left" colSpan={4}>*/}
      {/*      Mexc Фьючерсы*/}
      {/*    </TableHead>*/}
      {/*  </TableRow>*/}
      {/*</TableHeader>*/}
      <TableHeader className="bg-[rgb(36,52,66)]">
        <TableRow>
          <TableHead>Тикер</TableHead>
          <TableHead>Средняя</TableHead>
          <TableHead>Mexc Spot</TableHead>
          <TableHead>Mexc Futures</TableHead>
          <TableHead>Bingx Futures</TableHead>
          <TableHead>Gate Futures</TableHead>
          <TableHead>Bybit Futures</TableHead>
          <TableHead>Binance Futures</TableHead>
          <TableHead>Bitget Futures</TableHead>
          <TableHead>Kukoin Futures</TableHead>
          <TableHead>HTX Futures</TableHead>
          <TableHead>Bitstamp</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...allTickers].map((invoice, index) => (
          <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
            <TableCell>${invoice}</TableCell>
            <TableCell>{avgPrices.get(invoice)}</TableCell>
            <TableCell>{mexcSpotMap.get(invoice) || '-'}</TableCell>
            <TableCell>{mexcFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{bingxSpotMap.get(invoice) || '-'}</TableCell>
            <TableCell>{gateFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{bybitFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{binanceFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{bitgetFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{kukoinFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{htxFuturesMap.get(invoice) || '-'}</TableCell>
            <TableCell>{bitstampMap.get(invoice) || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
