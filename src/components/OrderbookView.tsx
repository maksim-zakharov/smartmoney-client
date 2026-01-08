import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useAppSelector } from '../store';
import { DataService } from '../api/common/data.service';
import { OrderbookAsk, OrderbookBid } from 'alor-api';
import { exchangeImgMap } from '../utils';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { OrderbookManager, OrderbookPriceLevel } from '../api/common/orderbook-manager';
import { TradingService } from '../api/trading.service';
import { getTickerWithSuffix } from '../api/utils/tickers';

// Функция для компактного форматирования чисел (без дробных)
const formatCompact = (value: number): string => {
  if (value === 0) return '';
  if (value < 1000) return Math.round(value).toString();
  if (value < 1000000) return `${Math.round(value / 1000)}K`;
  if (value < 1000000000) return `${Math.round(value / 1000000)}M`;
  return `${Math.round(value / 1000000000)}B`;
};

interface OrderbookViewProps {
  exchange: string;
  ticker: string;
}

export const OrderbookView = ({ exchange, ticker }: OrderbookViewProps) => {
  const dataService = useAppSelector((state) => state.alorSlice.dataService) as DataService | null;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orderbookManagerRef = useRef<OrderbookManager | null>(null);
  const tradingServiceRef = useRef<TradingService | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  
  // Данные из OrderbookManager
  const [priceCache, setPriceCache] = useState<Map<number, OrderbookPriceLevel>>(new Map());
  const [tickSize, setTickSize] = useState(0.0001);
  const [bestAsk, setBestAsk] = useState<OrderbookAsk | null>(null);
  const [bestBid, setBestBid] = useState<OrderbookBid | null>(null);
  const [hasData, setHasData] = useState(false);
  
  // Загружаем compression из localStorage при инициализации
  const [compression, setCompression] = useState(() => {
    const saved = localStorage.getItem('orderbook_compression');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [compressionInput, setCompressionInput] = useState(() => {
    const saved = localStorage.getItem('orderbook_compression');
    return saved || '100';
  });
  const [isCustomCompression, setIsCustomCompression] = useState(false);
  

  // Обработчик клика по строке
  const handleRowClick = useCallback((price: number) => {
    console.log('Клик по цене:', price);
    // Здесь можно добавить дополнительную логику, например, открыть диалог или скопировать цену
  }, []);

  const symbol = useMemo(
    () => {
      if (!exchange || !ticker) {
        console.warn('OrderbookView: missing exchange or ticker', { exchange, ticker });
        return '';
      }
      return getTickerWithSuffix(exchange, ticker);
    },
    [exchange, ticker],
  );

  // Инициализация OrderbookManager
  useEffect(() => {
    console.log('OrderbookView useEffect:', { exchange, ticker, symbol, hasDataService: !!dataService });
    if (!dataService || !symbol) {
      console.warn('OrderbookView: missing dataService or symbol', { dataService: !!dataService, symbol });
      setHasData(false);
      return;
    }

    console.log('init orderbook', { exchange, symbol, hasDataService: !!dataService });

    // Создаем менеджер с canvas
    const manager = new OrderbookManager({
      dataService,
      exchange,
      symbol,
      canvas: canvasRef.current,
      onRowClick: handleRowClick,
    });

    // Синхронизируем compression с менеджером
    manager.setCompression(compression);

    // Подписываемся на обновления данных (только для hasData)
    const subscription = manager.dataUpdate$.subscribe((data) => {
      setHasData(true);
    });

    orderbookManagerRef.current = manager;

    return () => {
      subscription.unsubscribe();
      manager.destroy();
      orderbookManagerRef.current = null;
      setHasData(false);
    };
  }, [dataService, exchange, symbol, compression, handleRowClick]);

  // Передаем canvas в менеджер при изменении и обновляем dimensions
  useEffect(() => {
    if (orderbookManagerRef.current && canvasRef.current && scrollContainerRef.current) {
      orderbookManagerRef.current.setCanvas(canvasRef.current);
      
      // Обновляем dimensions после установки canvas с небольшой задержкой
      const updateDimensions = () => {
        if (scrollContainerRef.current) {
          const rect = scrollContainerRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const newDimensions = { width: rect.width, height: rect.height };
            setDimensions(newDimensions);
            if (orderbookManagerRef.current) {
              orderbookManagerRef.current.setDimensions(newDimensions.width, newDimensions.height);
            }
          }
        }
      };
      
      // Используем requestAnimationFrame для гарантии, что DOM обновлен
      requestAnimationFrame(() => {
        requestAnimationFrame(updateDimensions);
      });
    }
  }, [canvasRef.current, hasData]);

  // Константы для виртуального скролла
  const ROW_HEIGHT = 20;
  const TOTAL_ROWS = 200000; // Большое количество строк для бесконечного скролла
  const totalHeight = TOTAL_ROWS * ROW_HEIGHT;

  // Обработчик скролла
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    if (orderbookManagerRef.current) {
      orderbookManagerRef.current.setScrollTop(newScrollTop);
    }
  }, []);

  // Обработчик движения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!orderbookManagerRef.current || !canvasRef.current || !scrollContainerRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollContainerRect = scrollContainerRef.current.getBoundingClientRect();
    // Координата мыши относительно canvas с учетом скролла контейнера
    const mouseY = e.clientY - scrollContainerRect.top + scrollContainerRef.current.scrollTop;
    orderbookManagerRef.current.setHoveredRow(mouseY);
  }, []);

  // Обработчик ухода мыши
  const handleMouseLeave = useCallback(() => {
    if (orderbookManagerRef.current) {
      orderbookManagerRef.current.setHoveredRow(null);
    }
  }, []);

  // Инициализация trading service
  useEffect(() => {
    if (!tradingServiceRef.current) {
      tradingServiceRef.current = new TradingService();
    }
  }, []);

  // Функция для размещения ордера
  const placeOrder = useCallback(async (
    exchange: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    price: number,
  ) => {
    if (!tradingServiceRef.current) {
      alert('Сервис торговли не инициализирован');
      return;
    }

    try {
      // Получаем токен/ключи для биржи
      const exchangeUpper = exchange.toUpperCase();
      let authToken: string | null = null;
      let apiKey: string | null = null;
      let secretKey: string | null = null;

      switch (exchangeUpper) {
        case 'MEXC':
          // Для MEXC используем authToken (WEB authentication key)
          authToken = localStorage.getItem('mexcAuthToken') || localStorage.getItem('mexcUid');
          if (!authToken) {
            alert('Auth Token MEXC не найден. Пожалуйста, настройте его в настройках.');
            return;
          }
          break;
        default:
          alert(`Биржа ${exchange} не поддерживается для торговли`);
          return;
      }

      // Раньше здесь запрашивался объем у пользователя через prompt.
      // Сейчас объем фиксирован: эквивалент примерно 6 USDT, пересчитанный в монетки.
      // Объем на мексе передается в монетках, поэтому считаем quantity = ceil(6 / price).
      const usdAmount = 60;
      const quantity = Math.ceil(usdAmount / price);

      // Размещаем ордер через trading service
      const result = await tradingServiceRef.current.placeLimitOrder({
        exchange: exchangeUpper,
        authToken: authToken || undefined,
        apiKey: apiKey || undefined,
        secretKey: secretKey || undefined,
        symbol,
        side,
        price,
        quantity,
        leverage: 10, // По умолчанию плечо 10
      });

      alert(`Ордер размещен успешно! OrderID: ${result.data?.orderId || 'N/A'}`);
    } catch (error: any) {
      console.error('Ошибка при размещении ордера:', error);
      alert(`Ошибка при размещении ордера: ${error.message || 'Неизвестная ошибка'}`);
    }
  }, []);
  
  // Обработчик левого клика (покупка)
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Проверяем флаг в localStorage для разрешения торговли по клику
    const enableOrderbookTrading = localStorage.getItem('enableOrderbookTrading') === 'true';
    if (!enableOrderbookTrading) {
      return; // Торговля по клику отключена
    }

    if (!orderbookManagerRef.current || !canvasRef.current || !scrollContainerRef.current) return;
    
    const scrollContainerRect = scrollContainerRef.current.getBoundingClientRect();
    // Координата мыши относительно canvas с учетом скролла контейнера
    const mouseY = e.clientY - scrollContainerRect.top + scrollContainerRef.current.scrollTop;
    const price = orderbookManagerRef.current.getPriceAtPosition(mouseY);
    
    if (price === null) return;
    
    // Размещаем ордер только для MEXC
    if (exchange.toUpperCase() === 'MEXC') {
      await placeOrder(exchange, symbol, 'BUY', price);
    }
  }, [exchange, symbol, placeOrder]);
  
  // Обработчик правого клика (продажа)
  const handleContextMenu = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Предотвращаем стандартное контекстное меню
    
    // Проверяем флаг в localStorage для разрешения торговли по клику
    const enableOrderbookTrading = localStorage.getItem('enableOrderbookTrading') === 'true';
    if (!enableOrderbookTrading) {
      return; // Торговля по клику отключена
    }
    
    if (!orderbookManagerRef.current || !canvasRef.current || !scrollContainerRef.current) return;
    
    const scrollContainerRect = scrollContainerRef.current.getBoundingClientRect();
    // Координата мыши относительно canvas с учетом скролла контейнера
    const mouseY = e.clientY - scrollContainerRect.top + scrollContainerRef.current.scrollTop;
    const price = orderbookManagerRef.current.getPriceAtPosition(mouseY);
    
    if (price === null) return;
    
    // Размещаем ордер только для MEXC
    if (exchange.toUpperCase() === 'MEXC') {
      await placeOrder(exchange, symbol, 'SELL', price);
    }
  }, [exchange, symbol, placeOrder]);

  // Функция для центрирования стакана
  const centerOrderbook = useCallback(() => {
    if (!scrollContainerRef.current || !hasData) return;
    
    const centerRow = TOTAL_ROWS / 2;
    const scrollTo = centerRow * ROW_HEIGHT - (scrollContainerRef.current.clientHeight / 2);
    scrollContainerRef.current.scrollTop = Math.max(0, scrollTo);
    setScrollTop(scrollTo);
    if (orderbookManagerRef.current) {
      orderbookManagerRef.current.setScrollTop(scrollTo);
    }
  }, [hasData, TOTAL_ROWS, ROW_HEIGHT]);

  // Обработчик нажатия Shift для центрирования
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && hasData) {
        centerOrderbook();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasData, centerOrderbook]);

  // Инициализация скролла при первой загрузке
  useEffect(() => {
    if (hasData && scrollTop === 0) {
      // Используем небольшую задержку, чтобы убедиться, что размеры установлены
      const timer = setTimeout(() => {
        centerOrderbook();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasData, scrollTop, centerOrderbook]);

  // Центрирование при изменении compression
  useEffect(() => {
    if (hasData && compression > 0) {
      // Используем задержку, чтобы дать время менеджеру обновить данные
      const timer = setTimeout(() => {
        centerOrderbook();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [compression, hasData, centerOrderbook]);

  // Определяем размеры canvas
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const newDimensions = { width: rect.width, height: rect.height };
          setDimensions(newDimensions);
          if (orderbookManagerRef.current) {
            orderbookManagerRef.current.setDimensions(newDimensions.width, newDimensions.height);
          }
        }
      }
    };

    // Используем requestAnimationFrame для отложенного обновления после рендера
    requestAnimationFrame(() => {
      updateDimensions();
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    
    window.addEventListener('resize', () => {
      requestAnimationFrame(updateDimensions);
    });
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Отрисовка теперь происходит напрямую в OrderbookManager, минуя React

  // Обработчик изменения compression
  const handleCompressionChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomCompression(true);
    } else {
      setIsCustomCompression(false);
      const numValue = parseInt(value, 10);
      setCompression(numValue);
      setCompressionInput(value);
      // Обновляем в менеджере
      if (orderbookManagerRef.current) {
        orderbookManagerRef.current.setCompression(numValue);
      }
    }
  };

  // Обработчик ввода custom compression
  const handleCompressionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompressionInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setCompression(numValue);
      // Обновляем в менеджере
      if (orderbookManagerRef.current) {
        orderbookManagerRef.current.setCompression(numValue);
      }
    }
  };

  if (!hasData) {
    return (
      <Card className="h-full flex flex-col pb-0 overflow-hidden gap-0 rounded">
      <CardHeader className="py-0.5 px-1.5">
        <CardTitle className="text-xs font-semibold">{exchange}</CardTitle>
      </CardHeader>
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-xs">
          Загрузка стакана...
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col pb-0 border-muted-foreground/20 overflow-hidden gap-0 rounded">
      <CardHeader className="py-0.5 px-1.5 border-b border-muted-foreground/20">
        <div className="flex items-center justify-between gap-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            {exchangeImgMap[exchange.toUpperCase()] && (
              <img
                src={exchangeImgMap[exchange.toUpperCase()]}
                alt={exchange}
                className="h-3.5 w-3.5 rounded-full"
              />
            )}
            {exchange}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isCustomCompression ? (
              <Input
                type="number"
                min="1"
                value={compressionInput}
                onChange={handleCompressionInputChange}
                onBlur={() => {
                  const numValue = parseInt(compressionInput, 10);
                  if (isNaN(numValue) || numValue <= 0) {
                    setIsCustomCompression(false);
                    setCompression(100);
                    setCompressionInput('100');
                    localStorage.setItem('orderbook_compression', '100');
                    if (orderbookManagerRef.current) {
                      orderbookManagerRef.current.setCompression(100);
                    }
                  } else {
                    localStorage.setItem('orderbook_compression', compressionInput);
                    if (orderbookManagerRef.current) {
                      orderbookManagerRef.current.setCompression(numValue);
                    }
                  }
                }}
                className="h-6 w-16 text-[10px] px-1"
                placeholder="100"
              />
            ) : (
              <Select value={compression.toString()} onValueChange={handleCompressionChange}>
                <SelectTrigger size="xss" className="w-16 text-[10px] px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="custom">Свое</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 relative overflow-y-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
          <canvas
            ref={canvasRef}
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              width: '100%',
              height: dimensions.height || '100%',
              display: 'block',
              cursor: 'pointer',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>
    </Card>
  );
};
