import { Subject } from 'rxjs';

export class SubscriptionManager {
  protected ws: WebSocket;

  private subscriptions = new Set<string>(); // хранилище подписок
  subscribeSubjs = new Map<string, Subject<any>>([]);
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private reconnectDecay = 500;
  private maxReconnectInterval = 5000;

  private isConnected: boolean = false;
  private reconnectAttempts = 0;

  private _options: {
    url: string;
    name: string;
    pingObj: any;
    onMessage?: (ev) => void;
  };

  constructor(options: { url: string; name: string; pingObj: any; onMessage?: (ev) => void }) {
    this._options = options;

    this.connect(options.url);
  }

  protected onMessage(ev) {}

  // Подключение к WebSocket
  private connect(url: string) {
    this.ws = new WebSocket(url);

    let spotInterval;

    const pingPong = () => {
      if (spotInterval) clearInterval(spotInterval);

      spotInterval = setInterval(() => this.ws.send(JSON.stringify(this._options.pingObj)), 10000);
    };

    this.ws.onopen = () => {
      console.log(`${this._options.name} WS connected`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Повторная подписка на все события
      this.resubscribe();
      pingPong();
    };

    this.ws.onmessage = (ev) => {
      if (this._options.onMessage) {
        this._options.onMessage(ev);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // if (this.options.onError) {
      //   this.options.onError(error);
      // }
    };

    this.ws.onclose = () => {
      if (spotInterval) clearInterval(spotInterval);
      this.isConnected = false;
      console.log(`${this._options.name} WS disconnected`);
      this.attemptReconnect();
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
      this.connect(this._options.url);
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
      this.ws.send(JSON.stringify(request));
    }
    this.subscriptions.add(JSON.stringify(request));
  }
}
