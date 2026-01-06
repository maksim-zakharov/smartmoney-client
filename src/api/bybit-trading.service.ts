import CryptoJS from 'crypto-js';

/**
 * Интерфейс для размещения рыночного ордера на Bybit
 */
export interface BybitPlaceMarketOrderParams {
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
export interface BybitPlaceOrderResponse {
  /** Успешность операции */
  retCode: number;
  /** Сообщение */
  retMsg: string;
  /** Данные ордера */
  result?: {
    /** ID ордера */
    orderId: string;
  };
}

/**
 * Сервис для торговли на Bybit
 */
export class BybitTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Генерирует подпись для Bybit
   */
  private generateBybitSignature(
    apiKey: string,
    secretKey: string,
    timestamp: number,
    recvWindow: number,
    body: any,
  ): string {
    const signStr = `${timestamp}${apiKey}${recvWindow}${JSON.stringify(body)}`;
    return CryptoJS.HmacSHA256(signStr, secretKey).toString(CryptoJS.enc.Hex);
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
    const url = `https://api.bybit.com/v5/market/tickers`;
    
    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        category: 'linear',
        symbol,
      },
    });

    if (data.retCode !== 0) {
      throw new Error(data.retMsg || 'Ошибка при получении цены');
    }

    const ticker = data.result?.list?.[0];
    if (!ticker || !ticker.lastPrice) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.lastPrice);
  }

  /**
   * Размещает рыночный ордер на Bybit
   */
  async placeMarketOrder(params: BybitPlaceMarketOrderParams): Promise<BybitPlaceOrderResponse> {
    const { apiKey, secretKey, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета qty
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем qty на основе usdAmount и последней цены, округляем вниз
    const qty = Math.floor(usdAmount / lastPrice).toString();

    // Формируем данные для запроса согласно документации Bybit
    const orderData: any = {
      category: 'linear',
      isLeverage: 1,
      side: side === 'BUY' ? 'Buy' : 'Sell',
      symbol,
      orderType: 'Market',
      qty, // Количество в базовой валюте
    };

    // Генерируем подпись
    const timestamp = Date.now();
    const recvWindow = 5000;
    const signature = this.generateBybitSignature(apiKey, secretKey, timestamp, recvWindow, orderData);

    // Формируем заголовки
    const headers = {
      'X-BAPI-SIGN': signature,
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp.toString(),
      'X-BAPI-RECV-WINDOW': recvWindow.toString(),
      'Content-Type': 'application/json',
    };

    const targetUrl = 'https://api.bybit.com/v5/order/create';

    // Отправляем через общий прокси с конфигом axios
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: orderData,
    });

    // Bybit возвращает ошибки даже при HTTP 200/201, нужно проверять retCode
    if (data.retCode !== undefined && data.retCode !== 0) {
      const errorCode = data.retCode || 'Unknown';
      const errorMsg = data.retMsg || data.message || 'Ошибка при размещении ордера';
      throw new Error(`Bybit Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

