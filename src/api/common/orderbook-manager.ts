import { Subject, Subscription } from 'rxjs';
import { DataService } from './data.service';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';
import { MexcOrderbook } from '../mexc.models';

export interface OrderbookPriceLevel {
  type: 'ask' | 'bid';
  volume: number;
}

export interface OrderbookManagerConfig {
  dataService: DataService;
  exchange: string;
  symbol: string;
  canvas: HTMLCanvasElement | null;
  onDataUpdate?: (priceCache: Map<number, OrderbookPriceLevel>, tickSize: number, bestAsk: OrderbookAsk | null, bestBid: OrderbookBid | null) => void;
}

// Функция для компактного форматирования чисел (без дробных)
const formatCompact = (value: number): string => {
  if (value === 0) return '';
  if (value < 1000) return Math.round(value).toString();
  if (value < 1000000) return `${Math.round(value / 1000)}K`;
  if (value < 1000000000) return `${Math.round(value / 1000000)}M`;
  return `${Math.round(value / 1000000000)}B`;
};

export class OrderbookManager {
  private dataService: DataService;
  private exchange: string;
  private symbol: string;
  private subscription: Subscription | null = null;
  private wsSubscription: any = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // Кэш для хранения всех уровней цен
  private priceCache = new Map<number, OrderbookPriceLevel>();
  
  // Текущие данные стакана
  private currentOrderbook: Orderbook | MexcOrderbook | null = null;
  
  // Настройки
  private tickSize = 0.0001;
  private compression = 100;
  
  // Параметры для отрисовки
  private scrollTop = 0;
  private dimensions = { width: 0, height: 0 };
  
  // Колбэк для уведомления об обновлениях
  private onDataUpdate?: (priceCache: Map<number, OrderbookPriceLevel>, tickSize: number, bestAsk: OrderbookAsk | null, bestBid: OrderbookBid | null) => void;
  
  // Subject для уведомлений об изменениях
  public dataUpdate$ = new Subject<{
    priceCache: Map<number, OrderbookPriceLevel>;
    tickSize: number;
    bestAsk: OrderbookAsk | null;
    bestBid: OrderbookBid | null;
  }>();
  
  // Константы для виртуального скролла
  private readonly ROW_HEIGHT = 20;
  private readonly TOTAL_ROWS = 200000;

  constructor(config: OrderbookManagerConfig) {
    this.dataService = config.dataService;
    this.exchange = config.exchange;
    this.symbol = config.symbol;
    this.canvas = config.canvas;
    this.onDataUpdate = config.onDataUpdate;
    
    // Загружаем compression из localStorage
    const saved = localStorage.getItem('orderbook_compression');
    if (saved) {
      this.compression = parseInt(saved, 10);
    }
    
    this.subscribe();
  }
  
  public setCanvas(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    if (this.canvas && this.priceCache.size > 0) {
      this.draw();
    }
  }
  
  public setScrollTop(scrollTop: number) {
    this.scrollTop = scrollTop;
    this.draw();
  }
  
  public setDimensions(width: number, height: number) {
    this.dimensions = { width, height };
    this.draw();
  }

  private subscribe() {
    if (!this.dataService || !this.symbol) {
      return;
    }

    const exchangeUpper = this.exchange.toUpperCase();
    
    try {
      switch (exchangeUpper) {
        case 'MEXC':
          this.wsSubscription = this.dataService.mexcSubscribeOrderbook(this.symbol, 200);
          break;
        case 'BYBIT':
          this.wsSubscription = this.dataService.bybitSubscribeOrderbook(this.symbol, 200);
          break;
        case 'BITGET':
          this.wsSubscription = this.dataService.bitgetSubscribeOrderbook(this.symbol, 15);
          break;
        case 'GATE':
        case 'GATEIO':
          this.wsSubscription = this.dataService.gateSubscribeOrderbook(this.symbol, 400);
          break;
        case 'BINGX':
          this.wsSubscription = this.dataService.bingxSubscribeOrderbook(this.symbol, 100);
          break;
        case 'OKX':
          this.wsSubscription = this.dataService.okxSubscribeOrderbook(this.symbol, 200);
          break;
        case 'OURBIT':
          this.wsSubscription = this.dataService.ourbitSubscribeOrderbook(this.symbol, 200);
          break;
        case 'KUCOIN':
          this.wsSubscription = this.dataService.kucoinSubscribeOrderbook(this.symbol, 200);
          break;
        default:
          return;
      }

      if (this.wsSubscription) {
        this.subscription = this.wsSubscription.subscribe({
          next: (data: Orderbook | MexcOrderbook) => {
            this.handleOrderbookUpdate(data);
          },
          error: () => {
            // Ошибка обрабатывается без логирования
          },
        });
      }
    } catch (error) {
      // Ошибка обрабатывается без логирования
    }
  }

