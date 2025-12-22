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
  

  // Инициализация OrderbookManager
  useEffect(() => {
    if (!dataService || !symbol) {
      setHasData(false);
      return;
    }

    // Создаем менеджер с canvas
    const manager = new OrderbookManager({
      dataService,
      exchange,
      symbol,
      canvas: canvasRef.current,
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
  }, [dataService, exchange, symbol, compression]);

  // Передаем canvas в менеджер при изменении
  useEffect(() => {
    if (orderbookManagerRef.current && canvasRef.current) {
      orderbookManagerRef.current.setCanvas(canvasRef.current);
    }
  }, [canvasRef.current]);

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

  // Обработчик нажатия Shift для центрирования
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && scrollContainerRef.current && hasData) {
        // Центрируем на середине
        const centerRow = TOTAL_ROWS / 2;
        const scrollTo = centerRow * ROW_HEIGHT - (scrollContainerRef.current.clientHeight / 2);
        scrollContainerRef.current.scrollTop = Math.max(0, scrollTo);
        setScrollTop(scrollTo);
        if (orderbookManagerRef.current) {
          orderbookManagerRef.current.setScrollTop(scrollTo);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasData, TOTAL_ROWS, ROW_HEIGHT]);

  // Инициализация скролла при первой загрузке
  useEffect(() => {
    if (scrollContainerRef.current && hasData && scrollTop === 0) {
      const centerRow = TOTAL_ROWS / 2;
      const initialScroll = centerRow * ROW_HEIGHT - (scrollContainerRef.current.clientHeight / 2);
      scrollContainerRef.current.scrollTop = Math.max(0, initialScroll);
      setScrollTop(initialScroll);
      if (orderbookManagerRef.current) {
        orderbookManagerRef.current.setScrollTop(initialScroll);
      }
    }
  }, [hasData, scrollTop, TOTAL_ROWS, ROW_HEIGHT]);

  // Определяем размеры canvas
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const newDimensions = { width: rect.width, height: rect.height };
        setDimensions(newDimensions);
        if (orderbookManagerRef.current) {
          orderbookManagerRef.current.setDimensions(newDimensions.width, newDimensions.height);
        }
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
