import {HistoryObject} from "./api.ts";

export interface Swing {
    side?: 'high' | 'low',
    time: number;
    price: number;
    index: number;
}

export interface Trend{
    time: number;
    trend: number;
}

export const calculateSwings = (candles: HistoryObject[]) => {
    const swings: (Swing | null)[] = [];
    const highs: (Swing | null)[] = [];
    const lows: (Swing | null)[] = [];

    for (let i = 0; i < candles.length; i++) {
        const [left, middle, right] = candles.slice(i, i + 3);
        // Чтобы на каждую свечку было значение
        if(!right){
            highs.push(null);
            lows.push(null);
            continue;
        }
        const high: Swing = {
            side: 'high',
            time: middle.time,
            price: middle.high,
            index: i
        }
        const existHigh = left.high < middle.high && middle.high > right.high ? high : null
        highs.push(existHigh);

        const low: Swing = {
            side: 'low',
            time: middle.time,
            price: middle.low,
            index: i
        }
        const existLow = left.low > middle.low && middle.low < right.low ? low : null
        lows.push(existLow);

        if (existHigh)
            swings.push(existHigh)
        if (existLow)
            swings.push(existLow)
        if (!existHigh && !existLow)
            swings.push(null)
    }

    return {swings, highs, lows};
}

export const calculateStructure = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    let structure: Swing[] = [];

    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push(highs[i]);
            } else if (structure[structure.length - 1].price <= highs[i].price) {
                structure[structure.length - 1] = highs[i];
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push(lows[i]);
            } else if (structure[structure.length - 1].price >= lows[i].price) {
                structure[structure.length - 1] = lows[i];
            }
        }
    }

    const isBetween = (p1: Swing, p2: Swing, p3: Swing) => {
        if (p1.side === 'high' && p2.side === 'low') {
            return p3.price > p2.price && p3.price < p1.price;
        }
        if (p1.side === 'low' && p2.side === 'high') {
            return p3.price < p2.price && p3.price > p1.price;
        }
        return false;
    }

    // Фильтровать структуру
    for (let i = 0; i < structure.length - 3; i++) {
        const [s1, s2, s3, s4] = structure.slice(i, i + 4);
        if (isBetween(s1, s2, s3) && isBetween(s1, s2, s4)) {
            structure.splice(i + 2, 2);
            i--;
        }
    }

    for (let i = 0; i < structure.length - 1; i++) {
        const currStruct = structure[i];
        const nextStruct = structure[i + 1];

        if(nextStruct.side === 'low'){
            const batch = lows.slice(currStruct.index + 1, nextStruct.index + 2);
            const index = batch.reduce((acc, curr) => {
                if(curr && candles[acc].low > curr.price){
                    return curr.index + 1;
                }
                return acc;
            }, currStruct.index + 1);

            const lowest = candles[index];
            console.log('low', index);
            structure[i + 1].index = index;
            structure[i + 1].price = lowest.low;
            structure[i + 1].time = lowest.time;
        }
        if(nextStruct.side === 'high'){
            const batch = highs.slice(currStruct.index + 1, nextStruct.index + 2);
            const index = batch.reduce((acc, curr) => {
                if(curr && candles[acc].high < curr.price){
                    return curr.index + 1;
                }
                return acc;
            }, currStruct.index + 1);

            const lowest = candles[index];
            structure[i + 1].index = index;
            structure[i + 1].price = lowest.high;
            structure[i + 1].time = lowest.time;
        }
    }

    let highParts = new Array(candles.length).fill(null);
    let lowParts = new Array(candles.length).fill(null);

    let lastStructIndex = 0;
    for (let i = 0; i < candles.length; i++) {
        while(structure[lastStructIndex]?.index === i){
            if(structure[lastStructIndex].side === 'high'){
                highParts[i] = structure[lastStructIndex]
                lowParts[i] = null;
            } else {
                lowParts[i] = structure[lastStructIndex]
                highParts[i] = null;
            }
            lastStructIndex++;
        }
    }

    return {structure, highParts, lowParts};
}

