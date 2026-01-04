// API методы для получения списка тикеров по каждой бирже

export interface TickerInfo {
  symbol: string;
  [key: string]: any;
}

/**
 * Получить список фьючерсов для MEXC (через прокси)
 */
export async function getMexcFuturesTickers(): Promise<TickerInfo[]> {
  const url = encodeURIComponent('https://contract.mexc.com/api/v1/contract/ticker');
  const response = await fetch(`http://5.35.13.149/proxy?url=${url}`);
  const data = await response.json();
  return data?.data || [];
}

/**
 * Получить список фьючерсов для Bybit
 */
export async function getBybitFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
  const data = await response.json();
  return data?.result?.list?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для Binance
 */
export async function getBinanceFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
  const data = await response.json();
  return data?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для Gate
 */
export async function getGateFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.gateio.ws/api/v4/futures/usdt/tickers');
  const data = await response.json();
  return data || [];
}

/**
 * Получить список фьючерсов для OKX
 */
export async function getOKXFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.instId.endsWith('-USDT-SWAP')) || [];
}

/**
 * Получить список фьючерсов для Bitget
 */
export async function getBitgetFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES');
  const data = await response.json();
  return data?.data || [];
}

/**
 * Получить список фьючерсов для KuCoin
 */
export async function getKuCoinFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api-futures.kucoin.com/api/v1/contracts/active');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.symbol.endsWith('USDTM')) || [];
}

/**
 * Получить список фьючерсов для BingX
 */
export async function getBingXFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://open-api.bingx.com/openApi/swap/v2/quote/ticker');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.symbol.endsWith('-USDT')) || [];
}

/**
 * Получить список фьючерсов для Ourbit
 */
export async function getOurbitFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://fapi.ourbit.com/api/v1/ticker/24hr');
  const data = await response.json();
  return data?.data || [];
}

/**
 * Получить список фьючерсов для BitMart
 */
export async function getBitMartFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api-cloud.bitmart.com/contract/public/details');
  const data = await response.json();
  return data?.data?.symbols?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для HTX
 */
export async function getHTXFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.hbdm.com/linear-swap-api/v1/swap_contract_info');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.contract_code.endsWith('-USDT')) || [];
}

/**
 * Получить список фьючерсов для Phemex
 */
export async function getPhemexFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.phemex.com/md/ticker/24hr');
  const data = await response.json();
  return data?.result?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для Bitunix
 */
export async function getBitunixFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.bitunix.com/api/v1/ticker/24hr');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для XT
 */
export async function getXTFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://fapi.xt.com/future/market/v1/public/q/ticker');
  const data = await response.json();
  return data?.result?.filter((t: any) => t.symbol.endsWith('_USDT')) || [];
}

/**
 * Получить список фьючерсов для Toobit
 */
export async function getToobitFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.toobit.com/fapi/v1/ticker/24hr');
  const data = await response.json();
  return data?.filter((t: any) => t.symbol.endsWith('-USDT')) || [];
}

/**
 * Получить список фьючерсов для Hyperliquid
 */
export async function getHyperliquidFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' }),
  });
  const data = await response.json();
  return Object.keys(data || {}).map((symbol) => ({ symbol })) || [];
}

/**
 * Получить список фьючерсов для Aster
 */
export async function getAsterFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api.asterdex.com/api/v1/ticker/24hr');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.symbol.endsWith('USDT')) || [];
}

/**
 * Получить список фьючерсов для Hotcoin
 */
export async function getHotcoinFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://api-ct.hotcoin.fit/api/v1/perpetual/public');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.contractCode.endsWith('usdt')) || [];
}

/**
 * Получить список фьючерсов для KCEX
 */
export async function getKcexFuturesTickers(): Promise<TickerInfo[]> {
  const response = await fetch('https://www.kcex.com/api/v1/ticker/24hr');
  const data = await response.json();
  return data?.data?.filter((t: any) => t.symbol.endsWith('_USDT')) || [];
}

/**
 * Маппинг бирж на функции получения тикеров
 */
export const tickerFetchers: Record<string, () => Promise<TickerInfo[]>> = {
  MEXC: getMexcFuturesTickers,
  BYBIT: getBybitFuturesTickers,
  BINANCE: getBinanceFuturesTickers,
  BITGET: getBitgetFuturesTickers,
  OKX: getOKXFuturesTickers,
  GATE: getGateFuturesTickers,
  GATEIO: getGateFuturesTickers,
  KUCOIN: getKuCoinFuturesTickers,
  BINGX: getBingXFuturesTickers,
  OURBIT: getOurbitFuturesTickers,
  BITMART: getBitMartFuturesTickers,
  HTX: getHTXFuturesTickers,
  PHEMEX: getPhemexFuturesTickers,
  BITUNIX: getBitunixFuturesTickers,
  XT: getXTFuturesTickers,
  TOOBIT: getToobitFuturesTickers,
  HYPERLIQUID: getHyperliquidFuturesTickers,
  ASTER: getAsterFuturesTickers,
  HOTCOIN: getHotcoinFuturesTickers,
  KCEX: getKcexFuturesTickers,
};

/**
 * Получить список тикеров для указанной биржи
 */
export async function getFuturesTickers(exchange: string): Promise<TickerInfo[]> {
  const fetcher = tickerFetchers[exchange.toUpperCase()];
  if (!fetcher) {
    throw new Error(`Биржа ${exchange} не поддерживается`);
  }
  return fetcher();
}

