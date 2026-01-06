import CryptoJS from 'crypto-js';

/**
 * Интерфейс для размещения лимитного ордера
 */
export interface PlaceLimitOrderParams {
  /** Auth Token (WEB authentication key, начинается с "WEB...") */
  authToken: string;
  /** Символ (например, BTC_USDT) */
  symbol: string;
  /** Сторона ордера: BUY или SELL */
  side: 'BUY' | 'SELL';
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
  /** Плечо (по умолчанию 10) */
  leverage?: number;
}

/**
 * Интерфейс ответа при размещении ордера
 */
export interface PlaceOrderResponse {
  /** Успешность операции */
  success: boolean;
  /** Код ответа */
  code?: number;
  /** Сообщение */
  message?: string;
  /** Данные ордера */
  data?: {
    /** ID ордера */
    orderId: string;
  };
}

/**
 * Функция для генерации hex MD5
 */
function hexMd5(str: string): string {
  return CryptoJS.MD5(str).toString();
}

/**
 * Сервис для торговли на MEXC
 */
export class MexcTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Генерирует заголовки для MEXC Futures API с authToken
   */
  private generateHeaders(authToken: string, body: any): Record<string, string> {
    const ts = Date.now();
    const nonce = ts.toString();

    // Генерируем подпись по схеме MEXC Futures API
    // Формат: MD5(timestamp + JSON.stringify(body) + MD5(authToken + timestamp).substring(7))
    const bodyStr = JSON.stringify(body || '');
    const authHash = hexMd5(`${authToken}${ts}`).substring(7);
    const sign = hexMd5(`${ts}${bodyStr}${authHash}`);

    return {
      'x-mxc-nonce': nonce,
      authentication: authToken,
      'x-mxc-sign': sign,
      authorization: authToken,
      'content-type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  /**
   * Размещает лимитный ордер на MEXC через /submit endpoint
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10 } = params;

    // Формируем данные для запроса согласно SDK
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      type: 1, // Limit order
      leverage: leverage.toString(),
      openType: 1, // Isolated margin
      positionMode: 2, // One-way mode
      price: price.toString(),
      vol: quantity,
      marketCeiling: false,
    };

    // Генерируем заголовки с подписью
    const headers = this.generateHeaders(authToken, orderData);

    // Используем endpoint /submit согласно SDK
    const targetUrl = 'https://futures.mexc.com/api/v1/private/order/submit';

    // Отправляем через общий прокси с заголовками в body
    const response = await fetch(`${this.backendUrl}/proxy?url=${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...orderData,
        _headers: headers, // Передаем заголовки через специальное поле
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Ошибка при размещении ордера',
      }));
      throw new Error(error.message || 'Ошибка при размещении ордера');
    }

    return await response.json();
  }
}
