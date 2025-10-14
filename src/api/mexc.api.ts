import { createApi } from '@reduxjs/toolkit/query/react';
import { HistoryObject } from '../sm-lib/models';
import { baseQueryMexcWithReauth } from './common/baseQueryMexc';

export const mexcApi = createApi({
  reducerPath: 'mexcApi',
  tagTypes: ['User'],
  baseQuery: (...args) => baseQueryMexcWithReauth(...args),
  endpoints: (builder) => ({
    getMEXCCandles: builder.query<HistoryObject[], any>({
      query: (params) => ({
        url: '/candles',
        params,
      }),
    }),
    getMEXCContract: builder.query<any, any>({
      query: (params) => ({
        url: '/contract',
        params,
      }),
    }),
    getMEXCPositions: builder.query<any, any>({
      query: (params) => ({
        url: '/positions',
        params,
      }),
    }),
    getMEXCBalance: builder.query<any, any>({
      query: (params) => ({
        url: '/balance',
        params,
      }),
    }),
    getTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/ticker',
        params,
      }),
    }),
    getSpotTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/spot-ticker',
        params,
      }),
    }),
    getContractDetails: builder.query<any, any>({
      query: (params) => ({
        url: '/contract',
        params,
      }),
    }),
  }),
});

export const {
  useGetMEXCBalanceQuery,
  useGetMEXCCandlesQuery,
  useGetSpotTickersQuery,
  useGetContractDetailsQuery,
  useGetTickersQuery,
  useGetMEXCContractQuery,
  useGetMEXCPositionsQuery,
} = mexcApi;
