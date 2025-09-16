import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const kucoinApi = createApi({
  reducerPath: 'kucoinApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://api.kucoin.com/',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getKuCoinTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/api/v1/market/allTickers',
      }),
      transformResponse(baseQueryReturnValue: any): any {
        return baseQueryReturnValue?.data?.ticker;
      },
    }),
  }),
});

export const { useGetKuCoinTickersQuery } = kucoinApi;
