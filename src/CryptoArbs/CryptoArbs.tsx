import { useGetPumpTickersQuery } from '../api/pump-api';
import { cn } from '../lib/utils';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exchangeImgMap, getTradingViewSpreadUrl } from '../utils';
import { getTickerWithSuffix, getExchangeUrl } from '../api/utils/tickers';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { StatArbPage } from '../ArbitrageMOEXPage/strategies/StatArbPage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Copy, ExternalLink, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { OrderbookView } from '../components/OrderbookView';
import { TradingService } from '../api/trading.service';
import { TradingPanelWidget } from './widgets/TradingPanelWidget';
import { SelectedArbWidget } from './widgets/SelectedArbWidget';
import { PositionsWidget } from './widgets/PositionsWidget';
import { BalanceWidget } from './widgets/BalanceWidget';
import { ArbCard } from './components/ArbCard';
import { FairArbCard } from './components/FairArbCard';
import { SettingsDialog } from './components/SettingsDialog';
import { FavoriteTabs } from './components/FavoriteTabs';
import { FairArbHeader } from './components/FairArbHeader';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowAll, setEnabledExchanges, addExcludedTicker } from './cryptoArbsSettings.slice';

interface ArbPair {
  ticker: string;
  left: { exchange: string; last: number };
  right: { exchange: string; last: number };
  ratio: number;
}

// Биржи с поддержкой графиков справедливой цены
const EXCHANGES_WITH_FAIR_PRICE = [
  'MEXC',
  'OURBIT',
  'KCEX',
  'BITUNIX',
  'BITMART',
  'ASTER',
  'BINANCE',
  'GATEIO',
  'BINGX',
  'BITGET',
  'BYBIT',
  'HOTCOIN',
  'COINEX',
];

enum SortType {
  Funding = 'funding',
  Spread = 'spread',
}

interface FairRatio {
  ticker: string;
  last: number;
  fair: number;
  exchange: string;
  ratio: number;
}

