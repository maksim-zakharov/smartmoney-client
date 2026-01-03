import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';

export class BybitWebsocketClient extends SubscriptionManager {
  private readonly topicHandlers: Record<string, (topic: string, data: any) => void> = {
    kline: (topic, data) => this.handleKlineMessage(topic, data),
    tickers: (topic, data) => this.handleTickersMessage(topic, data),
    orderbook: (topic, data) => this.handleOrderbookMessage(topic, data),
  };

  constructor() {
    super({
      name: 'BingX Futures',
      url: `wss://stream.bybit.com/v5/public/linear`,
      pingRequest: () => ({
        op: 'ping',
      }),
    });
    // this.bybitWs = new WebSocket(`wss://stream.bybit.com/v5/public/spot`);

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Bybit Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Bybit Futures Websocket соединение установлено`);
  }

  onMessage(ev) {
    const { topic, data } = JSON.parse(ev.data as any);
    if (!topic) return;

    // Определяем тип топика по первой части (до первой точки)
    // Например: "orderbook.200.FLOWUSDT" -> "orderbook"
    const topicType = topic.split('.')[0];
    const handler = this.topicHandlers[topicType];
    if (handler) {
      handler(topic, data);
    }
  }

  private handleKlineMessage(topic: string, data: any) {
    if (data && data[0]) {
      const { open, high, low, close, start, timestamp } = data[0];
      this.subscribeSubjs.get(topic)?.next({
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        time: Math.round(start / 1000),
        timestamp,
      });
    }
  }

  private handleTickersMessage(topic: string, data: any) {
    const { lastPrice } = data;
    if (lastPrice) {
      this.subscribeSubjs.get(topic)?.next({
        lastPrice: Number(lastPrice),
      });
    }
  }

  private handleOrderbookMessage(topic: string, data: any) {
    const { b, a } = data;
    this.subscribeSubjs.get(topic)?.next({
      bids: b.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
      asks: a.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
    });
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const args = `orderbook.${depth}.${symbol}`;
    const subj = this.createOrUpdateSubj(args);
    this.subscribe({
      op: 'subscribe',
      args: [args],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number) {
    const args = `orderbook.${depth}.${symbol}`;
    this.removeSubj(args);
    this.unsubscribe({
      op: 'unsubscribe',
      args: [args],
    });

    this.removeSubscription({
      op: 'subscribe',
      args: [args],
    });
  }

  subscribeCandles(symbol: string, resolution: string) {
    const args = `kline.${resolution}.${symbol}`;
    if (!this.subscribeSubjs.has(args)) {
      this.subscribe({
        op: 'subscribe',
        args: [args],
      });
    }
    const subj = this.createOrUpdateSubj(args);

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const args = `kline.${resolution}.${symbol}`;
    this.removeSubj(args);
    this.unsubscribe({
      op: 'unsubscribe',
      args: [args],
    });

    this.removeSubscription({
      op: 'subscribe',
      args: [args],
    });
  }

  subscribeQuotes(symbol: string) {
    const args = `tickers.${symbol}`;
    const subj = this.createOrUpdateSubj(args);
    this.subscribe({
      op: 'subscribe',
      args: [args],
    });

    return subj;
  }

  unsubscribeQuotes(symbol: string) {
    const args = `tickers.${symbol}`;
    this.removeSubj(args);
    this.unsubscribe({
      op: 'unsubscribe',
      args: [args],
    });

    this.removeSubscription({
      op: 'subscribe',
      args: [args],
    });
  }
}
