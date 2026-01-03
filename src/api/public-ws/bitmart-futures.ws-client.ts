import { share, Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class BitMartFuturesWsClient extends SubscriptionManager {
  // Хранилище текущих стаканов для объединения bids и asks
  private orderbookCache = new Map<string, Orderbook>();


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

      // Диспетчеризация по типу группы
      if (message.group && message.data) {
        if (message.group.startsWith('futures/klineBin')) {
          this.handleKlineBinMessage(message);
          return;
        }
        if (message.group.startsWith('futures/depth')) {
          this.handleDepthMessage(message);
          return;
        }
      }
    } catch (error) {
      console.error('BitMart WebSocket message error:', error);
    }
  }

  private handleKlineBinMessage(message: any) {
    // Формат: {"group":"futures/klineBin1m:FLOWUSDT","data":{"symbol":"FLOWUSDT","items":[{"o":"0.098","h":"0.1","l":"0.098","c":"0.098","v":"176686","ts":1767456060}]}}
    const group = message.group; // например, "futures/klineBin1m:FLOWUSDT"

    if (message.data && message.data.items && Array.isArray(message.data.items)) {
      message.data.items.forEach((item: any) => {
        this.subscribeSubjs.get(group)?.next({
          open: Number(item.o),
          high: Number(item.h),
          low: Number(item.l),
          close: Number(item.c),
          time: item.ts,
          timestamp: item.ts * 1000,
        });
      });
    } else if (message.data && message.data.o) {
      // Обработка случая, когда данные приходят напрямую (без items)
      this.subscribeSubjs.get(group)?.next({
        open: Number(message.data.o),
        high: Number(message.data.h),
        low: Number(message.data.l),
        close: Number(message.data.c),
        time: message.data.ts,
        timestamp: message.data.ts * 1000,
      });
    }
  }

  private handleDepthMessage(message: any) {
    // Формат: {"group":"futures/depth20:PTBUSDT","data":{"symbol":"PTBUSDT","way":1,"depths":[...]}}
    const group = message.group; // например, "futures/depth20:PTBUSDT"
    const parts = group.split(':');
    const depthPart = parts[0]; // "futures/depth20"
    const depth = depthPart.replace('futures/depth', ''); // "20"
    const symbol = message.data.symbol || (parts.length > 1 ? parts[1] : '');

    if (symbol) {
      const key = `futures/depth${depth}:${symbol}`;

      // Получаем или создаем стакан в кэше
      if (!this.orderbookCache.has(key)) {
        this.orderbookCache.set(key, {
          bids: [],
          asks: [],
        });
      }

      const orderbook = this.orderbookCache.get(key)!;

      // way: 1 = bids, way: 2 = asks
      const depths = (message.data.depths || []).map((item: { price: string; vol: string }) => ({
        price: Number(item.price),
        volume: Number(item.vol),
      }));

      if (message.data.way === 1) {
        // bids
        orderbook.bids = depths as OrderbookBid[];
      } else if (message.data.way === 2) {
        // asks
        orderbook.asks = depths as OrderbookAsk[];
      }

      // Отправляем обновленный стакан
      this.subscribeSubjs.get(key)?.next({
        bids: [...orderbook.bids],
        asks: [...orderbook.asks],
      });
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
    this.orderbookCache.delete(key); // Очищаем кэш при отписке
    
    this.unsubscribe({
      action: 'unsubscribe',
      args: [`futures/depth${validDepth}:${symbol}`],
    });

    this.removeSubscription({
      action: 'subscribe',
      args: [`futures/depth${validDepth}:${symbol}`],
    });
  }

  subscribeCandles(symbol: string, resolution: string) {
    // Преобразуем resolution в формат BitMart klineBin (1m, 5m, 1H и т.д.)
    const interval = this.convertResolutionToBitMartInterval(resolution);
    const key = `futures/klineBin${interval}:${symbol}`;
    const subj = this.createOrUpdateSubj(key);
    
    this.subscribe({
      action: 'subscribe',
      args: [key],
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitMartInterval(resolution);
    const key = `futures/klineBin${interval}:${symbol}`;
    this.removeSubj(key);
    
    this.unsubscribe({
      action: 'unsubscribe',
      args: [key],
    });

    this.removeSubscription({
      action: 'subscribe',
      args: [key],
    });
  }

  private convertResolutionToBitMartInterval(resolution: string): string {
    // Преобразуем resolution в формат BitMart klineBin
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1H',
      '120': '2H',
      '240': '4H',
      'D': '1D',
      'W': '1W',
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

  unsubscribeQuotes(symbol: string) {
    const key = `futures/ticker:${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      action: 'unsubscribe',
      args: [key],
    });

    this.removeSubscription({
      action: 'subscribe',
      args: [key],
    });
  }
}

