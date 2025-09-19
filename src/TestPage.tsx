import React, { useMemo, useState } from 'react';
import { Col, Row } from 'antd';
import { useAppSelector } from './store';
import { moneyFormat, numberFormat } from './MainPage/MainPage';
import { moneyFormatCompact, normalizePrice } from './utils';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/ui/table';
import { cn } from './lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { TWChart } from './components/TWChart';
import { useClosePositionMutation, useGetInstrumentByIdQuery, useTinkoffPostOrderMutation } from './api/tinkoff.api';
import { useCTraderclosePositionMutation, useCTraderPlaceOrderMutation } from './api/ctrader.api';
import { Button } from './components/ui/button.tsx';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, CirclePlus, CircleX } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog.tsx';
import { Checkbox } from './components/ui/checkbox.tsx';
import { useGetContractDetailsQuery, useGetMEXCContractQuery, useGetTickersQuery } from './api/mexc.api.ts';
import { TypographyParagraph } from './components/ui/typography.tsx';
import { toast } from 'sonner';
import { Input } from './components/ui/input.tsx';
import { useGetOrderbookMutation, useSendLimitOrderMutation } from './api/alor.api.ts';
import { Exchange, Side } from 'alor-api';
import { useGetBINGXTickersQuery } from './api/bingx.api.ts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { useGetGateTickersQuery } from './api/gate.api.ts';
import { useGetBYBITTickersQuery } from './api/bybit.api.ts';
import { useGetBinanceTickersQuery } from './api/binance.api.ts';
import dayjs from 'dayjs';
import { useGetHTXTickersQuery } from './api/htx.api.ts';
import { useGetKuCoinTickersQuery } from './api/kucoin.api.ts';
import { useGetBitgetTickersQuery } from './api/bitget.api.ts';
import { useGetBitstampTickersQuery } from './api/bitstamp.api.ts';

const FigiLabel = ({ uid }) => {
  const { data } = useGetInstrumentByIdQuery({ uid });

  return (
    <div className="flex gap-1">
      <div
        className="img"
        style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${data?.brand.logoName.replace('.png', '')}x160.png")` }}
      ></div>
      {data?.ticker}
    </div>
  );
};

const MEXCLabel = ({ symbol }) => {
  const { data } = useGetMEXCContractQuery({ symbol });

  return (
    <div className="flex gap-1">
      <div className="img" style={{ backgroundImage: `url("${data?.baseCoinIconUrl}")` }}></div>
      {data?.symbol}
    </div>
  );
};

