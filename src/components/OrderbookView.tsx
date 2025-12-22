import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useAppSelector } from '../store';
import { DataService } from '../api/common/data.service';
import { OrderbookAsk, OrderbookBid } from 'alor-api';
import { exchangeImgMap } from '../utils';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { OrderbookManager, OrderbookPriceLevel } from '../api/common/orderbook-manager';

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
  symbol: string;
  ticker: string;
}

export const OrderbookView = ({ exchange, symbol, ticker }: OrderbookViewProps) => {
  const dataService = useAppSelector((state) => state.alorSlice.dataService) as DataService | null;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orderbookManagerRef = useRef<OrderbookManager | null>(null);
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
  
  // Центральная цена (средняя между bestAsk и bestBid)
  const centerPrice = useMemo(() => {
    if (bestAsk && bestBid) {
      return (bestAsk.price + bestBid.price) / 2;
    } else if (bestAsk) {
      return bestAsk.price;
    } else if (bestBid) {
      return bestBid.price;
    }
    return null;
  }, [bestAsk, bestBid]);

  // Инициализация OrderbookManager
  useEffect(() => {
    if (!dataService || !symbol) {
      setHasData(false);
      return;
    }

    // Создаем менеджер
    const manager = new OrderbookManager({
      dataService,
      exchange,
      symbol,
    });

    // Синхронизируем compression с менеджером
    manager.setCompression(compression);

    // Подписываемся на обновления данных
    const subscription = manager.dataUpdate$.subscribe((data) => {
      setPriceCache(data.priceCache);
      setTickSize(data.tickSize);
      setBestAsk(data.bestAsk);
      setBestBid(data.bestBid);
      setHasData(true);
    });

    orderbookManagerRef.current = manager;

    return () => {
      subscription.unsubscribe();
      manager.destroy();
      orderbookManagerRef.current = null;
      setHasData(false);
    };
  }, [dataService, exchange, symbol]);

  // Находим максимальный объем для нормализации ширины из кэша
  const maxVolume = useMemo(() => {
    const volumes = Array.from(priceCache.values()).map(v => v.volume);
    return Math.max(...volumes, 1);
  }, [priceCache]);

  // Константы для виртуального скролла
  const ROW_HEIGHT = 20;
  const TOTAL_ROWS = 200000; // Большое количество строк для бесконечного скролла
  const totalHeight = TOTAL_ROWS * ROW_HEIGHT;

  // Вычисляем compressionTickSize
  const compressionTickSize = useMemo(() => tickSize * compression, [tickSize, compression]);
  
  // Вычисляем количество знаков после запятой на основе compression
  // compression = 1 → 5 знаков, compression = 10 → 4 знака, compression = 100 → 3 знака и т.д.
  const priceDecimals = useMemo(() => {
    if (compression <= 1) return 5;
    // Находим порядок compression (логарифм по основанию 10)
    const order = Math.floor(Math.log10(compression));
    // Уменьшаем количество знаков на порядок: 5 - order
    // Но не меньше 0
    return Math.max(5 - order, 0);
  }, [compression]);

  // Вычисляем цену для строки на основе позиции скролла с учетом compression
  const getPriceForRow = useCallback((rowIndex: number) => {
    if (centerPrice === null) return 0;
    // Центрируем на centerPrice в середине всех строк
    const centerRow = TOTAL_ROWS / 2;
    const priceOffset = (rowIndex - centerRow) * compressionTickSize;
    return centerPrice + priceOffset;
  }, [centerPrice, compressionTickSize, TOTAL_ROWS]);

  // Обработчик скролла
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Обработчик нажатия Shift для центрирования
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && scrollContainerRef.current && centerPrice !== null) {
        // Центрируем на centerPrice
        const centerRow = TOTAL_ROWS / 2;
        const scrollTo = centerRow * ROW_HEIGHT - (scrollContainerRef.current.clientHeight / 2);
        scrollContainerRef.current.scrollTop = Math.max(0, scrollTo);
        setScrollTop(scrollTo);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerPrice, TOTAL_ROWS, ROW_HEIGHT]);

  // Инициализация скролла при первой загрузке
  useEffect(() => {
    if (scrollContainerRef.current && centerPrice !== null && scrollTop === 0) {
      const centerRow = TOTAL_ROWS / 2;
      const initialScroll = centerRow * ROW_HEIGHT - (scrollContainerRef.current.clientHeight / 2);
      scrollContainerRef.current.scrollTop = Math.max(0, initialScroll);
      setScrollTop(initialScroll);
    }
  }, [centerPrice, scrollTop, TOTAL_ROWS, ROW_HEIGHT]);

  // Вычисляем видимые строки для виртуального рендеринга
  const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleEnd = Math.min(
    TOTAL_ROWS,
    Math.ceil((scrollTop + (dimensions.height || 0)) / ROW_HEIGHT)
  );
  const visibleRows = Math.min(visibleEnd - visibleStart, 100); // Ограничиваем для производительности

  // Определяем размеры canvas
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Отрисовка на canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasData || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размеры canvas с учетом devicePixelRatio для четкости
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = dimensions.width;
    const displayHeight = dimensions.height;
    
    // Устанавливаем внутренние размеры canvas
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    // Заливаем canvas фоном проекта из CSS переменной --background
    const root = document.documentElement;
    const backgroundValue = getComputedStyle(root).getPropertyValue('--background').trim();
    let backgroundColor = 'rgb(23, 35, 46)'; // дефолтный темный фон из .dark
    
    if (backgroundValue) {
      if (backgroundValue.startsWith('rgb')) {
        backgroundColor = backgroundValue;
      } else if (backgroundValue.startsWith('oklch')) {
        // Для oklch используем дефолтный цвет
        backgroundColor = 'rgb(23, 35, 46)';
      }
    }
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Настройки для текста
    ctx.font = '11px monospace';
    ctx.textBaseline = 'middle';

    const paddingX = 8;
    const volumeWidth = dimensions.width * 0.4; // 40% для объема

    // Отрисовываем видимые строки
    for (let i = 0; i < visibleRows; i++) {
      const rowIndex = visibleStart + i;
      if (rowIndex < 0 || rowIndex >= TOTAL_ROWS) continue;

      const price = getPriceForRow(rowIndex);
      const roundedPrice = Math.round(price / compressionTickSize) * compressionTickSize;
      const data = priceCache.get(roundedPrice);
      const isAsk = data?.type === 'ask';
      const isBid = data?.type === 'bid';
      const volume = data?.volume ?? 0;
      const widthPercent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
      const isBestLevel = (bestAsk && Math.abs(roundedPrice - bestAsk.price) < compressionTickSize / 2) ||
                         (bestBid && Math.abs(roundedPrice - bestBid.price) < compressionTickSize / 2);

      const y = rowIndex * ROW_HEIGHT - scrollTop;
      if (y < -ROW_HEIGHT || y > dimensions.height) continue;

      // Фон для лучшего уровня
      if (isBestLevel) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.1)';
        ctx.fillRect(0, y, dimensions.width, ROW_HEIGHT);
      }

      // Фон для asks/bids - используем те же цвета, что в спреде (green-500 и red-500), но более прозрачные
      if (isAsk) {
        // red-500: rgb(239, 68, 68) с меньшей прозрачностью
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, y, dimensions.width, ROW_HEIGHT);
      } else if (isBid) {
        // green-500: rgb(34, 197, 94) с меньшей прозрачностью
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(0, y, dimensions.width, ROW_HEIGHT);
      }

      // Линия заполнения объема (золотая)
      if (volume > 0) {
        const fillWidth = (widthPercent / 100) * volumeWidth;
        ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.fillRect(paddingX, y, fillWidth, ROW_HEIGHT);
      }

      // Текст объема (слева) - рисуем поверх всего
      if (volume > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // белый
        ctx.textAlign = 'left';
        const volumeText = formatCompact(volume);
        ctx.fillText(volumeText, paddingX, y + ROW_HEIGHT / 2);
      }

      // Текст цены (справа) - рисуем поверх всего
      const priceText = roundedPrice.toFixed(priceDecimals);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // белый
      ctx.fillText(priceText, dimensions.width - paddingX, y + ROW_HEIGHT / 2);
    }
  }, [scrollTop, dimensions, centerPrice, priceCache, maxVolume, compressionTickSize, bestAsk, bestBid, getPriceForRow, totalHeight, hasData, visibleStart, visibleRows, priceDecimals]);

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
      <Card className="h-full flex flex-col pb-0 border-muted-foreground/20 overflow-hidden gap-0">
        <CardHeader className="pb-0 pt-0.5 px-3">
          <CardTitle className="text-sm font-semibold">{exchange}</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Загрузка стакана...
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col pb-0 border-muted-foreground/20 overflow-hidden gap-0">
      <CardHeader className="pb-0 pt-0.5 px-3 border-b border-muted-foreground/20">
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
          <div className="flex items-center gap-2">
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
                  } else {
                    localStorage.setItem('orderbook_compression', compressionInput);
                  }
                }}
                className="h-7 w-20 text-xs"
                placeholder="100"
              />
            ) : (
              <Select value={compression.toString()} onValueChange={handleCompressionChange}>
                <SelectTrigger size="sm" className="h-3.5 w-20 text-xs">
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
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </Card>
  );
};
