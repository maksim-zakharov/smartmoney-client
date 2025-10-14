import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bitgetApi = createApi({
  reducerPath: 'bitgetApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/bitget',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBitgetSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/spot-tickers',
      }),
    }),
    getBitgetFutureTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/future-tickers',
      }),
    }),
    getBitgetAccounts: builder.query<any, any>({
      query: (params) => ({
        url: '/accounts',
        params,
      }),
    }),
  }),
});

export const { useGetBitgetAccountsQuery, useGetBitgetSpotTickersQuery, useGetBitgetFutureTickersQuery } = bitgetApi;
