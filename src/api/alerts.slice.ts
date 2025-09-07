import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Alert {
  ticker: string;
  price: number;
  condition: 'moreThen' | 'lessThen';
  trigger: 'once' | 'everyMinute';
  message?: string;
}

const initialState: { alerts: Alert[]; alertConfig: any } = {
  alerts: localStorage.getItem('alerts') ? JSON.parse(localStorage.getItem('alerts')) : [],
  alertConfig: undefined,
};

export const alertsSlice = createSlice({
  name: 'alertsSlice',
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<Alert>) {
      state.alerts.push(action.payload);
      localStorage.setItem('alerts', JSON.stringify(state.alerts));
    },
    deleteAlert(state, action: PayloadAction<Alert>) {
      state.alerts = state.alerts.filter((a) => JSON.stringify(a) !== JSON.stringify(action.payload));
      localStorage.setItem('alerts', JSON.stringify(state.alerts));
    },
    openAlertDialog(state, action: PayloadAction<Partial<Alert>>) {
      state.alertConfig = action.payload;
    },
    clearAlertDialog(state, action: PayloadAction<void>) {
      state.alertConfig = undefined;
    },
  },
});

export const { addAlert, clearAlertDialog, openAlertDialog, deleteAlert } = alertsSlice.actions;
