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

export const twelveApi = createApi({
  reducerPath: 'twelveApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.twelvedata.com',
  }),
  endpoints: (builder) => ({
    tdCandles: builder.query<any, { start_date: string; outputsize: number; symbol: string; interval: string; apikey: string }>({
      query: (params) => ({
        url: '/time_series',
        params,
      }),
    }),
  }),
});

export const { useTdCandlesQuery } = twelveApi;
