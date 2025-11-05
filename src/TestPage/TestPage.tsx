import React, { useMemo, useState } from 'react';
import { useAppSelector } from '../store.ts';
import { exchangeImgMap, moneyFormat, moneyFormatCompact, normalizePrice, numberFormat } from '../utils.ts';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { cn } from '../lib/utils.ts';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { useClosePositionMutation, useGetInstrumentByIdQuery, useTinkoffPostOrderMutation } from '../api/tinkoff.api.ts';
import {
  useCTraderclosePositionMutation,
  useCTraderPlaceOrderMutation,
  useGetCTraderCashflowQuery,
  useGetCTraderDealsQuery,
} from '../api/ctrader.api.ts';
import { Button } from '../components/ui/button.tsx';
import { ChevronDownIcon, CirclePlus, CircleX } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import { useGetMEXCContractQuery } from '../api/mexc.api.ts';
import { TypographyParagraph } from '../components/ui/typography.tsx';
import { toast } from 'sonner';
import { Input } from '../components/ui/input.tsx';
import { useGetOrderbookMutation, useGetRuRateQuery, useGetSummaryQuery, useSendLimitOrderMutation } from '../api/alor.api.ts';
import { Exchange, Side } from 'alor-api';
import { CTraderCard } from './CTraderCard.tsx';
import { AppsTokenResponse } from '../api/alor.slice.ts';
import dayjs from 'dayjs';
import { Calendar } from '../components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover.tsx';
import type { DateRange } from 'react-day-picker/dist/cjs/types/shared';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.tsx';

