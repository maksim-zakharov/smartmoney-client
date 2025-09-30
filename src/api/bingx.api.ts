import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bingxApi = createApi({
  reducerPath: 'bingxApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/bingx',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBINGXTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/stats',
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

export const { useGetBINGXTickersQuery, useGetBalanceQuery } = bingxApi;
