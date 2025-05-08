import {calculateTakeProfit} from "./utils";

import {HistoryObject, POI, Swing} from "./THUltimate/models.ts";

export interface Position {
    side: 'short' | 'long',
    name: string,
    takeProfit: number, stopLoss: number,
    openPrice: number, openTime: number, closeTime: number, pnl: number,
    quantity?: number;
    fee?: number;
    newPnl?: number;
    timeframe?: string;
    openVolume?: number;
    closeVolume?: number;
    ticker?: string;
    RR?: number;
}

export const calculatePositionsByOrderblocks = (candles: HistoryObject[], swings: Swing[], ob: POI[], maxDiff?: number, multiStop?: number, limitOrder: boolean = true, stopPaddingPercent: number = 0) => {
    const positions: Position[] = [];
    let lastExtremumIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    for (let i = 0; i < candles.length; i++) {
        const obItem = ob[i];
        const swing = swings[i];
        if(swing?.isExtremum){
            lastExtremumIndexMap[swing?.side] = i;
        }

        if (!obItem || !obItem.endCandle || !candles[obItem.endIndex + 1] || !obItem.canTrade || obItem.isSMT) {
            continue;
        }

        limitOrder = obItem.tradeOrderType === 'limit';

        const side = obItem.side === 'high' ? 'short' : 'long';
        let stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
        let openPrice = side === 'long' ? obItem.startCandle.high : obItem.startCandle.low;
        const openTime = limitOrder ? obItem.endCandle.time : candles[obItem.endIndex + 1].time;

        const lastExtremumIndex = obItem.side === 'high' ? lastExtremumIndexMap['low'] : lastExtremumIndexMap['high'];

        if(!limitOrder){
            openPrice = candles[obItem.endIndex + 1].open;
        }

        if(stopPaddingPercent){
            stopLoss *= (1 - stopPaddingPercent / 100);
        }

        let takeProfit = obItem.takeProfit;
        if(!maxDiff || !takeProfit){
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

        if (RR < 2) {
            continue;
        }

        if (!limitOrder && side === 'short' && candles[obItem.endIndex].close >= openPrice) {
            continue;
        }
        if (!limitOrder && side === 'long' && candles[obItem.endIndex].close <= openPrice) {
            continue;
        }

        for (let j = obItem.endIndex + 1; j < candles.length; j++) {
            if (side === 'long' && candles[j].low <= stopLoss) {
                positions.push({
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: stopLoss - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].high >= stopLoss) {
                positions.push({
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: openPrice - stopLoss
                });
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit) {
                positions.push({
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: takeProfit - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].low <= takeProfit) {
                positions.push({
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}

export const iterationCalculatePositions = (candles: HistoryObject[], swings: Swing[], ob: POI[], maxDiff?: number, multiStop?: number, limitOrder: boolean = true, stopPaddingPercent: number = 0) => {
    let positions = {};
    for(let i = 0; i < candles.length - 1; i++){
        const partCandles = candles.slice(0, i);
        const partSwings = swings.slice(0, i);
        const partOB = ob.slice(0, i);

        const _pos = calculatePositionsByOrderblocks(partCandles, partSwings, partOB, maxDiff, multiStop, limitOrder, stopPaddingPercent);

        _pos.forEach(pos => {
            if(!positions[pos.openTime]){
                positions[pos.openTime] = pos;
            }
        })
    }

    return Object.values<Position>(positions);
}
