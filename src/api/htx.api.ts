import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const htxApi = createApi({
  reducerPath: 'htxApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://5.35.13.149/htx',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getHTXSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/spot-tickers',
      }),
    }),
    getHTXFuturesTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/futures-tickers',
      }),
    }),
  }),
});

export const { useGetHTXSpotTickersQuery, useGetHTXFuturesTickersQuery } = htxApi;
