import { Subject } from 'rxjs';
import { Alltrade, HistoryObject, Orderbook, OrderbookAsk, Side } from 'alor-api';
import { OrderbookBid } from 'alor-api/dist/models/models';
import { SubscriptionManager } from '../common/subscription-manager';

export class BitgetFuturesWsClient extends SubscriptionManager {
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(apiKey?: string, secretKey?: string) {
    super({
      name: 'Bitget Futures',
      url: 'wss://ws.bitget.com/v2/ws/public',
    });

    this.apiKey = apiKey;
    this.secretKey = secretKey;

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log(`Bitget Futures Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`Bitget Futures Websocket соединение разорвано`);
  }

  onMessage(ev) {
    const json = JSON.parse(ev.data as any);
    const { op, arg, action, event, data } = json;
    console.log(json);
    const key = JSON.stringify(arg);
    // Подписались
    if (event === 'subscribe') {
    }
    // Даннные
    else if (action === 'snapshot') {
      if (arg.channel.includes('candle')) {
        this.emit('candles', json);
        data.forEach(([time, open, high, low, close, volume]) =>
          this.subscribeSubjs.get(key)?.next({
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
            volume: Number(volume),
            time: Number(time) / 1000,
          } as HistoryObject),
        );
      } else if (arg.channel.includes('books')) {
        this.emit('orderbook', json);
        data.forEach((orderbook) =>
          this.subscribeSubjs.get(key)?.next({
            bids: orderbook.bids.map(([p, v]) => ({ price: Number(p), volume: Number(v) }) as OrderbookBid),
            asks: orderbook.asks.map(([p, v]) => ({ price: Number(p), volume: Number(v) }) as OrderbookAsk),
          } as Orderbook),
        );
      } else if (arg.channel.includes('trade')) {
        this.emit('trades', json);
        data.forEach((d) =>
          this.subscribeSubjs.get(key)?.next({
            price: Number(d.price),
            qty: Number(d.size),
            timestamp: Number(d.ts),
            side: d.side === 'sell' ? Side.Sell : Side.Buy,
          } as Alltrade),
        );
      }
    }
  }

  subscribeCandles(symbol: string, interval: string) {
    const subj = new Subject<HistoryObject>();
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `candle${interval}m`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.set(key, subj);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeCandles(symbol: string, interval: string) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `candle${interval}m`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  subscribeOrderbook(symbol: string, depth: 1 | 5 | 15) {
    const subj = new Subject<Orderbook>();
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `books${depth}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.set(key, subj);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `books${depth}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  subscribeTrades(symbol: string) {
    const subj = new Subject<Alltrade>();
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `trade`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.set(key, subj);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `trade`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  private subscribeFuturesChannel(arg: any) {
    this.subscribe({
      op: 'subscribe',
      args: [arg],
    });
  }

  private unsubscribeFuturesChannel(arg: any) {
    this.subscribe({
      op: 'unsubscribe',
      args: [arg],
    });
  }
}
