import { Subject } from 'rxjs';

export class KucoinWsClient {
  private subscribes = new Map<string, Subject<any>>([]);
  private ws: WebSocket;

  constructor() {
    this.connect();
  }

  private async connect() {
    fetch('https://176.114.69.4/kucoin/futures-auth-ws', {
      method: 'GET',
    })
      .then((r) => r.json())
      .then((res) => {
        const url = new URL(res.instanceServers[0].endpoint);
        url.searchParams.set('token', res.token);
        this.ws = new WebSocket(url.toString());

        let interval;
        this.ws.onopen = () => {
          console.log('WS connected');
          if (interval) clearInterval(interval);

          interval = setInterval(
            () =>
              this.ws.send(
                JSON.stringify({
                  id: Math.round(Date.now() / 1000),
                  type: 'ping',
                }),
              ),
            res.instanceServers[0].pingInterval,
          );
        };

        this.ws.onmessage = (ev: MessageEvent) => {
          const { type, topic, subject, data } = JSON.parse(ev.data as any);
          if (subject === 'candle.stick' && type === 'message') {
            const { candles, time: timestamp } = data || {};
            const [t, o, c, h, l, v] = candles;
            this.subscribes.get(topic)?.next({
              open: Number(o),
              high: Number(h),
              low: Number(l),
              close: Number(c),
              time: t,
              timestamp,
            });
          }
        };
        this.ws.onclose = () => {
          console.log('WS disconnected');
        };
      });
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}min`;
    const topic = `/contractMarket/limitCandle:${symbol}_${interval}`;
    this.subscribes.set(topic, subj);
    this.ws.send(
      JSON.stringify({
        id: Math.round(Date.now() / 1000),
        type: 'subscribe',
        topic,
        response: true,
      }),
    );

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}min`;
    const topic = `/contractMarket/limitCandle:${symbol}_${interval}`;
    this.subscribes.set(topic, subj);
    this.ws.send(
      JSON.stringify({
        id: Math.round(Date.now() / 1000),
        type: 'unsubscribe',
        topic, //Topic needs to be unsubscribed. Some topics support to divisional unsubscribe the informations of multiple trading pairs through ",".
        privateChannel: false,
        response: true, //Whether the server needs to return the receipt information of this subscription or not. Set as false by default.
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
