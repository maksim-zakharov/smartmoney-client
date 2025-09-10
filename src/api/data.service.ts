import { AlorApi, Exchange } from 'alor-api';
import { catchError, from, map, mergeMap, Observable, pluck, retryWhen, shareReplay, throwError, timer } from 'rxjs';
import { PeriodParams, ResolutionString } from '../assets/charting_library';
import { BybitWebsocketClient } from './bybit.ws-client';
import { MexcWsClient } from './mexc.ws-client';
import { GateWsClient } from './gate.ws-client';
import { CtraderWsClient } from './ctrader.ws-client';

export class DataService {
  private serverTimeCache$: Observable<any>;

  private readonly ctraderUrl: string;

  private readonly bybitWsClient: BybitWebsocketClient;
  private readonly mexcWsClient: MexcWsClient;
  private readonly gateWsClient: GateWsClient;
  private readonly ctraderWsClient: CtraderWsClient;

  constructor(public readonly alorApi: AlorApi) {
    // this.ctraderUrl = 'http://localhost:3000'; //  'http://176.114.69.4';
    this.ctraderUrl = 'https://176.114.69.4';

    this.bybitWsClient = new BybitWebsocketClient();
    this.mexcWsClient = new MexcWsClient();
    this.gateWsClient = new GateWsClient();
    this.ctraderWsClient = new CtraderWsClient();
  }

  mexcSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.mexcWsClient.subscribeCandles(symbol, resolution);
  }

  gateSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.gateWsClient.subscribeCandles(symbol, resolution);
  }

  bybitSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bybitWsClient.subscribeCandles(symbol, resolution);
  }

  ctraderSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.ctraderWsClient.subscribeCandles(symbol, resolution);
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

  getSymbol(symbol: string) {
    if (symbol.includes('_xp')) {
      return Promise.resolve({
        symbol: symbol,
        exchange: 'XPBEE',
        currency: 'USDT',
        minstep: 0.001,
        type: '',
      });
    }
    if (symbol.includes(':')) {
      const exchange = symbol.split(':')[0];

      return Promise.resolve({
        symbol: symbol,
        exchange,
        currency: 'USDT',
        minstep: 0.001,
        type: '',
      });
    }

    return this.alorApi.instruments.getSecurityByExchangeAndSymbol({
      symbol: symbol,
      exchange: Exchange.MOEX,
      format: 'Simple',
    });
  }

  getChartData(ticker: string, resolution: ResolutionString, periodParams: PeriodParams) {
    let request$;

    if (ticker.includes('_xp') || ticker.includes('FOREX:')) {
      const _ticker = ticker.split('FOREX:')[1] || ticker;
      request$ = from(
        fetch(
          `${this.ctraderUrl}/ctrader/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('DEXCHECK:')) {
      const _ticker = ticker.split('DEXCHECK:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/dexcheck/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('BINANCE:')) {
      const _ticker = ticker.split('BINANCE:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/binance/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
