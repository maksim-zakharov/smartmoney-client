import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class PhemexFuturesWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'Phemex Futures',
      url: 'wss://ws.phemex.com',
      pingRequest: () => ({
        method: 'ping',
      }),
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Phemex Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Phemex Futures Websocket соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка pong
      if (message.pong) {
        return;
      }

      // Обработка ответа на подписку
      if (message.id && message.result === 'ok') {
        return;
      }

      // Обработка свечей (kline)
      if (message.type === 'incremental' && message.topic && message.topic.startsWith('kline')) {
        const parts = message.topic.split('.');
        const symbol = parts[1]; // BTCUSDT
        const interval = parts[2]; // 60, 300, 900 и т.д. (секунды)

        if (message.data && Array.isArray(message.data) && message.data.length > 0) {
          const kline = message.data[message.data.length - 1]; // Берем последнюю свечу
          const key = `kline_${symbol}_${interval}`;
          this.subscribeSubjs.get(key)?.next({
            open: Number(kline[1]), // open
            high: Number(kline[2]), // high
            low: Number(kline[3]), // low
            close: Number(kline[4]), // close
            time: Math.round(kline[0] / 1000), // timestamp в секундах
            timestamp: kline[0], // timestamp в миллисекундах
          });
        }
        return;
      }

      // Обработка стакана (orderbook_p)
      // Формат ответа: { "orderbook_p": { "asks": [[price, qty], ...], "bids": [[price, qty], ...] }, "symbol": "BTCUSDT", "sequence": 123 }
      if (message.orderbook_p || (message.symbol && (message.bids || message.asks))) {
        const symbol = message.symbol || 'UNKNOWN';
        const orderbookData = message.orderbook_p || message;

        const orderbook: Orderbook = {
          bids: (orderbookData.bids || []).map(([price, qty]: [string | number, string | number]) => ({
            price: Number(price),
            volume: Number(qty),
          })) as OrderbookBid[],
          asks: (orderbookData.asks || []).map(([price, qty]: [string | number, string | number]) => ({
            price: Number(price),
            volume: Number(qty),
          })) as OrderbookAsk[],
        };
        const key = `orderbook_${symbol}`;
        this.subscribeSubjs.get(key)?.next(orderbook);
        return;
      }
    } catch (error) {
      console.error('Phemex WebSocket message error:', error);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToPhemexInterval(resolution);
    // Phemex использует формат без дефиса: DASH-USDT -> DASHUSDT (верхний регистр)
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const topic = `kline.${symbolUpper}.${interval}`;
    const key = `kline_${symbolUpper}_${interval}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      method: 'subscribe',
      params: [topic],
      id: Date.now(),
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToPhemexInterval(resolution);
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const topic = `kline.${symbolUpper}.${interval}`;
    const key = `kline_${symbolUpper}_${interval}`;
    this.removeSubj(key);

    this.unsubscribe({
      method: 'unsubscribe',
      params: [topic],
      id: Date.now(),
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // Phemex использует формат без дефиса: DASH-USDT -> DASHUSDT (верхний регистр)
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const key = `orderbook_${symbolUpper}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    // depth может быть: 0, 1, 5, 10, 30 (где 0 = полный стакан)
    // Преобразуем depth в допустимое значение
    let phemexDepth = 0; // По умолчанию полный стакан
    if (depth <= 1) {
      phemexDepth = 1;
    } else if (depth <= 5) {
      phemexDepth = 5;
    } else if (depth <= 10) {
      phemexDepth = 10;
    } else if (depth <= 30) {
      phemexDepth = 30;
    } else {
      phemexDepth = 0; // Для больших значений используем полный стакан
    }

    this.subscribe({
      id: Date.now(),
      method: 'orderbook_p.subscribe',
      params: [symbolUpper, false, phemexDepth],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const key = `orderbook_${symbolUpper}`;
    this.removeSubj(key);

    // Преобразуем depth в допустимое значение (как при подписке)
    let phemexDepth = 0;
    if (depth <= 1) {
      phemexDepth = 1;
    } else if (depth <= 5) {
      phemexDepth = 5;
    } else if (depth <= 10) {
      phemexDepth = 10;
    } else if (depth <= 30) {
      phemexDepth = 30;
    }

    this.unsubscribe({
      id: Date.now(),
      method: 'orderbook_p.unsubscribe',
      params: [symbolUpper, false, phemexDepth],
    });
  }

  private convertResolutionToPhemexInterval(resolution: string): string {
    // Phemex использует формат: kline.{symbol}.{interval}
    // где interval может быть: 60, 300, 900, 1800, 3600, 14400, 86400, 604800, 2592000, 7776000, 31104000
    // или строковые форматы: MINUTE_1, MINUTE_5, MINUTE_15, MINUTE_30, HOUR_1, HOUR_4, DAY_1, WEEK_1, MONTH_1, SEASON_1, YEAR_1
    const resolutionMap: Record<string, string> = {
      '1': '60', // MINUTE_1
      '3': '180', // MINUTE_3 (если поддерживается, иначе используем ближайший)
      '5': '300', // MINUTE_5
      '15': '900', // MINUTE_15
      '30': '1800', // MINUTE_30
      '60': '3600', // HOUR_1
      '120': '7200', // HOUR_2 (если поддерживается)
      '240': '14400', // HOUR_4
      '360': '21600', // HOUR_6 (если поддерживается)
      '480': '28800', // HOUR_8 (если поддерживается)
      '720': '43200', // HOUR_12 (если поддерживается)
      D: '86400', // DAY_1
      W: '604800', // WEEK_1
      M: '2592000', // MONTH_1
    };
    return resolutionMap[resolution] || '60'; // По умолчанию 1 минута
  }
}

