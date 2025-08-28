import { configureStore, combineReducers, AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { api } from './api/api.ts';
import { alorApi } from './api/alor.api';
import { alorSlice } from './api/alor.slice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { twelveApi } from './twelveApi.ts';
import { tinkoffApi } from './api/tinkoff.api.ts';
import { ctraderApi } from './api/ctrader.api.ts';
import { mexcApi } from './api/mexc.api.ts';

export const reducers = {
  [api.reducerPath]: api.reducer,
  [alorApi.reducerPath]: alorApi.reducer,
  [twelveApi.reducerPath]: twelveApi.reducer,
  [tinkoffApi.reducerPath]: tinkoffApi.reducer,
  [alorSlice.name]: alorSlice.reducer,
  [ctraderApi.reducerPath]: ctraderApi.reducer,
  [mexcApi.reducerPath]: mexcApi.reducer,
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
      .concat(twelveApi.middleware)
      .concat(tinkoffApi.middleware)
      .concat(ctraderApi.middleware)
      .concat(mexcApi.middleware)
      .concat(api.middleware) as any,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
export const useAppDispatch: () => ThunkDispatch<AppState, void, AnyAction> = () => useDispatch<AppDispatch>();
