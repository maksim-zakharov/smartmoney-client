import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';
import { OkxCandlesWsClient } from './okx-candles.ws-client';

export class OkxFuturesWsClient extends SubscriptionManager {
  private candlesWsClient: OkxCandlesWsClient;
  private readonly channelHandlers: Record<string, (message: any) => void> = {
    books: (msg) => this.handleOrderbookMessage(msg),
  };

  constructor() {
    super({
      name: 'OKX Futures (Orderbook)',
      url: 'wss://ws.okx.com:8443/ws/v5/public',
      pingRequest: () => 'ping', // OKX требует строку 'ping'
    });

    // Отдельное соединение для свечей
    this.candlesWsClient = new OkxCandlesWsClient();

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`OKX Futures Websocket (Orderbook) соединение разорвано`);
  }

  protected onOpen() {
    console.log(`OKX Futures Websocket (Orderbook) соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      // Обработка строки 'pong'
      if (typeof ev.data === 'string' && ev.data === 'pong') {
        return;
      }

      const message = JSON.parse(ev.data as any);

      // Обработка pong
      if (message.event === 'pong') {
        return;
      }

      // Обработка ответа на подписку/отписку
      if (message.event === 'subscribe' || message.event === 'unsubscribe') {
        return;
      }

      // Обработка данных стакана
      if (message.arg && message.arg.channel === 'books') {
        const handler = this.channelHandlers['books'];
        if (handler) {
          handler(message);
        }
      }
    } catch (error) {
      console.error('OKX WebSocket (Orderbook) message error:', error);
    }
  }


  private handleOrderbookMessage(message: any) {
    if (message.data && Array.isArray(message.data) && message.data.length > 0) {
      const orderbookData = message.data[0];
      const instId = message.arg.instId;
      const key = `books_${instId}`;

      const orderbook: Orderbook = {
        bids: (orderbookData.bids || []).map(([price, qty]: [string, string]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookBid[],
        asks: (orderbookData.asks || []).map(([price, qty]: [string, string]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookAsk[],
      };

      this.subscribeSubjs.get(key)?.next(orderbook);
    }
  }


  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToOkxInterval(resolution);
    const channel = `candle${interval}`;
    const key = `${channel}_${symbol}`;
    const subj = this.candlesWsClient.createOrUpdateSubj(key);

    const request = {
      id: Date.now().toString(),
      op: 'subscribe',
      args: [
        {
          channel,
          instId: symbol,
        },
      ],
    };

    (this.candlesWsClient as any).subscribe(request);

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToOkxInterval(resolution);
    const channel = `candle${interval}`;
    const key = `${channel}_${symbol}`;
    (this.candlesWsClient as any).removeSubj(key);

    const unsubscribeRequest = {
      id: Date.now().toString(),
      op: 'unsubscribe',
      args: [
        {
          channel,
          instId: symbol,
        },
      ],
    };

    (this.candlesWsClient as any).unsubscribe(unsubscribeRequest);
    this.candlesWsClient.removeSubscription({
      id: Date.now().toString(),
      op: 'subscribe',
      args: [
        {
          channel,
          instId: symbol,
        },
      ],
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const key = `books_${symbol}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    this.subscribe({
      id: Date.now().toString(),
      op: 'subscribe',
      args: [
        {
          channel: 'books',
          instId: symbol,
        },
      ],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const key = `books_${symbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      id: Date.now().toString(),
      op: 'unsubscribe',
      args: [
        {
          channel: 'books',
          instId: symbol,
        },
      ],
    });

    this.removeSubscription({
      id: Date.now().toString(),
      op: 'subscribe',
      args: [
        {
          channel: 'books',
          instId: symbol,
        },
      ],
    });
  }

  private convertResolutionToOkxInterval(resolution: string): string {
    // OKX использует формат: 1m, 5m, 15m, 1H, 4H, 1D и т.д.
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1H',
      '120': '2H',
      '240': '4H',
      '360': '6H',
      '480': '8H',
      '720': '12H',
      D: '1D',
      W: '1W',
      M: '1M',
    };
    return resolutionMap[resolution] || '1m';
  }
}
