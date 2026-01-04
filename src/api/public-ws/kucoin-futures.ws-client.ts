import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';
import * as pako from 'pako';

export class KucoinFuturesWsClient extends SubscriptionManager {
  private pingInterval: NodeJS.Timeout | null = null;
  private idCounter = 0;

  private readonly typeHandlers: Record<string, (message: any) => void> = {
    delta: (msg) => this.handleOrderbookMessage(msg),
    kline: (msg) => this.handleKlineMessage(msg),
  };

  constructor() {
    super({
      name: 'KuCoin Futures',
      url: 'wss://x-push-futures.kucoin.com',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`KuCoin Futures Websocket соединение разорвано`);
    this.stopPing();
  }

  protected onOpen() {
    console.log(`KuCoin Futures Websocket соединение установлено`);
    this.startPing();
  }

  private startPing() {
    this.stopPing();

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            id: Date.now().toString(),
            type: 'ping',
          }),
        );
      }
    }, 30000); // 30 секунд
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private getNextId(): string {
    this.idCounter += 1;
    return Date.now().toString() + this.idCounter.toString();
  }

  async onMessage(ev: MessageEvent) {
    let parsed;
    try {
      // Проверяем, является ли данные строкой (для ping/pong и ответов на подписку)
      if (typeof ev.data === 'string') {
        try {
          parsed = JSON.parse(ev.data);
          this.processMessage(parsed);
          return;
        } catch (e) {
          // Если не JSON, игнорируем
          return;
        }
      }

      // Обработка бинарных данных
      let inputData: Uint8Array;
      if (ev.data instanceof ArrayBuffer) {
        inputData = new Uint8Array(ev.data);
      } else if (ev.data instanceof Blob) {
        const arrayBuffer = await ev.data.arrayBuffer();
        inputData = new Uint8Array(arrayBuffer);
      } else if (ev.data instanceof Uint8Array) {
        inputData = ev.data;
      } else {
        console.warn('Unknown data type:', typeof ev.data);
        return;
      }

      // Пытаемся декодировать как UTF-8 без распаковки
      try {
        const decodedMsg = new TextDecoder('utf-8').decode(inputData);
        parsed = JSON.parse(decodedMsg);
      } catch (error) {
        // Если не получилось, пытаемся распаковать gzip
        try {
          const decompressed = pako.ungzip(inputData);
          const decodedMsg = new TextDecoder('utf-8').decode(decompressed);
          parsed = JSON.parse(decodedMsg);
        } catch (gzipError) {
          console.error(`Failed to parse WebSocket message: ${error.message}. Gzip error: ${gzipError.message}`);
          return;
        }
      }
    } catch (error) {
      console.error(`Failed to parse WebSocket message: ${error.message}. Data: ${String(ev.data).substring(0, 200)}`);
      return;
    }

    this.processMessage(parsed);
  }

  private processMessage(message: any) {
    try {
      // Обработка pong
      if (message.type === 'pong') {
        return;
      }

      // Обработка ответов на подписку/отписку
      if (message.id && (message.action === 'SUBSCRIBE' || message.action === 'UNSUBSCRIBE')) {
        return;
      }

      // Обработка сообщений по T (тип канала)
      if (message.T) {
        if (message.T.startsWith('obu.')) {
          this.handleOrderbookMessage(message);
          return;
        }
        if (message.T.startsWith('kline.')) {
          this.handleKlineMessage(message);
          return;
        }
        if (message.T.startsWith('ticker.')) {
          this.handleTickerMessage(message);
          return;
        }
        if (message.T.startsWith('trade.')) {
          this.handleTradeMessage(message);
          return;
        }
      }

      // Обработка сообщений по t (тип события)
      if (message.t) {
        const handler = this.typeHandlers[message.t];
        if (handler) {
          handler(message);
          return;
        }
      }
    } catch (error) {
      console.error('KuCoin Futures WebSocket message processing error:', error);
    }
  }

  private handleKlineMessage(message: any) {
    const data = message.d;
    if (!data || !data.s) {
      return;
    }

    const symbol = data.s; // XBTUSDTM
    const interval = data.i; // 1min
    const key = `kline_${symbol}_${interval}`;

    this.subscribeSubjs.get(key)?.next({
      open: Number(data.o),
      high: Number(data.h),
      low: Number(data.l),
      close: Number(data.c),
      time: Math.round(data.O / 1000), // O - открытие свечи в миллисекундах
      timestamp: data.C || data.O, // C - закрытие, O - открытие
    });
  }

  private handleOrderbookMessage(message: any) {
    const data = message.d;
    if (!data || !data.s) {
      return;
    }

    const symbol = data.s; // XBTUSDTM
    const depth = message.dp || 'increment'; // depth type
    const key = `obu_${symbol}_${depth}`;

    const orderbook: Orderbook = {
      bids: (data.b || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookBid[],
      asks: (data.a || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookAsk[],
    };

    this.subscribeSubjs.get(key)?.next(orderbook);
  }

  private handleTickerMessage(message: any) {
    const data = message.d;
    if (!data || !data.s) {
      return;
    }

    const symbol = data.s; // XBTUSDTM
    const key = `ticker_${symbol}`;

    this.subscribeSubjs.get(key)?.next({
      symbol: data.s,
      bestBidPrice: Number(data.b),
      bestBidSize: Number(data.B),
      bestAskPrice: Number(data.a),
      bestAskSize: Number(data.A),
      lastPrice: Number(data.l),
      lastSize: Number(data.q),
      side: data.S, // BUY or SELL
      sequence: data.E,
      timestamp: data.M,
    });
  }

  private handleTradeMessage(message: any) {
    const data = message.d;
    if (!data || !data.s) {
      return;
    }

    const symbol = data.s; // XBTUSDTM
    const key = `trade_${symbol}`;

    this.subscribeSubjs.get(key)?.next({
      symbol: data.s,
      sequence: data.E,
      tradeId: data.ti,
      price: Number(data.p),
      size: Number(data.q),
      side: data.S, // buy or sell
      rpi: data.rpi, // optional, only for FUTURES
      timestamp: data.M,
    });
  }

  /**
   * Нормализует символ для KuCoin Futures
   * BTC-USDT -> BTCUSDTM
   */
  private normalizeSymbol(symbol: string): string {
    // Убираем дефисы и добавляем M в конец для futures
    const normalized = symbol.replace(/-/g, '').toUpperCase();
    if (!normalized.endsWith('M')) {
      return normalized + 'M';
    }
    return normalized;
  }


  /**
   * Преобразует resolution в формат KuCoin
   */
  private convertResolutionToKucoinInterval(resolution: string): string {
    const resolutionMap: Record<string, string> = {
      '1': '1min',
      '3': '3min',
      '5': '5min',
      '15': '15min',
      '30': '30min',
      '60': '1hour',
      '120': '2hour',
      '240': '4hour',
      '360': '6hour',
      '480': '8hour',
      '720': '12hour',
      D: '1day',
      W: '1week',
      M: '1month',
    };
    return resolutionMap[resolution] || '1min';
  }

  subscribeCandles(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const interval = this.convertResolutionToKucoinInterval(resolution);
    const key = `kline_${normalizedSymbol}_${interval}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'kline',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      interval,
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const interval = this.convertResolutionToKucoinInterval(resolution);
    const key = `kline_${normalizedSymbol}_${interval}`;
    this.removeSubj(key);

    this.unsubscribe({
      id: this.getNextId(),
      action: 'UNSUBSCRIBE',
      channel: 'kline',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      interval,
    });

    this.removeSubscription({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'kline',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      interval,
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    // KuCoin поддерживает depth: 1, 5, 50, increment
    let kucoinDepth = '5';
    if (depth <= 1) {
      kucoinDepth = '1';
    } else if (depth <= 5) {
      kucoinDepth = '5';
    } else if (depth <= 50) {
      kucoinDepth = '50';
    } else {
      kucoinDepth = 'increment';
    }

    const key = `obu_${normalizedSymbol}_${kucoinDepth}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    this.subscribe({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'obu',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      depth: kucoinDepth,
      rpiFilter: 0,
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    let kucoinDepth = '5';
    if (depth <= 1) {
      kucoinDepth = '1';
    } else if (depth <= 5) {
      kucoinDepth = '5';
    } else if (depth <= 50) {
      kucoinDepth = '50';
    } else {
      kucoinDepth = 'increment';
    }

    const key = `obu_${normalizedSymbol}_${kucoinDepth}`;
    this.removeSubj(key);

    this.unsubscribe({
      id: this.getNextId(),
      action: 'UNSUBSCRIBE',
      channel: 'obu',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      depth: kucoinDepth,
      rpiFilter: 0,
    });

    this.removeSubscription({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'obu',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
      depth: kucoinDepth,
      rpiFilter: 0,
    });
  }

  subscribeTickers(symbol: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `ticker_${normalizedSymbol}`;
    const subj = this.createOrUpdateSubj<any>(key);

    this.subscribe({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'ticker',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });

    return subj;
  }

  unsubscribeTickers(symbol: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `ticker_${normalizedSymbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      id: this.getNextId(),
      action: 'UNSUBSCRIBE',
      channel: 'ticker',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });

    this.removeSubscription({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'ticker',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });
  }

  subscribeTrades(symbol: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `trade_${normalizedSymbol}`;
    const subj = this.createOrUpdateSubj<any>(key);

    this.subscribe({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'trade',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const key = `trade_${normalizedSymbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      id: this.getNextId(),
      action: 'UNSUBSCRIBE',
      channel: 'trade',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });

    this.removeSubscription({
      id: this.getNextId(),
      action: 'SUBSCRIBE',
      channel: 'trade',
      tradeType: 'FUTURES',
      symbol: normalizedSymbol,
    });
  }
}

