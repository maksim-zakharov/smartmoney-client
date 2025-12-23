import { Subject } from 'rxjs';

export class KucoinWsClient {
  private subscribes = new Map<string, Subject<any>>([]);
  private ws: WebSocket;

  constructor() {
    this.connect();
  }

  private async connect() {
      fetch('https://5.35.13.149/kucoin/futures-auth-ws', {
      method: 'GET',
    })
      .then((r) => r.json())
      .then((res) => {
        const url = new URL(res.instanceServers[0].endpoint);
        url.searchParams.set('token', res.token);
        this.ws = new WebSocket(url.toString());

        let interval;
        this.ws.onopen = () => {
          console.log('WS connected');
          if (interval) clearInterval(interval);

          interval = setInterval(
            () =>
              this.ws.send(
                JSON.stringify({
                  id: Math.round(Date.now() / 1000),
                  type: 'ping',
                }),
              ),
            res.instanceServers[0].pingInterval,
          );
        };

        this.ws.onmessage = (ev: MessageEvent) => {
          const message = JSON.parse(ev.data as any);
          const { type, topic, subject, data } = message;
          
          // Обработка свечей
          if (subject === 'candle.stick' && type === 'message') {
            const { candles, time: timestamp } = data || {};
            const [t, o, c, h, l, v] = candles;
            this.subscribes.get(topic)?.next({
              open: Number(o),
              high: Number(h),
              low: Number(l),
              close: Number(c),
              time: t,
              timestamp,
            });
          }
          
          // Обработка стакана через subject (level2Depth)
          if (subject === 'level2' && type === 'message') {
            const { changes } = data || {};
            if (changes) {
              // Извлекаем символ из topic: /contractMarket/level2Depth20:BTCUSDTM -> BTCUSDTM
              const symbol = topic?.split(':')[1] || '';
              const key = `depth_${symbol}`;
              const subj = this.subscribes.get(key);
              
              if (subj) {
                // Обрабатываем изменения стакана
                const asks: Array<{ price: number; volume: number }> = [];
                const bids: Array<{ price: number; volume: number }> = [];
                
                changes.forEach(([side, price, size]: [string, string, string]) => {
                  const priceNum = Number(price);
                  const sizeNum = Number(size);
                  
                  if (side === 'sell' && sizeNum > 0) {
                    asks.push({ price: priceNum, volume: sizeNum });
                  } else if (side === 'buy' && sizeNum > 0) {
                    bids.push({ price: priceNum, volume: sizeNum });
                  }
                });
                
                if (asks.length > 0 || bids.length > 0) {
                  subj.next({ asks, bids });
                }
              }
            }
          }
          
          // Обработка полного снапшота стакана
          if (subject === 'level2' && type === 'message' && data?.asks && data?.bids) {
            const symbol = topic?.split(':')[1] || '';
            const key = `depth_${symbol}`;
            const subj = this.subscribes.get(key);
            
            if (subj) {
              const orderbookData = {
                asks: (data.asks || []).map(([price, size]: [string, string]) => ({
                  price: Number(price),
                  volume: Number(size),
                })),
                bids: (data.bids || []).map(([price, size]: [string, string]) => ({
                  price: Number(price),
                  volume: Number(size),
                })),
              };
              subj.next(orderbookData);
            }
          }
        };
        this.ws.onclose = () => {
          console.log('WS disconnected');
        };
      });
  }

  subscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}min`;
    const topic = `/contractMarket/limitCandle:${symbol}_${interval}`;
    this.subscribes.set(topic, subj);
    this.ws.send(
      JSON.stringify({
        id: Math.round(Date.now() / 1000),
        type: 'subscribe',
        topic,
        response: true,
      }),
    );

    return subj;
  }

  unsubscribeCandles(symbol: string, resolution: string) {
    const subj = new Subject<any>();
    const interval = `${resolution}min`;
    const topic = `/contractMarket/limitCandle:${symbol}_${interval}`;
    this.subscribes.set(topic, subj);
    this.ws.send(
      JSON.stringify({
        id: Math.round(Date.now() / 1000),
        type: 'unsubscribe',
        topic, //Topic needs to be unsubscribed. Some topics support to divisional unsubscribe the informations of multiple trading pairs through ",".
        privateChannel: false,
        response: true, //Whether the server needs to return the receipt information of this subscription or not. Set as false by default.
      }),
    );

    return subj;
  }

  subscribeOrderbook(symbol: string, depth: number) {
    const subj = new Subject<any>();
    const key = `depth_${symbol}`;
    this.subscribes.set(key, subj);
    
    // KuCoin использует формат topic для подписки на стакан
    const topic = `/contractMarket/level2Depth${depth}:${symbol}`;
    this.ws.send(
      JSON.stringify({
        id: Math.round(Date.now() / 1000),
        type: 'subscribe',
        topic,
        response: true,
      }),
    );

    return subj;
  }

  unsubscribeOrderbook(symbol: string, depth: number) {
    const key = `depth_${symbol}`;
    const subj = this.subscribes.get(key);
    if (subj) {
      subj.complete();
      this.subscribes.delete(key);
    }
    
    // KuCoin использует формат topic для отписки от стакана
    const topic = `/contractMarket/level2Depth${depth}:${symbol}`;
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          id: Math.round(Date.now() / 1000),
          type: 'unsubscribe',
          topic,
          response: true,
        }),
      );
    }
  }

  subscribeQuotes(symbol: string) {
    const subj = new Subject<{ lastPrice: number }>();
    const key = `sub.tickers_${symbol}`;
    this.subscribes.set(key, subj);
    this.ws.send(
      JSON.stringify({
        method: 'sub.tickers',
        param: { symbol },
      }),
    );

    return subj;
  }
}
