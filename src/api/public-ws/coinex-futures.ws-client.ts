import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';

export class CoinexFuturesWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'COINEX Futures',
      url: 'wss://socket.coinex.com/v2/futures',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`COINEX Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`COINEX Futures Websocket соединение установлено`);
  }

  onMessage(ev: MessageEvent) {
    try {
      const message = JSON.parse(ev.data as any);

      // Обработка state.update
      if (message.method === 'state.update' && message.data?.state_list) {
        this.handleStateUpdate(message.data.state_list);
        return;
      }

      // Обработка depth.update
      if (message.method === 'depth.update' && message.data) {
        this.handleDepthUpdate(message.data);
        return;
      }

      // Обработка ответов на подписку
      if (message.id && message.result) {
        return;
      }
    } catch (error) {
      console.error('COINEX Futures WebSocket message error:', error);
    }
  }

  private handleStateUpdate(stateList: any[]) {
    stateList.forEach((state: any) => {
      const market = state.market?.toUpperCase();

      // Обработка для fair price (если есть mark_price)
      if (state.mark_price) {
        const fairKey = `${market}_fair`;
        this.subscribeSubjs.get(fairKey)?.next({
          close: Number(state.mark_price),
          price: Number(state.mark_price), // Для совместимости с aggregateFairPriceToCandles
        });
      }
    });
  }

  private handleDepthUpdate(data: any) {
    const { market, depth } = data;
    const key = `depth_${market?.toUpperCase()}`;

    const orderbook: Orderbook = {
      bids: (depth.bids || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookBid[],
      asks: (depth.asks || []).map(([price, qty]: [string, string]) => ({
        price: Number(price),
        volume: Number(qty),
      })) as OrderbookAsk[],
    };

    this.subscribeSubjs.get(key)?.next(orderbook);
  }

  /**
   * Преобразует resolution в формат COINEX period
   */
  private convertResolutionToCoinexPeriod(resolution: string): string {
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
      '480': '6hour', // Fallback (8hour не поддерживается)
      '720': '12hour',
      D: '1day',
      W: '1week',
      M: '1week', // Fallback (month не поддерживается)
    };
    return resolutionMap[resolution] || '1min';
  }

  subscribeCandles(symbol: string, resolution: string) {
    // COINEX не имеет прямого WebSocket канала для свечей
    // Используем state.update для получения последней цены
    const normalizedSymbol = symbol.toUpperCase();
    const key = `candles_${normalizedSymbol}_${resolution}`;
    const subj = this.createOrUpdateSubj<any>(key);

    // Подписываемся на state для получения обновлений цены
    this.subscribe({
      method: 'state.subscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const key = `candles_${normalizedSymbol}_${resolution}`;
    this.removeSubj(key);

    // Отписка от state (но только если нет других подписок на этот market)
    this.unsubscribe({
      method: 'state.unsubscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });

    this.removeSubscription({
      method: 'state.subscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = symbol.toUpperCase();
    const key = `depth_${normalizedSymbol}`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);

    // COINEX требует interval (merge interval), используем "0" для точных цен
    const interval = '0';
    const ifFull = true;

    this.subscribe({
      method: 'depth.subscribe',
      params: {
        market_list: [[normalizedSymbol, depth, interval, ifFull]],
      },
      id: Date.now(),
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const normalizedSymbol = symbol.toUpperCase();
    const key = `depth_${normalizedSymbol}`;
    this.removeSubj(key);

    const interval = '0';
    const ifFull = true;

    this.unsubscribe({
      method: 'depth.unsubscribe',
      params: {
        market_list: [[normalizedSymbol, depth, interval, ifFull]],
      },
      id: Date.now(),
    });

    this.removeSubscription({
      method: 'depth.subscribe',
      params: {
        market_list: [[normalizedSymbol, depth, interval, ifFull]],
      },
      id: Date.now(),
    });
  }

  subscribeFairPrice(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const key = `${normalizedSymbol}_fair`;
    const subj = this.createOrUpdateSubj<{ close?: number; price?: number }>(key);

    // Подписываемся на state для получения mark_price
    this.subscribe({
      method: 'state.subscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });

    return subj.pipe(share());
  }

  unsubscribeFairPrice(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const key = `${normalizedSymbol}_fair`;
    this.removeSubj(key);

    this.unsubscribe({
      method: 'state.unsubscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });

    this.removeSubscription({
      method: 'state.subscribe',
      params: { market_list: [[normalizedSymbol]] },
      id: Date.now(),
    });
  }
}

