import { Button, Card, Checkbox, Col, ColorPicker, Form, Input, Layout, Row, Slider, Statistic, Table, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import { TickerSelect } from '../../TickerSelect';
import dayjs, { type Dayjs } from 'dayjs';
// import { Chart } from '../../Chart';
import { Chart } from '../../SoloTestPage/UpdatedChart';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateMultiple, createRectangle2, getCommonCandles } from '../../utils';
import { calculateBollingerBands, calculateCandle, symbolFuturePairs } from '../../../symbolFuturePairs';
import { LineStyle, Time } from 'lightweight-charts';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { useGetHistoryQuery, useGetSecurityByExchangeAndSymbolQuery } from '../../api/alor.api';
import { DatesPicker } from '../../DatesPicker';
import { useAppSelector } from '../../store.ts';
import { FullscreenOutlined } from '@ant-design/icons';
import { useTdCandlesQuery } from '../../twelveApi.ts';
import { useCandlesQuery } from '../../api.ts';

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

const storageState = localStorage.getItem('colors') ? JSON.parse(localStorage.getItem('colors')) : {};
const defaultState = Object.assign(
  {
    ema: 'rgb(255, 186, 102)',
    bbEma: 'rgb(255, 186, 102)',
    zeroLevel: 'rgb(255, 186, 102)',
  },
  storageState,
);

// useIntersectionObserver.js
export const useIntersectionObserver = (options) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isIntersecting];
};

