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
} from '../../assets/charting_library';
import { AlorApi, Format, HistoryObject } from 'alor-api';
import { getCommonCandles, getPrecision } from '../../utils.ts';
import { calculateCandle } from '../../../symbolFuturePairs.ts';
import { BehaviorSubject, combineLatest, filter } from 'rxjs';
import { DataService } from './data.service.ts';

const resolveOneSymbol = ({ dataService, symbolName }: { dataService: DataService; symbolName: string }) => {
  // const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
  // if (exist) {
  //   return Promise.resolve(JSON.parse(exist));
  // }

  return dataService.getSymbol(symbolName).then((r) => {
    const precision = getPrecision(r.minstep);
    const priceScale = Number((10 ** precision).toFixed(precision));

    let session = '0700-0000,0000-0200:1234567';
    let timezone: string = 'Europe/Moscow';
    if (r.symbol.includes('_xp') || r.symbol.includes('FOREX:')) {
      session = '0100-0000,0000-0100:23456';
    } else if (!r.symbol.includes('FINAM') && r.symbol.includes(':')) {
      session = '24x7';
      // Криптовалютные биржи работают в UTC
      timezone = 'UTC';
    }

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
      timezone: timezone as any,
      session,
    };

    // localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));

    return resolve;
  });
};

export class DataFeed implements IBasicDataFeed {
  private readonly subscriptions = new Map<string, any[]>();
  private readonly api: AlorApi;
  private readonly dataService: DataService;
  private readonly data?: HistoryObject[];
  private readonly multiple: number;
  private readonly ctidTraderAccountId?: number;

  private readonly ctraderUrl: string;

  private readonly onNewCandle: (ticker: string, candle: HistoryObject) => void;

  constructor(options: {
    onNewCandle: any;
    ctidTraderAccountId?: number;
    data?: HistoryObject[];
    multiple: number;
    dataService: DataService;
  }) {
    this.api = options.dataService.alorApi;
    this.dataService = options.dataService;
    this.data = options.data;
    this.multiple = options.multiple;
    this.ctidTraderAccountId = options.ctidTraderAccountId;

    this.onNewCandle = options.onNewCandle;

    // this.ctraderUrl = 'http://localhost:3000'; //  'http://5.35.13.149';
    this.ctraderUrl = 'https://176.114.69.4';
  }

