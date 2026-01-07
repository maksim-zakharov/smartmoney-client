import CryptoJS from 'crypto-js';

/**
 * Интерфейс для размещения рыночного ордера на Binance
 */
export interface BinancePlaceMarketOrderParams {
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
 * Интерфейс для размещения лимитного ордера на Binance
 */
export interface BinancePlaceLimitOrderParams {
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  secretKey: string;
  /** Символ (например, BTCUSDT) */
  symbol: string;
  /** Сторона ордера: BUY или SELL */
  side: 'BUY' | 'SELL';
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
}

/**
 * Интерфейс ответа при размещении ордера
 */
export interface BinancePlaceOrderResponse {
  /** ID ордера */
  orderId: number;
  /** Клиентский ID ордера */
  clientOrderId?: string;
  /** Статус */
  status?: string;
}

/**
 * Сервис для торговли на Binance
 */
export class BinanceTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Генерирует подпись для Binance
   */
  private generateBinanceSignature(
    secretKey: string,
    queryString: string,
  ): string {
    return CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex);
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

    const responseData = await response.json().catch(() => ({
      message: 'Ошибка при обработке ответа от сервера',
    }));

    if (!response.ok) {
      // Если бекенд вернул ошибку от целевого сервера (Binance)
      if (responseData.code !== undefined || responseData.msg) {
        // Это ошибка от биржи, пробрасываем её дальше
        throw responseData;
      }
      
      // Иначе это ошибка прокси
      throw new Error(responseData.message || 'Ошибка при проксировании запроса');
    }

    return responseData;
  }

  /**
   * Получает последнюю цену для символа
   */
  private async getLastPrice(symbol: string): Promise<number> {
    const url = `https://fapi.binance.com/fapi/v1/ticker/price`;
    
    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        symbol,
      },
    });

    if (data.code) {
      throw new Error(data.msg || 'Ошибка при получении цены');
    }

    if (!data.price) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(data.price);
  }

  /**
   * Размещает рыночный ордер на Binance
   */
  async placeMarketOrder(params: BinancePlaceMarketOrderParams): Promise<BinancePlaceOrderResponse> {
    const { apiKey, secretKey, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета quantity
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем quantity на основе usdAmount и последней цены, округляем вниз
    const quantity = Math.floor(usdAmount / lastPrice);

    // Формируем данные для запроса
    const timestamp = Date.now();
    const recvWindow = 5000;
    
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 'BUY' : 'SELL',
      type: 'MARKET',
      quantity: quantity.toString(),
      timestamp,
      recvWindow,
    };

    // Формируем query string для подписи
    const queryString = Object.keys(orderData)
      .sort()
      .map((key) => `${key}=${orderData[key]}`)
      .join('&');

    // Генерируем подпись
    const signature = this.generateBinanceSignature(secretKey, queryString);

    // Добавляем подпись к query string
    const finalQueryString = `${queryString}&signature=${signature}`;

    // Формируем заголовки
    const headers = {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    };

    const targetUrl = `https://fapi.binance.com/fapi/v1/order?${finalQueryString}`;

    // Отправляем через общий прокси с конфигом axios
    // Для Binance POST запросы отправляются с параметрами в query string, body пустой
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: {}, // Пустое тело, все параметры в query string
    });

    // Binance возвращает ошибки в формате { code, msg }
    if (data.code !== undefined && data.code !== 200) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || data.message || 'Ошибка при размещении ордера';
      throw new Error(`Binance Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Размещает лимитный ордер на Binance
   */
  async placeLimitOrder(params: BinancePlaceLimitOrderParams): Promise<BinancePlaceOrderResponse> {
    const { apiKey, secretKey, symbol, side, price, quantity } = params;

    // Формируем данные для запроса
    const timestamp = Date.now();
    const recvWindow = 5000;
    
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 'BUY' : 'SELL',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: quantity.toString(),
      price: price.toString(),
      timestamp,
      recvWindow,
    };

    // Формируем query string для подписи
    const queryString = Object.keys(orderData)
      .sort()
      .map((key) => `${key}=${orderData[key]}`)
      .join('&');

    // Генерируем подпись
    const signature = this.generateBinanceSignature(secretKey, queryString);

    // Добавляем подпись к query string
    const finalQueryString = `${queryString}&signature=${signature}`;

    // Формируем заголовки
    const headers = {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    };

    const targetUrl = `https://fapi.binance.com/fapi/v1/order?${finalQueryString}`;

    // Отправляем через общий прокси с конфигом axios
    // Для Binance POST запросы отправляются с параметрами в query string, body пустой
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: {}, // Пустое тело, все параметры в query string
    });

    // Binance возвращает ошибки в формате { code, msg }
    if (data.code !== undefined && data.code !== 200) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || data.message || 'Ошибка при размещении ордера';
      throw new Error(`Binance Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

