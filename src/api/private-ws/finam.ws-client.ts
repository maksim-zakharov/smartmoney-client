import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { HistoryObject, Timeframe } from 'alor-api';
import { ResolutionString } from '../../assets/charting_library';

export class FinamWsClient {
  private ws: Socket | null = null; // Add to class

  private subscriptions = new Set<string>(); // хранилище подписок
  subscribeSubjs = new Map<string, Subject<any>>([]);
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private reconnectDecay = 500;
  private maxReconnectInterval = 5000;

  private isConnected: boolean = false;
  private reconnectAttempts = 0;

  constructor() {
    this.connect();
  }

  // Подключение к WebSocket
  private connect() {
    // this.public-ws = io(`http://localhost:3000/finam-ws`, {
    this.ws = io(`http://176.114.69.4:3000/finam-ws`, {
      transports: ['websocket'],
    });

    this.ws.on('connect', () => {
      console.log(`Finam WS connected`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Повторная подписка на все события
      this.resubscribe();
    });

    // Listen for updates
    const eventHandler = (data: { symbol: string; tf: string; candle: HistoryObject }) => {
      const key = `${data.symbol}_${data.tf}`;
      this.subscribeSubjs.get(key)?.next(data.candle);
    };
    this.ws.on('candle', eventHandler);

    this.ws.on('disconnect', () => {
      this.isConnected = false;
      console.log(`CTrader WS disconnected`);
      this.attemptReconnect();
    });
  }

  // Попытка переподключения
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts), this.maxReconnectInterval);

    console.log(`Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // Повторная подписка на все события
  private resubscribe() {
    this.subscriptions.forEach((subscription) => {
      const request = JSON.parse(subscription);
      this.subscribe(request);
      console.log(`Resubscribed to ${JSON.stringify(request)}`);
    });
  }

  protected subscribe(request) {
    if (this.isConnected) {
      this.ws.emit('subscribe_candle', request);
    }
    this.subscriptions.add(JSON.stringify(request));
  }

  subscribeCandles(symbol: string, resolution: ResolutionString) {
    const subj = new Subject();

    const tf = this.parseTimeframe(resolution) as Timeframe; // Ensure it matches Timeframe enum
    const key = `${symbol}_${tf}`;

    this.subscribeSubjs.set(key, subj);

    this.subscribe({ symbol, tf });

    return subj;
  }

  private parseTimeframe(resolution: ResolutionString): string {
    const code = resolution.slice(-1);
    if (['D', 'W', 'M', 'Y'].includes(code)) {
      return resolution;
    }

    const count = Number(resolution.substring(0, resolution.length - 1));

    if (code === 'S') {
      return count.toString();
    }

    if (code === 'H') {
      return (count * 60 * 60).toString();
    }

    // resolution contains minutes
    return (Number(resolution) * 60).toString();
  }
}
