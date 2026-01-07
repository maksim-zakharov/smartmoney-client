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


