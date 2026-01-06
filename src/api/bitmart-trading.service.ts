import CryptoJS from 'crypto-js';

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
   * Генерирует подпись для Bitmart
   */
  private generateBitmartSignature(
    secretKey: string,
    timestamp: string,
    method: string,
    requestPath: string,
    body: string,
  ): string {
    const message = timestamp + '#' + method + '#' + requestPath + '#' + body;
    return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Base64);
  }

  /**
   * Получает последнюю цену для символа
   */
  private async getLastPrice(symbol: string): Promise<number> {
    const url = `https://api-cloud.bitmart.com/contract/public/ticker?symbol=${symbol}`;
    
    const response = await fetch(`${this.backendUrl}/proxy?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Ошибка при получении цены');
    }

    const data = await response.json();
    if (data.code !== 1000) {
      throw new Error(data.message || 'Ошибка при получении цены');
    }

    const ticker = data.data;
    if (!ticker || !ticker.last_price) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.last_price);
  }

  /**
   * Размещает рыночный ордер на Bitmart
   */
  async placeMarketOrder(params: BitmartPlaceMarketOrderParams): Promise<BitmartPlaceOrderResponse> {
    const { apiKey, secretKey, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета size
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем size на основе usdAmount и последней цены, округляем вниз
    const size = Math.floor(usdAmount / lastPrice).toString();

    // Формируем данные для запроса
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 2, // 1 = Buy, 2 = Sell
      type: 1, // 1 = Market order
      open_type: 1, // Isolated margin
      size, // Количество в базовой валюте
    };

    // Генерируем подпись
    const timestamp = Date.now().toString();
    const method = 'POST';
    const requestPath = '/contract/private/submit-order';
    const bodyStr = JSON.stringify(orderData);
    const signature = this.generateBitmartSignature(secretKey, timestamp, method, requestPath, bodyStr);

    // Формируем заголовки
    const headers = {
      'X-BM-KEY': apiKey,
      'X-BM-SIGN': signature,
      'X-BM-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };

    const targetUrl = 'https://api-cloud.bitmart.com/contract/private/submit-order';

    // Отправляем через общий прокси с заголовками в body
    const response = await fetch(
      `${this.backendUrl}/proxy?url=${encodeURIComponent(targetUrl)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...orderData,
          _headers: headers, // Передаем заголовки через специальное поле
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

