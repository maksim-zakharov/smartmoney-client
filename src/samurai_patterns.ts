import { calculateTakeProfit } from './utils';
import { Security } from './api';
import { HistoryObject, POI, POIType, Swing } from './sm-lib/models';
import Decimal from 'decimal.js';

export interface Position {
  side: 'short' | 'long';
  name: string;
  takeProfit: number;
  stopLoss: number;
  openPrice: number;
  openTime: number;
  closeTime?: number;
  pnl?: number;
  quantity?: number;
  fee?: number;
  newPnl?: number;
  timeframe?: string;
  openVolume?: number;
  closeVolume?: number;
  ticker?: string;
  RR?: number;
}

export const finishPosition =
  ({
    lotsize,
    fee,
    stopMargin,
    tf,
    ticker,
    quantity,
    lotVolume,
  }: {
    lotsize: number;
    fee: number;
    stopMargin: number;
    ticker: string;
    tf: string;
    quantity?: number;
    // Гарантийное обеспечение
    lotVolume?: number;
  }) =>
  (curr: Position) => {
    const diff = curr.side === 'long' ? curr.openPrice - curr.stopLoss : curr.stopLoss - curr.openPrice;
    const stopLossMarginPerLot = diff * lotsize;
    if (!quantity) {
      curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
    } else curr.quantity = quantity;

    const maxVolume = stopMargin * 700;
    if (!quantity && curr.openVolume > maxVolume) {
      curr.quantity = Math.floor(maxVolume / (curr.openPrice * lotsize));
    }
    if (!lotVolume) {
      curr.openVolume = new Decimal(curr.openPrice).mul(new Decimal(curr.quantity)).mul(new Decimal(lotsize)).toNumber();
    } else {
      curr.openVolume = new Decimal(lotVolume).mul(new Decimal(curr.quantity)).toNumber();
    }

    if (!lotVolume) {
      curr.closeVolume = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize;
    } else {
      curr.closeVolume = new Decimal(lotVolume).mul(new Decimal(curr.quantity)).toNumber();
    }

    const openFee = curr.openVolume * fee;
    const closeFee = curr.closeVolume * fee;
    // const openFee = curr.openPrice * curr.quantity * lotsize * fee;
    // const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;

    curr.fee = openFee + closeFee;
    curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee;
    curr.ticker = ticker;
    curr.timeframe = tf;
    // curr.RR = Math.abs(curr.takeProfit - curr.openPrice) / Math.abs(curr.stopLoss - curr.openPrice);

    return curr;
  };

