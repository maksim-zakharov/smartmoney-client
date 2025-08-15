import { Mutex } from 'async-mutex';
import { BaseQueryApi, FetchArgs, fetchBaseQuery } from '@reduxjs/toolkit/query';

const mutex = new Mutex();

export const AUTH_HEADER = 'x-tinkoff-token';

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

  if (result?.error?.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const headers: { [key: string]: string } = {
          [AUTH_HEADER]: Telegram.WebApp?.initData,
        };
        const refreshResult = await baseQuery()(
          {
            url: '/auth',
            headers,
            method: 'POST',
          },
          api,
          extraOptions,
        );

        // api.dispatch(saveToken({ token: refreshResult?.data?.access_token }));

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
