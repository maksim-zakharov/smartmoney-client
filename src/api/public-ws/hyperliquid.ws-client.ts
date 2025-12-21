import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { HyperliquidTimeframe } from './hyperliquid.models';

export class HyperliquidWsClient extends SubscriptionManager {
  constructor() {
    super({
      url: 'wss://api.hyperliquid.xyz/ws',
      name: 'Hyperliquid',
      pingRequest: () => ({ method: 'ping' }), // Correct ping message for Hyperliquid
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
    this.on('error', (m) => this.onError(m));
  }

  protected onError(error) {
    console.error('Hyperliquid WebSocket error:', JSON.stringify(error));
  }

  protected onOpen() {
    console.log(`Hyperliquid Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`Hyperliquid Websocket соединение разорвано`);
  }

  onMessage(ev) {
    const parsed = JSON.parse(ev.data as any);
    const channel = parsed.channel;
    const data = parsed.data;

    if (channel === 'error') {
      console.error('Hyperliquid WebSocket error:', JSON.stringify(data));
      return;
    }

    if (!channel) {
      return;
    }

    if (channel === 'subscriptionResponse') {
      switch (data.subscription.type) {
        case 'allMids':
          console.log(`Подписались на все тикеры`);
          return;
        case 'candle':
          console.log(
            `Подписались на свечи ${data.subscription.coin} интервала ${data.subscription.interval}`,
          );
          return;
        case 'activeAssetCtx':
          console.log(
            `Подписались на инфу ${data.subscription.coin}`,
          );
          return;
        default:
          return;
      }
    }

    let topic: string;

    if (channel === 'allMids') {
      topic = JSON.stringify({ type: 'allMids' });
      this.subscribeSubjs.get(topic)?.next(data.mids); // data is { mids: Record<string, string> }
    } else if (channel === 'candle') {
      topic = JSON.stringify({
        type: 'candle',
        coin: data.s,
        interval: data.i,
      });
      const mappedData = [data].map((c: any) => ({
        open: Number(c.o),
        high: Number(c.h),
        low: Number(c.l),
        close: Number(c.c),
        time: Math.round(c.t / 1000),
        timestamp: c.T,
        volume: Number(c.v),
        volumeUSDT: Number(c.v) * Number(c.c),
      }));
      this.subscribeSubjs.get(topic)?.next(mappedData[0]);
    } else if (channel === 'l2Book') {
      topic = JSON.stringify({ type: 'l2Book', coin: data.coin });
      const bids = data.levels[0].map((p: any) => ({
        price: Number(p.px),
        value: Number(p.sz),
      }));
      const asks = data.levels[1].map((p: any) => ({
        price: Number(p.px),
        value: Number(p.sz),
      }));
      this.subscribeSubjs.get(topic)?.next({ bids, asks });
    } else if (channel === 'activeAssetCtx') {
      topic = JSON.stringify({ type: 'activeAssetCtx', coin: data.coin });
      this.subscribeSubjs.get(topic)?.next(data.ctx);
    } else if (channel === 'bbo') {
      topic = JSON.stringify({ type: 'bbo', coin: data.coin });
      const bid = data.bbo[0] ? Number(data.bbo[0].px) : null;
      const ask = data.bbo[1] ? Number(data.bbo[1].px) : null;
      const mid = bid && ask ? (bid + ask) / 2 : null;
      this.subscribeSubjs.get(topic)?.next({ bid, ask, mid });
    }
  }

  subscribeCandles(coin: string, resolution: string) {
    // Маппинг ResolutionString на HyperliquidTimeframe
    const resolutionMap: Record<string, HyperliquidTimeframe> = {
      '1': HyperliquidTimeframe.Min1,
      '3': HyperliquidTimeframe.Min3,
      '5': HyperliquidTimeframe.Min5,
      '15': HyperliquidTimeframe.Min15,
      '30': HyperliquidTimeframe.Min30,
      '60': HyperliquidTimeframe.Hour1,
      '120': HyperliquidTimeframe.Hour2,
      '240': HyperliquidTimeframe.Hour4,
      '480': HyperliquidTimeframe.Hour8,
      '720': HyperliquidTimeframe.Hour12,
      'D': HyperliquidTimeframe.Day,
      'W': HyperliquidTimeframe.Week,
      'M': HyperliquidTimeframe.Month,
    };
    const hyperliquidTf = resolutionMap[resolution] || HyperliquidTimeframe.Min1;
    const sub = {
      type: 'candle',
      coin,
      interval: hyperliquidTf,
    };
    const topic = JSON.stringify(sub);
    const subj = this.createOrUpdateSubj<any>(topic);
    this.subscribe({
      method: 'subscribe',
      subscription: sub,
    });
    return subj;
  }

  unsubscribeCandles(coin: string, resolution: string) {
    const resolutionMap: Record<string, HyperliquidTimeframe> = {
      '1': HyperliquidTimeframe.Min1,
      '3': HyperliquidTimeframe.Min3,
      '5': HyperliquidTimeframe.Min5,
      '15': HyperliquidTimeframe.Min15,
      '30': HyperliquidTimeframe.Min30,
      '60': HyperliquidTimeframe.Hour1,
      '120': HyperliquidTimeframe.Hour2,
      '240': HyperliquidTimeframe.Hour4,
      '480': HyperliquidTimeframe.Hour8,
      '720': HyperliquidTimeframe.Hour12,
      'D': HyperliquidTimeframe.Day,
      'W': HyperliquidTimeframe.Week,
      'M': HyperliquidTimeframe.Month,
    };
    const hyperliquidTf = resolutionMap[resolution] || HyperliquidTimeframe.Min1;
    const sub = {
      type: 'candle',
      coin: coin.toUpperCase(),
      interval: hyperliquidTf,
    };
    const topic = JSON.stringify(sub);
    this.subscribe({
      method: 'unsubscribe',
      subscription: sub,
    });
    this.removeSubj(topic);
  }
}

