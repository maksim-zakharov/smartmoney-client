import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const binanceApi = createApi({
  reducerPath: 'binanceApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://5.35.13.149/binance',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBinanceSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/tickerStats',
        params: {
          category: 'linear',
        },
      }),
    }),
    getBinanceFuturesTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/fTickerStats',
        params: {
          category: 'linear',
        },
      }),
    }),
  }),
});

export const { useGetBinanceSpotTickersQuery, useGetBinanceFuturesTickersQuery } = binanceApi;
