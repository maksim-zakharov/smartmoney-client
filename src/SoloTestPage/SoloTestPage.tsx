import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Checkbox, Divider, Form, Input, Layout, Radio, Row, Slider, SliderSingleProps, Space, Table } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Chart } from './UpdatedChart';
import {
  bosesToLineSerieses,
  fetchCandlesFromAlor,
  fetchRisk,
  fetchRiskRates,
  getSecurity,
  orderblocksToImbalancePrimitives,
  orderblocksToOrderblocksPrimitives,
  refreshToken,
  swingsToMarkers,
} from '../utils';
import { TickerSelect } from '../TickerSelect';
import { TimeframeSelect } from '../TimeframeSelect';
import { finishPosition, iterationCalculatePositions } from '../samurai_patterns';
import { isBusinessDay, isUTCTimestamp, LineStyle, Time } from 'lightweight-charts';
import { DatesPicker } from '../DatesPicker';
import { SessionHighlighting } from '../lwc-plugins/session-highlighting';
import { calculateTesting } from '../sm-lib/th_ultimate';
import { Security, useOrderblocksQuery } from '../api';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';
import { moneyFormat } from '../MainPage/MainPage';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { POIType } from '../sm-lib/models';
import { notTradingTime } from '../sm-lib/utils';

const markerColors = {
  bearColor: 'rgb(157, 43, 56)',
  bullColor: 'rgb(20, 131, 92)',
};

