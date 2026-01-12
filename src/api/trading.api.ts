import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { generateHeaders } from './utils/headers';
import CryptoJS from 'crypto-js';

const tradingBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const result = await fetchBaseQuery({
    baseUrl: 'http://5.35.13.149',
  })(args, api, extraOptions);
  return result;
};

/**
 * Генерирует подпись для Bybit
 */
function generateBybitSignature(apiKey: string, secretKey: string, timestamp: number, recvWindow: number, body: any): string {
  const signStr = `${timestamp}${apiKey}${recvWindow}${JSON.stringify(body)}`;
  return CryptoJS.HmacSHA256(signStr, secretKey).toString(CryptoJS.enc.Hex);
}

/**
 * Генерирует подпись для Binance
 */
function generateBinanceSignature(secretKey: string, queryString: string): string {
  return CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex);
}

/**
 * Генерирует подпись для OKX
 */
function generateOkxSignature(secretKey: string, timestamp: string, method: string, requestPath: string, body: string): string {
  const preHashString = timestamp + method + requestPath + body;
  const signature = CryptoJS.HmacSHA256(preHashString, secretKey);
  return CryptoJS.enc.Base64.stringify(signature);
}

/**
 * Генерирует подпись для Bitget
 */
function generateBitgetSignature(secretKey: string, timestamp: string, method: string, requestPath: string, queryString: string = '', body: string = ''): string {
  const message = timestamp + method.toUpperCase() + requestPath + (queryString ? '?' + queryString : '') + body;
  return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Base64);
}

/**
 * Генерирует заголовки для Gate
 */
function generateGateHeaders(apiKey: string, secretKey: string, method: string, requestPath: string, body: any, queryString: string = ''): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const bodyHash = CryptoJS.SHA512(bodyStr).toString(CryptoJS.enc.Hex);

  const message = [method.toUpperCase(), requestPath, queryString, bodyHash, timestamp].join('\n');
  const sign = CryptoJS.HmacSHA512(message, secretKey).toString(CryptoJS.enc.Hex);

  return {
    KEY: apiKey,
    SIGN: sign,
    Timestamp: timestamp,
    'Content-Type': 'application/json',
  };
}

/**
 * Генерирует подпись для Bitmart
 */
function generateBitmartSignature(secretKey: string, memo: string, timestamp: string, body: string): string {
  const message = `${timestamp}#${memo}#${body}`;
  return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Hex);
}

