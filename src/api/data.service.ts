import { AlorApi } from 'alor-api';
import {
  BehaviorSubject,
  catchError,
  from,
  map,
  mergeMap,
  Observable,
  pluck,
  retryWhen,
  shareReplay,
  Subject,
  throwError,
  timer,
} from 'rxjs';
import { PeriodParams, ResolutionString } from '../assets/charting_library';

export class DataService {
  private serverTimeCache$: Observable<any>;

  private readonly ctraderUrl: string;

  private readonly _opened$ = new BehaviorSubject<boolean>(false);

  private bybitSubscribes = new Map<string, Subject<any>>([]);

  private mexcSubscribes = new Map<string, Subject<any>>([]);

  private readonly bybitWs: WebSocket;
  private readonly mexcWs: WebSocket;

  constructor(public readonly alorApi: AlorApi) {
    // this.ctraderUrl = 'http://localhost:3000'; //  'http://176.114.69.4';
    this.ctraderUrl = 'https://176.114.69.4';

    // this.bybitWs = new WebSocket(`wss://stream.bybit.com/v5/public/spot`);
    this.bybitWs = new WebSocket(`wss://stream.bybit.com/v5/public/linear`);
    this.bybitWs.onopen = () => {
      console.log('WS connected');
      this._opened$.next(true);
    };
    this.bybitWs.onmessage = (ev: MessageEvent) => {
      const { topic, data } = JSON.parse(ev.data);
      if (data && data[0]) {
        const { open, high, low, close, start } = data[0];
        this.bybitSubscribes.get(topic)?.next({
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          time: Math.round(start / 1000),
        });
      }
    };
    this.bybitWs.onclose = () => {
      this._opened$.next(false);
      console.log('WS disconnected');
    };

    this.mexcWs = new WebSocket(`wss://contract.mexc.com/edge`);

    let interval;
    this.mexcWs.onopen = () => {
      console.log('WS connected');
      this._opened$.next(true);
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
      this._opened$.next(false);
      console.log('WS disconnected');
    };
  }

  mexcSubscribeCandles(symbol: string, resolution: ResolutionString) {
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

  bybitSubscribeCandles(symbol: string, resolution: ResolutionString) {
    const args = `kline.${resolution}.${symbol}`; // `kline.1.${symbol}`;
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

  get serverTime$() {
    if (!this.serverTimeCache$) {
      this.serverTimeCache$ = from(this.alorApi.http.get(`https://api.alor.ru/md/v2/time`)).pipe(
        pluck('data'),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.serverTimeCache$;
  }

  getChartData(ticker: string, resolution: ResolutionString, periodParams: PeriodParams) {
    let request$;

    if (ticker.includes('_xp')) {
      request$ = from(
        fetch(
          `${this.ctraderUrl}/ctrader/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${ticker}&to=${Math.max(periodParams.to, 1)}`,
          {
            headers: {
              'x-ctrader-token': localStorage.getItem('cTraderAuth')
                ? JSON.parse(localStorage.getItem('cTraderAuth'))?.accessToken
                : undefined,
            },
          },
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('GATE:')) {
      const _ticker = ticker.split('GATE:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/gate/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('BYBIT:')) {
      const _ticker = ticker.split('BYBIT:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/bybit/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('MEXC:')) {
      const _ticker = ticker.split('MEXC:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/mexc/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('GMGN:')) {
      const _ticker = ticker.split('GMGN:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/gmgn/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('BINGX:')) {
      const _ticker = ticker.split('BINGX:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/bingx/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else {
      request$ = from(
        this.alorApi.instruments.getHistory({
          symbol: ticker,
          exchange: 'MOEX',
          from: Math.max(periodParams.from, 0),
          to: Math.max(periodParams.to, 1),
          tf: this.parseTimeframe(resolution),
          countBack: periodParams.countBack,
        }),
      );
    }

    return request$.pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attempt) => {
            // Можно добавить логирование ошибок
            console.warn(`Attempt ${attempt + 1} failed:`, error.message);

            // Если превышено максимальное количество попыток, пробрасываем ошибку
            // if (attempt >= 10) {
            //   // Максимум 10 попыток
            //   return throwError(() => error);
            // }

            // Ретраим каждые 5 секунд
            return timer(5000);
          }),
        ),
      ),
    );
  }

  private parseTimeframe(resolution: ResolutionString): string {
    const code = resolution.slice(-1);
    if (['D', 'W', 'M', 'Y'].includes(code)) {
      return resolution;
    }

    const count = Number(resolution.substring(0, resolution.length - 1));

    if (code === 'S') {
      return count.toString();
    }

    if (code === 'H') {
      return (count * 60 * 60).toString();
    }

    // resolution contains minutes
    return (Number(resolution) * 60).toString();
  }
}