export const CryptoArbs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortType = (searchParams.get('sort') as SortType) || SortType.Funding;
  const selectedPairKey = searchParams.get('pair');
  const typeParam = searchParams.get('type');
  const [activeTab, setActiveTab] = useState<'futures' | 'fair'>(() => {
    // Определяем начальную вкладку из query параметра type
    return typeParam === 'fair' ? 'fair' : 'futures';
  });

  const dispatch = useAppDispatch();
  const {
    showAll,
    enabledExchanges,
    excludedTickers,
    minSpread,
    minFunding,
    maxFunding,
    sameFundingTime,
    minFairRatio,
    maxFairRatio,
  } = useAppSelector((state) => state.cryptoArbsSettings);

  const [selectedArb, setSelectedArb] = useState<ArbPair | null>(null);
  const [selectedFairArb, setSelectedFairArb] = useState<FairRatio | null>(null);
  const tradingServiceRef = useRef<TradingService | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [positions, setPositions] = useState<import('./widgets/PositionsWidget').Position[]>([]);
  const [showTradingPanel, setShowTradingPanel] = useState(() => {
    return localStorage.getItem('enableOrderbookTrading') === 'true';
  });
  const [positionsTab, setPositionsTab] = useState<'positions' | 'balance'>('positions');
  const { data: tickersMap = {} } = useGetPumpTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const tickers = Object.entries(tickersMap);

  // Инициализация trading service
  useEffect(() => {
    if (!tradingServiceRef.current) {
      tradingServiceRef.current = new TradingService();
    }
  }, []);

  // Отслеживаем изменение флага в localStorage
  useEffect(() => {
    const checkFlag = () => {
      setShowTradingPanel(localStorage.getItem('enableOrderbookTrading') === 'true');
    };

    checkFlag();
    // Проверяем каждую секунду (можно оптимизировать через события storage)
    const interval = setInterval(checkFlag, 1000);

    return () => clearInterval(interval);
  }, []);

  // Получаем список всех уникальных бирж из данных
  const allExchanges = useMemo(() => {
    const exchanges = new Set<string>();
    tickers.forEach(([ticker, invoice]) => {
      invoice.arbs?.forEach((arb) => {
        exchanges.add(arb.left.exchange);
        exchanges.add(arb.right.exchange);
      });
    });

    // Порядок бирж для отображения
    const exchangeOrder = [
      'MEXC',
      'GATEIO',
      'GATE',
      'KUCOIN',
      'BINANCE',
      'BYBIT',
      'BITGET',
      'BINGX',
      'OKX',
      'OURBIT',
      'BITMART',
      'HTX',
      'PHEMEX',
      'BITUNIX',
      'XT',
      'TOOBIT',
      'Hyperliquid',
      'Aster',
      'HOTCOIN',
      'KCEX',
      'Lighter',
    ];

    // Сортируем биржи по заданному порядку
    const sorted = Array.from(exchanges).sort((a, b) => {
      const indexA = exchangeOrder.indexOf(a);
      const indexB = exchangeOrder.indexOf(b);

      // Если обе биржи в списке порядка, сортируем по индексу
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // Если только одна в списке, она идет первой
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Если обе не в списке, сортируем по алфавиту
      return a.localeCompare(b);
    });

    return sorted;
  }, [tickers]);

  // Синхронизируем enabledExchanges с allExchanges при изменении списка бирж
  // Только удаляем биржи, которых больше нет, но не добавляем новые автоматически
  useEffect(() => {
    if (allExchanges.length > 0 && !showAll) {
      const updated = enabledExchanges.filter((ex) => allExchanges.includes(ex));
        // Если после удаления не осталось выбранных бирж, включаем режим "Все"
      if (updated.length === 0) {
        dispatch(setShowAll(true));
      } else if (updated.length !== enabledExchanges.length) {
        dispatch(setEnabledExchanges(updated));
      }
    }
  }, [allExchanges, showAll, enabledExchanges, dispatch]);

  // Состояние для избранных пар арбитража
  // Формат: Set<string> где строка = "ticker|leftExchange|rightExchange" для spread или "ticker|exchange" для fair
  const [favoritePairs, setFavoritePairs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('crypto-arbs-favorite-pairs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Функция для получения ключа пары арбитража
  const getArbPairKey = (arb: ArbPair): string => {
    return `${arb.ticker}|${arb.left.exchange}|${arb.right.exchange}`;
  };

  // Функция для получения ключа fair арбитража
  const getFairArbPairKey = (fair: FairRatio): string => {
    return `${fair.ticker}|${fair.exchange}`;
  };

  // Функция для проверки, является ли пара избранной
  const isFavorite = (key: string): boolean => {
    return favoritePairs.has(key);
  };

  // Функция для добавления/удаления из избранного
  const toggleFavorite = (key: string) => {
    setFavoritePairs((prev) => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      const arrayFromSet = Array.from(updated);
      localStorage.setItem('crypto-arbs-favorite-pairs', JSON.stringify(arrayFromSet));
      return updated;
    });
  };

  // Функция для удаления из избранного (только удаление)
  const removeFavorite = (key: string) => {
    setFavoritePairs((prev) => {
      const updated = new Set(prev);
      updated.delete(key);
      const arrayFromSet = Array.from(updated);
      localStorage.setItem('crypto-arbs-favorite-pairs', JSON.stringify(arrayFromSet));
      return updated;
    });
  };

  // Сохраняем избранные пары в localStorage
  useEffect(() => {
    localStorage.setItem('crypto-arbs-favorite-pairs', JSON.stringify(Array.from(favoritePairs)));
  }, [favoritePairs]);


  const fundingMap = useMemo(() => {
    return tickers
      .map(([ticker, invoice], index) => invoice.funding.map((a) => ({ ...a, ticker })))
      .flat()
      .reduce((acc, funding) => {
        const key = `${funding.ticker}_${funding.exchange}`;
        acc[key] = {
          // В API фандинг приходит как коэффициент (0.0001), приводим к числу
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

    // Здесь работаем в "сыром" формате (как приходит из API),
    // проценты добавляем только при отображении и фильтрации
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
        if (diffNext > 0 && diffNext < 480) {
          // 480 минут = 8 часов
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
      .filter((b) => {
        // Фильтрация по биржам (только если showAll = false и есть выбранные биржи)
        // Показываем спред, если обе биржи из пары выбраны
        if (!showAll && enabledExchanges.length > 0) {
          if (!enabledExchanges.includes(b.left.exchange) || !enabledExchanges.includes(b.right.exchange)) {
            return false;
          }
        }
        // Фильтр по времени фандинга
        if (sameFundingTime) {
          const leftFunding = fundingMap[`${b.ticker}_${b.left.exchange}`];
          const rightFunding = fundingMap[`${b.ticker}_${b.right.exchange}`];
          if (!leftFunding || !rightFunding) {
            return false; // Если нет данных о фандинге, исключаем
          }
          // Сравниваем время фандинга (может быть null или строка)
          const leftTime = leftFunding.nextFundingTime;
          const rightTime = rightFunding.nextFundingTime;
          // Если оба null или оба имеют одинаковое значение
          if (leftTime !== rightTime) {
            return false;
          }
        }
        // Остальные фильтры
        const spread = Math.abs(b.ratio - 1) * 100;
        const funding = sumFunding(b) * 100;
        const minFundingCheck = minFunding === -Infinity ? true : funding >= minFunding;
        const maxFundingCheck = maxFunding === Infinity ? true : funding <= maxFunding;
        // Фильтр по исключенным монетам
        const isExcluded = excludedTickers.includes(b.ticker);
        return spread > minSpread && minFundingCheck && maxFundingCheck && !isExcluded;
      });

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
  }, [tickers, fundingMap, sortType, enabledExchanges, showAll, minSpread, minFunding, maxFunding, sameFundingTime, excludedTickers]);

  // Восстанавливаем выбранную пару из query параметров при загрузке (независимо от загрузки tickers)
  useEffect(() => {
    if (selectedPairKey) {
      // Поддерживаем оба формата для обратной совместимости
      const separator = selectedPairKey.includes('|') ? '|' : '_';
      const parts = selectedPairKey.split(separator);

      if (parts.length >= 3) {
        const ticker = parts[0];
        const leftExchange = parts[1];
        // Для формата с подчеркиванием берем все остальное, для формата с | - только третий элемент
        const rightExchange = separator === '|' ? parts[2] : parts.slice(2).join('_');

        // Создаем минимальный объект сразу для отображения графика и стакана
        setSelectedArb((current) => {
          // Проверяем, не совпадает ли уже выбранная пара
          if (current && current.ticker === ticker && current.left.exchange === leftExchange && current.right.exchange === rightExchange) {
            return current; // Не меняем, если уже выбрана та же пара
          }

          // Создаем минимальный объект ArbPair для отображения графика и стакана
          return {
            ticker,
            left: {
              exchange: leftExchange,
              last: 0, // Значение по умолчанию, так как данных нет
            },
            right: {
              exchange: rightExchange,
              last: 0, // Значение по умолчанию, так как данных нет
            },
            ratio: 1, // Значение по умолчанию
          };
        });
      } else if (parts.length === 2) {
        // Формат для fair арбитража: ticker|exchange
        const ticker = parts[0];
        const exchange = parts[1];

        // Создаем минимальный объект для отображения графика
        setSelectedFairArb((current) => {
          if (current && current.ticker === ticker && current.exchange === exchange) {
            return current;
          }

          return {
            ticker,
            exchange,
            last: 0,
            fair: 0,
            ratio: 1,
          };
        });
      }
    }
  }, [selectedPairKey]);

  // Обновляем выбранную пару данными из filteredArbs, когда они загрузятся
  useEffect(() => {
    if (selectedArb && filteredArbs.length > 0) {
      const foundArb = filteredArbs.find(
        (a) =>
          a.ticker === selectedArb.ticker &&
          a.left.exchange === selectedArb.left.exchange &&
          a.right.exchange === selectedArb.right.exchange,
      );

      if (foundArb) {
        setSelectedArb((current) => {
          if (
            !current ||
            current.ticker !== foundArb.ticker ||
            current.left.exchange !== foundArb.left.exchange ||
            current.right.exchange !== foundArb.right.exchange
          ) {
            return foundArb;
          }
          return current;
        });
      }
    }
  }, [filteredArbs, selectedArb]);

  // Обновляем активную вкладку при изменении query параметра type
  useEffect(() => {
    const currentType = searchParams.get('type');
    if (currentType === 'fair') {
      setActiveTab('fair');
    } else {
      setActiveTab('futures');
    }
  }, [searchParams]);

  // Обработчик изменения типа сортировки
  const handleSortChange = (value: string) => {
    searchParams.set('sort', value);
    setSearchParams(searchParams);
  };

  // Обработчик выбора пары
  const handleArbSelect = (arb: ArbPair) => {
    setSelectedArb(arb);
    setSelectedFairArb(null);
    // Используем формат: ticker|leftExchange|rightExchange для избежания конфликтов с подчеркиваниями
    const pairKey = `${arb.ticker}|${arb.left.exchange}|${arb.right.exchange}`;
    searchParams.set('pair', pairKey);
    searchParams.set('type', 'spread');
    setSearchParams(searchParams);
  };

  const handleFairArbSelect = (fair: FairRatio) => {
    setSelectedFairArb(fair);
    setSelectedArb(null);
    const pairKey = `${fair.ticker}|${fair.exchange}`;
    searchParams.set('pair', pairKey);
    searchParams.set('type', 'fair');
    setSearchParams(searchParams);
  };

  const handleClearSelection = () => {
    setSelectedArb(null);
    setSelectedFairArb(null);
    searchParams.delete('pair');
    searchParams.delete('type');
    setSearchParams(searchParams);
  };

  // Обогащаем данные арбитражей для отображения
  const enrichedArbs = useMemo(() => {
    return filteredArbs.slice(0, 50).map((a) => {
      const spread = (a.ratio - 1) * 100;
      // Общий фандинг пары в процентах
      const funding = sumFunding(a) * 100;
      // Определяем sellExchange (где цена выше - продаем) и buyExchange (где цена ниже - покупаем)
      // Если цены равны, используем исходный порядок left/right
      const sellExchange = a.right.last > a.left.last ? a.right : a.left;
      const buyExchange = a.right.last < a.left.last ? a.right : a.left;
      const sellFundingData = fundingMap[`${a.ticker}_${sellExchange.exchange}`];
      const buyFundingData = fundingMap[`${a.ticker}_${buyExchange.exchange}`];
      const isSelected =
        selectedArb?.ticker === a.ticker &&
        selectedArb?.left.exchange === a.left.exchange &&
        selectedArb?.right.exchange === a.right.exchange;

      return {
        ...a,
        spread,
        funding,
        sellExchange,
        buyExchange,
        // Фандинг по каждой бирже так же приводим к процентам, как на биржах
        sellFunding: sellFundingData ? sellFundingData.rate * 100 : undefined,
        sellFundingTime: sellFundingData?.nextFundingTime,
        buyFunding: buyFundingData ? buyFundingData.rate * 100 : undefined,
        buyFundingTime: buyFundingData?.nextFundingTime,
        isSelected,
      };
    });
  }, [filteredArbs, fundingMap, selectedArb]);

  // Получаем fairRatios из данных
  const fairRatios = useMemo(() => {
    return tickers
      .map(([ticker, invoice]) => {
        const ratios = (invoice as any).fairRatios || [];
        return ratios.map((ratio: FairRatio) => ({ ...ratio, ticker }));
      })
      .flat()
      .filter((r) => {
        // Игнорируем биржи без поддержки графиков справедливой цены
        if (!EXCHANGES_WITH_FAIR_PRICE.includes(r.exchange.toUpperCase())) {
          return false;
        }
        // Фильтрация по биржам (только если showAll = false и есть выбранные биржи)
        if (!showAll && enabledExchanges.length > 0) {
          if (!enabledExchanges.includes(r.exchange)) {
            return false;
          }
        }
        // Фильтр по минимальному спреду (ratio - 1 в процентах)
        const spread = (r.ratio - 1) * 100;
        const isExcluded = excludedTickers.includes(r.ticker);
        const minFairCheck = minFairRatio === -Infinity ? true : spread >= minFairRatio;
        const maxFairCheck = maxFairRatio === Infinity ? true : spread <= maxFairRatio;
        return minFairCheck && maxFairCheck && !isExcluded;
      })
      .sort((a, b) => {
        // Сортируем по ratio (чем больше отклонение от 1, тем лучше)
        const aSpread = Math.abs(a.ratio - 1);
        const bSpread = Math.abs(b.ratio - 1);
        return bSpread - aSpread;
      })
      .slice(0, 50);
  }, [tickers, showAll, enabledExchanges, excludedTickers, minFairRatio, maxFairRatio]);

  // Обновляем выбранный fair арбитраж данными из fairRatios, когда они загрузятся
  useEffect(() => {
    if (selectedFairArb && fairRatios.length > 0) {
      const foundFair = fairRatios.find((f) => f.ticker === selectedFairArb.ticker && f.exchange === selectedFairArb.exchange);

      if (foundFair) {
        setSelectedFairArb((current) => {
          if (!current || current.ticker !== foundFair.ticker || current.exchange !== foundFair.exchange) {
            return foundFair;
          }
          return current;
        });
      }
    }
  }, [fairRatios, selectedFairArb]);

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

  // Формируем тикеры для графика fair арбитража (lastPrice / fairPrice)
  const getFairTickers = useMemo(() => {
    if (!selectedFairArb) return { tickerStock: '', _tickerFuture: '' };

    const exchange = selectedFairArb.exchange;

    // Проверяем, что биржа поддерживает fair price
    if (!EXCHANGES_WITH_FAIR_PRICE.includes(exchange.toUpperCase())) {
      return { tickerStock: '', _tickerFuture: '' };
    }

    const tickerWithSuffix = getTickerWithSuffix(exchange, selectedFairArb.ticker);

    // Для fair арбитража: lastPrice / fairPrice на одной бирже
    const lastPriceTicker = `${exchange}:${tickerWithSuffix}`;
    const fairPriceTicker = `${exchange}:${tickerWithSuffix}_fair`;

    return {
      tickerStock: lastPriceTicker,
      _tickerFuture: fairPriceTicker,
    };
  }, [selectedFairArb]);

  // Получаем избранные пары для отображения в табах
  // Не зависят от того, какие арбитражи сейчас приходят с сервера:
  // используем только сохраненный ключ (ticker|left|right или ticker|exchange)
  const favoriteArbsList = useMemo(() => {
    const favorites: Array<{ key: string; type: 'spread' | 'fair'; arb?: ArbPair; fair?: FairRatio }> = [];

    Array.from(favoritePairs).forEach((key) => {
      const parts = key.split('|');

      if (parts.length === 3) {
        // Spread арбитраж: ticker|leftExchange|rightExchange
        const [ticker, leftExchange, rightExchange] = parts;
        const arb: ArbPair = {
          ticker,
          left: {
            exchange: leftExchange,
            last: 0,
          },
          right: {
            exchange: rightExchange,
            last: 0,
          },
          ratio: 1,
        };
        favorites.push({ key, type: 'spread', arb });
      } else if (parts.length === 2) {
        // Fair арбитраж: ticker|exchange
        const [ticker, exchange] = parts;
        const fair: FairRatio = {
          ticker,
          exchange,
          last: 0,
          fair: 0,
          ratio: 1,
        };
        favorites.push({ key, type: 'fair', fair });
      }
    });

    return favorites;
  }, [favoritePairs]);

  // Обогащаем выбранный арбитраж для отображения (даже если его нет в списке)
  const selectedEnriched = useMemo(() => {
    if (!selectedArb) {
      return null;
    }

    // Сначала пытаемся найти в enrichedArbs
    const found = enrichedArbs.find(
      (a) =>
        a.ticker === selectedArb.ticker && a.left.exchange === selectedArb.left.exchange && a.right.exchange === selectedArb.right.exchange,
    );

    if (found) {
      return found;
    }

    // Если не найден (например, список пуст), формируем из selectedArb
    const spread = (selectedArb.ratio - 1) * 100;
    const funding = sumFunding(selectedArb) * 100;
    // Определяем sellExchange (где цена выше - продаем) и buyExchange (где цена ниже - покупаем)
    // Если цены равны (например, оба 0 для placeholder), используем исходный порядок left/right
    // left всегда будет sellExchange, right всегда будет buyExchange при равных ценах
    const sellExchange = selectedArb.right.last > selectedArb.left.last ? selectedArb.right : selectedArb.left;
    const buyExchange = selectedArb.right.last < selectedArb.left.last ? selectedArb.right : selectedArb.left;


    const sellFundingData = fundingMap[`${selectedArb.ticker}_${sellExchange.exchange}`];
    const buyFundingData = fundingMap[`${selectedArb.ticker}_${buyExchange.exchange}`];

    return {
      ...selectedArb,
      // Убеждаемся, что left и right всегда присутствуют
      left: selectedArb.left,
      right: selectedArb.right,
      spread,
      funding,
      sellExchange,
      buyExchange,
      sellFunding: sellFundingData ? sellFundingData.rate * 100 : undefined,
      sellFundingTime: sellFundingData?.nextFundingTime,
      buyFunding: buyFundingData ? buyFundingData.rate * 100 : undefined,
      buyFundingTime: buyFundingData?.nextFundingTime,
      isSelected: true,
    };
  }, [selectedArb, enrichedArbs, fundingMap]);

  // Формируем арбитражную позицию из позиций на обеих биржах
  const arbitragePosition = useMemo(() => {
    if (!selectedEnriched || !positions.length) {
      return null;
    }

    const ticker = selectedEnriched.ticker;
    const leftExchange = selectedEnriched.left.exchange;
    const rightExchange = selectedEnriched.right.exchange;

    // Ищем позиции по тикеру на левой бирже
    const leftPosition = positions.find(
      (p) => p.token.toUpperCase() === ticker.toUpperCase() && p.exchange.toUpperCase() === leftExchange.toUpperCase(),
    );

    // Ищем позиции по тикеру на правой бирже
    const rightPosition = positions.find(
      (p) => p.token.toUpperCase() === ticker.toUpperCase() && p.exchange.toUpperCase() === rightExchange.toUpperCase(),
    );

    // Если есть позиции на обеих биржах, формируем арбитражную позицию
    if (leftPosition && rightPosition) {
      // Цена умножается на объем для левой и правой позиции
      const leftValue = leftPosition.entryPrice * leftPosition.volume;
      const rightValue = rightPosition.entryPrice * rightPosition.volume;

      // Левая делится на правую, получается средняя цена арбитража
      // Если rightValue = 0, используем простое деление цен
      const arbitragePrice = rightValue !== 0 ? leftValue / rightValue : (rightPosition.entryPrice !== 0 ? leftPosition.entryPrice / rightPosition.entryPrice : 0);

      // side - side левого тикера
      const side = leftPosition.side || '';

      // PnL складывается
      const totalPnl = (leftPosition.unrealizedPnl || 0) + (rightPosition.unrealizedPnl || 0);

      return {
        side,
        price: arbitragePrice,
        pnl: totalPnl,
      };
    }

    return null;
  }, [selectedEnriched, positions]);

  // Проверка флага fullAccess
  const hasFullAccess = localStorage.getItem('fullAccess') === 'true';

  return (
    <div className={cn('flex gap-1', hasFullAccess ? 'h-[calc(100vh-52px)]' : 'h-[calc(100vh-8px)]')}>
      <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden">
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SettingsDialog allExchanges={allExchanges} />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'futures' | 'fair')} className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="futures" className="flex-1">
                  Арбитраж
                </TabsTrigger>
                <TabsTrigger value="fair" className="flex-1">
                  Справедливая цена
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {activeTab === 'futures' && (
            <Tabs value={sortType} onValueChange={handleSortChange} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value={SortType.Funding} className="flex-1">
                  По фандингу
                </TabsTrigger>
                <TabsTrigger value={SortType.Spread} className="flex-1">
                  По спреду
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {activeTab === 'futures' ? (
            enrichedArbs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">Арбитражные возможности не найдены</p>
                </div>
              </div>
            ) : (
              enrichedArbs.map((a) => (
                <ArbCard
                  key={`${a.ticker}_${a.left.exchange}_${a.right.exchange}`}
                  arb={a}
                  onSelect={handleArbSelect}
                  isFavorite={isFavorite}
                  getArbPairKey={getArbPairKey}
                  toggleFavorite={toggleFavorite}
                  formatFundingTime={formatFundingTime}
                />
              ))
            )
          ) : fairRatios.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Арбитражные возможности справедливой цены не найдены</p>
              </div>
            </div>
          ) : (
            fairRatios.map((r) => {
              const isSelected = selectedFairArb?.ticker === r.ticker && selectedFairArb?.exchange === r.exchange;

              return (
                <FairArbCard
                  key={`${r.ticker}_${r.exchange}_fair`}
                  fair={r}
                  isSelected={isSelected}
                  onSelect={handleFairArbSelect}
                  isFavorite={isFavorite}
                  getFairArbPairKey={getFairArbPairKey}
                  toggleFavorite={toggleFavorite}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="flex-[3] flex gap-1 min-h-0 h-full">
        {selectedEnriched ? (
          <>
            <div className="flex-[4] flex flex-col min-h-0 h-full">
              {/* Табы избранных пар */}
              <FavoriteTabs
                favoriteArbsList={favoriteArbsList}
                selectedArb={selectedArb}
                selectedFairArb={selectedFairArb}
                onArbSelect={handleArbSelect}
                onFairArbSelect={handleFairArbSelect}
                onRemoveFavorite={removeFavorite}
                onClearSelection={handleClearSelection}
              />
              <SelectedArbWidget
                selectedEnriched={selectedEnriched}
                selectedArb={selectedArb}
                exchangeImgMap={exchangeImgMap}
                formatFundingTime={formatFundingTime}
                getTradingViewSpreadUrl={getTradingViewSpreadUrl}
              />
              <div className="flex-1 min-h-0">
                <StatArbPage
                  tickerStock={getSpreadTickers.tickerStock}
                  _tickerFuture={getSpreadTickers._tickerFuture}
                  onlyChart
                  height="100%"
                  multi={1}
                  position={arbitragePosition}
                />
              </div>
              {showTradingPanel && (
                <div className="flex flex-col">
                  <Tabs value={positionsTab} onValueChange={(value) => setPositionsTab(value as 'positions' | 'balance')} className="flex-1 flex flex-col">
                    <TabsList className="mb-1">
                      <TabsTrigger value="positions">Позиции</TabsTrigger>
                      <TabsTrigger value="balance">Баланс</TabsTrigger>
                    </TabsList>
                    <TabsContent value="positions" className="flex-1 flex flex-col">
                      <PositionsWidget
                        ticker={selectedEnriched.ticker}
                        leftExchange={selectedArb.left.exchange}
                        rightExchange={selectedArb.right.exchange}
                        onPositionsChange={setPositions}
                      />
                    </TabsContent>
                    <TabsContent value="balance" className="flex-1 flex flex-col">
                      <BalanceWidget />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
            <div className="flex flex-col min-h-0 h-full w-[200px] flex-shrink-0">
              {selectedEnriched && selectedEnriched.left && selectedEnriched.right && selectedEnriched.ticker ? (
                <>
                  <div className="flex-1 min-h-0">
                    <OrderbookView exchange={selectedEnriched.left.exchange} ticker={selectedEnriched.ticker} />
                  </div>
                  <div className="flex-1 min-h-0 mt-1">
                    <OrderbookView exchange={selectedEnriched.right.exchange} ticker={selectedEnriched.ticker} />
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground p-2">
                  {!selectedEnriched ? 'Нет выбранного арбитража' : 'Недостаточно данных для стакана'}
                </div>
              )}
              {/* Торговая панель - видна только если есть флаг в localStorage */}
              {showTradingPanel && (
                <div className="mt-1">
                  <TradingPanelWidget
                    isTrading={isTrading}
                    selectedEnriched={selectedEnriched}
                    tradingService={tradingServiceRef.current}
                    onSetIsTrading={setIsTrading}
                  />
                </div>
              )}
            </div>
          </>
        ) : selectedFairArb ? (
          <>
            <div className="flex-[4] flex flex-col min-h-0 h-full">
              {/* Табы избранных пар */}
              <FavoriteTabs
                favoriteArbsList={favoriteArbsList}
                selectedArb={selectedArb}
                selectedFairArb={selectedFairArb}
                onArbSelect={handleArbSelect}
                onFairArbSelect={handleFairArbSelect}
                onRemoveFavorite={removeFavorite}
                onClearSelection={handleClearSelection}
              />
              <FairArbHeader fairArb={selectedFairArb} />
              <div className="flex-1 min-h-0">
                <StatArbPage
                  tickerStock={getFairTickers.tickerStock}
                  _tickerFuture={getFairTickers._tickerFuture}
                  onlyChart
                  height="100%"
                  multi={1}
                />
              </div>
            </div>
            <div className="flex flex-col min-h-0 h-full w-[200px] flex-shrink-0">
              <div className="flex-1 min-h-0">
                <OrderbookView exchange={selectedFairArb.exchange} ticker={selectedFairArb.ticker} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Выберите пару арбитража для отображения графика
          </div>
        )}
      </div>
    </div>
  );
};
