import { Subject } from 'rxjs';
import { EventEmitter } from './event-emitter';

export type BaseEventTypes = 'message' | 'error' | 'connect' | 'disconnect' | 'subscribe';

export type SubscriptionManagerEventTypes = BaseEventTypes | 'candles' | 'orders' | 'trades' | 'account' | 'orderbook' | 'positions';

export class SubscriptionManager {
  private subscriptions = new Set<string>(); // хранилище подписок
  subscribeSubjs = new Map<string, Subject<any>>([]);

  createOrUpdateSubj<T>(key: string) {
    let exist = this.subscribeSubjs.get(key);
    if (!exist) {
      exist = new Subject<T>();
      this.subscribeSubjs.set(key, exist);
    }
    return exist as Subject<T>;
  }

  protected removeSubj(key: string) {
    const subj = this.subscribeSubjs.get(key);
    if (!subj) {
      return;
    }
    subj.complete();
    this.subscribeSubjs.delete(key);
  }

  private readonly eventEmitter: EventEmitter = new EventEmitter();

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
    headers?: Record<string, string>;
  };

  constructor(options: { url?: string; name: string; pingRequest?: any; loginPromise?: any; headers?: Record<string, string> }) {
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
    // В браузере WebSocket API не поддерживает кастомные заголовки напрямую
    // Заголовки Host, Origin и User-Agent устанавливаются автоматически браузером
    // Однако, если сервер требует специфические значения, можно попробовать использовать опции
    // Для Node.js можно использовать библиотеку ws, которая поддерживает headers
    // В браузере мы просто создаем WebSocket - браузер автоматически установит нужные заголовки
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
      console.log(`SubscriptionManager.ws.onopen: websocket connected, subscriptions count:`, this.subscriptions.size);
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
    console.log(`SubscriptionManager.resubscribe: resubscribing to ${this.subscriptions.size} subscriptions`);
    this.subscriptions.forEach((subscription) => {
      try {
        const request = JSON.parse(subscription);
        console.log(`SubscriptionManager.resubscribe: resubscribing to`, request);
        this.subscribe(request, true); // force resubscribe
      } catch (error) {
        console.error(`SubscriptionManager.resubscribe: error parsing subscription`, subscription, error);
      }
    });
  }

  protected subscribe(request, force: boolean = false) {
    const requestKey = JSON.stringify(request);

    // Check if already subscribed to avoid duplicate subscriptions
    // But allow resubscribe when force=true (e.g., after reconnection)
    if (!force && this.subscriptions.has(requestKey)) {
      console.log(`SubscriptionManager: already subscribed to ${requestKey}, skipping`);
      return; // Already subscribed, skip
    }

    console.log(`SubscriptionManager.subscribe:`, { request, isConnected: this.isConnected, wsReadyState: this.ws?.readyState });
    
    if (this.isConnected && this.ws) {
      console.log(`SubscriptionManager: sending subscription request:`, requestKey);
      this.ws.send(requestKey);
    } else {
      console.warn(`SubscriptionManager: websocket not connected, subscription will be sent after connection. isConnected:`, this.isConnected, 'ws:', !!this.ws);
    }

    // Add to subscriptions set (Set prevents duplicates automatically)
    // This ensures subscription will be sent after reconnection via resubscribe()
    this.subscriptions.add(requestKey);

    this.eventEmitter.emit('subscribe', request);
  }

  protected unsubscribe(request) {
    const requestKey = JSON.stringify(request);

    // if (!this.subscriptions.has(requestKey)) {
    //   return;
    // }

    if (this.isConnected) {
      this.ws.send(requestKey);
    }

    // Удаляем из хранилища подписок; формирование payload делается на уровне конкретной биржи
    this.removeSubscription(request);
  }

  removeSubscription(request) {
    const requestKey = JSON.stringify(request);
    this.subscriptions.delete(requestKey);
  }

  getSubscriptions(): Set<string> {
    return new Set(this.subscriptions);
  }
}
