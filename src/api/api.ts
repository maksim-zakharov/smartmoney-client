import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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

export const api = createApi({
  reducerPath: 'api',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: process.env.NODE_ENV !== 'production' ? 'http://5.35.13.149:3000' : undefined,
    baseUrl: 'https://5.35.13.149',
    // baseUrl: 'http://localhost:3000',
    // baseUrl: process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined,
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    // candles: builder.query<{ candles: HistoryObject[] }, any>({
    //   query: (params) => ({
    //     url: '/api/candles',
    //     params,
    //   }),
    // }),
    security: builder.query<Security, { symbol: string }>({
      query: (params) => ({
        url: '/api/security',
        params,
      }),
    }),
    portfolio: builder.query<any, any>({
      query: (params) => ({
        url: '/api/portfolio',
        params,
      }),
    }),
    orderblocks: builder.query<any, { symbol: string; tf: string; from: number; to: number }>({
      query: (params) => ({
        url: '/api/orderblocks',
        params,
      }),
    }),
  }),
});

export const { useSecurityQuery, usePortfolioQuery, useOrderblocksQuery } = api;