export const calculateTrend = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    const trend: Trend[] = new Array(candles.length).fill(null);

    let highLows = new Array(candles.length).fill(null);

    let prevHigh = null;
    let currHigh = null;
    let prevLow = null;
    let currLow = null;
    for (let i = 0; i < candles.length; i++) {
        if(highs[i]){
            prevHigh = currHigh;
            currHigh = highs[i];
        }
        if(lows[i]){
            prevLow = currLow;
            currLow = lows[i];
        }

        if(!prevHigh || !prevLow || !currLow || !currHigh){
            trend[i] = null;
            continue;
        }

        if (prevHigh.price < currHigh.price && currHigh.index === i) {
            trend[i] = {time: currHigh.time, trend: 1};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if (prevLow.price > currLow.price && currLow.index === i) {
            trend[i] = {time: currLow.time, trend: -1};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if(!trend[i] && trend[i-1]) {
            trend[i] = {time: candles[i].time, trend: trend[i-1].trend};
        }
    }

    return {trend};
}

export interface Cross {
    from: Swing,
    textCandle: HistoryObject,
    to: Swing,
    type: 'low' | 'high',
    text: string
}

export const calculateCrosses = (highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[]) => {
    let boses: Cross[] = [];
    let lastHigh, lastLow;

    for (let i = 0; i < candles.length; i++) {
        const lastBOS = boses[boses.length - 1];
        if(lastLow?.price > candles[i].close && (!lastBOS || lastBOS?.from?.index < lastLow?.index)){
            const diff = i - lastLow.index;
            const textIndex = diff >= 6 ? i - Math.floor((i - lastLow.index) / 2) : lastLow.index;
            boses.push({
                from: lastLow,
                textCandle: candles[textIndex],
                to: {index: i, time: candles[i].time, price: candles[i].close},
                type: 'low',
                text: trends[i]?.trend === -1 ? 'BOS' : 'CHoCH'
            });
        }
        else if(lastHigh?.price < candles[i].close && (!lastBOS || lastBOS?.from?.index < lastHigh?.index)){
            const diff = i - lastHigh.index;
            const textIndex = diff >= 6 ? i - Math.floor((i - lastHigh.index) / 2) : lastHigh.index;
            boses.push({
                from: lastHigh,
                textCandle: candles[textIndex],
                to: {index: i, time: candles[i].time, price: candles[i].close},
                type: 'high',
                text: trends[i]?.trend === 1 ? 'BOS' : 'CHoCH'
            });
        }

        if(highs[i]){
            lastHigh = highs[i]
        }
        if(lows[i]){
            lastLow = lows[i]
        }
    }

    return {boses};
}

export const calculateBreakingBlocks = (crosses: Cross[], candles: HistoryObject[]) => {
    let bb = [];
    let lastCrossIndex = 0;
    for(let i = 0; i< candles.length; i++){
        const lastCross = crosses[lastCrossIndex];
        if(!lastCross){
            break;
        }
        if(lastCross.to.index < i){
            const textIndex = i - Math.floor((i - lastCross.from.index) / 2);

            if(lastCross.type === 'high' && candles[i].low <= lastCross.to.price && lastCross.to.index+1 < i){
                bb.push({type: 'high', textCandle: candles[textIndex], price: lastCross.from.price, fromTime: lastCross.from.time, toTime: candles[i].time, text: 'Breaking Block'});
                lastCrossIndex++;
            }
            if(lastCross.type === 'low' && candles[i].high >= lastCross.to.price && lastCross.to.index+1 < i){
                bb.push({type: 'low', textCandle: candles[textIndex], price: lastCross.from.price, fromTime: lastCross.from.time, toTime: candles[i].time, text: 'Breaking Block'});
                lastCrossIndex++;
            }
        }
    }

    return bb;
}

const isInsideBar = (candle: HistoryObject, bar: HistoryObject) => candle.high > bar.high && candle.low < bar.low;

const isOrderblock = (candles: HistoryObject[]) => {
    if(candles.length < 3){
        return null;
    }
    let lastCandle;
    let lastCandleIndex;
    let lastOrderblockCandle;
    const firstCandle = candles[0];
    // return null;

    for (let i = 1; i < candles.length - 1; i++) {
        if(!isInsideBar(candles[0], candles[i])){
            lastCandle = candles[i + 1];
            lastCandleIndex = i + 1;
            lastOrderblockCandle = candles[i-1];
            break;
        }
    }

    if(!lastCandle){
        return null;
    }


    if(lastCandle.low > firstCandle.high){
        return {orderblock: {time: firstCandle.time, high: Math.max(firstCandle.high, lastOrderblockCandle.high), low: Math.min(firstCandle.low, lastOrderblockCandle.low)}, lastImbalanceCandle: lastCandle, imbalanceIndex: lastCandleIndex, type: 'low'};
    }
    if(lastCandle.high < firstCandle.low){
        return {orderblock: {time: firstCandle.time,high: Math.max(firstCandle.high, lastOrderblockCandle.high), low: Math.min(firstCandle.low, lastOrderblockCandle.low)}, lastImbalanceCandle: lastCandle, imbalanceIndex: lastCandleIndex, type: 'high'};
    }
    return null;
}

export interface OrderBlock {
    index: number;
    time: number;
    imbalanceIndex: number;
    type: 'high' | 'low';
    startCandle: HistoryObject;
    endCandle?: HistoryObject;
    endIndex?: number;
}

/**
 * OB - строится на структурных точках,
 * только по тренду.
 * На все тело свечи,
 * длится пока его не коснутся,
 * и только если следующая свеча после структурной дает имбаланс
 * Если Об ни разу не пересекли - тянуть до последней свечи
 */
export const calculateOB = (highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[]) => {
    const trendHighs = highs.filter(h => h && trends[h.index]?.trend === -1);
    const trendLows = lows.filter(l => l && trends[l.index]?.trend === 1);

    let ob: OrderBlock [] = [];

    for (let i = 0; i < trendHighs.length; i++) {
        const candlesBatch = candles.slice(trendHighs[i].index, trendHighs[i].index + 10);
        const imbalance = isOrderblock(candlesBatch);
        if (imbalance?.type === 'high') {
            ob.push({
                type: imbalance.type,
                index: trendHighs[i].index,
                time: trendHighs[i].time,
                imbalanceIndex: imbalance.imbalanceIndex,
                startCandle: imbalance.orderblock
            } as any)
        }
    }

    for (let i = 0; i < trendLows.length; i++) {
        const candlesBatch = candles.slice(trendLows[i].index, trendLows[i].index + 10);
        const imbalance = isOrderblock(candlesBatch);
        if (imbalance?.type === 'low') {
            ob.push({
                type: imbalance.type,
                index: trendLows[i].index,
                time: trendLows[i].time,
                imbalanceIndex: imbalance.imbalanceIndex,
                startCandle: imbalance.orderblock
            } as any)
        }
    }

    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        for (let j = obItem.index + obItem.imbalanceIndex; j < candles.length - 1; j++) {
            const candle = candles[j];
            if (hasHitOB(obItem, candle)) {
                obItem.endCandle = candle;
                obItem.endIndex = j
                break;
            }
        }
    }

    return ob;
};

