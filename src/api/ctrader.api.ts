import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryCTraderWithReauth } from './baseQueryCTrader';
import { HistoryObject } from '../sm-lib/models.ts';

export const ctraderApi = createApi({
  reducerPath: 'ctraderApi',
  tagTypes: ['User'],
  baseQuery: (...args) => baseQueryCTraderWithReauth(...args),
  endpoints: (builder) => ({
    authCode: builder.query<any, any>({
      query: (params) => ({
        url: '/code',
        params,
      }),
    }),
    authAuth: builder.query<any, any>({
      query: (params) => ({
        url: '/auth',
        params,
      }),
    }),
    candles: builder.query<HistoryObject[], any>({
      query: (params) => ({
        url: '/candles',
        params,
      }),
    }),
    selectAccount: builder.query<any, any>({
      query: (params) => ({
        url: '/selectAccount',
        params,
      }),
    }),
    getCTraderPositions: builder.query<any, any>({
      query: (params) => ({
        url: '/positions',
        params,
      }),
    }),
    getCTraderPositionPnL: builder.query<any, any>({
      query: (params) => ({
        url: '/positionPnL',
        params,
      }),
    }),
    getCTraderSymbolsById: builder.query<any, any>({
      query: (params) => ({
        url: '/symbolsById',
        params,
      }),
    }),
    getCTraderSymbols: builder.query<any, any>({
      query: (params) => ({
        url: '/symbols',
        params,
      }),
    }),
    CTraderclosePosition: builder.mutation<void, { symbolId: string; ctidTraderAccountId: string }>({
      query: (body) => ({
        url: '/closePosition',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useCandlesQuery,
  useGetCTraderSymbolsQuery,
  useAuthAuthQuery,
  useGetCTraderSymbolsByIdQuery,
  useGetCTraderPositionPnLQuery,
  useAuthCodeQuery,
  useGetCTraderPositionsQuery,
  useSelectAccountQuery,
  useCTraderclosePositionMutation,
} = ctraderApi;
