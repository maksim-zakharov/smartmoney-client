import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Alert {
  ticker: string;
  price: number;
  condition: 'moreThen' | 'lessThen';
  trigger: 'once' | 'everyMinute';
  message?: string;
}

const initialState: { alerts: Alert[] } = {
  alerts: localStorage.getItem('alerts') ? JSON.parse(localStorage.getItem('alerts')) : [],
};

export const alertsSlice = createSlice({
  name: 'alertsSlice',
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<Alert>) {
      state.alerts.push(action.payload);
      localStorage.setItem('alerts', JSON.stringify(state.alerts));
    },
  },
});

export const { addAlert } = alertsSlice.actions;
