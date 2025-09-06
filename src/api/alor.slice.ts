import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlorApi, Endpoint, WssEndpoint, WssEndpointBeta } from 'alor-api';
import { alorApi } from './alor.api';
import { GetOperationsResponse, Status, UserInfoResponse } from 'alor-api/dist/services/ClientInfoService/ClientInfoService';
import { io, Socket } from 'socket.io-client';
import { tinkoffApi } from './tinkoff.api';
import { ctraderApi } from './ctrader.api';
import { DataService } from './data.service';
import { mexcApi } from './mexc.api';

type Settings = {
  token: string;
  portfolio: string;
  commissionType: string;
  agreement: string;
  lk?: boolean;
};

export interface AppsTokenResponse {
  accessToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  refreshToken: string;
  errorCode: null;
  description: null;
}

const url = 'http://176.114.69.4:3000';
// const url = 'http://localhost:3000';

const ctraderWs = io(`${url}/ctrader-ws`, {
  transports: ['websocket'],
});
ctraderWs.on('connect', () => console.log('WS connected'));
ctraderWs.on('disconnect', () => console.log('WS disconnected'));

const initialState = {
  api: undefined,
  dataService: undefined,
  agreementsMap: {},
  activeOperations: [],
  lastWithdrawals: [],
  release: undefined,
  apiAuth: false,
  cTraderAccounts: [],
  ws: ctraderWs,
  darkColors: {
    backgroundColor: 'rgb(30,44,57)',
    color: 'rgb(166,189,213)',
    borderColor: 'rgba(44,60,75, 0.6)',
  },

  favoritePairs: localStorage.getItem('favoritePairs') ? JSON.parse(localStorage.getItem('favoritePairs')) : undefined,

  userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : undefined,

  cTraderAuth: localStorage.getItem('cTraderAuth') ? JSON.parse(localStorage.getItem('cTraderAuth')) : undefined,
  cTraderAccount: undefined,

  settings: JSON.parse(localStorage.getItem('settings') || '{}'),

  tToken: localStorage.getItem('tiToken'),
} as {
  darkColors: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  ws: Socket;
  api: undefined | AlorApi;
  dataService?: DataService;
  apiAuth: boolean;
  userInfo: UserInfoResponse;
  settings: Settings;
  agreementsMap: any;
  activeOperations: GetOperationsResponse[];
  lastWithdrawals: number[];

  cTraderAuth?: AppsTokenResponse;
  cTraderAccount?: any;
  cTraderAccounts?: any;
  cTraderPositions?: any;
  cTraderPositionPnL?: any;
  cTraderSymbols?: any;

  MEXCPositions?: any;

  tinkoffAccounts?: any;
  tinkoffPortfolio?: any;
  tinkoffOrders?: any;
  tToken?: string;

  favoritePairs?: any[];
};

