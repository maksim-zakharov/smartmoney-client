import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryCTraderWithReauth } from './common/baseQueryCTrader';
import { HistoryObject } from '../sm-lib/models';

export const ctraderApi = createApi({
  reducerPath: 'ctraderApi',
  tagTypes: ['User'],
  baseQuery: (...args) => baseQueryCTraderWithReauth(...args),
  endpoints: (builder) => ({
    authCode: builder.query<any, any>({
      query: (params) => ({
        url: '/code',
        params,
      }),
    }),
    authAuth: builder.query<any, any>({
      query: (params) => ({
        url: '/auth',
        params,
      }),
    }),
    candles: builder.query<HistoryObject[], any>({
      query: (params) => ({
        url: '/candles',
        params,
      }),
    }),
    summary: builder.query<any, any>({
      query: (params) => ({
        url: '/summary',
        params,
      }),
    }),
    cashflow: builder.query<any, any>({
      async queryFn(params, _queryApi, _extraOptions, baseQuery) {
        const { from, to, ...otherParams } = params; // Извлекаем from/to, остальное сохраняем

        if (from >= to) {
          return { error: { status: 'CUSTOM_ERROR', error: 'Invalid range: from >= to' } };
        }

        // Разбиваем на интервалы по 604800000 ms (1 неделя)
        const intervals: { from: number; to: number }[] = [];
        let currentFrom = from;
        while (currentFrom < to) {
          const currentTo = Math.min(currentFrom + 604800, to);
          intervals.push({ from: currentFrom, to: currentTo });
          currentFrom = currentTo;
        }

        // Выполняем параллельные запросы
        const responses = await Promise.all(
          intervals.map((interval) =>
            baseQuery({
              url: '/cashflow',
              params: { ...otherParams, ...interval }, // Мержим otherParams + текущий интервал
            }),
          ),
        );

        // Обрабатываем результаты: конкатенируем массивы
        const combinedData: any[] = []; // Или укажите тип, если известен
        for (const res of responses as any[]) {
          if (res.error) {
            return { error: res.error }; // Если ошибка в любом — прерываем
          }
          // Предполагаем, что данные в res.data.depositWithdraw (как в proto)
          // Если ответ — просто массив, используйте res.data напрямую
          // Если структура другая, скорректируйте здесь
          combinedData.push(...(res.data || []));
        }

        // Возвращаем в формате, как ожидает ваш код (например, { depositWithdraw: combinedData })
        return { data: { depositWithdraw: combinedData } }; // Или просто combinedData, если ответ — массив
      },
    }),
    selectAccount: builder.query<any, any>({
      query: (params) => ({
        url: '/selectAccount',
        params,
      }),
    }),
    getCTraderPositions: builder.query<any, any>({
      query: (params) => ({
        url: '/positions',
        params,
      }),
    }),
    getCTraderDeals: builder.query<any, { from: number; to: number; ctidTraderAccountId: string }>({
      query: (params) => ({
        url: '/deals',
        params,
      }),
    }),
    getCTraderPositionPnL: builder.query<any, any>({
      query: (params) => ({
        url: '/positionPnL',
        params,
      }),
    }),
    getCTraderSymbolsById: builder.query<any, any>({
      query: (params) => ({
        url: '/symbolsById',
        params,
      }),
    }),
    getCTraderSymbols: builder.query<any, any>({
      query: (params) => ({
        url: '/symbols',
        params,
      }),
    }),
    CTraderPlaceOrder: builder.mutation<void, { symbolId: string; ctidTraderAccountId: string; lots: number; side: 'buy' | 'sell' }>({
      query: (body) => ({
        url: '/postOrder',
        method: 'POST',
        body,
      }),
    }),
    CTraderclosePosition: builder.mutation<void, { symbolId: string; ctidTraderAccountId: string }>({
      query: (body) => ({
        url: '/closePosition',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetCTraderDealsQuery,
  useCandlesQuery,
  useGetCTraderSymbolsQuery,
  useAuthAuthQuery,
  // useGetCTraderSymbolsByIdQuery,
  useCashflowQuery,
  useSummaryQuery,
  useGetCTraderPositionPnLQuery,
  useAuthCodeQuery,
  useGetCTraderPositionsQuery,
  useSelectAccountQuery,
  useCTraderclosePositionMutation,
  useCTraderPlaceOrderMutation,
} = ctraderApi;
