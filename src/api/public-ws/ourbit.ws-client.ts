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

  private readonly channelHandlers: Record<string, (data: any, symbol?: string) => void> = {
    'push.tickers': (data) => this.handleTickersMessage(data),
    'push.deal': (data, symbol) => this.handleDealMessage(data, symbol),
    'push.depth': (data, symbol) => this.handleDepthMessage(data, symbol),
  };

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

      const handler = this.channelHandlers[message.channel];
      if (handler) {
        handler(message.data, message.symbol);
      }
    } catch (error) {
      console.error(`Ошибка обработки сообщения: ${error.message}`, error);
    }
  }

  private handleTickersMessage(data: any) {
    const key = `sub.tickers`;
    this.subscribeSubjs.get(key)?.next(data);
  }

  private handleDealMessage(data: any, symbol?: string) {
    if (!symbol) return;
    const key = `sub.deal.${symbol}`;
    this.subscribeSubjs.get(key)?.next(data);
  }

  private handleDepthMessage(data: any, symbol?: string) {
    if (!symbol) return;
    const key = `depth_${symbol}`;
    this.subscribeSubjs.get(key)?.next({
      bids: data.bids.map((p) => ({
        price: Number(p[0]),
        value: Number(p[1]),
      })),
      asks: data.asks.map((p) => ({
        price: Number(p[0]),
        value: Number(p[1]),
      })),
    } as MexcOrderbook);
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
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.deal',
      param: {
        symbol,
      },
    });

    this.removeSubscription({
      method: 'sub.deal',
      param: {
        symbol,
        compress: true,
      },
    });
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

  unsubscribeOrderbook(symbol: string, depth: number) {
    const key = `depth_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });

    this.removeSubscription({
      method: 'sub.depth',
      param: {
        symbol,
        limit: depth,
      },
    });
  }

  unsubscribeTickers(timezone: string = 'UTC+8') {
    const args = `sub.tickers`;
    this.removeSubj(args);
    this.unsubscribe({
      method: 'unsub.tickers',
      param: {
        timezone,
      },
    });

    this.removeSubscription({
      method: 'sub.tickers',
      param: {
        timezone,
      },
    });
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    // OURBIT не имеет прямого API для свечей, но добавляем метод для консистентности
    const key = `candles_${symbol}_${resolution}`;
    this.removeSubj(key);
  }

  unsubscribeFairPrice(symbol: string) {
    // OURBIT не имеет fair price API, но добавляем метод для консистентности
    const key = `fair_${symbol}`;
    this.removeSubj(key);
  }
}

