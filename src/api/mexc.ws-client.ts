import { Subject } from 'rxjs';

export class MexcWsClient {
  private mexcSubscribes = new Map<string, Subject<any>>([]);
  private readonly mexcWs: WebSocket;

  constructor() {
    this.mexcWs = new WebSocket(`wss://contract.mexc.com/edge`);

    let interval;
    this.mexcWs.onopen = () => {
      console.log('WS connected');
      if (interval) clearInterval(interval);

      interval = setInterval(
        () =>
          this.mexcWs.send(
            JSON.stringify({
              method: 'ping',
            }),
          ),
        10000,
      );
    };

    this.mexcWs.onmessage = (ev: MessageEvent) => {
      const { channel, data, symbol, ts } = JSON.parse(ev.data as any);
      if (channel === 'push.kline') {
        const key = `${symbol}_${data.interval}`;
        const { o, h, l, c, t } = data;
        this.mexcSubscribes.get(key)?.next({
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
          this.mexcSubscribes.get(key)?.next({
            lastPrice,
          });
        });
      }
      if (channel === 'push.depth') {
        const key = `depth_${symbol}`;
        this.mexcSubscribes.get(key)?.next({
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
    };
    this.mexcWs.onclose = () => {
      console.log('WS disconnected');
    };
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.mexcSubscribes.set(key, subj);
    this.mexcWs.send(
      JSON.stringify({
        method: 'sub.kline',
        param: {
          symbol,
          interval,
        },
      }),
    );

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<any>();
    const key = `depth_${symbol}`;
    this.mexcSubscribes.set(key, subj);
    this.mexcWs.send(
      JSON.stringify({
        method: 'sub.depth',
        param: {
          symbol,
          limit: depth,
        },
      }),
    );

    return subj;
  }

  subscribeQuotes(symbol: string) {
    const subj = new Subject<{ lastPrice: number }>();
    const key = `sub.tickers_${symbol}`;
    this.mexcSubscribes.set(key, subj);
    this.mexcWs.send(
      JSON.stringify({
        method: 'sub.tickers',
        param: { symbol },
      }),
    );

    return subj;
  }
}
