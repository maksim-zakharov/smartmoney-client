import { createApi } from '@reduxjs/toolkit/query/react';
import { HistoryObject } from '../sm-lib/models.ts';
import { baseQueryMexcWithReauth } from './baseQueryMexc.ts';

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
  }),
});

export const { useGetMEXCCandlesQuery, useGetMEXCContractQuery, useGetMEXCPositionsQuery } = mexcApi;
