/**
 * Интерфейс для размещения рыночного ордера на Bitmart
 */
export interface BitmartPlaceMarketOrderParams {
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  secretKey: string;
  /** Символ (например, BTCUSDT) */
  symbol: string;
  /** Сторона ордера: BUY или SELL */
  side: 'BUY' | 'SELL';
  /** Количество в долларах */
  usdAmount: number;
}

/**
 * Интерфейс ответа при размещении ордера
 */
export interface BitmartPlaceOrderResponse {
  /** Код ответа */
  code: number;
  /** Сообщение */
  message: string;
  /** Данные ордера */
  data?: {
    /** ID ордера */
    orderId: string;
  };
}

/**
 * Сервис для торговли на Bitmart
 */
export class BitmartTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Размещает рыночный ордер на Bitmart
   */
  async placeMarketOrder(params: BitmartPlaceMarketOrderParams): Promise<BitmartPlaceOrderResponse> {
    const { apiKey, secretKey, symbol, side, usdAmount } = params;

    // Формируем данные для запроса
    const orderData: any = {
      symbol,
      side: side.toLowerCase(),
      type: 'market',
      // Для рыночного ордера количество будет рассчитано на бекенде на основе usdAmount
      usdAmount,
    };

    const targetUrl = 'https://api-cloud.bitmart.com/contract/private/submit-order';

    // Отправляем через общий прокси
    const response = await fetch(
      `${this.backendUrl}/proxy?url=${encodeURIComponent(targetUrl)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BM-KEY': apiKey,
          'X-BM-TIMESTAMP': Date.now().toString(),
        },
        body: JSON.stringify({
          ...orderData,
          _apiKey: apiKey,
          _secretKey: secretKey,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Ошибка при размещении ордера',
      }));
      throw new Error(error.message || 'Ошибка при размещении ордера');
    }

    return await response.json();
  }
}

