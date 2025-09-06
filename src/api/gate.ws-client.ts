import { Subject } from 'rxjs';

export class GateWsClient {
  private subscribes = new Map<string, Subject<any>>([]);
  private readonly ws: WebSocket;

  constructor() {
    this.ws = new WebSocket(`wss://fx-ws.gateio.ws/v4/ws/usdt`);

    let interval;
    this.ws.onopen = () => {
      console.log('WS connected');
      if (interval) clearInterval(interval);

      interval = setInterval(
        () =>
          this.ws.send(
            JSON.stringify({
              time: Math.round(Date.now() / 1000),
              channel: 'spot.ping',
            }),
          ),
        10000,
      );
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      const { channel, result, time, event } = JSON.parse(ev.data as any);
      if (channel === 'futures.candlesticks' && event === 'update') {
        const { o, h, l, c, t, n } = result[0] || {};
        this.subscribes.get(n)?.next({
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          time: t,
          timestamp: time,
        });
      }
      // if (channel === 'push.tickers') {
      //   data.forEach(({ symbol, lastPrice }) => {
      //     const key = `sub.tickers_${symbol}`;
      //     this.mexcSubscribes.get(key)?.next({
      //       lastPrice,
      //     });
      //   });
      // }
      // if (channel === 'push.depth') {
      //   const key = `depth_${symbol}`;
      //   this.mexcSubscribes.get(key)?.next({
      //     bids: data.bids.map((p) => ({
      //       price: Number(p[0]),
      //       value: Number(p[1]),
      //     })),
      //     asks: data.asks.map((p) => ({
      //       price: Number(p[0]),
      //       value: Number(p[1]),
      //     })),
      //   });
      // }
    };
    this.ws.onclose = () => {
      console.log('WS disconnected');
    };
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}m`;
    const key = `${interval}_${symbol}`;
    this.subscribes.set(key, subj);
    this.ws.send(
      JSON.stringify({
        time: Math.round(Date.now() / 1000),
        channel: 'futures.candlesticks',
        event: 'subscribe',
        payload: [interval, symbol],
      }),
    );

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<any>();
    const key = `depth_${symbol}`;
    this.subscribes.set(key, subj);
    this.ws.send(
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
    this.subscribes.set(key, subj);
    this.ws.send(
      JSON.stringify({
        method: 'sub.tickers',
        param: { symbol },
      }),
    );

    return subj;
  }
}
