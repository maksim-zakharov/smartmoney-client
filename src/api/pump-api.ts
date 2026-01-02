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

export const pumpApi = createApi({
  reducerPath: 'pump-api',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: process.env.NODE_ENV !== 'production' ? 'http://176.114.69.4:3000' : undefined,
    // baseUrl: 'http://5.35.13.149',
    baseUrl: 'http://localhost:3000',
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
    getPumpTickers: builder.query<
      any,
      {
        minSpread?: number;
        exchanges?: string[];
        minFunding?: number;
        maxFunding?: number;
        sameFundingTime?: boolean;
        sortBy?: 'funding' | 'spread';
        limit?: number;
      }
    >({
      query: (params) => ({
        url: '/spreads/tickers',
        params: {
          ...(params.minSpread !== undefined && { minSpread: params.minSpread }),
          ...(params.exchanges && params.exchanges.length > 0 && { exchanges: params.exchanges }),
          ...(params.minFunding !== undefined && { minFunding: params.minFunding }),
          ...(params.maxFunding !== undefined && { maxFunding: params.maxFunding }),
          ...(params.sameFundingTime !== undefined && { sameFundingTime: params.sameFundingTime }),
          ...(params.sortBy && { sortBy: params.sortBy }),
          ...(params.limit && { limit: params.limit }),
        },
      }),
    }),
  }),
});

export const { useGetPumpTickersQuery } = pumpApi;
