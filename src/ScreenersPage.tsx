import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Funnel } from 'lucide-react';
import { cn } from './lib/utils.ts';
import { exchangeImgMap, moneyFormat, moneyFormatCompact } from './utils.ts';
import dayjs from 'dayjs';
import { TWChart } from './components/TWChart.tsx';
import { ArbitrageTable } from './ArbitrageTable.tsx';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetContractDetailsQuery, useGetSpotTickersQuery, useGetTickersQuery } from './api/mexc.api.ts';
import { useGetBINGXFuturesTickersQuery, useGetBINGXSpotTickersQuery } from './api/bingx.api.ts';
import { useGetGateFuturesTickersQuery, useGetGateSpotTickersQuery } from './api/gate.api.ts';
import { useGetBYBITFuturesTickersQuery, useGetBYBITSpotTickersQuery } from './api/bybit.api.ts';
import { useGetBinanceFuturesTickersQuery, useGetBinanceSpotTickersQuery } from './api/binance.api.ts';
import { useGetHTXFuturesTickersQuery, useGetHTXSpotTickersQuery } from './api/htx.api.ts';
import { useGetKuCoinFutureTickersQuery, useGetKuCoinSpotTickersQuery } from './api/kucoin.api.ts';
import { useGetBitgetFutureTickersQuery, useGetBitgetSpotTickersQuery } from './api/bitget.api.ts';
import { useGetBitstampTickersQuery } from './api/bitstamp.api.ts';
import { setFilter } from './api/alor.slice.ts';
import { useAppDispatch, useAppSelector } from './store.ts';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover.tsx';
import { Label } from './components/ui/label.tsx';
import { Input } from './components/ui/input.tsx';
import { Button } from './components/ui/button.tsx';