export const calculatePositionsByOrderblocks = (
  security: Security,
  candles: HistoryObject[],
  swings: Swing[],
  ob: POI[],
  maxDiff?: number,
  multiStop?: number,
  stopPaddingPercent: number = 0,
  tralingPercent: number = 0,
) => {
  const positions: Position[] = [];
  const lastExtremumIndexMap: Record<'high' | 'low', number> = {
    high: null,
    low: null,
  };

  const nonClosedPositionsMap = new Map<number, Position>([]);

  for (let i = 0; i < ob.length; i++) {
    const obItem = ob[i];
    if (obItem.swing?.isExtremum) {
      lastExtremumIndexMap[obItem.swing?.side] = i;
    }

    if (!obItem || !obItem.endCandle || !candles[obItem.endIndex + 1] || !obItem.canTest) {
      continue;
    }

    const limitOrder = obItem.tradeOrderType === 'limit';

    let side = obItem.side === 'high' ? 'short' : 'long';
    if (obItem.type === POIType.Breaking_Block) {
      side = obItem.side === 'low' ? 'short' : 'long';
    }
    let stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
    if (security) {
      stopLoss =
        side === 'long'
          ? new Decimal(stopLoss).minus(security.minstep).toNumber()
          : new Decimal(stopLoss).plus(security.minstep).toNumber();
    }

    let openPrice = side === 'long' ? obItem.startCandle.high : obItem.startCandle.low;
    const openTime = limitOrder ? obItem.endCandle.time : candles[obItem.endIndex + 1].time;

    const lastExtremumIndex = obItem.side === 'high' ? lastExtremumIndexMap['low'] : lastExtremumIndexMap['high'];

    // Если вход по рынку - то вход по цене открытия следующей свечи
    if (!limitOrder) {
      openPrice = candles[obItem.endIndex + 1].open;
    }

    // if (!limitOrder && side === 'short' && candles[obItem.endIndex].close >= openPrice) {
    //     continue;
    // }
    // if (!limitOrder && side === 'long' && candles[obItem.endIndex].close <= openPrice) {
    //     continue;
    // }

    if (stopPaddingPercent) {
      stopLoss *= 1 - stopPaddingPercent / 100;
    }

    let takeProfit = obItem.takeProfit;
    if (!maxDiff || !takeProfit) {
      takeProfit = calculateTakeProfit({
        side,
        openPrice,
        stopLoss,
        maxDiff,
        multiStop,
        maxPrice: lastExtremumIndex ? swings[lastExtremumIndex].price : 0,
      });
    }
    const profit = Math.abs(takeProfit - openPrice);
    const loss = Math.abs(stopLoss - openPrice);

    if (!loss) {
      continue;
    }

    const RR = profit / loss;

    if (RR < 3 && ![POIType.FVG, POIType.CROSS_SESSION].includes(obItem.type)) {
      continue;
    }

    let closePosition: Position;

    for (let j = obItem.endIndex + 1; j < candles.length; j++) {
      if (tralingPercent) {
        /**
         * Если цена выше на Х от стопа, двигаем выше.
         * 100 -> 1
         * 10 -> 0.1
         * 100 / tralingPercent (100) = 1
         * 100 / tralingPercent (10) = 10
         */
        const multi = 100 / tralingPercent;
        const take = Math.abs(takeProfit - stopLoss) * (1 / multi);
        if (side === 'long') {
          if (candles[j].high - take > stopLoss) {
            stopLoss = candles[j].high - take;
          }
        }
        if (side === 'short') {
          if (candles[j].low + take < stopLoss) {
            stopLoss = candles[j].low + take;
          }
        }
      }

      if (side === 'long' && candles[j].low <= stopLoss) {
        closePosition = {
          RR,
          side,
          name: obItem.text,
          takeProfit,
          stopLoss,
          openPrice,
          openTime,
          closeTime: candles[j].time,
          pnl: stopLoss - openPrice,
        };
        break;
      } else if (side === 'short' && candles[j].high >= stopLoss) {
        closePosition = {
          RR,
          side,
          name: obItem.text,
          takeProfit,
          stopLoss,
          openPrice,
          openTime,
          closeTime: candles[j].time,
          pnl: openPrice - stopLoss,
        };
        break;
      } else if (side === 'long' && candles[j].high >= takeProfit) {
        closePosition = {
          RR,
          side,
          name: obItem.text,
          takeProfit,
          stopLoss,
          openPrice,
          openTime,
          closeTime: candles[j].time,

          pnl: takeProfit - openPrice,
        };
        break;
      } else if (side === 'short' && candles[j].low <= takeProfit) {
        closePosition = {
          RR,
          side,
          name: obItem.text,
          takeProfit,
          stopLoss,
          openPrice,
          openTime,
          closeTime: candles[j].time,

          pnl: openPrice - takeProfit,
        };
        break;
      }
    }

    if (closePosition) {
      positions.push(closePosition);
      nonClosedPositionsMap.delete(openTime);
    } else {
      nonClosedPositionsMap.set(openTime, {
        side,
        name: obItem.text,
        takeProfit,
        stopLoss,
        openPrice,
        openTime,
      });
    }
  }

  nonClosedPositionsMap.forEach((position) =>
    positions.push({
      ...position,
      closeTime: candles[candles.length - 1].time,
    }),
  );

  return positions;
};

export const iterationCalculatePositions = (
  security: Security,
  candles: HistoryObject[],
  swings: Swing[],
  ob: POI[],
  maxDiff?: number,
  multiStop?: number,
  stopPaddingPercent: number = 0,
  tralingPercent: number = 0,
  LTFdata?: HistoryObject[] = [],
) => {
  const positions = {};

  const nonCHOCHOB = ob.filter((o) => o.type !== POIType.CHOCH_IDM);
  const CHOCHOB = ob.filter((o) => o.type === POIType.CHOCH_IDM);

  // HTF candles
  for (let i = 0; i < candles.length - 1; i++) {
    const partCandles = candles.slice(0, i);
    const partSwings = swings.slice(0, i);
    const partOB = nonCHOCHOB.slice(0, i);

    const _pos = calculatePositionsByOrderblocks(
      security,
      partCandles,
      partSwings,
      partOB,
      maxDiff,
      multiStop,
      stopPaddingPercent,
      tralingPercent,
    );

    _pos.forEach((pos) => {
      if (!positions[pos.openTime] || !positions[pos.closeTime]) {
        positions[pos.openTime] = pos;
      }
    });
  }

  // LTF candles
  for (let i = 0; i < LTFdata.length - 1; i++) {
    const partCandles = LTFdata.slice(0, i);
    const partSwings = swings.slice(0, i);
    const partOB = CHOCHOB.slice(0, i);

    const _pos = calculatePositionsByOrderblocks(
      security,
      partCandles,
      partSwings,
      partOB,
      maxDiff,
      multiStop,
      stopPaddingPercent,
      tralingPercent,
    );

    _pos.forEach((pos) => {
      if (!positions[pos.openTime] || !positions[pos.closeTime]) {
        positions[pos.openTime] = pos;
      }
    });
  }

  return Object.values<Position>(positions);
};

export const calculateProdPositionFee = (curr) => {
  const openPrice = curr.limitTrade?.price;
  const closePrice = curr.stopLossTrade?.price || curr.takeProfitTrade?.price;
  const quantity = curr.limitTrade?.qtyUnits;
  const openFee = (0.04 / 100) * openPrice * quantity;
  const closeFee = (0.04 / 100) * closePrice * quantity;
  if (!openFee || !closeFee) {
    return 0;
  }
  return openFee + closeFee;
};
