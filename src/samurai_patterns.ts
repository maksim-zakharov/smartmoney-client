import {calculateTakeProfit} from "./utils";
import {HistoryObject, POI, POIType, Swing} from "./th_ultimate.ts";

export interface Position {
    side: 'short' | 'long',
    name: string,
    takeProfit: number,
    stopLoss: number,
    openPrice: number,
    openTime: number,
    closeTime?: number,
    pnl?: number,
    quantity?: number;
    fee?: number;
    newPnl?: number;
    timeframe?: string;
    openVolume?: number;
    closeVolume?: number;
    ticker?: string;
    RR?: number;
}

export const finishPosition = ({
                      lotsize,
                      fee,
                      stopMargin,
                      tf,
                      ticker
                  }: {
    lotsize: number,
    fee: number,
    stopMargin: number,
    ticker: string,
    tf: string
}) => (curr: Position) => {
    const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
    const stopLossMarginPerLot = diff * lotsize
    curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
    curr.openVolume = curr.openPrice * curr.quantity * lotsize
    curr.closeVolume = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize
    // const openFee = curr.openVolume * fee;
    // const closeFee = curr.closeVolume * fee;
    const openFee = curr.openPrice * curr.quantity * lotsize * fee;
    const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * lotsize * fee;

    curr.fee = openFee + closeFee;
    curr.newPnl = curr.pnl * curr.quantity * lotsize - curr.fee;
    curr.ticker = ticker;
    curr.timeframe = tf;
    curr.RR = Math.abs(curr.takeProfit - curr.openPrice) / Math.abs(curr.stopLoss - curr.openPrice);

    return curr;
}

export const calculatePositionsByOrderblocks = (candles: HistoryObject[], swings: Swing[], ob: POI[], maxDiff?: number, multiStop?: number, stopPaddingPercent: number = 0) => {
    const positions: Position[] = [];
    let lastExtremumIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    const nonClosedPositionsMap = new Map<number, Position>([]);

    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        if (obItem.swing?.isExtremum) {
            lastExtremumIndexMap[obItem.swing?.side] = i;
        }

        if (!obItem || !obItem.endCandle || !candles[obItem.endIndex + 1] || !obItem.canTest) {
            continue;
        }

        let limitOrder = obItem.tradeOrderType === 'limit';

        let side = obItem.side === 'high' ? 'short' : 'long';
        if(obItem.type === POIType.Breaking_Block){
            side = obItem.side === 'low' ? 'short' : 'long';
        }
        let stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
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
            stopLoss *= (1 - stopPaddingPercent / 100);
        }

        let takeProfit = obItem.takeProfit;
        if (!maxDiff || !takeProfit) {
            takeProfit = calculateTakeProfit({
                side,
                openPrice,
                stopLoss,
                maxDiff,
                multiStop,
                maxPrice: lastExtremumIndex ? swings[lastExtremumIndex].price : 0
            })
        }
        const profit = Math.abs(takeProfit - openPrice);
        const loss = Math.abs(stopLoss - openPrice);
        const RR = profit / loss;

        if (RR < 3) {
            continue;
        }

        let closePosition: Position;

        for (let j = obItem.endIndex + 1; j < candles.length; j++) {
            if (side === 'long' && candles[j].low <= stopLoss) {
                closePosition = {
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: stopLoss - openPrice
                };
                break;
            } else if (side === 'short' && candles[j].high >= stopLoss) {
                closePosition = {
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: openPrice - stopLoss
                };
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit) {
                closePosition = {
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: takeProfit - openPrice
                };
                break;
            } else if (side === 'short' && candles[j].low <= takeProfit) {
                closePosition = {
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                };
                break;
            }
        }

        if (closePosition) {
            positions.push(closePosition)
            nonClosedPositionsMap.delete(openTime)
        } else {
            nonClosedPositionsMap.set(openTime, {
                side,
                name: obItem.text,
                takeProfit,
                stopLoss,
                openPrice,
                openTime,
            })
        }
    }

    nonClosedPositionsMap.forEach(position => positions.push({
        ...position,
        closeTime: candles[candles.length - 1].time
    }))

    return positions;
}

export const iterationCalculatePositions = (candles: HistoryObject[], swings: Swing[], ob: POI[], maxDiff?: number, multiStop?: number, stopPaddingPercent: number = 0) => {
    let positions = {};
    for (let i = 0; i < candles.length - 1; i++) {
        const partCandles = candles.slice(0, i);
        const partSwings = swings.slice(0, i);
        const partOB = ob.slice(0, i);

        const _pos = calculatePositionsByOrderblocks(partCandles, partSwings, partOB, maxDiff, multiStop, stopPaddingPercent);

        _pos.forEach(pos => {
            if (!positions[pos.openTime] || !positions[pos.closeTime]) {
                positions[pos.openTime] = pos;
            }
        })
    }

    return Object.values<Position>(positions);
}
