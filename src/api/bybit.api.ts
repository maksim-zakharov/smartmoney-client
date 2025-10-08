import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bybitApi = createApi({
  reducerPath: 'bybitApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/bybit',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBYBITSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/ticker',
        params: {
          category: 'spot',
        },
      }),
    }),
    getBYBITFuturesTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/ticker',
        params: {
          category: 'linear',
        },
      }),
    }),
    getWalletBalance: builder.query<any, any>({
      query: (params) => ({
        url: '/wallet-balance',
        params: {
          accountType: 'UNIFIED',
        },
      }),
    }),
  }),
});

export const { useGetBYBITSpotTickersQuery, useGetBYBITFuturesTickersQuery, useGetWalletBalanceQuery } = bybitApi;
