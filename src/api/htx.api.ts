import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const htxApi = createApi({
  reducerPath: 'htxApi',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://api.hbdm.com',
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  }),
  endpoints: (builder) => ({
    getHTXTickers: builder.query<any, any>({
      query: (params) => ({
        url: '/v2/linear-swap-ex/market/detail/batch_merged',
      }),
      transformResponse(baseQueryReturnValue: any): any {
        return baseQueryReturnValue?.ticks;
      },
    }),
  }),
});

export const { useGetHTXTickersQuery } = htxApi;
