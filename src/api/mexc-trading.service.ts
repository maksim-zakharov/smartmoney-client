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
 * Интерфейс актива аккаунта
 */
export interface AccountAsset {
  /** Валюта */
  currency: string;
  /** Маржа позиции */
  positionMargin: number;
  /** Доступный баланс */
  availableBalance: number;
  /** Баланс наличных (выводимый) */
  cashBalance: number;
  /** Замороженный баланс */
  frozenBalance: number;
  /** Общий капитал */
  equity: number;
  /** Нереализованный PnL */
  unrealized: number;
  /** Бонус */
  bonus: number;
  /** Время истечения бонуса (мс) */
  bonusExpireTime?: number;
  /** Доступные средства для перевода */
  availableCash: number;
  /** Доступные средства для открытия позиций */
  availableOpen: number;
  /** Сумма долга */
  debtAmount: number;
  /** Внесенная эффективная маржа */
  contributeMarginAmount: number;
  /** ID валюты */
  vcoinId: string;
}

/**
 * Интерфейс ответа при получении баланса аккаунта
 */
export interface AccountAssetsResponse {
  /** Успешность операции */
  success: boolean;
  /** Код ответа */
  code: number;
  /** Данные баланса */
  data: AccountAsset[];
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
   * Получает баланс аккаунта на MEXC
   */
  async getAccountAssets(params: { authToken: string }): Promise<AccountAssetsResponse> {
    const { authToken } = params;

    return this.signedGetRequest({
      url: '/account/assets',
      authToken,
    });
  }

  /**
   * Выполняет подписанный GET запрос к MEXC API
   */
  private async signedGetRequest(params: {
    url: string;
    authToken: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, authToken, params: requestParams } = params;

    const baseUrl = 'https://futures.mexc.com/api/v1/private';

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

    const data = await this.proxyRequest({
      method: 'GET',
      url: `${baseUrl}${url}`,
      headers,
      params: requestParams || {},
    });

    if (!data.success) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.message || data.msg || 'Ошибка при выполнении запроса';
      throw new Error(`MEXC Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }

  /**
   * Выполняет публичный GET запрос к MEXC API (без подписи)
   */
  private async publicGetRequest(params: {
    url: string;
    params?: Record<string, string>;
  }): Promise<any> {
    const { url, params: requestParams } = params;

    const baseUrl = 'https://futures.mexc.com/api/v1';

    const data = await this.proxyRequest({
      method: 'GET',
      url: `${baseUrl}${url}`,
      params: requestParams || {},
    });

    if (data.code !== 0) {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || 'Ошибка при выполнении запроса';
      throw new Error(`MEXC Error ${errorCode} - ${errorMsg}`);
    }

    return data;
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
}
