import { AlorApi, Exchange } from 'alor-api';
import { catchError, from, map, mergeMap, Observable, pluck, retryWhen, shareReplay, throwError, timer } from 'rxjs';
import { PeriodParams, ResolutionString } from '../../assets/charting_library';
import { BybitWebsocketClient } from '../public-ws/bybit.ws-client.ts';
import { MexcWsClient } from '../public-ws/mexc.ws-client.ts';
import { GateFuturesWsClient } from '../public-ws/gate.ws-client.ts';
import { CtraderWsClient } from '../private-ws/ctrader.ws-client.ts';
import { FinamWsClient } from '../private-ws/finam.ws-client.ts';
import { MexcSpotWsClient } from '../private-ws/mexc-spot.ws-client.ts';
import { KucoinWsClient } from '../private-ws/kucoin.ws-client.ts';
import { BitgetFuturesWsClient } from '../public-ws/bitget-futures.ws-client.ts';
import { BingXFuturesWsClient } from '../public-ws/bingx-futures.ws-client.ts';
import { OurbitWsClient } from '../public-ws/ourbit.ws-client.ts';
import { AsterWsClient } from '../public-ws/aster.ws-client.ts';
import { HyperliquidWsClient } from '../public-ws/hyperliquid.ws-client.ts';
import { BinanceFuturesWsClient } from '../public-ws/binance-futures.ws-client.ts';
import { BitMartFuturesWsClient } from '../public-ws/bitmart-futures.ws-client.ts';
import { HtxFuturesWsClient } from '../public-ws/htx-futures.ws-client.ts';
import dayjs from 'dayjs';

function roundToMinutesSimple(date = dayjs(), interval = 1) {
  const current = dayjs(date);
  const timeMs = current.valueOf();

  const ONE_MINUTE = 60_000;

  const diff = timeMs % (ONE_MINUTE * interval);

  const roundedMs = timeMs - diff;

  return roundedMs;
}

export class DataService {
  private serverTimeCache$: Observable<any>;

  private readonly ctraderUrl: string;
  private readonly cryptoUrl: string;

  private readonly bybitWsClient: BybitWebsocketClient;
  private readonly mexcWsClient: MexcWsClient;
  private readonly gateWsClient: GateFuturesWsClient;
  private readonly ctraderWsClient: CtraderWsClient;
  private readonly finamWsClient: FinamWsClient;
  private readonly mexcSpotWsClient: MexcSpotWsClient;
  private readonly kucoinWsClient: KucoinWsClient;
  private readonly bingxWsClient: BingXFuturesWsClient;
  private readonly bitgetFuturesWsClient: BitgetFuturesWsClient;
  private readonly ourbitWsClient: OurbitWsClient;
  private readonly asterWsClient: AsterWsClient;
  private readonly hyperliquidWsClient: HyperliquidWsClient;
  private readonly binanceFuturesWsClient: BinanceFuturesWsClient;
  private readonly bitMartFuturesWsClient: BitMartFuturesWsClient;
  private readonly htxFuturesWsClient: HtxFuturesWsClient;

  private symbols: Partial<{ symbolId: number; symbolName: string }>[] = [];

  constructor(public readonly alorApi: AlorApi) {
    // this.ctraderUrl = 'http://localhost:3000'; //  'http://5.35.13.149';
    this.ctraderUrl = 'http://176.114.69.4:3000';
    this.cryptoUrl = 'http://5.35.13.149';

    this.bybitWsClient = new BybitWebsocketClient();
    this.mexcWsClient = new MexcWsClient();
    this.gateWsClient = new GateFuturesWsClient();
    this.ctraderWsClient = new CtraderWsClient();
    this.finamWsClient = new FinamWsClient();
    this.bingxWsClient = new BingXFuturesWsClient(localStorage.getItem('bingxApiKey'), localStorage.getItem('bingxSecretKey'));
    this.mexcSpotWsClient = new MexcSpotWsClient();
    this.kucoinWsClient = new KucoinWsClient();
    this.bitgetFuturesWsClient = new BitgetFuturesWsClient();
    this.ourbitWsClient = new OurbitWsClient();
    this.asterWsClient = new AsterWsClient();
    this.hyperliquidWsClient = new HyperliquidWsClient();
    this.binanceFuturesWsClient = new BinanceFuturesWsClient();
    this.bitMartFuturesWsClient = new BitMartFuturesWsClient();
    this.htxFuturesWsClient = new HtxFuturesWsClient();
  }

