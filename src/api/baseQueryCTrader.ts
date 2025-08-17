import { Mutex } from 'async-mutex';
import { BaseQueryApi, FetchArgs, fetchBaseQuery } from '@reduxjs/toolkit/query';

const mutex = new Mutex();

const baseQuery = () =>
  fetchBaseQuery({
    // baseUrl: 'http://localhost:3000/ctrader',
    baseUrl: 'https://176.114.69.4/ctrader',
    prepareHeaders: (headers, { getState }: any) => {
      const token = getState().alorSlice.cTraderAuth?.accessToken;

      if (token) {
        headers.set('x-ctrader-token', token);
      }

      return headers;
    },
    paramsSerializer: (params) => {
      return new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key + '[]', String(v)]) : [[key, String(value)]],
        ),
      ).toString();
    },
  });

export const baseQueryCTraderWithReauth = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions) => {
  let result = await baseQuery()(args, api, extraOptions);

  if ([500, 401].includes(Number(result?.error?.status))) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshResult = await baseQuery()(
          {
            // @ts-ignore
            url: `/auth?ctidTraderAccountId=${api.getState().alorSlice.ctidTraderAccountId}`,
            headers: {
              // @ts-ignore
              'x-ctrader-token': api.getState().alorSlice.cTraderAuth?.accessToken,
            },
            method: 'GET',
          },
          api,
          extraOptions,
        );

        if (refreshResult?.meta?.response?.status && refreshResult?.meta?.response?.status < 400) {
          result = await baseQuery()(args, api, extraOptions);
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await baseQuery()(args, api, extraOptions);
    }
  }

  return result;
};