export const FigiLabel = ({ uid }) => {
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

export const AlorLabel = ({ symbol }) => {
  const map = {
    GOLD: 'GoldFut2',
    SILV: 'SilverFut',
    PLD: 'Palladium',
    PLT: 'Platinum',
    UCNY: 'USDCNY',
    CNY: 'CNYRUR',
    SI: 'USD1',
    ED: 'EURUSD3',
    EU: 'EUR1',
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

export const ForexLabel = ({ ticker }) => {
  const map = {
    XAUUSD_xp: 'GoldFut2',
    XAGUSD_xp: 'SilverFut',
    XPDUSD_xp: 'Palladium',
    XPTUSD_xp: 'Platinum',
    SPXUSD_xp: 's&p500',
    USDCNH_xp: 'USDCNY',
    EURUSD_xp: 'EURUSD3',
    EURCNH_xp: 'EUR1',
    CUCUSD_xp: 'Co',
  };

  return (
    <div className="flex gap-1 items-center">
      <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${map[ticker]}x160.png")` }}></div>
      {ticker}
    </div>
  );
};

export const TestPage = () => {
  // const USDRate = 83.071;

  const [searchParams, setSearchParams] = useSearchParams();

  const preset = searchParams.get('preset') || undefined;
  const setPreset = (preset: string) => {
    searchParams.set('preset', preset);
    setSearchParams(searchParams);
  };

  const setDateRange = (range: DateRange) => {
    searchParams.set('from', dayjs(range.from).format('YYYY-MM-DD'));
    searchParams.set('to', dayjs(range.to).format('YYYY-MM-DD'));
    searchParams.delete('preset');
    setSearchParams(searchParams);
  };

  const { from, to } = useMemo(() => {
    const from = dayjs(searchParams.get('from') || dayjs().startOf('month').format('YYYY-MM-DD')).toDate();
    const to = dayjs(searchParams.get('to') || dayjs().endOf('month').format('YYYY-MM-DD')).toDate();

    switch (preset) {
      case 'today':
        return {
          from: dayjs().startOf('day').toDate(),
          to: dayjs().endOf('day').toDate(),
        };
      case 'yesterday':
        return {
          from: dayjs().add(-1, 'day').startOf('day').toDate(),
          to: dayjs().add(-1, 'day').endOf('day').toDate(),
        };
      case 'week':
        return {
          from: dayjs().startOf('week').toDate(),
          to: dayjs().endOf('week').toDate(),
        };
      case 'month':
        return {
          from: dayjs().startOf('month').toDate(),
          to: dayjs().endOf('month').toDate(),
        };
      default:
        return { from, to };
    }
  }, [searchParams, preset]);

  const dateRange: DateRange = { from, to };

  const { data: rateData } = useGetRuRateQuery();
  const USDRate = rateData?.Valute.USD.Value;

  const [tPostOrderMutation, { isLoading: tPostOrderLoading }] = useTinkoffPostOrderMutation();
  const [ctraderPostOrderMutation, { isLoading: ctraderPostOrderLoading }] = useCTraderPlaceOrderMutation();

  const [tClosePositionMutation, { isLoading: tClosePositionLoading }] = useClosePositionMutation();
  const [ctraderClosePositionMutation, { isLoading: ctraderClosePositionLoading }] = useCTraderclosePositionMutation();

  const [getOrderbookMutation] = useGetOrderbookMutation();
  const [sendLimitOrderAlor] = useSendLimitOrderMutation();

  const { data: alorSummary } = useGetSummaryQuery(
    {
      format: 'Simple',
      portfolio: localStorage.getItem('aPortfolio'),
      exchange: 'MOEX',
    },
    {
      skip: !localStorage.getItem('aPortfolio'),
      pollingInterval: 5000,
    },
  );

  const [qtyMap, setQtyMap] = useState(localStorage.getItem('qtyMap') ? JSON.parse(localStorage.getItem('qtyMap')) : {});

  const {
    filters,
    tinkoffAccounts,
    tinkoffPortfolio,
    tinkoffOrders,
    cTraderPositions,
    cTraderPositionPnL,
    cTraderAccount,
    cTraderSymbols,
    bybitWallets,
    gateSAccounts,
    bitgetFAccounts,
    gateFAccounts,
    bingxBalance,
    mexcFAccount,
    mexcSAccount,
    MEXCPositions,
    okxAccounts,
    cTraderSummary,
  } = useAppSelector((state) => state.alorSlice);
  const { accessToken } = useAppSelector((state) => state.alorSlice.cTraderAuth || ({} as AppsTokenResponse));

  const { data: deals = [] } = useGetCTraderDealsQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      from: from.getTime(),
      to: to.getTime(),
    },
    {
      pollingInterval: 15000,
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  const { data: ctraderCashflow = [] } = useGetCTraderCashflowQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      from: from.getTime(),
      to: to.getTime(),
    },
    {
      pollingInterval: 15000,
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  const closesPositions = deals.filter((d) => Boolean(d.closePositionDetail));

  const ctraderDealsTotal = useMemo(() => {
    return closesPositions.reduce(
      (acc, invoice) =>
        acc + (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) / 10 ** invoice.closePositionDetail.moneyDigits,
      0,
    );
  }, [closesPositions]);

  const symbolPositionsMap = closesPositions.reduce((acc, invoice) => {
    if (!acc[invoice.symbolId]) {
      acc[invoice.symbolId] = 0;
    }

    acc[invoice.symbolId] +=
      (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) / 10 ** invoice.closePositionDetail.moneyDigits;

    return acc;
  }, {});

  const okxBalance = Number(okxAccounts?.[0]?.totalEq) || 0;
  const bitgetBalance = Number(bitgetFAccounts?.[0]?.usdtEquity) || 0;
  const mexcSBalance = Number(mexcSAccount?.balances?.find((a) => a.asset === 'USDT')?.free) || 0;
  const mexcFBalance = Number(mexcFAccount?.equity) || 0;
  const mexcBalance = mexcFBalance + mexcSBalance;
  const bybitBalance = Number(bybitWallets?.[0]?.totalEquity) || 0;
  const gateSBalance = Number(gateSAccounts?.find((c) => c.currency === 'USDT')?.available) || 0;
  const gateFBalance = Number(gateFAccounts?.crossMarginBalance) || 0;
  const gateBalance = gateFBalance + gateSBalance;
  const bingBalance = Number(bingxBalance?.find((b) => b.asset === 'USDT')?.equity) || 0;
  const ctraderDigits = useMemo(() => 10 ** (cTraderSummary?.moneyDigits || 1), [cTraderSummary?.moneyDigits]);

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

  const PairMoexAvgVolume = (pair) => {
    const onlyFutures = pair.filter((p) => p.toString().includes('-'));
    if (!onlyFutures.length) return 0;
    return onlyFutures.reduce((acc, curr) => acc + volumeMap[curr] || 0, 0) / onlyFutures.length;
  };

  const PairSwap = (pair) => {
    return pair.reduce((acc, curr) => acc + SwapMap[curr] || 0, 0);
  };

  const PairPrice = (pair) => {
    return pair.reduce((acc, curr) => (!acc ? PriceMap[curr] : acc / PriceMap[curr] || 0), 0);
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
    () =>
      (cTraderPositions?.position || []).reduce(
        (acc, cur) => acc + pnl.get(cur.positionId) + normalizePrice(parseInt(cur.swap, 10), cTraderPositionPnL?.moneyDigits || 1),
        0,
      ),
    [cTraderPositionPnL?.moneyDigits, cTraderPositions?.position, pnl],
  );

  const ctraderBalance = (cTraderSummary?.balance || 0) / ctraderDigits + totalPnLForex;

  const amount = (tinkoffPortfolio?.totalAmountPortfolio || 0) - bondsMargin;

  function calculateAveragePrice(entries) {
    let totalCost = 0;
    let totalVolume = 0;

    for (const entry of entries) {
      totalCost += entry.price * entry.volume;
      totalVolume += entry.volume;
    }

    if (totalVolume === 0) {
      throw new Error('Total volume cannot be zero');
    }

    return totalCost / totalVolume;
  }

  const cTraderPositionsMapped = useMemo<any[]>(() => {
    const positionMap = (cTraderPositions?.position || []).reduce((acc, curr) => {
      if (!acc[curr.tradeData.symbolId]) {
        acc[curr.tradeData.symbolId] = {
          ...curr,
          PnL: pnl.get(curr.positionId),
          volume: curr.tradeData.volume,
          avgPrice: curr.price,
          totalCost: curr.price * curr.tradeData.volume,
        };
      } else {
        acc[curr.tradeData.symbolId].PnL += pnl.get(curr.positionId);
        acc[curr.tradeData.symbolId].swap += curr.swap;
        acc[curr.tradeData.symbolId].volume += curr.tradeData.volume;
        acc[curr.tradeData.symbolId].usedMargin += curr.usedMargin;
        acc[curr.tradeData.symbolId].totalCost += curr.price * curr.tradeData.volume;
        acc[curr.tradeData.symbolId].avgPrice = acc[curr.tradeData.symbolId].totalCost / acc[curr.tradeData.symbolId].volume;
      }

      return acc;
    }, {});

    return Object.entries(positionMap)
      .map(([key, value]) => value)
      .sort((a, b) => b.PnL - a.PnL);
  }, [cTraderPositions?.position, pnl]);

  const PriceMap = useMemo(
    () => ({
      ...cTraderPositionsMapped.reduce((acc, curr) => {
        acc[curr.tradeData.symbolId] = curr.avgPrice || 0;
        return acc;
      }, {}),
      ...alorPositions.reduce((acc, curr) => {
        acc[curr.symbol] = curr.avgPrice || 0;
        return acc;
      }, {}),
    }),
    [cTraderPositionsMapped, alorPositions],
  );

  const SwapMap = useMemo(
    () => ({
      ...cTraderPositionsMapped.reduce((acc, curr) => {
        acc[curr.tradeData.symbolId] = normalizePrice(parseInt(curr.swap, 10), curr.moneyDigits) || 0;
        return acc;
      }, {}),
    }),
    [cTraderPositionsMapped, alorPositions],
  );

  const PnLMap = useMemo(
    () => ({
      ...(tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr.expectedYield;
        return acc;
      }, {}),
      ...cTraderPositionsMapped.reduce((acc, curr) => {
        acc[curr.tradeData.symbolId] =
          ((curr.PnL || 0) + normalizePrice(parseInt(curr.swap || 0, 10), cTraderPositionPnL?.moneyDigits || 1)) * USDRate;
        return acc;
      }, {}),
      ...alorPositions.reduce((acc, curr) => {
        acc[curr.symbol] = curr.unrealisedPl || 0;
        return acc;
      }, {}),
    }),
    [tinkoffPortfolio?.positions, cTraderPositionsMapped, alorPositions, cTraderPositionPnL?.moneyDigits, USDRate],
  );

  const volumeMap = useMemo(
    () => ({
      ...alorPositions.reduce((acc, curr) => {
        acc[curr.symbol] = Math.abs(curr.currentVolume) || 0;
        return acc;
      }, {}),
    }),
    [tinkoffPortfolio?.positions, cTraderPositionsMapped, alorPositions, cTraderPositionPnL?.moneyDigits, USDRate],
  );

  const total = totalPnLForex * USDRate + totalAlorPnL;

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
      <TableCell>{cTraderSummary?.brokerName?.toUpperCase() || 'XPBEE'}</TableCell>
      <TableCell>{invoice.volume / (map.get(invoice.tradeData.symbolId)?.symbolName?.endsWith('CNH_xp') ? 10000000 : 10000)}</TableCell>
      <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>
      <TableCell>{invoice.avgPrice?.toFixed(2)}</TableCell>
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
      <TableCell>{moneyFormat(invoice.currentVolume, 'RUB', 0, 2)}</TableCell>
      <TableCell>{invoice.avgPrice?.toFixed(2)}</TableCell>
      <TableCell>-</TableCell>
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

  const totalCrypto = bingBalance + bybitBalance + gateBalance + bitgetBalance + mexcBalance + okxBalance;

  const arbBalance = useMemo(() => {
    const usdtBalance = ctraderBalance;
    const rubBalance = alorSummary?.portfolioLiquidationValue || 0;

    return usdtBalance * USDRate + rubBalance;
  }, [ctraderBalance, alorSummary?.portfolioLiquidationValue, USDRate]);

  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="grid grid-cols-12 gap-2 pb-2">
        <Card>
          <CardHeader>
            <CardDescription className="flex gap-2 items-center">
              {/*<img className="h-4 rounded-full" src={exchangeImgMap['BINGX']} />*/}
              Арбитраж
            </CardDescription>
            <CardTitle
              className={cn(
                'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                arbBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
              )}
            >
              {moneyFormat(arbBalance, 'RUB')}
            </CardTitle>
          </CardHeader>
        </Card>
        {localStorage.getItem('tiToken') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/tcs2x160.png")` }}></div>
                Тинькофф
              </CardDescription>
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
        )}
        <CTraderCard ctraderBalance={ctraderBalance} />
        <Card>
          <CardHeader>
            <CardDescription>Алор</CardDescription>
            <CardTitle
              className={cn(
                'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                alorSummary?.portfolioLiquidationValue > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
              )}
            >
              {moneyFormat(alorSummary?.portfolioLiquidationValue || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>P&L Алор</CardDescription>
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
        <Card>
          <CardHeader>
            <CardDescription>P&L {cTraderSummary?.brokerName?.toUpperCase() || 'XPBEE'}</CardDescription>
            <CardTitle
              className={cn(
                'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                totalPnLForex > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
              )}
            >
              {moneyFormatCompact(totalPnLForex, 'USDT', 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Общий P&L</CardDescription>
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
      </div>
      <div className="grid grid-cols-12 gap-2">
        <Card>
          <CardHeader>
            <CardDescription className="flex gap-2 items-center">
              {/*<img className="h-4 rounded-full" src={exchangeImgMap['BINGX']} />*/}
              Криптобиржи
            </CardDescription>
            <CardTitle
              className={cn(
                'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                totalCrypto > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
              )}
            >
              {moneyFormatCompact(totalCrypto, 'USDT', 2)}
            </CardTitle>
          </CardHeader>
        </Card>
        {localStorage.getItem('bingxApiKey') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['BINGX']} />
                Bingx
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  bingBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(bingBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        {localStorage.getItem('bybitApiKey') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['BYBIT']} />
                Bybit
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  bybitBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(bybitBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        {localStorage.getItem('mexcUid') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['MEXC']} />
                MEXC
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  mexcBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(mexcBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        {localStorage.getItem('bitgetApiKey') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['BITGET']} />
                Bitget
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  bitgetBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(bitgetBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        {localStorage.getItem('gateApiKey') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['GATEIO']} />
                Gate
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  gateBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(gateBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
        {localStorage.getItem('okxApiKey') && (
          <Card>
            <CardHeader>
              <CardDescription className="flex gap-2 items-center">
                <img className="h-4 rounded-full" src={exchangeImgMap['OKX']} />
                OKX
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums text-nowrap @[250px]/card:text-3xl',
                  okxBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormatCompact(okxBalance, 'USDT', 2)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
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
              <TableHead className="text-right">Цена входа</TableHead>
              <TableHead className="text-right">Чистая прибыль RUB</TableHead>
              <TableHead className="text-right">Ожидаемая прибыль RUB</TableHead>
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
                <TableCell className="text-right">{(PairPrice(invoice) * 100)?.toFixed(2)}</TableCell>
                <TableCell
                  className={
                    PairPnl(invoice) + PairSwap(invoice) * USDRate > 0
                      ? 'text-right profitCell'
                      : PairPnl(invoice) + PairSwap(invoice) * USDRate < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(PairPnl(invoice) + PairSwap(invoice) * USDRate)}
                </TableCell>
                <TableCell className={'text-right profitCell'}>
                  {!PairMoexAvgVolume(invoice) ? 0 : moneyFormat(PairMoexAvgVolume(invoice) * Math.abs(PairPrice(invoice) - 1))}
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
              <TableCell colSpan={5} className="text-center">
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
        <div className="col-span-2">
          <div className="flex gap-2">
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Не выбрано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="yesterday">Вчера</SelectItem>
                <SelectItem value="week">Текущая неделя</SelectItem>
                <SelectItem value="month">Текущий месяц</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger>
                <Button variant="outline" className="justify-between font-normal">
                  {dateRange ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 'Select date'}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={dateRange}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setDateRange(date);
                    setOpen(false);
                  }}
                  className="rounded-lg border shadow-sm"
                />
              </PopoverContent>
            </Popover>
          </div>
          <Table wrapperClassName="pt-2">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] text-left" colSpan={11}>
                  Ctrader История позиций
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableHeader className="bg-[rgb(36,52,66)]">
              <TableRow>
                <TableHead className="w-[100px]">Инструмент</TableHead>
                <TableHead className="w-[100px]">Направление</TableHead>
                <TableHead className="w-[100px]">Время закрытия</TableHead>
                <TableHead className="w-[200px]">Цена входа</TableHead>
                <TableHead className="w-[200px]">Цена закрытия</TableHead>
                <TableHead className="w-[200px]">Лоты</TableHead>
                <TableHead className="w-[100px] text-right">Свопы</TableHead>
                <TableHead className="text-right">Валовая прибыль</TableHead>
                <TableHead className="text-right">Чистая прибыль</TableHead>
                <TableHead className="text-right">Чистая прибыль RUB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closesPositions.map((invoice, index) => (
                <TableRow key={invoice.invoice} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                  <TableCell>
                    <ForexLabel ticker={map.get(invoice.symbolId)?.symbolName} />
                  </TableCell>
                  <TableCell>{invoice.tradeSide === 1 ? 'Продажа' : 'Покупка'}</TableCell>
                  <TableCell>{dayjs(invoice.createTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>
                  {/*<TableCell>{dayjs(invoice.utcLastUpdateTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>*/}
                  <TableCell>{moneyFormat(invoice.closePositionDetail.entryPrice, 'USDT', 0, 2)}</TableCell>
                  <TableCell>{moneyFormat(invoice.executionPrice, 'USDT', 0, 2)}</TableCell>
                  <TableCell>
                    {numberFormat(invoice.volume / (map.get(invoice.symbolId)?.symbolName?.endsWith('CNH_xp') ? 10000000 : 10000), 2, 2)}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.closePositionDetail.swap > 0
                        ? 'text-right profitCell'
                        : invoice.closePositionDetail.swap < 0
                          ? 'text-right lossCell'
                          : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.closePositionDetail.swap / 10 ** invoice.closePositionDetail.moneyDigits, 'USDT', 0, 2)}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.closePositionDetail.grossProfit > 0
                        ? 'text-right profitCell'
                        : invoice.closePositionDetail.grossProfit < 0
                          ? 'text-right lossCell'
                          : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.closePositionDetail.grossProfit / 10 ** invoice.closePositionDetail.moneyDigits, 'USDT', 0, 2)}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap > 0
                        ? 'text-right profitCell'
                        : invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap < 0
                          ? 'text-right lossCell'
                          : 'text-right'
                    }
                  >
                    {moneyFormat(
                      (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) /
                        10 ** invoice.closePositionDetail.moneyDigits,
                      'USDT',
                      0,
                      2,
                    )}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap > 0
                        ? 'text-right profitCell'
                        : invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap < 0
                          ? 'text-right lossCell'
                          : 'text-right'
                    }
                  >
                    {moneyFormat(
                      (USDRate * (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap)) /
                        10 ** invoice.closePositionDetail.moneyDigits,
                      'RUB',
                      0,
                      2,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={10}
                  className={ctraderDealsTotal > 0 ? 'text-right profitCell' : ctraderDealsTotal < 0 ? 'text-right lossCell' : 'text-right'}
                >
                  Реализовано: {moneyFormat(ctraderDealsTotal, 'USDT', 0, 2)} ({moneyFormat(USDRate * ctraderDealsTotal, 'RUB')})
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <div>
          PnL по инструментам
          <div className="grid grid-cols-3 gap-2 flex-wrap">
            {Object.entries(symbolPositionsMap).map(([symbolId, value]) => (
              <Card>
                <CardHeader>
                  <CardDescription>
                    <ForexLabel ticker={map.get(Number(symbolId))?.symbolName} />
                  </CardDescription>
                  <CardTitle
                    className={cn(
                      value > 0 ? 'profitCell' : value < 0 ? 'lossCell' : '',
                      'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                    )}
                  >
                    {moneyFormat(value, 'USDT', 0, 2)}
                  </CardTitle>
                  <CardAction>
                    {/*<Badge variant="outline">*/}
                    {/*  <IconTrendingUp />*/}
                    {/*  +12.5%*/}
                    {/*</Badge>*/}
                  </CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <Table wrapperClassName="pt-2">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] text-left" colSpan={11}>
                  Ctrader История позиций
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableHeader className="bg-[rgb(36,52,66)]">
              <TableRow>
                <TableHead className="w-[100px]">Время</TableHead>
                <TableHead className="w-[100px]">Тип</TableHead>
                <TableHead className="w-[100px]">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ctraderCashflow
                // .sort((a, b) => b.changeBalanceTimestamp - a.changeBalanceTimestamp)
                .map((invoice, index) => (
                  <TableRow key={invoice.balanceHistoryId} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                    <TableCell>{dayjs(invoice.changeBalanceTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>
                    <TableCell>{invoice.operationType === 0 ? 'Пополнение счета' : 'Снятие со счета'}</TableCell>
                    <TableCell className={invoice.operationType === 0 ? 'profitCell' : 'lossCell'}>
                      {invoice.delta / 10 ** invoice.moneyDigits}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={10}
                  className={ctraderDealsTotal > 0 ? 'text-right profitCell' : ctraderDealsTotal < 0 ? 'text-right lossCell' : 'text-right'}
                >
                  Пополнений:{' '}
                  {moneyFormat(
                    ctraderCashflow
                      .filter((invoice) => !invoice.operationType)
                      .reduce((acc, curr) => acc + curr.delta / 10 ** curr.moneyDigits, 0),
                    'USDT',
                    0,
                    2,
                  )}{' '}
                  Снятий:{' '}
                  {moneyFormat(
                    ctraderCashflow
                      .filter((invoice) => invoice.operationType)
                      .reduce((acc, curr) => acc + curr.delta / 10 ** curr.moneyDigits, 0),
                    'USDT',
                    0,
                    2,
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {/*<div className="col-span-3">*/}
        {/*  <ArbitrageCalculator />*/}
        {/*</div>*/}
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
