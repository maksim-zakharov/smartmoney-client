import { SubscriptionManager } from '../common/subscription-manager';

export class OkxCandlesWsClient extends SubscriptionManager {
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly pingRequest = () => 'ping'; // OKX требует строку 'ping'

  constructor() {
    super({
      name: 'OKX Futures (Candles)',
      url: 'wss://ws.okx.com:8443/ws/v5/business',
      // Не передаем pingRequest, чтобы отключить стандартный ping (который делает JSON.stringify)
      // Вместо этого используем кастомный ping через событие 'connect'
    });

    this.on('connect', () => {
      this.onOpen();
      this.startPing();
    });
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`OKX Futures Websocket (Candles) соединение разорвано`);
    this.stopPing();
  }

  protected onOpen() {
    console.log(`OKX Futures Websocket (Candles) соединение установлено`);
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingValue = this.pingRequest();
        // Если pingRequest возвращает строку, отправляем как есть, иначе JSON.stringify
        if (typeof pingValue === 'string') {
          this.ws.send(pingValue);
        } else {
          this.ws.send(JSON.stringify(pingValue));
        }
      }
    }, 10000); // Каждые 10 секунд
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  onMessage(ev: MessageEvent) {
    try {
      // Обработка строки 'pong'
      if (typeof ev.data === 'string' && ev.data === 'pong') {
        return;
      }

      const message = JSON.parse(ev.data as any);

      // Обработка pong
      if (message.event === 'pong') {
        return;
      }

      // Обработка ответа на подписку/отписку
      if (message.event === 'subscribe' || message.event === 'unsubscribe') {
        return;
      }

      // Обработка данных свечей
      if (message.arg && message.arg.channel && message.arg.channel.startsWith('candle')) {
        if (message.data && Array.isArray(message.data) && message.data.length > 0) {
          const candleData = message.data[message.data.length - 1]; // Берем последнюю свечу
          const instId = message.arg.instId;
          const channel = message.arg.channel; // candle1D, candle5m и т.д.
          const key = `${channel}_${instId}`;

          // Формат: [timestamp, open, high, low, close, volume, ...]
          this.subscribeSubjs.get(key)?.next({
            open: Number(candleData[1]),
            high: Number(candleData[2]),
            low: Number(candleData[3]),
            close: Number(candleData[4]),
            time: Math.round(Number(candleData[0]) / 1000), // timestamp в секундах
            timestamp: Number(candleData[0]), // timestamp в миллисекундах
          });
        }
      }
    } catch (error) {
      console.error('OKX WebSocket (Candles) message error:', error);
    }
  }
}

