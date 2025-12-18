import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bingxApi = createApi({
  reducerPath: 'bingxApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://5.35.13.149/bingx',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBINGXSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/spot-stats',
        params,
      }),
    }),
    getBINGXFuturesTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/futures-stats',
        params,
      }),
    }),
    getBalance: builder.query<any, { apiKey: string; secretKey: string }>({
      query: (params) => ({
        url: '/balance',
        params,
      }),
    }),
  }),
});

export const { useGetBINGXSpotTickersQuery, useGetBINGXFuturesTickersQuery, useGetBalanceQuery } = bingxApi;