export const tradingApi = createApi({
  reducerPath: 'tradingApi',
  tagTypes: ['Balance', 'Position'],
  baseQuery: tradingBaseQuery,
  endpoints: (builder) => ({
    // Балансы
    getMEXCBalance: builder.query<any, { authToken: string }>({
      query: ({ authToken }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://futures.mexc.com',
            referer: 'https://futures.mexc.com/',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: 'https://futures.mexc.com/api/v1/private/account/assets',
            headers,
          },
        };
      },
    }),
    getOurbitBalance: builder.query<any, { authToken: string }>({
      query: ({ authToken }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://futures.ourbit.com',
            referer: 'https://futures.ourbit.com/',
            signaturePrefix: 'ourbit',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: 'https://futures.ourbit.com/api/v1/private/account/assets',
            headers,
          },
        };
      },
    }),
    getKCEXBalance: builder.query<any, { authToken: string }>({
      query: ({ authToken }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://www.kcex.com',
            referer: 'https://www.kcex.com/',
            signaturePrefix: 'kcex',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: 'https://www.kcex.com/fapi/v1/private/account/assets',
            headers,
          },
        };
      },
    }),
    getBybitBalance: builder.query<any, { apiKey: string; secretKey: string }>({
      query: ({ apiKey, secretKey }) => {
        const timestamp = Date.now();
        const recvWindow = 10000;
        const body = {};
        const signature = generateBybitSignature(apiKey, secretKey, timestamp, recvWindow, body);

        const headers = {
          'X-BAPI-SIGN': signature,
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': recvWindow.toString(),
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: 'https://api.bybit.com/v5/account/wallet-balance',
            headers,
            params: {
              accountType: 'UNIFIED',
            },
          },
        };
      },
    }),
    getBinanceBalance: builder.query<any, { apiKey: string; secretKey: string }>({
      query: ({ apiKey, secretKey }) => {
        const timestamp = Date.now();
        const recvWindow = 10000;
        const params: Record<string, string> = {
          timestamp: timestamp.toString(),
          recvWindow: recvWindow.toString(),
        };

        const queryString = Object.keys(params)
          .sort()
          .map((key) => `${key}=${params[key]}`)
          .join('&');

        const signature = generateBinanceSignature(secretKey, queryString);

        const headers = {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://fapi.binance.com/fapi/v3/balance?${queryString}&signature=${signature}`,
            headers,
          },
        };
      },
    }),
    getOKXBalance: builder.query<any, { apiKey: string; secretKey: string; passphrase: string }>({
      query: ({ apiKey, secretKey, passphrase }) => {
        const method = 'GET';
        const requestPath = '/api/v5/account/balance';
        const body = '';
        const timestamp = new Date().toISOString();
        const signature = generateOkxSignature(secretKey, timestamp, method, requestPath, body);

        const headers = {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': passphrase,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://www.okx.com${requestPath}`,
            headers,
          },
        };
      },
    }),
    getBitgetBalance: builder.query<any, { apiKey: string; secretKey: string; passphrase: string }>({
      query: ({ apiKey, secretKey, passphrase }) => {
        const method = 'GET';
        const requestPath = '/api/mix/v1/account/accounts';
        const productType = 'USDT-FUTURES';
        const queryString = `productType=${productType}`;
        const body = '';
        const timestamp = Date.now().toString();
        const signature = generateBitgetSignature(secretKey, timestamp, method, requestPath, queryString, body);

        const headers = {
          'ACCESS-KEY': apiKey,
          'ACCESS-SIGN': signature,
          'ACCESS-TIMESTAMP': timestamp,
          'ACCESS-PASSPHRASE': passphrase,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://api.bitget.com${requestPath}?${queryString}`,
            headers,
          },
        };
      },
    }),
    getGateBalance: builder.query<any, { apiKey: string; secretKey: string }>({
      query: ({ apiKey, secretKey }) => {
        const method = 'GET';
        const requestPath = '/api/v4/futures/usdt/accounts';
        const body = null;
        const headers = generateGateHeaders(apiKey, secretKey, method, requestPath, body);

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://api.gateio.ws${requestPath}`,
            headers,
          },
        };
      },
    }),
    getBitmartBalance: builder.query<any, { apiKey: string; secretKey: string; passphrase: string }>({
      query: ({ apiKey, secretKey, passphrase }) => {
        const timestamp = Date.now().toString();
        const memo = passphrase;
        const body = '';
        const signature = generateBitmartSignature(secretKey, memo, timestamp, body);

        const headers = {
          'X-BM-KEY': apiKey,
          'X-BM-SIGN': signature,
          'X-BM-TIMESTAMP': timestamp,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: 'https://api-cloud-v2.bitmart.com/contract/private/assets-detail',
            headers,
          },
        };
      },
    }),

    // Позиции
    getMEXCPositions: builder.query<any, { authToken: string; symbol?: string }>({
      query: ({ authToken, symbol }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://futures.mexc.com',
            referer: 'https://futures.mexc.com/',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://futures.mexc.com/api/v1/private/position/open_positions${symbol ? `?symbol=${symbol}` : ''}`,
            headers,
          },
        };
      },
    }),
    getOurbitPositions: builder.query<any, { authToken: string; symbol?: string }>({
      query: ({ authToken, symbol }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://futures.ourbit.com',
            referer: 'https://futures.ourbit.com/',
            signaturePrefix: 'ourbit',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://futures.ourbit.com/api/v1/private/position/open_positions${symbol ? `?symbol=${symbol}` : ''}`,
            headers,
          },
        };
      },
    }),
    getKCEXPositions: builder.query<any, { authToken: string; symbol?: string }>({
      query: ({ authToken, symbol }) => {
        const headers = generateHeaders(
          {
            authToken,
            origin: 'https://www.kcex.com',
            referer: 'https://www.kcex.com/',
            signaturePrefix: 'kcex',
          },
          true,
          {}, // Пустое тело для GET запроса
        );
        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://www.kcex.com/fapi/v1/private/position/open_positions${symbol ? `?symbol=${symbol}` : ''}`,
            headers,
          },
        };
      },
    }),
    getBybitPositions: builder.query<any, { apiKey: string; secretKey: string; symbol?: string }>({
      query: ({ apiKey, secretKey, symbol }) => {
        const timestamp = Date.now();
        const recvWindow = 10000;
        const requestParams: any = {
          category: 'linear',
          settleCoin: 'USDT',
        };
        if (symbol) {
          requestParams.symbol = symbol;
        }

        // Для GET запроса подпись генерируется из query string
        const queryString = new URLSearchParams(requestParams).toString();
        const signStr = `${timestamp}${apiKey}${recvWindow}${queryString}`;
        const signature = CryptoJS.HmacSHA256(signStr, secretKey).toString(CryptoJS.enc.Hex);

        const headers = {
          'X-BAPI-SIGN': signature,
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': recvWindow.toString(),
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://api.bybit.com/v5/position/list?${queryString}`,
            headers,
          },
        };
      },
    }),
    getBinancePositions: builder.query<any, { apiKey: string; secretKey: string; symbol?: string }>({
      query: ({ apiKey, secretKey, symbol }) => {
        const timestamp = Date.now();
        const recvWindow = 10000;
        const params: Record<string, string> = {
          timestamp: timestamp.toString(),
          recvWindow: recvWindow.toString(),
        };
        if (symbol) {
          params.symbol = symbol;
        }

        const queryString = Object.keys(params)
          .sort()
          .map((key) => `${key}=${params[key]}`)
          .join('&');

        const signature = generateBinanceSignature(secretKey, queryString);

        const headers = {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://fapi.binance.com/fapi/v3/positionRisk?${queryString}&signature=${signature}`,
            headers,
          },
        };
      },
    }),
    getOKXPositions: builder.query<any, { apiKey: string; secretKey: string; passphrase: string; symbol?: string }>({
      query: ({ apiKey, secretKey, passphrase, symbol }) => {
        let requestPath = '/api/v5/account/positions';
        const queryParams: Record<string, string> = {};
        if (symbol) {
          queryParams.instId = symbol;
        }

        if (Object.keys(queryParams).length > 0) {
          const queryString = Object.keys(queryParams)
            .map((key) => `${key}=${queryParams[key]}`)
            .join('&');
          requestPath += `?${queryString}`;
        }

        const method = 'GET';
        const body = '';
        const timestamp = new Date().toISOString();
        const signature = generateOkxSignature(secretKey, timestamp, method, requestPath, body);

        const headers = {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': passphrase,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://www.okx.com${requestPath}`,
            headers,
          },
        };
      },
    }),
    getBitgetPositions: builder.query<any, { apiKey: string; secretKey: string; passphrase: string; symbol?: string }>({
      query: ({ apiKey, secretKey, passphrase, symbol }) => {
        const method = 'GET';
        let requestPath = '/api/mix/v1/position/allPosition';
        const queryParams: Record<string, string> = {
          productType: 'USDT-FUTURES',
        };
        if (symbol) {
          queryParams.symbol = symbol;
        }

        const queryString = Object.keys(queryParams)
          .map((key) => `${key}=${queryParams[key]}`)
          .join('&');

        const body = '';
        const timestamp = Date.now().toString();
        const signature = generateBitgetSignature(secretKey, timestamp, method, requestPath, queryString, body);

        const headers = {
          'ACCESS-KEY': apiKey,
          'ACCESS-SIGN': signature,
          'ACCESS-TIMESTAMP': timestamp,
          'ACCESS-PASSPHRASE': passphrase,
          'Content-Type': 'application/json',
        };

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://api.bitget.com${requestPath}?${queryString}`,
            headers,
          },
        };
      },
    }),
    getGatePositions: builder.query<any, { apiKey: string; secretKey: string; contract?: string }>({
      query: ({ apiKey, secretKey, contract }) => {
        const method = 'GET';
        const requestPath = '/api/v4/futures/usdt/positions';
        const requestParams: Record<string, string> = {};
        if (contract) {
          requestParams.contract = contract;
        }

        const queryString = Object.keys(requestParams)
          .map((key) => `${key}=${requestParams[key]}`)
          .join('&');

        const body = null;
        const headers = generateGateHeaders(apiKey, secretKey, method, requestPath, body, queryString);

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `https://api.gateio.ws${requestPath}${queryString ? `?${queryString}` : ''}`,
            headers,
          },
        };
      },
    }),
    getBitmartPositions: builder.query<any, { apiKey: string; secretKey: string; passphrase: string; symbol?: string }>({
      query: ({ apiKey, secretKey, passphrase, symbol }) => {
        const url = 'https://api-cloud-v2.bitmart.com/contract/private/position-v2';
        const queryParams: Record<string, string> = {};
        if (symbol) {
          queryParams.symbol = symbol;
        }

        const timestamp = Date.now().toString();
        const memo = passphrase;
        const bodyStr = '';
        const signature = generateBitmartSignature(secretKey, memo, timestamp, bodyStr);

        const headers = {
          'X-BM-KEY': apiKey,
          'X-BM-SIGN': signature,
          'X-BM-TIMESTAMP': timestamp,
          'Content-Type': 'application/json',
        };

        const queryString = Object.keys(queryParams)
          .map((key) => `${key}=${queryParams[key]}`)
          .join('&');

        return {
          url: '/proxy',
          method: 'POST',
          body: {
            method: 'GET',
            url: `${url}${queryString ? `?${queryString}` : ''}`,
            headers,
          },
        };
      },
    }),
  }),
});

export const {
  useGetMEXCBalanceQuery,
  useGetOurbitBalanceQuery,
  useGetKCEXBalanceQuery,
  useGetBybitBalanceQuery,
  useGetBinanceBalanceQuery,
  useGetOKXBalanceQuery,
  useGetBitgetBalanceQuery,
  useGetGateBalanceQuery,
  useGetBitmartBalanceQuery,
  useGetMEXCPositionsQuery,
  useGetOurbitPositionsQuery,
  useGetKCEXPositionsQuery,
  useGetBybitPositionsQuery,
  useGetBinancePositionsQuery,
  useGetOKXPositionsQuery,
  useGetBitgetPositionsQuery,
  useGetGatePositionsQuery,
  useGetBitmartPositionsQuery,
} = tradingApi;

