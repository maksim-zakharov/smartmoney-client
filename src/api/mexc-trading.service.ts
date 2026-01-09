import { generateHeaders as generateMexcHeaders, SDKOptions } from './utils/headers';

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
 * Сервис для торговли на MEXC
 */
export class MexcTradingService {
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
    const url = `https://futures.mexc.com/api/v1/contract/ticker`;

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
   * Размещает лимитный ордер на MEXC через /submit endpoint
   * Основано на SDK: https://github.com/maksim-zakharov/mexc-futures-sdk/blob/main/src/client.ts
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10 } = params;

    // Формируем данные для запроса согласно SDK
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType: 2, // Cross margin
      type: '1', // Limit order (строка)
      vol: quantity,
      positionMode: 2, // One-way mode
      marketCeiling: false,
      leverage: leverage.toString(),
      price: price.toString(),
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (как в SDK)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.mexc.com',
        referer: 'https://futures.mexc.com/',
      },
      true,
      orderData,
    );

    // Используем endpoint /submit как в SDK
    const targetUrl = 'https://futures.mexc.com/api/v1/private/order/submit';

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
      throw new Error(`MEXC Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Размещает рыночный ордер на MEXC через /submit endpoint
   * Основано на SDK: https://github.com/maksim-zakharov/mexc-futures-sdk/blob/main/src/client.ts
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
      openType: 2, // Cross margin
      type: '5', // Market order (строка) - тип 5 для рыночных ордеров
      vol, // Количество в базовой валюте
      positionMode: 2, // One-way mode
      marketCeiling: false,
      leverage: 10, // Плечо для рыночных ордеров
      priceProtect: '0',
    };

    // Генерируем заголовки с подписью (как в SDK)
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.mexc.com',
        referer: 'https://futures.mexc.com/',
      },
      true,
      orderData,
    );

    // Используем endpoint /submit как в SDK
    const targetUrl = 'https://futures.mexc.com/api/v1/private/order/submit';

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
      throw new Error(`MEXC Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Получает открытые позиции на MEXC
   */
  async getPositions(params: { authToken: string; symbol?: string }): Promise<any> {
    const { authToken, symbol } = params;

    // Формируем URL
    const url = 'https://futures.mexc.com/api/v1/private/position/open_positions';

    // Для GET запроса подпись генерируется с пустым телом
    const headers = generateMexcHeaders(
      {
        authToken,
        origin: 'https://futures.mexc.com',
        referer: 'https://futures.mexc.com/',
      },
      true,
      {}, // Пустое тело для GET запроса
    );

    // Параметры передаем через params, а не в URL
    const requestParams: Record<string, string> = {};
    if (symbol) {
      requestParams.symbol = symbol;
    }

    const data = await this.proxyRequest({
      method: 'GET',
      url,
      headers,
      params: requestParams,
    });

    if (!data.success) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при получении позиций';
      throw new Error(`MEXC Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}
