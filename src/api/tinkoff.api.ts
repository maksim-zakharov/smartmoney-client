import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryTinkoffWithReauth } from './baseQueryTinkoff.ts';

export interface Security {
  symbol: string;
  shortname: string;
  description: string;
  exchange: string;
  market: string;
  type: string;
  lotsize: number;
  facevalue: number;
  cfiCode: string;
  cancellation: Date;
  minstep: number;
  rating: number;
  marginbuy: number;
  marginsell: number;
  marginrate: number;
  pricestep: number;
  priceMax: number;
  priceMin: number;
  theorPrice: number;
  theorPriceLimit: number;
  volatility: number;
  currency: string;
  ISIN: string;
  yield: null;
  board: string;
  primary_board: string;
  tradingStatus: number;
  tradingStatusInfo: string;
  complexProductCategory: string;
  priceMultiplier: number;
  priceShownUnits: number;
}

export const tinkoffApi = createApi({
  reducerPath: 'tinkoffApi',
  tagTypes: ['User'],
  baseQuery: (...args) => baseQueryTinkoffWithReauth(...args),
  endpoints: (builder) => ({
    getTinkoffAccounts: builder.query<any, any>({
      query: (params) => ({
        url: '/accounts',
        params,
      }),
    }),
    getTinkoffPortfolio: builder.query<any, any>({
      query: (params) => ({
        url: '/portfolio',
        params,
      }),
    }),
    getTinkoffOrders: builder.query<any, any>({
      query: (params) => ({
        url: '/orders',
        params,
      }),
    }),
    getInstrumentById: builder.query<any, any>({
      query: (params) => ({
        url: '/instrumentById',
        params,
      }),
    }),
    closePosition: builder.mutation<void, { instrumentUid: string; brokerAccountId: string }>({
      query: (body) => ({
        url: '/closePosition',
        method: 'POST',
        body,
      }),
    }),
    TinkoffPostOrder: builder.mutation<void, { instrumentUid: string; brokerAccountId: string; quantity: number; side: 'buy' | 'sell' }>({
      query: (body) => ({
        url: '/postOrder',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetInstrumentByIdQuery,
  useGetTinkoffPortfolioQuery,
  useClosePositionMutation,
  useGetTinkoffOrdersQuery,
  useGetTinkoffAccountsQuery,
  useTinkoffPostOrderMutation,
} = tinkoffApi;
