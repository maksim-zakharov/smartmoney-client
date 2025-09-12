import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPositionLineAdapter } from '../assets/charting_library';

export interface Alert {
  ticker: string;
  price: number;
  condition: 'moreThen' | 'lessThen';
  trigger: 'once' | 'everyMinute';
  message?: string;
}

export class AlertsService {
  private alerts: Alert[] = [];

  private eventsMap = new Map<string, ((alert: Alert, action: 'add' | 'delete') => void)[]>();

  private twPositionLines: IPositionLineAdapter[] = [];

  constructor() {
    this.alerts = localStorage.getItem('alerts') ? JSON.parse(localStorage.getItem('alerts')) : [];
  }

  addPosition(position: IPositionLineAdapter) {
    this.twPositionLines.push(position);
  }

  deletePositionByAlert(alert: Alert) {
    const text = `${alert.ticker}, ${alert.condition === 'lessThen' ? 'Меньше' : 'Больше'} чем ${alert.price.toFixed(5)}`;
    const position = this.twPositionLines.find((p) => p.getPrice() === alert.price && p.getText() === text);
    this.twPositionLines = this.twPositionLines.filter((a) => a !== position);

    position?.remove();
  }

  addAlert(alert: Alert) {
    this.alerts.push(alert);

    this.eventsMap.get(alert.ticker.toUpperCase())?.forEach((callback) => callback(alert, 'add'));

    localStorage.setItem('alerts', JSON.stringify(this.alerts));
  }

  deleteAlert(alert: Alert) {
    this.alerts = this.alerts.filter((a) => JSON.stringify(a) !== JSON.stringify(alert));

    this.eventsMap.get(alert.ticker.toUpperCase())?.forEach((callback) => callback(alert, 'delete'));

    localStorage.setItem('alerts', JSON.stringify(this.alerts));
  }

  getAlertsByTicker(ticker: string) {
    return this.alerts.filter((a) => a.ticker === ticker.toUpperCase());
  }

  on(ticker: string, callback: (alert: Alert, action: 'add' | 'delete') => void) {
    let exist = this.eventsMap.get(ticker.toUpperCase());
    if (!exist) exist = [];
    exist.push(callback);
    this.eventsMap.set(ticker.toUpperCase(), exist);
  }
}

export const alertsService = new AlertsService();

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
      alertsService.addAlert(action.payload);
      // localStorage.setItem('alerts', JSON.stringify(state.alerts));
    },
    deleteAlert(state, action: PayloadAction<Alert>) {
      state.alerts = state.alerts.filter((a) => JSON.stringify(a) !== JSON.stringify(action.payload));
      alertsService.deleteAlert(action.payload);
      // localStorage.setItem('alerts', JSON.stringify(state.alerts));
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
