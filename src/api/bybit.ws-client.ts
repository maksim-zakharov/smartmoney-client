import { Subject } from 'rxjs';
import { ResolutionString } from '../assets/charting_library';

export class BybitWebsocketClient {
  private bybitSubscribes = new Map<string, Subject<any>>([]);
  private readonly bybitWs: WebSocket;

  constructor() {
    // this.bybitWs = new WebSocket(`wss://stream.bybit.com/v5/public/spot`);
    this.bybitWs = new WebSocket(`wss://stream.bybit.com/v5/public/linear`);
    this.bybitWs.onopen = () => {
      console.log('WS connected');
    };
    this.bybitWs.onmessage = (ev: MessageEvent) => {
      const { topic, data } = JSON.parse(ev.data);
      if (data && data[0]) {
        if (topic.startsWith('kline')) {
          const { open, high, low, close, start, timestamp } = data[0];
          this.bybitSubscribes.get(topic)?.next({
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
            time: Math.round(start / 1000),
            timestamp,
          });
        } else if (topic.startsWith('tickers')) {
          const { lastPrice } = data[0];
          this.bybitSubscribes.get(topic)?.next({
            lastPrice: Number(lastPrice),
          });
        }
      }
    };
    this.bybitWs.onclose = () => {
      console.log('WS disconnected');
    };
  }

  subscribeCandles(symbol: string, resolution: ResolutionString) {
    const args = `kline.${resolution}.${symbol}`;
    const subj = new Subject<any>();
    this.bybitSubscribes.set(args, subj);
    this.bybitWs.send(
      JSON.stringify({
        op: 'subscribe',
        args: [args],
      }),
    );

    return subj;
  }

  subscribeQuotes(symbol: string) {
    const args = `tickers.${symbol}`;
    const subj = new Subject<any>();
    this.bybitSubscribes.set(args, subj);
    this.bybitWs.send(
      JSON.stringify({
        op: 'subscribe',
        args: [args],
      }),
    );

    return subj;
  }
}
