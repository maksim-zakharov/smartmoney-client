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
    getBitgetTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/tickers',
      }),
    }),
  }),
});

export const { useGetBitgetTickersQuery } = bitgetApi;
