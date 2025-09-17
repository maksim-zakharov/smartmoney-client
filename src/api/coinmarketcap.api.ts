import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const coinmarketcapApi = createApi({
  reducerPath: 'coinmarketcapApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://176.114.69.4/coinmarketcap',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    searchTickers: builder.query<any, { q: string }>({
      query: (params) => ({
        url: '/searchDexTickers',
        params,
      }),
      transformResponse(baseQueryReturnValue: any) {
        return baseQueryReturnValue?.data?.tks;
      },
    }),
    getCryptocurrencyBySlug: builder.query<any, { slug: string }>({
      query: (params) => ({
        url: `/getMarketPairsBySlug`,
        params,
      }),
      transformResponse(baseQueryReturnValue: any) {
        return baseQueryReturnValue?.data?.marketPairs;
      },
    }),
    getQuotesByIds: builder.query<any, { ids: number[] }>({
      query: (params) => ({
        url: `/getQuotesByIds`,
        params,
      }),
      transformResponse(baseQueryReturnValue: any) {
        return baseQueryReturnValue?.data;
      },
    }),
  }),
});

export const { useSearchTickersQuery, useGetCryptocurrencyBySlugQuery, useGetQuotesByIdsQuery } = coinmarketcapApi;
