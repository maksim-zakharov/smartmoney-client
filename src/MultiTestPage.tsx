import { Card, Checkbox, Col, Divider, Form, Input, Layout, Radio, Row, Slider, Space, Statistic, Table } from 'antd';
import { TickerSelect } from './TickerSelect';
import React, { useEffect, useMemo, useState } from 'react';
import FormItem from 'antd/es/form/FormItem';
import { TimeframeSelect } from './TimeframeSelect';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { moneyFormat } from './MainPage/MainPage';
import moment from 'moment';
import { calculatePositionsByOrderblocks, finishPosition, Position } from './samurai_patterns';
import { fetchCandlesFromAlor, fetchRisk, fetchRiskRates, formatDateTime, getSecurity, persision, refreshToken, uniqueBy } from './utils';
import { symbolFuturePairs } from '../symbolFuturePairs';
import { Chart } from './SoloTestPage/UpdatedChart';
import { DatesPicker } from './DatesPicker';
import { Link } from 'react-router-dom';
import { calculateTesting } from './sm-lib/th_ultimate';
import { cacheCandles, cacheRiskRates, cacheSecurity, getCachedCandles, getCachedRiskRates, getCachedSecurity } from './cacheService';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { HistoryObject, POIType } from './sm-lib/models';
import { notTradingTime } from './sm-lib/utils';
import { WorkerManager } from './workerManager';

