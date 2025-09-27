import EventEmitter from 'events';
import { Subject } from 'rxjs';
import { WebSocket } from 'ws';

export type BaseEventTypes = 'message' | 'error' | 'connect' | 'disconnect' | 'subscribe';

export type SubscriptionManagerEventTypes = BaseEventTypes | 'candles' | 'orders' | 'trades' | 'account' | 'orderbook';

export class SubscriptionManager {
  private subscriptions = new Set<string>(); // хранилище подписок
  subscribeSubjs = new Map<string, Subject<any>>([]);

  private readonly eventEmitter: EventEmitter<any> = new EventEmitter<any>();

  protected ws: WebSocket;

  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private reconnectDecay = 500;
  private maxReconnectInterval = 5000;

  private isConnected: boolean = false;

  private reconnectAttempts = 0;

  private _options: {
    url?: string;
    name: string;
    loginPromise?: () => Promise<any>;
    pingRequest?: () => any;
  };

  constructor(options: { url?: string; name: string; pingRequest?: any; loginPromise?: any }) {
    this._options = options;

    if (this._options.loginPromise) {
      this._options.loginPromise().then((url) => this.connect(url));
    } else this.connect(this._options.url);
  }

  on(type: SubscriptionManagerEventTypes, callback: any) {
    return this.eventEmitter.on(type, callback);
  }

  protected emit(type: SubscriptionManagerEventTypes, value: any) {
    return this.eventEmitter.emit(type, value);
  }

  // Подключение к WebSocket
  private connect(url: string) {
    this.ws = new WebSocket(url);

    let spotInterval;

    const pingPong = () => {
      if (!this._options.pingRequest) return;
      if (spotInterval) clearInterval(spotInterval);

      spotInterval = setInterval(() => {
        const pingRequest = this._options.pingRequest();
        this.ws.send(JSON.stringify(pingRequest));
      }, 10000);
    };

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Повторная подписка на все события
      this.resubscribe();
      pingPong();

      this.eventEmitter.emit('connect', true);
    };

    this.ws.onmessage = (ev) => {
      this.eventEmitter.emit('message', ev);
    };

    this.ws.onerror = (error) => {
      this.eventEmitter.emit('error', error);
    };

    this.ws.onclose = () => {
      if (spotInterval) clearInterval(spotInterval);
      this.isConnected = false;
      this.attemptReconnect();

      this.eventEmitter.emit('disconnect', true);
    };
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
      if (this._options.loginPromise) {
        this._options.loginPromise().then((url) => this.connect(url));
      } else this.connect(this._options.url);
    }, delay);
  }

  // Повторная подписка на все события
  private resubscribe() {
    this.subscriptions.forEach((subscription) => {
      const request = JSON.parse(subscription);
      this.subscribe(request);
    });
  }

  protected subscribe(request) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify(request));
    }
    this.subscriptions.add(JSON.stringify(request));

    this.eventEmitter.emit('subscribe', request);
  }
}
