import { Card, Checkbox, Col, ColorPicker, Layout, Row, Slider, Space, Statistic, Table, Typography } from 'antd';
import { TimeframeSelect } from '../../TimeframeSelect';
import { TickerSelect } from '../../TickerSelect';
import dayjs, { type Dayjs } from 'dayjs';
// import { Chart } from '../../Chart';
import { Chart } from '../../SoloTestPage/UpdatedChart';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculateMultiple, createRectangle2, getCommonCandles } from '../../utils';
import { calculateBollingerBands, calculateCandle, symbolFuturePairs } from '../../../symbolFuturePairs';
import { LineStyle, Time } from 'lightweight-charts';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { useGetHistoryQuery, useGetSecurityByExchangeAndSymbolQuery } from '../../api/alor.api';
import { DatesPicker } from '../../DatesPicker';
import { useAppSelector } from '../../store.ts';
import { HistoryObject } from 'alor-api';

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

class MyDatafeed {
  data = [];

  constructor(data) {
    this.data = data; // Ваши данные в формате OHLCV
  }

  onReady(callback) {
    callback({
      supports_search: true,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
    });
  }

  resolveSymbol(symbolName, onSymbolResolvedCallback) {
    onSymbolResolvedCallback({
      name: symbolName,
      type: 'stock',
      session: '24x7',
      timezone: 'Etc/UTC',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
    });
  }

  getBars(symbolInfo, resolution, from, to, onHistoryCallback) {
    const bars = this.data.filter((bar) => bar.time >= from && bar.time <= to);
    onHistoryCallback(bars, { noData: !bars.length });
  }
}

const TWChart = ({ data }) => {
  const container = useRef<HTMLDivElement>();

  useEffect(() => {
    if (container.current && !container.current.querySelector('iframe')) {
      // @ts-ignore
      const widget = new window.TradingView.widget({
        datafeed: new MyDatafeed(data),
        symbol: 'CUSTOM:YOUR_SYMBOL',
        interval: '1D',
        container: container.current.id,
      });
    }
  }, [data]);

  return <div id="tradingview-widget" ref={container} />;
};

export const StatArbPage = ({ tickerStock, _tickerFuture, leftExchange = 'MOEX', righExchange = 'MOEX' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const multi = 100;
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || dayjs().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || dayjs().add(1, 'day').unix();

  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);
  const api = useAppSelector((state) => state.alorSlice.api);

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

  const { data: _futureData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: tickerFuture,
      exchange: leftExchange,
    },
    {
      skip: !tickerFuture || !apiAuth,
    },
  );

  const futureData = _futureData?.history || [];

  const [futureDataRef, setfutureDataRef] = useState<HistoryObject[]>([]);

  useEffect(() => {
    setfutureDataRef(futureData);
  }, [futureData]);

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

  const { data: _stockData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: tickerStock,
      exchange: righExchange,
    },
    {
      skip: !tickerStock || !apiAuth,
    },
  );

  const stockData = _stockData?.history || [];

  const [stockDataRef, setstockDataRef] = useState<HistoryObject[]>([]);

  useEffect(() => {
    setstockDataRef(stockData);
  }, [stockData]);

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

      return filteredFuturesCandles
        .map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple)))
        .filter(Boolean);
    }
    return stockDataRef;
  }, [futureDataRef, multiple, stockDataRef]);

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

      // Если не коснулись верха - продаем фьюч, покупаем акцию
      if (candle.high >= BB.upper[i]) {
        let currentPosition: any = {
          side: 'short',
          openPrice: candle.high,
          stopLoss: candle.high,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];
          if (candle.low > BB.middle[j]) {
            continue;
          }

          currentPosition = {
            ...currentPosition,
            closeTime: candle.time,
            takeProfit: candle.open,
            closePrice: candle.open,
          };

          currentPosition.fee = fee * 200;

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
      if (candle.low <= BB.lower[i]) {
        let currentPosition: any = {
          side: 'long',
          openPrice: candle.low,
          stopLoss: candle.low,
          openTime: candle.time,
        };

        for (let j = i + 1; j < data.length; j++) {
          const candle = data[j];
          if (candle.high <= BB.middle[j]) {
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
  }, [data, fee, lotsize, tickerStock, BB]);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions]);

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
          color: colors.bbEma,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.upper[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.upper+1',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
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
          color: colors.bbEma,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.lower[i] })),
      },
      checkboxValues.has('enableBB') && {
        id: 'BB.lower+1',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
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

  return (
    <Layout>
      <Content style={{ padding: 0, paddingRight: 20 }}>
        <div style={{ position: 'relative' }}>
          <Space style={{ top: 8, position: 'absolute', zIndex: 3, left: 8 }}>
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
          </Space>
          {/*<TWChart data={data} />*/}
          <Chart
            hideCross
            lineSerieses={ls}
            primitives={primitives}
            markers={[]}
            toolTipTop="40px"
            toolTipLeft="4px"
            data={data}
            ema={[]}
            maximumFractionDigits={3}
          />
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
        </div>
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
      </Sider>
    </Layout>
  );
};
