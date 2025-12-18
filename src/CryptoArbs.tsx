import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils.ts';
import React, { useMemo, useState } from 'react';
import { exchangeImgMap } from './utils.ts';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card.tsx';
import { TypographyH4 } from './components/ui/typography.tsx';
import { StatArbPage } from './ArbitrageMOEXPage/strategies/StatArbPage.tsx';

interface ArbPair {
  ticker: string;
  left: { exchange: string; last: number };
  right: { exchange: string; last: number };
  ratio: number;
}

// Функция для добавления правильного суффикса к тикеру в зависимости от биржи
const getTickerWithSuffix = (exchange: string, ticker: string): string => {
  const exchangeUpper = exchange.toUpperCase();
  
  // Определяем суффикс в зависимости от биржи
  switch (exchangeUpper) {
    case 'MEXC':
      return `${ticker}_USDT`;
    case 'BYBIT':
    case 'BINANCE':
    case 'BITGET':
      return `${ticker}USDT`;
    case 'OKX':
      return `${ticker}-USDT-SWAP`;
    case 'BINGX':
      return `${ticker}-USDT`;
    case 'GATE':
    case 'GATEIO':
      return `${ticker}_USDT`;
    case 'KUCOIN':
      return `${ticker}USDTM`;
    case 'OURBIT':
      return `${ticker}_USDT`;
    default:
      // По умолчанию используем формат MEXC
      return `${ticker}_USDT`;
  }
};

export const CryptoArbs = () => {
  const [selectedArb, setSelectedArb] = useState<ArbPair | null>(null);
  const { data: tickersMap = {} } = useGetPumpTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const tickers = Object.entries(tickersMap);

  const fundingMap = useMemo(() => {
    return tickers
      .map(([ticker, invoice], index) => invoice.funding.map((a) => ({ ...a, ticker })))
      .flat()
      .reduce((acc, funding) => {
        const key = `${funding.ticker}_${funding.exchange}`;
        acc[key] = Number(funding.fundingRate);

        return acc;
      }, {});
  }, [tickers]);

  const sumFunding = (a) => {
    const leftFunding = fundingMap[`${a.ticker}_${a.left.exchange}`];
    const rightFunding = fundingMap[`${a.ticker}_${a.right.exchange}`];

    if (!rightFunding || !leftFunding) {
      return -Infinity;
    }

    return a.ratio > 1 ? leftFunding - rightFunding : rightFunding - leftFunding;
  };

  const filteredArbs = useMemo(() => {
    return tickers
      .map(([ticker, invoice], index) => invoice.arbs.map((a) => ({ ...a, ticker })))
      .flat()
      .filter((b) => Math.abs(b.ratio - 1) * 100 > 1 && sumFunding(b) * 100 > 0.3)
      .sort((a, b) => {
        const aPart = sumFunding(a);
        const bPart = sumFunding(b);
        return bPart - aPart;
      });
  }, [tickers, fundingMap]);

  // Формируем тикеры с префиксами бирж и правильными суффиксами для графика спреда
  const getSpreadTickers = useMemo(() => {
    if (!selectedArb) return { tickerStock: '', _tickerFuture: '' };
    
    // Формируем тикеры в формате EXCHANGE:TICKER_WITH_SUFFIX
    const leftTicker = `${selectedArb.left.exchange}:${getTickerWithSuffix(selectedArb.left.exchange, selectedArb.ticker)}`;
    const rightTicker = `${selectedArb.right.exchange}:${getTickerWithSuffix(selectedArb.right.exchange, selectedArb.ticker)}`;
    
    return {
      tickerStock: leftTicker,
      _tickerFuture: rightTicker,
    };
  }, [selectedArb]);

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Левая колонка: список карточек */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {filteredArbs.map((a, index) => (
            <Card
              key={`${a.ticker}_${a.left.exchange}_${a.right.exchange}_${index}`}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                selectedArb?.ticker === a.ticker &&
                  selectedArb?.left.exchange === a.left.exchange &&
                  selectedArb?.right.exchange === a.right.exchange
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : '',
              )}
              onClick={() => setSelectedArb(a)}
            >
              <CardHeader>
                <CardTitle className={cn('text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-nowrap')}>
                  {a.ticker}, фандинг {(sumFunding(a) * 100).toFixed(4)}%
                </CardTitle>
                <CardDescription className="flex gap-2">
                  <div className="flex flex-col">
                    <TypographyH4>Продаем</TypographyH4>
                    {a.right.last > a.left.last && (
                      <div>
                        <div className="flex">
                          <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />
                          {a.right.exchange}: {a.right.last}
                        </div>
                        <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.right.exchange}`]?.toFixed(5)}</div>
                      </div>
                    )}
                    {a.right.last < a.left.last && (
                      <div>
                        <div className="flex">
                          <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />
                          {a.left.exchange}: {a.left.last}
                        </div>
                        <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.left.exchange}`]?.toFixed(5)}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <TypographyH4>Покупаем</TypographyH4>
                    {a.right.last < a.left.last && (
                      <div>
                        <div className="flex">
                          <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />
                          {a.right.exchange}: {a.right.last}
                        </div>
                        <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.right.exchange}`]?.toFixed(5)}</div>
                      </div>
                    )}
                    {a.right.last > a.left.last && (
                      <div>
                        <div className="flex">
                          <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />
                          {a.left.exchange}: {a.left.last}
                        </div>
                        <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.left.exchange}`]?.toFixed(5)}</div>
                      </div>
                    )}
                  </div>
                </CardDescription>
                <div className="mt-2 text-sm text-muted-foreground">
                  Спред: {((a.ratio - 1) * 100).toFixed(2)}%
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Правая колонка: график спреда */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedArb ? (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">
                График спреда: {selectedArb.ticker}
              </h2>
              <div className="text-sm text-muted-foreground">
                {selectedArb.left.exchange} / {selectedArb.right.exchange} | Ratio: {selectedArb.ratio.toFixed(6)}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <StatArbPage
                tickerStock={getSpreadTickers.tickerStock}
                _tickerFuture={getSpreadTickers._tickerFuture}
                onlyChart
                height="100%"
                multi={1}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Выберите пару арбитража для отображения графика спреда
          </div>
        )}
      </div>
    </div>
  );
};
