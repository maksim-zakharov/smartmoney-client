import CryptoJS from 'crypto-js';

/**
 * Интерфейс для размещения рыночного ордера на Bitmart
 */
export interface BitmartPlaceMarketOrderParams {
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  secretKey: string;
  /** Memo (API Memo) */
  memo: string;
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
    memo: string,
    timestamp: string,
    body: string,
  ): string {
    const message = `${timestamp}#${memo}#${body}`;
    return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Hex);
  }

  /**
   * Отправляет запрос через прокси бекенда
   */
  private async proxyRequest(config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch(`${this.backendUrl}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Ошибка при проксировании запроса',
      }));
      throw new Error(error.message || 'Ошибка при проксировании запроса');
    }

    return await response.json();
  }

  /**
   * Получает последнюю цену для символа
   */
  private async getLastPrice(symbol: string): Promise<number> {
    const url = `https://api-cloud-v2.bitmart.com/contract/public/details`;
    
    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        symbol,
      },
    });

    if (data.code !== 1000) {
      throw new Error(data.message || 'Ошибка при получении цены');
    }

    const symbols = data.data?.symbols;
    const ticker = Array.isArray(symbols) ? symbols[0] : undefined;
    if (!ticker || !ticker.last_price) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.last_price);
  }

  /**
   * Размещает рыночный ордер на Bitmart
   */
  async placeMarketOrder(params: BitmartPlaceMarketOrderParams): Promise<BitmartPlaceOrderResponse> {
    const { apiKey, secretKey, memo, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета size
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем size на основе usdAmount и последней цены, округляем вниз
    const size = Math.floor(usdAmount / lastPrice).toString();

    // Формируем данные для запроса согласно новой спецификации Bitmart
    // POST https://api-cloud-v2.bitmart.com/contract/private/submit-order
    // type = 'market', side по one-way mode (-1 buy, -4 sell), size = количество контрактов
    const sideCode = side === 'BUY' ? -1 : -4;

    const orderData: any = {
      symbol,
      type: 'market',
      side: sideCode,
      leverage: '10',
      open_type: 'isolated',
      mode: 1, // GTC
      size, // Количество в базовой валюте
    };

    // Генерируем подпись
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify(orderData);
    const signature = this.generateBitmartSignature(secretKey, memo, timestamp, bodyStr);

    // Формируем заголовки
    const headers = {
      'X-BM-KEY': apiKey,
      'X-BM-SIGN': signature,
      'X-BM-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };

    const targetUrl = 'https://api-cloud-v2.bitmart.com/contract/private/submit-order';

    // Отправляем через общий прокси с конфигом axios
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: orderData,
    });

    // Bitmart возвращает ошибки через поле code
    if (data.code !== undefined && data.code !== 1000) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при размещении ордера';
      throw new Error(`Bitmart Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Получает позиции на Bitmart
   */
  async getPositions(params: { apiKey: string; secretKey: string; memo: string; symbol?: string }): Promise<any> {
    const { apiKey, secretKey, memo, symbol } = params;

    // Формируем URL
    const url = 'https://api-cloud-v2.bitmart.com/contract/private/position-v2';

    // Формируем query параметры
    const queryParams: Record<string, string> = {};
    if (symbol) {
      queryParams.symbol = symbol;
    }

    // Для GET запроса body пустой
    // Согласно документации Bitmart, для GET запросов body = ""
    const timestamp = Date.now().toString();
    const bodyStr = ''; // Пустое тело для GET запроса
    const signature = this.generateBitmartSignature(secretKey, memo, timestamp, bodyStr);

    // Формируем заголовки
    const headers = {
      'X-BM-KEY': apiKey,
      'X-BM-SIGN': signature,
      'X-BM-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };

    const data = await this.proxyRequest({
      method: 'GET',
      url,
      headers,
      params: queryParams,
    });

    // Bitmart возвращает ошибки через поле code
    if (data.code !== undefined && data.code !== 1000) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при получении позиций';
      throw new Error(`Bitmart Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

