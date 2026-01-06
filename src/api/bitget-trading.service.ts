import CryptoJS from 'crypto-js';

/**
 * Интерфейс для размещения рыночного ордера на Bitget
 */
export interface BitgetPlaceMarketOrderParams {
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  secretKey: string;
  /** Passphrase */
  passphrase: string;
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
export interface BitgetPlaceOrderResponse {
  /** Код ответа */
  code: string;
  /** Сообщение */
  msg: string;
  /** Данные ордера */
  data?: {
    /** ID ордера */
    orderId: string;
  };
}

/**
 * Сервис для торговли на Bitget
 */
export class BitgetTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Генерирует подпись для Bitget
   * Формат: timestamp + method.toUpperCase() + requestPath + (queryString ? '?' + queryString : '') + body
   */
  private generateBitgetSignature(
    secretKey: string,
    timestamp: string,
    method: string,
    requestPath: string,
    queryString: string = '',
    body: string = '',
  ): string {
    const message =
      timestamp +
      method.toUpperCase() +
      requestPath +
      (queryString ? '?' + queryString : '') +
      body;
    return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Base64);
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
    const url = `https://api.bitget.com/api/v2/mix/market/ticker`;
    
    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        symbol,
        productType: 'usdt-futures',
      },
    });

    if (data.code !== '00000') {
      throw new Error(data.msg || 'Ошибка при получении цены');
    }

    // data.data - это массив, берем первый элемент
    const tickers = Array.isArray(data.data) ? data.data : [data.data];
    const ticker = tickers[0];
    
    if (!ticker || !ticker.lastPr) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.lastPr);
  }

  /**
   * Размещает рыночный ордер на Bitget
   * Документация: https://www.bitget.com/api-doc/contract/trade/Place-Order
   */
  async placeMarketOrder(params: BitgetPlaceMarketOrderParams): Promise<BitgetPlaceOrderResponse> {
    const { apiKey, secretKey, passphrase, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета size
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем size на основе usdAmount и последней цены, округляем вниз
    const size = Math.floor(usdAmount / lastPrice).toString();
    
    // Формируем данные для запроса согласно документации
    const orderData: any = {
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'isolated',
      marginCoin: 'USDT',
      side: side === 'BUY' ? 'buy' : 'sell',
      orderType: 'market',
      tradeSide: 'open', // open или close
      force: 'gtc', // gtc, ioc, fok
      size, // Количество в базовой валюте
    };

    // Генерируем подпись согласно документации
    // Формат: timestamp + method.toUpperCase() + requestPath + (queryString ? '?' + queryString : '') + body
    const timestamp = Date.now().toString(); // В миллисекундах
    const method = 'POST';
    const requestPath = '/api/v2/mix/order/place-order';
    const queryString = ''; // Для POST запросов обычно пустой
    const bodyStr = JSON.stringify(orderData);
    const signature = this.generateBitgetSignature(
      secretKey,
      timestamp,
      method,
      requestPath,
      queryString,
      bodyStr,
    );

    // Формируем заголовки согласно документации
    const headers = {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-PASSPHRASE': passphrase,
      'ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
      'locale': 'ru-RU',
    };

    const targetUrl = 'https://api.bitget.com/api/v2/mix/order/place-order';

    // Отправляем через общий прокси с конфигом axios
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: orderData,
    });

    // Bitget возвращает ошибки через поле code
    if (data.code !== undefined && data.code !== '00000') {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || data.message || 'Ошибка при размещении ордера';
      throw new Error(`Bitget Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

