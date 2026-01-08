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

  private readonly channelHandlers: Record<string, (data: any, symbol?: string, ts?: number) => void> = {
    'push.tickers': (data) => this.handleTickersMessage(data),
    'push.deal': (data, symbol) => this.handleDealMessage(data, symbol),
    'push.depth': (data, symbol) => this.handleDepthMessage(data, symbol),
    'push.kline': (data, symbol, ts) => this.handleKlineMessage(data, symbol, ts),
    'push.fair.price': (data, symbol) => this.handleFairPriceMessage(data, symbol),
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
    // Базовый класс должен вызвать resubscribe() автоматически, но проверим
    console.log('OurbitWsClient.onOpen: subscriptions count:', this.subscriptions.size);
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
      const { channel, data, symbol, ts } = JSON.parse(ev.data as any);

      // Обработка pong ответа
      if (channel === 'pong') {
        // Просто игнорируем, ping/pong работает автоматически
        return;
      }

      const handler = this.channelHandlers[channel];
      if (handler) {
        handler(data, symbol, ts);
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

  private handleKlineMessage(data: any, symbol: string, ts: number) {
    const key = `${symbol}_${data.interval}`;
    const { o, h, l, c, t } = data;
    this.subscribeSubjs.get(key)?.next({
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      time: t,
      timestamp: ts,
    });
  }

  private handleFairPriceMessage(data: any, symbol: string) {
    const key = `${symbol}_fair`;
    const { price } = data;
    this.subscribeSubjs.get(key)?.next({
      close: price,
    });
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

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.kline',
      param: {
        symbol,
        interval,
      },
    });

    return subj;
  }

  subscribeFairPrice(symbol: string) {
    const subj = new Subject<any>();
    const key = `${symbol}_fair`;
    this.subscribeSubjs.set(key, subj);
    this.subscribe({
      method: 'sub.fair.price',
      param: {
        symbol,
      },
    });

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    console.log('OurbitWsClient.subscribeOrderbook called', { symbol, depth });
    const subj = new Subject<MexcOrderbook>();
    const key = `depth_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    const subscribeRequest = {
      method: 'sub.depth',
      param: {
        symbol,
        limit: depth,
      },
    };
    console.log('OurbitWsClient: calling subscribe with', subscribeRequest);
    this.subscribe(subscribeRequest);
    console.log('OurbitWsClient: subscribe called, isConnected:', this.isConnected, 'ws readyState:', this.ws?.readyState);

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
    const interval = `Min${resolution}`;
    const key = `${symbol}_${interval}`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.kline',
      param: {
        symbol,
        interval,
      },
    });

    this.removeSubscription({
      method: 'sub.kline',
      param: {
        symbol,
        interval,
      },
    });
  }

  unsubscribeFairPrice(symbol: string) {
    const key = `${symbol}_fair`;
    this.removeSubj(key);
    this.unsubscribe({
      method: 'unsub.fair.price',
      param: {
        symbol,
      },
    });

    this.removeSubscription({
      method: 'sub.fair.price',
      param: {
        symbol,
      },
    });
  }
}