export const MultiTestPage = () => {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState({ data: {}, LTFData: {} });
  const [successSymbols, setSuccessSymbols] = useState<{
    current: number;
    total: number;
    text: string;
  }>({ current: 0, total: 0, text: '' });
  const [allSecurity, setAllSecurity] = useState({});
  const [allRiskRates, setAllRiskRates] = useState({});
  const [data, setData] = useState([]);
  const [tf, onChangeTF] = useState<string>('300');
  const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
  const [tradeOBIDM, settradeOBIDM] = useState<boolean>(false);
  const [tradeIDMIFC, settradeIDMIFC] = useState<boolean>(false);
  const [tradeCHoCHWithIDM, settradeCHoCHWithIDM] = useState<boolean>(false);
  const [tradeFlipWithIDM, settradeFlipWithIDM] = useState<boolean>(false);
  const [tradeOBEXT, settradeOBEXT] = useState<boolean>(false);
  const [tradeEXTIFC, settradeEXTIFC] = useState<boolean>(false);
  const [withMove, setwithMove] = useState<boolean>(false);
  const [showFake, setfakeBOS] = useState<boolean>(false);
  const [showSMT, setshowSMT] = useState<boolean>(false);
  const [newSMT, setnewSMT] = useState<boolean>(false);
  const [trend2, settrend2] = useState<boolean>(false);
  const [tradeStartSessionMorning, settradeStartSessionMorning] = useState<boolean>(false);
  const [tradeStartSessionDay, settradeStartSessionDay] = useState<boolean>(false);
  const [tradeStartSessionEvening, settradeStartSessionEvening] = useState<boolean>(false);
  const [showHiddenSwings, setshowHiddenSwings] = useState<boolean>(true);
  const [ticker, onSelectTicker] = useState<string>('MTLR');
  const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<'default' | 'max'>('max');
  const [stopMargin, setStopMargin] = useState<number>(50);
  const [feePercent, setFeePercent] = useState<number>(0.04);
  const [baseTakePercent, setBaseTakePercent] = useState<number>(5);
  const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5);
  const [security, setSecurity] = useState();
  const [riskRates, setRiskRates] = useState();
  const [token, setToken] = useState();
  const fromDate = dayjs().add(-2, 'week');
  const toDate = dayjs().endOf('day');
  const [dates, onChangeRangeDates] = useState<Dayjs[]>([fromDate, toDate]);
  const [tralingPercent, settralingPercent] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const workerManager = useMemo(() => new WorkerManager(), []);

  const [risk, setRisk] = useState<any>();

  useEffect(() => {
    fetchRisk(token).then(setRisk);
  }, [token]);

  const positions = useMemo(() => {
    return [];
    const { swings, orderBlocks } = calculateTesting(data, {
      withMove,
      showHiddenSwings,
      newSMT,
      showFake,
      tradeIDMIFC,
      tradeCHoCHWithIDM,
      tradeFlipWithIDM,
      tradeOBIDM,
      tradeOBEXT,
      tradeEXTIFC,
      trend2,
      tradeStartSessionMorning,
      tradeStartSessionDay,
      tradeStartSessionEvening,
    });

    const canTradeOrderBlocks = orderBlocks.filter(
      (o) =>
        [
          POIType.CROSS_SESSION,
          POIType.FVG,
          POIType.OB_EXT,
          POIType.EXT_LQ_IFC,
          POIType.IDM_IFC,
          POIType.CHOCH_IDM,
          POIType.FLIP_IDM,
          POIType.Breaking_Block,
          POIType.OB_IDM,
        ].includes(o?.type) &&
        (showSMT || !o.isSMT) &&
        o.canTest,
    );

    const lotsize = security?.lotsize || 1;

    const fee = feePercent / 100;

    let positions = calculatePositionsByOrderblocks(
      security,
      data,
      swings,
      canTradeOrderBlocks,
      takeProfitStrategy === 'default' ? 0 : maxTakePercent,
      baseTakePercent,
      0,
      tralingPercent,
    );

    positions = uniqueBy((v) => v.openTime, positions);

    const isShortSellPossible = riskRates?.isShortSellPossible || false;
    if (!isShortSellPossible) {
      positions = positions.filter((p) => p.side !== 'short');
    }

    return positions
      .filter((p) => Boolean(p.pnl))
      .map(
        finishPosition({
          lotsize,
          fee,
          tf,
          ticker,
          stopMargin,
        }),
      )
      .filter((s) => s.quantity)
      .sort((a, b) => b.openTime - a.openTime);
  }, [
    tralingPercent,
    data,
    showFake,
    newSMT,
    trend2,
    tradeStartSessionMorning,
    tradeStartSessionDay,
    tradeStartSessionEvening,
    showHiddenSwings,
    showSMT,
    withMove,
    tradeEXTIFC,
    tradeCHoCHWithIDM,
    tradeFlipWithIDM,
    tradeOBEXT,
    tradeIDMIFC,
    tradeOBIDM,
    feePercent,
    riskRates,
    security,
    stopMargin,
    baseTakePercent,
    maxTakePercent,
    takeProfitStrategy,
  ]);

  const [allPositions, setallPositions] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const tickers = Object.keys(allData.data);
      if (!tickers.length) {
        return;
      }

      const positionBatches = [];

      const previousDurations = []; // Массив для хранения времени выполнения предыдущих итераций

      function formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        return `Осталось ${hours > 0 ? hours + 'ч ' : ''}${minutes}м ${seconds}с`;
      }

      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        const data = allData.data[ticker];
        const LTFData = allData.LTFData[ticker];
        const iterationStart = Date.now();

        // console.log(`[${ticker}] Вычисляем стратегию.`)
        const positions = await workerManager.emit<Position[]>({
          config: {
            withMove,
            showHiddenSwings,
            newSMT,
            trend2,
            tradeStartSessionMorning,
            tradeStartSessionDay,
            tradeStartSessionEvening,
            showFake,
            tradeOBIDM,
            tradeIDMIFC,
            tradeCHoCHWithIDM,
            tradeFlipWithIDM,
            tradeOBEXT,
            tradeEXTIFC,
            showSMT,
          },
          data,
          LTFData,
          allSecurity,
          ticker,
          tf,
          stopMargin,
          feePercent,
          allRiskRates,
          maxTakePercent,
          baseTakePercent,
          tralingPercent,
          takeProfitStrategy,
        });
        // console.log(`[${ticker}] Вычисление завершено.`)

        positionBatches.push(positions);

        // Замеряем время выполнения итерации
        const iterationDuration = Date.now() - iterationStart;
        previousDurations.push(iterationDuration);

        // Ограничиваем историю последних N итераций для более актуального среднего
        if (previousDurations.length > 10) {
          previousDurations.shift();
        }

        // Рассчитываем среднее время итерации
        const avgDuration = previousDurations.reduce((sum, d) => sum + d, 0) / previousDurations.length;

        // Рассчитываем оставшееся время
        const remainingIterations = tickers.length - positionBatches.length;
        const estimatedRemaining = remainingIterations * avgDuration;

        setSuccessSymbols((prevState) => ({
          ...prevState,
          current: prevState.total / 2 + i + 1,
          text: formatTime(estimatedRemaining),
        }));
      }

      const _allPositions = positionBatches
        .flat()
        .filter((s) => s.quantity)
        .sort((a, b) => b.openTime - a.openTime);
      console.log(_allPositions);
      setallPositions(_allPositions);
      setLoading(false);
    })();
  }, [
    tralingPercent,
    tradeIDMIFC,
    tradeCHoCHWithIDM,
    tradeFlipWithIDM,
    tradeOBEXT,
    tradeEXTIFC,
    tradeOBIDM,
    showFake,
    showSMT,
    newSMT,
    tradeStartSessionMorning,
    tradeStartSessionDay,
    tradeStartSessionEvening,
    trend2,
    showHiddenSwings,
    withMove,
    allData.LTFData,
    allData.data,
    feePercent,
    allRiskRates,
    allSecurity,
    stopMargin,
    baseTakePercent,
    maxTakePercent,
    takeProfitStrategy,
  ]);

  // const allPositions = useMemo(() => {
  //     const topLiquidStocks = ['SBER', 'GAZP', 'SBERP', 'YDEX', 'SMLT', 'LKOH', 'ROSN', 'PIKK', 'T', 'VTBR', 'RNFT'];
  //
  //     return Object.entries(allData.data)
  //         // .filter(([ticker]) => (!tradeStartSessionDay && !tradeStartSessionEvening && !tradeStartSessionMorning) || topLiquidStocks.includes(ticker))
  //         .map(([ticker, data]: any[]) => {
  //             const {swings, orderBlocks} = calculateTesting(data, {
  //                     withMove,
  //                     showHiddenSwings,
  //                     newSMT,
  //                     trend2,
  //                     tradeStartSessionMorning,
  //                     tradeStartSessionDay,
  //                     tradeStartSessionEvening,
  //                     showFake,
  //                     tradeOBIDM,
  //                     tradeIDMIFC,
  //                     tradeCHoCHWithIDM,
  //                     tradeFlipWithIDM,
  //                     tradeOBEXT,
  //                     tradeEXTIFC,
  //                 },
  //                 allData.LTFData[ticker]
  //             );
  //
  //             const canTradeOrderBlocks = orderBlocks.filter((o) => [POIType.CROSS_SESSION, POIType.FVG, POIType.OB_EXT, POIType.EXT_LQ_IFC, POIType.IDM_IFC, POIType.CHOCH_IDM, POIType.FLIP_IDM, POIType.Breaking_Block].includes(o?.type) && (showSMT || !o.isSMT) && o.canTest);
  //
  //
  //             const nonCHOCHOB = canTradeOrderBlocks.filter(o => o.type !== POIType.CHOCH_IDM);
  //             const CHOCHOB = canTradeOrderBlocks.filter(o => o.type === POIType.CHOCH_IDM);
  //
  //             const lotsize = (allSecurity[ticker]?.lotsize || 1)
  //
  //             const fee = feePercent / 100;
  //
  //             let positions = calculatePositionsByOrderblocks(allSecurity[ticker], data, swings, nonCHOCHOB, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent, 0, tralingPercent)
  //
  //             const LTFPositions = calculatePositionsByOrderblocks(allSecurity[ticker], allData.LTFData[ticker], swings, CHOCHOB, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent, 0, tralingPercent)
  //
  //             positions.push(...LTFPositions);
  //
  //             const isShortSellPossible = allRiskRates[ticker]?.isShortSellPossible || false;
  //             if (!isShortSellPossible) {
  //                 positions = positions.filter(p => p.side !== 'short');
  //             }
  //
  //             return positions.filter(p => Boolean(p.pnl)).map(finishPosition({
  //                 ticker,
  //                 tf,
  //                 stopMargin,
  //                 fee,
  //                 lotsize
  //             }));
  //         }).flat().filter(s => s.quantity).sort((a, b) => b.openTime - a.openTime)
  // }, [tralingPercent, tradeIDMIFC, tradeCHoCHWithIDM, tradeFlipWithIDM, tradeOBEXT, tradeEXTIFC, tradeOBIDM, showFake, showSMT, newSMT,
  //     tradeStartSessionMorning,
  //     tradeStartSessionDay,
  //     tradeStartSessionEvening, trend2, showHiddenSwings, withMove, allData.LTFData, allData.data, feePercent, allRiskRates, allSecurity, stopMargin, baseTakePercent, maxTakePercent, takeProfitStrategy])

  const fetchAllTickerCandles = async () => {
    setLoading(true);
    const result = {};
    const resultLTF = {};
    const result1 = {};
    const result2 = {};
    const stockSymbols = symbolFuturePairs.map((curr) => curr.stockSymbol);
    for (let i = 0; i < stockSymbols.length; i++) {
      result[stockSymbols[i]] = await loadData(stockSymbols[i], tf, dates[0].unix(), dates[1].unix(), false).then((candles) =>
        candles.filter((candle) => !notTradingTime(candle)),
      );
      resultLTF[stockSymbols[i]] = await loadData(stockSymbols[i], '60', dates[0].unix(), dates[1].unix(), false).then((candles) =>
        candles.filter((candle) => !notTradingTime(candle)),
      );
      if (token) {
        result1[stockSymbols[i]] = await loadSecurity(stockSymbols[i], token);
        result2[stockSymbols[i]] = await loadRiskRate(stockSymbols[i], token);
      }
      setSuccessSymbols({
        total: stockSymbols.length * 2,
        current: i + 1,
        text: '',
      });
    }
    setAllRiskRates(result2);
    setAllSecurity(result1);
    setAllData({ data: result, LTFData: resultLTF });
    setLoading(false);
  };

  useEffect(() => {
    if (isAllTickers) {
      fetchAllTickerCandles();
    }
  }, [isAllTickers, tf, dates, token]);

  const { PnL, profits, losses, fee } = useMemo(() => {
    if (!security) {
      return {
        PnL: 0,
        profits: 0,
        losses: 0,
        fee: 0,
      };
    }

    const array = isAllTickers ? allPositions : positions;

    return {
      PnL: array.reduce((acc, curr) => acc + (curr.newPnl || 0), 0),
      fee: array.reduce((acc, curr) => acc + (curr.fee || 0), 0),
      profits: array.filter((p) => p.newPnl > 0).length,
      losses: array.filter((p) => p.newPnl < 0).length,
    };
  }, [isAllTickers, allPositions, positions, security?.lotsize]);

  const loadData = async (ticker: string, tf: string, from: number, to: number, useCache: boolean = true): Promise<HistoryObject[]> => {
    let data: HistoryObject[] = [];
    try {
      if (useCache) {
        data = await getCachedCandles(ticker);
      }

      if (!data?.length) {
        data = await fetchCandlesFromAlor(ticker, tf, from, to);
        if (useCache) await cacheCandles(ticker, data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return data;
  };

  const loadSecurity = async (ticker: string, token: string, useCache: boolean = true): Promise<any> => {
    let data;
    try {
      if (useCache) {
        data = await getCachedSecurity(ticker);
      }

      if (!useCache || !data) {
        data = await getSecurity(ticker, token);
        await cacheSecurity(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return data;
  };

  const loadRiskRate = async (ticker: string, token: string, useCache: boolean = true): Promise<any> => {
    let data;
    try {
      if (useCache) {
        data = await getCachedRiskRates(ticker);
      }

      if (!useCache || !data) {
        data = await fetchRiskRates(ticker, token, risk?.riskCategoryId);
        if (data?.instrument) await cacheRiskRates(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return data;
  };

  useEffect(() => {
    if (!isAllTickers && ticker) {
      loadData(ticker, tf, dates[0].unix(), dates[1].unix())
        .then((candles) => candles.filter((candle) => !notTradingTime(candle)))
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [isAllTickers, tf, ticker, dates]);

  useEffect(() => {
    localStorage.getItem('token') && refreshToken().then(setToken);
  }, []);

  useEffect(() => {
    token && loadSecurity(ticker, token).then(setSecurity);
  }, [ticker, token]);

  useEffect(() => {
    loadRiskRate(ticker, token).then(setRiskRates);
  }, [ticker, token]);

  const minStep = security?.minstep || 0.01;

  const oldOneTickerColumns = [
    isAllTickers && {
      title: 'Ticker',
      dataIndex: 'ticker',
      key: 'ticker',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Side',
      dataIndex: 'side',
      key: 'side',
    },
    {
      title: 'OpenPrice',
      dataIndex: 'openPrice',
      key: 'openPrice',
    },
    {
      title: 'OpenTime',
      dataIndex: 'openTime',
      key: 'openTime',
      render: (val) => formatDateTime(val * 1000),
    },
    {
      title: 'Open Volume',
      dataIndex: 'openVolume',
      key: 'openVolume',
      render: (val, row) =>
        moneyFormat(
          val,
          'RUB',
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
        ),
    },
    {
      title: 'CloseTime',
      dataIndex: 'closeTime',
      key: 'closeTime',
      render: (val) => formatDateTime(val * 1000),
    },
    {
      title: 'Close Volume',
      dataIndex: 'closeVolume',
      key: 'closeVolume',
      render: (val, row) =>
        moneyFormat(
          val,
          'RUB',
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
        ),
    },
    {
      title: 'StopLoss',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (val, row) =>
        moneyFormat(
          val,
          'RUB',
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
        ),
    },
    {
      title: 'TakeProfit',
      dataIndex: 'takeProfit',
      key: 'takeProfit',
      render: (val, row) =>
        moneyFormat(
          val,
          'RUB',
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
          persision(row.ticker ? allSecurity[ticker]?.minstep : minStep),
        ),
    },
    {
      title: 'PnL',
      dataIndex: 'newPnl',
      key: 'newPnl',
      render: (val) => moneyFormat(val, 'RUB', 2, 2),
    },
    {
      title: 'RR',
      dataIndex: 'RR',
      key: 'RR',
      render: (val) => val?.toFixed(2),
    },
    {
      title: 'Действия',
      render: (value, row) => {
        return (
          <Link
            to={`/test?ticker=${row.ticker || ticker}&tf=${row.timeframe}&checkboxes=tradeOB%2CBOS%2Cswings%2CshowEndOB%2CshowHiddenSwings%2CshowPositions%2CsmartTrend%2CtradeOBEXT&toDate=${dayjs(
              row.closeTime * 1000,
            )
              .add(1, 'day')
              .unix()}&fromDate=${dayjs(row.openTime * 1000)
              .add(-2, 'week')
              .unix()}`}
            target="_blank"
          >
            Тестер
          </Link>
        );
      },
    },
  ].filter(Boolean);

  const rowClassName = (record: any, index: number) => {
    // Например, подсветим строку, если age == 32
    return record.newPnl < 0 ? 'sell' : 'buy';
  };

  const profitChartData = useMemo(() => {
    const data = isAllTickers ? allPositions : positions;

    return Object.entries(
      data.reduce((acc, curr) => {
        const date = moment(curr.openTime * 1000).format('YYYY-MM-DD');
        if (!acc[date]) {
          acc[date] = curr.newPnl;
        } else {
          acc[date] += curr.newPnl;
        }
        return acc;
      }, {}),
    )
      .map(([date, PnL]) => ({
        time: moment(date, 'YYYY-MM-DD').unix(),
        value: PnL,
      }))
      .sort((a, b) => a.time - b.time)
      .reduce((acc, curr, i) => {
        if (i === 0) {
          acc = [curr];
        } else {
          acc.push({ ...curr, value: acc[i - 1].value + curr.value });
        }

        return acc;
      }, []);
  }, [isAllTickers, allPositions, positions]);

  const allPositionsAccumPnl = useMemo(
    () =>
      Object.entries(
        allPositions.reduce((acc, curr) => {
          if (!acc[curr.ticker]) {
            acc[curr.ticker] = { newPnl: 0, positions: [] };
          }
          acc[curr.ticker].newPnl += curr.newPnl;
          acc[curr.ticker].positions.push(curr);

          return acc;
        }, {} as any),
      )
        .map(([ticker, value]: any[]) => [
          ticker,
          {
            ...value,
            profits: value.positions.filter((p) => p.newPnl > 0).length,
            losses: value.positions.filter((p) => p.newPnl < 0).length,
          },
        ])
        .sort((a: any, b: any) => b[1].newPnl - a[1].newPnl),
    [allPositions],
  );

  return (
    <Layout style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <Sider
        width={300}
        style={{ padding: 16 }}
        collapsedWidth={40}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <Form
          layout="vertical"
          style={{
            height: 'calc(100vh - 84px)',
            overflow: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Row gutter={8} align="bottom">
            <Col>
              <FormItem>
                <Checkbox checked={tradeOBIDM} onChange={(e) => settradeOBIDM(e.target.checked)}>
                  Торговать OB_IDM
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeIDMIFC} onChange={(e) => settradeIDMIFC(e.target.checked)}>
                  Торговать IDM_IFC
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeOBEXT} onChange={(e) => settradeOBEXT(e.target.checked)}>
                  Торговать OBEXT
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeFlipWithIDM} onChange={(e) => settradeFlipWithIDM(e.target.checked)}>
                  Торговать FlipWithIDM
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeCHoCHWithIDM} onChange={(e) => settradeCHoCHWithIDM(e.target.checked)}>
                  Торговать CHoCHWithIDM
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeEXTIFC} onChange={(e) => settradeEXTIFC(e.target.checked)}>
                  Торговать EXT_IFC
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={withMove} onChange={(e) => setwithMove(e.target.checked)}>
                  Двигать к имбалансу
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={showFake} onChange={(e) => setfakeBOS(e.target.checked)}>
                  Fake BOS
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={showSMT} onChange={(e) => setshowSMT(e.target.checked)}>
                  Торговать SMT
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={trend2} onChange={(e) => settrend2(e.target.checked)}>
                  trend2
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeStartSessionMorning} onChange={(e) => settradeStartSessionMorning(e.target.checked)}>
                  tradeStartSessionMorning
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeStartSessionDay} onChange={(e) => settradeStartSessionDay(e.target.checked)}>
                  tradeStartSessionDay
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={tradeStartSessionEvening} onChange={(e) => settradeStartSessionEvening(e.target.checked)}>
                  tradeStartSessionEvening
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={newSMT} onChange={(e) => setnewSMT(e.target.checked)}>
                  Предугадывать SMT
                </Checkbox>
              </FormItem>
            </Col>
            <Col>
              <FormItem>
                <Checkbox checked={showHiddenSwings} onChange={(e) => setshowHiddenSwings(e.target.checked)}>
                  Показывать скрытые точки
                </Checkbox>
              </FormItem>
            </Col>
          </Row>
          <Divider plain orientation="left">
            Риски и комиссии
          </Divider>
          <Row gutter={8} align="bottom">
            <Col>
              <FormItem label="Тейк-профит стратегия">
                <Radio.Group onChange={(e) => onChangeTakeProfitStrategy(e.target.value)} value={takeProfitStrategy}>
                  <Radio value="default">Стоп-лосс</Radio>
                  <Radio value="max">Экстремум</Radio>
                </Radio.Group>
              </FormItem>
            </Col>
            <Col>
              <FormItem label="Базовый коэф. тейк-профита">
                <Slider
                  value={baseTakePercent}
                  disabled={takeProfitStrategy === 'max'}
                  onChange={setBaseTakePercent}
                  min={1}
                  step={1}
                  max={20}
                />
              </FormItem>
            </Col>
            <Col>
              <FormItem label="Max коэф. тейк-профита">
                <Slider
                  value={maxTakePercent}
                  disabled={takeProfitStrategy === 'default'}
                  onChange={setMaxTakePercent}
                  min={0.1}
                  step={0.1}
                  max={1}
                />
              </FormItem>
            </Col>
            <Col>
              <FormItem label="Риск на сделку">
                <Input value={stopMargin} onChange={(e) => setStopMargin(Number(e.target.value))} />
              </FormItem>
            </Col>
            <Col>
              <FormItem label="Размер комиссии в %">
                <Slider value={feePercent} onChange={setFeePercent} min={0.01} step={0.01} max={0.4} />
              </FormItem>
            </Col>
            <Col>
              <FormItem label="Трейлинг-стоп">
                <Slider style={{ width: 200 }} step={10} max={100} min={0} defaultValue={tralingPercent} onChange={settralingPercent} />
              </FormItem>
            </Col>
          </Row>
        </Form>
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
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            top: 4,
            left: 4,
            display: 'flex',
            gap: '8px',
          }}
        >
          <Space>
            <Checkbox checked={isAllTickers} onChange={(e) => onCheckAllTickers(e.target.checked)}>
              Все
            </Checkbox>
            <TickerSelect value={ticker} disabled={isAllTickers} onSelect={onSelectTicker} />
          </Space>
          <DatesPicker value={dates} onChange={onChangeRangeDates} />
          <TimeframeSelect value={tf} onChange={onChangeTF} />
        </div>
        <Row style={{ paddingBottom: '8px' }} gutter={8}>
          <Col span={24}>
            <Chart
              height={400}
              showVolume={false}
              seriesType="Line"
              lineSerieses={[]}
              hideInternalCandles
              primitives={[]}
              markers={[]}
              data={profitChartData}
              ema={[]}
            />
          </Col>
        </Row>
        <Row style={{ paddingBottom: '8px' }} gutter={8}>
          {allPositionsAccumPnl.map(([ticker, value]) => (
            <Col span={2}>
              <Card bordered={false}>
                <Statistic
                  title={ticker}
                  value={moneyFormat(value.newPnl, 'RUB', 2, 2)}
                  precision={2}
                  valueStyle={{
                    color: value.newPnl > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                  }}
                  suffix={`(${!value.profits ? 0 : ((value.profits * 100) / (value.profits + value.losses)).toFixed(2)})%`}
                />
              </Card>
            </Col>
          ))}
        </Row>
        <Row style={{ paddingBottom: '8px' }} gutter={8}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Общий финрез"
                value={moneyFormat(PnL, 'RUB', 2, 2)}
                precision={2}
                valueStyle={{
                  color: PnL > 0 ? 'rgb(44, 232, 156)' : 'rgb(255, 117, 132)',
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Комиссия"
                value={moneyFormat(fee, 'RUB', 2, 2)}
                precision={2}
                valueStyle={{ color: 'rgb(255, 117, 132)' }}
              />
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
          {/*<Col span={6}>*/}
          {/*    <Card bordered={false}>*/}
          {/*        <Statistic*/}
          {/*            title="Просадка"*/}
          {/*            value={drawdowns || 0}*/}
          {/*            precision={2}*/}
          {/*            valueStyle={{color: "rgb(255, 117, 132)"}}*/}
          {/*            suffix={`%`}*/}
          {/*        />*/}
          {/*    </Card>*/}
          {/*</Col>*/}
        </Row>
        <Row gutter={8}>
          <Table
            style={{ width: '100%' }}
            loading={{
              percent: +((successSymbols.current * 100) / successSymbols.total).toFixed(2),
              spinning: loading,
              tip: successSymbols.text,
            }}
            rowClassName={rowClassName}
            size="small"
            columns={oldOneTickerColumns}
            dataSource={isAllTickers ? allPositions : positions}
          />
        </Row>
      </Content>
    </Layout>
  );
};
