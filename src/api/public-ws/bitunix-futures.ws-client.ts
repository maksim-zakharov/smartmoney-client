import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class BitunixFuturesWsClient extends SubscriptionManager {
  // Хранилище текущих стаканов для объединения bids и asks
  private orderbookCache = new Map<string, Orderbook>();

  constructor() {
    super({
      name: 'Bitunix Futures',
      url: 'wss://fapi.bitunix.com/public/',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
    this.on('error', (m) => this.onError(m));
  }

  protected onError(error) {
    console.error('Bitunix WebSocket error:', error);
  }

  protected onClose() {
    console.log(`Bitunix Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Bitunix Futures Websocket соединение установлено`);
  }

  /**
   * Маппинг каналов на обработчики событий
   */
  private readonly channelHandlers: Record<string, (message: any) => void> = {
    'depth_book1': (message) => this.handleDepthBook1(message),
    'kline': (message) => this.handleKline(message),
    'depth': (message) => this.handleDepth(message),
  };

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка ответов на подписку/отписку
      if (message.event === 'subscribed' || message.event === 'unsubscribed' || message.code === 0) {
        console.log('Bitunix subscription response:', message);
        return;
      }

      // Обработка префиксных каналов (mark_kline_*)
      if (message.ch && message.ch.startsWith('mark_kline_') && message.data && message.symbol) {
        this.handleMarkKline(message);
        return;
      }

      // Обработка событий через маппинг
      if (message.ch && this.channelHandlers[message.ch] && message.data && message.symbol) {
        this.channelHandlers[message.ch](message);
        return;
      }

      // Обработка стакана, если данные находятся в корне сообщения (без канала)
      if (message.symbol && (message.bids || message.asks)) {
        this.handleOrderbookInRoot(message);
        return;
      }
    } catch (error) {
      console.error('Bitunix WebSocket message error:', error);
    }
  }

  /**
   * Обработка события depth_book1 (новый формат стакана)
   */
  private handleDepthBook1(message: { data: any; symbol: string }): void {
    const symbol = message.symbol.toUpperCase();
    const key = `depth_${symbol}`;

    const orderbook: Orderbook = {
      bids: (message.data.b || []).map(([price, qty]: [string | number, string | number]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookBid[],
      asks: (message.data.a || []).map(([price, qty]: [string | number, string | number]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookAsk[],
    };

    this.subscribeSubjs.get(key)?.next(orderbook);
  }

  /**
   * Обработка события mark_kline (свечи справедливой цены)
   */
  private handleMarkKline(message: { ch: string; data: any; symbol: string }): void {
    const symbol = message.symbol;
    const k = message.data.k || message.data;

    if (k) {
      const key = `${symbol}_fair`;
      this.subscribeSubjs.get(key)?.next({
        close: Number(k.c || k.close),
        price: Number(k.c || k.close), // Для совместимости с aggregateFairPriceToCandles
      });
    }
  }

  /**
   * Обработка события kline (обычные свечи)
   */
  private handleKline(message: { data: any; symbol: string; interval?: string; k?: any }): void {
    const symbol = message.symbol;
    const interval = message.interval || message.k?.i; // Интервал свечи
    const k = message.data.k || message.k || message.data;

    if (k) {
      const key = `kline_${interval}_${symbol}`;
      this.subscribeSubjs.get(key)?.next({
        open: Number(k.o || k.open),
        high: Number(k.h || k.high),
        low: Number(k.l || k.low),
        close: Number(k.c || k.close),
        time: Math.round((k.t || k.time || k.closeTime) / 1000),
        timestamp: k.t || k.time || k.closeTime,
      });
    }
  }

  /**
   * Обработка события depth (основной формат стакана)
   */
  private handleDepth(message: { data: any; symbol: string }): void {
    const symbol = message.symbol.toUpperCase();
    const key = `depth_${symbol}`;

    // Получаем или создаем стакан в кэше
    if (!this.orderbookCache.has(key)) {
      this.orderbookCache.set(key, {
        bids: [],
        asks: [],
      });
    }

    const orderbook = this.orderbookCache.get(key)!;
    const data = message.data;

    // Обновляем bids и asks
    if (data.bids && Array.isArray(data.bids)) {
      orderbook.bids = data.bids
        .map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        }))
        .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookBid[];
    }

    if (data.asks && Array.isArray(data.asks)) {
      orderbook.asks = data.asks
        .map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        }))
        .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookAsk[];
    }

    // Отправляем обновленный стакан только если есть данные
    if (orderbook.bids.length > 0 || orderbook.asks.length > 0) {
      this.subscribeSubjs.get(key)?.next({
        bids: [...orderbook.bids],
        asks: [...orderbook.asks],
      });
    }
  }

  /**
   * Обработка стакана, если данные находятся в корне сообщения (без канала)
   */
  private handleOrderbookInRoot(message: { symbol: string; bids?: any[]; asks?: any[] }): void {
    const symbol = message.symbol.toUpperCase();
    const key = `depth_${symbol}`;

    if (!this.orderbookCache.has(key)) {
      this.orderbookCache.set(key, {
        bids: [],
        asks: [],
      });
    }

    const orderbook = this.orderbookCache.get(key)!;

    if (message.bids && Array.isArray(message.bids)) {
      orderbook.bids = message.bids
        .map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        }))
        .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookBid[];
    }

    if (message.asks && Array.isArray(message.asks)) {
      orderbook.asks = message.asks
        .map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        }))
        .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookAsk[];
    }

    if (orderbook.bids.length > 0 || orderbook.asks.length > 0) {
      this.subscribeSubjs.get(key)?.next({
        bids: [...orderbook.bids],
        asks: [...orderbook.asks],
      });
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitunixInterval(resolution);
    const key = `kline_${interval}_${symbol}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      op: 'subscribe',
      args: [
        {
          symbol,
          ch: 'kline',
          interval,
        },
      ],
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitunixInterval(resolution);
    const key = `kline_${interval}_${symbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      op: 'unsubscribe',
      args: [
        {
          symbol,
          ch: 'kline',
          interval,
        },
      ],
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // Bitunix использует формат без дефиса: BTC-USDT -> BTCUSDT
    const symbolNormalized = symbol.toUpperCase().replace('-', '');
    const key = `depth_${symbolNormalized}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    this.subscribe({
      op: 'subscribe',
      args: [
        {
          symbol: symbolNormalized,
          ch: 'depth_book1',
        },
      ],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    // Bitunix использует формат без дефиса: BTC-USDT -> BTCUSDT
    const symbolNormalized = symbol.toUpperCase().replace('-', '');
    const key = `depth_${symbolNormalized}`;
    this.removeSubj(key);
    this.orderbookCache.delete(key);

    this.unsubscribe({
      op: 'unsubscribe',
      args: [
        {
          symbol: symbolNormalized,
          ch: 'depth_book1',
        },
      ],
    });

    this.removeSubscription({
      op: 'subscribe',
      args: [
        {
          symbol: symbolNormalized,
          ch: 'depth_book1',
        },
      ],
    });
  }

  subscribeFairPrice(symbol: string) {
    const key = `${symbol}_fair`;
    const subj = this.createOrUpdateSubj<{ close?: number; price?: number }>(key);

    this.subscribe({
      op: 'subscribe',
      args: [
        {
          symbol,
          ch: 'mark_kline_1min', // Используем 1min для получения обновлений справедливой цены
        },
      ],
    });

    return subj;
  }

  unsubscribeFairPrice(symbol: string) {
    const key = `${symbol}_fair`;
    this.removeSubj(key);

    this.unsubscribe({
      op: 'unsubscribe',
      args: [
        {
          symbol,
          ch: 'mark_kline_1min',
        },
      ],
    });

    this.removeSubscription({
      op: 'subscribe',
      args: [
        {
          symbol,
          ch: 'mark_kline_1min',
        },
      ],
    });
  }

  private convertResolutionToBitunixInterval(resolution: string): string {
    // Преобразуем resolution в формат Bitunix
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '120': '2h',
      '240': '4h',
      '360': '6h',
      '480': '8h',
      '720': '12h',
      D: '1d',
      W: '1w',
      M: '1M',
    };
    return resolutionMap[resolution] || '1m';
  }
}
