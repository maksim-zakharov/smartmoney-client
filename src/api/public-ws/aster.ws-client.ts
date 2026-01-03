import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { AsterTimeframe } from './aster.models';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class AsterWsClient extends SubscriptionManager {
  private readonly eventHandlers: Record<string, (message: any) => void> = {
    kline: (msg) => this.handleKlineMessage(msg),
    depthUpdate: (msg) => this.handleDepthMessage(msg),
  };

  constructor() {
    super({
      url: 'wss://fstream.asterdex.com/ws',
      name: 'Aster',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log(`Aster Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`Aster Websocket соединение разорвано`);
  }

  onMessage(ev) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка ответов на подписку/отписку
      if (message.id && (message.result === null || message.result === undefined)) {
        // Это ответ на subscribe/unsubscribe, игнорируем
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
      console.error('Aster WebSocket message error:', error);
    }
  }

  private handleKlineMessage(message: any) {
    if (message.k) {
      const { k } = message;
      const interval = k.i; // 1m, 5m, 1h и т.д.
      const symbol = k.s.toLowerCase();
      const key = `${symbol}@kline_${interval}`;
      this.subscribeSubjs.get(key)?.next({
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        time: Math.round(k.t / 1000),
        timestamp: k.T || k.t,
      });
    }
  }

  private handleDepthMessage(message: any) {
    const { s, b, a } = message;
    const symbol = s.toLowerCase();
    // Определяем ключ по символу и глубине (по умолчанию используем @depth@100ms)
    const key = `${symbol}@depth@100ms`;
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

  subscribeCandles(symbol: string, resolution: string) {
    const symbolLower = symbol.toLowerCase();
    const interval = this.convertResolutionToAsterInterval(resolution);
    const stream = `${symbolLower}@kline_${interval}`;
    const subj = this.createOrUpdateSubj(stream);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const symbolLower = symbol.toLowerCase();
    const interval = this.convertResolutionToAsterInterval(resolution);
    const stream = `${symbolLower}@kline_${interval}`;
    this.removeSubj(stream);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });

    this.removeSubscription({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase();
    // ASTER поддерживает @depth, @depth@500ms, @depth@100ms
    // Используем @depth@100ms для более частых обновлений
    const stream = `${symbolLower}@depth@100ms`;
    const subj = this.createOrUpdateSubj<Orderbook>(stream);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase();
    const stream = `${symbolLower}@depth@100ms`;
    this.removeSubj(stream);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });

    this.removeSubscription({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });
  }

  private convertResolutionToAsterInterval(resolution: string): string {
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

