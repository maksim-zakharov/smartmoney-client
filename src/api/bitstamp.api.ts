import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bitstampApi = createApi({
  reducerPath: 'bitstampApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://5.35.13.149/bitstamp',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getBitstampTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/tickers',
      }),
      transformResponse(response: any) {
        return response?.filter((r) => r['market_type'] === 'PERPETUAL');
      },
    }),
  }),
});

export const { useGetBitstampTickersQuery } = bitstampApi;
