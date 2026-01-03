import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class BinanceFuturesWsClient extends SubscriptionManager {
  private readonly eventHandlers: Record<string, (message: any) => void> = {
    kline: (msg) => this.handleKlineMessage(msg),
    depthUpdate: (msg) => this.handleDepthMessage(msg),
  };

  constructor() {
    super({
      name: 'Binance Futures',
      url: `wss://fstream.binance.com/ws`,
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Binance Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Binance Futures Websocket соединение установлено`);
  }

  onMessage(ev) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка ответов на подписку/отписку
      if (message.result === null && message.id) {
        // Это ответ на subscribe/unsubscribe, игнорируем
        return;
      }

      // Обработка ping/pong
      if (message.ping) {
        // Отправляем pong
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ pong: message.ping }));
        }
        return;
      }

      // Диспетчеризация по типу события
      if (message.e) {
        const handler = this.eventHandlers[message.e];
        if (handler) {
          handler(message);
          return;
        }
      }
    } catch (error) {
      console.error('Binance WebSocket message error:', error);
    }
  }

  private handleKlineMessage(message: any) {
    if (message.k) {
      const { k } = message;
      const interval = k.i; // 1m, 5m, 1h и т.д.
      const key = `${k.s.toLowerCase()}@kline_${interval}`;
      this.subscribeSubjs.get(key)?.next({
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        time: Math.round(k.t / 1000),
        timestamp: k.T,
      });
    }
  }

  private handleDepthMessage(message: any) {
    const { s, b, a } = message;
    const key = `${s.toLowerCase()}@depth20@100ms`;
    const orderbook: Orderbook = {
      bids: (b || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookBid[],
      asks: (a || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookAsk[],
    };
    this.subscribeSubjs.get(key)?.next(orderbook);
  }


  subscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase();
    const stream = `${symbolLower}@depth20@100ms`;
    return this.subscribeStream<Orderbook>(stream);
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase();
    const stream = `${symbolLower}@depth20@100ms`;
    this.unsubscribeStream(stream);
  }

  subscribeCandles(symbol: string, resolution: string) {
    const symbolLower = symbol.toLowerCase();
    // Преобразуем resolution в формат Binance (1m, 5m, 1h и т.д.)
    const interval = this.convertResolutionToBinanceInterval(resolution);
    const stream = `${symbolLower}@kline_${interval}`;
    return this.subscribeStream(stream).pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const symbolLower = symbol.toLowerCase();
    const interval = this.convertResolutionToBinanceInterval(resolution);
    const stream = `${symbolLower}@kline_${interval}`;
    this.unsubscribeStream(stream);
  }

  private convertResolutionToBinanceInterval(resolution: string): string {
    // Преобразуем resolution в формат Binance
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
      'D': '1d',
      'W': '1w',
      'M': '1M',
    };
    return resolutionMap[resolution] || '1m';
  }

  subscribeQuotes(symbol: string) {
    const symbolLower = symbol.toLowerCase();
    const stream = `${symbolLower}@ticker`;
    return this.subscribeStream(stream);
  }

  unsubscribeQuotes(symbol: string) {
    const symbolLower = symbol.toLowerCase();
    const stream = `${symbolLower}@ticker`;
    this.unsubscribeStream(stream);
  }

  private subscribeStream<T = any>(stream: string): Subject<T> {
    const subj = this.createOrUpdateSubj<T>(stream);
    
    const streamId = Date.now();
    this.subscribe({
      method: 'SUBSCRIBE',
      params: [stream],
      id: streamId,
    });

    return subj;
  }

  private unsubscribeStream(stream: string) {
    this.removeSubj(stream);
    const streamId = Date.now();
    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: streamId,
    });

    this.removeSubscription({
      method: 'SUBSCRIBE',
      params: [stream],
      id: streamId,
    });
  }
}

