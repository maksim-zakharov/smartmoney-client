import React, { useEffect, useState, useCallback, useMemo, FC } from 'react';
import { io, Socket } from 'socket.io-client';
import { moneyFormat } from './MainPage/MainPage';
import './ScreenerPage.css';
import { Chart } from './SoloTestPage/UpdatedChart.tsx';
import { LineStyle, Time } from 'lightweight-charts';
import { fetchCandlesFromAlor } from './utils.ts';
import dayjs from 'dayjs';

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

export const ScreenerChart: FC<{ symbol: string; lastCandle: any }> = ({ symbol, lastCandle }) => {
  const [levels, setLevels] = useState([]);

  const [{ from, to }] = useState({ from: dayjs().add(-21, 'day').unix(), to: dayjs().endOf('day').unix() });
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    if (lastCandle && candles.length) {
      const last = candles[candles.length - 1];
      if (last.time !== lastCandle.time) {
        candles.push(lastCandle);
      } else {
        candles[candles.length - 1] = lastCandle;
      }
      setCandles(candles);
    }
  }, [lastCandle, candles.length]);

  const _lastCandle = useMemo(() => (candles ? candles[candles.length - 1] : undefined), [candles]);

  const lineSerieses = useMemo(
    () =>
      _lastCandle
        ? levels
            .map((open) => ({
              options: {
                color: open.type === 'support' ? markerColors.bullColor : markerColors.bearColor, // Цвет линии
                priceLineVisible: false,
                lastValueVisible: false,
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
              },
              data: [
                { time: open.time as Time, value: open.price }, // начальная точка между свечками
                { time: _lastCandle?.time as Time, value: open.price }, // конечная точка между свечками
              ],
            }))
            .slice(0, 3)
        : [],
    [levels, _lastCandle],
  );

  useEffect(() => {
    fetchCandlesFromAlor(symbol, '3600', from, to)
      .then(setCandles)
      .catch(() => setCandles([]));
  }, [symbol, from, to]);

  useEffect(() => {
    fetch(`http://localhost:3000/levels?symbol=${symbol}`).then(async (res) => {
      if (res.ok) setLevels(await res.json());
      else setLevels([]);
    });
  }, [symbol]);

  return <Chart data={candles} lineSerieses={lineSerieses} primitives={[]} ema={[]} markers={[]} width={528} height={300} />;
};

export const ScreenerPage = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderBooks, setOrderBooks] = useState<Record<string, any>>({});
  const [candles, setCandles] = useState<Record<string, any>>({});
  const [minAmount, setMinAmount] = useState<number>(10000000);
  const [tickersStr, settickersStr] = useState<string>(
    'GAZP SBER SBERP LKOH NVTK GMKN ROSN TATN TATNP PLZL POLY MOEX MTSS MGNT SNGS SNGSP AFKS VTBR PHOR RUAL HYDR ALRS CHMF NLMK TRNFP YNDX OZON',
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const symbols = useMemo(() => tickersStr.split(' '), [tickersStr]);

  // Инициализация Socket.IO
  useEffect(() => {
    const newSocket = io('http://localhost:3000/orderbook', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('message', (data) => {
      const { type, symbol, ...payload } = JSON.parse(data) as any;
      if (type === 'orderbook')
        setOrderBooks((prev) => ({
          ...prev,
          [symbol]: payload,
        }));
      if (type === 'candles')
        setCandles((prev) => ({
          ...prev,
          [symbol]: payload,
        }));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Подписка на символы
  const subscribe = useCallback(
    (symbols: string[], minAmount: number) => {
      if (socket?.connected) {
        socket.emit('orderbook', {
          symbols,
          minAmount,
        });
      }
    },
    [socket?.connected],
  );

  // Загрузка списка акций
  useEffect(() => {
    subscribe(symbols, minAmount);
  }, [subscribe, minAmount, symbols]);

  // Обработчик изменения минимальной суммы
  const handleMinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = Number(e.target.value);
    setMinAmount(newAmount);
    subscribe(symbols, newAmount);
  };

  const handleTickersChange = (e) => {
    const tickers = e.target.value;
    settickersStr(tickers);
  };

  return (
    <div className="App">
      <h1>Order Books Monitor</h1>
      <div>
        <label>
          Минимальная сумма заявки (руб):
          <input type="number" value={minAmount} onChange={handleMinAmountChange} min="100000" step="100000" />
        </label>
      </div>
      <div>
        <label>
          Тикеры через пробел:
          <textarea rows={5} value={tickersStr} style={{ width: 400 }} onChange={handleTickersChange} />
        </label>
      </div>

      <div>
        <h2>Статус: {isConnected ? 'Подключено' : 'Отключено'}</h2>
      </div>

      <div className="order-books-container">
        {symbols
          // .filter((symbol) => orderBooks[symbol]?.bids?.length || orderBooks[symbol]?.asks?.length)
          .map((symbol) => (
            <div key={symbol} className="order-book">
              <h3>{symbol}</h3>

              <ScreenerChart symbol={symbol} lastCandle={candles[symbol]} />
              <div className="order-book_container">
                <div className="order-book-side">
                  <h4>Bids</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Цена</th>
                        <th>Кол-во</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderBooks[symbol]?.bids.map(([price, quantity], i) => (
                        <tr
                          key={`bid-${i}`}
                          style={{
                            backgroundColor: '#15785566',
                            color: 'rgb(44, 232, 156)',
                          }}
                        >
                          <td>{price.toFixed(2)}</td>
                          <td>{quantity}</td>
                          <td>{moneyFormat(price * quantity * orderBooks[symbol].lotSize)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="order-book-side">
                  <h4>Asks</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Цена</th>
                        <th>Кол-во</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderBooks[symbol]?.asks.map(([price, quantity], i) => (
                        <tr
                          key={`ask-${i}`}
                          style={{
                            backgroundColor: '#d1261b66',
                            color: 'rgb(255, 117, 132)',
                          }}
                        >
                          <td>{price.toFixed(2)}</td>
                          <td>{quantity}</td>
                          <td>{moneyFormat(price * quantity * orderBooks[symbol].lotSize)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
