import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const kucoinApi = createApi({
  reducerPath: 'kucoinApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/kucoin',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getKuCoinSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/spot-tickers',
      }),
    }),
    getKuCoinFutureTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/futures-tickers',
      }),
    }),
  }),
});

export const { useGetKuCoinFutureTickersQuery, useGetKuCoinSpotTickersQuery } = kucoinApi;
