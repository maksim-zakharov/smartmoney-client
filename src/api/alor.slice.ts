import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlorApi, AuthEndpoint, Endpoint, Position, WssEndpoint, WssEndpointBeta } from 'alor-api';
import { alorApi } from './alor.api';
import { GetOperationsResponse, Status, UserInfoResponse } from 'alor-api/dist/services/ClientInfoService/ClientInfoService';
import { io, Socket } from 'socket.io-client';
import { tinkoffApi } from './tinkoff.api';
import { ctraderApi } from './ctrader.api';
import { DataService } from './common/data.service.ts';
import { mexcApi } from './mexc.api';
import { Positions } from 'alor-api/dist/models/models';
import { bybitApi } from './bybit.api.ts';
import { gateApi } from './gate.api.ts';
import { bingxApi } from './bingx.api.ts';
import { store } from '../store.ts';
import { bitgetApi } from './bitget.api.ts';
import { okxApi } from './okx.api.ts';

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

  filters: localStorage.getItem('filters') ? JSON.parse(localStorage.getItem('filters')) : {},

  agreementsMap: {},
  activeOperations: [],
  lastWithdrawals: [],
  alorPositions: [],

  bybitWallets: [],

  gateFAccounts: undefined,
  bingxBalance: [],

  release: undefined,
  apiAuth: false,
  cTraderAccounts: [],
  cTraderSummary: undefined,
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

  filters: any;

  alorPositions: Positions;
  agreementsMap: any;
  activeOperations: GetOperationsResponse[];
  lastWithdrawals: number[];

  bybitWallets: any[];

  gateSAccounts?: any;
  gateFAccounts?: any;

  okxAccounts?: any;

  bitgetFAccounts?: any;

  bingxBalance: any[];

  cTraderAuth?: AppsTokenResponse;
  cTraderAccount?: any;
  cTraderAccounts?: any;
  cTraderPositions?: any;
  cTraderPositionPnL?: any;
  cTraderSymbols?: any;
  cTraderSummary?: any;

  mexcSAccount?: any;
  mexcFAccount?: any;
  MEXCPositions?: any;

  tinkoffAccounts?: any;
  tinkoffPortfolio?: any;
  tinkoffOrders?: any;
  tToken?: string;

  favoritePairs?: any[];
};

const dataHandler = (position: Position) => {
  store.dispatch(updatePosition(position)); // Dispatch instead of direct mutation
};

