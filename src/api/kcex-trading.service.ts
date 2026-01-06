import { generateHeaders as generateMexcHeaders } from './utils/headers';
import { PlaceLimitOrderParams, PlaceOrderResponse } from './mexc-trading.service';

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
    const url = `https://www.kcex.com/fapi/v1/contract/ticker`;
    
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
   * Размещает лимитный ордер на KCEX через /submit endpoint
   * Основано на SDK: https://github.com/maksim-zakharov/mexc-futures-sdk/blob/main/src/client.ts
   */
  async placeLimitOrder(params: PlaceLimitOrderParams): Promise<PlaceOrderResponse> {
    const { authToken, symbol, side, price, quantity, leverage = 10 } = params;

    // Формируем данные для запроса (идентично MEXC)
    const orderData: any = {
      symbol,
      side: side === 'BUY' ? 1 : 3, // 1 = Buy, 3 = Sell
      openType: 1, // Isolated margin
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
}

