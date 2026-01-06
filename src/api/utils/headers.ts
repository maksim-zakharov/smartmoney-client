import CryptoJS from 'crypto-js';

/**
 * Дефолтные заголовки для MEXC/Ourbit/KCEX API
 * Эмулируют запросы браузера
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'accept-encoding': 'gzip, deflate, br',
  'origin': 'https://futures.mexc.com',
  'referer': 'https://futures.mexc.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

/**
 * Опции для генерации заголовков
 */
export interface SDKOptions {
  /** WEB authentication token from browser */
  authToken: string;
  /** Пользовательский User-Agent (опционально) */
  userAgent?: string;
  /** Origin для заголовка (опционально, по умолчанию MEXC) */
  origin?: string;
  /** Referer для заголовка (опционально, по умолчанию MEXC) */
  referer?: string;
  /** Префикс для заголовков подписи (mxc, ourbit, kcex) - по умолчанию 'mxc' */
  signaturePrefix?: 'mxc' | 'ourbit' | 'kcex';
  /** Дополнительные кастомные заголовки (опционально) */
  customHeaders?: Record<string, string>;
}

/**
 * Генерирует MEXC криптографическую подпись используя MD5 алгоритм
 * @param key WEB authentication key
 * @param obj Объект запроса для подписи
 * @returns Объект с timestamp и подписью
 */
function mexcCrypto(key: string, obj: any): { time: string; sign: string } {
  const dateNow = String(Date.now());
  const g = CryptoJS.MD5(key + dateNow).toString().substring(7);
  const s = JSON.stringify(obj);
  const sign = CryptoJS.MD5(dateNow + s + g).toString();

  return { time: dateNow, sign: sign };
}

/**
 * Генерирует HTTP заголовки для API запросов
 * @param options Опции конфигурации SDK
 * @param includeAuth Включать ли заголовки аутентификации
 * @param requestBody Тело запроса для подписи (опционально)
 * @returns Запись HTTP заголовков
 */
export function generateHeaders(
  options: SDKOptions,
  includeAuth: boolean = true,
  requestBody?: any
): Record<string, string> {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
  };

  // Переопределяем origin и referer если предоставлены
  if (options.origin) {
    headers['origin'] = options.origin;
  }
  if (options.referer) {
    headers['referer'] = options.referer;
  }

  // Переопределяем user agent если предоставлен
  if (options.userAgent) {
    headers['user-agent'] = options.userAgent;
  }

  // Добавляем кастомные заголовки если предоставлены
  if (options.customHeaders) {
    Object.assign(headers, options.customHeaders);
  }

  // Добавляем заголовки аутентификации для приватных эндпоинтов
  if (includeAuth) {
    // Используем WEB token для аутентификации
    headers['authorization'] = options.authToken;
    headers['authentication'] = options.authToken;

    // Добавляем подпись для POST запросов с телом
    if (requestBody) {
      const signature = mexcCrypto(options.authToken, requestBody);
      const prefix = options.signaturePrefix || 'mxc';

      // KCEX использует другие названия заголовков
      if (prefix === 'kcex') {
        headers['content-time'] = signature.time;
        headers['content-sign'] = signature.sign;
      } else {
        headers[`x-${prefix}-nonce`] = signature.time;
        headers[`x-${prefix}-sign`] = signature.sign;
      }
    }
  }

  return headers;
}

