import { MexcTradingService, PlaceLimitOrderParams, PlaceOrderResponse } from './mexc-trading.service';

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
}

/**
 * Сервис для торговли на различных биржах
 */
export class TradingService {
  private readonly mexcTradingService: MexcTradingService;
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
    this.mexcTradingService = new MexcTradingService(backendUrl);
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

      default:
        throw new Error(`Биржа ${exchange} не поддерживается для торговли`);
    }
  }
}

