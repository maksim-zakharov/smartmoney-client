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
  onDataUpdate?: (priceCache: Map<number, OrderbookPriceLevel>, tickSize: number, bestAsk: OrderbookAsk | null, bestBid: OrderbookBid | null) => void;
}

export class OrderbookManager {
  private dataService: DataService;
  private exchange: string;
  private symbol: string;
  private subscription: Subscription | null = null;
  private wsSubscription: any = null;
  
  // Кэш для хранения всех уровней цен
  private priceCache = new Map<number, OrderbookPriceLevel>();
  
  // Текущие данные стакана
  private currentOrderbook: Orderbook | MexcOrderbook | null = null;
  
  // Настройки
  private tickSize = 0.0001;
  private compression = 100;
  
  // Колбэк для уведомления об обновлениях
  private onDataUpdate?: (priceCache: Map<number, OrderbookPriceLevel>, tickSize: number, bestAsk: OrderbookAsk | null, bestBid: OrderbookBid | null) => void;
  
  // Subject для уведомлений об изменениях
  public dataUpdate$ = new Subject<{
    priceCache: Map<number, OrderbookPriceLevel>;
    tickSize: number;
    bestAsk: OrderbookAsk | null;
    bestBid: OrderbookBid | null;
  }>();

  constructor(config: OrderbookManagerConfig) {
    this.dataService = config.dataService;
    this.exchange = config.exchange;
    this.symbol = config.symbol;
    this.onDataUpdate = config.onDataUpdate;
    
    // Загружаем compression из localStorage
    const saved = localStorage.getItem('orderbook_compression');
    if (saved) {
      this.compression = parseInt(saved, 10);
    }
    
    this.subscribe();
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

