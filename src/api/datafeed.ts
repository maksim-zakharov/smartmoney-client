import {
  Bar,
  DatafeedConfiguration,
  DatafeedErrorCallback,
  DOMCallback,
  HistoryCallback,
  IBasicDataFeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SearchSymbolsCallback,
  ServerTimeCallback,
  SubscribeBarsCallback,
  SymbolResolveExtension,
} from '../assets/charting_library';
import { AlorApi, Exchange, Format, HistoryObject, Timeframe } from 'alor-api';
import { getCommonCandles, getPrecision } from '../utils';
import { calculateCandle } from '../../symbolFuturePairs';
import { BehaviorSubject, combineLatest, filter } from 'rxjs';
import { io, Socket } from 'socket.io-client';

const resolveOneSymbol = ({ api, symbolName }: { api: AlorApi; symbolName: string }) => {
  const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
  if (exist) {
    return Promise.resolve(JSON.parse(exist));
  }

  return (
    symbolName.includes('_xp')
      ? Promise.resolve({
          symbol: symbolName,
          exchange: 'XPBEE',
          currency: 'USDT',
          minstep: 0.01,
          type: '',
        })
      : api.instruments.getSecurityByExchangeAndSymbol({
          symbol: symbolName,
          exchange: Exchange.MOEX,
          format: 'Simple',
        })
  ).then((r) => {
    const precision = getPrecision(r.minstep);
    const priceScale = Number((10 ** precision).toFixed(precision));

    const resolve: LibrarySymbolInfo = {
      name: r.shortname,
      ticker: r.symbol,
      description: r.description,
      exchange: r.exchange,
      listed_exchange: r.exchange,
      currency_code: r.currency,
      minmov: Math.round(r.minstep * priceScale),
      pricescale: priceScale,
      format: 'price',
      type: r.type ?? '',
      has_empty_bars: false,
      has_intraday: true,
      has_seconds: true,
      has_weekly_and_monthly: true,
      weekly_multipliers: ['1', '2'],
      monthly_multipliers: ['1', '3', '6', '12'],
      timezone: 'Europe/Moscow',
      session: '0700-0000,0000-0200:1234567',
    };

    localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));

    return resolve;
  });
};

export class DataFeed implements IBasicDataFeed {
  private readonly subscriptions = new Map<string, any[]>();
  private readonly api: AlorApi;
  private readonly data?: HistoryObject[];
  private readonly multiple: number;
  private readonly ctidTraderAccountId?: number;

  private readonly ctraderUrl: string;

  private ws: Socket | null = null; // Add to class

  constructor(options: { ws: Socket; ctidTraderAccountId?: number; data?: HistoryObject[]; multiple: number; api: AlorApi }) {
    this.api = options.api;
    this.data = options.data;
    this.multiple = options.multiple;
    this.ctidTraderAccountId = options.ctidTraderAccountId;
    this.ws = options.ws;

    // this.ctraderUrl = 'http://localhost:3000'; //  'http://176.114.69.4';
    this.ctraderUrl = 'https://176.114.69.4';
  }

  // In constructor or onReady, init ws if needed.

  private initWs() {
    if (!this.ws) {
      this.ws = io(`http://176.114.69.4:3000/ctrader-ws`, {
        transports: ['websocket'],
      });
      this.ws.on('connect', () => console.log('WS connected'));
      this.ws.on('disconnect', () => console.log('WS disconnected'));
    }
  }

