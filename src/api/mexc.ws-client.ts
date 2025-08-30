import { Subject } from 'rxjs';
import { ResolutionString } from '../assets/charting_library';

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
      const { channel, data, symbol } = JSON.parse(ev.data);
      if (channel === 'push.kline') {
        const key = `${symbol}_${data.interval}`;
        const { o, h, l, c, t } = data;
        this.mexcSubscribes.get(key)?.next({
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          time: t,
        });
      }
    };
    this.mexcWs.onclose = () => {
      console.log('WS disconnected');
    };
  }

  subscribeCandles(symbol: string, resolution: ResolutionString) {
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
}
