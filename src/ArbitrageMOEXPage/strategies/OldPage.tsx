import { Checkbox, ColorPicker, DatePicker, Divider, Layout, Select, Slider, Space } from 'antd';
import { TickerSelect } from '../../TickerSelect';
import dayjs from 'dayjs';
// import { Chart } from '../../Chart';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment/moment';
import { calculateTruthFuturePrice, createRectangle2, getCommonCandles } from '../../utils';
import { calculateBollingerBands, calculateCandle, calculateEMA, symbolFuturePairs } from '../../../symbolFuturePairs';
import { LineStyle, Time } from 'lightweight-charts';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import FormItem from 'antd/es/form/FormItem';
import {
  useGetBCSDividendsQuery,
  useGetHistoryQuery,
  useGetSecurityByExchangeAndSymbolQuery,
  useGetSecurityDetailsQuery,
} from '../../api/alor.api';
import { TWChart } from '../../components/TWChart.tsx';

const { RangePicker } = DatePicker;

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
    truthPrice: 'rgb(255, 186, 102)',
  },
  storageState,
);

export const OldPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tickerStock = searchParams.get('ticker-stock') || 'SBER';
  const _tickerFuture = searchParams.get('ticker-future');
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

  const [colors, setColors] = useState(defaultState);

  useEffect(() => {
    localStorage.setItem('colors', JSON.stringify(colors));
  }, [colors]);

  const expirationMonth = searchParams.get('expirationMonth') || '9.25';
  const setexpirationMonth = (value) => {
    searchParams.set('expirationMonth', value);
    setSearchParams(searchParams);
  };
  const multi = Number(searchParams.get('multi')) || 1;

  const setmulti = (value) => {
    searchParams.set('multi', value.toString());
    setSearchParams(searchParams);
  };

  const expirationMonths = useMemo(() => {
    const startYear = 24;
    const months = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 1; j <= 4; j++) {
        months.push(`${3 * j}.${startYear + i}`);
      }
    }

    return months;
  }, []);

  const emaPeriod = Number(searchParams.get('emaPeriod') || 100);

  const bbMiltiplier = Number(searchParams.get('bbMiltiplier') || 2);
  const setbbMiltiplier = (value) => {
    searchParams.set('bbMiltiplier', value);
    setSearchParams(searchParams);
  };

  const emaBBPeriod = Number(searchParams.get('emaBBPeriod') || 20);

  const checkboxValues = new Set(
    (searchParams.get('checkboxes') || 'tradeOB,BOS,swings,showEndOB,showHiddenSwings,showPositions').split(','),
  );
  const setCheckboxValues = (values) => {
    searchParams.set('checkboxes', values.join(','));
    setSearchParams(searchParams);
  };

  const tickerFuture = useMemo(() => {
    if (_tickerFuture) {
      return _tickerFuture;
    }

    const ticker = symbolFuturePairs.find((pair) => pair.stockSymbol === tickerStock)?.futuresSymbol;
    if (ticker) {
      return `${ticker}-${expirationMonth}`;
    }
    return ticker;
  }, [tickerStock, _tickerFuture, expirationMonth]);

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
      exchange: 'MOEX',
    },
    {
      skip: true, // !tickerFuture,
    },
  );

  const futureData = _futureData?.history || [];

  const { data: _stockData } = useGetHistoryQuery(
    {
      tf,
      from: fromDate,
      to: toDate,
      symbol: tickerStock,
      exchange: 'MOEX',
    },
    {
      skip: true, // !tickerStock,
    },
  );

  const stockData = _stockData?.history || [];

  const { data: dividendsData } = useGetBCSDividendsQuery({
    actual: 1,
    limit: 300,
    order: 2,
    sorting: 0,
  });

  const dividends = useMemo(
    () =>
      (dividendsData?.data || [])
        .filter((d) => d.secure_code === tickerStock)
        .map((d) => ({
          dividendPerShare: d.dividend_value,
          exDividendDate: d.closing_date,
        })),
    [dividendsData, tickerStock],
  );

  // const { data: dividends = [] } = useGetDividendsQuery(
  //   {
  //     ticker: tickerStock,
  //   },
  //   {
  //     skip: !tickerStock,
  //   },
  // );

  const lastDividends = useMemo(() => (dividends ? dividends[dividends.length - 1] : undefined), [dividends]);
  const dividendPerShare = lastDividends?.dividendPerShare || 0;

  const { data: details } = useGetSecurityDetailsQuery({ ticker: tickerFuture });

  const expirationDate = details?.cancellation?.split('T')[0] || '2025-09-18';
  const taxRate = 0.13;

  const lotsize = security?.lotsize || 1;
  const fee = 0.04 / 100;

  const multiple = multi;

  const stockTickers = useMemo(() => symbolFuturePairs.map((pair) => pair.stockSymbol), []);

  const commonCandles = useMemo(() => getCommonCandles(stockData, futureData), [stockData, futureData]);

  const data = useMemo(() => {
    return commonCandles.filteredFuturesCandles
      .map((item, index) => calculateCandle(commonCandles.filteredStockCandles[index], item, Number(multiple)))
      .filter(Boolean);
  }, [stockData, futureData, multiple, commonCandles]);

  const truthPriceSeriesData = useMemo(
    () =>
      commonCandles.filteredStockCandles.map(
        ({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate), []) / close,
      ),
    [commonCandles.filteredStockCandles],
  );

  const truthPriceSeriesDivsData = useMemo(
    () =>
      commonCandles.filteredStockCandles.map(
        ({ close, time }) => calculateTruthFuturePrice(close, time, dayjs(expirationDate), dividends) / close,
      ),
    [commonCandles.filteredStockCandles, dividends],
  );

  const zeroLineData = useMemo(() => stockData.map((s) => 1), [stockData]);

  const ema = useMemo(
    () =>
      calculateEMA(
        data.map((h) => h.close),
        emaPeriod,
      )[1],
    [data, emaPeriod],
  );
  const BB = useMemo(
    () =>
      calculateBollingerBands(
        data.map((h) => h.close),
        emaBBPeriod,
        bbMiltiplier,
      ),
    [data, emaBBPeriod, bbMiltiplier],
  );

  const sellEmaLineDataSmall2 = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 + 0.0025)), [truthPriceSeriesDivsData]);

  const sellEmaLineDataSmall = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 + 0.005)), [truthPriceSeriesDivsData]);

  const sellEmaLineDataSmall3 = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 + 0.0075)), [truthPriceSeriesDivsData]);

  const sellEmaLineData = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 + 0.01)), [truthPriceSeriesDivsData]);

  const sellEmaLineData1per5 = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 + 0.015)), [truthPriceSeriesDivsData]);

  const buyEmaLineDataSmall2 = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 - 0.0025)), [truthPriceSeriesDivsData]);

  const buyEmaLineDataSmall = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 - 0.005)), [truthPriceSeriesDivsData]);

  const buyEmaLineData = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 - 0.01)), [truthPriceSeriesDivsData]);

  const buyEmaLineData1per5 = useMemo(() => truthPriceSeriesDivsData.map((s) => s * (1 - 0.015)), [truthPriceSeriesDivsData]);

  const positions = useMemo(() => {
    if (!data.length) {
      return [];
    }

    const buyPositions = [];

    let currentPosition;

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];

      // Если позы еще нет
      if (!currentPosition) {
        // И появился сигнал на покупку
        if (
          (checkboxValues.has('tradePercent0.25') && candle.low <= buyEmaLineDataSmall2[i]) ||
          (checkboxValues.has('tradePercent0.5') && candle.low <= buyEmaLineDataSmall[i]) ||
          (checkboxValues.has('tradePercent1') && candle.low <= buyEmaLineData[i]) ||
          (checkboxValues.has('tradePercent1.5') && candle.low <= buyEmaLineData1per5[i]) ||
          (checkboxValues.has('buyBBtoBB') && candle.low <= BB.lower[i])
        ) {
          // Покупаем
          currentPosition = {
            side: 'long',
            openPrice: candle.low,
            stopLoss: candle.low,
            openTime: candle.time,
          };
        }
      } else {
        // Если поза есть и сигнал на покупку усилился - усредняемся
        if (
          (checkboxValues.has('avg1') && candle.low <= buyEmaLineData[i]) ||
          (checkboxValues.has('avg1.5') && candle.low <= buyEmaLineData1per5[i])
        ) {
          currentPosition = {
            side: 'long',
            openPrice: candle.low,
            stopLoss: candle.low,
            openTime: candle.time,
          };
          continue;
        }

        // Если цель не достигнута - мимо
        if (checkboxValues.has('buyBBtoBB') ? candle.high <= BB.upper[i] : candle.high <= truthPriceSeriesDivsData[i]) {
          continue;
        }

        // Цель достигнута, закрываем позу
        currentPosition = {
          ...currentPosition,
          closeTime: candle.time,
          takeProfit: candle.open,
          closePrice: candle.open,
        };

        currentPosition.fee = fee * 200;

        const percent =
          currentPosition.openPrice > currentPosition?.takeProfit
            ? currentPosition.openPrice / currentPosition?.takeProfit
            : currentPosition?.takeProfit / currentPosition.openPrice;
        currentPosition.newPnl = (percent - 1) * 100 - currentPosition.fee;
        buyPositions.push(currentPosition);

        currentPosition = null;
      }
    }

    return buyPositions.sort((a, b) => b.openTime - a.openTime);
  }, [
    checkboxValues,
    data,
    fee,
    tickerStock,
    buyEmaLineData,
    buyEmaLineData1per5,
    buyEmaLineDataSmall,
    buyEmaLineDataSmall2,
    truthPriceSeriesDivsData,
  ]);

  const { PnL, profits, losses, Fee } = useMemo(() => {
    const array = positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      Fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [positions]);

  const onSelectTicker = (type: 'stock' | 'future') => (ticker) => {
    searchParams.set(`ticker-${type}`, ticker);
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

    if (
      !ema.length ||
      !data.length ||
      !buyEmaLineData.length ||
      !buyEmaLineData1per5.length ||
      !buyEmaLineDataSmall.length ||
      !buyEmaLineDataSmall2.length ||
      !sellEmaLineData.length ||
      !sellEmaLineData1per5.length ||
      !sellEmaLineDataSmall.length ||
      !sellEmaLineDataSmall2.length ||
      !sellEmaLineDataSmall3.length
    ) {
      return [];
    }

    return [
      // ...lineSerieses,
      checkboxValues.has('enableEMA') && {
        id: 'ema',
        options: {
          color: colors.ema,
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: ema[i] })),
      },
      checkboxValues.has('enable1percent') && {
        id: 'sellEmaLineData',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineData[i] })),
      },
      checkboxValues.has('buyEmaLineDataSmall') && {
        id: 'sellEmaLineDataSmall',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineDataSmall[i] })),
      },
      checkboxValues.has('buyEmaLineDataSmall3') && {
        id: 'buyEmaLineDataSmall3',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineDataSmall3[i] })),
      },
      checkboxValues.has('buyEmaLineDataSmall2') && {
        id: 'sellEmaLineDataSmall3',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineDataSmall2[i] })),
      },
      checkboxValues.has('buyEmaLineData1per5') && {
        id: 'sellEmaLineData1per5',
        options: {
          color: 'rgb(157, 43, 56)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: sellEmaLineData1per5[i] })),
      },
      checkboxValues.has('enable1percent') && {
        id: 'buyEmaLineData',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineData[i] })),
      },
      checkboxValues.has('buyEmaLineDataSmall') && {
        id: 'buyEmaLineDataSmall',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineDataSmall[i] })),
      },
      checkboxValues.has('buyEmaLineDataSmall2') && {
        id: 'buyEmaLineDataSmall2',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.SparseDotted,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineDataSmall2[i] })),
      },
      checkboxValues.has('buyEmaLineData1per5') && {
        id: 'buyEmaLineData1per5',
        options: {
          color: 'rgb(20, 131, 92)',
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: buyEmaLineData1per5[i] })),
      },
      checkboxValues.has('enableCalculateFuturePrice') && {
        id: 'truthPriceSeriesData',
        options: {
          color: colors.truthPrice,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: truthPriceSeriesData[i] })),
      },
      checkboxValues.has('truthPriceSeriesDivsData') && {
        id: 'truthPriceSeriesDivsData',
        options: {
          color: colors.truthPrice,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: truthPriceSeriesDivsData[i] })),
      },

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
      checkboxValues.has('enableZeroLine') && {
        id: 'zeroLineData',
        options: {
          color: colors.zeroLevel,
          lineWidth: 1,
          priceLineVisible: false,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: zeroLineData[i] })),
      },
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
        id: 'BB.lower',
        options: {
          color: colors.bbEma,
          lineWidth: 1,
          priceLineVisible: false,
          lineStyle: LineStyle.Dashed,
        },
        data: data.map((extremum, i) => ({ time: extremum.time, value: BB.lower[i] })),
      },
      // {
      //   color: 'rgb(20, 131, 92)',
      //   lineWidth: 1,
      //   priceLineVisible: false,
      //   data: buyLineData,
      //   lineStyle: LineStyle.Dashed,
    ].filter(Boolean);
  }, [colors, buyEmaLineData1per5, buyEmaLineDataSmall, buyEmaLineData, positions, checkboxValues, buyEmaLineDataSmall2]);

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
  }, [BB, data, checkboxValues]);

  const multiOptions = [10000, 1000, 100, 10, 1, 0.1, 0.01];

  return (
    <>
      <Layout>
        <Content style={{ padding: 0, paddingRight: 20 }}>
          <div style={{ position: 'relative' }}>
            <Space>
              <TickerSelect filterSymbols={stockTickers} value={tickerStock} onSelect={onSelectTicker('stock')} />

              <Select
                value={expirationMonth}
                onSelect={setexpirationMonth}
                style={{ width: 160 }}
                options={expirationMonths.map((v) => ({ label: v, value: v }))}
              />
              <Select value={multi} onSelect={setmulti} style={{ width: 80 }} options={multiOptions.map((v) => ({ label: v, value: v }))} />
            </Space>

            <TWChart ticker={`${tickerStock}/${tickerFuture}`} multiple={multiple} height={700} />
          </div>
        </Content>
        <Sider width="300px" style={{ marginRight: '-20px', padding: 20 }}>
          <Checkbox.Group
            onChange={setCheckboxValues}
            value={Array.from(checkboxValues)}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <FormItem label="Стандартное отклонение" layout="vertical" style={{ margin: 0 }}>
              <Slider value={bbMiltiplier} min={1} max={10} step={1} onChange={setbbMiltiplier} />
            </FormItem>
            <Divider plain orientation="left" style={{ margin: '0 0 8px' }} />
            <div style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
              <Checkbox key="enableCalculateFuturePrice" value="enableCalculateFuturePrice">
                Справедливая цена фьюча
              </Checkbox>
              <ColorPicker
                value={colors.truthPrice}
                size="small"
                onChange={(val) => setColors((prevState) => ({ ...prevState, truthPrice: val.toRgbString() }))}
              />
            </div>
            <Checkbox key="truthPriceSeriesDivsData" value="truthPriceSeriesDivsData">
              Справедливая цена фьюча с дивами
            </Checkbox>
            <div style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
              <Checkbox key="enableZeroLine" value="enableZeroLine">
                Уровень единицы
              </Checkbox>
              <ColorPicker
                value={colors.zeroLevel}
                size="small"
                onChange={(val) => setColors((prevState) => ({ ...prevState, zeroLevel: val.toRgbString() }))}
              />
            </div>
            <Checkbox key="buyEmaLineDataSmall2" value="buyEmaLineDataSmall2">
              -0.25% от справедливой
            </Checkbox>
            <Checkbox key="buyEmaLineDataSmall" value="buyEmaLineDataSmall">
              -0.5% от справедливой
            </Checkbox>
            <Checkbox key="buyEmaLineDataSmall3" value="buyEmaLineDataSmall3">
              -0.75% от справедливой
            </Checkbox>
            <Checkbox key="enable1percent" value="enable1percent">
              -1% от справедливой
            </Checkbox>
            <Checkbox key="buyEmaLineData1per5" value="buyEmaLineData1per5">
              -1.5% от справедливой
            </Checkbox>
          </Checkbox.Group>
        </Sider>
      </Layout>
    </>
  );
};
