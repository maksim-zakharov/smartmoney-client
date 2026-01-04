import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class HotcoinFuturesWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'Hotcoin Futures',
      url: 'wss://wss-ct.hotcoin.fit',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Hotcoin Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Hotcoin Futures Websocket соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка ping - отвечаем pong
      if (message.event === 'ping') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'pong' }));
        }
        return;
      }

      // Обработка pong
      if (message.event === 'pong') {
        return;
      }

      // Обработка ответов на подписку
      if (message.channel === 'subscribe' && message.data?.result === true) {
        return;
      }

      // Обработка данных свечей
      if (message.type === 'candles' && message.data) {
        this.handleKlineMessage(message);
        return;
      }

      // Обработка данных mark candles (fair price)
      if (message.type === 'mark_candles' && message.data) {
        this.handleMarkKlineMessage(message);
        return;
      }

      // Обработка данных стакана
      if (message.type === 'depth' && message.data) {
        this.handleDepthMessage(message);
        return;
      }
    } catch (error) {
      console.error('Hotcoin Futures WebSocket message error:', error);
    }
  }

  private handleKlineMessage(message: any) {
    const contractCode = message.contractCode?.toLowerCase(); // btcusdt
    const granularity = message.granularity; // 1min
    const key = `candles_${contractCode}_${granularity}`;

    if (Array.isArray(message.data) && message.data.length > 0) {
      // Обрабатываем массив свечей
      message.data.forEach((candle: any[]) => {
        // Формат: [timestamp, open, high, low, close, volume, quote_volume]
        if (candle.length >= 6) {
          this.subscribeSubjs.get(key)?.next({
            open: Number(candle[1]),
            high: Number(candle[2]),
            low: Number(candle[3]),
            close: Number(candle[4]),
            time: Math.round(candle[0] / 1000), // timestamp в миллисекундах -> секунды
            timestamp: candle[0],
          });
        }
      });
    }
  }

  private handleMarkKlineMessage(message: any) {
    const contractCode = message.contractCode?.toLowerCase(); // btcusdt
    const key = `${contractCode}_fair`;

    if (Array.isArray(message.data) && message.data.length > 0) {
      // Обрабатываем массив mark candles
      message.data.forEach((candle: any[]) => {
        // Формат: [timestamp, open, high, low, close, ...]
        if (candle.length >= 5) {
          this.subscribeSubjs.get(key)?.next({
            close: Number(candle[4]),
            price: Number(candle[4]), // Для совместимости с aggregateFairPriceToCandles
          });
        }
      });
    }
  }

  private handleDepthMessage(message: any) {
    const contractCode = message.contractCode?.toLowerCase(); // btcusdt
    const key = `depth_${contractCode}`;

    if (message.data) {
      const orderbook: Orderbook = {
        bids: (message.data.bids || []).map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookBid[],
        asks: (message.data.asks || []).map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookAsk[],
      };
      this.subscribeSubjs.get(key)?.next(orderbook);
    }
  }

  /**
   * Нормализует символ для Hotcoin
   * BTC-USDT -> btcusdt
   * BTC -> btcusdt
   */
  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.toLowerCase().replace('-', '').replace('_', '');
    // Если символ не заканчивается на usdt, добавляем его
    if (!normalized.endsWith('usdt')) {
      return normalized + 'usdt';
    }
    return normalized;
  }

  /**
   * Преобразует resolution в формат Hotcoin
   */
  private convertResolutionToHotcoinGranularity(resolution: string): string {
    const resolutionMap: Record<string, string> = {
      '1': '1min',
      '3': '3min',
      '5': '5min',
      '15': '15min',
      '30': '30min',
      '60': '1hour',
      '120': '2hour',
      '240': '4hour',
      '360': '6hour',
      '480': '6hour', // Fallback, 8hour не поддерживается
      '720': '12hour',
      D: 'day',
      W: 'week',
      M: 'week', // Fallback, month не поддерживается
    };
    return resolutionMap[resolution] || '1min';
  }

  subscribeCandles(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const granularity = this.convertResolutionToHotcoinGranularity(resolution);
    const key = `candles_${normalizedSymbol}_${granularity}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const granularity = this.convertResolutionToHotcoinGranularity(resolution);
    const key = `candles_${normalizedSymbol}_${granularity}`;
    this.removeSubj(key);

    this.unsubscribe({
      event: 'unsubscribe',
      params: {
        biz: 'perpetual',
        type: 'candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });

    this.removeSubscription({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `depth_${normalizedSymbol}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    this.subscribe({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'depth',
        contractCode: normalizedSymbol,
        zip: false,
        serialize: false,
      },
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `depth_${normalizedSymbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      event: 'unsubscribe',
      params: {
        biz: 'perpetual',
        type: 'depth',
        contractCode: normalizedSymbol,
        zip: false,
        serialize: false,
      },
    });

    this.removeSubscription({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'depth',
        contractCode: normalizedSymbol,
        zip: false,
        serialize: false,
      },
    });
  }

  subscribeFairPrice(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const granularity = this.convertResolutionToHotcoinGranularity(resolution);
    const key = `${normalizedSymbol}_fair`;
    const subj = this.createOrUpdateSubj<{ close?: number; price?: number }>(key);

    this.subscribe({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'mark_candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });

    return subj;
  }

  unsubscribeFairPrice(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const granularity = this.convertResolutionToHotcoinGranularity(resolution);
    const key = `${normalizedSymbol}_fair`;
    this.removeSubj(key);

    this.unsubscribe({
      event: 'unsubscribe',
      params: {
        biz: 'perpetual',
        type: 'mark_candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });

    this.removeSubscription({
      event: 'subscribe',
      params: {
        biz: 'perpetual',
        type: 'mark_candles',
        contractCode: normalizedSymbol,
        granularity,
        zip: false,
        serialize: false,
      },
    });
  }
}
