import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAppSelector } from '../store';
import { DataService } from '../api/common/data.service';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';
import { MexcOrderbook } from '../api/mexc.models';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

interface OrderbookViewProps {
  exchange: string;
  symbol: string;
  ticker: string;
}

export const OrderbookView = ({ exchange, symbol, ticker }: OrderbookViewProps) => {
  const dataService = useAppSelector((state) => state.alorSlice.dataService) as DataService | null;
  const [orderbook, setOrderbook] = useState<Orderbook | MexcOrderbook | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [tickSize, setTickSize] = useState(0.0001); // Шаг цены по умолчанию
  const [centerPrice, setCenterPrice] = useState<number | null>(null);
  const [compression, setCompression] = useState(1); // Сжатие по умолчанию
  const [compressionInput, setCompressionInput] = useState('1');
  const [isCustomCompression, setIsCustomCompression] = useState(false);

  useEffect(() => {
    if (!dataService || !symbol) return;

    let subscription: any;

    const exchangeUpper = exchange.toUpperCase();
    
    try {
      switch (exchangeUpper) {
        case 'MEXC':
          subscription = dataService.mexcSubscribeOrderbook(symbol, 200);
          break;
        case 'BYBIT':
          subscription = dataService.bybitSubscribeOrderbook(symbol, 200);
          break;
        case 'BITGET':
          subscription = dataService.bitgetSubscribeOrderbook(symbol, 200);
          break;
        case 'GATE':
        case 'GATEIO':
          subscription = dataService.gateSubscribeOrderbook(symbol, 200);
          break;
        case 'BINGX':
          subscription = dataService.bingxSubscribeOrderbook(symbol, 200);
          break;
        case 'OKX':
          subscription = dataService.okxSubscribeOrderbook(symbol, 200);
          break;
        default:
          return;
      }

      if (subscription) {
        const sub = subscription.subscribe((data: Orderbook | MexcOrderbook) => {
          setOrderbook(data);
        });
        
        return () => {
          sub.unsubscribe();
        };
      }
    } catch (error) {
      console.error(`Error subscribing to orderbook for ${exchange}:`, error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe?.();
      }
    };
  }, [dataService, exchange, symbol]);

  const asks = orderbook?.asks || [];
  const bids = orderbook?.bids || [];

  // Определяем шаг цены на основе разницы между ценами
  useEffect(() => {
    if (asks.length > 0 && bids.length > 0) {
      const allPrices = [...asks.map(a => a.price), ...bids.map(b => b.price)];
      const sortedPrices = allPrices.sort((a, b) => a - b);
      
      // Находим минимальную разницу между соседними ценами
      let minDiff = Infinity;
      for (let i = 1; i < sortedPrices.length; i++) {
        const diff = sortedPrices[i] - sortedPrices[i - 1];
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
        }
      }
      
      // Определяем шаг цены (tick size) - округляем до разумного значения
      if (minDiff < Infinity && minDiff > 0) {
        // Находим порядок минимальной разницы
        const order = Math.floor(Math.log10(minDiff));
        // Округляем до 0.0001, 0.001, 0.01 и т.д.
        const newTickSize = Math.pow(10, Math.floor(order));
        setTickSize(newTickSize);
      }
    }
  }, [orderbook, asks, bids]);

  // Находим ближайший ask (самый дешевый) и ближайший bid (самый дорогой)
  const sortedAsks = useMemo(() => [...asks].sort((a, b) => a.price - b.price), [asks]);
  const sortedBids = useMemo(() => [...bids].sort((a, b) => b.price - a.price), [bids]);
  const bestAsk = sortedAsks.length > 0 ? sortedAsks[0] : null;
  const bestBid = sortedBids.length > 0 ? sortedBids[0] : null;

  // Определяем центральную цену (средняя между bestAsk и bestBid)
  useEffect(() => {
    if (bestAsk && bestBid) {
      setCenterPrice((bestAsk.price + bestBid.price) / 2);
    } else if (bestAsk) {
      setCenterPrice(bestAsk.price);
    } else if (bestBid) {
      setCenterPrice(bestBid.price);
    }
  }, [bestAsk, bestBid]);

  // Создаем карту цен для быстрого доступа к данным с учетом compression
  const priceDataMap = useMemo(() => {
    const map = new Map<number, { type: 'ask' | 'bid'; volume: number }>();
    const compressionTickSize = tickSize * compression;
    
    // Агрегируем asks
    asks.forEach(ask => {
      const price = Math.round(ask.price / compressionTickSize) * compressionTickSize;
      const volume = (ask as any).value ?? (ask as any).volume ?? 0;
      const existing = map.get(price);
      if (existing && existing.type === 'ask') {
        map.set(price, { type: 'ask', volume: existing.volume + volume });
      } else if (!existing) {
        map.set(price, { type: 'ask', volume });
      }
    });
    
    // Агрегируем bids
    bids.forEach(bid => {
      const price = Math.round(bid.price / compressionTickSize) * compressionTickSize;
      const volume = (bid as any).value ?? (bid as any).volume ?? 0;
      const existing = map.get(price);
      if (existing && existing.type === 'bid') {
        map.set(price, { type: 'bid', volume: existing.volume + volume });
      } else if (!existing) {
        map.set(price, { type: 'bid', volume });
      }
    });
    
    return map;
  }, [asks, bids, tickSize, compression]);

  // Находим максимальный объем для нормализации ширины
  const maxVolume = useMemo(() => Math.max(
    ...asks.map((a) => (a as any).value ?? (a as any).volume ?? 0),
    ...bids.map((b) => (b as any).value ?? (b as any).volume ?? 0),
    1,
  ), [asks, bids]);

  // Константы для виртуального скролла
  const ROW_HEIGHT = 20;
  const TOTAL_ROWS = 200000; // Большое количество строк для бесконечного скролла
  const totalHeight = TOTAL_ROWS * ROW_HEIGHT;

  // Вычисляем compressionTickSize
  const compressionTickSize = useMemo(() => tickSize * compression, [tickSize, compression]);

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
    Math.ceil((scrollTop + (scrollContainerRef.current?.clientHeight || 0)) / ROW_HEIGHT)
  );
  const visibleRows = Math.min(visibleEnd - visibleStart, 100); // Ограничиваем для производительности

  // Обработчик изменения compression
  const handleCompressionChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomCompression(true);
    } else {
      setIsCustomCompression(false);
      setCompression(parseInt(value, 10));
      setCompressionInput(value);
    }
  };

  // Обработчик ввода custom compression
  const handleCompressionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompressionInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setCompression(numValue);
    }
  };

  if (!orderbook) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-0.5 pt-1">
          <CardTitle className="text-sm font-semibold">{exchange}</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Загрузка стакана...
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-0.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{exchange}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Сжатие:</span>
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
                    setCompression(1);
                    setCompressionInput('1');
                  }
                }}
                className="h-7 w-20 text-xs"
                placeholder="1"
              />
            ) : (
              <Select value={compression.toString()} onValueChange={handleCompressionChange}>
                <SelectTrigger className="h-7 w-20 text-xs">
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
        className="flex-1 overflow-y-auto px-2 pb-1 min-h-0"
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Виртуальный рендеринг - отображаем только видимые строки */}
          {Array.from({ length: visibleRows }, (_, i) => {
            const rowIndex = visibleStart + i;
            if (rowIndex < 0 || rowIndex >= TOTAL_ROWS) return null;
            
            const price = getPriceForRow(rowIndex);
            const roundedPrice = Math.round(price / compressionTickSize) * compressionTickSize;
            const data = priceDataMap.get(roundedPrice);
            const isAsk = data?.type === 'ask';
            const isBid = data?.type === 'bid';
            const volume = data?.volume ?? 0;
            const widthPercent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
            const isBestLevel = (bestAsk && Math.abs(roundedPrice - bestAsk.price) < compressionTickSize / 2) ||
                               (bestBid && Math.abs(roundedPrice - bestBid.price) < compressionTickSize / 2);
            
            return (
              <div
                key={rowIndex}
                style={{
                  position: 'absolute',
                  top: `${rowIndex * ROW_HEIGHT}px`,
                  left: 0,
                  right: 0,
                  height: `${ROW_HEIGHT}px`,
                }}
                className={cn(
                  "relative text-xs",
                  isBestLevel && "bg-muted/30"
                )}
              >
                <div className="flex justify-between items-center relative z-10 px-1 h-full">
                  <span className={cn(
                    "font-mono",
                    isAsk ? "text-red-400" : isBid ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {roundedPrice.toFixed(4)}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {volume > 0 ? volume.toFixed(4) : ''}
                  </span>
                </div>
                {volume > 0 && (
                  <div
                    className={cn(
                      "absolute top-0 right-0 h-full opacity-30",
                      isAsk ? "bg-red-500/20" : "bg-green-500/20"
                    )}
                    style={{ width: `${widthPercent}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
