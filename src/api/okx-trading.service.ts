import CryptoJS from 'crypto-js';
import { getProxyUrl } from './utils/proxy';

/**
 * Сервис для торговли на OKX
 */
export class OkxTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || getProxyUrl();
  }

  /**
   * Генерирует подпись для OKX
   */
  private generateOkxSignature(
    secretKey: string,
    timestamp: string,
    method: string,
    requestPath: string,
    body: string,
  ): string {
    const preHashString = timestamp + method + requestPath + body;
    const signature = CryptoJS.HmacSHA256(preHashString, secretKey);
    return CryptoJS.enc.Base64.stringify(signature);
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
   * Получает позиции на OKX
   */
  async getPositions(params: { apiKey: string; secretKey: string; passphrase: string; symbol?: string }): Promise<any> {
    const { apiKey, secretKey, passphrase, symbol } = params;

    // Формируем request path
    let requestPath = '/api/v5/account/positions';
    const queryParams: Record<string, string> = {};
    if (symbol) {
      queryParams.instId = symbol;
    }

    // Формируем query string для requestPath (если есть параметры)
    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');
      requestPath += `?${queryString}`;
    }

    // Для GET запроса body пустой
    const method = 'GET';
    const body = '';
    // Timestamp в формате ISO с миллисекундами: 2020-12-08T09:08:57.715Z
    const timestamp = new Date().toISOString();

    // Генерируем подпись
    const signature = this.generateOkxSignature(secretKey, timestamp, method, requestPath, body);

    // Формируем заголовки
    const headers = {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    };

    const url = `https://www.okx.com${requestPath}`;

    const data = await this.proxyRequest({
      method,
      url,
      headers,
    });

    // OKX возвращает данные в формате { code, msg, data: [...] }
    if (data.code !== undefined && data.code !== '0') {
      const errorCode = data.code || 'Unknown';
      const errorMsg = data.msg || data.message || 'Ошибка при получении позиций';
      throw new Error(`OKX Error ${errorCode} - ${errorMsg}`);
    }

    return data;
  }
}

