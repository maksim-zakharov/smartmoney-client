import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class BitunixFuturesWsClient extends SubscriptionManager {
  // Хранилище текущих стаканов для объединения bids и asks
  private orderbookCache = new Map<string, Orderbook>();

  constructor() {
    super({
      name: 'Bitunix Futures',
      url: 'wss://fapi.bitunix.com/public/',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
    this.on('error', (m) => this.onError(m));
  }

  protected onError(error) {
    console.error('Bitunix WebSocket error:', error);
  }

  protected onClose() {
    console.log(`Bitunix Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`Bitunix Futures Websocket соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Логирование для отладки стакана
      if (message.ch && (message.ch.includes('depth') || message.ch === 'depth')) {
        console.log('Bitunix depth message:', JSON.stringify(message, null, 2));
      }

      // Обработка ответов на подписку/отписку
      if (message.event === 'subscribed' || message.event === 'unsubscribed' || message.code === 0) {
        console.log('Bitunix subscription response:', message);
        return;
      }

      // Обработка свечей (kline)
      if (message.ch === 'kline' && message.data && message.symbol) {
        const symbol = message.symbol;
        const interval = message.interval || message.k?.i; // Интервал свечи
        const k = message.data.k || message.k || message.data;

        if (k) {
          const key = `kline_${interval}_${symbol}`;
          this.subscribeSubjs.get(key)?.next({
            open: Number(k.o || k.open),
            high: Number(k.h || k.high),
            low: Number(k.l || k.low),
            close: Number(k.c || k.close),
            time: Math.round((k.t || k.time || k.closeTime) / 1000),
            timestamp: k.t || k.time || k.closeTime,
          });
        }
        return;
      }

      // Обработка стакана (depth) - основной формат
      if (message.ch === 'depth' && message.data && message.symbol) {
        const symbol = message.symbol.toUpperCase();
        const key = `depth_${symbol}`;

        // Получаем или создаем стакан в кэше
        if (!this.orderbookCache.has(key)) {
          this.orderbookCache.set(key, {
            bids: [],
            asks: [],
          });
        }

        const orderbook = this.orderbookCache.get(key)!;
        const data = message.data;

        // Обновляем bids и asks
        if (data.bids && Array.isArray(data.bids)) {
          orderbook.bids = data.bids
            .map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            }))
            .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookBid[];
        }

        if (data.asks && Array.isArray(data.asks)) {
          orderbook.asks = data.asks
            .map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            }))
            .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookAsk[];
        }

        // Отправляем обновленный стакан только если есть данные
        if (orderbook.bids.length > 0 || orderbook.asks.length > 0) {
          this.subscribeSubjs.get(key)?.next({
            bids: [...orderbook.bids],
            asks: [...orderbook.asks],
          });
        }
        return;
      }

      // Альтернативный формат стакана (если приходит отдельно bids и asks)
      if ((message.ch === 'depth.bids' || message.ch === 'depth.asks') && message.data && message.symbol) {
        const symbol = message.symbol.toUpperCase();
        const key = `depth_${symbol}`;

        if (!this.orderbookCache.has(key)) {
          this.orderbookCache.set(key, {
            bids: [],
            asks: [],
          });
        }

        const orderbook = this.orderbookCache.get(key)!;
        const depths = (message.data.depths || message.data || [])
          .map((item: { price: string | number; vol: string | number; qty?: string | number }) => ({
            price: Number(item.price),
            volume: Number(item.vol || item.qty || 0),
          }))
          .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0);

        if (message.ch === 'depth.bids') {
          orderbook.bids = depths as OrderbookBid[];
        } else if (message.ch === 'depth.asks') {
          orderbook.asks = depths as OrderbookAsk[];
        }

        // Отправляем обновленный стакан только если есть данные
        if (orderbook.bids.length > 0 || orderbook.asks.length > 0) {
          this.subscribeSubjs.get(key)?.next({
            bids: [...orderbook.bids],
            asks: [...orderbook.asks],
          });
        }
        return;
      }

      // Попытка обработать стакан, если данные находятся в корне сообщения
      if (message.symbol && (message.bids || message.asks)) {
        const symbol = message.symbol.toUpperCase();
        const key = `depth_${symbol}`;

        if (!this.orderbookCache.has(key)) {
          this.orderbookCache.set(key, {
            bids: [],
            asks: [],
          });
        }

        const orderbook = this.orderbookCache.get(key)!;

        if (message.bids && Array.isArray(message.bids)) {
          orderbook.bids = message.bids
            .map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            }))
            .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookBid[];
        }

        if (message.asks && Array.isArray(message.asks)) {
          orderbook.asks = message.asks
            .map(([price, qty]: [string | number, string | number]) => ({
              price: Number(price),
              volume: Number(qty),
            }))
            .filter((item: { price: number; volume: number }) => item.price > 0 && item.volume > 0) as OrderbookAsk[];
        }

        if (orderbook.bids.length > 0 || orderbook.asks.length > 0) {
          this.subscribeSubjs.get(key)?.next({
            bids: [...orderbook.bids],
            asks: [...orderbook.asks],
          });
        }
        return;
      }
    } catch (error) {
      console.error('Bitunix WebSocket message error:', error);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitunixInterval(resolution);
    const key = `kline_${interval}_${symbol}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      op: 'subscribe',
      args: [
        {
          symbol,
          ch: 'kline',
          interval,
        },
      ],
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToBitunixInterval(resolution);
    const key = `kline_${interval}_${symbol}`;
    this.removeSubj(key);

    this.unsubscribe({
      op: 'unsubscribe',
      args: [
        {
          symbol,
          ch: 'kline',
          interval,
        },
      ],
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    // Bitunix использует формат без дефиса: BTC-USDT -> BTCUSDT
    const symbolNormalized = symbol.toUpperCase().replace('-', '');
    const key = `depth_${symbolNormalized}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    console.log('Bitunix subscribing to orderbook:', { symbol, symbolNormalized, depth });

    this.subscribe({
      op: 'subscribe',
      args: [
        {
          symbol: symbolNormalized,
          ch: 'depth',
          depth,
        },
      ],
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    // Bitunix использует формат без дефиса: BTC-USDT -> BTCUSDT
    const symbolNormalized = symbol.toUpperCase().replace('-', '');
    const key = `depth_${symbolNormalized}`;
    this.removeSubj(key);
    this.orderbookCache.delete(key);

    this.unsubscribe({
      op: 'unsubscribe',
      args: [
        {
          symbol: symbolNormalized,
          ch: 'depth',
          depth,
        },
      ],
    });
  }

  private convertResolutionToBitunixInterval(resolution: string): string {
    // Преобразуем resolution в формат Bitunix
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '120': '2h',
      '240': '4h',
      '360': '6h',
      '480': '8h',
      '720': '12h',
      D: '1d',
      W: '1w',
      M: '1M',
    };
    return resolutionMap[resolution] || '1m';
  }
}