  private handleOrderbookUpdate(orderbook: Orderbook | MexcOrderbook) {
    this.currentOrderbook = orderbook;
    
    const asks = orderbook.asks || [];
    const bids = orderbook.bids || [];
    
    // Обновляем tickSize на основе данных
    this.updateTickSize(asks, bids);
    
    // Обновляем кэш
    this.updatePriceCache(asks, bids);
    
    // Вычисляем bestAsk и bestBid
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
    const sortedBids = [...bids].sort((a, b) => b.price - a.price);
    const bestAsk = sortedAsks.length > 0 ? sortedAsks[0] : null;
    const bestBid = sortedBids.length > 0 ? sortedBids[0] : null;
    
    // Уведомляем об обновлении
    this.notifyUpdate(bestAsk, bestBid);
  }

  private updateTickSize(asks: OrderbookAsk[], bids: OrderbookBid[]) {
    if (asks.length === 0 || bids.length === 0) {
      return;
    }
    
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
      this.tickSize = Math.pow(10, Math.floor(order));
    }
  }

  private updatePriceCache(asks: OrderbookAsk[], bids: OrderbookBid[]) {
    const compressionTickSize = this.tickSize * this.compression;
    
    // Обновляем только те уровни, которые пришли в новом обновлении
    // Для asks - заменяем объем (вебсокет присылает полные данные, а не дельты)
    asks.forEach(ask => {
      const price = Math.round(ask.price / compressionTickSize) * compressionTickSize;
      const volume = (ask as any).value ?? (ask as any).volume ?? 0;
      
      if (volume > 0) {
        // Заменяем объем для этого уровня (не суммируем)
        this.priceCache.set(price, { type: 'ask', volume });
      } else {
        // Если объем 0, удаляем уровень из кэша
        this.priceCache.delete(price);
      }
    });
    
    // Для bids - заменяем объем (вебсокет присылает полные данные, а не дельты)
    bids.forEach(bid => {
      const price = Math.round(bid.price / compressionTickSize) * compressionTickSize;
      const volume = (bid as any).value ?? (bid as any).volume ?? 0;
      
      if (volume > 0) {
        // Заменяем объем для этого уровня (не суммируем)
        this.priceCache.set(price, { type: 'bid', volume });
      } else {
        // Если объем 0, удаляем уровень из кэша
        this.priceCache.delete(price);
      }
    });
  }

  private notifyUpdate(bestAsk: OrderbookAsk | null, bestBid: OrderbookBid | null) {
    // Создаем копию кэша для передачи
    const priceCacheCopy = new Map(this.priceCache);
    
    // Вызываем колбэк если есть
    if (this.onDataUpdate) {
      this.onDataUpdate(priceCacheCopy, this.tickSize, bestAsk, bestBid);
    }
    
    // Отправляем через Subject
    this.dataUpdate$.next({
      priceCache: priceCacheCopy,
      tickSize: this.tickSize,
      bestAsk,
      bestBid,
    });
    
    // Отрисовываем на canvas
    this.draw();
  }
  
  private draw() {
    if (!this.canvas || this.priceCache.size === 0 || this.dimensions.width === 0 || this.dimensions.height === 0) {
      return;
    }
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    // Устанавливаем размеры canvas с учетом devicePixelRatio для четкости
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.dimensions.width;
    const displayHeight = this.dimensions.height;
    
    // Устанавливаем внутренние размеры canvas
    if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;
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
    const volumeWidth = this.dimensions.width * 0.4; // 40% для объема
    
    // Вычисляем compressionTickSize
    const compressionTickSize = this.tickSize * this.compression;
    
    // Вычисляем количество знаков после запятой на основе compression
    const priceDecimals = this.compression <= 1 ? 5 : Math.max(5 - Math.floor(Math.log10(this.compression)), 0);
    
    // Вычисляем центральную цену из bestAsk и bestBid
    const askPrices = Array.from(this.priceCache.entries())
      .filter(([_, d]) => d.type === 'ask')
      .map(([p]) => p)
      .sort((a, b) => a - b);
    const bidPrices = Array.from(this.priceCache.entries())
      .filter(([_, d]) => d.type === 'bid')
      .map(([p]) => p)
      .sort((a, b) => b - a);
    
    const bestAskPrice = askPrices[0];
    const bestBidPrice = bidPrices[0];
    
    let centerPrice: number | null = null;
    if (bestAskPrice !== undefined && bestBidPrice !== undefined) {
      centerPrice = (bestAskPrice + bestBidPrice) / 2;
    } else if (bestAskPrice !== undefined) {
      centerPrice = bestAskPrice;
    } else if (bestBidPrice !== undefined) {
      centerPrice = bestBidPrice;
    }
    
    if (centerPrice === null) return;
    
    // Вычисляем видимые строки
    const visibleStart = Math.floor(this.scrollTop / this.ROW_HEIGHT);
    const visibleEnd = Math.min(
      this.TOTAL_ROWS,
      Math.ceil((this.scrollTop + this.dimensions.height) / this.ROW_HEIGHT)
    );
    const visibleRows = Math.min(visibleEnd - visibleStart, 100);
    
    // Находим максимальный объем
    const volumes = Array.from(this.priceCache.values()).map(v => v.volume);
    const maxVolume = Math.max(...volumes, 1);
    
    // Функция для вычисления цены для строки
    const getPriceForRow = (rowIndex: number) => {
      const centerRow = this.TOTAL_ROWS / 2;
      const priceOffset = (rowIndex - centerRow) * compressionTickSize;
      return centerPrice! + priceOffset;
    };
    
    // Отрисовываем видимые строки
    for (let i = 0; i < visibleRows; i++) {
      const rowIndex = visibleStart + i;
      if (rowIndex < 0 || rowIndex >= this.TOTAL_ROWS) continue;
      
      const price = getPriceForRow(rowIndex);
      const roundedPrice = Math.round(price / compressionTickSize) * compressionTickSize;
      const data = this.priceCache.get(roundedPrice);
      const isAsk = data?.type === 'ask';
      const isBid = data?.type === 'bid';
      const volume = data?.volume ?? 0;
      const widthPercent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
      const isBestLevel = (bestAskPrice !== undefined && Math.abs(roundedPrice - bestAskPrice) < compressionTickSize / 2) ||
                         (bestBidPrice !== undefined && Math.abs(roundedPrice - bestBidPrice) < compressionTickSize / 2);
      
      const y = rowIndex * this.ROW_HEIGHT - this.scrollTop;
      if (y < -this.ROW_HEIGHT || y > this.dimensions.height) continue;
      
      // Фон для лучшего уровня
      if (isBestLevel) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.1)';
        ctx.fillRect(0, y, this.dimensions.width, this.ROW_HEIGHT);
      }
      
      // Фон для asks/bids
      if (isAsk) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, y, this.dimensions.width, this.ROW_HEIGHT);
      } else if (isBid) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(0, y, this.dimensions.width, this.ROW_HEIGHT);
      }
      
      // Линия заполнения объема (золотая)
      if (volume > 0) {
        const fillWidth = (widthPercent / 100) * volumeWidth;
        ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.fillRect(paddingX, y, fillWidth, this.ROW_HEIGHT);
      }
      
      // Текст объема (слева)
      if (volume > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.textAlign = 'left';
        const volumeText = formatCompact(volume);
        ctx.fillText(volumeText, paddingX, y + this.ROW_HEIGHT / 2);
      }
      
      // Текст цены (справа)
      const priceText = roundedPrice.toFixed(priceDecimals);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillText(priceText, this.dimensions.width - paddingX, y + this.ROW_HEIGHT / 2);
    }
  }

  public setCompression(compression: number) {
    this.compression = compression;
    localStorage.setItem('orderbook_compression', compression.toString());
    
    // Пересчитываем кэш с новой компрессией
    if (this.currentOrderbook) {
      const asks = this.currentOrderbook.asks || [];
      const bids = this.currentOrderbook.bids || [];
      this.priceCache.clear();
      this.updatePriceCache(asks, bids);
      
      const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
      const sortedBids = [...bids].sort((a, b) => b.price - a.price);
      const bestAsk = sortedAsks.length > 0 ? sortedAsks[0] : null;
      const bestBid = sortedBids.length > 0 ? sortedBids[0] : null;
      this.notifyUpdate(bestAsk, bestBid);
    }
  }

  public getCompression(): number {
    return this.compression;
  }

  public getPriceCache(): Map<number, OrderbookPriceLevel> {
    return new Map(this.priceCache);
  }

  public getTickSize(): number {
    return this.tickSize;
  }

  public destroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.wsSubscription = null;
    this.priceCache.clear();
    this.currentOrderbook = null;
    this.dataUpdate$.complete();
  }
}

