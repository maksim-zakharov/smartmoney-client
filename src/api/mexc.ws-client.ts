import { Subject } from 'rxjs';
import { SubscriptionManager } from './subscription-manager';

export class MexcWsClient extends SubscriptionManager {
  constructor() {
    super({
      url: `wss://contract.mexc.com/edge`,
      name: 'Mexc Futures',
      pingObj: {
        method: 'ping',
      },
    });
  }

  onMessage(ev) {
    const { channel, data, symbol, ts } = JSON.parse(ev.data as any);
    if (channel === 'push.kline') {
      const key = `${symbol}_${data.interval}`;
      const { o, h, l, c, t } = data;
      this.subscribeSubjs.get(key)?.next({
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        time: t,
        timestamp: ts,
      });
    }
    if (channel === 'push.tickers') {
      data.forEach(({ symbol, lastPrice }) => {
        const key = `sub.tickers_${symbol}`;
        this.subscribeSubjs.get(key)?.next({
          lastPrice,
        });
      });
    }
    if (channel === 'push.depth') {
      const key = `depth_${symbol}`;
      this.subscribeSubjs.get(key)?.next({
        bids: data.bids.map((p) => ({
          price: Number(p[0]),
          value: Number(p[1]),
        })),
        asks: data.asks.map((p) => ({
          price: Number(p[0]),
          value: Number(p[1]),
        })),
      });
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.kline',
      param: {
        symbol,
        interval,
      },
    });

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'unsub.kline',
      param: {
        symbol,
        interval,
      },
    });

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<any>();
    const key = `depth_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });

    return subj;
  }

  subscribeQuotes(symbol: string) {
    const subj = new Subject<{ lastPrice: number }>();
    const key = `sub.tickers_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.tickers',
      param: { symbol },
    });

    return subj;
  }
}
