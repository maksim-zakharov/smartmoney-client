import { MexcTradingService, PlaceLimitOrderParams, PlaceOrderResponse } from './mexc-trading.service';
import { BybitTradingService, BybitPlaceMarketOrderParams, BybitPlaceOrderResponse } from './bybit-trading.service';
import { BitgetTradingService, BitgetPlaceMarketOrderParams, BitgetPlaceOrderResponse } from './bitget-trading.service';
import { BitmartTradingService, BitmartPlaceMarketOrderParams, BitmartPlaceOrderResponse } from './bitmart-trading.service';

/**
 * Интерфейс для размещения лимитного ордера (универсальный)
 */
export interface TradingPlaceLimitOrderParams {
  /** Биржа */
  exchange: string;
  /** Auth Token (для MEXC - WEB authentication key) или API ключ (для других бирж) */
  authToken?: string;
  /** API ключ (для бирж, которые используют apiKey/secretKey) */
  apiKey?: string;
  /** Секретный ключ (для бирж, которые используют apiKey/secretKey) */
  secretKey?: string;
  /** Символ (например, BTC_USDT) */
  symbol: string;
  /** Сторона ордера: BUY или SELL */
  side: 'BUY' | 'SELL';
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
  /** Плечо (опционально, по умолчанию зависит от биржи) */
  leverage?: number;
  /** Количество в долларах (для рыночных ордеров) */
  usdAmount?: number;
  /** Passphrase (для Bitget) */
  passphrase?: string;
}

/**
 * Сервис для торговли на различных биржах
 */
export class TradingService {
  private readonly mexcTradingService: MexcTradingService;
  private readonly bybitTradingService: BybitTradingService;
  private readonly bitgetTradingService: BitgetTradingService;
  private readonly bitmartTradingService: BitmartTradingService;
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
    this.mexcTradingService = new MexcTradingService(backendUrl);
    this.bybitTradingService = new BybitTradingService(backendUrl);
    this.bitgetTradingService = new BitgetTradingService(backendUrl);
    this.bitmartTradingService = new BitmartTradingService(backendUrl);
  }

  /**
   * Размещает лимитный ордер на указанной бирже
   */
  async placeLimitOrder(params: TradingPlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { exchange } = params;
    const exchangeUpper = exchange.toUpperCase();

    switch (exchangeUpper) {
      case 'MEXC':
        if (!params.authToken) {
          throw new Error('Для MEXC требуется authToken (WEB authentication key)');
        }
        return this.mexcTradingService.placeLimitOrder({
          authToken: params.authToken,
          symbol: params.symbol,
          side: params.side,
          price: params.price,
          quantity: params.quantity,
          leverage: params.leverage,
        });

      case 'BYBIT':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bybit требуются apiKey и secretKey');
        }
        return this.bybitTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        });

      case 'BITGET':
        if (!params.apiKey || !params.secretKey || !params.passphrase) {
          throw new Error('Для Bitget требуются apiKey, secretKey и passphrase');
        }
        return this.bitgetTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          passphrase: params.passphrase,
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        });

      case 'BITMART':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bitmart требуются apiKey и secretKey');
        }
        return this.bitmartTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        });

      default:
        throw new Error(`Биржа ${exchange} не поддерживается для торговли`);
    }
  }

  /**
   * Размещает рыночный ордер на указанной бирже
   */
  async placeMarketOrder(params: TradingPlaceLimitOrderParams & { usdAmount: number }): Promise<any> {
    const { exchange, usdAmount } = params;
    const exchangeUpper = exchange.toUpperCase();

    switch (exchangeUpper) {
      case 'BYBIT':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bybit требуются apiKey и secretKey');
        }
        return this.bybitTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'BITGET':
        if (!params.apiKey || !params.secretKey || !params.passphrase) {
          throw new Error('Для Bitget требуются apiKey, secretKey и passphrase');
        }
        return this.bitgetTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          passphrase: params.passphrase,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'BITMART':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bitmart требуются apiKey и secretKey');
        }
        return this.bitmartTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      default:
        throw new Error(`Биржа ${exchange} не поддерживается для рыночных ордеров`);
    }
  }

  /**
   * Размещает одновременные рыночные ордера на двух биржах для арбитража
   */
  async placeArbitrageOrders(params: {
    buyExchange: string;
    sellExchange: string;
    buySymbol: string;
    sellSymbol: string;
    usdAmount: number;
    buyApiKey?: string;
    buySecretKey?: string;
    buyPassphrase?: string;
    buyAuthToken?: string;
    sellApiKey?: string;
    sellSecretKey?: string;
    sellPassphrase?: string;
    sellAuthToken?: string;
  }): Promise<{ buy: any; sell: any }> {
    const { buyExchange, sellExchange, buySymbol, sellSymbol, usdAmount } = params;

    // Размещаем ордера параллельно
    const [buyResult, sellResult] = await Promise.all([
      this.placeMarketOrder({
        exchange: buyExchange,
        symbol: buySymbol,
        side: 'BUY',
        usdAmount,
        apiKey: params.buyApiKey,
        secretKey: params.buySecretKey,
        passphrase: params.buyPassphrase,
        authToken: params.buyAuthToken,
      }),
      this.placeMarketOrder({
        exchange: sellExchange,
        symbol: sellSymbol,
        side: 'SELL',
        usdAmount,
        apiKey: params.sellApiKey,
        secretKey: params.sellSecretKey,
        passphrase: params.sellPassphrase,
        authToken: params.sellAuthToken,
      }),
    ]);

    return { buy: buyResult, sell: sellResult };
  }
}

