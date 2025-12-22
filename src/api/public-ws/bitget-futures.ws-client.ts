import { SubscriptionManager } from '../common/subscription-manager';
import { ResolutionString } from '../../assets/charting_library';
import { BitgetTimeframe, BitgetWSFTicker, BitgetWSTrade } from './bitget.models';
import { HistoryObject, Orderbook, OrderbookAsk, OrderbookBid, Alltrade, Side } from 'alor-api';

export class BitgetFuturesWsClient extends SubscriptionManager {
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({
      name: 'Bitget Futures',
      url: 'wss://ws.bitget.com/v2/ws/public',
    });

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
    this.on('error', (m) => this.onError(m));
  }

  protected onOpen() {
    console.log(`Bitget Futures Websocket соединение установлено`);
    this.startPing();
  }

  protected onClose() {
    console.log(`Bitget Futures Websocket соединение разорвано`);
    this.stopPing();
  }

  /**
   * Запускает отправку ping каждые 30 секунд согласно API Bitget
   */
  private startPing() {
    this.stopPing(); // Останавливаем предыдущий интервал, если есть

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Для Bitget отправляем просто строку "ping", а не JSON
        this.ws.send('ping');
      }
    }, 30000); // 30 секунд согласно документации Bitget
  }

  /**
   * Останавливает отправку ping
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  protected onError(error) {
    console.error('Bitget WebSocket error:', error);
  }

  onMessage(ev) {
    // Обработка ответа "pong" на ping
    if (ev.data === 'pong') {
      return;
    }

    const json = JSON.parse(ev.data as any);
    const { op, arg, action, event, data } = json;
    
    // Для orderbook arg может быть в массиве args
    const orderbookArg = arg || (json.args && json.args[0]);
    const key = JSON.stringify(orderbookArg || arg);
    
    // Подписались
    if (event === 'subscribe') {
      // Можно добавить логирование успешной подписки
      return;
    }
    
    // Данные: snapshot (первоначальный снимок) или update (обновления)
    if (action === 'snapshot' || action === 'update') {
      const channelArg = orderbookArg || arg;
      if (!channelArg || !channelArg.channel) {
        return;
      }
      
      if (channelArg.channel.includes('candle')) {
        this.emit('candles', json);
        data.forEach(([time, open, high, low, close, volume, amount]) =>
          this.subscribeSubjs.get(key)?.next({
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
            volume: Number(volume),
            volumeUSDT: Number(amount),
            time: Number(time) / 1000,
          } as HistoryObject),
        );
      } else if (channelArg.channel.includes('ticker')) {
        this.subscribeSubjs.get(key)?.next(data[0]);
      } else if (channelArg.channel.includes('account')) {
        this.emit('account', json);
        this.subscribeSubjs.get(key)?.next(data);
      } else if (channelArg.channel.includes('orders')) {
        this.emit('orders', json);
        this.subscribeSubjs.get(key)?.next(data);
      } else if (channelArg.channel.includes('positions')) {
        this.emit('positions', json);
        this.subscribeSubjs.get(key)?.next(data);
      } else if (channelArg.channel.includes('books')) {
        this.emit('orderbook', json);
        // data может быть массивом или объектом
        const orderbooks = Array.isArray(data) ? data : [data];
        orderbooks.forEach((orderbook) => {
          if (orderbook && orderbook.bids && orderbook.asks) {
            this.subscribeSubjs.get(key)?.next({
              bids: orderbook.bids.map(([p, v]) => ({
                price: Number(p),
                volume: Number(v),
              }) as OrderbookBid),
              asks: orderbook.asks.map(([p, v]) => ({
                price: Number(p),
                volume: Number(v),
              }) as OrderbookAsk),
            } as Orderbook);
          }
        });
      } else if (channelArg.channel.includes('trade')) {
        this.emit('trades', json);
        // Обрабатываем как snapshot, так и update для trades
        this.subscribeSubjs.get(key)?.next(data);
      }
    }
  }

  /**
   * Маппинг ResolutionString на BitgetTimeframe
   */
  private parseResolutionToBitgetTimeframe(resolution: ResolutionString): BitgetTimeframe {
    const map: Record<string, BitgetTimeframe> = {
      '1': BitgetTimeframe.Min1,
      '5': BitgetTimeframe.Min5,
      '15': BitgetTimeframe.Min15,
      '30': BitgetTimeframe.Min30,
      '1H': BitgetTimeframe.Hour1,
      '4H': BitgetTimeframe.Hour4,
      '4h': BitgetTimeframe.Hour4,
      '6H': BitgetTimeframe.Hour6,
      '12H': BitgetTimeframe.Hour12,
      '1D': BitgetTimeframe.Day,
      '1W': BitgetTimeframe.Week,
    };
    return map[resolution] || BitgetTimeframe.Min1;
  }

  subscribeTickers(symbol: string) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `ticker`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    const subj = this.createOrUpdateSubj<BitgetWSFTicker>(key);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  subscribeCandles(symbol: string, resolution: ResolutionString) {
    const bitgetTf = this.parseResolutionToBitgetTimeframe(resolution);
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `candle${bitgetTf}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    const subj = this.createOrUpdateSubj<HistoryObject>(key);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: ResolutionString) {
    const bitgetTf = this.parseResolutionToBitgetTimeframe(resolution);
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `candle${bitgetTf}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.removeSubj(key);
    this.unsubscribeFuturesChannel(arg);
  }

  subscribeOrderbook(symbol: string, depth: 1 | 5 | 15) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `books${depth}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    const subj = this.createOrUpdateSubj<Orderbook>(key);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `books${depth}`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.removeSubj(key);
    this.unsubscribeFuturesChannel(arg);
  }

  subscribeTrades(symbol: string) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `trade`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    const subj = this.createOrUpdateSubj<BitgetWSTrade[]>(key);
    this.subscribeFuturesChannel(arg);

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const arg = {
      instType: 'USDT-FUTURES',
      channel: `trade`,
      instId: symbol,
    };
    const key = JSON.stringify(arg);
    this.removeSubj(key);
    this.unsubscribeFuturesChannel(arg);
  }

  private subscribeFuturesChannel(arg: any) {
    this.subscribe({
      op: 'subscribe',
      args: [arg],
    });
  }

  private unsubscribeFuturesChannel(arg: any) {
    this.subscribe({
      op: 'unsubscribe',
      args: [arg],
    });
  }
}
