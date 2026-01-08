import { MexcTradingService, PlaceLimitOrderParams, PlaceOrderResponse } from './mexc-trading.service';
import { OurbitTradingService } from './ourbit-trading.service';
import { KcexTradingService } from './kcex-trading.service';
import { BybitTradingService, BybitPlaceMarketOrderParams, BybitPlaceOrderResponse } from './bybit-trading.service';
import { BitgetTradingService, BitgetPlaceMarketOrderParams, BitgetPlaceOrderResponse } from './bitget-trading.service';
import { BitmartTradingService, BitmartPlaceMarketOrderParams, BitmartPlaceOrderResponse } from './bitmart-trading.service';
import { GateTradingService } from './gate-trading.service';
import { BinanceTradingService, BinancePlaceMarketOrderParams, BinancePlaceLimitOrderParams, BinancePlaceOrderResponse } from './binance-trading.service';
import { OkxTradingService } from './okx-trading.service';
import { getProxyUrl } from './utils/proxy';

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
  private readonly ourbitTradingService: OurbitTradingService;
  private readonly kcexTradingService: KcexTradingService;
  private readonly bybitTradingService: BybitTradingService;
  private readonly bitgetTradingService: BitgetTradingService;
  private readonly bitmartTradingService: BitmartTradingService;
  private readonly gateTradingService: GateTradingService;
  private readonly binanceTradingService: BinanceTradingService;
  private readonly okxTradingService: OkxTradingService;
  private readonly backendUrl: string;

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || getProxyUrl();
    this.mexcTradingService = new MexcTradingService(this.backendUrl);
    this.ourbitTradingService = new OurbitTradingService(this.backendUrl);
    this.kcexTradingService = new KcexTradingService(this.backendUrl);
    this.bybitTradingService = new BybitTradingService(this.backendUrl);
    this.bitgetTradingService = new BitgetTradingService(this.backendUrl);
    this.bitmartTradingService = new BitmartTradingService(this.backendUrl);
    this.gateTradingService = new GateTradingService(this.backendUrl);
    this.binanceTradingService = new BinanceTradingService(this.backendUrl);
    this.okxTradingService = new OkxTradingService(this.backendUrl);
  }

  /**
   * Размещает лимитный ордер на указанной бирже
   */
  async placeLimitOrder(params: TradingPlaceLimitOrderParams): Promise<any> {
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

      case 'OURBIT':
        if (!params.authToken) {
          throw new Error('Для Ourbit требуется authToken (WEB authentication key)');
        }
        return this.ourbitTradingService.placeLimitOrder({
          authToken: params.authToken,
          symbol: params.symbol,
          side: params.side,
          price: params.price,
          quantity: params.quantity,
          leverage: params.leverage,
        });

      case 'KCEX':
        if (!params.authToken) {
          throw new Error('Для KCEX требуется authToken (WEB authentication key)');
        }
        return this.kcexTradingService.placeLimitOrder({
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
        // Для лимитных ордеров Bybit используем рыночные как заглушку
        // В реальной реализации здесь должен быть placeLimitOrder
        return this.bybitTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        }) as any;

      case 'BITGET':
        if (!params.apiKey || !params.secretKey || !params.passphrase) {
          throw new Error('Для Bitget требуются apiKey, secretKey и passphrase');
        }
        // Для лимитных ордеров Bitget используем рыночные как заглушку
        return this.bitgetTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          passphrase: params.passphrase,
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        }) as any;

      case 'BITMART':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bitmart требуются apiKey и secretKey');
        }
        // Для лимитных ордеров Bitmart используем рыночные как заглушку
        return this.bitmartTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          memo: params.passphrase || '',
          symbol: params.symbol,
          side: params.side,
          usdAmount: params.usdAmount || 0,
        }) as any;

      case 'GATE':
      case 'GATEIO':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Gate требуются apiKey и secretKey');
        }
        // Для лимитных ордеров Gate используем фьючерсный лимитный ордер
        return this.gateTradingService.placeLimitOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          contract: params.symbol,
          side: params.side,
          price: params.price,
          size: params.quantity,
        });

      case 'BINANCE':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Binance требуются apiKey и secretKey');
        }
        return this.binanceTradingService.placeLimitOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol: params.symbol,
          side: params.side,
          price: params.price,
          quantity: params.quantity,
        });

      default:
        throw new Error(`Биржа ${exchange} не поддерживается для торговли`);
    }
  }

  /**
   * Размещает рыночный ордер на указанной бирже
   */
  async placeMarketOrder(params: {
    exchange: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    usdAmount: number;
    authToken?: string;
    apiKey?: string;
    secretKey?: string;
    passphrase?: string;
  }): Promise<any> {
    const { exchange, usdAmount } = params;
    const exchangeUpper = exchange.toUpperCase();

    switch (exchangeUpper) {
      case 'MEXC':
        if (!params.authToken) {
          throw new Error('Для MEXC требуется authToken (WEB authentication key)');
        }
        return this.mexcTradingService.placeMarketOrder({
          authToken: params.authToken,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'OURBIT':
        if (!params.authToken) {
          throw new Error('Для Ourbit требуется authToken (WEB authentication key)');
        }
        return this.ourbitTradingService.placeMarketOrder({
          authToken: params.authToken,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'KCEX':
        if (!params.authToken) {
          throw new Error('Для KCEX требуется authToken (WEB authentication key)');
        }
        return this.kcexTradingService.placeMarketOrder({
          authToken: params.authToken,
          symbol: params.symbol,
          side: params.side,
          usdAmount,
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
          memo: params.passphrase || '',
          symbol: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'GATE':
      case 'GATEIO':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Gate требуются apiKey и secretKey');
        }
        return this.gateTradingService.placeMarketOrder({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          contract: params.symbol,
          side: params.side,
          usdAmount,
        });

      case 'BINANCE':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Binance требуются apiKey и secretKey');
        }
        return this.binanceTradingService.placeMarketOrder({
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

  /**
   * Получает открытые позиции на указанной бирже
   */
  async getPositions(params: {
    exchange: string;
    symbol?: string;
    authToken?: string;
    apiKey?: string;
    secretKey?: string;
    passphrase?: string;
  }): Promise<any> {
    const { exchange, symbol } = params;
    const exchangeUpper = exchange.toUpperCase();

    switch (exchangeUpper) {
      case 'MEXC':
        if (!params.authToken) {
          throw new Error('Для MEXC требуется authToken (WEB authentication key)');
        }
        return this.mexcTradingService.getPositions({
          authToken: params.authToken,
          symbol,
        });

      case 'OURBIT':
        if (!params.authToken) {
          throw new Error('Для Ourbit требуется authToken (WEB authentication key)');
        }
        return this.ourbitTradingService.getPositions({
          authToken: params.authToken,
          symbol,
        });

      case 'KCEX':
        if (!params.authToken) {
          throw new Error('Для KCEX требуется authToken (WEB authentication key)');
        }
        return this.kcexTradingService.getPositions({
          authToken: params.authToken,
          symbol,
        });

      case 'BYBIT':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bybit требуются apiKey и secretKey');
        }
        return this.bybitTradingService.getPositions({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol,
        });

      case 'BINANCE':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Binance требуются apiKey и secretKey');
        }
        return this.binanceTradingService.getPositions({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          symbol,
        });

      case 'BITMART':
        if (!params.apiKey || !params.secretKey) {
          throw new Error('Для Bitmart требуются apiKey и secretKey');
        }
        // Для Bitmart также нужен memo (passphrase)
        const memo = params.passphrase || '';
        if (!memo) {
          throw new Error('Для Bitmart требуется passphrase (memo)');
        }
        return this.bitmartTradingService.getPositions({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          memo,
          symbol,
        });

      case 'OKX':
        if (!params.apiKey || !params.secretKey || !params.passphrase) {
          throw new Error('Для OKX требуются apiKey, secretKey и passphrase');
        }
        return this.okxTradingService.getPositions({
          apiKey: params.apiKey,
          secretKey: params.secretKey,
          passphrase: params.passphrase,
          symbol,
        });

      default:
        throw new Error(`Биржа ${exchange} не поддерживается для получения позиций`);
    }
  }
}

