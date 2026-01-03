import { Subject } from 'rxjs';
import crypto from 'crypto';
import { SubscriptionManager } from '../common/subscription-manager';

enum GateFuturesChannelEnum {
  // API
  Login = 'futures.login',

  Tickers = 'futures.tickers',
  Orderbook = 'futures.order_book', // Старый способ подписки
  OrderbookNew = 'futures.obu', // Новый способ подписки
  Candlesticks = 'futures.candlesticks',
}

enum GateSpotEventEnum {
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
  Api = 'api',
  Update = 'update',
}

export class GateFuturesWsClient extends SubscriptionManager {
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(apiKey?: string, secretKey?: string) {
    super({
      url: `wss://fx-ws.gateio.ws/v4/ws/usdt`,
      name: 'Gate Futures',
      pingRequest: () => ({
        time: Math.round(Date.now() / 1000),
        channel: 'futures.ping',
      }),
    });

    this.apiKey = apiKey;
    this.secretKey = secretKey;

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onClose() {
    console.log(`Gate Futures Websocket соединение разорвано`);
  }

  protected onOpen() {
    this.futuresApiRequest(GateFuturesChannelEnum.Login);
    console.log(`Gate Futures Websocket соединение установлено`);
  }

  protected onMessage(ev) {
    const res = JSON.parse(ev.data as any);

    if (res.header?.event === 'api') {
      return this.onApiEvent(res);
    }

    if (res.event === 'update') {
      return this.onUpdateEvent(res);
    }

    if (res.event === 'all') {
      return this.onAllEvent(res);
    }
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}m`;
    const key = `${interval}_${symbol}`;
    this.subscribeSubjs.set(key, subj);
    this.subscribeFuturesChannel(GateFuturesChannelEnum.Candlesticks, [interval, symbol]);

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: 50 | 400) {
    const subj = new Subject<any>();
    // Используем символ как ключ, так как в ответе приходит именно символ
    const key = symbol;
    this.subscribeSubjs.set(key, subj);
    // Старый способ подписки: payload: ["BTC_USD", "20", "0"]
    // где "0" = 100ms интервал, "1" = 1000ms
    // depth конвертируем в строку, но ограничиваем до 20 для старого API
    const depthForOldApi = Math.min(depth, 20).toString();
    this.subscribeFuturesChannel(GateFuturesChannelEnum.Orderbook, [symbol, depthForOldApi, "0"]);

    return subj;
  }

  subscribeQuotes(symbol: string) {
    const subj = new Subject<{ lastPrice: number }>();
    const key = `${GateFuturesChannelEnum.Tickers}.${symbol}`;
    this.subscribeSubjs.set(key, subj);

    this.subscribe({
      channel: GateFuturesChannelEnum.Tickers,
      event: 'subscribe',
      payload: [symbol],
    });

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const interval = `${resolution}m`;
    const key = `${interval}_${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      time: Math.round(Date.now() / 1000),
      channel: GateFuturesChannelEnum.Candlesticks,
      event: GateSpotEventEnum.Unsubscribe,
      payload: [interval, symbol],
    });