export const calculatePositions = (ob: OrderBlock[], candles: HistoryObject[]) => {
    const positions = [];
    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        if(!obItem.endCandle){
            continue;
        }
        const side = obItem.type === 'high' ? 'short' :'long';
        const max = side === 'long' ? Math.max(...candles.slice(obItem.index, obItem.endIndex).map(c => c.high)) : Math.min(...candles.slice(obItem.index, obItem.endIndex).map(c => c.low));
        const stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
        const openPrice = side === 'long' ? obItem.startCandle.high : obItem.startCandle.low;

        const takeProfit = side === 'long' ? openPrice + (max - openPrice) / 2 : openPrice - (openPrice - max) / 2;
        if(Math.abs(takeProfit - openPrice) / Math.abs(openPrice - stopLoss) < 1){
            continue;
        }
        for (let j = obItem.endIndex + 1; j < candles.length; j++) {
            if(side === 'long' && candles[j].low <= stopLoss){
                positions.push({side, takeProfit, stopLoss,
                    openPrice,openTime: obItem.endCandle.time, closeTime: candles[j].time,  pnl: stopLoss - openPrice});
                break;
            } else if(side ==='short' && candles[j].high >= stopLoss){
                positions.push({side, takeProfit, stopLoss,
                    openPrice,openTime: obItem.endCandle.time,closeTime: candles[j].time,  pnl: openPrice - stopLoss});
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit){
                positions.push({
                    side,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: obItem.endCandle.time,
                    closeTime: candles[j].time,
                    
                    pnl: takeProfit - openPrice
                });
                break;
            } else if(side ==='short' && candles[j].low <= takeProfit){
                positions.push({
                    side,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: obItem.endCandle.time,
                    closeTime: candles[j].time,
                    
                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}

const hasHitOB = (ob: OrderBlock, candle: HistoryObject) => (ob.type === 'high' && ob.startCandle.low <= candle.high) || (ob.type === 'low' && ob.startCandle.high >= candle.low);
