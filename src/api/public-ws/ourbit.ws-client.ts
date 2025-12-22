import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { MexcOrderbook } from '../mexc.models';

export interface OurbitWSFTicker {
  amount24: number;
  fairPrice: number;
  high24Price: number;
  indexPrice: number;
  lastPrice: number;
  lower24Price: number;
  maxBidPrice: number;
  minAskPrice: number;
  riseFallRate: number;
  symbol: string;
  timestamp: number;
  volume24: number;
}

export interface OurbitWSTrade {
  p: number; // price
  v: number; // volume
  T: number; // trade type (1 = buy, 2 = sell)
  O: number; // order type
  M: number; // maker/taker (1 = maker, 2 = taker)
  t: number; // timestamp
}

export class OurbitWsClient extends SubscriptionManager {
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super({
      url: 'wss://futures.ourbit.com/ws',
      name: 'Ourbit Futures',
      // Не передаем pingRequest, так как базовый класс использует интервал 10 секунд,
      // а для Ourbit требуется 5 секунд. Переопределяем ping в onOpen.
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log('Ourbit Futures Websocket соединение установлено');
    // Запускаем ping каждые 5 секунд (базовый класс использует 10 секунд)
    this.startPing();
  }

  protected onClose() {
    console.log('Ourbit Futures Websocket соединение разорвано');
    this.stopPing();
  }

  private startPing() {
    this.stopPing(); // Останавливаем предыдущий интервал, если есть
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        // WebSocket.OPEN = 1
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, 5000); // Каждые 5 секунд (базовый класс использует 10)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка pong ответа
      if (message.channel === 'pong') {
        // Просто игнорируем, ping/pong работает автоматически
        return;
      }

      // Обработка тикеров
      if (message.channel === 'push.tickers') {
        const key = `sub.tickers`;
        this.subscribeSubjs.get(key)?.next(message.data);
      }

      // Обработка сделок (trades)
      if (message.channel === 'push.deal') {
        const key = `sub.deal.${message.symbol}`;
        this.subscribeSubjs.get(key)?.next(message.data);
      }

      // Обработка стакана (orderbook) - аналогично MEXC
      if (message.channel === 'push.depth') {
        const key = `depth_${message.symbol}`;
        this.subscribeSubjs.get(key)?.next({
          bids: message.data.bids.map((p) => ({
            price: Number(p[0]),
            value: Number(p[1]),
          })),
          asks: message.data.asks.map((p) => ({
            price: Number(p[0]),
            value: Number(p[1]),
          })),
        } as MexcOrderbook);
      }
    } catch (error) {
      console.error(`Ошибка обработки сообщения: ${error.message}`, error);
    }
  }

  subscribeTickers(timezone: string = 'UTC+8') {
    const args = `sub.tickers`;
    const subj = this.createOrUpdateSubj<OurbitWSFTicker[]>(args);
    this.subscribe({
      method: 'sub.tickers',
      param: {
        timezone,
      },
    });

    return subj;
  }

  subscribeTrades(symbol: string) {
    const key = `sub.deal.${symbol}`;
    const subj = this.createOrUpdateSubj<OurbitWSTrade[]>(key);
    this.subscribe({
      method: 'sub.deal',
      param: {
        symbol,
        compress: true,
      },
    });

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const key = `sub.deal.${symbol}`;
    this.subscribeSubjs.delete(key);
    // Отправляем запрос на отписку
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({
        method: 'unsub.deal',
        param: {
          symbol,
        },
      }));
    }
  }

  // Для свечей используем подписку на трейды и агрегацию (аналогично MEXC)
  // Но пока что просто возвращаем заглушку, так как OURBIT не имеет прямого API для свечей
  subscribeCandles(symbol: string, resolution: string) {
    // TODO: Реализовать подписку на свечи через агрегацию трейдов если нужно
    const subj = new Subject<any>();
    // Пока возвращаем пустой subject
    return subj;
  }

  subscribeFairPrice(symbol: string) {
    // OURBIT не имеет fair price API, возвращаем заглушку
    const subj = new Subject<any>();
    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<MexcOrderbook>();
    const key = `depth_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });

    return subj;
  }
}