const TableColumnFilter = ({ label, _key }: { _key: string; label: string }) => {
  const { filters } = useAppSelector((state) => state.alorSlice);
  const [fromVal, setFromVal] = useState(filters[`${_key}_from`]);
  const [toVal, setToVal] = useState(filters[`${_key}_to`]);

  const dispatch = useAppDispatch();

  const handleSubmitFilter = () => {
    dispatch(setFilter({ key: `${_key}_from`, value: fromVal }));
    dispatch(setFilter({ key: `${_key}_to`, value: toVal }));
  };

  return (
    <Popover>
      <PopoverTrigger className="cursor-pointer">
        <Funnel
          size={13}
          fill={filters[`${_key}_from`] || filters[`${_key}_to`] ? 'var(--primary)' : 'transparent'}
          stroke={filters[`${_key}_from`] || filters[`${_key}_to`] ? 'var(--primary)' : 'var(--muted-foreground)'}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[160px] flex flex-col gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          От <Input size="xs" value={fromVal} onChange={(e) => setFromVal(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          До <Input size="xs" value={toVal} onChange={(e) => setToVal(e.target.value)} />
        </div>
        <Button size="xs" onClick={handleSubmitFilter}>
          Применить
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export const ScreenersPage = () => {
  const { filters } = useAppSelector((state) => state.alorSlice);
  const [selected, setSelected] = useState<string>();
  const { data: mexcFuturesTickers = [] } = useGetTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: mexcSpotTickers = [] } = useGetSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const mexcIndexTickers = mexcFuturesTickers
    .filter((t) => t.lastPrice)
    .map((t) => ({ ...t, diff: Math.abs(t.indexPrice / t.lastPrice - 1) * 100 }));

  const mexcMap = useMemo(() => new Set<string>((mexcFuturesTickers || []).map((t) => t.symbol.split('_USDT')[0])), [mexcFuturesTickers]);

  const { data: bingxSpotTickers = [] } = useGetBINGXSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: bingxFuturesTickers = [] } = useGetBINGXFuturesTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bingxMap = useMemo(() => new Set<string>(bingxFuturesTickers.map((t) => t.symbol.split('-USDT')[0])), [bingxFuturesTickers]);

  const { data: gateSpotTickers = [] } = useGetGateSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: gateFuturesTickers = [] } = useGetGateFuturesTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const gateMap = useMemo(() => new Set<string>(gateFuturesTickers.map((t) => t.contract.split('_USDT')[0])), [gateFuturesTickers]);

  const { data: bybitSpotTickers = [] } = useGetBYBITSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: bybitFuturesTickers = [] } = useGetBYBITFuturesTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bybitMap = useMemo(() => new Set<string>(bybitFuturesTickers.map((t) => t.symbol.split('USDT')[0])), [bybitFuturesTickers]);

  const { data: binanceSpotTickers = [] } = useGetBinanceSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: binanceFuturesTickers = [] } = useGetBinanceFuturesTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const binanceMap = useMemo(() => new Set<string>(binanceFuturesTickers.map((t) => t.symbol.split('USDT')[0])), [binanceFuturesTickers]);

  const { data: htxSpotTickers = [] } = useGetHTXSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: htxFuturesTickers = [] } = useGetHTXFuturesTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const htxMap = useMemo(() => new Set<string>(htxFuturesTickers.map((t) => t.contract_code.split('-USDT')[0])), [htxFuturesTickers]);

  const { data: kukoinSpotTickers = [] } = useGetKuCoinSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: kukoinFuturesTickers = [] } = useGetKuCoinFutureTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const kukoinMap = useMemo(() => new Set<string>(kukoinFuturesTickers.map((t) => t.symbol.split('-USDT')[0])), [kukoinFuturesTickers]);

  const { data: bitgetSpotTickers = [] } = useGetBitgetSpotTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const { data: bitgetFutureTickers = [] } = useGetBitgetFutureTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bitgetMap = useMemo(() => new Set<string>(bitgetFutureTickers.map((t) => t.symbol.split('USDT')[0])), [bitgetFutureTickers]);

  const { data: bitstampTickers = [] } = useGetBitstampTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bitstampMap = useMemo(() => new Set<string>(bitstampTickers.map((t) => t.pair.split('/USD-PERP')[0])), [bitstampTickers]);

  const { data: mexcContractDetails = [] } = useGetContractDetailsQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const mexcContractDetailsMap = useMemo(() => new Map<string, any>(mexcContractDetails.map((s) => [s.symbol, s])), [mexcContractDetails]);

  const [sorter, setSorter] = useState<any>({
    riseFallRate: 'desc',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'mexc-futures';

  const setTab = (tab: string) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  const options: { label: string; value: string; imgSrc?: string }[] = [
    { label: 'Mexc Спот', value: 'mexc-spot', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png' },
    { label: 'Mexc Фьючерсы', value: 'mexc-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png' },
    {
      label: 'Mexc Фьюч (New)',
      value: 'mexc-futures-new',
      imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png',
    },
    {
      label: 'Mexc Index',
      value: 'mexc-index',
      imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png',
    },
    { label: 'Gate Фьючерсы', value: 'gate-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/302.png' },
    { label: 'Bingx Фьючерсы', value: 'bingx-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1064.png' },
    { label: 'Bybit Фьючерсы', value: 'bybit-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png' },
    { label: 'Binance Фьючерсы', value: 'binance-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/270.png' },
    { label: 'HTX Фьючерсы', value: 'htx-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/102.png' },
    { label: 'KuCoin Фьючерсы', value: 'kucoin-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/311.png' },
    { label: 'Bitget Фьючерсы', value: 'bitget-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png' },
    { label: 'Bitstamp Фьючерсы', value: 'bitstamp-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/70.png' },
  ];

  const Exchanges = ({ symbol }: { symbol: string }) => {
    // const { data: tickers = [] } = useSearchTickersQuery(
    //   {
    //     q: symbol.toLowerCase().split('_')[0],
    //   },
    //   {
    //     skip: !symbol,
    //   },
    // );
    //
    // const cids = useMemo(() => new Set<number>(tickers.map((t) => t.cid).filter(Boolean)), [tickers]);
    //
    // const { data: quotes = [] } = useGetQuotesByIdsQuery(
    //   {
    //     ids: Array.from(cids),
    //   },
    //   {
    //     skip: !cids.size,
    //   },
    // );
    //
    // const { data: marketPairs = [] } = useGetCryptocurrencyBySlugQuery(
    //   {
    //     slug: quotes[0]?.slug,
    //   },
    //   {
    //     skip: !quotes.length,
    //   },
    // );

    return (
      <div className="flex gap-1">
        {/*{marketPairs.map((mp) => (*/}
        {/*  <img className="h-5 rounded-full" src={`https://s2.coinmarketcap.com/static/img/exchanges/64x64/${mp.exchangeId}.png`} />*/}
        {/*))}*/}
        {binanceMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['BINANCE']} />}
        {bybitMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['BYBIT']} />}
        {gateMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['GATEIO']} />}
        {bingxMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['BINGX']} />}
        {kukoinMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['KUCOIN']} />}
        {mexcMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['MEXC']} />}
        {htxMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['HTX']} />}
        {bitgetMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['BITGET']} />}
        {bitstampMap.has(symbol?.split('_')[0]) && <img className="h-5 rounded-full" src={exchangeImgMap['BITSTAMP']} />}
      </div>
    );
  };

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <TabsList style={{ marginTop: '4px' }} className="grid grid-cols-auto-fit gap-1 grid-cols-4 h-auto pb-2 pl-0">
          {options.map((o) => (
            <TabsTrigger value={o.value}>
              <img src={o.imgSrc} className="h-5 rounded-full" loading="lazy" decoding="async" />
              {o.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="gate-futures">
          <Table wrapperClassName="pt-2 h-120">
            {/*<TableHeader>*/}
            {/*  <TableRow>*/}
            {/*    <TableHead className="w-[200px] text-left" colSpan={4}>*/}
            {/*      Bingx Фьючерсы*/}
            {/*    </TableHead>*/}
            {/*  </TableRow>*/}
            {/*</TableHeader>*/}
            <TableHeader className="bg-[rgb(36,52,66)]">
              <TableRow>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="gate-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="gate-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...gateFuturesTickers]
                .map((t) => ({ ...t, spread: (Number(t.lowest_ask) / Number(t.highest_bid) - 1) * 100 }))
                .filter(
                  (t) =>
                    (!filters['gate-futures-amount24'] || Number(t.volume_24h_quote) >= Number(filters['gate-futures-amount24'])) &&
                    (!filters['gate-futures-spread'] || Number(t.spread) >= Number(filters['gate-futures-spread'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.last) - Number(a.last);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.last) - Number(b.last);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.change_percentage) - Number(a.change_percentage);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.change_percentage) - Number(b.change_percentage);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.volume_24h_quote) - Number(a.volume_24h_quote);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.volume_24h_quote) - Number(b.volume_24h_quote);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.contract.localeCompare(a.contract);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.contract.localeCompare(b.contract);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `GATE:${invoice.contract}` && 'rowHover')}
                    onClick={(e) => setSelected(`GATE:${invoice.contract}`)}
                  >
                    <TableCell>
                      <a href={`https://www.gate.com/ru/futures/USDT/${invoice.contract}`} target="_blank">
                        ${invoice.contract}
                      </a>
                    </TableCell>
                    <TableCell>{invoice.last}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell
                      className={
                        Number(invoice.change_percentage) > 0 ? 'profitCell' : Number(invoice.change_percentage) < 0 ? 'lossCell' : ''
                      }
                    >
                      {Number(invoice.change_percentage)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.volume_24h_quote, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.contract?.split('_')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="bingx-futures">
          <Table wrapperClassName="pt-2 h-120">
            {/*<TableHeader>*/}
            {/*  <TableRow>*/}
            {/*    <TableHead className="w-[200px] text-left" colSpan={4}>*/}
            {/*      Bingx Фьючерсы*/}
            {/*    </TableHead>*/}
            {/*  </TableRow>*/}
            {/*</TableHeader>*/}
            <TableHeader className="bg-[rgb(36,52,66)]">
              <TableRow>
                <TableHead
                  className="w-[100px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      createTime: prevState.createTime === 'desc' ? 'asc' : prevState.createTime === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['createTime'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['createTime'] === 'asc' && <ArrowUpWideNarrow size={13} />} Время создания
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="bingx-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="bingx-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bingxFuturesTickers]
                .map((t) => ({ ...t, spread: (Number(t.askPrice) / Number(t.bidPrice) - 1) * 100 }))
                .filter(
                  (t) =>
                    (!filters['bingx-futures-amount24_from'] ||
                      Number(t.quoteVolume || t.valueF) >= Number(filters['bingx-futures-amount24_from'])) &&
                    (!filters['bingx-futures-amount24_to'] ||
                      Number(t.quoteVolume || t.valueF) <= Number(filters['bingx-futures-amount24_to'])) &&
                    (!filters['bingx-futures-spread_from'] || Number(t.spread) >= Number(filters['bingx-futures-spread_from'])) &&
                    (!filters['bingx-futures-spread_to'] || Number(t.spread) <= Number(filters['bingx-futures-spread_to'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['spread'] === 'desc') {
                    return b.spread - a.spread;
                  }

                  if (sorter['spread'] === 'asc') {
                    return a.spread - b.spread;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice || b.tradePrice) - Number(a.lastPrice || a.tradePrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice || a.tradePrice) - Number(b.lastPrice || b.tradePrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.priceChangePercent || b.changePercentage) - Number(a.priceChangePercent || a.changePercentage);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.priceChangePercent || a.changePercentage) - Number(b.priceChangePercent || b.changePercentage);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.quoteVolume || b.valueF) - Number(a.quoteVolume || a.valueF);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.quoteVolume || a.valueF) - Number(b.quoteVolume || b.valueF);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  if (sorter['createTime'] === 'desc') {
                    return b.openTime - a.openTime;
                  }

                  if (sorter['createTime'] === 'asc') {
                    return a.openTime - b.openTime;
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `BINGX:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`BINGX:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <a href={`https://bingx.com/ru-ru/perpetual/${invoice.symbol}`} target="_blank">
                        ${invoice.symbol}
                      </a>
                    </TableCell>
                    <TableCell>{invoice.openTime ? dayjs(invoice.openTime).format('DD-MM-YYYY HH:mm') : '-'}</TableCell>
                    <TableCell>{invoice.lastPrice || invoice.tradePrice}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell
                      className={
                        Number(invoice.priceChangePercent || invoice.changePercentage) > 0
                          ? 'profitCell'
                          : Number(invoice.priceChangePercent || invoice.changePercentage) < 0
                            ? 'lossCell'
                            : ''
                      }
                    >
                      {Number(invoice.priceChangePercent || invoice.changePercentage)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.quoteVolume || invoice.valueF, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.symbol?.split('-')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="mexc-spot">
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
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="mexc-spot-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                    </span>
                    <TableColumnFilter _key="mexc-spot-riseFallRate" label="Изм, 1д" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="mexc-spot-amount24" label="Оборот" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...mexcSpotTickers]
                .map((t) => ({
                  ...t,
                  spread: (Number(t.askPrice) / Number(t.bidPrice) - 1) * 100,
                  priceChangePercent: Number(t.priceChangePercent) * 100,
                  // createTime: mexcContractDetailsMap.get(t.symbol)?.createTime,
                }))
                .filter(
                  (t) =>
                    t.symbol.endsWith('USDT') &&
                    (!filters['mexc-spot-amount24_from'] || Number(t.quoteVolume) >= Number(filters['mexc-spot-amount24_from'])) &&
                    (!filters['mexc-spot-amount24_to'] || Number(t.quoteVolume) <= Number(filters['mexc-spot-amount24_to'])) &&
                    (!filters['mexc-spot-riseFallRate_from'] ||
                      Number(t.priceChangePercent) >= Number(filters['mexc-spot-riseFallRate_from'])) &&
                    (!filters['mexc-spot-riseFallRate_to'] ||
                      Number(t.priceChangePercent) <= Number(filters['mexc-spot-riseFallRate_to'])) &&
                    (!filters['mexc-spot-spread_from'] || Number(t.spread) >= Number(filters['mexc-spot-spread_from'])) &&
                    (!filters['mexc-spot-spread_to'] || Number(t.spread) <= Number(filters['mexc-spot-spread_to'])),
                )
                .sort((a, b) => {
                  if (!sorter['spread'] && !sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['spread'] === 'desc') {
                    return b.spread - a.spread;
                  }

                  if (sorter['spread'] === 'asc') {
                    return a.spread - b.spread;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.priceChangePercent) - Number(a.priceChangePercent);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.priceChangePercent) - Number(b.priceChangePercent);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.quoteVolume) - Number(a.quoteVolume);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.quoteVolume) - Number(b.quoteVolume);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `MEXC:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`MEXC:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <div className="flex gap-1">
                        {mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl && (
                          <img className="h-4 rounded-full" src={mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl} />
                        )}
                        <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                          ${invoice.symbol} {mexcContractDetailsMap.get(invoice.symbol)?.isNew && '(Новый)'}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell
                      className={
                        Number(invoice.priceChangePercent) > 0 ? 'profitCell' : Number(invoice.priceChangePercent) < 0 ? 'lossCell' : ''
                      }
                    >
                      {Number(invoice.priceChangePercent).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.quoteVolume, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      {/*<div className="flex gap-1">*/}
                      {/*  {(mexcContractDetailsMap.get(invoice.symbol)?.indexOrigin || []).map((exchange) =>*/}
                      {/*    exchangeImgMap[exchange] ? <img className="h-5 rounded-full" src={exchangeImgMap[exchange]} /> : exchange,*/}
                      {/*  )}*/}
                      {/*</div>*/}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="mexc-futures">
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
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      createTime: prevState.createTime === 'desc' ? 'asc' : prevState.createTime === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['createTime'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['createTime'] === 'asc' && <ArrowUpWideNarrow size={13} />} Время создания
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="mexc-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="mexc-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...mexcFuturesTickers]
                .map((t) => ({
                  ...t,
                  spread: (Number(t.ask1) / Number(t.bid1) - 1) * 100,
                  createTime: mexcContractDetailsMap.get(t.symbol)?.createTime,
                }))
                .filter(
                  (t) =>
                    (!filters['mexc-futures-amount24'] || Number(t.amount24) >= Number(filters['mexc-futures-amount24'])) &&
                    (!filters['mexc-futures-spread'] || Number(t.spread) >= Number(filters['mexc-futures-spread'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['spread'] === 'desc') {
                    return b.spread - a.spread;
                  }

                  if (sorter['spread'] === 'asc') {
                    return a.spread - b.spread;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.riseFallRate) - Number(a.riseFallRate);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.riseFallRate) - Number(b.riseFallRate);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.amount24) - Number(a.amount24);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.amount24) - Number(b.amount24);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  if (sorter['createTime'] === 'desc') {
                    return b.createTime - a.createTime;
                  }

                  if (sorter['createTime'] === 'asc') {
                    return a.createTime - b.createTime;
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `MEXC:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`MEXC:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <div className="flex gap-1">
                        {mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl && (
                          <img className="h-4 rounded-full" src={mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl} />
                        )}
                        <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                          ${invoice.symbol} {mexcContractDetailsMap.get(invoice.symbol)?.isNew && '(Новый)'}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{dayjs(invoice.createTime).format('DD-MM-YYYY HH:mm')}</TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell
                      className={Number(invoice.riseFallRate) > 0 ? 'profitCell' : Number(invoice.riseFallRate) < 0 ? 'lossCell' : ''}
                    >
                      {(Number(invoice.riseFallRate) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.amount24, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      {/*<div className="flex gap-1">*/}
                      {/*  {(mexcContractDetailsMap.get(invoice.symbol)?.indexOrigin || []).map((exchange) =>*/}
                      {/*    exchangeImgMap[exchange] ? <img className="h-5 rounded-full" src={exchangeImgMap[exchange]} /> : exchange,*/}
                      {/*  )}*/}
                      {/*</div>*/}
                      <Exchanges symbol={invoice.symbol} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="mexc-futures-new">
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
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      createTime: prevState.createTime === 'desc' ? 'asc' : prevState.createTime === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['createTime'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['createTime'] === 'asc' && <ArrowUpWideNarrow size={13} />} Время создания
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      maxAmount: prevState.maxAmount === 'desc' ? 'asc' : prevState.maxAmount === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['maxAmount'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['maxAmount'] === 'asc' && <ArrowUpWideNarrow size={13} />} MaxVol
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...mexcFuturesTickers]
                .map((t) => ({
                  ...t,
                  spread: Number(t.ask1) / Number(t.bid1) - 1,
                  createTime: mexcContractDetailsMap.get(t.symbol)?.createTime,
                }))
                .filter((invoice) => mexcContractDetailsMap.get(invoice.symbol)?.isNew)
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['spread'] === 'desc') {
                    return b.spread - a.spread;
                  }

                  if (sorter['spread'] === 'asc') {
                    return a.spread - b.spread;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.riseFallRate) - Number(a.riseFallRate);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.riseFallRate) - Number(b.riseFallRate);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.amount24) - Number(a.amount24);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.amount24) - Number(b.amount24);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  if (sorter['createTime'] === 'desc') {
                    return b.createTime - a.createTime;
                  }

                  if (sorter['createTime'] === 'asc') {
                    return a.createTime - b.createTime;
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `MEXC:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`MEXC:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <div className="flex gap-1">
                        {mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl && (
                          <img className="h-4 rounded-full" src={mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl} />
                        )}
                        <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                          ${invoice.symbol} {mexcContractDetailsMap.get(invoice.symbol)?.isNew && '(Новый)'}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{dayjs(invoice.createTime).format('DD-MM-YYYY HH:mm')}</TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell>{(invoice.spread * 100).toFixed(2)}%</TableCell>
                    <TableCell
                      className={Number(invoice.riseFallRate) > 0 ? 'profitCell' : Number(invoice.riseFallRate) < 0 ? 'lossCell' : ''}
                    >
                      {(Number(invoice.riseFallRate) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.amount24, 'USD', 0, 2)}</TableCell>
                    <TableCell>
                      {moneyFormat(
                        mexcContractDetailsMap.get(invoice.symbol)?.contractSize *
                          mexcContractDetailsMap.get(invoice.symbol)?.maxVol *
                          invoice.lastPrice,
                        'USD',
                        0,
                        0,
                      )}
                    </TableCell>
                    <TableCell>
                      {/*<div className="flex gap-1">*/}
                      {/*  {(mexcContractDetailsMap.get(invoice.symbol)?.indexOrigin || []).map((exchange) =>*/}
                      {/*    exchangeImgMap[exchange] ? <img className="h-5 rounded-full" src={exchangeImgMap[exchange]} /> : exchange,*/}
                      {/*  )}*/}
                      {/*</div>*/}
                      <Exchanges symbol={invoice.symbol} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="mexc-index">
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
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>Индекс. цена</TableHead>
                <TableHead>Справ. цена</TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          diff: prevState.diff === 'desc' ? 'asc' : prevState.diff === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['diff'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['diff'] === 'asc' && <ArrowUpWideNarrow size={13} />} Diff
                    </span>
                    <TableColumnFilter _key="mexc-index-diff" label="Diff" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="mexc-index-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...mexcIndexTickers]
                .filter(
                  (t) =>
                    (!filters['mexc-index-amount24_from'] || Number(t.amount24) >= Number(filters['mexc-index-amount24_from'])) &&
                    (!filters['mexc-index-amount24_to'] || Number(t.amount24) <= Number(filters['mexc-index-amount24_to'])) &&
                    (!filters['mexc-index-diff_from'] || Number(t.diff) >= Number(filters['mexc-index-diff_from'])) &&
                    (!filters['mexc-index-diff_to'] || Number(t.diff) <= Number(filters['mexc-index-diff_to'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24'] && !sorter['diff']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['diff'] === 'desc') {
                    return Number(b.diff) - Number(a.diff);
                  }

                  if (sorter['diff'] === 'asc') {
                    return Number(a.diff) - Number(b.diff);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.riseFallRate) - Number(a.riseFallRate);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.riseFallRate) - Number(b.riseFallRate);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.amount24) - Number(a.amount24);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.amount24) - Number(b.amount24);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `MEXC:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`MEXC:${invoice.symbol}`)}
                  >
                    <TableCell className="w-[200px]">
                      <div className="flex gap-1">
                        {mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl && (
                          <img className="h-4 rounded-full" src={mexcContractDetailsMap.get(invoice.symbol)?.baseCoinIconUrl} />
                        )}
                        <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                          ${invoice.symbol}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell>{invoice.indexPrice}</TableCell>
                    <TableCell>{invoice.fairPrice}</TableCell>
                    <TableCell>{invoice.diff.toFixed(2)}%</TableCell>
                    <TableCell
                      className={Number(invoice.riseFallRate) > 0 ? 'profitCell' : Number(invoice.riseFallRate) < 0 ? 'lossCell' : ''}
                    >
                      {(Number(invoice.riseFallRate) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.amount24, 'USD', 0, 2)}</TableCell>
                    <TableCell>
                      {/*<div className="flex gap-1">*/}
                      {/*  {(mexcContractDetailsMap.get(invoice.symbol)?.indexOrigin || []).map((exchange) =>*/}
                      {/*    exchangeImgMap[exchange] ? <img className="h-5 rounded-full" src={exchangeImgMap[exchange]} /> : exchange,*/}
                      {/*  )}*/}
                      {/*</div>*/}
                      <Exchanges symbol={invoice.symbol} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="binance-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...binanceFuturesTickers]
                .filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.priceChangePercent) - Number(a.priceChangePercent);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.priceChangePercent) - Number(b.priceChangePercent);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.volume) - Number(a.volume);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.volume) - Number(b.volume);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `BINANCE:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`BINANCE:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <a href={`https://www.binance.com/ru/futures/${invoice.symbol}`} target="_blank">
                        ${invoice.symbol}
                      </a>
                    </TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell
                      className={
                        Number(invoice.priceChangePercent) > 0 ? 'profitCell' : Number(invoice.priceChangePercent) < 0 ? 'lossCell' : ''
                      }
                    >
                      {Number(invoice.priceChangePercent).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.volume, 'USD', 0, 0)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="bybit-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="bybit-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead className="w-[200px]">
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                    </span>
                    <TableColumnFilter _key="bybit-futures-riseFallRate" label="Изм, 1д" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="bybit-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bybitFuturesTickers]
                .map((t) => ({
                  ...t,
                  spread: (Number(t.ask1Price) / Number(t.bid1Price) - 1) * 100,
                  price24hPcnt: Number(t.price24hPcnt) * 100,
                }))
                .filter(
                  (t) =>
                    (!filters['bybit-futures-amount24_from'] || Number(t.turnover24h) >= Number(filters['bybit-futures-amount24_from'])) &&
                    (!filters['bybit-futures-amount24_to'] || Number(t.turnover24h) <= Number(filters['bybit-futures-amount24_to'])) &&
                    (!filters['bybit-futures-riseFallRate_from'] ||
                      Number(t.price24hPcnt) >= Number(filters['bybit-futures-riseFallRate_from'])) &&
                    (!filters['bybit-futures-riseFallRate_to'] ||
                      Number(t.price24hPcnt) <= Number(filters['bybit-futures-riseFallRate_to'])) &&
                    (!filters['bybit-futures-spread_from'] || Number(t.spread) >= Number(filters['bybit-futures-spread_from'])) &&
                    (!filters['bybit-futures-spread_to'] || Number(t.spread) <= Number(filters['bybit-futures-spread_to'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['spread'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['spread'] === 'desc') {
                    return b.spread - a.spread;
                  }

                  if (sorter['spread'] === 'asc') {
                    return a.spread - b.spread;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.price24hPcnt) - Number(a.price24hPcnt);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.price24hPcnt) - Number(b.price24hPcnt);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.turnover24h) - Number(a.turnover24h);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.turnover24h) - Number(b.turnover24h);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `BYBIT:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`BYBIT:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                        ${invoice.symbol}
                      </a>
                    </TableCell>
                    <TableCell>{invoice.lastPrice}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell
                      className={Number(invoice.price24hPcnt) > 0 ? 'profitCell' : Number(invoice.price24hPcnt) < 0 ? 'lossCell' : ''}
                    >
                      {Number(invoice.price24hPcnt).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.turnover24h, 'USD', 0, 0)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="htx-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="htx-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="htx-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...htxFuturesTickers]
                .filter((t) => Boolean(t.ask))
                .map((t) => ({ ...t, spread: (Number(t.ask?.[0]) / Number(t.bid?.[0]) - 1) * 100 }))
                .filter(
                  (t) =>
                    (!filters['htx-futures-amount24'] || Number(t.vol) >= Number(filters['htx-futures-amount24'])) &&
                    (!filters['htx-futures-spread'] || Number(t.spread) >= Number(filters['htx-futures-spread'])),
                )
                .map((t) => ({ ...t, priceChangePercent: Number(t.close) / Number(t.open) - 1 }))
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPrice) - Number(a.lastPrice);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPrice) - Number(b.lastPrice);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return b.priceChangePercent - a.priceChangePercent;
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return a.priceChangePercent - b.priceChangePercent;
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.vol) - Number(a.vol);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.vol) - Number(b.vol);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.contract_code.localeCompare(a.contract_code);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.contract_code.localeCompare(b.contract_code);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `HTX:${invoice.contract_code}` && 'rowHover')}
                    onClick={(e) => setSelected(`HTX:${invoice.contract_code}`)}
                  >
                    <TableCell>
                      <a href={`https://www.mexc.com/ru-RU/futures/${invoice.contract_code}`} target="_blank">
                        ${invoice.contract_code}
                      </a>
                    </TableCell>
                    <TableCell>{Number(invoice.close)}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell className={invoice.priceChangePercent > 0 ? 'profitCell' : invoice.priceChangePercent < 0 ? 'lossCell' : ''}>
                      {(invoice.priceChangePercent * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.vol, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.contract_code?.split('-')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="kucoin-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="kucoin-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="kucoin-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...kukoinFuturesTickers]
                .map((t) => ({ ...t, spread: (Number(t.sell) / Number(t.buy) - 1) * 100 }))
                .filter(
                  (t) =>
                    (!filters['kucoin-futures-amount24'] || Number(t.volValue) >= Number(filters['kucoin-futures-amount24'])) &&
                    (!filters['kucoin-futures-spread'] || Number(t.spread) >= Number(filters['kucoin-futures-spread'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.last) - Number(a.last);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.last) - Number(b.last);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.changeRate) - Number(a.changeRate);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.changeRate) - Number(b.changeRate);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.volValue) - Number(a.volValue);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.volValue) - Number(b.volValue);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `KUCOIN:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`KUCOIN:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                        ${invoice.symbol}
                      </a>
                    </TableCell>
                    <TableCell>{Number(invoice.last)}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell className={Number(invoice.changeRate) > 0 ? 'profitCell' : Number(invoice.changeRate) < 0 ? 'lossCell' : ''}>
                      {Number(invoice.changeRate * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.volValue, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.symbol?.split('-')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="bitget-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          spread: prevState.spread === 'desc' ? 'asc' : prevState.spread === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['spread'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['spread'] === 'asc' && <ArrowUpWideNarrow size={13} />} Спред
                    </span>
                    <TableColumnFilter _key="bitget-futures-spread" label="Спред" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2 items-center">
                    <span
                      className="flex gap-2 items-center cursor-pointer"
                      onClick={() =>
                        setSorter((prevState) => ({
                          ...prevState,
                          amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                        }))
                      }
                    >
                      {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                      {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                    </span>
                    <TableColumnFilter _key="bitget-futures-amount24" label="Оборот" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bitgetFutureTickers]
                .map((t) => ({ ...t, spread: (Number(t.askPr) / Number(t.bidPr) - 1) * 100 }))
                .filter(
                  (t) =>
                    (!filters['bitget-futures-amount24'] || Number(t.usdtVolume) >= Number(filters['bitget-futures-amount24'])) &&
                    (!filters['bitget-futures-spread'] || Number(t.spread) >= Number(filters['bitget-futures-spread'])),
                )
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.lastPr) - Number(a.lastPr);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.lastPr) - Number(b.lastPr);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.change24h) - Number(a.change24h);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.change24h) - Number(b.change24h);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.usdtVolume) - Number(a.usdtVolume);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.usdtVolume) - Number(b.usdtVolume);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.symbol.localeCompare(a.symbol);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.symbol.localeCompare(b.symbol);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `BITGET:${invoice.symbol}` && 'rowHover')}
                    onClick={(e) => setSelected(`BITGET:${invoice.symbol}`)}
                  >
                    <TableCell>
                      <a href={`https://www.bitget.com/futures/usdt/${invoice.symbol}`} target="_blank">
                        ${invoice.symbol}
                      </a>
                    </TableCell>
                    <TableCell>{Number(invoice.lastPr)}</TableCell>
                    <TableCell>{invoice.spread.toFixed(2)}%</TableCell>
                    <TableCell className={Number(invoice.change24h) > 0 ? 'profitCell' : Number(invoice.change24h) < 0 ? 'lossCell' : ''}>
                      {(Number(invoice.change24h) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.usdtVolume, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.symbol?.split('USDT')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="bitstamp-futures">
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
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      symbol: prevState.symbol === 'desc' ? 'asc' : prevState.symbol === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['symbol'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['symbol'] === 'asc' && <ArrowUpWideNarrow size={13} />} Тикер
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      price: prevState.price === 'desc' ? 'asc' : prevState.price === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['price'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['price'] === 'asc' && <ArrowUpWideNarrow size={13} />} Цена
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      riseFallRate: prevState.riseFallRate === 'desc' ? 'asc' : prevState.riseFallRate === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['riseFallRate'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['riseFallRate'] === 'asc' && <ArrowUpWideNarrow size={13} />} Изм, 1д
                  </div>
                </TableHead>
                <TableHead
                  className="w-[200px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      amount24: prevState.amount24 === 'desc' ? 'asc' : prevState.amount24 === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['amount24'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['amount24'] === 'asc' && <ArrowUpWideNarrow size={13} />} Оборот
                  </div>
                </TableHead>
                <TableHead
                  className="w-[750px]"
                  onClick={() =>
                    setSorter((prevState) => ({
                      ...prevState,
                      exchange: prevState.exchange === 'desc' ? 'asc' : prevState.exchange === 'asc' ? undefined : 'desc',
                    }))
                  }
                >
                  <div className="flex gap-3 items-center cursor-pointer">
                    {sorter['exchange'] === 'desc' && <ArrowDownWideNarrow size={13} />}
                    {sorter['exchange'] === 'asc' && <ArrowUpWideNarrow size={13} />} Биржи
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bitstampTickers]
                .sort((a, b) => {
                  if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                    return 0;
                  }

                  if (sorter['price'] === 'desc') {
                    return Number(b.last) - Number(a.last);
                  }

                  if (sorter['price'] === 'asc') {
                    return Number(a.last) - Number(b.last);
                  }

                  if (sorter['riseFallRate'] === 'desc') {
                    return Number(b.percent_change_24) - Number(a.percent_change_24);
                  }

                  if (sorter['riseFallRate'] === 'asc') {
                    return Number(a.percent_change_24) - Number(b.percent_change_24);
                  }

                  if (sorter['amount24'] === 'desc') {
                    return Number(b.volume) - Number(a.volume);
                  }

                  if (sorter['amount24'] === 'asc') {
                    return Number(a.volume) - Number(b.volume);
                  }

                  if (sorter['symbol'] === 'desc') {
                    return b.pair.localeCompare(a.pair);
                  }

                  if (sorter['symbol'] === 'asc') {
                    return a.pair.localeCompare(b.pair);
                  }

                  return 0;
                })
                .map((invoice, index) => (
                  <TableRow
                    className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `KUCOIN:${invoice.pair}` && 'rowHover')}
                    onClick={(e) => setSelected(`KUCOIN:${invoice.pair}`)}
                  >
                    <TableCell>
                      <a href={`https://www.mexc.com/ru-RU/futures/${invoice.pair}`} target="_blank">
                        ${invoice.pair}
                      </a>
                    </TableCell>
                    <TableCell>{Number(invoice.last)}</TableCell>
                    <TableCell
                      className={
                        Number(invoice.percent_change_24) > 0 ? 'profitCell' : Number(invoice.percent_change_24) < 0 ? 'lossCell' : ''
                      }
                    >
                      {(Number(invoice.percent_change_24) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{moneyFormatCompact(invoice.volume, 'USD', 0, 0)}</TableCell>
                    <TableCell>
                      <Exchanges symbol={invoice.pair?.split('/USD-PERP')[0]} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      <div className="col-span-2">{selected && <TWChart ticker={selected} height={480} multiple={1} small />}</div>
      <div className="col-span-3">
        <ArbitrageTable
          bitstampTickers={bitstampTickers}
          mexcFuturesTickers={mexcFuturesTickers.filter((t) => dayjs(t.timestamp).isSame(dayjs().startOf('day'), 'day'))}
          mexcSpotTickers={mexcSpotTickers.filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))}
          bingxSpotTickers={bingxSpotTickers.filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))}
          bingxFuturesTickers={bingxFuturesTickers.filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))}
          gateSpotTickers={gateSpotTickers}
          gateFuturesTickers={gateFuturesTickers}
          bybitSpotTickers={bybitSpotTickers}
          bybitFuturesTickers={bybitFuturesTickers}
          binanceSpotTickers={binanceSpotTickers.filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))}
          binanceFuturesTickers={binanceFuturesTickers.filter((t) => dayjs(t.closeTime).isSame(dayjs().startOf('day'), 'day'))}
          htxSpotTickers={htxSpotTickers}
          htxFuturesTickers={htxFuturesTickers.filter((t) => Boolean(t.ask))}
          kukoinSpotTickers={kukoinSpotTickers}
          kukoinFuturesTickers={kukoinFuturesTickers}
          bitgetSpotTickers={bitgetSpotTickers.filter((t) => dayjs(Number(t.ts)).isSame(dayjs().startOf('day'), 'day'))}
          bitgetFutureTickers={bitgetFutureTickers.filter((t) => dayjs(Number(t.ts)).isSame(dayjs().startOf('day'), 'day'))}
        />
      </div>
    </>
  );
};
