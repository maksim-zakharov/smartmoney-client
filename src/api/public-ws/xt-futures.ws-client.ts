import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class XtFuturesWsClient extends SubscriptionManager {
  private pingInterval: NodeJS.Timeout | null = null;

  private readonly topicHandlers: Record<string, (message: any) => void> = {
    kline: (msg) => this.handleKlineMessage(msg),
    depth: (msg) => this.handleDepthMessage(msg),
  };

  constructor() {
    super({
      name: 'XT Futures',
      url: 'wss://fstream.x.group/ws/market',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
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
      // Обработка ответа на подписку (подтверждение успешной подписки)
      if (parsed.code === 0 && parsed.msg === 'success' && parsed.id) {
        this.handleSubscribeResponse(parsed);
        return;
      }

      // Обработка сообщений с topic, data и event
      if (parsed.data && parsed.event && parsed.topic) {
        const handler = this.topicHandlers[parsed.topic];
        if (handler) {
          handler(parsed);
          return;
        }
      }
    } catch (error) {
      console.error('XT WebSocket message error:', error);
    }
  }

  /**
   * Обрабатывает ответ на подписку (подтверждение успешной подписки)
   */
  private handleSubscribeResponse(message: { code: number; msg: string; id: string; sessionId?: string }) {
    // Это подтверждение успешной подписки, просто игнорируем
    // Можно добавить логирование при необходимости
  }

  /**
   * Обрабатывает сообщение свечей (kline)
   */
  private handleKlineMessage(message: { topic: string; event: string; data: any }) {
    // event: "kline@btc_usdt,5m" - это и есть channel
    const channel = message.event;

    if (message.data) {
      const kline = message.data;
      this.subscribeSubjs.get(channel)?.next({
        open: Number(kline.o),
        high: Number(kline.h),
        low: Number(kline.l),
        close: Number(kline.c),
        time: Math.round(kline.t / 1000), // timestamp в секундах
        timestamp: kline.t, // timestamp в миллисекундах
      });
    }
  }

  /**
   * Обрабатывает сообщение стакана (depth)
   */
  private handleDepthMessage(message: { topic: string; event: string; data: any }) {
    // event: "depth@btc_usdt,20" или "depth@btc_usdt,50,1000ms" - это и есть channel
    // Но нужно нормализовать, так как в subscribeOrderbook мы используем формат с 1000ms
    const eventParts = message.event.split('@');
    if (eventParts.length < 2) {
      return;
    }
    const symbolWithParams = eventParts[1]; // например, "btc_usdt,20" или "btc_usdt,50,1000ms"
    const parts = symbolWithParams.split(',');
    const symbol = parts[0]; // извлекаем символ
    const depth = parts[1]; // извлекаем depth
    // Нормализуем channel к формату, используемому в subscribeOrderbook
    const channel = `depth@${symbol},${depth},1000ms`;

    if (message.data) {
      const depthData = message.data;
      const orderbook: Orderbook = {
        bids: (depthData.b || []).map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookBid[],
        asks: (depthData.a || []).map(([price, qty]: [string | number, string | number]) => ({
          price: Number(price),
          volume: Number(qty),
        })) as OrderbookAsk[],
      };
      this.subscribeSubjs.get(channel)?.next(orderbook);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToXTInterval(resolution);
    // XT использует формат с подчеркиванием: BTC-USDT -> btc_usdt (нижний регистр)
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат: kline@symbol,interval (например, kline@btc_usdt,5m)
    const channel = `kline@${symbolLower},${interval}`;
    const subj = this.createOrUpdateSubj(channel);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [channel],
      id: `SUBSCRIBE_${channel}`,
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToXTInterval(resolution);
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат должен совпадать с подпиской: kline@symbol,interval
    const channel = `kline@${symbolLower},${interval}`;
    this.removeSubj(channel);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [channel],
      id: `UNSUBSCRIBE_${channel}`,
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // XT использует формат с подчеркиванием: BTC-USDT -> btc_usdt (нижний регистр)
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат: depth@symbol,depth,interval (например, depth@btc_usdt,50,1000ms)
    const channel = `depth@${symbolLower},${depth},1000ms`;
    const subj = this.createOrUpdateSubj<Orderbook>(channel);

    this.subscribe({
      method: 'SUBSCRIBE',
      params: [channel],
      id: `SUBSCRIBE_${channel}_${Date.now()}`,
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolLower = symbol.toLowerCase().replace('-', '_'); // BTC-USDT -> btc_usdt
    // Формат должен совпадать с подпиской: depth@symbol,depth,interval
    const channel = `depth@${symbolLower},${depth},1000ms`;
    this.removeSubj(channel);

    this.unsubscribe({
      method: 'UNSUBSCRIBE',
      params: [channel],
      id: `UNSUBSCRIBE_${channel}_${Date.now()}`,
    });

    this.removeSubscription({
      method: 'SUBSCRIBE',
      params: [channel],
      id: `SUBSCRIBE${channel}_${Date.now()}`,
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