export const SoloTestPage = () => {
  const [env, setEnv] = useState<'dev' | 'prod'>('dev');
  const [offset, setOffset] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [{ data = [], LTFdata = [] }, setData] = useState({ data: [], LTFdata: [] });
  // const [LTFdata, setLTFData] = useState([]);
  const [HTFdata, setHTFData] = useState([]);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdDuration = 500; // 2 секунды

  const checkboxValues = new Set(
    (searchParams.get('checkboxes') || 'tradeOB,BOS,swings,showEndOB,showHiddenSwings,showPositions').split(','),
  );
  const setCheckboxValues = (values) => {
    searchParams.set('checkboxes', values.join(','));
    setSearchParams(searchParams);
  };
  const [tralingPercent, settralingPercent] = useState(0);

  const [windowLength, setWindowLength] = useState(5);
  const [maxDiff, setMaxDiff] = useState(1);
  const [multiStop, setMultiStop] = useState(5);
  const ticker = searchParams.get('ticker') || 'MTLR';
  const tf = searchParams.get('tf') || '300';
  const fromDate = searchParams.get('fromDate') || dayjs().add(-2, 'week').unix();
  const toDate = searchParams.get('toDate') || dayjs().endOf('day').unix();
  const [stopMargin, setStopMargin] = useState(50);
  const [stopPaddingPercent, setstopPaddingPercent] = useState(0);
  const [security, setSecurity] = useState<Security>();

  const [riskRate, setRiskRate] = useState();

  const isShortSellPossible = riskRate?.isShortSellPossible || false;

  const [token, setToken] = useState();

  const { data: robotOB = [] } = useOrderblocksQuery({ symbol: ticker, tf, from: fromDate, to: toDate });

  const config = useMemo(
    () => ({
      swings: checkboxValues.has('swings'),
      noInternal: checkboxValues.has('noInternal'),
      smartTrend: checkboxValues.has('smartTrend'),
      withTrendConfirm: checkboxValues.has('withTrendConfirm'),
      onlyExtremum: checkboxValues.has('onlyExtremum'),
      removeEmpty: checkboxValues.has('removeEmpty'),
      BOS: checkboxValues.has('BOS'),
      showOB: checkboxValues.has('showOB'),
      showSMT: checkboxValues.has('showSMT'),
      showEndOB: checkboxValues.has('showEndOB'),
      imbalances: checkboxValues.has('imbalances'),
      showPositions: checkboxValues.has('showPositions'),
      tradeOB: checkboxValues.has('tradeOB'),
      tradeOBIDM: checkboxValues.has('tradeOBIDM'),
      showFVG: checkboxValues.has('showFVG'),
      tradeIDMIFC: checkboxValues.has('tradeIDMIFC'),
      tradeCHoCHWithIDM: checkboxValues.has('tradeCHoCHWithIDM'),
      tradeFlipWithIDM: checkboxValues.has('tradeFlipWithIDM'),
      tradeOBEXT: checkboxValues.has('tradeOBEXT'),
      tradeEXTIFC: checkboxValues.has('tradeEXTIFC'),
      excludeWick: checkboxValues.has('excludeWick'),
      withMove: checkboxValues.has('withMove'),
      newSMT: checkboxValues.has('newSMT'),
      showFake: checkboxValues.has('showFake'),
      showHiddenSwings: checkboxValues.has('showHiddenSwings'),
      showRobotOB: checkboxValues.has('showRobotOB'),
      showIFC: checkboxValues.has('showIFC'),
      showSession: checkboxValues.has('showSession'),
      showWeekly: checkboxValues.has('showWeekly'),
      trend2: checkboxValues.has('trend2'),
      tradeStartSessionMorning: checkboxValues.has('tradeStartSessionMorning'),
      tradeStartSessionDay: checkboxValues.has('tradeStartSessionDay'),
      tradeStartSessionEvening: checkboxValues.has('tradeStartSessionEvening'),
      showLogs: false,
    }),
    [checkboxValues],
  );

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

  useEffect(() => {
    token && getSecurity(ticker, token).then(setSecurity);
  }, [ticker, token]);

  useEffect(() => {
    fetchRisk(token).then((r) => fetchRiskRates(ticker, token, r.riskCategoryId).then(setRiskRate));
  }, [ticker, token]);

  useEffect(() => {
    Promise.all([
      fetchCandlesFromAlor(ticker, tf, fromDate, toDate, undefined, token).then((candles) =>
        candles.filter((candle) => !notTradingTime(candle)),
      ),
      fetchCandlesFromAlor(ticker, '60', fromDate, toDate, undefined, token).then((candles) =>
        candles.filter((candle) => !notTradingTime(candle)),
      ),
    ]).then(([data, LTFdata]) => setData({ data, LTFdata }));
  }, [tf, ticker, fromDate, toDate, token]);

  // useEffect(() => {
  //     fetchCandlesFromAlor(ticker, "60", fromDate, toDate, undefined, token).then(candles => candles.filter(candle => !notTradingTime(candle))).then(setLTFData);
  // }, [ticker, fromDate, toDate, token]);

  useEffect(() => {
    fetchCandlesFromAlor(ticker, '3600', fromDate, toDate, undefined, token)
      .then((candles) => candles.filter((candle) => !notTradingTime(candle)))
      .then(setHTFData);
  }, [ticker, fromDate, toDate, token]);

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onSelectTicker = (ticker) => {
    searchParams.set('ticker', ticker);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    searchParams.set('fromDate', value[0].startOf('day').unix());
    searchParams.set('toDate', value[1].endOf('day').unix());
    setSearchParams(searchParams);
  };

  const fbgs = useMemo(() => {
    const { orderBlocks } = calculateTesting(HTFdata, {
      showFVG: true,
      showHiddenSwings: true,
    });

    return orderBlocks;
  }, [HTFdata]);

  const { swings, trend, boses, orderBlocks, positions } = useMemo(() => {
    if (!security || riskRate?.instrument !== ticker) {
      return {
        swings: [],
        trend: [],
        boses: [],
        orderBlocks: [],
        positions: [],
      };
    }

    const { swings, trend, boses, orderBlocks } = calculateTesting(
      offset >= 0 ? data.slice(0, data.length - offset) : data.slice(-offset, data.length),
      config,
      LTFdata,
    );

    const canTradeOrderBlocks = orderBlocks.filter(
      (o) =>
        [
          POIType.CROSS_SESSION,
          POIType.OB_EXT,
          POIType.FVG,
          POIType.EXT_LQ_IFC,
          POIType.IDM_IFC,
          POIType.CHOCH_IDM,
          POIType.FLIP_IDM,
          POIType.One_Side_FVG,
          POIType.Breaking_Block,
        ].includes(o?.type) &&
        (config.showSMT || !o.isSMT) &&
        o.canTest,
    );

    let positions = [];

    if (config.tradeOB) {
      const fakeoutPositions = iterationCalculatePositions(
        security,
        data,
        swings as any,
        canTradeOrderBlocks,
        maxDiff,
        multiStop,
        stopPaddingPercent,
        tralingPercent,
        LTFdata,
      );
      positions.push(...fakeoutPositions);
    }

    if (!isShortSellPossible) {
      positions = positions.filter((p) => p.side !== 'short');
    }
    const lotsize = security?.lotsize;
    const fee = 0.04 / 100;

    return {
      swings,
      trend,
      boses,
      orderBlocks: canTradeOrderBlocks,
      positions: positions
        .map(
          finishPosition({
            lotsize,
            fee,
            tf,
            ticker,
            stopMargin,
          }),
        )
        .sort((a, b) => b.openTime - a.openTime),
    };
  }, [
    riskRate,
    ticker,
    LTFdata,
    tralingPercent,
    offset,
    isShortSellPossible,
    security?.lotsize,
    stopPaddingPercent,
    config.showWeekly,
    config.tradeStartSessionMorning,
    config.tradeStartSessionDay,
    config.tradeStartSessionEvening,
    config.trend2,
    config.showSession,
    config.showIFC,
    config.showFake,
    config.showSMT,
    config.newSMT,
    config.showHiddenSwings,
    config.withMove,
    config.removeEmpty,
    config.onlyExtremum,
    config.tradeEXTIFC,
    config.tradeOBEXT,
    config.tradeFlipWithIDM,
    config.tradeCHoCHWithIDM,
    config.tradeIDMIFC,
    config.showFVG,
    config.tradeOBIDM,
    config.tradeOB,
    config.tradeIFC,
    config.withTrendConfirm,
    config.tradeFakeouts,
    config.excludeWick,
    data,
    maxDiff,
    multiStop,
  ]);

  const robotEqualsPercent = useMemo(() => {
    if (!config.showRobotOB || !robotOB.length) {
      return 0;
    }

    const robotOBMap = robotOB.reduce((acc, curr) => {
      const key = curr.time;
      acc[key] = curr;
      return acc;
    }, {});

    const total = orderBlocks.length;
    const current = orderBlocks.filter(
      (o) =>
        robotOBMap[o.time] &&
        robotOBMap[o.time].index === o.index &&
        robotOBMap[o.time].startCandle.time === o.startCandle.time &&
        robotOBMap[o.time].startCandle.high === o.startCandle.high &&
        robotOBMap[o.time].startCandle.low === o.startCandle.low &&
        robotOBMap[o.time].startCandle.close === o.startCandle.close &&
        robotOBMap[o.time].startCandle.open === o.startCandle.open &&
        robotOBMap[o.time].lastImbalanceCandle.time === o.lastImbalanceCandle.time &&
        robotOBMap[o.time].lastImbalanceCandle.high === o.lastImbalanceCandle.high &&
        robotOBMap[o.time].lastImbalanceCandle.low === o.lastImbalanceCandle.low &&
        robotOBMap[o.time].lastImbalanceCandle.close === o.lastImbalanceCandle.close &&
        robotOBMap[o.time].lastImbalanceCandle.open === o.lastImbalanceCandle.open &&
        robotOBMap[o.time].endCandle?.time === o.endCandle?.time &&
        robotOBMap[o.time].endCandle?.high === o.endCandle?.high &&
        robotOBMap[o.time].endCandle?.low === o.endCandle?.low &&
        robotOBMap[o.time].endCandle?.close === o.endCandle?.close &&
        robotOBMap[o.time].endCandle?.open === o.endCandle?.open,
    ).length;

    return (current / total) * 100;
  }, [robotOB, config.showRobotOB, orderBlocks]);

  const profit = useMemo(
    () => ({
      PnL: positions.filter((c) => c.newPnl).reduce((acc, curr) => acc + curr.newPnl, 0),
      profits: positions.filter((p) => p.newPnl > 0).length,
      losses: positions.filter((p) => p.newPnl < 0).length,
    }),
    [stopMargin, positions],
  );

  const primitives = useMemo(() => {
    const lastCandle = data[data.length - 1];
    const _primitives = [];
    if (config.showOB || config.showEndOB || config.imbalances) {
      const checkShow = (ob) => {
        let result = false;
        if (!ob) {
          return false;
        }
        if (config.showOB && !ob.endCandle) {
          result = true;
        }
        if (config.showEndOB && Boolean(ob.endCandle)) {
          result = true;
        }
        if (ob.isSMT && !config.showSMT) {
          result = false;
        }
        return result;
      };
      if (config.imbalances) {
        _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, checkShow, lastCandle));
        if (config.showRobotOB) _primitives.push(...orderblocksToImbalancePrimitives(robotOB, checkShow, lastCandle));
      }
      if (config.showRobotOB) _primitives.push(...orderblocksToOrderblocksPrimitives(robotOB, checkShow, lastCandle));
      _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, checkShow, lastCandle));
      // FVG на HFT
      // _primitives.push(...orderblocksToFVGPrimitives(fbgs, checkShow, lastCandle));
    }

    function getDate(time: Time): Date {
      if (isUTCTimestamp(time)) {
        return new Date(time);
      } else if (isBusinessDay(time)) {
        return new Date(time.year, time.month, time.day);
      } else {
        return new Date(time);
      }
    }

    if (config.smartTrend) {
      const sessionHighlighter = (time: Time, index) => {
        const tr = trend[index]; // .find(c => (c?.time * 1000) >= (time as number));

        // let tr = newTrend.find(c => (c?.time * 1000) >= (time as number));
        const _trend = tr?.trend;
        if (!tr) {
          // tr = newTrend.findLast(c => (c?.time * 1000) <= (time as number));
          // trend = tr.trend * -1;
        }
        if (!_trend) {
          return 'gray';
        }
        if (_trend > 0) {
          return 'rgba(20, 131, 92, 0.4)';
        }
        if (_trend < 0) {
          return 'rgba(157, 43, 56, 0.4)';
        }

        const date = getDate(time);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend 🏖️
          return 'rgba(255, 152, 1, 0.08)';
        }
        return 'rgba(41, 98, 255, 0.08)';
      };

      const sessionHighlighting = new SessionHighlighting(sessionHighlighter);
      _primitives.push(sessionHighlighting);
    }

    return _primitives;
  }, [
    robotOB,
    fbgs,
    config.showRobotOB,
    orderBlocks,
    config.smartTrend,
    trend,
    config.imbalances,
    config.showSMT,
    config.showOB,
    config.showEndOB,
    config.imbalances,
    data,
  ]);

  const poses = useMemo(
    () =>
      positions.map((s) => [
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
      ]),
    [positions],
  );

  const markers = useMemo(() => {
    const allMarkers = [];
    if (config.showOB || config.showEndOB || config.imbalances) {
      const checkShow = (ob) => {
        let result = false;
        if (!ob) {
          return false;
        }
        if (config.showOB && !ob.endCandle) {
          result = true;
        }
        if (config.showEndOB && Boolean(ob.endCandle)) {
          result = true;
        }
        if (ob.isSMT && !config.showSMT) {
          result = false;
        }
        return result;
      };
      allMarkers.push(
        ...orderBlocks.filter(checkShow).map((s) => ({
          color: s.side === 'low' ? markerColors.bullColor : markerColors.bearColor,
          time: (s.textTime || s.time) as Time,
          shape: 'text',
          position: s.side === 'high' ? 'aboveBar' : 'belowBar',
          text: s.text,
        })),
      );

      allMarkers.push(
        ...fbgs.filter(checkShow).map((s) => ({
          color: s.side === 'low' ? markerColors.bullColor : markerColors.bearColor,
          time: (s.textTime || s.time) as Time,
          shape: 'text',
          position: s.side === 'high' ? 'aboveBar' : 'belowBar',
          text: s.text,
        })),
      );

      if (config.showRobotOB) {
        allMarkers.push(
          ...robotOB.filter(checkShow).map((s) => ({
            color: s.type === 'low' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.textTime || s.time) as Time,
            shape: 'text',
            position: s.type === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text,
          })),
        );
      }
    }
    if (config.swings) {
      allMarkers.push(...swingsToMarkers(swings));
    }

    if (config.showPositions) {
      allMarkers.push(...poses.flat());
    }

    return allMarkers;
  }, [
    swings,
    poses,
    fbgs,
    config.showRobotOB,
    robotOB,
    orderBlocks,
    config.showSMT,
    config.showOB,
    config.showPositions,
    config.showEndOB,
    config.imbalances,
    config.swings,
  ]);

  const lineSerieses = useMemo(() => {
    const _lineSerieses = [];
    if (config.showPositions) {
      _lineSerieses.push(
        ...poses.map(([open, close]) => ({
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
        })),
      );
    }
    if (config.BOS) {
      _lineSerieses.push(...bosesToLineSerieses(boses));
    }
    return _lineSerieses;
  }, [poses, config.showPositions, config.BOS, boses]);

  const maxRR = 10;

  const marksRR: SliderSingleProps['marks'] = {
    [1]: 1,
    [5]: 5,
    [maxRR]: maxRR,
  };

  const marksPR: SliderSingleProps['marks'] = {
    [0]: 0,
    [0.5]: 0.5,
    [1]: 1,
  };

  const handleMouseDown = (func) => {
    holdTimerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        // Ваша цикличная логика здесь
        func();
      }, 50);
    }, holdDuration);
  };

  const handleMouseUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const historyColumns = [
    {
      title: 'Паттерн',
      dataIndex: 'name',
      key: 'name',
    },
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
      render: (value, row) => moment(row?.openTime * 1000).format('YYYY-MM-DD HH:mm'),
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
      render: (value, row) => moment(row?.closeTime * 1000).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'RR',
      dataIndex: 'RR',
      key: 'RR',
      align: 'right',
      render: (value) => value?.toFixed(2),
    },
    {
      title: 'Финрез',
      dataIndex: 'newPnl',
      key: 'newPnl',
      align: 'right',
      render: (value, row) => (row.newPnl ? moneyFormat(row.newPnl, 'RUB', 2, 2) : '-'),
    },
  ].filter(Boolean);

  return (
    <Layout style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <Sider width={280} style={{ padding: 16, height: 'calc(100vh - 84px)', overflow: 'auto', overflowX: 'hidden' }}>
        <Divider plain orientation="left">
          Фильтры
        </Divider>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Radio.Group value={env} onChange={(e) => setEnv(e.target.value)}>
            <Radio.Button value="dev">Development</Radio.Button>
            <Radio.Button value="prod">Production</Radio.Button>
          </Radio.Group>
        </div>
        <Checkbox.Group
          onChange={setCheckboxValues}
          value={Array.from(checkboxValues)}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <Checkbox key="swings" value="swings">
            Swings
          </Checkbox>
          <Checkbox key="smartTrend" value="smartTrend">
            Умный тренд
          </Checkbox>
          <Checkbox key="BOS" value="BOS">
            Структуры
          </Checkbox>
          <Checkbox key="showFVG" value="showFVG">
            Показывать FVG
          </Checkbox>
          <Checkbox key="showSMT" value="showSMT">
            Показывать SMT
          </Checkbox>
          <Checkbox key="showOB" value="showOB">
            Актуальные OB
          </Checkbox>
          <Checkbox key="showEndOB" value="showEndOB">
            Отработанные OB
          </Checkbox>
          <Checkbox key="imbalances" value="imbalances">
            Имбалансы
          </Checkbox>
          <Checkbox key="showPositions" value="showPositions">
            Сделки
          </Checkbox>
          <Checkbox key="tradeOB" value="tradeOB">
            Торговать OB
          </Checkbox>
          <Checkbox key="tradeOBIDM" value="tradeOBIDM">
            Торговать OB_IDM
          </Checkbox>
          <Checkbox key="tradeIDMIFC" value="tradeIDMIFC">
            Торговать IDM_IFC
          </Checkbox>
          <Checkbox key="tradeCHoCHWithIDM" value="tradeCHoCHWithIDM">
            Торговать CHoCHWithIDM
          </Checkbox>
          <Checkbox key="tradeFlipWithIDM" value="tradeFlipWithIDM">
            Торговать FlipWithIDM
          </Checkbox>
          <Checkbox key="tradeOBEXT" value="tradeOBEXT">
            Торговать OBEXT
          </Checkbox>
          <Checkbox key="tradeEXTIFC" value="tradeEXTIFC">
            Торговать EXT_IFC
          </Checkbox>
          <Checkbox key="withMove" value="withMove">
            Двигать Имбаланс
          </Checkbox>
          <Checkbox key="showSession" value="showSession">
            Показывать сессии
          </Checkbox>
          <Checkbox key="trend2" value="trend2">
            trend2
          </Checkbox>
          <Checkbox key="tradeStartSessionMorning" value="tradeStartSessionMorning">
            tradeStartSessionMorning
          </Checkbox>
          <Checkbox key="tradeStartSessionDay" value="tradeStartSessionDay">
            tradeStartSessionDay
          </Checkbox>
          <Checkbox key="tradeStartSessionEvening" value="tradeStartSessionEvening">
            tradeStartSessionEvening
          </Checkbox>
          <Checkbox key="showWeekly" value="showWeekly">
            Показывать хайлой недельки
          </Checkbox>
          <Checkbox key="showHiddenSwings" value="showHiddenSwings">
            Показывать скрытые точки
          </Checkbox>
          <Checkbox key="showRobotOB" value="showRobotOB">
            Показывать ОБ с робота
          </Checkbox>
          <Checkbox key="newSMT" value="newSMT">
            Предугадывать SMT
          </Checkbox>
          <Checkbox key="showFake" value="showFake">
            Fake BOS
          </Checkbox>
        </Checkbox.Group>

        <Divider plain orientation="left">
          Риски
        </Divider>
        <Space>
          <Row>
            <Form.Item label="Риск на сделку">
              <Input style={{ width: 80 }} value={stopMargin} onChange={(e) => setStopMargin(Number(e.target.value))} />
            </Form.Item>
            {/*<Form.Item label="Отступ стопа в %">*/}
            {/*    <InputNumber style={{width: 80}} value={stopPaddingPercent}*/}
            {/*                 onChange={(e) => setstopPaddingPercent(Number(e))}/>*/}
            {/*</Form.Item>*/}
            {/*<Form.Item label="Risk Rate">*/}
            {/*    <Slider style={{width: 200}} marks={marksRR} defaultValue={multiStop} onChange={setMultiStop}*/}
            {/*            min={1} max={10} step={1}/>*/}
            {/*</Form.Item>*/}
            {/*<Form.Item label="Percent Rate">*/}
            {/*    <Slider style={{width: 200}} defaultValue={maxDiff} marks={marksPR} onChange={setMaxDiff}*/}
            {/*            min={0}*/}
            {/*            max={1} step={0.1}/>*/}
            {/*</Form.Item>*/}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                Профит:{' '}
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(profit.PnL)}
              </div>
              <div>Прибыльных: {profit.profits}</div>
              <div>Убыточных: {profit.losses}</div>
              <div>Винрейт: {((profit.profits / (profit.profits + profit.losses)) * 100).toFixed(2)}%</div>
              <div>Совпадений с роботом: {robotEqualsPercent.toFixed(2)}%</div>
            </div>
            <Slider style={{ width: 200 }} defaultValue={windowLength} onChange={setWindowLength} />
            <Slider style={{ width: 200 }} step={10} max={100} min={0} defaultValue={tralingPercent} onChange={settralingPercent} />
          </Row>
        </Space>
      </Sider>
      <Content
        style={{
          padding: '0',
          minHeight: 280,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          height: 'calc(100vh - 74px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', zIndex: 10, top: 4, left: 4, display: 'flex', gap: '8px' }}>
          <TickerSelect value={ticker} onSelect={onSelectTicker} />
          <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
          <TimeframeSelect value={tf} onChange={setSize} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setOffset((prev) => (prev = data.length - 2))}>Начало</Button>
            <Button
              style={{ display: 'block' }}
              icon={<LeftOutlined />}
              onMouseDown={() => handleMouseDown(() => setOffset((prev) => (prev += 1)))}
              onMouseUp={handleMouseUp}
              onClick={() => setOffset((prev) => (prev += 1))}
            />
            <Button
              style={{ display: 'block' }}
              icon={<RightOutlined />}
              onMouseDown={() => handleMouseDown(() => setOffset((prev) => (prev -= 1)))}
              onMouseUp={handleMouseUp}
              onClick={() => setOffset((prev) => (prev -= 1))}
            />
          </div>
        </div>
        <Chart
          lineSerieses={lineSerieses}
          hideInternalCandles
          primitives={primitives}
          markers={markers}
          toolTipTop="40px"
          toolTipLeft="4px"
          data={data.map(({ borderColor, wickColor, color, ...d }, i, array) =>
            (offset >= 0 && i > array.length - 1 - offset) || (offset < 0 && i <= -offset)
              ? {
                  ...d,
                  borderColor: 'rgba(44,60,75, 1)',
                  wickColor: 'rgba(44,60,75, 1)',
                  color: 'rgba(0, 0, 0, 0)',
                }
              : d,
          )}
          ema={[]}
        />
        <Table
          size="small"
          dataSource={positions}
          columns={historyColumns as any}
          pagination={{
            pageSize: 10,
          }}
          onRow={(record) => {
            return {
              style:
                record.pnl < 0
                  ? {
                      backgroundColor: '#d1261b66',
                      color: 'rgb(255, 117, 132)',
                    }
                  : record.pnl > 0
                    ? {
                        backgroundColor: '#15785566',
                        color: 'rgb(44, 232, 156)',
                      }
                    : undefined,
              className: 'hoverable',
            };
          }}
        />
      </Content>
    </Layout>
  );
};

export default SoloTestPage;
