
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { api } from "./api";

export const reducers = {
  [api.reducerPath]: api.reducer,
};

const reducer = combineReducers(reducers);

export const store = configureStore({
  reducer,
  devTools: false, // process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  })
    .concat(api.middleware) as any,
});