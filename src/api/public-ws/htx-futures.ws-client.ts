import { share } from 'rxjs';
import { SubscriptionManager } from '../common/subscription-manager';
import { Orderbook, OrderbookAsk, OrderbookBid } from 'alor-api';
import * as pako from 'pako';

export class HtxFuturesWsClient extends SubscriptionManager {
  constructor() {
    super({
      name: 'HTX Futures',
      url: 'wss://api.hbdm.vn/linear-swap-ws',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`HTX Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    console.log(`HTX Futures Websocket соединение установлено`);
  }

  async onMessage(ev: MessageEvent) {
    let parsed;
    try {
      let message;
      // Преобразуем различные форматы в Uint8Array
      if (ev.data instanceof ArrayBuffer) {
        message = new Uint8Array(ev.data);
      } else if (ev.data instanceof Blob) {
        const arrayBuffer = await ev.data.arrayBuffer();
        message = new Uint8Array(arrayBuffer);
      } else {
        message = new Uint8Array(ev.data);
      }
      const decompressed = pako.ungzip(message);
      const decodedMsg = new TextDecoder('utf-8').decode(decompressed);
      parsed = JSON.parse(decodedMsg);
    } catch (error) {
      console.error(`Failed to parse WebSocket message: ${error.message}. Data: ${String(ev.data).substring(0, 200)}`);
      return;
    }
    try {
      // Обработка ping/pong
      if (parsed.ping) {
        // Отправляем pong с текущим временем
        const currentTime = Date.now();
        this.ws.send(JSON.stringify({ pong: currentTime }));
        return;
      }

      // Обработка свечей (kline)
      if (parsed.ch && parsed.ch.startsWith('market.') && parsed.ch.includes('.kline.')) {
        const parts = parsed.ch.split('.');
        const symbol = parts[1]; // contract_code (например, DASHUSDT)
        const interval = parts[3]; // 1min, 5min и т.д.

        if (parsed.tick) {
          const tick = parsed.tick;
          const key = `kline_${symbol}_${interval}`;
          this.subscribeSubjs.get(key)?.next({
            open: Number(tick.open),
            high: Number(tick.high),
            low: Number(tick.low),
            close: Number(tick.close),
            time: Math.round(tick.id),
            timestamp: tick.id * 1000,
          });
        }
        return;
      }

      // Обработка стакана (depth)
      if (parsed.ch && parsed.ch.startsWith('market.') && parsed.ch.endsWith('.depth.step0') && parsed.tick) {
        const tick = parsed.tick;
        const orderbook: Orderbook = {
          bids: (tick.bids || []).map(([price, qty]: [number, number]) => ({
            price: Number(price),
            volume: Number(qty),
          })) as OrderbookBid[],
          asks: (tick.asks || []).map(([price, qty]: [number, number]) => ({
            price: Number(price),
            volume: Number(qty),
          })) as OrderbookAsk[],
        };
        this.subscribeSubjs.get(parsed.ch)?.next(orderbook);
        return;
      }
    } catch (error) {
      console.error('HTX WebSocket message error:', error);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToHtxInterval(resolution);
    // HTX использует формат без дефиса: DASH-USDT -> DASHUSDT (верхний регистр)
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const channel = `market.${symbolUpper}.kline.${interval}`;
    const key = `kline_${symbolUpper}_${interval}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      sub: channel,
      id: `kline_${Date.now()}`,
    });

    return subj.pipe(share());
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = this.convertResolutionToHtxInterval(resolution);
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const channel = `market.${symbolUpper}.kline.${interval}`;
    const key = `kline_${symbolUpper}_${interval}`;
    this.removeSubj(key);

    this.unsubscribe({
      unsub: channel,
      id: `kline_${Date.now()}`,
    });
  }

  subscribeOrderbook(symbol: string, depth: number = 20) {
    const channel = `market.${symbol}.depth.step0`;
    const subj = this.createOrUpdateSubj<Orderbook>(channel);

    this.subscribe({
      sub: channel,
      id: `depth_${Date.now()}`,
    });

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number = 20) {
    const symbolUpper = symbol.toUpperCase().replace('-', ''); // DASH-USDT -> DASHUSDT
    const channel = `market.${symbolUpper}.depth.step0`;
    const key = `depth_${symbolUpper}`;
    this.removeSubj(key);

    this.unsubscribe({
      unsub: channel,
      id: `depth_${Date.now()}`,
    });
  }

  private convertResolutionToHtxInterval(resolution: string): string {
    const resolutionMap: Record<string, string> = {
      '1': '1min',
      '3': '3min',
      '5': '5min',
      '15': '15min',
      '30': '30min',
      '60': '60min',
      '120': '2hour',
      '240': '4hour',
      '360': '6hour',
      '480': '8hour',
      '720': '12hour',
      D: '1day',
      W: '1week',
      M: '1mon',
    };
    return resolutionMap[resolution] || '1min';
  }

  subscribeQuotes(symbol: string) {
    const symbolLower = symbol.toLowerCase().replace('-', ''); // DASH-USDT -> dashusdt
    const channel = `market.${symbolLower}.ticker`;
    const key = `ticker_${symbolLower}`;
    const subj = this.createOrUpdateSubj(key);

    this.subscribe({
      sub: channel,
      id: `ticker_${Date.now()}`,
    });

    return subj;
  }
}
