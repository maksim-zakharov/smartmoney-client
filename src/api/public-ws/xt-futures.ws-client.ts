import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class XtFuturesWsClient extends SubscriptionManager {
  private subscriptionIdCounter = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super({
      name: 'XT Futures',
      url: 'wss://fstream.x.group/ws/market',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  private getNextId(): string {
    return `xt_${++this.subscriptionIdCounter}`;
  }

  protected onClose() {
    console.log(`XT Futures Websocket соединение разорвано`);
    this.stopPing();
  }

  protected onOpen() {
    console.log(`XT Futures Websocket соединение установлено`);
    this.startPing();
  }

  /**
   * Запускает отправку ping сообщений каждые 30 секунд
   */
  private startPing() {
    this.stopPing();
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000); // 30 секунд
  }

  /**
   * Останавливает отправку ping сообщений
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  onMessage(ev: MessageEvent) {
    let parsed;
    try {
      const data = ev.data;
      
      // Обработка ping/pong (XT отправляет строку 'ping' или 'pong')
      if (typeof data === 'string' && (data === 'pong' || data === 'ping')) {
        return;
      }
      
      if (typeof data !== 'string') {
        console.warn('Received non-string WebSocket message, skipping');
        return;
      }
      
      parsed = JSON.parse(data);
    } catch (error) {
      // Если не JSON, возможно это ping/pong
      if (ev.data === 'pong' || ev.data === 'ping') {
        return;
      }
      console.error(`Failed to parse WebSocket message: ${error.message}. Data: ${String(ev.data).substring(0, 200)}`);
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    try {
      // Обработка свечей (kline)
      if (parsed.topic === 'kline' && parsed.data && parsed.event) {
        const eventParts = parsed.event.split('@');
        if (eventParts.length < 3) {
          return;
        }
        const symbol = eventParts[1]; // например, "btc_usdt"
        const interval = eventParts[2]; // например, "1m"
        const key = `kline_${symbol}_${interval}`;
        
        if (parsed.data) {
          const kline = parsed.data;
          this.subscribeSubjs.get(key)?.next({
            open: Number(kline.o),
            high: Number(kline.h),
            low: Number(kline.l),
            close: Number(kline.c),
            time: Math.round(kline.t / 1000), // timestamp в секундах
            timestamp: kline.t, // timestamp в миллисекундах
          });
        }
        return;
      }

      // Обработка стакана (depth)
      if (parsed.topic === 'depth' && parsed.data && parsed.event) {
        // event: "depth@btc_usdt,20" - извлекаем символ до запятой
        const eventParts = parsed.event.split('@');
        if (eventParts.length < 2) {
          return;
        }
        const symbolWithParams = eventParts[1]; // например, "btc_usdt,20"
        const symbol = symbolWithParams.split(',')[0]; // извлекаем символ до запятой
        const key = `depth_${symbol}`;
        
        if (parsed.data) {
          const depth = parsed.data;
          const orderbook: Orderbook = {
            bids: (depth.b || []).map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            })) as OrderbookBid[],
            asks: (depth.a || []).map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            })) as OrderbookAsk[],
          };
          this.subscribeSubjs.get(key)?.next(orderbook);
        }
        return;
      }
    } catch (error) {
      console.error('XT WebSocket message error:', error);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToXTInterval(resolution);
    // XT использует формат с подчеркиванием: BTC-USDT -> btc_usdt (нижний регистр)
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    const channel = `kline@${symbolLower}@${interval}`;
    const key = `kline_${symbolLower}_${interval}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [channel],
      id: this.getNextId(),
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToXTInterval(resolution);
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    const channel = `kline@${symbolLower}@${interval}`;
    const key = `kline_${symbolLower}_${interval}`;
    this.removeSubj(key);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [channel],
      id: this.getNextId(),
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // XT использует формат с подчеркиванием: BTC-USDT -> btc_usdt (нижний регистр)
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат: depth@symbol,depth,interval (например, depth@btc_usdt,50,1000ms)
    const channel = `depth@${symbolLower},${depth},1000ms`;
    const key = `depth_${symbolLower}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [channel],
      id: this.getNextId(),
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат должен совпадать с подпиской: depth@symbol,depth,interval
    const channel = `depth@${symbolLower},${depth},1000ms`;
    const key = `depth_${symbolLower}`;
    this.removeSubj(key);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [channel],
      id: this.getNextId(),
    });
  }

  private convertResolutionToXTInterval(resolution: string): string {
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '5m', // Fallback (3m не поддерживается)
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '120': '1h', // Fallback (2h не поддерживается)
      '240': '4h',
      '360': '4h', // Fallback (6h не поддерживается)
      '480': '4h', // Fallback (8h не поддерживается)
      '720': '4h', // Fallback (12h не поддерживается)
      D: '1d',
      W: '1w',
      M: '1w', // Fallback (Month не поддерживается)
    };
    return resolutionMap[resolution] || '1m';
  }
}

