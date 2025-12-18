import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const gateApi = createApi({
  reducerPath: 'gateApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://5.35.13.149/gate',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getGateSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/sStats',
        params,
      }),
    }),
    getGateFuturesTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/fStats',
        params,
      }),
    }),
    getGateSAccounts: builder.query<any, { apiKey: string; secretKey: string }>({
      query: (params) => ({
        url: '/spot-accounts',
        params,
      }),
    }),
    getGateFAccounts: builder.query<any, { apiKey: string; secretKey: string }>({
      query: (params) => ({
        url: '/futures-accounts',
        params,
      }),
    }),
  }),
});

export const { useGetGateSAccountsQuery, useGetGateSpotTickersQuery, useGetGateFuturesTickersQuery, useGetGateFAccountsQuery } = gateApi;
