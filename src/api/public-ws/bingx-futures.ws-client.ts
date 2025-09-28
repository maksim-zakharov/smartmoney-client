import { SubscriptionManager, SubscriptionManagerEventTypes } from '../common/subscription-manager';
import { v4 as uuidv4 } from 'uuid';
import * as pako from 'pako';
import { Alltrade, HistoryObject, Orderbook, OrderbookAsk, OrderStatus, Side } from 'alor-api';
import { OrderbookBid } from 'alor-api/dist/models/models';
import jsonbig from 'json-bigint';
import * as CryptoJS from 'crypto-js';

const JSONbig = jsonbig({
  strict: true,
  storeAsString: true, // Преобразует BigInt в строки (рекомендуется)
});

async function login(apiKey: string, secretKey: string) {
  function getParameters(payload, timestamp, urlEncode?) {
    let parameters = '';
    for (const key in payload) {
      if (urlEncode) {
        parameters += key + '=' + encodeURIComponent(payload[key]) + '&';
      } else {
        parameters += key + '=' + payload[key] + '&';
      }
    }
    if (parameters) {
      parameters = parameters.substring(0, parameters.length - 1);
      parameters = parameters + '&timestamp=' + timestamp;
    } else {
      parameters = 'timestamp=' + timestamp;
    }
    return parameters;
  }

  const timestamp = Date.now();
  const parameters = getParameters({}, timestamp);
  const sign = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(parameters, secretKey));
  const urlEncodedParameters = getParameters({}, timestamp, true);
  const url = `https://open-api.bingx.com/openApi/user/auth/userDataStream?${urlEncodedParameters}&signature=${sign}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'X-BX-APIKEY': apiKey,
    },
  }).then((r) => r.json());
  return resp.listenKey;
}

const eventTypesMap: Record<string, SubscriptionManagerEventTypes> = {
  ORDER_TRADE_UPDATE: 'orders',
  '@trade': 'trades',
  '@depth': 'orderbook',
  '@kline': 'candles',
  ACCOUNT_UPDATE: 'account',
};

export class BingXFuturesWsClient extends SubscriptionManager {
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(apiKey?: string, secretKey?: string) {
    super({
      name: 'BingX Futures',
      loginPromise: () => {
        console.log('🔐 Login request sent');
        const url = new URL('https://176.114.69.4/bingx/login');
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('secretKey', secretKey);
        return fetch(url)
          .then((r) => r.json())
          .then(({ listenKey }) => {
            console.log(`✅ Login successful: ${listenKey}`);
            return `wss://open-api-swap.bingx.com/swap-market?listenKey=${listenKey}`;
          });
      },
    });

    this.apiKey = apiKey;
    this.secretKey = secretKey;

    this.on('connect', () => this.onOpen());
    this.on('disconnect', () => this.onClose());
    this.on('message', (m) => this.onMessage(m));
  }

  protected onOpen() {
    console.log(`BingX Futures Websocket соединение установлено`);
  }

  protected onClose() {
    console.log(`BingX Futures Websocket соединение разорвано`);
  }

  async onMessage(ev) {
    let inputData;

    // Преобразуем различные форматы в Uint8Array
    if (ev.data instanceof ArrayBuffer) {
      inputData = new Uint8Array(ev.data);
    } else if (ev.data instanceof Blob) {
      const arrayBuffer = await ev.data.arrayBuffer();
      inputData = new Uint8Array(arrayBuffer);
    } else {
      inputData = new Uint8Array(ev.data);
    }
    // Используем pako для распаковки
    const decompressed = pako.ungzip(inputData);
    const decodedMsg = new TextDecoder('utf-8').decode(decompressed);
    console.debug(decodedMsg);
    if (decodedMsg === 'Ping') {
      this.subscribe('Pong');
      console.debug('Pong');
    } else {
      const res = JSONbig.parse(decodedMsg);
      const { id, code, dataType, data } = res;

      const statusMap: Record<string, OrderStatus | any> = {
        NEW: OrderStatus.Working,
        CANCELED: OrderStatus.Canceled,
        PARTIALLY_FILLED: OrderStatus.Filled,
      };

      if (!dataType) {
        this.emit(eventTypesMap[res.e], res);
        if (res.e === 'SNAPSHOT') {
        } else if (res.e === 'ORDER_TRADE_UPDATE') {
          // const order = {
          //   id: res.o.i,
          //   symbol: res.o.s,
          //   side: res.o.S === 'SELL' ? Side.Sell : Side.Buy,
          //   type: res.o.o === 'LIMIT' ? OrderType.Limit : OrderType.Market,
          //   qty: Number(res.o.q),
          //   price: Number(res.o.p),
          //   status: statusMap[res.o.X] || res.o.X,
          // } as any;
          // console.log(JSON.stringify(order));
        } else if (res.e === 'ACCOUNT_UPDATE') {
          // const positions = res.a.P.map((p) => ({
          //   qty: Number(p.pa),
          //   symbol: p.s,
          //   price: Number(p.ep),
          //   side: p.ps === 'SHORT' ? Side.Sell : Side.Buy,
          // }));
          // console.log(JSON.stringify(positions));
        }
        // else console.log(JSON.stringify(res));
        return;
      }

      if (dataType.includes('@kline')) {
        this.emit(eventTypesMap['@kline'], res);
        this.subscribeSubjs.get(dataType)?.next({
          open: Number(data[0].o),
          high: Number(data[0].h),
          low: Number(data[0].l),
          close: Number(data[0].c),
          volume: Number(data[0].v),
          time: Number(data[0].T / 1000),
        } as HistoryObject);
      }

      if (dataType.includes('@depth')) {
        this.emit(eventTypesMap['@depth'], res);
        this.subscribeSubjs.get(dataType)?.next({
          bids: data.bids.map(([p, v]) => ({ price: Number(p), volume: Number(v) }) as OrderbookBid),
          asks: data.asks.map(([p, v]) => ({ price: Number(p), volume: Number(v) }) as OrderbookAsk),
        } as Orderbook);
      }

      if (dataType.includes('@trade')) {
        this.emit(eventTypesMap['@trade'], res);
        data.forEach((d) =>
          this.subscribeSubjs.get(dataType)?.next({
            price: Number(d.p),
            qty: Number(d.q),
            timestamp: Number(d.T),
            side: d.m ? Side.Sell : Side.Buy,
          } as Alltrade),
        );
      }
    }
  }

  subscribeCandles(symbol: string, interval: string) {
    const key = `${symbol}@kline_${interval}`;
    const subj = this.createOrUpdateSubj(key);
    this.subscribeFuturesChannel(key);

    return subj;
  }

  unsubscribeCandles(symbol: string, interval: string) {
    const key = `${symbol}@kline_${interval}`;
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  subscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100) {
    const key = `${symbol}@depth${depth}@200ms`;
    const subj = this.createOrUpdateSubj<Orderbook>(key);
    this.subscribeFuturesChannel(key);

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: 5 | 10 | 20 | 50 | 100) {
    const key = `${symbol}@depth${depth}@200ms`;
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  subscribeTrades(symbol: string) {
    const key = `${symbol}@trade`;
    const subj = this.createOrUpdateSubj<Alltrade>(key);
    this.subscribeFuturesChannel(key);

    return subj;
  }

  unsubscribeTrades(symbol: string) {
    const key = `${symbol}@trade`;
    this.subscribeSubjs.delete(key);
    this.unsubscribeFuturesChannel(key);
  }

  private subscribeFuturesChannel(dataType: any) {
    this.subscribe({
      id: uuidv4(),
      reqType: 'sub',
      dataType,
    });
  }

  private unsubscribeFuturesChannel(dataType: any) {
    this.subscribe({
      id: uuidv4(),
      reqType: 'unsub',
      dataType,
    });
  }
}
