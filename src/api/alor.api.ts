import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  Currency,
  EquityDynamicsResponse,
  GetOperationsResponse,
  MoneyMove,
  PublicOfferingByIdRequest,
  PublicOfferingByIdResponse,
  PublicOfferingRequest,
  PublicOfferingResponse,
  UserInfoResponse,
} from 'alor-api/dist/services/ClientInfoService/ClientInfoService';
import { AlorApi, DevHistoryParams, History as AHistory, Securities, Security, Summary } from 'alor-api';
import {
  DevGetAllPositionsParams,
  DevSecuritiesSearchParams,
  ExchangePortfolioSummaryParams,
  Positions,
} from 'alor-api/dist/models/models';
import { Mutex, MutexInterface } from 'async-mutex';
import { acquire, logout } from './alor.slice';

export const mutex = new Mutex();

const recurcive =
  (selector: (api: AlorApi) => any, paramsCallback = (params) => params) =>
  async (args: any[] | void, _api) => {
    const api = _api.getState()['alorSlice'].api as AlorApi;
    const dispatch = _api.dispatch;
    const { lk, token } = _api.getState()['alorSlice'].settings;
    let release: MutexInterface.Releaser;

    await mutex.waitForUnlock();

    if (!api) {
      // return {} as any;
      // release = await mutex.acquire();
      // dispatch(acquire(release));
      // await mutex.waitForUnlock();
      return recurcive(selector, paramsCallback)(args, _api);
    }

    try {
      const params = paramsCallback ? paramsCallback(args) : args;
      if (Array.isArray(params)) {
        // @ts-ignore
        return selector(api)
          .apply(api, params)
          .then((data) => ({ data }));
      }
      // @ts-ignore
      return selector(api)
        .call(api, params)
        .then((data) => ({ data }));
    } catch (error: any) {
      if (error.message === 'Необходимо авторизоваться') {
        if (!mutex.isLocked()) {
          const release = await mutex.acquire();
          // dispatch(acquire(release));
          try {
            if (lk) {
              const { AccessToken } = await api.auth.refreshToken({ refreshToken: token, type: 'lk' });
              api.accessToken = AccessToken;
              api.http.defaults.headers.common['Authorization'] = 'Bearer ' + AccessToken;
            } else {
              await api.refresh();
            }
            dispatch(acquire(release));
            return recurcive(selector, paramsCallback)(args, _api);
          } catch (err: any) {
            if (err.status === 403) {
              dispatch(logout());
            }
          }
        }
      } else {
        await mutex.waitForUnlock();
        return recurcive(selector, paramsCallback)(args, _api);
      }
      return { error } as any;
    }
  };

export interface NewsRequest {
  limit: number;
  offset: number;
  sortDesc?: 'true';
  symbols?: string;
}

export interface News {
  id: number;
  sourceId: string;
  header: string;
  publishDate: Date;
  newsType: number;
  content: string;
  countryCodes: string[];
  rubricCodes: string[];
  symbols: string[];
  mt: null;
}

export interface SecurityDescription {
  symbol: string;
  description: string;
  sector: string;
  isin: string;
  baseCurrency: string;
  securityType: string;
  lotsize: number;
  shortName: string;
  cfiCode: string;
}

export interface SecurityDividend {
  recordDate: Date;
  dividendPerShare: number;
  dividendYield: number;
  currency: Currency;
  recommendDividendPerShare: number;
  listDate: Date;
  declaredPayDateNominee: Date | null;
  exDividendDate: Date | null;
  fixDate: Date | null;
}

export interface BCSDividendsResponse {
  data: Datum[];
  has_more: boolean;
  last_value: number;
  total: number;
}

export interface Datum {
  checked: boolean;
  history_dates: Date[];
  history_values: number[];
  history_yields: Array<number | null>;
  previous_dividends: PreviousDividend[];
  id: number;
  isin_code: string;
  company_name: string;
  short_name: string;
  logo_url: string;
  logo_primary_color: null;
  last_buy_day: Date;
  closing_date: Date;
  dividend_value: number;
  dividend_currency_code: string;
  quote_currency_code: string;
  close_price: number;
  yield: number;
  secure_code: string;
  class_code: string;
  year: number;
  actual: boolean;
  foreign_stock: boolean;
  ticker_id: number;
  sector: number;
  sectorName: null;
  period_length: null;
  period_number: number;
  period_year: null;
}

export interface PreviousDividend {
  id: number;
  company_name: string;
  last_buy_day: Date | null;
  closing_date: Date;
  dividend_value: number;
  close_price: number;
  yield: number | null;
}

const getDescription =
  (api: AlorApi) =>
  ({ ticker }: { ticker: string }) =>
    api.http
      .get(`/instruments/v1/${ticker}/description`, {
        baseURL: 'https://api.alor.ru',
      })
      .then((r) => r.data);
// fetch("https://api.bcs.ru/divcalendar/v1/dividends?actual=1&emitent=RU0009084396&limit=50&order=2&sorting=0", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
//     "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"macOS\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "cross-site",
//     "ticket": "",
//     "token": ""
//   },
//   "referrer": "https://bcs-express.ru/",
//   "referrerPolicy": "strict-origin-when-cross-origin",
//   "body": null,
//   "method": "GET",
//   "mode": "cors",
//   "credentials": "omit"
// });
const getBCSDividends = (api: AlorApi) => (params: { actual: number; emitent: string; limit: number; order: number; sorting: number }) =>
  api.http
    .get(`/divcalendar/v1/dividends`, {
      baseURL: 'https://api.bcs.ru',
      params,
    })
    .then((r) => r.data);

