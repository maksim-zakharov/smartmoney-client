import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { MexcOrderbook } from '../mexc.models';

export class MexcWsClient extends SubscriptionManager {
  private readonly channelHandlers: Record<string, (data: any, symbol: string, ts: number) => void> = {
    'push.kline': (data, symbol, ts) => this.handleKlineMessage(data, symbol, ts),
    'push.fair.price': (data, symbol) => this.handleFairPriceMessage(data, symbol),
    'push.tickers': (data) => this.handleTickersMessage(data),
    'push.depth': (data, symbol) => this.handleDepthMessage(data, symbol),
  };

  constructor() {
    super({
      url: `wss://contract.mexc.com/edge`,
      name: 'Mexc Futures',
      pingRequest: () => ({
        method: 'ping',
      }),
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }
  protected onOpen() {
    console.log(`Mexc Futures Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`Mexc Futures Websocket соединение разорвано`);
  }

  onMessage(ev) {
    const { channel, data, symbol, ts } = JSON.parse(ev.data as any);
    const handler = this.channelHandlers[channel];
    if (handler) {
      handler(data, symbol, ts);
    }
  }

  private handleKlineMessage(data: any, symbol: string, ts: number) {
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

  private handleFairPriceMessage(data: any, symbol: string) {
    const key = `${symbol}_fair`;
    const { price } = data;
    this.subscribeSubjs.get(key)?.next({
      close: price,
    });
  }

  private handleTickersMessage(data: any) {
    data.forEach(({ symbol, lastPrice }) => {
      const key = `sub.tickers_${symbol}`;
      this.subscribeSubjs.get(key)?.next({
        lastPrice,
      });
    });
  }

  private handleDepthMessage(data: any, symbol: string) {
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
    } as MexcOrderbook);
  }

  subscribeFairPrice(symbol: string) {
    const subj = new Subject<any>();
    const key = `${symbol}_fair`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.fair.price',
      param: {
        symbol,
      },
    });

    return subj;
  }

  unsubscribeFairPrice(symbol: string) {
    const key = `${symbol}_fair`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.fair.price',
      param: {
        symbol,
      },
    });

    this.removeSubscription({
      method: 'sub.fair.price',
      param: {
        symbol,
      },
    });
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
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.kline',
      param: {
        symbol,
        interval,
      },
    });

    this.removeSubscription({
      method: 'sub.kline',
      param: {
        symbol,
        interval,
      },
    });
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<MexcOrderbook>();
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

  unsubscribeOrderbook(symbol: string, depth: number) {
    const key = `depth_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });

    this.removeSubscription({
      method: 'sub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });
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

  unsubscribeQuotes(symbol: string) {
    const key = `sub.tickers_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.tickers',
      param: { symbol },
    });

    this.removeSubscription({
      method: 'sub.tickers',
      param: { symbol },
    });
  }
}
