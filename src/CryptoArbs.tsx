import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils.ts';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exchangeImgMap } from './utils.ts';
import dayjs from 'dayjs';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card.tsx';
import { TypographyH4 } from './components/ui/typography.tsx';
import { StatArbPage } from './ArbitrageMOEXPage/strategies/StatArbPage.tsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip.tsx';
import { ArrowDown, ArrowUp, TrendingUp, Copy, ExternalLink } from 'lucide-react';
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

// Функция для генерации URL биржи с тикером (фьючерсы) с реферальными кодами
const getExchangeUrl = (exchange: string, ticker: string): string => {
  const exchangeUpper = exchange.toUpperCase();
  
  switch (exchangeUpper) {
    case 'GATEIO':
    case 'GATE':
      return `https://www.gate.com/ru/futures/USDT/${ticker}_USDT?ref=BFQWBFs`;
    case 'BYBIT':
      return `https://www.bybit.com/trade/usdt/${ticker}USDT?ref=1WG1366`;
    case 'BINGX':
      return `https://bingx.com/ru-ru/perpetual/${ticker}-USDT?ref=QWIF2Z`;
    case 'MEXC':
      return `https://www.mexc.com/ru-RU/futures/${ticker}_USDT?type=linear_swap&shareCode=mexc-2Yy26`;
    case 'OKX':
      return `https://www.okx.com/ru/trade-swap/${ticker.toLowerCase()}-usdt-swap?channelid=37578249`;
    case 'BITGET':
      return `https://www.bitget.com/futures/usdt/${ticker}USDT`;
    case 'KUCOIN':
      return `https://www.kucoin.com/trade/futures/${ticker}USDTM?ref=CX8XF1EA`;
    case 'BINANCE':
      return `https://www.binance.com/en/futures/${ticker}USDT?ref=13375376`;
    case 'OURBIT':
      return `https://futures.ourbit.com/ru-RU/exchange/${ticker}_USDT?inviteCode=U587UV`;
    default:
      return '#';
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
        acc[key] = {
          rate: Number(funding.fundingRate),
          nextFundingTime: funding.fundingNextTime || null,
        };

        return acc;
      }, {});
  }, [tickers]);

  const sumFunding = (a) => {
    const leftFunding = fundingMap[`${a.ticker}_${a.left.exchange}`];
    const rightFunding = fundingMap[`${a.ticker}_${a.right.exchange}`];

    if (!rightFunding || !leftFunding) {
      return -Infinity;
    }

    return a.ratio > 1 ? leftFunding.rate - rightFunding.rate : rightFunding.rate - leftFunding.rate;
  };

  // Функция для форматирования времени фандинга
  const formatFundingTime = (timeString: string | null | undefined): string => {
    if (!timeString) return 'N/A';
    try {
      // Время приходит в формате "HH:mm" (например, "20:00", "00:00")
      // Фандинг происходит каждые 8 часов: 00:00, 08:00, 16:00
      const [hours, minutes] = timeString.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        return timeString;
      }
      
      const now = dayjs();
      
      // Создаем дату с этим временем на сегодня
      const todayFundingTime = dayjs().set('hour', hours).set('minute', minutes).set('second', 0).set('millisecond', 0);
      
      // Вычисляем разницу для сегодняшнего времени
      let diffMinutesToday = todayFundingTime.diff(now, 'minute', true);
      
      let fundingTime = todayFundingTime;
      
      // Если время уже прошло сегодня, проверяем ближайшее время фандинга
      if (diffMinutesToday < 0) {
        // Проверяем следующее время фандинга (через 8 часов)
        const nextFundingTime = todayFundingTime.add(8, 'hour');
        const diffNext = nextFundingTime.diff(now, 'minute', true);
        
        // Если следующее время фандинга сегодня ближе, чем завтрашнее, используем его
        if (diffNext > 0 && diffNext < 480) { // 480 минут = 8 часов
          fundingTime = nextFundingTime;
          diffMinutesToday = diffNext;
        } else {
          // Иначе берем завтрашнее время
          fundingTime = todayFundingTime.add(1, 'day');
          diffMinutesToday = fundingTime.diff(now, 'minute', true);
        }
      }
      
      // Если разница очень маленькая (менее 1 минуты), показываем "сейчас"
      if (diffMinutesToday >= 0 && diffMinutesToday < 1) {
        return 'сейчас';
      }
      
      // Если разница отрицательная или очень большая (больше суток), показываем просто время
      if (diffMinutesToday < 0 || diffMinutesToday > 1440) {
        return timeString;
      }
      
      if (diffMinutesToday < 60) {
        const roundedMinutes = Math.max(0, Math.round(diffMinutesToday));
        return `через ${roundedMinutes}м`;
      }
      const diffHours = fundingTime.diff(now, 'hour', true);
      if (diffHours < 24) {
        const roundedHours = Math.max(0, Math.round(diffHours));
        return `через ${roundedHours}ч`;
      }
      return timeString;
    } catch (e) {
      return timeString || 'N/A';
    }
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
      const sellFundingData = fundingMap[`${a.ticker}_${sellExchange.exchange}`];
      const buyFundingData = fundingMap[`${a.ticker}_${buyExchange.exchange}`];
      const isSelected = selectedArb?.ticker === a.ticker &&
        selectedArb?.left.exchange === a.left.exchange &&
        selectedArb?.right.exchange === a.right.exchange;

      return {
        ...a,
        spread,
        funding,
        sellExchange,
        buyExchange,
        sellFunding: sellFundingData?.rate,
        sellFundingTime: sellFundingData?.nextFundingTime,
        buyFunding: buyFundingData?.rate,
        buyFundingTime: buyFundingData?.nextFundingTime,
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

  // Обогащаем выбранный арбитраж для отображения (даже если его нет в списке)
  const selectedEnriched = useMemo(() => {
    if (!selectedArb) return null;
    
    // Сначала пытаемся найти в enrichedArbs
    const found = enrichedArbs.find(
      (a) => a.ticker === selectedArb.ticker &&
        a.left.exchange === selectedArb.left.exchange &&
        a.right.exchange === selectedArb.right.exchange
    );
    
    if (found) {
      return found;
    }
    
    // Если не найден (например, список пуст), формируем из selectedArb
    const spread = (selectedArb.ratio - 1) * 100;
    const funding = sumFunding(selectedArb) * 100;
    const sellExchange = selectedArb.right.last > selectedArb.left.last ? selectedArb.right : selectedArb.left;
    const buyExchange = selectedArb.right.last < selectedArb.left.last ? selectedArb.right : selectedArb.left;
    const sellFundingData = fundingMap[`${selectedArb.ticker}_${sellExchange.exchange}`];
    const buyFundingData = fundingMap[`${selectedArb.ticker}_${buyExchange.exchange}`];
    
    return {
      ...selectedArb,
      spread,
      funding,
      sellExchange,
      buyExchange,
      sellFunding: sellFundingData?.rate,
      sellFundingTime: sellFundingData?.nextFundingTime,
      buyFunding: buyFundingData?.rate,
      buyFundingTime: buyFundingData?.nextFundingTime,
      isSelected: true,
    };
  }, [selectedArb, enrichedArbs, fundingMap]);

        return (
          <div className="flex gap-4 h-[calc(100vh-76px)]">
            {/* Левая колонка: список карточек (фиксированная ширина) */}
            <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden">
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
              <div className="flex-1 overflow-y-auto px-1 pt-1">
                {enrichedArbs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="text-sm">Арбитражные возможности не найдены</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pb-1">
                    {enrichedArbs.map((a, index) => {
                    return (
            <Card
              key={`${a.ticker}_${a.left.exchange}_${a.right.exchange}_${index}`}
              className={cn(
                          'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-2 w-full',
                          a.isSelected
                            ? 'ring-2 ring-primary shadow-lg border-primary'
                            : 'border-muted-foreground/20',
                        )}
                        onClick={() => handleArbSelect(a)}
                      >
                        <CardHeader className="pb-2 pt-2 px-3">
                          {/* Заголовок с тикером и общим фандингом */}
                          <div className="flex items-center justify-between mb-1.5">
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
                          <div className="grid grid-cols-2 gap-2 mb-1.5">
                            {/* Продаем */}
                            <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={getExchangeUrl(a.sellExchange.exchange, a.ticker)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Перейти на {a.sellExchange.exchange}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="text-base font-bold tabular-nums">
                                {a.sellExchange.last.toFixed(6)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Фандинг: <span className="font-mono">{a.sellFunding?.toFixed(5) ?? 'N/A'}</span>
                        </div>
                              <div className="text-xs text-muted-foreground">
                                Время: {formatFundingTime(a.sellFundingTime)}
                      </div>
                        </div>

                            {/* Покупаем */}
                            <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={getExchangeUrl(a.buyExchange.exchange, a.ticker)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Перейти на {a.buyExchange.exchange}</p>
                                  </TooltipContent>
                                </Tooltip>
                  </div>
                              <div className="text-base font-bold tabular-nums">
                                {a.buyExchange.last.toFixed(6)}
                        </div>
                              <div className="text-xs text-muted-foreground">
                                Фандинг: <span className="font-mono">{a.buyFunding?.toFixed(5) ?? 'N/A'}</span>
                      </div>
                              <div className="text-xs text-muted-foreground">
                                Время: {formatFundingTime(a.buyFundingTime)}
                        </div>
                      </div>
                  </div>

                          {/* Спред */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-muted-foreground/20">
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
                )}
        </div>
      </div>

            {/* Правая колонка: график спреда (3/4 ширины) */}
            <div className="flex-[3] flex flex-col min-h-0">
        {selectedEnriched ? (
          <>
            <div className="mb-2">
                {/* Информация о выбранной паре в компактном горизонтальном формате */}
                <div 
                  className="bg-card rounded-lg px-3 py-1.5 selected-arb-header"
                  style={{ 
                    border: '1px solid rgba(166, 189, 213, 0.2)'
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Тикер */}
                    <span className="text-lg font-bold">{selectedEnriched.ticker}</span>
                    
                    {/* Разделитель */}
                    <div className="h-4 w-px bg-muted-foreground/30" />
                    
                    {/* Фандинг и спред */}
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm font-semibold text-green-500 tabular-nums">
                        {selectedEnriched.funding.toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Спред</span>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        selectedEnriched.spread > 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {selectedEnriched.spread > 0 ? '+' : ''}{selectedEnriched.spread.toFixed(2)}%
                      </span>
                    </div>
                    
                    {/* Разделитель */}
                    <div className="h-4 w-px bg-muted-foreground/30" />
                    
                    {/* Продаем */}
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                      <img 
                        className="h-3.5 w-3.5 rounded-full" 
                        src={exchangeImgMap[selectedEnriched.sellExchange.exchange]} 
                        alt={selectedEnriched.sellExchange.exchange}
                      />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {selectedEnriched.sellExchange.exchange}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getExchangeUrl(selectedEnriched.sellExchange.exchange, selectedEnriched.ticker)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Перейти на {selectedEnriched.sellExchange.exchange}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-sm font-bold tabular-nums">
                        {selectedEnriched.sellExchange.last.toFixed(6)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ф: {selectedEnriched.sellFunding?.toFixed(5) ?? 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFundingTime(selectedEnriched.sellFundingTime)}
                      </span>
                    </div>

                    {/* Разделитель */}
                    <div className="h-4 w-px bg-muted-foreground/30" />
                    
                    {/* Покупаем */}
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-3.5 w-3.5 text-green-400" />
                      <img 
                        className="h-3.5 w-3.5 rounded-full" 
                        src={exchangeImgMap[selectedEnriched.buyExchange.exchange]} 
                        alt={selectedEnriched.buyExchange.exchange}
                      />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {selectedEnriched.buyExchange.exchange}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getExchangeUrl(selectedEnriched.buyExchange.exchange, selectedEnriched.ticker)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Перейти на {selectedEnriched.buyExchange.exchange}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-sm font-bold tabular-nums">
                        {selectedEnriched.buyExchange.last.toFixed(6)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ф: {selectedEnriched.buyFunding?.toFixed(5) ?? 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFundingTime(selectedEnriched.buyFundingTime)}
                      </span>
                    </div>
                  </div>
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