const getDividends =
  (api: AlorApi) =>
  ({ ticker }: { ticker: string }) =>
    api.http
      .get(`/instruments/v1/${ticker}/stock/dividends`, {
        baseURL: 'https://api.alor.ru',
      })
      .then((r) => (Array.isArray(r.data) ? r.data : []));

const getSecurityDetails =
  (api: AlorApi) =>
  ({ ticker }: { ticker: string }) =>
    api.http
      .get(`/md/v2/Securities/MOEX/${ticker}?instrumentGroup=RFUD`, {
        baseURL: 'https://api.alor.ru',
      })
      .then((r) => r.data);

const getNews = (api: AlorApi) => (params: NewsRequest) =>
  api.http
    .get(`/news/news`, {
      params,
      baseURL: 'https://api.alor.ru',
    })
    .then((r) => r.data);

export const alorApi = createApi({
  reducerPath: 'alor.api',
  tagTypes: ['User'],
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    createOperation: builder.mutation<
      {
        validations: [];
        formErrors: null;
        data: {};
        operationId: number;
        errorMessage: null;
        success: true;
      },
      {
        agreementNumber: string;
        recipient: string;
        account: string;
        currency: Currency;
        subportfolioFrom: 'MOEX';
        all: boolean;
        bic: string;
        loroAccount: string;
        bankName: string;
        settlementAccount: string;
        agree: boolean;
        amount: number;
      }
    >({
      queryFn: recurcive(
        (api) => api.clientInfo.createOperation,
        ({ agreementNumber, ...params }) => [agreementNumber, params],
      ),
    } as any),
    signOperation: builder.mutation<{ validations: []; errorMessage: null; success: true }, any>({
      queryFn: recurcive((api) => api.clientInfo.signOperation),
    }),
    getOperationCode: builder.mutation<{ errorMessage: null; success: true }, any>({
      queryFn: recurcive((api) => api.clientInfo.getOperationCode),
    }),
    getSecurities: builder.mutation<Securities, DevSecuritiesSearchParams>({
      queryFn: recurcive((api) => api.instruments.getSecurities),
    } as any),
    getUserInfo: builder.query<UserInfoResponse, unknown>({
      queryFn: recurcive((api) => api.clientInfo.getUserInfo),
    }),
    getOperations: builder.query<GetOperationsResponse[], string>({
      queryFn: recurcive((api) => api.clientInfo.getOperations),
    } as any),
    getNews: builder.query<News[], NewsRequest>({
      queryFn: recurcive((api) => getNews(api)),
    } as any),
    getDividends: builder.query<SecurityDividend[], { ticker: string }>({
      queryFn: recurcive((api) => getDividends(api)),
    } as any),
    getBCSDividends: builder.query<
      BCSDividendsResponse,
      {
        actual: number;
        emitent?: string;
        limit: number;
        order: number;
        sorting: number;
      }
    >({
      queryFn: recurcive((api) => getBCSDividends(api)),
    } as any),
    getDescription: builder.query<SecurityDescription, { ticker: string }>({
      queryFn: recurcive((api) => getDescription(api)),
    } as any),
    getMoneyMoves: builder.query<
      MoneyMove[],
      {
        agreementNumber: string;
        dateFrom: string;
        dateTo: string;
      }
    >({
      queryFn: recurcive(
        (api) => api.clientInfo.getMoneyMoves,
        ({ agreementNumber, ...params }) => [agreementNumber, params],
      ),
    } as any),
    getSummary: builder.query<Summary, ExchangePortfolioSummaryParams>({
      queryFn: recurcive((api) => api.clientInfo.getSummary),
    } as any),
    getSecurityByExchangeAndSymbol: builder.query<Security, { symbol: string; exchange: string }>({
      queryFn: recurcive((api) => api.instruments.getSecurityByExchangeAndSymbol),
    } as any),
    getSecurityDetails: builder.query<any, { ticker: string }>({
      queryFn: recurcive((api) => getSecurityDetails(api)),
    } as any),
    getPublicOffering: builder.query<PublicOfferingResponse, PublicOfferingRequest>({
      queryFn: recurcive((api) => api.clientInfo.getPublicOffering),
    } as any),
    getPublicOfferingById: builder.query<PublicOfferingByIdResponse, PublicOfferingByIdRequest>({
      queryFn: recurcive((api) => api.clientInfo.getPublicOfferingById),
    } as any),
    getHistory: builder.query<AHistory, DevHistoryParams>({
      queryFn: recurcive((api) => api.instruments.getHistory),
    } as any),
    getEquityDynamics: builder.query<
      EquityDynamicsResponse,
      {
        startDate: string;
        endDate: string;
        portfolio: string;
        agreementNumber: string;
      }
    >({
      queryFn: recurcive((api) => api.clientInfo.getEquityDynamics),
    } as any),
    getPositions: builder.query<Positions, DevGetAllPositionsParams>({
      queryFn: recurcive((api) => api.clientInfo.getPositions),
    } as any),
  }),
});

export const {
  useGetUserInfoQuery,
  useGetPublicOfferingByIdQuery,
  useGetPublicOfferingQuery,
  useGetBCSDividendsQuery,
  useGetSecurityByExchangeAndSymbolQuery,
  useGetHistoryQuery,
  useGetDescriptionQuery,
  useGetNewsQuery,
  useGetDividendsQuery,
  useGetSecurityDetailsQuery,
  useGetSecuritiesMutation,
  useSignOperationMutation,
  useGetOperationCodeMutation,
  useCreateOperationMutation,
  useGetEquityDynamicsQuery,
  useGetMoneyMovesQuery,
  useGetOperationsQuery,
  useGetPositionsQuery,
  useGetSummaryQuery,
} = alorApi;
