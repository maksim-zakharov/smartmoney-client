import CryptoJS from 'crypto-js';

/**
 * Параметры для рыночного ордера на Gate
 */
export interface GatePlaceMarketOrderParams {
  /** API Key */
  apiKey: string;
  /** Secret Key */
  secretKey: string;
  /** Контракт, например BTC_USDT */
  contract: string;
  /** Сторона ордера */
  side: 'BUY' | 'SELL';
  /** Объем в USD, который нужно открыть по рынку */
  usdAmount: number;
}

/**
 * Параметры для лимитного ордера на Gate
 */
export interface GatePlaceLimitOrderParams {
  /** API Key */
  apiKey: string;
  /** Secret Key */
  secretKey: string;
  /** Контракт, например BTC_USDT */
  contract: string;
  /** Сторона ордера */
  side: 'BUY' | 'SELL';
  /** Цена лимитного ордера */
  price: number;
  /** Размер в контрактах (если неизвестно точное соответствие, используем количество монет как приближение) */
  size: number;
}

/**
 * Ответ при размещении ордера на Gate
 */
export interface GatePlaceOrderResponse {
  /** ID ордера */
  id: number;
  /** Контракт */
  contract: string;
  /** Размер */
  size: string;
  /** Цена */
  price: string;
  /** Статус */
  status: string;
  /** Прочие поля ответа */
  [key: string]: any;
}

/**
 * Сервис для торговли фьючерсами на Gate (USDT-settle)
 * Документация: https://api.gateio.ws/api/v4
 */
export class GateTradingService {
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
      // Если бекенд вернул ошибку от целевого сервера (Gate)
      if (responseData.label || responseData.message || responseData.code) {
        throw new Error(
          `Gate Error ${responseData.label || responseData.code || 'Unknown'} - ${
            responseData.message || responseData.msg || 'Ошибка при размещении ордера'
          }`,
        );
      }

      throw new Error(responseData.message || 'Ошибка при проксировании запроса');
    }

    return responseData;
  }

  /**
   * Генерирует подпись Gate API v4
   * Формат сообщения:
   * method + '\n' + requestPath + '\n' + queryString + '\n' + HexEncode(SHA512(body)) + '\n' + timestamp
   */
  private generateGateHeaders(
    apiKey: string,
    secretKey: string,
    method: string,
    requestPath: string,
    body: any,
    queryString: string = '',
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const bodyHash = CryptoJS.SHA512(bodyStr).toString(CryptoJS.enc.Hex);

    const message = [
      method.toUpperCase(),
      requestPath,
      queryString,
      bodyHash,
      timestamp,
    ].join('\n');

    const sign = CryptoJS.HmacSHA512(message, secretKey).toString(CryptoJS.enc.Hex);

    return {
      KEY: apiKey,
      SIGN: sign,
      Timestamp: timestamp,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Получает последнюю цену фьючерса для контракта
   * GET /futures/usdt/tickers?contract=BTC_USDT
   */
  private async getLastPrice(contract: string): Promise<number> {
    const url = 'https://api.gateio.ws/api/v4/futures/usdt/tickers';

    const data = await this.proxyRequest({
      method: 'GET',
      url,
      params: {
        contract,
      },
    });

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Ответ Gate пустой или неверного формата');
    }

    const ticker = data[0];
    if (!ticker || !ticker.last) {
      throw new Error('Цена не найдена');
    }

    return parseFloat(ticker.last);
  }

  /**
   * Размещает рыночный ордер на Gate (фьючерсы USDT)
   * Используем market-логику: price = 0, tif = ioc
   */
  async placeMarketOrder(params: GatePlaceMarketOrderParams): Promise<GatePlaceOrderResponse> {
    const { apiKey, secretKey, contract, side, usdAmount } = params;

    // Получаем последнюю цену для расчета приблизительного размера
    const lastPrice = await this.getLastPrice(contract);

    // Приближение: считаем, что 1 контракт ≈ 1 монета
    const sizeAbs = Math.floor(usdAmount / lastPrice);
    if (!Number.isFinite(sizeAbs) || sizeAbs <= 0) {
      throw new Error('Неверный размер ордера для Gate');
    }

    // Gate: size > 0 для покупки, < 0 для продажи
    const size = side === 'BUY' ? sizeAbs : -sizeAbs;

    const orderData: any = {
      contract,
      size: size.toString(),
      price: '0', // 0 + tif=ioc = рыночный ордер
      tif: 'ioc',
      reduce_only: false,
      close: false,
      text: 't-smartmoney-client',
    };

    const requestPath = '/api/v4/futures/usdt/orders';
    const url = `https://api.gateio.ws${requestPath}`;

    const headers = this.generateGateHeaders(apiKey, secretKey, 'POST', requestPath, orderData);

    const data = await this.proxyRequest({
      method: 'POST',
      url,
      headers,
      data: orderData,
    });

    return data as GatePlaceOrderResponse;
  }

  /**
   * Размещает лимитный ордер на Gate (фьючерсы USDT)
   */
  async placeLimitOrder(params: GatePlaceLimitOrderParams): Promise<GatePlaceOrderResponse> {
    const { apiKey, secretKey, contract, side, price, size } = params;

    const sizeAbs = Math.floor(size);
    if (!Number.isFinite(sizeAbs) || sizeAbs <= 0) {
      throw new Error('Неверный размер лимитного ордера для Gate');
    }

    const signedSize = side === 'BUY' ? sizeAbs : -sizeAbs;

    const orderData: any = {
      contract,
      size: signedSize.toString(),
      price: price.toString(),
      tif: 'gtc',
      reduce_only: false,
      close: false,
      text: 't-smartmoney-client',
    };

    const requestPath = '/api/v4/futures/usdt/orders';
    const url = `https://api.gateio.ws${requestPath}`;

    const headers = this.generateGateHeaders(apiKey, secretKey, 'POST', requestPath, orderData);

    const data = await this.proxyRequest({
      method: 'POST',
      url,
      headers,
      data: orderData,
    });

    return data as GatePlaceOrderResponse;
  }

  /**
   * Получает открытые позиции на Gate (фьючерсы USDT)
   * GET /api/v4/futures/usdt/positions
   */
  async getPositions(params: { apiKey: string; secretKey: string; contract?: string }): Promise<any> {
    const { apiKey, secretKey, contract } = params;

    const requestPath = '/api/v4/futures/usdt/positions';
    const requestParams: Record<string, string> = {};
    if (contract) {
      requestParams.contract = contract;
    }

    // Формируем queryString для подписи
    const queryString = Object.keys(requestParams)
      .map((key) => `${key}=${requestParams[key]}`)
      .join('&');

    const url = `https://api.gateio.ws${requestPath}${queryString ? `?${queryString}` : ''}`;

    const headers = this.generateGateHeaders(apiKey, secretKey, 'GET', requestPath, {}, queryString);

    const data = await this.proxyRequest({
      method: 'GET',
      url,
      headers,
      params: requestParams,
    });

    return data;
  }
}


