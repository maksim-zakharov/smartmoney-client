import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface HistoryObject {
  high: number;
  low: number;
  open: number;
  close: number;
  time: number
}

export const api = createApi({
  reducerPath: "api",
  tagTypes: [
    "User"
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NODE_ENV !== 'production' ? "http://91.236.198.2:3000" : undefined
  }),
  endpoints: (builder) => ({
    candles: builder.query<{candles: HistoryObject[]}, any>({
      query: (params) => ({
        url: "/api/candles",
        params
      })
    }),
    portfolio: builder.query<any, void>({
      query: () => ({
        url: "/api/portfolio"
      })
    })
  })
});

export const {
  useCandlesQuery,
  usePortfolioQuery
} = api;