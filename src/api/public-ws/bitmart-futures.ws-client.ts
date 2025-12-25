import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class BitMartFuturesWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'BitMart Futures',
      url: 'wss://openapi-ws-v2.bitmart.com/api?protocol=1.1',
      pingRequest: () => ({
        action: 'ping',
      }),
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`BitMart Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`BitMart Futures Websocket соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка ping/pong
      if (message.action === 'ping') {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ action: 'pong' }));
        }
        return;
      }

      if (message.action === 'pong') {
        // Ответ на наш ping
        return;
      }

      // Обработка подтверждения подписки/отписки
      if (message.action === 'subscribe' || message.action === 'unsubscribe') {
        return;
      }

      // Обработка свечей (kline)
      // Формат: {"group":"futures/kline1m","data":[...]}
      if (message.group && message.group.startsWith('futures/kline') && message.data) {
        const group = message.group; // например, "futures/kline1m"
        const interval = group.replace('futures/kline', ''); // "1m"
        
        if (Array.isArray(message.data)) {
          message.data.forEach((klineData: any) => {
            if (klineData && klineData.symbol) {
              const key = `futures/kline${interval}:${klineData.symbol}`;
              this.subscribeSubjs.get(key)?.next({
                open: Number(klineData.open_price || klineData.open),
                high: Number(klineData.high_price || klineData.high),
                low: Number(klineData.low_price || klineData.low),
                close: Number(klineData.close_price || klineData.close),
                time: Math.round((klineData.timestamp || klineData.time) / 1000),
                timestamp: klineData.timestamp || klineData.time,
              });
            }
          });
        } else if (message.data.symbol) {
          const key = `futures/kline${interval}:${message.data.symbol}`;
          this.subscribeSubjs.get(key)?.next({
            open: Number(message.data.open_price || message.data.open),
            high: Number(message.data.high_price || message.data.high),
            low: Number(message.data.low_price || message.data.low),
            close: Number(message.data.close_price || message.data.close),
            time: Math.round((message.data.timestamp || message.data.time) / 1000),
            timestamp: message.data.timestamp || message.data.time,
          });
        }
        return;
      }

      // Обработка стакана (depth)
      // Формат: {"group":"futures/depth50","data":{...}}
      if (message.group && message.group.startsWith('futures/depth') && message.data) {
        const group = message.group; // например, "futures/depth50"
        const depth = group.replace('futures/depth', ''); // "50"
        
        if (message.data.symbol) {
          const key = `futures/depth${depth}:${message.data.symbol}`;
          const orderbook: Orderbook = {
            bids: (message.data.bids || []).map(([price, qty]: [string, string]) => ({
              price: Number(price),
              volume: Number(qty),
            })) as OrderbookBid[],
            asks: (message.data.asks || []).map(([price, qty]: [string, string]) => ({
              price: Number(price),
              volume: Number(qty),
            })) as OrderbookAsk[],
          };
          this.subscribeSubjs.get(key)?.next(orderbook);
        }
        return;
      }
    } catch (error) {
      console.error('BitMart WebSocket message error:', error);
    }
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // BitMart поддерживает глубину 5, 10, 20, 50
    const validDepth = depth <= 5 ? 5 : depth <= 10 ? 10 : depth <= 20 ? 20 : 50;
    const key = `futures/depth${validDepth}:${symbol}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);
    
    this.subscribe({
      action: 'subscribe',
      args: [`futures/depth${validDepth}:${symbol}`],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const validDepth = depth <= 5 ? 5 : depth <= 10 ? 10 : depth <= 20 ? 20 : 50;
    const key = `futures/depth${validDepth}:${symbol}`;
    this.removeSubj(key);
    
    this.unsubscribe({
      action: 'unsubscribe',
      args: [`futures/depth${validDepth}:${symbol}`],
    });
  }

  subscribeCandles(symbol: string, resolution: string) {
    // Преобразуем resolution в формат BitMart (1m, 5m, 1H и т.д.)
    const interval = this.convertResolutionToBitMartInterval(resolution);
    const key = `futures/kline${interval}:${symbol}`;
    const subj = this.createOrUpdateSubj(key);
    
    this.subscribe({
      action: 'subscribe',
      args: [key],
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitMartInterval(resolution);
    const key = `futures/kline${interval}:${symbol}`;
    this.removeSubj(key);
    
    this.unsubscribe({
      action: 'unsubscribe',
      args: [key],
    });
  }

  private convertResolutionToBitMartInterval(resolution: string): string {
    // Преобразуем resolution в формат BitMart
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1H',
      '120': '2H',
      '240': '4H',
      '360': '6H',
      '480': '8H',
      '720': '12H',
      'D': '1D',
      'W': '1W',
      'M': '1M',
    };
    return resolutionMap[resolution] || '1m';
  }

  subscribeQuotes(symbol: string) {
    const key = `futures/ticker:${symbol}`;
    const subj = this.createOrUpdateSubj(key);
    
    this.subscribe({
      action: 'subscribe',
      args: [key],
    });

    return subj;
  }
}