export const alorSlice = createSlice({
  name: 'alorSlice',
  initialState,
  reducers: {
    updatePosition: (state, action: PayloadAction<Position>) => {
      const position = action.payload;
      // const updatedPositions = state.alorPositions.filter((p) => p.symbol !== position.symbol);
      //
      // if (position.qty && position.qty !== 0) {
      //   updatedPositions.push(position);
      // }
      //
      // state.alorPositions = updatedPositions;

      // const index = state.alorPositions.findIndex((p) => p.symbol === position.symbol);
      // if (position.qty === 0) {
      //   // Если qty равно 0, удаляем позицию
      //   if (index !== -1) {
      //     state.alorPositions.splice(index, 1);
      //   }
      // } else {
      //   if (index !== -1) {
      //     // Обновляем существующую позицию
      //     state.alorPositions[index] = position;
      //   } else {
      //     // Добавляем новую позицию
      //     state.alorPositions.push(position);
      //   }
      // }

      // Создаем новый массив вместо Map
      // const updatedPositions = state.alorPositions.filter((p) => p.symbol !== position.symbol);
      //
      // if (position.qty && position.qty !== 0) {
      //   updatedPositions.push(position);
      // }
      //
      // state.alorPositions = updatedPositions;

      const symbolPositionsMap = new Map<string, Position>(Array.from(state.alorPositions).map((p) => [p.symbol, p]));
      if (!position.qty) {
        symbolPositionsMap.delete(position.symbol);
      } else {
        symbolPositionsMap.set(position.symbol, position);
      }
      state.alorPositions = Array.from(symbolPositionsMap).map(([key, value]) => value);
    },
    initApi(state, action: PayloadAction<{ token: string; accessToken?: string; type?: 'lk' | 'dev' }>) {
      // Если API уже создан, не пересоздаем его
      if (!state.api) {
        const _api = new AlorApi({
          token: action.payload.token,
          accessToken: action.payload.accessToken,
          authEndpoint: AuthEndpoint.PROD,
          endpoint: Endpoint.PROD,
          wssEndpoint: WssEndpoint.PROD,
          wssEndpointBeta: WssEndpointBeta.PROD,
          refreshType: action.payload.type,
        });
        state.api = _api;

        state.dataService = new DataService(_api);

        if (localStorage.getItem('aPortfolio')) {
          _api.refresh().then((r) =>
            _api.subscriptions.positions(
              {
                exchange: 'MOEX',
                format: 'Simple',
                portfolio: localStorage.getItem('aPortfolio'),
              },
              dataHandler,
            ),
          );
        }
      }

      state.release?.();
    },
    addPair(state, action: PayloadAction<any>) {
      if (!state.favoritePairs) {
        state.favoritePairs = [action.payload];
      } else {
        state.favoritePairs.push(action.payload);
      }
      localStorage.setItem('favoritePairs', JSON.stringify(state.favoritePairs));
    },
    updatePair(state, action: PayloadAction<{ ticker: string; pair: any }>) {
      state.favoritePairs = state.favoritePairs.map((p) => {
        const ticker = [p.first, p.second, p.third].filter(Boolean).join('/');
        return ticker.toUpperCase() == action.payload.ticker.toUpperCase() ? action.payload.pair : p;
      });
      localStorage.setItem('favoritePairs', JSON.stringify(state.favoritePairs));
    },
    deletePair(state, action: PayloadAction<{ ticker: string }>) {
      state.favoritePairs = state.favoritePairs.filter((p) => {
        const ticker = [p.first, p.second, p.third].filter(Boolean).join('/');
        return ticker !== action.payload.ticker;
      });
      localStorage.setItem('favoritePairs', JSON.stringify(state.favoritePairs));
    },
    setTiToken(state, action: PayloadAction<string>) {
      state.tToken = action.payload;
    },
    setFilter(state, action: PayloadAction<{ key: string; value: any }>) {
      state.filters[action.payload.key] = action.payload.value;
      localStorage.setItem('filters', JSON.stringify(state.filters));
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
    builder.addMatcher(ctraderApi.endpoints.summary.matchFulfilled, (state, { payload }) => {
      state.cTraderSummary = payload;
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
    builder.addMatcher(ctraderApi.endpoints.selectAccount.matchRejected, (state, { payload }) => {
      if (payload.status === 401) {
        state.cTraderAuth = undefined;
        localStorage.removeItem('cTraderAuth');
      }
    });

    builder.addMatcher(alorApi.endpoints.getPositions.matchFulfilled, (state, { payload }) => {
      state.alorPositions = payload;
    });
    builder.addMatcher(bybitApi.endpoints.getWalletBalance.matchFulfilled, (state, { payload }) => {
      state.bybitWallets = payload;
    });
    builder.addMatcher(okxApi.endpoints.getOKXBalance.matchFulfilled, (state, { payload }) => {
      state.okxAccounts = payload;
    });
    builder.addMatcher(gateApi.endpoints.getGateFAccounts.matchFulfilled, (state, { payload }) => {
      state.gateFAccounts = payload;
    });
    builder.addMatcher(gateApi.endpoints.getGateSAccounts.matchFulfilled, (state, { payload }) => {
      state.gateSAccounts = payload;
    });
    builder.addMatcher(mexcApi.endpoints.getMEXCSpotAccount.matchFulfilled, (state, { payload }) => {
      state.mexcSAccount = payload;
    });
    builder.addMatcher(mexcApi.endpoints.getMEXCBalance.matchFulfilled, (state, { payload }) => {
      state.mexcFAccount = payload;
    });
    builder.addMatcher(bitgetApi.endpoints.getBitgetAccounts.matchFulfilled, (state, { payload }) => {
      state.bitgetFAccounts = payload.data;
    });
    builder.addMatcher(bingxApi.endpoints.getBalance.matchFulfilled, (state, { payload }) => {
      if (Array.isArray(payload)) state.bingxBalance = payload;
    });
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

export const {
  setFilter,
  deletePair,
  addPair,
  updatePair,
  selectCTraderAccount,
  initApi,
  setTiToken,
  updateDarkColors,
  acquire,
  setSettings,
  logout,
  updatePosition,
} = alorSlice.actions;