export const StatArbPage = ({
  tickerStock,
  _tickerFuture,
  leftExchange = 'MOEX',
  righExchange = 'MOEX',
  onlyChart,
  height,
  seriesType = 'Candlestick',
  delimeter = 'div', // : 'div' | 'minus'
  multi = 100,
}: any) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tf = searchParams.get('tf') || '300';
  const fromDate = searchParams.get('fromDate') || dayjs().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || dayjs().add(1, 'day').unix();

  const minProfit = Number(searchParams.get('minProfit') || 0.005);
  const setMinProfit = (value) => {
    searchParams.set('minProfit', value);
    setSearchParams(searchParams);
  };

  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);

  const [colors, setColors] = useState(defaultState);

  useEffect(() => {
    localStorage.setItem('colors', JSON.stringify(colors));
  }, [colors]);

  const bbMiltiplier = Number(searchParams.get('bbMiltiplier') || 2);
  const setbbMiltiplier = (value) => {
    searchParams.set('bbMiltiplier', value);
    setSearchParams(searchParams);
  };

  const emaBBPeriod = Number(searchParams.get('emaBBPeriod') || 200);
  const setEmaBBPeriod = (value) => {
    searchParams.set('emaBBPeriod', value);
    setSearchParams(searchParams);
  };

  const checkboxValues = new Set(
    (searchParams.get('checkboxes') || 'tradeOB,BOS,swings,showEndOB,showHiddenSwings,showPositions').split(','),
  );
  const setCheckboxValues = (values) => {
    searchParams.set('checkboxes', values.join(','));
    setSearchParams(searchParams);
  };

  const tickerFuture = _tickerFuture;

  const { data: security } = useGetSecurityByExchangeAndSymbolQuery({
    symbol: tickerStock,
    exchange: 'MOEX',
  });
  const isSecondForex = tickerFuture.includes('_xp');

  const { data: _futureData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: tickerFuture,
      exchange: leftExchange,
    },
    {
      pollingInterval: 5000,
      skip: !tickerFuture || !apiAuth || isSecondForex,
    },
  );

  const { data: xpCandles = [] } = useCandlesQuery(
    {
      symbol: tickerFuture,
      from: fromDate,
      to: toDate,
    },
    {
      pollingInterval: 5000,
      skip: !isSecondForex,
    },
  );

  const futureData = xpCandles?.length ? xpCandles : _futureData?.history || [];

  const futureDataRef = futureData;

  // const [futureDataRef, setfutureDataRef] = useState<HistoryObject[]>([]);

  // useEffect(() => {
  //   setfutureDataRef(futureData);
  // }, [futureData]);

  // useOrderbook({
  //   tf,
  //   from: futureData[futureData.length - 1]?.time,
  //   code: tickerFuture,
  //   handler: (candle) => {
  //     setfutureDataRef((prevState) => {
  //       const existIndex = prevState.findIndex((c) => c.time === candle.time);
  //       if (existIndex === -1) {
  //         return [...prevState, candle];
  //       } else {
  //         const newData = prevState.slice(); // Клонируем массив
  //         newData[existIndex] = candle;
  //         return newData;
  //       }
  //     });
  //   },
  // });

  const isFirstForex = tickerStock.includes(':');

  const { data: _stockData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: tickerStock,
      exchange: righExchange,
    },
    {
      pollingInterval: 5000,
      skip: !tickerStock || !apiAuth || isFirstForex,
    },
  );

  const fxTfMap = {
    '60': '1min',
    '300': '5min',
    '900': '15min',
    '1800': '30min',
    // '900': '45min',
    '3600': '1h',
    // '900': '2h',
    '14400': '4h',
    // '900': '8h',
    D: '1day',
    // '900': '1week',
  };

  const { data: fxFirstData } = useTdCandlesQuery(
    {
      start_date: dayjs(fromDate * 1000).format('YYYY-MM-DD'),
      outputsize: 5000,
      symbol: tickerStock.split(':')[1],
      interval: fxTfMap[tf],
      apikey: '20dc749373754927b09d95723d963e88',
    },
    {
      pollingInterval: 5000,
      skip: !isFirstForex,
    },
  );

  const fxThirdCandles = (fxFirstData?.values || []).map((v) => ({
    time: dayjs(v.datetime).unix(),
    open: Number(v.open),
    close: Number(v.close),
    low: Number(v.low),
    high: Number(v.high),
  }));

  const stockData = fxThirdCandles?.length ? fxThirdCandles : _stockData?.history || [];
  const stockDataRef = stockData;

  // const [stockDataRef, setstockDataRef] = useState<HistoryObject[]>([]);

  // useEffect(() => {
  //   setstockDataRef(stockData);
  // }, [stockData]);

  // useOrderbook({
  //   tf,
  //   from: stockData[stockData.length - 1]?.time,
  //   code: tickerStock,
  //   handler: (candle) => {
  //     setstockDataRef((prevState) => {
  //       const existIndex = prevState.findIndex((c) => c.time === candle.time);
  //       if (existIndex === -1) {
  //         return [...prevState, candle];
  //       } else {
  //         const newData = prevState.slice(); // Клонируем массив
  //         newData[existIndex] = candle;
  //         return newData;
  //       }
  //     });
  //   },
  // });

  const lotsize = security?.lotsize || 1;
  const fee = 0.04 / 100;

  const multiple = useMemo(
    () =>
      multi ||
      (stockDataRef?.length && futureDataRef?.length
        ? calculateMultiple(stockDataRef[stockDataRef.length - 1].close, futureDataRef[futureDataRef.length - 1].close)
        : 0),
    [stockDataRef, futureDataRef, multi],
  );

  const stockTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.stockSymbol), []);
  const futureTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.futuresSymbol), []);

  const data = useMemo(() => {
    if (stockDataRef?.length && futureDataRef?.length) {
      const { filteredStockCandles, filteredFuturesCandles } = getCommonCandles(stockDataRef, futureDataRef);

      const res = filteredFuturesCandles
        .map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple), delimeter))
        .filter(Boolean);

      if (seriesType === 'Line') {
        return res.map((r) => ({ ...r, value: r.close }));
      }

      return res;
    }

    return [];
  }, [stockDataRef, futureDataRef, seriesType, multiple, delimeter]);

  const BB = useMemo(
    () =>
      calculateBollingerBands(
        data.map((h) => h.close),
        emaBBPeriod,
        bbMiltiplier,
      ),
    [data, emaBBPeriod, bbMiltiplier],
  );

  const BB2 = useMemo(
    () =>
      calculateBollingerBands(
        data.map((h) => h.close),
        emaBBPeriod,
        bbMiltiplier + 1,
      ),
    [data, emaBBPeriod, bbMiltiplier],
  );

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const sellPositions = [];
    const buyPositions = [];

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      const now = dayjs(candle.time * 1000).format('HH:mm');
      const isDaySession = now >= '09:00' && now <= '18:39';

      // Либо не микс - либо если микс - дейсессия - можем открыть сделку
      const canMixTrade = tickerStock !== 'IMOEXF' || isDaySession;

      // Если не коснулись верха - продаем фьюч, покупаем акцию

      if (candle.high >= BB.upper[i] && canMixTrade && (!minProfit || candle.high / BB.middle[i] > 1 + minProfit)) {
        let currentPosition: any = {
          side: 'short',
          openPrice: candle.high,
          stopLoss: candle.high,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];

          const cantClose = tickerStock === 'IMOEXF' ? candle.low > BB.lower[j] && isDaySession : candle.low > BB.middle[j];

          const cantClose2 = !tickerFuture.includes('_xp') ? candle.low > BB.middle[j] : candle.low > BB.lower[j];

          if (candle.low > BB.middle[j]) {
            // if (cantClose) {
            continue;
          }

          currentPosition = {
            ...currentPosition,
            closeTime: candle.time,
            takeProfit: candle.open,
            closePrice: candle.open,
          };

          currentPosition.fee = canMixTrade ? 0 : fee * 200;

          const spread = 0.01;

          const percent = currentPosition.openPrice / currentPosition?.takeProfit;
          currentPosition.newPnl = (percent - 1) * 100 - currentPosition.fee - spread * 2;
          sellPositions.push(currentPosition);

          i = j - 1;

          break;
        }
        // Если было закрытие - продолжаем цикл
        if (currentPosition.closeTime) {
          continue;
        }
      }
      // if (candle.low <= BB.lower[i] && tickerStock !== 'IMOEXF' && (!minProfit || candle.high / BB.middle[i] > 1 + minProfit)) {
      if (candle.low <= BB.lower[i] && !tickerFuture.includes('_xp')) {
        let currentPosition: any = {
          side: 'long',
          openPrice: candle.low,
          stopLoss: candle.low,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];
          const canClose = !tickerFuture.includes('_xp') ? candle.high <= BB.middle[j] : candle.high <= BB.upper[j];
          if (canClose) {
            continue;
          }

          currentPosition = {
            ...currentPosition,
            closeTime: candle.time,
            takeProfit: candle.open,
            closePrice: candle.open,
          };

          currentPosition.fee = fee * 200;

          const spread = 0.1;

          const percent = currentPosition?.takeProfit / currentPosition.openPrice;
          currentPosition.newPnl = (percent - 1) * 100 - currentPosition.fee - spread * 2;

          buyPositions.push(currentPosition);

          i = j - 1;

          break;
        }
        // Если было закрытие - продолжаем цикл
        if (currentPosition.closeTime) {
          continue;
        }
      }
    }

    return [...buyPositions, ...sellPositions].sort((a, b) => b.openTime - a.openTime);
  }, [data, tickerStock, BB.upper, BB.middle, BB.lower, minProfit, fee]);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions]);

  const [isFullscreen, setIsFullscreen] = useState(localStorage.getItem('isFullscreen') === 'true');

  useEffect(() => {
    localStorage.setItem('isFullscreen', isFullscreen ? 'true' : 'false');
  }, [isFullscreen]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onSelectTicker = (type: 'stock' | 'future') => (ticker) => {
    searchParams.set(`ticker-${type}`, ticker);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    console.log('Selected Time: ', value);
    console.log('Formatted Selected Time: ', dateString);

    searchParams.set('fromDate', value[0].unix());
    searchParams.set('toDate', value[1].unix());
    setSearchParams(searchParams);
  };

  const ls = useMemo(() => {
    const markers = positions.map((s) => [
      {
        color: s.side === 'long' ? markerColors.bullColor : markerColors.bearColor,
        time: s.openTime as Time,
        shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
        position: s.side === 'short' ? 'aboveBar' : 'belowBar',
        price: s.openPrice,
        pnl: s.pnl,
      },
      {
        color: s.side === 'short' ? markerColors.bullColor : markerColors.bearColor,
        time: s.closeTime as Time,
        shape: s.side === 'short' ? 'arrowUp' : 'arrowDown',
        position: s.side === (s.pnl > 0 ? 'long' : 'short') ? 'aboveBar' : 'belowBar',
        price: s.pnl > 0 ? s.takeProfit : s.pnl < 0 ? s.stopLoss : s.takeProfit,
      },
    ]);

    const lineSerieses = markers.map(([open, close]) => ({
      options: {
        color: open.pnl > 0 ? markerColors.bullColor : open.pnl < 0 ? markerColors.bearColor : 'rgb(166,189,213)', // Цвет линии
        priceLineVisible: false,
        lastValueVisible: false,
        lineWidth: 1,
        lineStyle: LineStyle.LargeDashed,
      },
      data: [
        { time: open.time as Time, value: open.price }, // начальная точка между свечками
        { time: close.time as Time, value: close.price }, // конечная точка между свечками
      ],
    }));

    if (!data.length) {
      return [];
    }

    return [
      // ...lineSerieses,
      // {
      //   color: 'rgb(20, 131, 92)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: ArbitrageBuyPriceSeriesData,
      // },
      // {
      //   color: 'rgb(157, 43, 56)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: ArbitrageSellPriceSeriesData,
      // },
      // {
      //   color: 'rgb(157, 43, 56)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: sellLineData,
      //   lineStyle: LineStyle.Dashed,
      // },
      checkboxValues.has('enableBB') && {
        id: 'BB.upper',
        options: {
          // color: colors.bbEma,
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.upper[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.upper+1',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
          // lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB2.upper[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'ema',
        options: {
          color: colors.ema,
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.middle[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.lower',
        options: {
          // color: colors.bbEma,
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.lower[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.lower+1',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
          // lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB2.lower[i] })),
      },
    ].filter(Boolean);
  }, [colors, positions, checkboxValues]);

  const primitives = useMemo(() => {
    if (!BB.upper.length || !checkboxValues.has('enableBB')) {
      return [];
    }
    const _primitives = [];

    for (let i = 0; i < data.length; i++) {
      if (!BB.upper[i] || !BB.lower[i]) {
        continue;
      }
      _primitives.push(
        createRectangle2(
          {
            leftTop: {
              price: BB.upper[i],
              time: data[i].time,
            },
            rightBottom: {
              price: BB.lower[i],
              time: data[i].time,
            },
          },
          {
            fillColor: 'rgba(90, 200, 250, .3)',
            showLabels: false,
            borderWidth: 0.1,
          },
        ),
      );
    }

    return _primitives;
  }, [BB, data, checkboxValues, BB2]);

  const historyColumns = [
    {
      title: 'Тип',
      dataIndex: 'side',
      key: 'side',
      render: (value, row) => row?.side || '-',
    },
    {
      title: 'Время входа',
      dataIndex: 'openTime',
      key: 'openTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => dayjs(row?.openTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Цена входа',
      dataIndex: 'openPrice',
      key: 'openPrice',
    },
    {
      title: 'Стоп цена',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (value, row) => {
        const percent = row.openPrice > row?.stopLoss ? row.openPrice / row?.stopLoss : row?.stopLoss / row.openPrice;

        return `${row?.stopLoss} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
    },
    {
      title: 'Тейк цена',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      render: (value, row) => {
        const percent = row.openPrice > row?.takeProfit ? row.openPrice / row?.takeProfit : row?.takeProfit / row.openPrice;

        return `${row?.takeProfit} (${((percent - 1) * 100).toFixed(2)}%)`;
      },
    },
    {
      title: 'Время выхода',
      dataIndex: 'closeTime',
      key: 'closeTime',
      // colSpan: 2,
      onCell: (row, index) => ({
        colSpan: row.type === 'summary' ? 4 : 1,
      }),
      render: (value, row) => dayjs(row?.closeTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Финрез',
      dataIndex: 'newPnl',
      key: 'newPnl',
      align: 'right',
      render: (value, row) => (row.newPnl ? `${row.newPnl.toFixed(2)}%` : '-'),
    },
  ].filter(Boolean);

  // const [ref, isVisible] = useIntersectionObserver({
  //   threshold: 0.01,
  //   rootMargin: `800px`,
  // });

  const isVisible = true;

  if (onlyChart) {
    return (
      <div className="relative" style={{ height }}>
        {isVisible && (
          <>
            <div
              style={{
                top: 8,
                position: 'absolute',
                zIndex: 3,
                left: 8,
                gap: 8,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {/*<TimeframeSelect value={tf} onChange={setSize} />*/}
              {/*<TickerSelect filterSymbols={stockTickers} value={tickerStock} onSelect={onSelectTicker('stock')} />*/}
              {/*<TickerSelect filterSymbols={futureTickers} value={_tickerFuture} onSelect={onSelectTicker('future')} />*/}
              {/*<Select*/}
              {/*    value={tickerFuture}*/}
              {/*    showSearch*/}
              {/*    placeholder="Введи тикер"*/}
              {/*    onSelect={onSelectTicker('future')}*/}
              {/*    filterOption={(input, option) =>*/}
              {/*        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())*/}
              {/*    }*/}
              {/*    style={{width: 160}}*/}
              {/*    options={options}*/}
              {/*/>*/}

              {/*<DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />*/}
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column', background: 'rgba(23,35,46,0.6)', padding: '4px 8px' }}>
                <Typography.Text>
                  {tickerStock}/{_tickerFuture}
                </Typography.Text>
                <div>Профит: {((data[data.length - 1]?.close / BB.middle[BB.middle.length - 1] - 1) * 100).toFixed(2)}%</div>
                <Statistic
                  title="Финрез"
                  style={{ display: 'flex', gap: 8 }}
                  value={`${PnL.toFixed(2)}%`}
                  precision={2}
                  valueStyle={{
                    color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                    fontSize: 14,
                  }}
                />
                <Statistic
                  title="Тейки"
                  style={{ display: 'flex', gap: 8 }}
                  value={new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                  }).format(profits)}
                  valueStyle={{ color: 'rgb(44, 232, 156)', fontSize: 14 }}
                  suffix={`(${!profits ? 0 : ((profits * 100) / (profits + losses)).toFixed(2)})%`}
                />
                <Statistic
                  title="Лоси"
                  style={{ display: 'flex', gap: 8 }}
                  value={new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                  }).format(losses)}
                  valueStyle={{ color: 'rgb(255, 117, 132)', fontSize: 14 }}
                  suffix={`(${!losses ? 0 : ((losses * 100) / (profits + losses)).toFixed(2)})%`}
                />
              </div>
            </div>
            {/*<TWChart data={data} />*/}
            <Chart
              seriesType={seriesType}
              hideCross
              lineSerieses={ls}
              primitives={[]}
              markers={[]}
              toolTipTop="40px"
              toolTipLeft="4px"
              data={data}
              ema={[]}
              height={height}
              maximumFractionDigits={3}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <Content style={{ padding: 0, paddingRight: 20 }}>
        <div className={`relative${isFullscreen ? ' fullscreen' : ''}`}>
          <div
            style={{
              top: 8,
              position: 'absolute',
              zIndex: 3,
              left: 8,
              gap: 8,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <TimeframeSelect value={tf} onChange={setSize} />
            <TickerSelect filterSymbols={stockTickers} value={tickerStock} onSelect={onSelectTicker('stock')} />
            <TickerSelect filterSymbols={futureTickers} value={_tickerFuture} onSelect={onSelectTicker('future')} />
            {/*<Select*/}
            {/*    value={tickerFuture}*/}
            {/*    showSearch*/}
            {/*    placeholder="Введи тикер"*/}
            {/*    onSelect={onSelectTicker('future')}*/}
            {/*    filterOption={(input, option) =>*/}
            {/*        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())*/}
            {/*    }*/}
            {/*    style={{width: 160}}*/}
            {/*    options={options}*/}
            {/*/>*/}

            <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />

            <Button icon={<FullscreenOutlined />} onClick={() => setIsFullscreen((prevState) => !prevState)} />
            <div>Профит: {((data[data.length - 1]?.close / BB.middle[BB.middle.length - 1] - 1) * 100).toFixed(2)}%</div>
          </div>
          {/*<TWChart data={data} />*/}
          <Chart
            seriesType={seriesType}
            hideCross
            lineSerieses={ls}
            primitives={[]}
            markers={[]}
            toolTipTop="40px"
            toolTipLeft="4px"
            data={data}
            ema={[]}
            maximumFractionDigits={3}
          />
        </div>
        <Row style={{ paddingBottom: '8px', paddingTop: 8 }} gutter={8}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Общий финрез"
                value={`${PnL.toFixed(2)}%`}
                precision={2}
                valueStyle={{
                  color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic title="Комиссия" value={`${Fee.toFixed(2)}%`} precision={2} valueStyle={{ color: 'rgb(255, 117, 132)' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Тейки"
                value={new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                }).format(profits)}
                valueStyle={{ color: 'rgb(44, 232, 156)' }}
                suffix={`(${!profits ? 0 : ((profits * 100) / (profits + losses)).toFixed(2)})%`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Лоси"
                value={new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                }).format(losses)}
                valueStyle={{ color: 'rgb(255, 117, 132)' }}
                suffix={`(${!losses ? 0 : ((losses * 100) / (profits + losses)).toFixed(2)})%`}
              />
            </Card>
          </Col>
        </Row>
        <Table
          size="small"
          dataSource={positions}
          columns={historyColumns as any}
          pagination={{
            pageSize: 30,
          }}
          onRow={(record) => {
            return {
              style:
                record.newPnl < 0
                  ? {
                      backgroundColor: '#d1261b66',
                      color: 'rgb(255, 117, 132)',
                    }
                  : record.newPnl > 0
                    ? {
                        backgroundColor: '#15785566',
                        color: 'rgb(44, 232, 156)',
                      }
                    : undefined,
              className: 'hoverable',
            };
          }}
        />
        {/*<Chart*/}
        {/*  hideCross*/}
        {/*  lineSerieses={[]}*/}
        {/*  primitives={[]}*/}
        {/*  markers={[]}*/}
        {/*  toolTipTop="40px"*/}
        {/*  toolTipLeft="4px"*/}
        {/*  data={stockDataRef}*/}
        {/*  ema={[]}*/}
        {/*  maximumFractionDigits={2}*/}
        {/*/>*/}
        {/*<Chart*/}
        {/*  hideCross*/}
        {/*  lineSerieses={[]}*/}
        {/*  primitives={[]}*/}
        {/*  markers={[]}*/}
        {/*  toolTipTop="40px"*/}
        {/*  toolTipLeft="4px"*/}
        {/*  data={futureDataRef}*/}
        {/*  ema={[]}*/}
        {/*  maximumFractionDigits={2}*/}
        {/*/>*/}
      </Content>
      <Sider width="300px" style={{ marginRight: '-20px', padding: 20 }}>
        <Checkbox.Group
          onChange={setCheckboxValues}
          value={Array.from(checkboxValues)}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <Checkbox key="enableBB" value="enableBB">
            Индикатор Бойленджера
          </Checkbox>
          <Typography style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div>Период BB EMA</div>
            <ColorPicker
              value={colors.ema}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, ema: val.toRgbString() }))}
            />
          </Typography>
          <Slider value={emaBBPeriod} min={1} max={300} step={1} onChange={setEmaBBPeriod} />
          <Typography style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div>Стандартное отклонение</div>
            <ColorPicker
              value={colors.bbEma}
              size="small"
              onChange={(val) => setColors((prevState) => ({ ...prevState, bbEma: val.toRgbString() }))}
            />
          </Typography>
          <Slider value={bbMiltiplier} min={1} max={10} step={1} onChange={setbbMiltiplier} />
        </Checkbox.Group>
        <Form.Item label="Минимальный профит">
          <Input style={{ width: 80 }} value={minProfit} onChange={(e) => setMinProfit(Number(e.target.value))} />
        </Form.Item>
      </Sider>
    </Layout>
  );
};