  getServerTime?(callback: ServerTimeCallback): void {
    this.api.http.get(`https://api.alor.ru/md/v2/time`).then((r) => callback(r.data));
  }
  searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: SearchSymbolsCallback): void {
    this.api.instruments
      .getSecurities({
        query: userInput.split('/')[0],
        format: 'Simple',
        exchange: exchange as any,
      })
      .then((results) => {
        const mapped = results.map((x) => ({
          symbol: x.symbol,
          exchange: x.exchange,
          ticker: `[${x.exchange}:${x.symbol}]`,
          description: x.description,
          type: '',
        }));

        const pref = results.find((r) => r.symbol.includes(`${userInput.split('/')[0]}P`));

        if (results.length && pref) {
          mapped.unshift({
            symbol: `${userInput.split('/')[0]}/${userInput.split('/')[0]}P`,
            exchange: results[0].exchange,
            ticker: `[${userInput.split('/')[0]}/${userInput.split('/')[0]}P]`,
            description: `${results[0].description}/${pref.description}`,
            type: '',
          });
        }

        return onResult(mapped);
      });
  }
  resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: DatafeedErrorCallback, extension?: SymbolResolveExtension): void {
    const isSentetic = symbolName.includes('/');
    if (!isSentetic) {
      resolveOneSymbol({
        api: this.api,
        symbolName,
      }).then(onResolve);
    } else {
      const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
      if (exist) {
        onResolve(JSON.parse(exist));
        return;
      }
      const parts = symbolName.split('/');
      Promise.all(
        parts.map((part) =>
          part.includes('_xp')
            ? Promise.resolve({
                symbol: part,
                exchange: 'XPBEE',
                currency: 'USDT',
                minstep: 0.01,
                type: '',
              })
            : this.api.instruments.getSecurityByExchangeAndSymbol({
                symbol: part,
                exchange: Exchange.MOEX,
                format: 'Simple',
              }),
        ),
      ).then((instruments) => {
        const obj = instruments.reduce(
          (acc, curr) =>
            ({
              name: acc.name ? `${acc.name}/${curr.symbol}` : curr.symbol,
              ticker: acc.ticker ? `${acc.ticker}/${curr.symbol}` : curr.symbol,
              description: acc.description ? `${acc.description}/${curr.symbol}` : curr.symbol,
              exchange: acc.exchange || curr.exchange,
              listed_exchange: acc.exchange || curr.exchange,
              currency_code: acc.currency_code || curr.currency,
              minstep: Math.min(acc.minstep, curr.minstep),
              type: acc.type || curr.type,
            }) as Partial<LibrarySymbolInfo>,
          {
            name: '',
            ticker: '',
            description: '',
            exchange: '',
            listed_exchange: '',
            currency_code: '',
            minstep: Infinity,
            type: '',
          } as any,
        );

        const precision = getPrecision(obj.minstep);
        const priceScale = Number((10 ** 3).toFixed(3));

        const resolve: LibrarySymbolInfo = {
          ...obj,
          minmov: Math.round(obj.minstep * priceScale),
          pricescale: priceScale,
          format: 'price',
          has_empty_bars: false,
          has_intraday: true,
          has_seconds: true,
          has_weekly_and_monthly: true,
          weekly_multipliers: ['1', '2'],
          monthly_multipliers: ['1', '3', '6', '12'],
          timezone: 'Europe/Moscow',
          session: '0700-0000,0000-0200:1234567',
        };

        onResolve(resolve);

        localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));
      });
    }
  }
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback,
  ): void {
    if (this.data) {
      onResult(
        this.data.map(
          (x) =>
            ({
              ...x,
              time: x.time * 1000,
            }) as Bar,
        ),
      );
      return;
    }
    const isSentetic = symbolInfo.ticker.includes('/');
    if (!isSentetic) {
      (symbolInfo.ticker.includes('_xp')
        ? fetch(
            `${this.ctraderUrl}/ctrader/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${symbolInfo.ticker}&to=${Math.max(periodParams.to, 1)}`,
          )
            .then((res) => res.json())
            .then((d) => ({ history: d, next: null, prev: null }))
        : this.api.instruments.getHistory({
            symbol: symbolInfo.ticker,
            exchange: symbolInfo.exchange as any,
            from: Math.max(periodParams.from, 0),
            to: Math.max(periodParams.to, 1),
            tf: this.parseTimeframe(resolution),
            countBack: periodParams.countBack,
          })
      ).then((res) => {
        const dataIsEmpty = res.history.length === 0;

        const nextTime = periodParams.firstDataRequest ? res.next : res.prev;
        onResult(
          res.history.map(
            (x) =>
              ({
                ...x,
                time: x.time * 1000,
              }) as Bar,
          ),
          {
            noData: dataIsEmpty,
            nextTime: dataIsEmpty ? nextTime : undefined,
          },
        );
      });
    } else {
      const parts = symbolInfo.ticker.split('/');
      Promise.all(
        parts.map((symbol) =>
          symbol.includes('_xp')
            ? fetch(
                `${this.ctraderUrl}/ctrader/candles?tf=${this.parseTimeframe(resolution)}&from=${Math.max(periodParams.from, 0)}&symbol=${symbol}&to=${Math.max(periodParams.to, 1)}${this.ctidTraderAccountId ? `&ctidTraderAccountId=${this.ctidTraderAccountId}` : ''}`,
              )
                .then((res) => res.json())
                .then((d) => ({ history: d, next: null, prev: null }))
            : this.api.instruments.getHistory({
                symbol: symbol,
                exchange: symbolInfo.exchange as any,
                from: Math.max(periodParams.from, 0),
                to: Math.max(periodParams.to, 1),
                tf: this.parseTimeframe(resolution),
                countBack: periodParams.countBack,
              }),
        ),
      ).then((res) => {
        const dataIsEmpty = res.some((r) => !r.history.length);

        const nextTime = periodParams.firstDataRequest ? res.find((r) => r.next)?.next : res.find((r) => r.prev)?.prev;

        let newCandles = res[0].history;

        for (let i = 1; i < res.length; i++) {
          const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(newCandles, res[i].history);

          newCandles = filteredFuturesCandles
            .map((item, index) => calculateCandle(filteredStockCandles[index], item, i === res.length - 1 ? this.multiple : 1))
            .filter(Boolean);
        }

        onResult(
          newCandles.map(
            (x) =>
              ({
                ...x,
                time: x.time * 1000,
              }) as Bar,
          ),
          {
            noData: dataIsEmpty,
            nextTime: dataIsEmpty ? nextTime : undefined,
          },
        );
      });
    }
  }
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ): void {
    const parts = symbolInfo.ticker.split('/');
    const isForex = symbolInfo.ticker.includes('_xp');
    if (parts.length === 1) {
      if (isForex) {
        this.initWs();
        const symbol = symbolInfo.ticker.replace('_xp', ''); // Adjust if needed
        const tf = this.parseTimeframe(resolution) as Timeframe; // Ensure it matches Timeframe enum

        // Subscribe to WS
        this.ws.emit('subscribe_candle', { symbol, tf });

        // Listen for updates
        const eventHandler = (data: { symbol: string; tf: string; candle: HistoryObject }) => {
          if (data.tf.toString() === tf.toString() && data.symbol === symbol)
            onTick({ ...data.candle, time: data.candle.time * 1000 } as Bar);
        };
        this.ws.on('candle', eventHandler);

        // Store for unsubscribe: e.g., this.subscriptions.set(listenerGuid, () => {
        //   this.ws.emit('unsubscribe_candle', { symbol, tf });
        //   this.ws.off('candle', eventHandler);
        // });
        this.subscriptions.set(listenerGuid, [
          () => {
            this.ws.emit('unsubscribe_candle', { symbol, tf });
            this.ws.off('candle', eventHandler);
          },
        ]);
        return;
      } else {
        this.api.subscriptions
          .candles(
            {
              code: parts[0],
              exchange: symbolInfo.exchange,
              format: Format.Simple,
              tf: this.parseTimeframe(resolution),
            },
            (data) => onTick({ ...data, time: data.time * 1000 } as Bar),
          )
          .then((unsub) => this.subscriptions.set(listenerGuid, [unsub]));
      }
    } else {
      const lastCandles = parts.reduce((acc, curr) => {
        acc[curr] = new BehaviorSubject<HistoryObject>(null);
        return acc;
      }, {});

      combineLatest(Object.values<HistoryObject>(lastCandles))
        .pipe(
          filter((val) => {
            for (let i = 1; i < val.length; i++) {
              if (val[i]?.time !== val[i - 1]?.time) {
                return false;
              }
            }
            if (val.some((v) => !v)) {
              return false;
            }

            return true;
          }),
        )
        .subscribe((resp) => {
          let newCandle = resp[0];

          for (let i = 1; i < resp.length; i++) {
            newCandle = calculateCandle(newCandle, resp[i], i === resp.length - 1 ? this.multiple : 1);
          }
          if (newCandle) onTick({ ...newCandle, time: newCandle.time * 1000 } as Bar);
        });

      const secondProm = (symbol: string) => {
        const isForex = symbol.includes('_xp');
        if (isForex) {
          this.initWs();
          const tf = this.parseTimeframe(resolution) as Timeframe; // Ensure it matches Timeframe enum

          // Subscribe to WS
          this.ws.emit('subscribe_candle', { symbol, tf });

          // Listen for updates
          const eventHandler = (data: { symbol: string; tf: string; candle: HistoryObject }) => {
            if (data.tf.toString() === tf.toString() && data.symbol === symbol) lastCandles[symbol].next(data.candle);
          };
          this.ws.on('candle', eventHandler);

          // Store for unsubscribe: e.g., this.subscriptions.set(listenerGuid, () => {
          //   this.ws.emit('unsubscribe_candle', { symbol, tf });
          //   this.ws.off('candle', eventHandler);
          // });
          return Promise.resolve(() => {
            this.ws.emit('unsubscribe_candle', { symbol, tf });
            this.ws.off('candle', eventHandler);
          });
        } else {
          return this.api.subscriptions.candles(
            {
              code: symbol,
              exchange: symbolInfo.exchange,
              format: Format.Simple,
              tf: this.parseTimeframe(resolution),
            },
            (data) => lastCandles[symbol].next(data),
          );
        }
      };
      Promise.all([parts.map(secondProm)]).then((unsubs) => this.subscriptions.set(listenerGuid, unsubs));
    }
  }
  unsubscribeBars(listenerGuid: string): void {
    this.subscriptions.get(listenerGuid)?.forEach((c) => c());
    this.subscriptions.delete(listenerGuid);
  }
  subscribeDepth?(symbol: string, callback: DOMCallback): string {
    throw new Error('Method not implemented.');
  }
  unsubscribeDepth?(subscriberUID: string): void {
    throw new Error('Method not implemented.');
  }
  getVolumeProfileResolutionForPeriod?(
    currentResolution: ResolutionString,
    from: number,
    to: number,
    symbolInfo: LibrarySymbolInfo,
  ): ResolutionString {
    debugger;
    throw new Error('Method not implemented.');
  }
  onReady(callback: OnReadyCallback): void {
    const config: DatafeedConfiguration = {
      supports_time: true,
      supported_resolutions: this.getSupportedResolutions(),
      exchanges: [].map((x) => ({
        value: x.exchange,
        name: x.exchange,
        desc: x.exchange,
      })),
    };

    setTimeout(() => callback(config), 0);
  }

  private getSupportedResolutions(): ResolutionString[] {
    return [
      '1S' as ResolutionString,
      '5S' as ResolutionString,
      '10S' as ResolutionString,
      '15S' as ResolutionString,
      '30S' as ResolutionString,
      '45S' as ResolutionString,
      '1' as ResolutionString,
      '2' as ResolutionString,
      '3' as ResolutionString,
      '5' as ResolutionString,
      '10' as ResolutionString,
      '15' as ResolutionString,
      '30' as ResolutionString,
      '45' as ResolutionString,
      '1H' as ResolutionString,
      '2H' as ResolutionString,
      '3H' as ResolutionString,
      '4h' as ResolutionString,
      '1D' as ResolutionString,
      '1W' as ResolutionString,
      '2W' as ResolutionString,
      '1M' as ResolutionString,
      '3M' as ResolutionString,
      '6M' as ResolutionString,
      '12M' as ResolutionString,
    ];
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
