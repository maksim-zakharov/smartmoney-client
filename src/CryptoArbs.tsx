import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils.ts';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exchangeImgMap } from './utils.ts';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card.tsx';
import { TypographyH4 } from './components/ui/typography.tsx';
import { StatArbPage } from './ArbitrageMOEXPage/strategies/StatArbPage.tsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip.tsx';
import { ArrowDown, ArrowUp, TrendingUp, Copy } from 'lucide-react';
import { toast } from 'sonner';

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

enum SortType {
  Funding = 'funding',
  Spread = 'spread',
}

export const CryptoArbs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortType = (searchParams.get('sort') as SortType) || SortType.Funding;
  const selectedPairKey = searchParams.get('pair');

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
    const arbs = tickers
      .map(([ticker, invoice], index) => invoice.arbs.map((a) => ({ ...a, ticker })))
      .flat()
      .filter((b) => Math.abs(b.ratio - 1) * 100 > 1 && sumFunding(b) * 100 > 0.3);

    // Сортировка в зависимости от выбранного типа
    if (sortType === SortType.Spread) {
      return arbs.sort((a, b) => {
        const aSpread = Math.abs(a.ratio - 1) * 100;
        const bSpread = Math.abs(b.ratio - 1) * 100;
        return bSpread - aSpread;
      });
    } else {
      // Сортировка по фандингу (по умолчанию)
      return arbs.sort((a, b) => {
        const aPart = sumFunding(a);
        const bPart = sumFunding(b);
        return bPart - aPart;
      });
    }
  }, [tickers, fundingMap, sortType]);

  // Восстанавливаем выбранную пару из query параметров при загрузке
  useEffect(() => {
    if (selectedPairKey && filteredArbs.length > 0) {
      // Поддерживаем оба формата для обратной совместимости
      const separator = selectedPairKey.includes('|') ? '|' : '_';
      const parts = selectedPairKey.split(separator);
      
      if (parts.length >= 3) {
        const ticker = parts[0];
        const leftExchange = parts[1];
        // Для формата с подчеркиванием берем все остальное, для формата с | - только третий элемент
        const rightExchange = separator === '|' ? parts[2] : parts.slice(2).join('_');
        
        const foundArb = filteredArbs.find(
          (a) => a.ticker === ticker && a.left.exchange === leftExchange && a.right.exchange === rightExchange,
        );
        if (foundArb) {
          // Обновляем только если пара отличается от текущей выбранной
          setSelectedArb((current) => {
            if (!current || 
              current.ticker !== foundArb.ticker || 
              current.left.exchange !== foundArb.left.exchange || 
              current.right.exchange !== foundArb.right.exchange) {
              return foundArb;
            }
            return current;
          });
        }
      }
    }
  }, [selectedPairKey, filteredArbs]);

  // Обработчик изменения типа сортировки
  const handleSortChange = (value: string) => {
    searchParams.set('sort', value);
    setSearchParams(searchParams);
  };

  // Обработчик выбора пары
  const handleArbSelect = (arb: ArbPair) => {
    setSelectedArb(arb);
    // Используем формат: ticker|leftExchange|rightExchange для избежания конфликтов с подчеркиваниями
    const pairKey = `${arb.ticker}|${arb.left.exchange}|${arb.right.exchange}`;
    searchParams.set('pair', pairKey);
    setSearchParams(searchParams);
  };

  // Обогащаем данные арбитражей для отображения
  const enrichedArbs = useMemo(() => {
    return filteredArbs.map((a) => {
      const spread = (a.ratio - 1) * 100;
      const funding = sumFunding(a) * 100;
      const sellExchange = a.right.last > a.left.last ? a.right : a.left;
      const buyExchange = a.right.last < a.left.last ? a.right : a.left;
      const sellFunding = fundingMap[`${a.ticker}_${sellExchange.exchange}`];
      const buyFunding = fundingMap[`${a.ticker}_${buyExchange.exchange}`];
      const isSelected = selectedArb?.ticker === a.ticker &&
        selectedArb?.left.exchange === a.left.exchange &&
        selectedArb?.right.exchange === a.right.exchange;

      return {
        ...a,
        spread,
        funding,
        sellExchange,
        buyExchange,
        sellFunding,
        buyFunding,
        isSelected,
      };
    });
  }, [filteredArbs, fundingMap, selectedArb]);

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
            {/* Левая колонка: список карточек (фиксированная ширина) */}
            <div className="w-[320px] flex flex-col overflow-hidden">
              {/* Табы для сортировки */}
              <div className="mb-4">
                <Tabs value={sortType} onValueChange={handleSortChange}>
                  <TabsList className="w-full">
                    <TabsTrigger value={SortType.Funding} className="flex-1">
                      По фандингу
                    </TabsTrigger>
                    <TabsTrigger value={SortType.Spread} className="flex-1">
                      По спреду
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {/* Список карточек */}
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {enrichedArbs.map((a, index) => {
                    return (
                      <Card
                        key={`${a.ticker}_${a.left.exchange}_${a.right.exchange}_${index}`}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-3 w-full',
                          a.isSelected
                            ? 'ring-2 ring-primary shadow-lg border-primary'
                            : 'border-border',
                        )}
                        onClick={() => handleArbSelect(a)}
                      >
                        <CardHeader className="pb-2 pt-2 px-3">
                          {/* Заголовок с тикером и общим фандингом */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl font-bold tabular-nums">
                                {a.ticker}
                              </CardTitle>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Copy 
                                    className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(a.ticker).then(() => {
                                        toast.success(`Тикер ${a.ticker} скопирован`);
                                      }).catch(() => {
                                        toast.error('Не удалось скопировать тикер');
                                      });
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Копировать</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-semibold text-green-500 tabular-nums">
                                {a.funding.toFixed(4)}%
                              </span>
                            </div>
                          </div>

                          {/* Основная информация: Продаем и Покупаем */}
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            {/* Продаем */}
                            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                              <div className="flex items-center gap-1.5 mb-1">
                                <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-xs font-medium text-red-400">Продаем</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <img 
                                  className="h-4 w-4 rounded-full" 
                                  src={exchangeImgMap[a.sellExchange.exchange]} 
                                  alt={a.sellExchange.exchange}
                                />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {a.sellExchange.exchange}
                                </span>
                              </div>
                              <div className="text-base font-bold tabular-nums">
                                {a.sellExchange.last.toFixed(6)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Фандинг: <span className="font-mono">{a.sellFunding?.toFixed(5) ?? 'N/A'}</span>
                              </div>
                            </div>

                            {/* Покупаем */}
                            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                              <div className="flex items-center gap-1.5 mb-1">
                                <ArrowUp className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-xs font-medium text-green-400">Покупаем</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <img 
                                  className="h-4 w-4 rounded-full" 
                                  src={exchangeImgMap[a.buyExchange.exchange]} 
                                  alt={a.buyExchange.exchange}
                                />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {a.buyExchange.exchange}
                                </span>
                              </div>
                              <div className="text-base font-bold tabular-nums">
                                {a.buyExchange.last.toFixed(6)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Фандинг: <span className="font-mono">{a.buyFunding?.toFixed(5) ?? 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Спред */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-semibold">Спред</span>
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              a.spread > 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {a.spread > 0 ? '+' : ''}{a.spread.toFixed(2)}%
                            </span>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Правая колонка: график спреда (3/4 ширины) */}
            <div className="flex-[3] flex flex-col min-h-0">
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
