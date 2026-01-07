export const getTickerWithSuffix = (exchange: string, ticker: string): string => {
  const exchangeUpper = exchange.toUpperCase();

  // Определяем суффикс в зависимости от биржи
  switch (exchangeUpper) {
    case 'MEXC':
      return `${ticker}_USDT`;
    case 'BYBIT':
    case 'BINANCE':
    case 'BITGET':
      return `${ticker}USDT`;
    case 'OKX':
      return `${ticker}-USDT-SWAP`;
    case 'BINGX':
      return `${ticker}-USDT`;
    case 'GATE':
    case 'GATEIO':
      return `${ticker}_USDT`;
    case 'KUCOIN':
      return `${ticker}USDTM`;
    case 'OURBIT':
      return `${ticker}_USDT`;
    case 'BITMART':
      return `${ticker}USDT`;
    case 'HTX':
      return `${ticker}-USDT`;
    case 'PHEMEX':
      return `${ticker}-USDT`;
    case 'BITUNIX':
      return `${ticker}USDT`;
    case 'XT':
      return `${ticker}_USDT`;
    case 'TOOBIT':
      return `${ticker}-USDT`;
    case 'HYPERLIQUID':
      // Hyperliquid использует тикер без суффикса
      return ticker;
    case 'ASTER':
      return `${ticker}USDT`;
    case 'HOTCOIN': {
      // Hotcoin использует формат btcusdt (нижний регистр, без дефисов)
      const hotcoinTicker = ticker.toLowerCase().replace('-', '').replace('_', '');
      // Если символ не заканчивается на usdt, добавляем его
      if (!hotcoinTicker.endsWith('usdt')) {
        return hotcoinTicker + 'usdt';
      }
      return hotcoinTicker;
    }
    case 'KCEX':
      return `${ticker}_USDT`;
    case 'COINEX':
      // COINEX использует формат BTCUSDT (без дефисов и подчеркиваний)
      return `${ticker}USDT`.replace(/[-_]/g, '');
    default:
      // По умолчанию используем формат MEXC
      return `${ticker}_USDT`;
  }
};

/**
 * Генерация URL биржи с тикером (фьючерсы) с реферальными кодами
 * @param exchange - Название биржи
 * @param ticker - Тикер (например, BTC)
 * @returns URL для перехода на биржу
 */
export const getExchangeUrl = (exchange: string, ticker: string): string => {
  const exchangeUpper = exchange.toUpperCase();

  switch (exchangeUpper) {
    case 'GATEIO':
    case 'GATE':
      return `https://www.gate.com/ru/futures/USDT/${ticker}_USDT?ref=BFQWBFs`;
    case 'BYBIT':
      return `https://www.bybit.com/trade/usdt/${ticker}USDT?ref=1WG1366`;
    case 'BINGX':
      return `https://bingx.com/ru-ru/perpetual/${ticker}-USDT?ref=QWIF2Z`;
    case 'MEXC':
      return `https://www.mexc.com/ru-RU/futures/${ticker}_USDT?type=linear_swap&shareCode=mexc-2Yy26`;
    case 'OKX':
      return `https://www.okx.com/ru/trade-swap/${ticker.toLowerCase()}-usdt-swap?channelid=37578249`;
    case 'BITGET':
      return `https://www.bitget.com/futures/usdt/${ticker}USDT`;
    case 'KUCOIN':
      return `https://www.kucoin.com/trade/futures/${ticker}USDTM?ref=CX8XF1EA`;
    case 'BINANCE':
      return `https://www.binance.com/en/futures/${ticker}USDT?ref=13375376`;
    case 'OURBIT':
      return `https://futures.ourbit.com/ru-RU/exchange/${ticker}_USDT?inviteCode=U587UV`;
    case 'BITMART':
      return `https://derivatives.bitmart.com/ru-RU/futures/${ticker}USDT?theme=dark`;
    case 'HTX':
      return `https://www.htx.com/ru-ru/futures/linear_swap/exchange#contract_code=${ticker}-USDT`;
    case 'PHEMEX':
      return `https://phemex.com/futures/${ticker}-USDT`;
    case 'BITUNIX':
      return `https://www.bitunix.com/contract-trade/${ticker}USDT`;
    case 'XT':
      return `https://www.xt.com/en/futures/trade/${ticker.toLowerCase()}_usdt`;
    case 'TOOBIT': {
      // Преобразуем тикер в формат Toobit: BTC -> BTC-SWAP-USDT, RIVER-USDT -> RIVER-SWAP-USDT
      const toobitTicker = ticker.includes('-SWAP-')
        ? ticker
        : ticker.endsWith('-USDT')
          ? ticker.replace('-USDT', '-SWAP-USDT')
          : `${ticker}-SWAP-USDT`;
      return `https://www.toobit.com/ru-RU/futures/${toobitTicker}`;
    }
    case 'HYPERLIQUID':
      return `https://app.hyperliquid.xyz/trade/${ticker}`;
    case 'ASTER':
      return `https://www.asterdex.com/en/futures/v1/${ticker}USDT?ref=59E067`;
    case 'HOTCOIN': {
      // Hotcoin использует формат btcusdt (нижний регистр, без дефисов)
      const hotcoinTicker = ticker.toLowerCase().replace('-', '').replace('_', '');
      return `https://www.hotcoin.com/en_US/contract/exchange/trade/?tradeName=${hotcoinTicker}`;
    }
    case 'KCEX':
      return `https://www.kcex.com/futures/${ticker}_USDT`;
    default:
      return '#';
  }
};

