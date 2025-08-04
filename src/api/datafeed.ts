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
import { AlorApi, Exchange, HistoryObject } from 'alor-api';
import { getPrecision } from '../utils.ts';

export class DataFeed implements IBasicDataFeed {
  constructor(
    private readonly api: AlorApi,
    private readonly data?: HistoryObject[],
  ) {}

  // getMarks?(
  //   symbolInfo: LibrarySymbolInfo,
  //   from: number,
  //   to: number,
  //   onDataCallback: GetMarksCallback<Mark>,
  //   resolution: ResolutionString,
  // ): void {
  //   debugger;
  //   throw new Error('Method not implemented.');
  // }
  // getTimescaleMarks?(
  //   symbolInfo: LibrarySymbolInfo,
  //   from: number,
  //   to: number,
  //   onDataCallback: GetMarksCallback<TimescaleMark>,
  //   resolution: ResolutionString,
  // ): void {
  //   debugger;
  //   throw new Error('Method not implemented.');
  // }

  getServerTime?(callback: ServerTimeCallback): void {
    this.api.http.get(`https://api.alor.ru/md/v2/time`).then((r) => callback(r.data));
  }
  searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: SearchSymbolsCallback): void {
    this.api.instruments
      .getSecurities({
        query: userInput,
        format: 'Simple',
        exchange: exchange as any,
      })
      .then((results) => {
        return onResult(
          results.map((x) => ({
            symbol: x.symbol,
            exchange: x.exchange,
            ticker: `[${x.exchange}:${x.symbol}]`,
            description: x.description,
            type: '',
          })),
        );
      });
  }
  resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: DatafeedErrorCallback, extension?: SymbolResolveExtension): void {
    this.api.instruments
      .getSecurityByExchangeAndSymbol({
        symbol: symbolName,
        exchange: Exchange.MOEX,
        format: 'Simple',
      })
      .then((r) => {
        const precision = getPrecision(r.minstep);
        const priceScale = Number((10 ** precision).toFixed(precision));

        const resolve: LibrarySymbolInfo = {
          // @ts-ignore
          name: r.shortName,
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

        onResolve(resolve);
      });
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
    this.api.instruments
      .getHistory({
        symbol: symbolInfo.ticker,
        exchange: symbolInfo.exchange as any,
        from: Math.max(periodParams.from, 0),
        to: Math.max(periodParams.to, 1),
        tf: this.parseTimeframe(resolution),
        countBack: periodParams.countBack,
      })
      .then((res) => {
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
  }
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ): void {
    debugger;
    throw new Error('Method not implemented.');
  }
  unsubscribeBars(listenerGuid: string): void {
    debugger;
    throw new Error('Method not implemented.');
  }
  subscribeDepth?(symbol: string, callback: DOMCallback): string {
    debugger;
    throw new Error('Method not implemented.');
  }
  unsubscribeDepth?(subscriberUID: string): void {
    debugger;
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