const AlorLabel = ({ symbol }) => {
  const map = {
    GOLD: 'GoldFut2',
    PLD: 'Palladium',
    PLT: 'Platinum',
    UCNY: 'USDCNY',
    ED: 'EURUSD3',
    RUB: 'ruble',
  };

  const key = map[symbol.split('-')[0]];

  return (
    <div className="flex gap-1">
      {key && <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${key}x160.png")` }}></div>}
      {symbol}
    </div>
  );
};

const ForexLabel = ({ ticker }) => {
  const map = {
    XAUUSD_xp: 'GoldFut2',
    XAGUSD_xp: 'SilverFut',
    XPDUSD_xp: 'Palladium',
    XPTUSD_xp: 'Platinum',
    SPXUSD_xp: 's&p500',
    USDCNH_xp: 'USDCNY',
    EURUSD_xp: 'EURUSD3',
    CUCUSD_xp: 'Co',
  };

  return (
    <div className="flex gap-1">
      <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${map[ticker]}x160.png")` }}></div>
      {ticker}
    </div>
  );
};

export const TestPage = () => {
  const USDRate = 83.071;

  const [tPostOrderMutation, { isLoading: tPostOrderLoading }] = useTinkoffPostOrderMutation();
  const [ctraderPostOrderMutation, { isLoading: ctraderPostOrderLoading }] = useCTraderPlaceOrderMutation();

  const [tClosePositionMutation, { isLoading: tClosePositionLoading }] = useClosePositionMutation();
  const [ctraderClosePositionMutation, { isLoading: ctraderClosePositionLoading }] = useCTraderclosePositionMutation();

  const [getOrderbookMutation] = useGetOrderbookMutation();
  const [sendLimitOrderAlor] = useSendLimitOrderMutation();

  const [qtyMap, setQtyMap] = useState(localStorage.getItem('qtyMap') ? JSON.parse(localStorage.getItem('qtyMap')) : {});

  const {
    tinkoffAccounts,
    tinkoffPortfolio,
    tinkoffOrders,
    cTraderPositions,
    cTraderPositionPnL,
    cTraderAccount,
    cTraderSymbols,
    MEXCPositions,
  } = useAppSelector((state) => state.alorSlice);

  const { data: mexcTickers = [] } = useGetTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const mexcMap = useMemo(() => new Set<string>(mexcTickers.map((t) => t.symbol.split('_USDT')[0])), [mexcTickers]);

  const { data: bingxTickers = [] } = useGetBINGXTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bingxMap = useMemo(() => new Set<string>(bingxTickers.map((t) => t.symbol.split('-USDT')[0])), [bingxTickers]);

  const { data: gateTickers = [] } = useGetGateTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const gateMap = useMemo(() => new Set<string>(gateTickers.map((t) => t.contract.split('_USDT')[0])), [gateTickers]);

  const { data: bybitTickers = [] } = useGetBYBITTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bybitMap = useMemo(() => new Set<string>(bybitTickers.map((t) => t.symbol.split('USDT')[0])), [bybitTickers]);

  const { data: binanceTickers = [] } = useGetBinanceTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const binanceMap = useMemo(() => new Set<string>(binanceTickers.map((t) => t.symbol.split('USDT')[0])), [binanceTickers]);

  const { data: htxTickers = [] } = useGetHTXTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const htxMap = useMemo(() => new Set<string>(htxTickers.map((t) => t.contract_code.split('-USDT')[0])), [htxTickers]);

  const { data: kukoinTickers = [] } = useGetKuCoinTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const kukoinMap = useMemo(() => new Set<string>(kukoinTickers.map((t) => t.symbol.split('-USDT')[0])), [kukoinTickers]);

  const { data: bitgetTickers = [] } = useGetBitgetTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const bitgetMap = useMemo(() => new Set<string>(bitgetTickers.map((t) => t.symbol.split('USDT')[0])), [bitgetTickers]);

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

  const alorPositions = useAppSelector((state) => state.alorSlice.alorPositions);

  const handleCTraderPostOrderClick = (symbolId: string, side: 'buy' | 'sell') => async () => {
    const lots = qtyMap[symbolId];
    if (!lots) return;

    await ctraderPostOrderMutation({
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      symbolId,
      side,
      lots,
    }).unwrap();
  };

  const handleTPostOrderClick = (instrumentUid: string, side: 'buy' | 'sell') => async () => {
    const quantity = qtyMap[instrumentUid];
    if (!quantity) return;

    await tPostOrderMutation({
      brokerAccountId: tinkoffPortfolio?.accountId,
      instrumentUid,
      side,
      quantity,
    }).unwrap();
  };

  const map = useMemo(() => new Map<number, any>(cTraderSymbols?.map((s) => [s.symbolId, s])), [cTraderSymbols]);

  const [selected, setSelected] = useState<string>();

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

  const PairPnl = (pair) => {
    return pair.reduce((acc, curr) => acc + PnLMap[curr] || 0, 0);
  };

  const totalTIPnL = useMemo(
    () =>
      (tinkoffPortfolio?.positions || [])
        .filter((p) => ['share', 'futures'].includes(p.instrumentType))
        .reduce((acc, cur) => acc + cur.expectedYield, 0),
    [tinkoffPortfolio?.positions],
  );

  const totalAlorPnL = useMemo(
    () => (alorPositions || []).filter((p) => p.symbol !== 'symbol').reduce((acc, cur) => acc + cur.unrealisedPl, 0),
    [alorPositions],
  );

  const totalPnLForex = useMemo(
    () => (cTraderPositions?.position || []).reduce((acc, cur) => acc + pnl.get(cur.positionId), 0),
    [cTraderPositions?.position, pnl],
  );

  const amount = (tinkoffPortfolio?.totalAmountPortfolio || 0) - bondsMargin;

  const cTraderPositionsMapped = useMemo<any[]>(() => {
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

  const PnLMap = useMemo(
    () => ({
      ...(tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr.expectedYield;
        return acc;
      }, {}),
      ...cTraderPositionsMapped.reduce((acc, curr) => {
        acc[curr.tradeData.symbolId] = (curr.PnL || 0) * USDRate;
        return acc;
      }, {}),
      ...alorPositions.reduce((acc, curr) => {
        acc[curr.symbol] = curr.unrealisedPl || 0;
        return acc;
      }, {}),
    }),
    [tinkoffPortfolio?.positions, cTraderPositionsMapped, alorPositions],
  );

  const total = totalTIPnL + totalPnLForex * USDRate + totalAlorPnL;

  const alorSymbolPositionMap = useMemo(
    () =>
      (alorPositions || []).reduce((acc, curr) => {
        acc[curr.symbol] = curr;

        return acc;
      }, {}),
    [alorPositions],
  );

  const tinkoffInstrumentUidPositionMap = useMemo(
    () =>
      (tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr;

        return acc;
      }, {}),
    [tinkoffPortfolio?.positions],
  );

  const [selectedTicker, setSelectedTicker] = useState([]);

  const [pairs, setPairs] = useState(localStorage.getItem('pairs') ? JSON.parse(localStorage.getItem('pairs')) : []);

  const handleDeletePair = (pair) => {
    setPairs(pairs.filter((p) => p !== pair));

    localStorage.setItem('pairs', JSON.stringify(pairs.filter((p) => p !== pair)));
  };

  const handleAddPair = () => {
    pairs.push(selectedTicker);
    setPairs(pairs);

    localStorage.setItem('pairs', JSON.stringify(pairs));

    setSelectedTicker([]);
  };

  const handleClosePositionClick = (tickers: string[]) => async (e) => {
    const ctraderTickers = tickers.filter((t) => Number.isInteger(t));
    await Promise.all(
      ctraderTickers.map((symbolId) =>
        ctraderClosePositionMutation({
          ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
          symbolId,
        }).unwrap(),
      ),
    );

    toast.success('Позиции в CTrader закрыты');

    const tiTickers = tickers.filter((t) => t.split('-').length > 1);
    await Promise.all(
      tiTickers.map((instrumentUid) =>
        tClosePositionMutation({
          brokerAccountId: tinkoffPortfolio?.accountId,
          instrumentUid,
        }).unwrap(),
      ),
    );

    toast.success('Позиции в Тинькофф закрыты');

    const alorTicker = tickers.find((t) => !Number.isInteger(t) && t.split('-').length <= 1);
    const tickerPosition = alorPositions.find((t) => t.symbol === alorTicker);
    if (tickerPosition) {
      // Получить стакан
      const orderbook = await getOrderbookMutation({
        exchange: 'MOEX',
        format: 'Simple',
        depth: 5,
        seccode: alorTicker,
      }).unwrap();

      // Встать в лучшую цену
      await sendLimitOrderAlor({
        side: tickerPosition.qty > 0 ? Side.Sell : Side.Buy,
        user: {
          portfolio: localStorage.getItem('aPortfolio'),
        },
        instrument: {
          symbol: alorTicker,
          exchange: Exchange.MOEX,
        },
        quantity: Math.abs(tickerPosition.qty),
        price: tickerPosition.qty > 0 ? orderbook.asks[0].price : orderbook.bids[0].price,
        type: 'limit',
      }).unwrap();
    }

    // toast.success('Позиции в Тинькофф закрыты');
  };

  const handleOnChangeTickerQty = (ticker: string) => (e) => {
    const qty = Number(e.target.value);

    setQtyMap((prevState) => ({ ...prevState, [ticker]: qty }));

    localStorage.setItem('qtyMap', JSON.stringify({ ...qtyMap, [ticker]: qty }));
  };

  const [tab, setTab] = useState<string>('mexc-futures');

  const options: { label: string; value: string; imgSrc?: string }[] = [
    { label: 'Mexc Фьючерсы', value: 'mexc-futures', imgSrc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png' },
    {
      label: 'Mexc Фьюч (New)',
      value: 'mexc-futures-new',
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

  const exchangeImgMap = {
    BINANCE: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/270.png',
    BINANCE_FUTURE: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/270.png',
    HTX: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/102.png',
    MEXC: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png',
    GATEIO: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/302.png',
    KUCOIN: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/311.png',
    BYBIT: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png',
    BYBIT_FUTURE: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png',
    BITGET: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png',
    BITGET_FUTURE: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png',
    COINBASE: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/89.png',
    KRAKEN: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/24.png',
    OKX: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/294.png',
    BITSTAMP: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/70.png',
    BITFINEX: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/37.png',
    BINGX: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1064.png',
  };

  const totalPositions = useMemo(() => {
    const tiPos = [...(tinkoffPortfolio?.positions || [])];
    tiPos.push(
      ...cTraderPositionsMapped.map((t) => ({
        ...t,
        instrumentType: 'forex',
      })),
    );

    tiPos.push(
      ...alorPositions.map((t) => ({
        ...t,
        instrumentType: 'alor',
      })),
    );

    return tiPos;
  }, [tinkoffPortfolio?.positions, cTraderPositionsMapped, alorPositions]);

  const ForexRow = ({ invoice, index }: { invoice: any; index: number }) => (
    <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
      <TableCell>
        <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />
      </TableCell>
      <TableCell>Форекс</TableCell>
      <TableCell>XPBEE</TableCell>
      <TableCell>{invoice.volume / 10000}</TableCell>
      <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      <TableCell className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}>
        {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}
      </TableCell>
      <TableCell className="text-right">-</TableCell>
      {/*<TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
      {/*  {moneyFormat(invoice.PnL, 'USD', 0, 2)}*/}
      {/*</TableCell>*/}
      <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>
        {moneyFormat(invoice.PnL * USDRate, 'RUB', 0, 2)}
      </TableCell>
    </TableRow>
  );

  const AlorRow = ({ invoice, index }: { invoice: any; index: number }) => (
    <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
      <TableCell>
        <AlorLabel symbol={invoice.symbol} />
      </TableCell>
      <TableCell>{invoice.exchange}</TableCell>
      <TableCell>Алор</TableCell>
      <TableCell>{invoice.qty}</TableCell>
      <TableCell>-</TableCell>
      <TableCell>{moneyFormat(invoice.volume, 'RUB', 0, 2)}</TableCell>
      <TableCell>{moneyFormat(invoice.currentVolume, 'RUB', 0, 2)}</TableCell>
      <TableCell>-</TableCell>
      <TableCell className="text-right">-</TableCell>
      <TableCell
        className={invoice.unrealisedPl > 0 ? 'text-right profitCell' : invoice.unrealisedPl < 0 ? 'text-right lossCell' : 'text-right'}
      >
        {moneyFormat(invoice.unrealisedPl, 'RUB', 0, 2)}
      </TableCell>
    </TableRow>
  );

  const SymbolComp = ({ invoice }: { invoice: string }) => {
    if (Number.isInteger(invoice)) return <ForexLabel ticker={map.get(invoice)?.symbolName} />;
    if (invoice.includes('.') || invoice === 'RUB') return <AlorLabel symbol={invoice} />;

    return <FigiLabel uid={invoice} />;
  };

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
              <CardDescription>Текущий финрез (Тинькофф)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalTIPnL > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalTIPnL)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (Алор)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalAlorPnL > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalAlorPnL)}
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
                  total > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(total)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
      </Row>
      <div className="grid grid-cols-3 gap-2 flex-wrap">
        <Table wrapperClassName="pt-2 min-w-[470px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-center" colSpan={6}>
                Арбитражные пары
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead className="text-right">Чистая прибыль RUB</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map((invoice, index) => (
              <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
                <TableCell className="flex gap-2">
                  {invoice.map((p) => (
                    <SymbolComp invoice={p} />
                  ))}
                </TableCell>
                <TableCell
                  className={PairPnl(invoice) > 0 ? 'text-right profitCell' : PairPnl(invoice) < 0 ? 'text-right lossCell' : 'text-right'}
                >
                  {moneyFormat(PairPnl(invoice))}
                </TableCell>
                <TableCell className="text-right gap-2 flex justify-end">
                  {invoice.some((i) => !tinkoffInstrumentUidPositionMap[i] || !cTraderPositionsMapped[i] || !alorSymbolPositionMap[i]) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="xs" variant="success">
                          Открыть
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md gap-0">
                        <DialogHeader>
                          <DialogTitle>Открытие позиции</DialogTitle>
                        </DialogHeader>
                        <div className="p-3 gap-2 flex flex-col">
                          <TypographyParagraph>Выберите объем для позиций</TypographyParagraph>
                          {invoice.map((p) => (
                            <div className="flex items-center justify-between gap-2">
                              <SymbolComp invoice={p} />
                              <div className="flex gap-2">
                                <Input size="xs" type="number" onChange={handleOnChangeTickerQty(p)} value={qtyMap[p] || 0} step={0.01} />
                                <Button
                                  size="xs"
                                  variant="success"
                                  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}
                                  onClick={!Number.isInteger(p) ? handleTPostOrderClick(p, 'buy') : handleCTraderPostOrderClick(p, 'buy')}
                                >
                                  Купить
                                </Button>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}
                                  onClick={!Number.isInteger(p) ? handleTPostOrderClick(p, 'sell') : handleCTraderPostOrderClick(p, 'sell')}
                                >
                                  Продать
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {invoice.some((i) => tinkoffInstrumentUidPositionMap[i] || cTraderPositionsMapped[i] || alorSymbolPositionMap[i]) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="xs" variant="destructive">
                          Закрыть
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md gap-0">
                        <DialogHeader>
                          <DialogTitle>Закрытие позиции</DialogTitle>
                        </DialogHeader>
                        <div className="p-3 gap-2 flex flex-col">
                          <TypographyParagraph>Вы уверены что хотите закрыть позицию?</TypographyParagraph>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Инструмент</TableHead>
                                <TableHead className="text-right">Доход</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[invoice].map((invoice, index) => (
                                <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                                  <TableCell className="flex gap-2">
                                    {invoice.map((p) => (
                                      <SymbolComp invoice={p} />
                                    ))}
                                  </TableCell>
                                  <TableCell
                                    className={
                                      PairPnl(invoice) > 0
                                        ? 'text-right profitCell'
                                        : PairPnl(invoice) < 0
                                          ? 'text-right lossCell'
                                          : 'text-right'
                                    }
                                  >
                                    {moneyFormat(PairPnl(invoice))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <DialogClose asChild>
                          <Button
                            className="m-2"
                            onClick={handleClosePositionClick(invoice)}
                            disabled={tClosePositionLoading}
                            variant="destructive"
                          >
                            Закрыть
                          </Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDeletePair(invoice)} className="p-0 h-5 w-5">
                    <CircleX />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <CirclePlus /> Добавить пару для сравнения
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md gap-0">
                    <DialogHeader>
                      <DialogTitle>Добавление пары для сравнения</DialogTitle>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Инструмент</TableHead>
                          <TableHead className="text-right">Доход</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...(tinkoffPortfolio?.positions || []), ...cTraderPositionsMapped, ...alorPositions].map((invoice, index) => (
                          <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                            <TableCell className="flex gap-2">
                              <Checkbox
                                checked={selectedTicker.includes(invoice.symbol || invoice.instrumentUid || invoice.tradeData.symbolId)}
                                className="flex"
                                onCheckedChange={(checked) =>
                                  checked
                                    ? setSelectedTicker((prevState) => [
                                        ...prevState,
                                        invoice.symbol || invoice.instrumentUid || invoice.tradeData.symbolId,
                                      ])
                                    : setSelectedTicker((prevState) =>
                                        prevState.filter(
                                          (p) => p !== (invoice.symbol || invoice.instrumentUid || invoice.tradeData.symbolId),
                                        ),
                                      )
                                }
                              />
                              {invoice.symbol && <AlorLabel symbol={invoice.symbol} />}
                              {invoice.instrumentUid && <FigiLabel uid={invoice.instrumentUid} />}
                              {invoice.tradeData?.symbolId && <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />}
                            </TableCell>
                            <TableCell
                              className={
                                (invoice.unrealisedPl || invoice.expectedYield || invoice.PnL) > 0
                                  ? 'text-right profitCell'
                                  : (invoice.unrealisedPl || invoice.expectedYield || invoice.PnL) < 0
                                    ? 'text-right lossCell'
                                    : 'text-right'
                              }
                            >
                              {moneyFormat(invoice.unrealisedPl || invoice.expectedYield || invoice.PnL || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button className="m-2" disabled={selectedTicker.length < 2} onClick={handleAddPair}>
                      Добавить
                    </Button>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <Table wrapperClassName="pt-2 col-span-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-left" colSpan={10}>
                Портфель
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableHeader className="bg-[rgb(36,52,66)]">
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead className="w-[200px]">Тип</TableHead>
              <TableHead className="w-[200px]">Брокер</TableHead>
              <TableHead>Лотов</TableHead>
              <TableHead>Маржа</TableHead>
              {/*<TableHead>Количество</TableHead>*/}
              <TableHead>Средняя цена позиции</TableHead>
              <TableHead>Текущая цена</TableHead>
              <TableHead className="text-right">Свопы</TableHead>
              <TableHead className="text-right">Вариационка</TableHead>
              <TableHead className="text-right">Доход</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalPositions.map((invoice, index) =>
              invoice.instrumentType === 'forex' ? (
                <ForexRow invoice={invoice} index={index} />
              ) : invoice.instrumentType === 'alor' ? (
                <AlorRow invoice={invoice} index={index} />
              ) : (
                <TableRow key={invoice.invoice} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                  <TableCell>
                    <FigiLabel uid={invoice.instrumentUid} />
                  </TableCell>
                  <TableCell>{instrumentTypeMap[invoice.instrumentType]}</TableCell>
                  <TableCell>Тинькофф</TableCell>
                  <TableCell>{numberFormat(invoice.quantityLots)}</TableCell>
                  <TableCell>-</TableCell>
                  {/*<TableCell>{numberFormat(invoice.quantity)}</TableCell>*/}
                  <TableCell>{moneyFormat(invoice.averagePositionPrice, 'RUB', 0, 2)}</TableCell>
                  <TableCell>{moneyFormat(invoice.currentPrice, 'RUB', 0, 2)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell
                    className={
                      invoice.varMargin > 0 ? 'text-right profitCell' : invoice.varMargin < 0 ? 'text-right lossCell' : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.varMargin)}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.expectedYield > 0 ? 'text-right profitCell' : invoice.expectedYield < 0 ? 'text-right lossCell' : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.expectedYield)}
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>

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
                {[...gateTickers]
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
                      return Number(b.volume_24h) - Number(a.volume_24h);
                    }

                    if (sorter['amount24'] === 'asc') {
                      return Number(a.volume_24h) - Number(b.volume_24h);
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
                      <TableCell
                        className={
                          Number(invoice.change_percentage) > 0 ? 'profitCell' : Number(invoice.change_percentage) < 0 ? 'lossCell' : ''
                        }
                      >
                        {Number(invoice.change_percentage)}%
                      </TableCell>
                      <TableCell>{moneyFormatCompact(invoice.volume_24h, 'USD', 0, 0)}</TableCell>
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
                    className="w-[650px]"
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
                {[...bingxTickers]
                  .sort((a, b) => {
                    if (!sorter['riseFallRate'] && !sorter['price'] && !sorter['symbol'] && !sorter['amount24']) {
                      return 0;
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
                    className="w-[650px]"
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
                {[...mexcTickers]
                  .map((t) => ({ ...t, createTime: mexcContractDetailsMap.get(t.symbol)?.createTime }))
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
                    className="w-[650px]"
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
                {[...mexcTickers]
                  .map((t) => ({ ...t, createTime: mexcContractDetailsMap.get(t.symbol)?.createTime }))
                  .filter((invoice) => mexcContractDetailsMap.get(invoice.symbol)?.isNew)
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
                {[...binanceTickers]
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
                {[...bybitTickers]
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
                      <TableCell
                        className={Number(invoice.price24hPcnt) > 0 ? 'profitCell' : Number(invoice.price24hPcnt) < 0 ? 'lossCell' : ''}
                      >
                        {(Number(invoice.price24hPcnt) * 100).toFixed(2)}%
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
                    className="w-[650px]"
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
                {[...htxTickers]
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
                      <TableCell
                        className={invoice.priceChangePercent > 0 ? 'profitCell' : invoice.priceChangePercent < 0 ? 'lossCell' : ''}
                      >
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
                {[...kukoinTickers]
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
                      <TableCell
                        className={Number(invoice.changeRate) > 0 ? 'profitCell' : Number(invoice.changeRate) < 0 ? 'lossCell' : ''}
                      >
                        {Number(invoice.changeRate * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>{moneyFormatCompact(invoice.volValue, 'USD', 0, 0)}</TableCell>
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
                    className="w-[650px]"
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
                {[...bitgetTickers]
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
                      className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === `KUCOIN:${invoice.symbol}` && 'rowHover')}
                      onClick={(e) => setSelected(`KUCOIN:${invoice.symbol}`)}
                    >
                      <TableCell>
                        <a href={`https://www.mexc.com/ru-RU/futures/${invoice.symbol}`} target="_blank">
                          ${invoice.symbol}
                        </a>
                      </TableCell>
                      <TableCell>{Number(invoice.lastPr)}</TableCell>
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
                    className="w-[650px]"
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
                      <TableCell>{Number(invoice.lastPr)}</TableCell>
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
        {/*<Table wrapperClassName="pt-2">*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px] text-center" colSpan={6}>*/}
        {/*        Forex*/}
        {/*      </TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableHeader className="bg-[rgb(36,52,66)]">*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px]">Инструмент</TableHead>*/}
        {/*      <TableHead>Лотов</TableHead>*/}
        {/*      <TableHead>Использованная маржа</TableHead>*/}
        {/*      <TableHead className="text-right">Своп</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль USDT</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль RUB</TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableBody>*/}
        {/*    {cTraderPositionsMapped.map((invoice, index) => (*/}
        {/*      <TableRow*/}
        {/*        key={invoice.invoice}*/}
        {/*        className={index % 2 ? 'rowOdd' : 'rowEven'}*/}
        {/*        onClick={handleSelectForex(map.get(invoice.tradeData.symbolId)?.symbolName)}*/}
        {/*      >*/}
        {/*        <TableCell>*/}
        {/*          <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />*/}
        {/*        </TableCell>*/}
        {/*        <TableCell>{invoice.volume / 10000}</TableCell>*/}
        {/*        <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>*/}
        {/*        <TableCell className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(invoice.PnL, 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(invoice.PnL * USDRate, 'RUB', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*      </TableRow>*/}
        {/*    ))}*/}
        {/*  </TableBody>*/}
        {/*</Table>*/}
        {/*<Table wrapperClassName="pt-2">*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px] text-center" colSpan={6}>*/}
        {/*        MEXC*/}
        {/*      </TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px]">Инструмент</TableHead>*/}
        {/*      <TableHead>Лотов</TableHead>*/}
        {/*      <TableHead>Использованная маржа</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль USDT</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль RUB</TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableBody>*/}
        {/*    {(MEXCPositions || []).map((invoice, index) => (*/}
        {/*      <TableRow key={invoice.symbol} className={index % 2 ? 'rowOdd' : 'rowEven'}>*/}
        {/*        <TableCell>*/}
        {/*          <MEXCLabel symbol={invoice.symbol} />*/}
        {/*        </TableCell>*/}
        {/*        <TableCell>{invoice.holdVol}</TableCell>*/}
        {/*        <TableCell>{moneyFormat(invoice.marginRatio, 'USD', 0, 2)}</TableCell>*/}
        {/*        <TableCell*/}
        {/*          className={*/}
        {/*            invoice.profitRatio > 0 ? 'text-right profitCell' : invoice.profitRatio < 0 ? 'text-right lossCell' : 'text-right'*/}
        {/*          }*/}
        {/*        >*/}
        {/*          {moneyFormat(invoice.profitRatio, 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell*/}
        {/*          className={*/}
        {/*            invoice.profitRatio > 0 ? 'text-right profitCell' : invoice.profitRatio < 0 ? 'text-right lossCell' : 'text-right'*/}
        {/*          }*/}
        {/*        >*/}
        {/*          {moneyFormat(invoice.profitRatio * 80, 'RUB', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*      </TableRow>*/}
        {/*    ))}*/}
        {/*  </TableBody>*/}
        {/*</Table>*/}
      </div>
    </>
  );
};
