import { generateHeaders as generateMexcHeaders } from './utils/headers';
import {
  PlaceLimitOrderParams,
  PlaceOrderResponse,
  AccountAsset,
  AccountAssetsResponse,
} from './mexc-trading.service';

/**
 * Сервис для торговли на KCEX
 * API идентично MEXC, только baseURL другой
 */
export class KcexTradingService {
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
   * Выполняет подписанный GET запрос к KCEX API
   */
  private async signedGetRequest(params: {
    url: string;
    authToken: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, authToken, params: requestParams } = params;

    const baseUrl = 'https://www.kcex.com/fapi/v1/private';

    // Для GET запроса подпись генерируется с пустым телом
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://www.kcex.com',
        referer: 'https://www.kcex.com/',
        signaturePrefix: 'kcex',
      },
      true,
      {}, // Пустое тело для GET запроса
    );

    const data = await this.proxyRequest({
      method: 'GET',
      url: `${baseUrl}${url}`,
      headers,
      params: requestParams || {},
    });

    if (!data.success) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при выполнении запроса';
      throw new Error(`KCEX Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Выполняет публичный GET запрос к KCEX API (без подписи)
   */
  private async publicGetRequest(params: {
    url: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, params: requestParams } = params;

    const baseUrl = 'https://www.kcex.com/fapi/v1';

    const data = await this.proxyRequest({
      method: 'GET',
      url: `${baseUrl}${url}`,
      params: requestParams || {},
    });

    if (data.code !== 0) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || 'Ошибка при выполнении запроса';
      throw new Error(`KCEX Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Получает последнюю цену для символа
   */
  private async getLastPrice(symbol: string): Promise<number> {
    const data = await this.publicGetRequest({
      url: '/contract/ticker',
      params: {
        symbol,
      },
    });

    const ticker = data.data;
    if (!ticker || !ticker.lastPrice) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.lastPrice);
  }

  /**
   * Размещает лимитный ордер на KCEX через /submit endpoint
   * Основано на SDK: https://github.com/maksim-zakharov/mexc-futures-sdk/blob/main/src/client.ts
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10, openType = 1 } = params;

    // Формируем данные для запроса (идентично MEXC)
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType, // Используем переданный openType или по умолчанию 1 (Isolated margin)
      type: '1', // Limit order (строка)
      vol: quantity,
      positionMode: 2, // One-way mode
      marketCeiling: false,
      leverage: leverage.toString(),
      price: price.toString(),
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (с origin, referer и префиксом для KCEX)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://www.kcex.com',
        referer: 'https://www.kcex.com/',
        signaturePrefix: 'kcex',
      },
      true,
      orderData,
    );

    // Используем endpoint /submit как в SDK
    const targetUrl = 'https://www.kcex.com/fapi/v1/private/order/submit';

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
      throw new Error(`KCEX Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Размещает рыночный ордер на KCEX через /submit endpoint
   * Основано на SDK: https://github.com/maksim-zakharov/mexc-futures-sdk/blob/main/src/client.ts
   */
  async placeMarketOrder(params: {
    authToken: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    usdAmount: number;
    openType?: number;
  }): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, usdAmount, openType = 1 } = params;

    // Получаем последнюю цену для расчета vol
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем vol на основе usdAmount и последней цены, округляем вниз
    const vol = Math.floor(usdAmount / lastPrice);

    // Формируем данные для запроса (рыночный ордер)
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType, // Используем переданный openType или по умолчанию 1 (Isolated margin)
      type: '5', // Market order (строка) - тип 5 для рыночных ордеров
      vol, // Количество в базовой валюте
      positionMode: 2, // One-way mode
      marketCeiling: false,
      leverage: 10, // Плечо для рыночных ордеров
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (с origin, referer и префиксом для KCEX)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://www.kcex.com',
        referer: 'https://www.kcex.com/',
        signaturePrefix: 'kcex',
      },
      true,
      orderData,
    );

    // Используем endpoint /submit как в SDK
    const targetUrl = 'https://www.kcex.com/fapi/v1/private/order/submit';

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
      throw new Error(`KCEX Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Получает открытые позиции на KCEX
   */
  async getPositions(params: { authToken: string; symbol?: string }): Promise<any> {
    const { authToken, symbol } = params;

    // Параметры передаем через params, а не в URL
    const requestParams: Record<string, string> = {};
    if (symbol) {
      requestParams.symbol = symbol;
    }

    return this.signedGetRequest({
      url: '/position/open_positions',
      authToken,
      params: requestParams,
    });
  }

  /**
   * Получает баланс аккаунта на KCEX
   */
  async getAccountAssets(params: { authToken: string }): Promise<AccountAssetsResponse> {
    const { authToken } = params;

    return this.signedGetRequest({
      url: '/account/assets',
      authToken,
    });
  }
}

