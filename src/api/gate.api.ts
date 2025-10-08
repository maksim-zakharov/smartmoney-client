import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const gateApi = createApi({
  reducerPath: 'gateApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/gate',
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
    getAccounts: builder.query<any, { apiKey: string; secretKey: string }>({
      query: (params) => ({
        url: '/futures-accounts',
        params,
      }),
    }),
  }),
});

export const { useGetGateSpotTickersQuery, useGetGateFuturesTickersQuery, useGetAccountsQuery } = gateApi;
