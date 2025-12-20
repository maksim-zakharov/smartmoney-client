/**
 * Таймфреймы для Bitget API
 * Поддерживаемые значения: 1m, 5m, 15m, 30m, 1H, 4H, 6H, 12H, 1D, 1W
 */
export enum BitgetTimeframe {
  Min1 = '1m',
  Min5 = '5m',
  Min15 = '15m',
  Min30 = '30m',
  Hour1 = '1H',
  Hour4 = '4H',
  Hour6 = '6H',
  Hour12 = '12H',
  Day = '1D',
  Week = '1W',
}

export interface BitgetWSFTicker {
  instId: string;
  lastPr: string;
  bidPr: string;
  askPr: string;
  bidSz: string;
  askSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  change24h: string;
  fundingRate: string;
  nextFundingTime: string;
  markPrice: string;
  indexPrice: string;
  holdingAmount: string;
  baseVolume: string;
  quoteVolume: string;
  openUtc: string;
  symbolType: string;
  symbol: string;
  deliveryPrice: string;
  ts: string;
}

export interface BitgetWSTrade {
  ts: string;
  price: string;
  size: string;
  side: 'sell' | 'buy';
  tradeId: string;
}