  setSymbols(symbols: Partial<{ symbolId: number; symbolName: string }>[]) {
    this.symbols = symbols;
  }

  bitgetSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bitgetFuturesWsClient.subscribeCandles(symbol, resolution);
  }

  bitgetUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bitgetFuturesWsClient.unsubscribeCandles(symbol, resolution);
  }

  mexcSubscribeCandles(symbol: string, resolution: ResolutionString) {
    if (symbol.includes('_')) {
      if (symbol.includes('_fair')) {
        return this.mexcWsClient.subscribeFairPrice(symbol.split('_fair')[0]).pipe(
          map((candle) => {
            const time = roundToMinutesSimple(dayjs(), Number(resolution)) / 1000;
            return { ...candle, time };
          }),
        );
      }
      return this.mexcWsClient.subscribeCandles(symbol, resolution);
    }

    return this.mexcSpotWsClient.subscribeCandles(symbol, resolution);
  }

  mexcUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    // if (symbol.includes('_')) return this.mexcWsClient.unsubscribeCandles(symbol, resolution);

    return Promise.resolve(); //  this.mexcSpotWsClient.subscribeCandles(symbol, resolution);
  }

  ourbitSubscribeCandles(symbol: string, resolution: ResolutionString) {
    if (symbol.includes('_')) {
      if (symbol.includes('_fair')) {
        return this.ourbitWsClient.subscribeFairPrice(symbol.split('_fair')[0]).pipe(
          map((candle) => {
            const time = roundToMinutesSimple(dayjs(), Number(resolution)) / 1000;
            return { ...candle, time };
          }),
        );
      }
      return this.ourbitWsClient.subscribeCandles(symbol, resolution);
    }

    // Для OURBIT нет спота, только фьючерсы
    return this.ourbitWsClient.subscribeCandles(symbol, resolution);
  }

  ourbitUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    // TODO: реализовать отписку для OURBIT если нужно
    return Promise.resolve();
  }

  gateSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.gateWsClient.subscribeCandles(symbol, resolution);
  }

  gateUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    // return this.gateWsClient.unsubscribeCandles(symbol, resolution);
  }

  bingxSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bingxWsClient.subscribeCandles(symbol, resolution);
  }

  bingxUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bingxWsClient.unsubscribeCandles(symbol, resolution);
  }

  bybitSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bybitWsClient.subscribeCandles(symbol, resolution);
  }

  bybitUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bybitWsClient.unsubscribeCandles(symbol, resolution);
  }

  okxSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bybitWsClient.subscribeCandles(symbol, resolution);
  }

  okxUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bybitWsClient.unsubscribeCandles(symbol, resolution);
  }

  ctraderSubscribeCandles(symbol: string, resolution: ResolutionString) {
    const s = this.symbols.find((s) => s.symbolName === symbol);

    return this.ctraderWsClient.subscribeCandles(s?.symbolId, resolution);
  }

  finamSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.finamWsClient.subscribeCandles(symbol, resolution);
  }

  kucoinSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.kucoinWsClient.subscribeCandles(symbol, resolution);
  }

  kucoinUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.kucoinWsClient.unsubscribeCandles(symbol, resolution);
  }

  asterSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.asterWsClient.subscribeCandles(symbol, resolution);
  }

  asterUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.asterWsClient.unsubscribeCandles(symbol, resolution);
  }

  hyperliquidSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.hyperliquidWsClient.subscribeCandles(symbol, resolution);
  }

  hyperliquidUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.hyperliquidWsClient.unsubscribeCandles(symbol, resolution);
  }

  // Методы для подписки на стаканы
  mexcSubscribeOrderbook(symbol: string, depth: number = 20) {
    if (symbol.includes('_')) {
      return this.mexcWsClient.subscribeOrderbook(symbol, depth);
    }
    // Для спота нужно добавить поддержку в mexc-spot.ws-client.ts
    return this.mexcWsClient.subscribeOrderbook(symbol, depth);
  }

  bybitSubscribeOrderbook(symbol: string, depth: number = 20) {
    return this.bybitWsClient.subscribeOrderbook(symbol, depth);
  }

  bitgetSubscribeOrderbook(symbol: string, depth: 1 | 5 | 15 = 15) {
    return this.bitgetFuturesWsClient.subscribeOrderbook(symbol, depth);
  }

  gateSubscribeOrderbook(symbol: string, depth: 50 | 400 = 50) {
    return this.gateWsClient.subscribeOrderbook(symbol, depth);
  }

  bingxSubscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100 = 20) {
    return this.bingxWsClient.subscribeOrderbook(symbol, depth);
  }

  okxSubscribeOrderbook(symbol: string, depth: number = 20) {
    // OKX использует тот же клиент, что и Bybit (нужно проверить)
    return this.bybitWsClient.subscribeOrderbook(symbol, depth);
  }

  // Методы для отписки от стаканов
  mexcUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    // TODO: добавить метод unsubscribe в mexc.ws-client.ts если нужно
    return Promise.resolve();
  }

  bybitUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    // TODO: добавить метод unsubscribe в bybit.ws-client.ts если нужно
    return Promise.resolve();
  }

  bitgetUnsubscribeOrderbook(symbol: string, depth: 1 | 5 | 15 = 15) {
    return this.bitgetFuturesWsClient.unsubscribeOrderbook(symbol, depth);
  }

  gateUnsubscribeOrderbook(symbol: string, depth: 50 | 400 = 50) {
    // TODO: добавить метод unsubscribe в gate.ws-client.ts если нужно
    return Promise.resolve();
  }

  bingxUnsubscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100 = 20) {
    return this.bingxWsClient.unsubscribeOrderbook(symbol, depth);
  }

  okxUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    // TODO: добавить метод unsubscribe если нужно
    return Promise.resolve();
  }

  ourbitSubscribeOrderbook(symbol: string, depth: number = 200) {
    return this.ourbitWsClient.subscribeOrderbook(symbol, depth);
  }

  ourbitUnsubscribeOrderbook(symbol: string, depth: number = 200) {
    this.ourbitWsClient.unsubscribeOrderbook(symbol, depth);
    return Promise.resolve();
  }

  kucoinSubscribeOrderbook(symbol: string, depth: number = 20) {
    return this.kucoinWsClient.subscribeOrderbook(symbol, depth);
  }

  kucoinUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    this.kucoinWsClient.unsubscribeOrderbook(symbol, depth);
    return Promise.resolve();
  }

  binanceSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.binanceFuturesWsClient.subscribeCandles(symbol, resolution);
  }

  binanceUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    this.binanceFuturesWsClient.unsubscribeCandles(symbol, resolution);
    return Promise.resolve();
  }

  binanceSubscribeOrderbook(symbol: string, depth: number = 20) {
    return this.binanceFuturesWsClient.subscribeOrderbook(symbol, depth);
  }

  binanceUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    this.binanceFuturesWsClient.unsubscribeOrderbook(symbol, depth);
    return Promise.resolve();
  }

  bitmartSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.bitMartFuturesWsClient.subscribeCandles(symbol, resolution);
  }

  bitmartUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    this.bitMartFuturesWsClient.unsubscribeCandles(symbol, resolution);
    return Promise.resolve();
  }

  bitmartSubscribeOrderbook(symbol: string, depth: number = 20) {
    return this.bitMartFuturesWsClient.subscribeOrderbook(symbol, depth);
  }

  bitmartUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    this.bitMartFuturesWsClient.unsubscribeOrderbook(symbol, depth);
    return Promise.resolve();
  }

  htxSubscribeCandles(symbol: string, resolution: ResolutionString) {
    return this.htxFuturesWsClient.subscribeCandles(symbol, resolution);
  }

  htxUnsubscribeCandles(symbol: string, resolution: ResolutionString) {
    this.htxFuturesWsClient.unsubscribeCandles(symbol, resolution);
    return Promise.resolve();
  }

  htxSubscribeOrderbook(symbol: string, depth: number = 20) {
    return this.htxFuturesWsClient.subscribeOrderbook(symbol, depth);
  }

  htxUnsubscribeOrderbook(symbol: string, depth: number = 20) {
    this.htxFuturesWsClient.unsubscribeOrderbook(symbol, depth);
    return Promise.resolve();
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
        minstep: 0.0001,
        type: '',
      });
    }

    return this.alorApi.instruments.getSecurityByExchangeAndSymbol({
      symbol: symbol,
      exchange: Exchange.MOEX,
      format: 'Simple',
    });
  }

  getTrades(ticker: string, limit = 200) {
    return fetch(`${this.cryptoUrl}/mexc/trades?symbol=${ticker}&limit=${limit}`).then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });
  }

  getAggTrades(ticker: string, periodParams: PeriodParams) {
    return fetch(
      `${this.cryptoUrl}/mexc/agg-trades?from=${Math.max(periodParams.from, 0)}&symbol=${ticker}&to=${Math.max(periodParams.to, 1)}`,
    ).then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
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
    } else if (ticker.includes('GATEIO:')) {
      const _ticker = ticker.split('GATEIO:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/gate/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('BITGET:')) {
      const _ticker = ticker.split('BITGET:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/bitget/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('ITS:')) {
      const _ticker = ticker.split('ITS:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/its/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))));
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
          `${this.cryptoUrl}/bybit/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
        ).then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        }),
      ).pipe(
        map((r) => ({ history: r.sort((a, b) => a.time - b.time) })),
        catchError((error) => throwError(() => new Error(`Fetch error: ${error.message}`))),
      );
    } else if (ticker.includes('BINANCE:')) {
      const _ticker = ticker.split('BINANCE:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/binance/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('BITMART:')) {
      const _ticker = ticker.split('BITMART:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/bitmart/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('HTX:')) {
      const _ticker = ticker.split('HTX:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/htx/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('FINAM:')) {
      const _ticker = ticker.split('FINAM:')[1];
      request$ = from(
        fetch(
          `${this.ctraderUrl}/finam/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
      let _ticker = ticker.split('MEXC:')[1];

      if (_ticker.includes('_fair')) {
        _ticker = _ticker.split('_fair')[0];
        request$ = from(
          fetch(
            `${this.cryptoUrl}/mexc/f-candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
          fetch(
            `${this.cryptoUrl}/mexc/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
      }
    } else if (ticker.includes('OURBIT:')) {
      let _ticker = ticker.split('OURBIT:')[1];

      if (_ticker.includes('_fair')) {
        _ticker = _ticker.split('_fair')[0];
        request$ = from(
          fetch(
            `${this.cryptoUrl}/ourbit/f-candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
          fetch(
            `${this.cryptoUrl}/ourbit/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
      }
    } else if (ticker.includes('Aster:')) {
      const _ticker = ticker.split('Aster:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/aster/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('Hyperliquid:') || ticker.includes('HYPERLIQUID:')) {
      const _ticker = ticker.split('Hyperliquid:')[1] || ticker.split('HYPERLIQUID:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/hyperliquid/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('Lighter:') || ticker.includes('LIGHTER:')) {
      const _ticker = ticker.split('Lighter:')[1] || ticker.split('LIGHTER:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/hyperliquid/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
          `${this.cryptoUrl}/bingx/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('KUCOIN:')) {
      const _ticker = ticker.split('KUCOIN:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/kucoin/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
    } else if (ticker.includes('OKX:')) {
      const _ticker = ticker.split('OKX:')[1];
      request$ = from(
        fetch(
          `${this.cryptoUrl}/okx/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${_ticker}&to=${Math.max(periodParams.to, 1)}`,
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