  getServerTime?(callback: ServerTimeCallback): void {
    this.dataService.serverTime$.subscribe(callback);
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
        dataService: this.dataService,
        symbolName,
      }).then(onResolve);
    } else {
      // const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
      // // if (exist) {
      // //   onResolve(JSON.parse(exist));
      // //   return;
      // // }
      const parts = symbolName.split('/');
      Promise.all(parts.map((part) => this.dataService.getSymbol(part))).then((instruments) => {
        const obj = instruments.reduce(
          (acc, curr) =>
            ({
              name: acc.name ? `${acc.name}/${curr.symbol}` : curr.symbol,
              ticker: acc.ticker ? `${acc.ticker}/${curr.symbol}` : curr.symbol,
              description: acc.description ? `${acc.description}/${curr.symbol}` : curr.symbol,
              exchange: acc.exchange || curr.exchange,
              listed_exchange: acc.exchange || curr.exchange,
              currency_code: acc.currency_code || curr.currency,
              minstep: 0.00001, // Math.min(acc.minstep, curr.minstep),
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
        const priceScale = Number((10 ** 5).toFixed(5));

        let session = '0700-0000,0000-0200:1234567';
        let timezone: string = 'Europe/Moscow';
        if (obj.ticker.includes('_xp') || obj.ticker.includes('FOREX:')) {
          session = '0100-0000,0000-0100:23456';
        } else if (!obj.ticker.includes('FINAM') && obj.ticker.includes(':')) {
          session = '24x7';
          // Криптовалютные биржи работают в UTC
          timezone = 'UTC';
        }

        const resolve: LibrarySymbolInfo = {
          ...obj,
          minmov: 100, // Math.round(obj.minstep * priceScale),
          pricescale: priceScale,
          format: 'price',
          has_empty_bars: false,
          has_intraday: true,
          has_seconds: true,
          has_weekly_and_monthly: true,
          weekly_multipliers: ['1', '2'],
          monthly_multipliers: ['1', '3', '6', '12'],
          timezone: timezone as any,
          session,
        };

        onResolve(resolve);

        // localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));
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
      this.dataService.getChartData(symbolInfo.ticker, resolution, periodParams).subscribe((res) => {
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
      Promise.all(parts.map((symbol) => this.dataService.getChartData(symbol, resolution, periodParams).toPromise())).then((res) => {
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
    const secondProm = async (symbol: string, callback) => {
      const isForex = symbol.includes('_xp');
      // TODO Сделать отписки
      if (isForex) {
        return this.dataService.ctraderSubscribeCandles(symbol, resolution).subscribe((data) => {
          callback(data);
        });
        // TODO BYBIT крипо работают свечи в целом
      } else if (symbol.includes('BYBIT')) {
        this.dataService.bybitSubscribeCandles(symbol.split('BYBIT:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.bybitUnsubscribeCandles(symbol.split('BYBIT:')[1], resolution);
      } else if (symbol.includes('OKX')) {
        this.dataService.okxSubscribeCandles(symbol.split('OKX:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.okxUnsubscribeCandles(symbol.split('OKX:')[1], resolution);
      } else if (symbol.includes('BITGET')) {
        this.dataService.bitgetSubscribeCandles(symbol.split('BITGET:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.bitgetUnsubscribeCandles(symbol.split('BITGET:')[1], resolution);
      } else if (symbol.includes('BINGX')) {
        this.dataService.bingxSubscribeCandles(symbol.split('BINGX:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.bingxUnsubscribeCandles(symbol.split('BINGX:')[1], resolution);
      } else if (symbol.includes('GATEIO')) {
        this.dataService.gateSubscribeCandles(symbol.split('GATEIO:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.gateUnsubscribeCandles(symbol.split('GATEIO:')[1], resolution);
        // TODO Сделать отписки для спота
      } else if (symbol.includes('MEXC')) {
        this.dataService.mexcSubscribeCandles(symbol.split('MEXC:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.mexcUnsubscribeCandles(symbol.split('MEXC:')[1], resolution);
        // TODO Сделать отписки
      } else if (symbol.includes('OURBIT')) {
        this.dataService.ourbitSubscribeCandles(symbol.split('OURBIT:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.ourbitUnsubscribeCandles(symbol.split('OURBIT:')[1], resolution);
        // TODO Сделать отписки
      } else if (symbol.includes('FINAM')) {
        return this.dataService.finamSubscribeCandles(symbol.split('FINAM:')[1], resolution).subscribe((data) => {
          callback(data);
        });
      } else if (symbol.includes('KUCOIN')) {
        const ticker = symbol.split('KUCOIN:')[1];
        this.dataService.kucoinSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.kucoinUnsubscribeCandles(ticker, resolution);
      } else if (symbol.includes('ASTER') || symbol.includes('Aster:')) {
        const _symbol = symbol.split('ASTER:')[1] || symbol.split('Aster:')[1];
        this.dataService.asterSubscribeCandles(_symbol, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.asterUnsubscribeCandles(_symbol, resolution);
      } else if (symbol.includes('HYPERLIQUID') || symbol.includes('Hyperliquid:')) {
        const _symbol = symbol.split('HYPERLIQUID:')[1] || symbol.split('Hyperliquid:')[1];
        this.dataService.hyperliquidSubscribeCandles(_symbol, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.hyperliquidUnsubscribeCandles(_symbol, resolution);
      } else if (symbol.includes('BINANCE')) {
        const ticker = symbol.split('BINANCE:')[1];
        this.dataService.binanceSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.binanceUnsubscribeCandles(ticker, resolution);
      } else if (symbol.includes('BITMART')) {
        const ticker = symbol.split('BITMART:')[1];
        this.dataService.bitmartSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.bitmartUnsubscribeCandles(ticker, resolution);
      } else if (symbol.includes('HTX')) {
        const ticker = symbol.split('HTX:')[1];
        this.dataService.htxSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.htxUnsubscribeCandles(ticker, resolution);
      } else if (symbol.includes('PHEMEX')) {
        const ticker = symbol.split('PHEMEX:')[1];
        this.dataService.phemexSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.phemexUnsubscribeCandles(ticker, resolution);
      } else if (symbol.includes('BITUNIX')) {
        const ticker = symbol.split('BITUNIX:')[1];
        this.dataService.bitunixSubscribeCandles(ticker, resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.bitunixUnsubscribeCandles(ticker, resolution);
      } else {
        return this.api.subscriptions.candles(
          {
            code: symbol,
            exchange: symbolInfo.exchange,
            format: Format.Simple,
            tf: this.parseTimeframe(resolution),
          },
          (data) => callback(data),
        );
      }
    };

    const parts = symbolInfo.ticker.split('/');
    const isForex = symbolInfo.ticker.includes('_xp');
    if (parts.length === 1) {
      secondProm(parts[0], (data) => onTick({ ...data, time: data.time * 1000 } as Bar)).then((unsubs) =>
        this.subscriptions.set(listenerGuid, [unsubs]),
      );
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
          if (newCandle) {
            this.onNewCandle(symbolInfo.ticker, newCandle);

            // Сюда добавить обработчик телеграмм алертов
            onTick({ ...newCandle, time: newCandle.time * 1000 } as Bar);
          }
        });
      Promise.all([parts.map((part) => secondProm(part, (candle) => lastCandles[part].next(candle)))]).then((unsubs) =>
        this.subscriptions.set(listenerGuid, unsubs),
      );
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
