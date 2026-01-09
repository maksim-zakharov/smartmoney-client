import { generateHeaders as generateMexcHeaders } from './utils/headers';
import {
  PlaceLimitOrderParams,
  PlaceOrderResponse,
  AccountAsset,
  AccountAssetsResponse,
} from './mexc-trading.service';

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
   * Выполняет подписанный GET запрос к Ourbit API
   */
  private async signedGetRequest(params: {
    url: string;
    authToken: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, authToken, params: requestParams } = params;

    const baseUrl = 'https://futures.ourbit.com/api/v1/private';

    // Для GET запроса подпись генерируется с пустым телом
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.ourbit.com',
        referer: 'https://futures.ourbit.com/',
        signaturePrefix: 'ourbit',
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
      throw new Error(`Ourbit Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Выполняет публичный GET запрос к Ourbit API (без подписи)
   */
  private async publicGetRequest(params: {
    url: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, params: requestParams } = params;

    const baseUrl = 'https://futures.ourbit.com/api/v1';

    const data = await this.proxyRequest({
      method: 'GET',
      url: `${baseUrl}${url}`,
      params: requestParams || {},
    });

    if (data.code !== 0) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || 'Ошибка при выполнении запроса';
      throw new Error(`Ourbit Error ${errorCode} - ${errorMsg}`);
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
   * Размещает лимитный ордер на Ourbit через /create endpoint
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10, openType = 2, reduceOnly = false } = params;

    // Формируем данные для запроса
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType, // Используем переданный openType или по умолчанию 2 (Cross margin)
      type: '1', // Limit order (строка)
      vol: quantity,
      leverage: leverage,
      marketCeiling: false,
      price: price.toString(),
      priceProtect: '0',
      reduceOnly, // Флаг для закрытия позиции (true = только уменьшение, false = может открыть новую)
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
    openType?: number;
    reduceOnly?: boolean;
  }): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, usdAmount, openType = 2, reduceOnly = false } = params;

    // Получаем последнюю цену для расчета vol
    const lastPrice = await this.getLastPrice(symbol);
    
    // Рассчитываем vol на основе usdAmount и последней цены, округляем вниз
    const vol = Math.floor(usdAmount / lastPrice);

    // Формируем данные для запроса (рыночный ордер)
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType, // Используем переданный openType или по умолчанию 2 (Cross margin)
      type: '5', // Market order (строка) - тип 5 для рыночных ордеров
      vol, // Количество в базовой валюте
      leverage: 10, // Плечо для рыночных ордеров
      marketCeiling: false,
      priceProtect: '0',
      reduceOnly, // Флаг для закрытия позиции (true = только уменьшение, false = может открыть новую)
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
   * Получает открытые позиции на Ourbit
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
   * Получает баланс аккаунта на Ourbit
   */
  async getAccountAssets(params: { authToken: string }): Promise<AccountAssetsResponse> {
    const { authToken } = params;

    return this.signedGetRequest({
      url: '/account/assets',
      authToken,
    });
  }
}

