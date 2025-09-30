import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';

export class BybitPrivateWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'Bybit Private',
      url: `wss://stream.bybit.com/v5/private`,
      pingRequest: () => ({
        op: 'ping',
      }),
    });

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
    if (topic?.startsWith('kline')) {
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
    } else if (topic?.startsWith('tickers')) {
      const { lastPrice } = data;
      lastPrice &&
        this.subscribeSubjs.get(topic)?.next({
          lastPrice: Number(lastPrice),
        });
    } else if (topic?.startsWith('orderbook')) {
      const { b, a } = data;
      this.subscribeSubjs.get(topic)?.next({
        bids: b.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
        asks: a.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
      });
    }
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const args = `orderbook.${depth}.${symbol}`;
    const subj = new Subject<any>();
    this.subscribeSubjs.set(args, subj);
    this.subscribe({
      op: 'subscribe',
      args: [args],
    });

    return subj;
  }

  subscribeCandles(symbol: string, resolution: string) {
    const args = `kline.${resolution}.${symbol}`;
    const subj = new Subject<any>();
    this.subscribeSubjs.set(args, subj);
    this.subscribe({
      op: 'subscribe',
      args: [args],
    });

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const args = `kline.${resolution}.${symbol}`;
    const subj = new Subject<any>();
    this.subscribeSubjs.set(args, subj);
    this.subscribe({
      op: 'unsubscribe',
      args: [args],
    });

    return subj;
  }

  subscribeQuotes(symbol: string) {
    const args = `tickers.${symbol}`;
    const subj = new Subject<{ lastPrice: number }>();
    this.subscribeSubjs.set(args, subj);
    this.subscribe({
      op: 'subscribe',
      args: [args],
    });

    return subj;
  }
}
