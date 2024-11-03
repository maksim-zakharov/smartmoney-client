import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  tagTypes: [
    "User"
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NODE_ENV !== 'production' ? "http://localhost:3000" : undefined
  }),
  endpoints: (builder) => ({
    candles: builder.query<any, any>({
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