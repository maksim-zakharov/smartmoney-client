import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { MexcOrderbook } from '../mexc.models';

export class KcexWsClient extends SubscriptionManager {
  private readonly channelHandlers: Record<string, (data: any, symbol: string, ts: number) => void> = {
    'push.fair.price': (data, symbol) => this.handleFairPriceMessage(data, symbol),
    'push.index.price': (data, symbol) => this.handleIndexPriceMessage(data, symbol),
    'push.deal': (data, symbol) => this.handleDealMessage(data, symbol),
    'push.depth.step': (data, symbol) => this.handleDepthMessage(data, symbol),
    'push.ticker': (data, symbol) => this.handleTickerMessage(data, symbol),
    'push.kline': (data, symbol, ts) => this.handleKlineMessage(data, symbol, ts),
  };

  constructor() {
    super({
      url: 'wss://www.kcex.com/fapi/edge',
      name: 'KCEX Futures',
      pingRequest: () => ({
        method: 'ping',
      }),
      headers: {
        'Host': 'www.kcex.com',
        'Origin': 'https://www.kcex.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      },
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log(`KCEX Futures Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`KCEX Futures Websocket соединение разорвано`);
  }

  onMessage(ev) {
    try {
      const { channel, data, symbol, ts } = JSON.parse(ev.data as any);
      const handler = this.channelHandlers[channel];
      if (handler) {
        handler(data, symbol, ts);
      }
    } catch (error) {
      console.error('KCEX WebSocket message error:', error);
    }
  }

  private handleFairPriceMessage(data: any, symbol: string) {
    const key = `${symbol}_fair`;
    const { price } = data;
    this.subscribeSubjs.get(key)?.next({
      close: price,
    });
  }

  private handleIndexPriceMessage(data: any, symbol: string) {
    const key = `${symbol}_index`;
    const { price } = data;
    this.subscribeSubjs.get(key)?.next({
      close: price,
    });
  }

  private handleDealMessage(data: any, symbol: string) {
    const key = `deal_${symbol}`;
    // data - массив сделок
    if (Array.isArray(data)) {
      this.subscribeSubjs.get(key)?.next(data);
    }
  }

  private handleDepthMessage(data: any, symbol: string) {
    const key = `depth_${symbol}`;
    // Формат: asks/bids - массив [price, volume, level]
    this.subscribeSubjs.get(key)?.next({
      bids: (data.bids || []).map((p: [number, number, number]) => ({
        price: Number(p[0]),
        value: Number(p[1]),
      })),
      asks: (data.asks || []).map((p: [number, number, number]) => ({
        price: Number(p[0]),
        value: Number(p[1]),
      })),
    } as MexcOrderbook);
  }

  private handleTickerMessage(data: any, symbol: string) {
    const key = `ticker_${symbol}`;
    this.subscribeSubjs.get(key)?.next(data);
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

  subscribeIndexPrice(symbol: string) {
    const subj = new Subject<any>();
    const key = `${symbol}_index`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.index.price',
      param: {
        symbol,
      },
    });

    return subj;
  }

  unsubscribeIndexPrice(symbol: string) {
    const key = `${symbol}_index`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.index.price',
      param: {
        symbol,
      },
    });

    this.removeSubscription({
      method: 'sub.index.price',
      param: {
        symbol,
      },
    });
  }

  subscribeTrades(symbol: string) {
    const key = `deal_${symbol}`;
    const subj = this.createOrUpdateSubj<any[]>(key);
    this.subscribe({
      method: 'sub.deal',
      param: {
        symbol,
        compress: true,
      },
    });

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const key = `deal_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.deal',
      param: {
        symbol,
      },
    });

    this.removeSubscription({
      method: 'sub.deal',
      param: {
        symbol,
        compress: true,
      },
    });
  }

  subscribeOrderbook(symbol: string, step: number = 0.1) {
    const subj = new Subject<MexcOrderbook>();
    const key = `depth_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.depth.step',
      param: {
        symbol,
        step,
      },
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, step: number = 0.1) {
    const key = `depth_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.depth.step',
      param: {
        symbol,
        step,
      },
    });

    this.removeSubscription({
      method: 'sub.depth.step',
      param: {
        symbol,
        step,
      },
    });
  }

  subscribeTickers(symbols: string[], timezone: string = 'UTC+8') {
    const subj = new Subject<any>();
    const key = `ticker_${symbols.join(',')}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.tick.batch',
      param: {
        timezone,
        symbols,
      },
    });

    return subj;
  }

  unsubscribeTickers(symbols: string[], timezone: string = 'UTC+8') {
    const key = `ticker_${symbols.join(',')}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.tick.batch',
      param: {
        timezone,
        symbols,
      },
    });

    this.removeSubscription({
      method: 'sub.tick.batch',
      param: {
        timezone,
        symbols,
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
}