    this.removeSubscription({
      time: Math.round(Date.now() / 1000),
      channel: GateFuturesChannelEnum.Candlesticks,
      event: GateSpotEventEnum.Subscribe,
      payload: [interval, symbol],
    });
  }

  unsubscribeOrderbook(symbol: string, depth: 50 | 400) {
    const key = symbol;
    this.removeSubj(key);
    const depthForOldApi = Math.min(depth, 20).toString();
    
    // Отправляем запрос на отписку в том же формате, что и подписка
    this.unsubscribeFuturesChannel(GateFuturesChannelEnum.Orderbook, [symbol, depthForOldApi, "0"]);

    this.removeSubscription({
      time: Math.round(Date.now() / 1000),
      channel: GateFuturesChannelEnum.Orderbook,
      event: GateSpotEventEnum.Subscribe,
      payload: [symbol, depthForOldApi, "0"],
    });
  }

  unsubscribeQuotes(symbol: string) {
    const key = `${GateFuturesChannelEnum.Tickers}.${symbol}`;
    this.removeSubj(key);
    this.unsubscribe({
      channel: GateFuturesChannelEnum.Tickers,
      event: GateSpotEventEnum.Unsubscribe,
      payload: [symbol],
    });

    this.removeSubscription({
      channel: GateFuturesChannelEnum.Tickers,
      event: 'subscribe',
      payload: [symbol],
    });
  }

  // Функция для отправки ордера
  sendOrder(params: { symbol: string; price: string; size: number; tif?: string; close?: boolean }) {
    const order: any = {
      // text: 't-my-custom-id',
      contract: params.symbol,
      size: params.size,
      price: params.price.toString(),
    };

    if (params.tif) order.tif = params.tif;
    if (params.close) order.close = params.close;

    this.futuresApiRequest('futures.order_place', order);
  }

  private futuresApiRequest = (channel: string, payload = {}) => {
    const timestamp = Math.floor(Date.now() / 1000);

    const event = 'api';

    const param_json = JSON.stringify(payload);

    const req_id = (Date.now() - 1).toString();
    const message = `${event}\n${channel}\n${param_json}\n${timestamp}`;

    const signature = crypto.createHmac('sha512', this.secretKey).update(message).digest('hex');

    this.subscribe({
      time: timestamp,
      channel,
      event,
      payload: {
        api_key: this.apiKey,
        signature: signature,
        timestamp: timestamp.toString(),
        req_id,
        req_param: payload,
      },
    });
  };

  private subscribeFuturesChannel(channel: GateFuturesChannelEnum, payload: any) {
    this.subscribe({
      time: Math.round(Date.now() / 1000),
      channel: channel,
      event: GateSpotEventEnum.Subscribe,
      payload,
    });
  }

  private unsubscribeFuturesChannel(channel: GateFuturesChannelEnum, payload: any) {
    this.unsubscribe({
      time: Math.round(Date.now() / 1000),
      channel: channel,
      event: GateSpotEventEnum.Unsubscribe,
      payload,
    });
  }

  private onUpdateEvent(res: any) {
    const { channel, result, time, event } = res;
    if (event !== 'update') return;

    switch (channel) {
      case GateFuturesChannelEnum.Candlesticks:
        const { o, h, l, c, t, n } = result[0] || {};
        this.subscribeSubjs.get(n)?.next({
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          time: t,
          timestamp: time,
        });
        break;
      case GateFuturesChannelEnum.Tickers:
        result.forEach((r) => {
          const { contract } = r;
          const key = `${GateFuturesChannelEnum.Tickers}.${contract}`;
          this.subscribeSubjs.get(key)?.next({ ...r, lastPrice: Number(r.last) });
        });
        break;
    }
  }

  private onAllEvent(res: any) {
    const { channel, result, time, event } = res;
    if (event !== 'all') return;

    switch (channel) {
      case GateFuturesChannelEnum.Orderbook:
        // Старый формат: result содержит объект с contract, asks, bids
        if (!result || !result.contract) break;
        const { contract, asks, bids } = result;
        const subj = this.subscribeSubjs.get(contract);
        if (subj) {
          subj.next({
            bids: (bids || []).map((item: any) => ({
              price: Number(item.p),
              value: Number(item.s),
            })),
            asks: (asks || []).map((item: any) => ({
              price: Number(item.p),
              value: Number(item.s),
            })),
          });
        }
        break;
    }
  }

  private onApiEvent(res: any) {
    // Проверка успешной аутентификации
    if (res.header.channel === 'futures.login' && res.data.result?.uid) {
      console.log('Futures Аутентификация успешна');
    }

    // Проверка результата создания ордера
    if (res.header.channel === 'futures.order_place') {
      if (res.data.errs) {
        console.error(res.data.errs.message);
      } else if (res.data.result.user) {
        // console.log('Получено сообщение:', message);
        console.log(`[${res.data.result.contract}] Ордер создан`);
      }
    }
    if (res.header.channel === 'futures.order_cancel_cp') {
      if (res.data.errs) {
        console.error(res.data.errs.message);
      } else {
        // console.log('Получено сообщение:', message);
        console.log('Ордер отменен');
      }
    }
  }
}
