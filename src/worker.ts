// src/worker
import { calculateTesting } from './sm-lib/th_ultimate';
import { POIType } from './sm-lib/models';
import {
  calculatePositionsByOrderblocks,
  finishPosition,
} from './samurai_patterns';

self.onmessage = async (e: MessageEvent<any>) => {
  // Имитируем тяжелые вычисления (замените на ваш calculateTesting)
  const result = WorkerCalculateTesting(e.data);

  // Отправляем результат обратно в основной поток
  self.postMessage(result);
};

const WorkerCalculateTesting = ({
  config,
  data,
  LTFData,
  ticker,
  allSecurity,
  tf,
  stopMargin,
  feePercent,
  allRiskRates,
  maxTakePercent,
  baseTakePercent,
  tralingPercent,
  takeProfitStrategy,
}) => {
  const { swings, orderBlocks } = calculateTesting(data, config, LTFData);

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
      ].includes(o?.type) &&
      (config.showSMT || !o.isSMT) &&
      o.canTest,
  );

  const nonCHOCHOB = canTradeOrderBlocks.filter(
    (o) => o.type !== POIType.CHOCH_IDM,
  );
  const CHOCHOB = canTradeOrderBlocks.filter(
    (o) => o.type === POIType.CHOCH_IDM,
  );

  const lotsize = allSecurity[ticker]?.lotsize || 1;

  const fee = feePercent / 100;

  let positions = calculatePositionsByOrderblocks(
    allSecurity[ticker],
    data,
    swings,
    nonCHOCHOB,
    takeProfitStrategy === 'default' ? 0 : maxTakePercent,
    baseTakePercent,
    0,
    tralingPercent,
  );

  const LTFPositions = calculatePositionsByOrderblocks(
    allSecurity[ticker],
    LTFData,
    swings,
    CHOCHOB,
    takeProfitStrategy === 'default' ? 0 : maxTakePercent,
    baseTakePercent,
    0,
    tralingPercent,
  );

  positions.push(...LTFPositions);

  const isShortSellPossible =
    allRiskRates[ticker]?.isShortSellPossible || false;
  if (!isShortSellPossible) {
    positions = positions.filter((p) => p.side !== 'short');
  }

  return positions
    .filter((p) => Boolean(p.pnl))
    .map(
      finishPosition({
        ticker,
        tf,
        stopMargin,
        fee,
        lotsize,
      }),
    );
};

const _calculateTesting = ({
  config,
  allData,
  allSecurity,
  tf,
  stopMargin,
  feePercent,
  allRiskRates,
  maxTakePercent,
  baseTakePercent,
  tralingPercent,
  takeProfitStrategy,
}) => {
  return (
    Object.entries(allData.data)
      // .filter(([ticker]) => (!tradeStartSessionDay && !tradeStartSessionEvening && !tradeStartSessionMorning) || topLiquidStocks.includes(ticker))
      .map(([ticker, data]: any[]) => {
        const { swings, orderBlocks } = calculateTesting(
          data,
          config,
          allData.LTFData[ticker],
        );

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
            ].includes(o?.type) &&
            (config.showSMT || !o.isSMT) &&
            o.canTest,
        );

        const nonCHOCHOB = canTradeOrderBlocks.filter(
          (o) => o.type !== POIType.CHOCH_IDM,
        );
        const CHOCHOB = canTradeOrderBlocks.filter(
          (o) => o.type === POIType.CHOCH_IDM,
        );

        const lotsize = allSecurity[ticker]?.lotsize || 1;

        const fee = feePercent / 100;

        let positions = calculatePositionsByOrderblocks(
          allSecurity[ticker],
          data,
          swings,
          nonCHOCHOB,
          takeProfitStrategy === 'default' ? 0 : maxTakePercent,
          baseTakePercent,
          0,
          tralingPercent,
        );

        const LTFPositions = calculatePositionsByOrderblocks(
          allSecurity[ticker],
          allData.LTFData[ticker],
          swings,
          CHOCHOB,
          takeProfitStrategy === 'default' ? 0 : maxTakePercent,
          baseTakePercent,
          0,
          tralingPercent,
        );

        positions.push(...LTFPositions);

        const isShortSellPossible =
          allRiskRates[ticker]?.isShortSellPossible || false;
        if (!isShortSellPossible) {
          positions = positions.filter((p) => p.side !== 'short');
        }

        return positions
          .filter((p) => Boolean(p.pnl))
          .map(
            finishPosition({
              ticker,
              tf,
              stopMargin,
              fee,
              lotsize,
            }),
          );
      })
      .flat()
      .filter((s) => s.quantity)
      .sort((a, b) => b.openTime - a.openTime)
  );
};

// Для TypeScript, чтобы избежать ошибки "self"
export default {} as typeof Worker & { new (): Worker };
