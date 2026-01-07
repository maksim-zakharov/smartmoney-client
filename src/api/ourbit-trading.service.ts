import { generateHeaders as generateMexcHeaders } from './utils/headers';
import { PlaceLimitOrderParams, PlaceOrderResponse } from './mexc-trading.service';

/**
 * Сервис для торговли на Ourbit
 * API идентично MEXC, только baseURL другой
 */
export class OurbitTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
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
      // Если бекенд вернул ошибку от целевого сервера (MEXC/Ourbit/KCEX)
      // responseData может содержать данные ошибки от биржи
      if (responseData.success === false || responseData.code !== undefined) {
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
    const url = `https://futures.ourbit.com/api/v1/contract/ticker`;
    
    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        symbol,
      },
    });

    if (data.code !== 0) {
      throw new Error(data.msg || 'Ошибка при получении цены');
    }

    const ticker = data.data;
    if (!ticker || !ticker.lastPrice) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.lastPrice);
  }

  /**
   * Размещает лимитный ордер на Ourbit через /create endpoint
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10 } = params;

    // Формируем данные для запроса
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType: 1, // Isolated margin
      type: '1', // Limit order (строка)
      vol: quantity,
      leverage: leverage,
      marketCeiling: false,
      price: price.toString(),
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (с origin, referer и префиксом для Ourbit)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.ourbit.com',
        referer: 'https://futures.ourbit.com/',
        signaturePrefix: 'ourbit',
      },
      true,
      orderData,
    );

    // Используем endpoint /create
    const targetUrl = 'https://futures.ourbit.com/api/v1/private/order/create';

    // Отправляем через общий прокси с конфигом axios
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: orderData,
    });

    // Проверяем success как в SDK
    if (!data.success) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при размещении ордера';
      throw new Error(`Ourbit Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Размещает рыночный ордер на Ourbit через /create endpoint
   */
  async placeMarketOrder(params: {
    authToken: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    usdAmount: number;
  }): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, usdAmount } = params;

    // Получаем последнюю цену для расчета vol
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем vol на основе usdAmount и последней цены, округляем вниз
    const vol = Math.floor(usdAmount / lastPrice);

    // Формируем данные для запроса (рыночный ордер)
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType: 1, // Isolated margin
      type: '5', // Market order (строка) - тип 5 для рыночных ордеров
      vol, // Количество в базовой валюте
      leverage: 10, // Плечо для рыночных ордеров
      marketCeiling: false,
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (с origin, referer и префиксом для Ourbit)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.ourbit.com',
        referer: 'https://futures.ourbit.com/',
        signaturePrefix: 'ourbit',
      },
      true,
      orderData,
    );

    // Используем endpoint /create
    const targetUrl = 'https://futures.ourbit.com/api/v1/private/order/create';

    // Отправляем через общий прокси с конфигом axios
    const data = await this.proxyRequest({
      method: 'POST',
      url: targetUrl,
      headers,
      data: orderData,
    });

    // Проверяем success как в SDK
    if (!data.success) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при размещении ордера';
      throw new Error(`Ourbit Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

