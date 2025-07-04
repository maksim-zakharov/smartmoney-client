import { configureStore, combineReducers, AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { api } from './api';
import { alorApi } from './api/alor.api';
import { alorSlice } from './api/alor.slice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const reducers = {
  [api.reducerPath]: api.reducer,
  [alorApi.reducerPath]: alorApi.reducer,
  [alorSlice.name]: alorSlice.reducer,
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
      .concat(api.middleware) as any,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
export const useAppDispatch: () => ThunkDispatch<AppState, void, AnyAction> = () => useDispatch<AppDispatch>();
