import { Subject } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { AsterTimeframe } from './aster.models';

export class AsterWsClient extends SubscriptionManager {
  constructor() {
    super({
      url: 'wss://fstream.asterdex.com/ws',
      name: 'Aster',
      pingRequest: () => ({}), // Send empty for keep-alive if needed
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log(`Aster Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`Aster Websocket соединение разорвано`);
  }

  onMessage(ev) {
    const parsed = JSON.parse(ev.data as any);
    if (parsed.id) {
      // Response to subscribe
      return;
    }
    const stream = parsed.stream || '';
    const data = parsed.data;

    if (parsed.e === 'kline') {
      const { o, h, l, c, t, v, q, i } = parsed.k;
      const timestamp = parsed.E;

      const key = `${parsed.s.toLowerCase()}@kline_${i}`;
      this.subscribeSubjs.get(key)?.next({
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        time: Math.round(t / 1000),
        volume: Number(v),
        volumeUSDT: Number(q),
        timestamp,
      });
    } else if (stream.includes('@ticker') || stream.includes('@miniTicker')) {
      this.subscribeSubjs.get(stream)?.next(data);
    } else if (stream.includes('@markPrice')) {
      this.subscribeSubjs.get(stream)?.next(data);
    } else if (stream.includes('@depth')) {
      const { b: bids, a: asks } = data;
      this.subscribeSubjs.get(stream)?.next({
        bids: bids.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
        asks: asks.map((p) => ({ price: Number(p[0]), value: Number(p[1]) })),
      });
    } else if (Array.isArray(parsed) && parsed[0].e === '24hrMiniTicker') {
      this.subscribeSubjs.get('24hrMiniTicker')?.next(parsed);
    } else if (Array.isArray(parsed) && parsed[0].e === '24hrTicker') {
      this.subscribeSubjs.get('24hrTicker')?.next(parsed);
    } else if (Array.isArray(parsed) && parsed[0].e === 'markPriceUpdate') {
      this.subscribeSubjs.get('markPriceUpdate')?.next(parsed);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    // Маппинг ResolutionString на AsterTimeframe
    const resolutionMap: Record<string, AsterTimeframe> = {
      '1': AsterTimeframe.Min1,
      '3': AsterTimeframe.Min3,
      '5': AsterTimeframe.Min5,
      '15': AsterTimeframe.Min15,
      '30': AsterTimeframe.Min30,
      '60': AsterTimeframe.Hour1,
      '120': AsterTimeframe.Hour2,
      '240': AsterTimeframe.Hour4,
      '480': AsterTimeframe.Hour8,
      '720': AsterTimeframe.Hour12,
      'D': AsterTimeframe.Day,
      'W': AsterTimeframe.Week,
      'M': AsterTimeframe.Month,
    };
    const asterTf = resolutionMap[resolution] || AsterTimeframe.Min1;
    const args = `${symbol.toLowerCase()}@kline_${asterTf}`;
    const subj = this.createOrUpdateSubj<any>(args);
    this.subscribe({
      method: 'SUBSCRIBE',
      params: [args],
      id: Date.now(),
    });
    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const resolutionMap: Record<string, AsterTimeframe> = {
      '1': AsterTimeframe.Min1,
      '3': AsterTimeframe.Min3,
      '5': AsterTimeframe.Min5,
      '15': AsterTimeframe.Min15,
      '30': AsterTimeframe.Min30,
      '60': AsterTimeframe.Hour1,
      '120': AsterTimeframe.Hour2,
      '240': AsterTimeframe.Hour4,
      '480': AsterTimeframe.Hour8,
      '720': AsterTimeframe.Hour12,
      'D': AsterTimeframe.Day,
      'W': AsterTimeframe.Week,
      'M': AsterTimeframe.Month,
    };
    const asterTf = resolutionMap[resolution] || AsterTimeframe.Min1;
    const args = `${symbol.toLowerCase()}@kline_${asterTf}`;
    this.subscribe({
      method: 'UNSUBSCRIBE',
      params: [args],
      id: Date.now(),
    });
    this.removeSubj(args);
  }
}