export const alorSlice = createSlice({
  name: 'alorSlice',
  initialState,
  reducers: {
    initApi(state, action: PayloadAction<{ token: string; accessToken?: string; type?: 'lk' | 'dev' }>) {
      // Если API уже создан, не пересоздаем его
      if (!state.api) {
        const _api = new AlorApi({
          token: action.payload.token,
          accessToken: action.payload.accessToken,
          endpoint: Endpoint.PROD,
          wssEndpoint: WssEndpoint.PROD,
          wssEndpointBeta: WssEndpointBeta.PROD,
          refreshType: action.payload.type,
        });
        state.api = _api;

        state.dataService = new DataService(_api);
      }

      state.release?.();
    },
    updatePairs(state, action: PayloadAction<any[]>) {
      if (!state.favoritePairs) {
        state.favoritePairs = [action.payload];
      } else {
        state.favoritePairs.push(action.payload);
      }
      localStorage.setItem('favoritePairs', JSON.stringify(state.favoritePairs));
    },
    setTiToken(state, action: PayloadAction<string>) {
      state.tToken = action.payload;
    },
    selectCTraderAccount(state, action: PayloadAction<number>) {
      state.cTraderAccount = state.cTraderAccounts.find((c) => c.ctidTraderAccountId.toString() === action.payload.toString());
      localStorage.setItem('ctidTraderAccountId', action.payload.toString());
    },
    updateDarkColors(state, action: PayloadAction<typeof initialState.darkColors>) {
      state.darkColors = { ...state.darkColors, ...action.payload };
    },
    setSettings(state, action: PayloadAction<Partial<Settings>>) {
      state.settings = { ...state.settings, ...action.payload };
      localStorage.setItem('settings', JSON.stringify(state.settings));
    },
    acquire(state, action: PayloadAction<any>) {
      state.release = action.payload;
      if (state.api) {
        state.release?.();
        state.apiAuth = true;
      }
    },
    logout(state) {
      state.userInfo = undefined;
      state.settings = { ...state.settings, portfolio: undefined, token: undefined, agreement: undefined, lk: undefined };
      state.api = undefined;

      localStorage.setItem('settings', JSON.stringify(state.settings));
      localStorage.removeItem('userInfo');
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(tinkoffApi.endpoints.getTinkoffAccounts.matchFulfilled, (state, { payload }) => {
      state.tinkoffAccounts = payload;
    });
    builder.addMatcher(tinkoffApi.endpoints.getTinkoffPortfolio.matchFulfilled, (state, { payload }) => {
      state.tinkoffPortfolio = payload;
    });
    builder.addMatcher(tinkoffApi.endpoints.getTinkoffOrders.matchFulfilled, (state, { payload }) => {
      state.tinkoffOrders = payload;
    });
    builder.addMatcher(ctraderApi.endpoints.getCTraderPositions.matchFulfilled, (state, { payload }) => {
      state.cTraderPositions = payload;
    });
    builder.addMatcher(mexcApi.endpoints.getMEXCPositions.matchFulfilled, (state, { payload }) => {
      state.MEXCPositions = payload;
    });
    builder.addMatcher(ctraderApi.endpoints.getCTraderPositionPnL.matchFulfilled, (state, { payload }) => {
      state.cTraderPositionPnL = payload;
    });
    builder.addMatcher(ctraderApi.endpoints.getCTraderSymbols.matchFulfilled, (state, { payload }) => {
      state.cTraderSymbols = payload;
    });
    builder.addMatcher(ctraderApi.endpoints.authCode.matchFulfilled, (state, { payload }) => {
      state.cTraderAuth = payload;
      if (state.cTraderAuth.accessToken) {
        localStorage.setItem('cTraderAuth', JSON.stringify(state.cTraderAuth));
      }
    });
    builder.addMatcher(ctraderApi.endpoints.selectAccount.matchFulfilled, (state, { payload }) => {
      state.cTraderAccounts = payload;
      const selectedAccountId = localStorage.getItem('ctidTraderAccountId');
      state.cTraderAccount = state.cTraderAccounts.find((c) => c.ctidTraderAccountId.toString() === selectedAccountId) || payload[0];
    });
    // builder.addMatcher(goApi.endpoints.getAdGroup.matchPending, _resetAdGroupError);
    builder.addMatcher(alorApi.endpoints.getOperations.matchFulfilled, (state, { payload }) => {
      state.activeOperations = payload ? payload.filter((o) => ![Status.Overdue, Status.Refused].includes(o.status)) : [];
      state.lastWithdrawals = Array.from(new Set(state.activeOperations.map((o) => o.data.amount)))
        .sort((a, b) => b - a)
        .slice(0, 5)
        .filter((a) => a);
    });
    builder.addMatcher(alorApi.endpoints.getUserInfo.matchFulfilled, (state, { payload }) => {
      state.userInfo = payload;
      localStorage.setItem('userInfo', JSON.stringify(payload));
      state.agreementsMap =
        payload?.agreements?.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.agreementNumber]: curr,
          }),
          {},
        ) || {};
    });
  },
});

export const { updatePairs, selectCTraderAccount, initApi, setTiToken, updateDarkColors, acquire, setSettings, logout } = alorSlice.actions;
