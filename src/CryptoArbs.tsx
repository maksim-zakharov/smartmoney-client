import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { cn } from './lib/utils.ts';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exchangeImgMap } from './utils.ts';
import { getTickerWithSuffix, getExchangeUrl } from './api/utils/tickers';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle } from './components/ui/card.tsx';
import { StatArbPage } from './ArbitrageMOEXPage/strategies/StatArbPage.tsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip.tsx';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Copy, ExternalLink, Settings, EyeOff, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog.tsx';
import { Button } from './components/ui/button.tsx';
import { Input } from './components/ui/input.tsx';
import { Label } from './components/ui/label.tsx';
import { Checkbox } from './components/ui/checkbox.tsx';
import { OrderbookView } from './components/OrderbookView';
import { TradingService } from './api/trading.service';
import { TradingPanelWidget } from './Widgets/TradingPanelWidget';
import { SelectedArbWidget } from './Widgets/SelectedArbWidget';
import { PositionsWidget } from './Widgets/PositionsWidget';

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

// Функция для генерации URL TradingView для спреда
const getTradingViewSpreadUrl = (sellExchange: string, buyExchange: string, ticker: string): string => {
  const sellExchangeUpper = sellExchange.toUpperCase();
  const buyExchangeUpper = buyExchange.toUpperCase();

  // Маппинг бирж на символы TradingView
  const exchangeMap: Record<string, string> = {
    BINANCE: 'BINANCE',
    BYBIT: 'BYBIT',
    OKX: 'OKX',
    BITGET: 'BITGET',
    MEXC: 'MEXC',
    GATE: 'GATEIO',
    GATEIO: 'GATEIO',
    KUCOIN: 'KUCOIN',
    BINGX: 'BINGX',
    OURBIT: 'OURBIT',
    BITMART: 'BITMART',
    HTX: 'HTX',
    PHEMEX: 'PHEMEX',
    BITUNIX: 'BITUNIX',
    XT: 'XT',
    TOOBIT: 'TOOBIT',
    HYPERLIQUID: 'HYPERLIQUID',
    ASTER: 'ASTER',
    HOTCOIN: 'HOTCOIN',
    KCEX: 'KCEX',
  };

  const sellTvExchange = exchangeMap[sellExchangeUpper] || sellExchangeUpper;
  const buyTvExchange = exchangeMap[buyExchangeUpper] || buyExchangeUpper;

  // Добавляем .P для фьючерсов в TradingView
  const sellSymbol = `${sellTvExchange}:${ticker}USDT.P`;
  const buySymbol = `${buyTvExchange}:${ticker}USDT.P`;

  // Формат спреда в TradingView: SYMBOL1!SYMBOL2
  const spreadSymbol = `${sellSymbol}/${buySymbol}`;

  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(spreadSymbol)}`;
};

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

  const [selectedArb, setSelectedArb] = useState<ArbPair | null>(null);
  const [selectedFairArb, setSelectedFairArb] = useState<FairRatio | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const tradingServiceRef = useRef<TradingService | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(() => {
    return localStorage.getItem('enableOrderbookTrading') === 'true';
  });
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

  // Состояние для режима "Все" (по умолчанию включен - фильтрация отсутствует)
  const [showAll, setShowAll] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto-arbs-show-all');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return true; // По умолчанию показываем все
  });

  // Состояние для выбранных бирж (используется только когда showAll = false)
  const [enabledExchanges, setEnabledExchanges] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('crypto-arbs-enabled-exchanges');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? new Set(parsed) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Синхронизируем enabledExchanges с allExchanges при изменении списка бирж
  // Только удаляем биржи, которых больше нет, но не добавляем новые автоматически
  useEffect(() => {
    if (allExchanges.length > 0 && !showAll) {
      setEnabledExchanges((prev) => {
        const updated = new Set(prev);
        // Удаляем только биржи, которых больше нет в данных
        Array.from(updated).forEach((ex) => {
          if (!allExchanges.includes(ex)) {
            updated.delete(ex);
          }
        });
        // Если после удаления не осталось выбранных бирж, включаем режим "Все"
        if (updated.size === 0) {
          setShowAll(true);
        }
        return updated;
      });
    }
  }, [allExchanges, showAll]);

  // Состояние для минимального спреда (по умолчанию 1%)
  const [minSpread, setMinSpread] = useState<number>(() => {
    const saved = localStorage.getItem('crypto-arbs-min-spread');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : 1;
    }
    return 1; // По умолчанию 1%
  });

  // Состояние для минимального фандинга (по умолчанию -Infinity - без ограничения)
  const [minFunding, setMinFunding] = useState<number>(() => {
    const saved = localStorage.getItem('crypto-arbs-min-funding');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : -Infinity;
    }
    return -Infinity; // По умолчанию без ограничения
  });

  // Состояние для максимального фандинга (по умолчанию Infinity - без ограничения)
  const [maxFunding, setMaxFunding] = useState<number>(() => {
    const saved = localStorage.getItem('crypto-arbs-max-funding');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : Infinity;
    }
    return Infinity; // По умолчанию без ограничения
  });

  // Состояние для минимального отклонения справедливой цены (по умолчанию -Infinity - без ограничения)
  const [minFairRatio, setMinFairRatio] = useState<number>(() => {
    const saved = localStorage.getItem('crypto-arbs-min-fair-ratio');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : -Infinity;
    }
    return -Infinity; // По умолчанию без ограничения
  });

  // Состояние для максимального отклонения справедливой цены (по умолчанию Infinity - без ограничения)
  const [maxFairRatio, setMaxFairRatio] = useState<number>(() => {
    const saved = localStorage.getItem('crypto-arbs-max-fair-ratio');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : Infinity;
    }
    return Infinity; // По умолчанию без ограничения
  });

  // Состояние для фильтра "Фандинг в одно время"
  const [sameFundingTime, setSameFundingTime] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto-arbs-same-funding-time');
    if (saved !== null) {
      return saved === 'true';
    }
    return false; // По умолчанию выключено
  });

  // Состояние для исключенных монет
  const [excludedTickers, setExcludedTickers] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('crypto-arbs-excluded-tickers');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

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
      localStorage.setItem('crypto-arbs-favorite-pairs', JSON.stringify(Array.from(updated)));
      return updated;
    });
  };

  // Сохраняем избранные пары в localStorage
  useEffect(() => {
    localStorage.setItem('crypto-arbs-favorite-pairs', JSON.stringify(Array.from(favoritePairs)));
  }, [favoritePairs]);

  // Сохраняем состояние в localStorage
  useEffect(() => {
    localStorage.setItem('crypto-arbs-show-all', JSON.stringify(showAll));
    if (!showAll && enabledExchanges.size > 0) {
      localStorage.setItem('crypto-arbs-enabled-exchanges', JSON.stringify(Array.from(enabledExchanges)));
    }
  }, [showAll, enabledExchanges]);

  // Сохраняем фильтры в localStorage
  useEffect(() => {
    localStorage.setItem('crypto-arbs-min-spread', minSpread.toString());
  }, [minSpread]);

  useEffect(() => {
    localStorage.setItem('crypto-arbs-min-funding', minFunding === -Infinity ? '' : minFunding.toString());
  }, [minFunding]);

  useEffect(() => {
    localStorage.setItem('crypto-arbs-max-funding', maxFunding === Infinity ? '' : maxFunding.toString());
  }, [maxFunding]);

  useEffect(() => {
    localStorage.setItem('crypto-arbs-same-funding-time', sameFundingTime.toString());
  }, [sameFundingTime]);

  useEffect(() => {
    localStorage.setItem('crypto-arbs-min-fair-ratio', minFairRatio === -Infinity ? '' : minFairRatio.toString());
  }, [minFairRatio]);

  useEffect(() => {
    localStorage.setItem('crypto-arbs-max-fair-ratio', maxFairRatio === Infinity ? '' : maxFairRatio.toString());
  }, [maxFairRatio]);

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
        if (!showAll && enabledExchanges.size > 0) {
          if (!enabledExchanges.has(b.left.exchange) || !enabledExchanges.has(b.right.exchange)) {
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
        const isExcluded = excludedTickers.has(b.ticker);
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
        if (!showAll && enabledExchanges.size > 0) {
          if (!enabledExchanges.has(r.exchange)) {
            return false;
          }
        }
        // Фильтр по минимальному спреду (ratio - 1 в процентах)
        const spread = (r.ratio - 1) * 100;
        const isExcluded = excludedTickers.has(r.ticker);
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
  const favoriteArbsList = useMemo(() => {
    const favorites: Array<{ key: string; type: 'spread' | 'fair'; arb?: typeof enrichedArbs[0]; fair?: FairRatio }> = [];

    Array.from(favoritePairs).forEach((key) => {
      // Проверяем формат ключа: если 3 части через | - это spread, если 2 - fair
      const parts = key.split('|');
      if (parts.length === 3) {
        // Spread арбитраж: ticker|leftExchange|rightExchange
        const [ticker, leftExchange, rightExchange] = parts;
        const found = enrichedArbs.find(
          (a) => a.ticker === ticker && a.left.exchange === leftExchange && a.right.exchange === rightExchange,
        );
        if (found) {
          favorites.push({ key, type: 'spread', arb: found });
        }
      } else if (parts.length === 2) {
        // Fair арбитраж: ticker|exchange
        const [ticker, exchange] = parts;
        const found = fairRatios.find((r) => r.ticker === ticker && r.exchange === exchange);
        if (found) {
          favorites.push({ key, type: 'fair', fair: found });
        }
      }
    });

    return favorites;
  }, [favoritePairs, enrichedArbs, fairRatios]);

  // Обогащаем выбранный арбитраж для отображения (даже если его нет в списке)
  const selectedEnriched = useMemo(() => {
    if (!selectedArb) return null;

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

    // Отладка: проверяем, что sellExchange и buyExchange разные
    if (sellExchange.exchange === buyExchange.exchange) {
      console.warn('sellExchange и buyExchange одинаковые:', {
        ticker: selectedArb.ticker,
        left: selectedArb.left,
        right: selectedArb.right,
        sellExchange: sellExchange.exchange,
        buyExchange: buyExchange.exchange,
      });
    }

    const sellFundingData = fundingMap[`${selectedArb.ticker}_${sellExchange.exchange}`];
    const buyFundingData = fundingMap[`${selectedArb.ticker}_${buyExchange.exchange}`];

    return {
      ...selectedArb,
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

  return (
    <div className="flex gap-1 h-[calc(100vh-52px)]">
      <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden">
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 flex-shrink-0">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 px-3 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Основные</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Биржи</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto">
                          <Button
                            variant={showAll ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setShowAll(true);
                              // При выборе "Все" очищаем выбор конкретных бирж
                              setEnabledExchanges(new Set());
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            Все
                          </Button>
                          {allExchanges.map((exchange) => (
                            <Button
                              key={exchange}
                              variant={!showAll && enabledExchanges.has(exchange) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                // При клике на конкретную биржу отключаем режим "Все"
                                setShowAll(false);
                                setEnabledExchanges((prev) => {
                                  const updated = new Set(prev);
                                  if (updated.has(exchange)) {
                                    updated.delete(exchange);
                                    // Если все биржи сняты, включаем режим "Все"
                                    if (updated.size === 0) {
                                      setShowAll(true);
                                    }
                                  } else {
                                    updated.add(exchange);
                                  }
                                  return updated;
                                });
                              }}
                              className="h-7 px-2 text-xs flex items-center gap-1.5"
                            >
                              {exchangeImgMap[exchange] && (
                                <img src={exchangeImgMap[exchange]} alt={exchange} className="h-3.5 w-3.5 rounded-full" />
                              )}
                              {exchange}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Исключенные монеты</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto">
                          {excludedTickers.size === 0 ? (
                            <p className="text-sm text-muted-foreground">Нет исключенных монет</p>
                          ) : (
                            Array.from(excludedTickers).map((ticker) => (
                              <Button
                                key={ticker}
                                variant="default"
                                size="sm"
                                className="h-7 px-2 text-xs flex items-center gap-1.5 relative"
                                onClick={() => {
                                  const newExcluded = new Set(excludedTickers);
                                  newExcluded.delete(ticker);
                                  setExcludedTickers(newExcluded);
                                  localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(Array.from(newExcluded)));
                                }}
                              >
                                <span>{ticker}</span>
                                <span className="text-xs ml-1">×</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-muted-foreground/20 pt-4">
                    <h3 className="text-sm font-semibold mb-3">Арбитражи</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Минимальный спред (%)</h4>
                        <Input
                          id="min-spread"
                          type="number"
                          step="0.1"
                          min="0"
                          value={minSpread}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setMinSpread(value);
                            }
                          }}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Фандинг</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="min-funding" className="text-xs text-muted-foreground mb-1 block">
                              От (%)
                            </Label>
                            <Input
                              id="min-funding"
                              type="number"
                              step="0.1"
                              value={minFunding === -Infinity ? '' : minFunding}
                              onChange={(e) => {
                                const value = e.target.value === '' ? -Infinity : parseFloat(e.target.value);
                                if (e.target.value === '' || !isNaN(value)) {
                                  setMinFunding(value);
                                }
                              }}
                              className="h-8"
                              placeholder="Без ограничения"
                            />
                          </div>
                          <div>
                            <Label htmlFor="max-funding" className="text-xs text-muted-foreground mb-1 block">
                              До (%)
                            </Label>
                            <Input
                              id="max-funding"
                              type="number"
                              step="0.1"
                              value={maxFunding === Infinity ? '' : maxFunding}
                              onChange={(e) => {
                                const value = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                                if (e.target.value === '' || !isNaN(value)) {
                                  setMaxFunding(value);
                                }
                              }}
                              className="h-8"
                              placeholder="Без ограничения"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Фандинг в одно время</h4>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="same-funding-time"
                            checked={sameFundingTime}
                            onCheckedChange={(checked) => setSameFundingTime(checked === true)}
                          />
                          <Label htmlFor="same-funding-time" className="text-xs text-muted-foreground cursor-pointer">
                            Включить
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-muted-foreground/20 pt-4">
                    <h3 className="text-sm font-semibold mb-3">Справедливая</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Отклонение</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="min-fair-ratio" className="text-xs text-muted-foreground mb-1 block">
                              От (%)
                            </Label>
                            <Input
                              id="min-fair-ratio"
                              type="number"
                              step="0.1"
                              value={minFairRatio === -Infinity ? '' : minFairRatio}
                              onChange={(e) => {
                                const value = e.target.value === '' ? -Infinity : parseFloat(e.target.value);
                                if (e.target.value === '' || !isNaN(value)) {
                                  setMinFairRatio(value);
                                }
                              }}
                              className="h-8"
                              placeholder="Без ограничения"
                            />
                          </div>
                          <div>
                            <Label htmlFor="max-fair-ratio" className="text-xs text-muted-foreground mb-1 block">
                              До (%)
                            </Label>
                            <Input
                              id="max-fair-ratio"
                              type="number"
                              step="0.1"
                              value={maxFairRatio === Infinity ? '' : maxFairRatio}
                              onChange={(e) => {
                                const value = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                                if (e.target.value === '' || !isNaN(value)) {
                                  setMaxFairRatio(value);
                                }
                              }}
                              className="h-8"
                              placeholder="Без ограничения"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                <Card
                  key={`${a.ticker}_${a.left.exchange}_${a.right.exchange}`}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-2 w-full rounded',
                    a.isSelected ? 'ring-2 ring-primary shadow-lg border-primary' : '',
                  )}
                  onClick={() =>
                    handleArbSelect({
                      ticker: a.ticker,
                      left: a.left,
                      right: a.right,
                      ratio: a.ratio,
                    })
                  }
                >
                  <CardHeader className="pb-2 pt-2 px-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold tabular-nums">{a.ticker}</CardTitle>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Copy
                              className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard
                                  .writeText(a.ticker)
                                  .then(() => {
                                    toast.success(`Тикер ${a.ticker} скопирован`);
                                  })
                                  .catch(() => {
                                    toast.error('Не удалось скопировать тикер');
                                  });
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Копировать</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Star
                              className={cn(
                                'h-4 w-4 transition-colors cursor-pointer',
                                isFavorite(getArbPairKey(a))
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-muted-foreground hover:text-yellow-500',
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(getArbPairKey(a));
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isFavorite(getArbPairKey(a)) ? 'Удалить из избранного' : 'Добавить в избранное'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.funding >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={cn('text-sm font-semibold tabular-nums', a.funding >= 0 ? 'text-green-500' : 'text-red-500')}>
                          {a.funding.toFixed(4)}%
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <EyeOff
                              className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExcluded = new Set(excludedTickers);
                                newExcluded.add(a.ticker);
                                setExcludedTickers(newExcluded);
                                localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(Array.from(newExcluded)));
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Скрыть монету</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-1.5">
                      <div className="flex flex-col gap-1.5 p-2 rounded bg-red-500/10 border border-red-500/20">
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
                          <span className="text-xs font-semibold text-muted-foreground">{a.sellExchange.exchange}</span>
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
                        <div className="text-base font-bold tabular-nums">{a.sellExchange.last.toFixed(6)}</div>
                        <div className="text-xs text-muted-foreground">
                          Фандинг: <span className="font-mono">{a.sellFunding !== undefined ? `${a.sellFunding.toFixed(4)}%` : 'N/A'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Время: {formatFundingTime(a.sellFundingTime)}</div>
                      </div>

                      <div className="flex flex-col gap-1.5 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowUp className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs font-medium text-green-400">Покупаем</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img className="h-4 w-4 rounded-full" src={exchangeImgMap[a.buyExchange.exchange]} alt={a.buyExchange.exchange} />
                          <span className="text-xs font-semibold text-muted-foreground">{a.buyExchange.exchange}</span>
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
                        <div className="text-base font-bold tabular-nums">{a.buyExchange.last.toFixed(6)}</div>
                        <div className="text-xs text-muted-foreground">
                          Фандинг: <span className="font-mono">{a.buyFunding !== undefined ? `${a.buyFunding.toFixed(4)}%` : 'N/A'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Время: {formatFundingTime(a.buyFundingTime)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-muted-foreground/20">
                      <span className="text-sm font-semibold">Спред</span>
                      <span className={cn('text-sm font-bold tabular-nums', a.spread > 0 ? 'text-green-500' : 'text-red-500')}>
                        {a.spread > 0 ? '+' : ''}
                        {a.spread.toFixed(2)}%
                      </span>
                    </div>
                  </CardHeader>
                </Card>
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
              const spread = (r.ratio - 1) * 100;
              const isSelected = selectedFairArb?.ticker === r.ticker && selectedFairArb?.exchange === r.exchange;

              return (
                <Card
                  key={`${r.ticker}_${r.exchange}_fair`}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-2 w-full',
                    isSelected ? 'ring-2 ring-primary shadow-lg border-primary' : 'border-muted-foreground/20',
                  )}
                  onClick={() => handleFairArbSelect(r)}
                >
                  <CardHeader className="pb-2 pt-2 px-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold tabular-nums">{r.ticker}</CardTitle>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Copy
                              className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard
                                  .writeText(r.ticker)
                                  .then(() => {
                                    toast.success(`Тикер ${r.ticker} скопирован`);
                                  })
                                  .catch(() => {
                                    toast.error('Не удалось скопировать тикер');
                                  });
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Копировать</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Star
                              className={cn(
                                'h-4 w-4 transition-colors cursor-pointer',
                                isFavorite(getFairArbPairKey(r))
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-muted-foreground hover:text-yellow-500',
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(getFairArbPairKey(r));
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isFavorite(getFairArbPairKey(r)) ? 'Удалить из избранного' : 'Добавить в избранное'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold tabular-nums', spread > 0 ? 'text-green-500' : 'text-red-500')}>
                          {spread > 0 ? '+' : ''}
                          {spread.toFixed(4)}%
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <EyeOff
                              className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExcluded = new Set(excludedTickers);
                                newExcluded.add(r.ticker);
                                setExcludedTickers(newExcluded);
                                localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(Array.from(newExcluded)));
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Скрыть монету</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <img className="h-4 w-4 rounded-full" src={exchangeImgMap[r.exchange]} alt={r.exchange} />
                        <span className="text-xs font-semibold text-muted-foreground">{r.exchange}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={getExchangeUrl(r.exchange, r.ticker)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Перейти на {r.exchange}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Последняя цена</div>
                          <div className="text-base font-bold tabular-nums">{r.last.toFixed(6)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Справедливая цена</div>
                          <div className="text-base font-bold tabular-nums">{r.fair.toFixed(6)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-muted-foreground/20">
                        <span className="text-sm font-semibold">Отклонение</span>
                        <span className={cn('text-sm font-bold tabular-nums', spread > 0 ? 'text-green-500' : 'text-red-500')}>
                          {spread > 0 ? '+' : ''}
                          {spread.toFixed(4)}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
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
              {favoriteArbsList.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {favoriteArbsList.map((fav) => {
                    const isSelected =
                      fav.type === 'spread'
                        ? selectedArb?.ticker === fav.arb?.ticker &&
                          selectedArb?.left.exchange === fav.arb?.left.exchange &&
                          selectedArb?.right.exchange === fav.arb?.right.exchange
                        : selectedFairArb?.ticker === fav.fair?.ticker && selectedFairArb?.exchange === fav.fair?.exchange;

                    return (
                      <Button
                        key={fav.key}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2 text-xs flex items-center gap-1.5"
                        onClick={() => {
                          if (fav.type === 'spread' && fav.arb) {
                            handleArbSelect({
                              ticker: fav.arb.ticker,
                              left: fav.arb.left,
                              right: fav.arb.right,
                              ratio: fav.arb.ratio,
                            });
                          } else if (fav.type === 'fair' && fav.fair) {
                            handleFairArbSelect(fav.fair);
                          }
                        }}
                      >
                        {fav.type === 'spread' && fav.arb ? (
                          <>
                            <span>{fav.arb.ticker}</span>
                            {exchangeImgMap[fav.arb.left.exchange] && (
                              <img
                                src={exchangeImgMap[fav.arb.left.exchange]}
                                alt={fav.arb.left.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.arb.left.exchange}</span>
                            <span>/</span>
                            {exchangeImgMap[fav.arb.right.exchange] && (
                              <img
                                src={exchangeImgMap[fav.arb.right.exchange]}
                                alt={fav.arb.right.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.arb.right.exchange}</span>
                          </>
                        ) : (
                          <>
                            {fav.fair && exchangeImgMap[fav.fair.exchange] && (
                              <img
                                src={exchangeImgMap[fav.fair.exchange]}
                                alt={fav.fair.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.fair?.ticker}</span>
                            <span>{fav.fair?.exchange}</span>
                          </>
                        )}
                        <X
                          className="h-3 w-3 ml-1 hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasSelected = isSelected;
                            toggleFavorite(fav.key);
                            // Если удаляли выбранный арбитраж, выбираем первый из оставшихся
                            if (wasSelected && favoriteArbsList.length > 1) {
                              const remaining = favoriteArbsList.filter((f) => f.key !== fav.key);
                              if (remaining.length > 0) {
                                const first = remaining[0];
                                if (first.type === 'spread' && first.arb) {
                                  handleArbSelect({
                                    ticker: first.arb.ticker,
                                    left: first.arb.left,
                                    right: first.arb.right,
                                    ratio: first.arb.ratio,
                                  });
                                } else if (first.type === 'fair' && first.fair) {
                                  handleFairArbSelect(first.fair);
                                }
                              }
                            }
                          }}
                        />
                      </Button>
                    );
                  })}
                </div>
              )}
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
                />
              </div>
              {showTradingPanel && (
                <PositionsWidget
                  ticker={selectedEnriched.ticker}
                  leftExchange={selectedArb.left.exchange}
                  rightExchange={selectedArb.right.exchange}
                />
              )}
            </div>
            <div className="flex flex-col min-h-0 h-full w-[200px] flex-shrink-0">
              <div className="flex-1 min-h-0">
                <OrderbookView exchange={selectedEnriched.left.exchange} ticker={selectedEnriched.ticker} />
              </div>
              <div className="flex-1 min-h-0 mt-1">
                <OrderbookView exchange={selectedEnriched.right.exchange} ticker={selectedEnriched.ticker} />
              </div>
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
              {favoriteArbsList.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {favoriteArbsList.map((fav) => {
                    const isSelected =
                      fav.type === 'spread'
                        ? selectedArb?.ticker === fav.arb?.ticker &&
                          selectedArb?.left.exchange === fav.arb?.left.exchange &&
                          selectedArb?.right.exchange === fav.arb?.right.exchange
                        : selectedFairArb?.ticker === fav.fair?.ticker && selectedFairArb?.exchange === fav.fair?.exchange;

                    return (
                      <Button
                        key={fav.key}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2 text-xs flex items-center gap-1.5"
                        onClick={() => {
                          if (fav.type === 'spread' && fav.arb) {
                            handleArbSelect({
                              ticker: fav.arb.ticker,
                              left: fav.arb.left,
                              right: fav.arb.right,
                              ratio: fav.arb.ratio,
                            });
                          } else if (fav.type === 'fair' && fav.fair) {
                            handleFairArbSelect(fav.fair);
                          }
                        }}
                      >
                        {fav.type === 'spread' && fav.arb ? (
                          <>
                            <span>{fav.arb.ticker}</span>
                            {exchangeImgMap[fav.arb.left.exchange] && (
                              <img
                                src={exchangeImgMap[fav.arb.left.exchange]}
                                alt={fav.arb.left.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.arb.left.exchange}</span>
                            <span>/</span>
                            {exchangeImgMap[fav.arb.right.exchange] && (
                              <img
                                src={exchangeImgMap[fav.arb.right.exchange]}
                                alt={fav.arb.right.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.arb.right.exchange}</span>
                          </>
                        ) : (
                          <>
                            {fav.fair && exchangeImgMap[fav.fair.exchange] && (
                              <img
                                src={exchangeImgMap[fav.fair.exchange]}
                                alt={fav.fair.exchange}
                                className="h-3.5 w-3.5 rounded-full"
                              />
                            )}
                            <span>{fav.fair?.ticker}</span>
                            <span>{fav.fair?.exchange}</span>
                          </>
                        )}
                        <X
                          className="h-3 w-3 ml-1 hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasSelected = isSelected;
                            toggleFavorite(fav.key);
                            // Если удаляли выбранный арбитраж, выбираем первый из оставшихся
                            if (wasSelected && favoriteArbsList.length > 1) {
                              const remaining = favoriteArbsList.filter((f) => f.key !== fav.key);
                              if (remaining.length > 0) {
                                const first = remaining[0];
                                if (first.type === 'spread' && first.arb) {
                                  handleArbSelect({
                                    ticker: first.arb.ticker,
                                    left: first.arb.left,
                                    right: first.arb.right,
                                    ratio: first.arb.ratio,
                                  });
                                } else if (first.type === 'fair' && first.fair) {
                                  handleFairArbSelect(first.fair);
                                }
                              }
                            }
                          }}
                        />
                      </Button>
                    );
                  })}
                </div>
              )}
              <div className="mb-1">
                <div
                  className="bg-card rounded px-3 py-1.5 selected-arb-header"
                  style={{
                    border: '1px solid rgba(166, 189, 213, 0.2)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">{selectedFairArb.ticker}</span>

                    <div className="h-4 w-px bg-muted-foreground/30" />

                    <div className="flex items-center gap-2">
                      <img
                        className="h-3.5 w-3.5 rounded-full"
                        src={exchangeImgMap[selectedFairArb.exchange]}
                        alt={selectedFairArb.exchange}
                      />
                      <span className="text-xs font-semibold text-muted-foreground">{selectedFairArb.exchange}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getExchangeUrl(selectedFairArb.exchange, selectedFairArb.ticker)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Перейти на {selectedFairArb.exchange}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="h-4 w-px bg-muted-foreground/30" />

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Последняя цена</span>
                      <span className="text-sm font-bold tabular-nums">{selectedFairArb.last.toFixed(6)}</span>
                    </div>

                    <div className="h-4 w-px bg-muted-foreground/30" />

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Справедливая цена</span>
                      <span className="text-sm font-bold tabular-nums">{selectedFairArb.fair.toFixed(6)}</span>
                    </div>

                    <div className="h-4 w-px bg-muted-foreground/30" />

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Отклонение</span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          (selectedFairArb.ratio - 1) * 100 > 0 ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {(selectedFairArb.ratio - 1) * 100 > 0 ? '+' : ''}
                        {((selectedFairArb.ratio - 1) * 100).toFixed(4)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
