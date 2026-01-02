import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';

/**
 * Таймфрейм для свечей Toobit
 */
export enum ToobitTimeframe {
  Min1 = '1m',
  Min5 = '5m',
  Min15 = '15m',
  Min30 = '30m',
  Hour1 = '1h',
  Hour2 = '2h',
  Hour4 = '4h',
  Hour6 = '6h',
  Hour12 = '12h',
  Day = '1d',
  Week = '1w',
  Month = '1M',
}

/**
 * Запрос подписки на свечи через WebSocket
 */
interface ToobitWSKlineSubscribeRequest {
  id: string;
  topic: string;
  event: 'sub' | 'cancel';
  symbol: string;
  params: {
    reduceSerial: boolean;
    binary: boolean;
    klineType: string;
    realtimeInterval: string;
    limit: number;
  };
}

export class ToobitFuturesWsClient extends SubscriptionManager {
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super({
      name: 'Toobit Futures',
      url: 'wss://bws.toobit.com/ws/quote/v1?lang=',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Toobit Futures Websocket соединение разорвано`);
    this.stopPing();
  }

  protected onOpen() {
    console.log(`Toobit Futures Websocket соединение установлено`);
    this.startPing();
  }

  onMessage(ev) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка pong ответа
      if (message.pong) {
        return;
      }

      // Обработка канала kline (свечи)
      if (message.topic && message.topic.startsWith('kline_')) {
        const key = `kline:${message.id || message.topic}`;
        const subj = this.subscribeSubjs.get(key);

        if (subj && message.data) {
          // Обрабатываем данные свечи
          const klineData = Array.isArray(message.data) ? message.data[0] : message.data;
          if (klineData) {
            subj.next({
              open: Number(klineData.o || klineData.open),
              high: Number(klineData.h || klineData.high),
              low: Number(klineData.l || klineData.low),
              close: Number(klineData.c || klineData.close),
              time: Math.round((klineData.t || klineData.time) / 1000),
              timestamp: klineData.t || klineData.time,
            });
          }
        }
        return;
      }
    } catch (error) {
      console.error('Toobit WebSocket message error:', error);
    }
  }

  /**
   * Запускает отправку ping сообщений каждые 30 секунд
   */
  private startPing() {
    this.stopPing();

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMessage = {
          ping: Date.now(), // timestamp в миллисекундах
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 30000); // 30 секунд
  }

  /**
   * Останавливает отправку ping сообщений
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Преобразует resolution в формат Toobit
   */
  private convertResolutionToToobitInterval(resolution: string): ToobitTimeframe {
    const resolutionMap: Record<string, ToobitTimeframe> = {
      '1': ToobitTimeframe.Min1,
      '5': ToobitTimeframe.Min5,
      '15': ToobitTimeframe.Min15,
      '30': ToobitTimeframe.Min30,
      '60': ToobitTimeframe.Hour1,
      '120': ToobitTimeframe.Hour2,
      '240': ToobitTimeframe.Hour4,
      '360': ToobitTimeframe.Hour6,
      '720': ToobitTimeframe.Hour12,
      'D': ToobitTimeframe.Day,
      'W': ToobitTimeframe.Week,
      'M': ToobitTimeframe.Month,
    };
    return resolutionMap[resolution] || ToobitTimeframe.Min1;
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToToobitInterval(resolution);
    const id = `kline_${symbol}${interval}`;
    const topic = `kline_${interval}`;
    const key = `kline:${id}`;
    const subj = this.createOrUpdateSubj(key);

    const subscribeMessage: ToobitWSKlineSubscribeRequest = {
      id,
      topic,
      event: 'sub',
      symbol,
      params: {
        reduceSerial: true,
        binary: true,
        klineType: interval,
        realtimeInterval: '24h',
        limit: 1500,
      },
    };

    this.subscribe(subscribeMessage);

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToToobitInterval(resolution);
    const id = `kline_${symbol}${interval}`;
    const topic = `kline_${interval}`;
    const key = `kline:${id}`;

    const unsubscribeMessage: ToobitWSKlineSubscribeRequest = {
      id,
      topic,
      event: 'cancel',
      symbol,
      params: {
        reduceSerial: true,
        binary: true,
        klineType: interval,
        realtimeInterval: '24h',
        limit: 1500,
      },
    };

    this.unsubscribe(unsubscribeMessage);
    this.removeSubj(key);
  }
}

