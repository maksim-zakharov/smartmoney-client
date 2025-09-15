import { configureStore, combineReducers, AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { api } from './api/api.ts';
import { alorApi } from './api/alor.api';
import { alorSlice } from './api/alor.slice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { tinkoffApi } from './api/tinkoff.api.ts';
import { ctraderApi } from './api/ctrader.api.ts';
import { mexcApi } from './api/mexc.api.ts';
import { alertsSlice } from './api/alerts.slice.ts';
import { bingxApi } from './api/bingx.api.ts';
import { gateApi } from './api/gate.api.ts';
import { bybitApi } from './api/bybit.api.ts';

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
      .concat(api.middleware) as any,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
export const useAppDispatch: () => ThunkDispatch<AppState, void, AnyAction> = () => useDispatch<AppDispatch>();
