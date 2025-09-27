import { configureStore, combineReducers, AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { api } from './api/api';
import { alorApi } from './api/alor.api';
import { alorSlice } from './api/alor.slice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { tinkoffApi } from './api/tinkoff.api';
import { ctraderApi } from './api/ctrader.api';
import { mexcApi } from './api/mexc.api';
import { alertsSlice } from './api/alerts.slice';
import { bingxApi } from './api/bingx.api';
import { gateApi } from './api/gate.api';
import { bybitApi } from './api/bybit.api';
import { binanceApi } from './api/binance.api';
import { htxApi } from './api/htx.api';
import { kucoinApi } from './api/kucoin.api';
import { coinmarketcapApi } from './api/coinmarketcap.api';
import { bitgetApi } from './api/bitget.api';
import { bitstampApi } from './api/bitstamp.api';

export const reducers = {
  [api.reducerPath]: api.reducer,
  [alorApi.reducerPath]: alorApi.reducer,
  [tinkoffApi.reducerPath]: tinkoffApi.reducer,
  [alorSlice.name]: alorSlice.reducer,
  [alertsSlice.name]: alertsSlice.reducer,
  [ctraderApi.reducerPath]: ctraderApi.reducer,
  [mexcApi.reducerPath]: mexcApi.reducer,
  [bingxApi.reducerPath]: bingxApi.reducer,
  [gateApi.reducerPath]: gateApi.reducer,
  [bybitApi.reducerPath]: bybitApi.reducer,
  [binanceApi.reducerPath]: binanceApi.reducer,
  [htxApi.reducerPath]: htxApi.reducer,
  [kucoinApi.reducerPath]: kucoinApi.reducer,
  [coinmarketcapApi.reducerPath]: coinmarketcapApi.reducer,
  [bitgetApi.reducerPath]: bitgetApi.reducer,
  [bitstampApi.reducerPath]: bitstampApi.reducer,
};

const reducer = combineReducers(reducers);

export const store = configureStore({
  reducer,
  devTools: false, // process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .concat(alorApi.middleware)
      .concat(tinkoffApi.middleware)
      .concat(ctraderApi.middleware)
      .concat(mexcApi.middleware)
      .concat(bingxApi.middleware)
      .concat(gateApi.middleware)
      .concat(bybitApi.middleware)
      .concat(binanceApi.middleware)
      .concat(htxApi.middleware)
      .concat(kucoinApi.middleware)
      .concat(coinmarketcapApi.middleware)
      .concat(bitgetApi.middleware)
      .concat(bitstampApi.middleware)
      .concat(api.middleware) as any,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
export const useAppDispatch: () => ThunkDispatch<AppState, void, AnyAction> = () => useDispatch<AppDispatch>();
