import {HistoryObject} from "./api.ts";
import {calculateTakeProfit} from "./utils";
import moment from "moment";

export interface Swing {
    side?: 'high' | 'low',
    time: number;
    price: number;
    index: number;
}

export interface Trend{
    time: number;
    trend: number;
    index: number;
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

export const khrustikCalculateSwings = (candles: HistoryObject[]) => {
    const swings: (Swing | null)[] = new Array(candles.length).fill(null);
    const highs: (Swing | null)[] = new Array(candles.length).fill(null);
    const lows: (Swing | null)[] = new Array(candles.length).fill(null);

    let prevLowIndex = -1;
    let prevHighIndex = -1;
    let lastLowIndex = -1;
    let lastHighIndex = -1;

    for (let i = 0; i < candles.length; i++) {
        if (i === 0) {
            continue;
        }
        const prevLow = lows[i - 1];
        const prevHigh = highs[i - 1];
        const prevCandle = candles[i - 1];
        const currentCandle = candles[i];
        // Ищем перехай или перелоу

        const high: Swing = {
            side: 'high',
            time: currentCandle.time,
            price: currentCandle.high,
            index: i
        }
        const low: Swing = {
            side: 'low',
            time: currentCandle.time,
            price: currentCandle.low,
            index: i
        }
        const existSH = currentCandle.high > prevCandle.high ? high : null;
        const existSL = currentCandle.low < prevCandle.low ? low : null;

        if(existSH?.index !== existSL?.index){
            // Есть ли несколько вершин подряд
            if (existSH && lastHighIndex > lastLowIndex) {
                highs[lastHighIndex] = null;
                lastHighIndex = prevHighIndex;
            }
            if (existSL && lastHighIndex < lastLowIndex) {
                lows[lastLowIndex] = null;
                lastLowIndex = prevLowIndex;
            }
        } else {
            if(lastLowIndex === -1 || lastHighIndex < lastLowIndex){
                highs[i] = existSH;
                if (existSH) {
                    prevHighIndex = lastHighIndex;
                    lastHighIndex = i;
                }

                continue;
            }

            if(lastHighIndex === -1 || lastHighIndex > lastLowIndex){
                lows[i] = existSL;
                if (existSL) {
                    prevLowIndex = lastLowIndex;
                    lastLowIndex = i;
                }

                continue;
            }
        }

        if(lastLowIndex === -1 || lastHighIndex < lastLowIndex){
            highs[i] = existSH;
            if (existSH) {
                prevHighIndex = lastHighIndex;
                lastHighIndex = i;
            }
        }

        if(lastHighIndex === -1 || lastHighIndex > lastLowIndex){
            lows[i] = existSL;
            if (existSL) {
                prevLowIndex = lastLowIndex;
                lastLowIndex = i;
            }
        }
    }

    return {swings, highs, lows};
}

export const calculateStructure = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    let structure: Swing[] = [];

    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push({...highs[i]});
            } else if (structure[structure.length - 1].price <= highs[i].price) {
                structure[structure.length - 1] = {...highs[i]};
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push({...lows[i]});
            } else if (structure[structure.length - 1].price >= lows[i].price) {
                structure[structure.length - 1] = {...lows[i]};
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
            if(lowest){
                structure[i + 1].index = index;
                structure[i + 1].price = lowest.low;
                structure[i + 1].time = lowest.time;
            }
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
            if(lowest){
                structure[i + 1].index = index;
                structure[i + 1].price = lowest.high;
                structure[i + 1].time = lowest.time;
            }
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

export const calculateTrend = (highs: Swing[], lows: Swing[], candles: HistoryObject[], withTrendConfirm: boolean = false, ignoreSFP: boolean = false, ignoreWick: boolean = false) => {
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

        const currHighCandle = candles[currHigh.index];
        const currLowCandle = candles[currLow.index];

        const noUpperSFP = (!ignoreSFP || prevHigh.price < currHigh.price && prevHigh.price < currHighCandle.close);
        const noDownSFP = (!ignoreSFP || prevLow.price > currLow.price && prevLow.price > currLowCandle.close);

        const noUpperWick = (!ignoreWick || prevHigh.price < currHigh.price && prevHigh.price < currHighCandle.close);
        const noDownWick = (!ignoreWick || candles[prevHigh.index].low > candles[currLow.index].close);

        if (prevHigh.price < currHigh.price && currHigh.index === i && (!withTrendConfirm || prevLow.price < currLow.price) && noUpperSFP && noUpperWick) {
            trend[i] = {time: currHigh.time, trend: 1, index: currHigh.index};
            highLows[i] = {high: currHigh, low: currLow};
        }
        if (prevLow.price > currLow.price && currLow.index === i && (!withTrendConfirm || prevHigh.price > currHigh.price) && noDownSFP && noDownWick) {
            debugger
            trend[i] = {time: currLow.time, trend: -1, index: currLow.index};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if(!trend[i] && trend[i-1]) {
            trend[i] = {time: candles[i].time, trend: trend[i-1].trend, index: trend[i-1].index};
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
                text: trends[i]?.trend === -1 ? 'BOS' : 'IDM'
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
                text: trends[i]?.trend === 1 ? 'BOS' : 'IDM'
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

const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;

const isOrderblock = (candles: HistoryObject[]) => {
    if(candles.length < 3){
        return null;
    }
    let firstImbalanceIndex;
    let lastOrderblockCandle;
    const firstCandle = candles[0];

    for (let i = 1; i < candles.length - 1; i++) {
        if(!isInsideBar(candles[0], candles[i])){
            lastOrderblockCandle = candles[i-1];
            firstImbalanceIndex = i - 1;
            break;
        }
    }

    let lastImbalanceCandle;
    let lastImbalanceIndex;
    // Берем не только первый имбаланс, а ближайший из 10 свечей
    for (let i = firstImbalanceIndex; i < candles.length - 1; i++) {
        if(isImbalance(candles[firstImbalanceIndex], candles[i + 1])){
            lastImbalanceCandle = candles[i + 1];
            lastImbalanceIndex = i + 1;
            break;
        }
    }

    if(!lastImbalanceCandle){
        return null;
    }

    if(lastImbalanceCandle.low > firstCandle.high){
        return {orderblock: {time: firstCandle.time, high: Math.max(firstCandle.high, lastOrderblockCandle.high), low: Math.min(firstCandle.low, lastOrderblockCandle.low)}, lastOrderblockCandle, lastImbalanceCandle, firstImbalanceIndex, imbalanceIndex: lastImbalanceIndex, type: 'low'};
    }
    if(lastImbalanceCandle.high < firstCandle.low){
        return {orderblock: {time: firstCandle.time,high: Math.max(firstCandle.high, lastOrderblockCandle.high), low: Math.min(firstCandle.low, lastOrderblockCandle.low)}, lastOrderblockCandle, lastImbalanceCandle, firstImbalanceIndex, imbalanceIndex: lastImbalanceIndex, type: 'high'};
    }
    return null;
}

export interface OrderBlock {
    index: number;
    time: number;
    imbalanceIndex: number;
    type: 'high' | 'low';
    lastOrderblockCandle: HistoryObject;
    lastImbalanceCandle: HistoryObject;
    startCandle: HistoryObject;
    // TODO только для теста
    canTrade?: boolean;
    endCandle?: HistoryObject;
    endIndex?: number;
}

const hasHitOB = (ob: OrderBlock, candle: HistoryObject) => (ob.type === 'high' && ob.startCandle.low <= candle.high) || (ob.type === 'low' && ob.startCandle.high >= candle.low);

/**
 * OB - строится на структурных точках,
 * только по тренду.
 * На все тело свечи,
 * длится пока его не коснутся,
 * и только если следующая свеча после структурной дает имбаланс
 * Если Об ни разу не пересекли - тянуть до последней свечи
 */
export const calculateOB = (highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[], excludeIDM: boolean = false) => {
    let ob: OrderBlock [] = [];
    const MAX_CANDLES_COUNT = 10;

    for (let i = 0; i < highs.length; i++) {
        const high = highs[i];
        const index = high?.index
        if(!high || trends[index]?.trend !== -1){
            continue;
        }
        const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
        const orderBlock = isOrderblock(candlesBatch);
        if (orderBlock?.type === 'high') {
            ob.push({
                type: orderBlock.type,
                index,
                time: high.time,
                lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                imbalanceIndex: orderBlock.imbalanceIndex,
                startCandle: orderBlock.orderblock
            } as any)
        }
    }

    for (let i = 0; i < lows.length; i++) {
        const low = lows[i];
        const index = low?.index
        if(!lows[i] || trends[index]?.trend !== 1){
            continue;
        }
        const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
        const orderBlock = isOrderblock(candlesBatch);
        if (orderBlock?.type === 'low') {
            ob.push({
                type: orderBlock.type,
                index,
                time: lows[i].time,
                lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                imbalanceIndex: orderBlock.imbalanceIndex,
                startCandle: orderBlock.orderblock
            } as any)
        }
    }

    ob = ob.sort((a, b) => a.index - b.index);

    // Где начинается позиция TODO для теста, в реальности это точка входа
    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        const startPositionIndex = obItem.index + obItem.imbalanceIndex;
        for (let j = startPositionIndex; j < candles.length - 1; j++) {
            const candle = candles[j];
            if (hasHitOB(obItem, candle)) {
                // debugger
                obItem.endCandle = candle;
                obItem.endIndex = j
                obItem.canTrade = true;

                // торгую или нет. Торгую если есть endIndex и если это не последний хай в структуре
                // Короче просто исключаем торговлю на первом откате (минусит)
                if(excludeIDM){
                    obItem.canTrade = false;
                    const typeExtremumsArray = obItem.type === 'low' ? lows : highs;
                    const betweenExtremums = typeExtremumsArray.slice(startPositionIndex, obItem.endIndex + 1);
                    if(betweenExtremums.some(s => s?.side === obItem.type)){
                        obItem.canTrade = true;
                    }
                }

                break;
            }
        }
    }

    return ob;
};

export const calculatePositionsByOrderblocks = (ob: OrderBlock[], candles: HistoryObject[], maxDiff?: number, multiStop?: number) => {
    const positions = [];
    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        if(!obItem.endCandle || !obItem.canTrade){
            continue;
        }
        const side = obItem.type === 'high' ? 'short' :'long';
        const stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
        const openPrice = side === 'long' ? obItem.startCandle.high : obItem.startCandle.low;

        const takeProfit = calculateTakeProfit({
            side,
            openPrice,
            stopLoss,
            maxDiff,
            multiStop,
            candles: candles.slice(obItem.index, obItem.endIndex)
        })
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

export const isWickCandle = (candle: HistoryObject, type: 'high' | 'low', wickRatio = 2) => {
    const body = Math.abs(candle.open - candle.close);
    const bodyHigh = Math.max(candle.open, candle.close)
    const bodyLow = Math.min(candle.open, candle.close)
    const topWick = candle.high - bodyHigh;
    const bottomWick = bodyLow - candle.low;

    const bodyWickRatio = body / wickRatio;

    const hasWick = type === 'high' ?  bodyWickRatio <= topWick : bodyWickRatio <= bottomWick

    return hasWick && (type === 'high' ? topWick > bottomWick : bottomWick > topWick);
}
/**
 * Прошлый хай пробит, но пробит только хвостом и закрытие было под прошлым хаем
 * @link https://smart-money.trading/smart-money-concept/#%D0%9B%D0%BE%D0%B6%D0%BD%D1%8B%D0%B9_%D0%BF%D1%80%D0%BE%D0%B1%D0%BE%D0%B9_%E2%80%93_%D0%BF%D0%B0%D1%82%D1%82%D0%B5%D1%80%D0%BD_SFP
 * @param highs
 * @param lows
 * @param candles
 */
export const calculateFakeout = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    const fakeouts = [];

    let lastHigh;
    for (let i = 0; i < highs.length; i++) {
        if(!highs[i]){
            continue;
        }
        const currHigh = highs[i];
        if(lastHigh){
            const lastCandle = candles[lastHigh.index];
            const currCandle = candles[currHigh.index];
            if(currCandle.high > lastCandle.high && currCandle.close < lastCandle.high && isWickCandle(currCandle, 'high')){
                fakeouts.push(currHigh)
            }
        }
        lastHigh = highs[i];
    }

    let lastLow;
    for (let i = 0; i < lows.length; i++) {
        if(!lows[i]){
            continue;
        }
        const currHigh = lows[i];
        if(lastLow){
            const lastCandle = candles[lastLow.index];
            const currCandle = candles[currHigh.index];
            if(currCandle.low < lastCandle.low && currCandle.close > lastCandle.low && isWickCandle(currCandle, 'low')){
                fakeouts.push(currHigh)
            }
        }
        lastLow = lows[i];
    }

    return fakeouts
}

export const calculatePositionsByFakeouts = (fakeouts: Swing[], candles: HistoryObject[], multiStop?: number) => {
    const positions = [];
    for (let i = 0; i < fakeouts.length; i++) {
        const fakeout = fakeouts[i];
        const fakeoutIndex = fakeout.index;
        const side = fakeout.side === 'high' ? 'short' :'long';
        const openCandle = candles[fakeoutIndex + 1];
        const stopLoss = side === 'long' ? openCandle.low : openCandle.high;
        const openPrice = openCandle.open;

        const takeProfit = calculateTakeProfit({
            side,
            openPrice,
            stopLoss,
            maxDiff: 0,
            multiStop,
            candles: []
        })
        if(Math.abs(takeProfit - openPrice) / Math.abs(openPrice - stopLoss) < 1){
            continue;
        }
        for (let j = fakeout.index + 2; j < candles.length; j++) {
            if(side === 'long' && candles[j].low <= stopLoss){
                positions.push({side, takeProfit, stopLoss,
                    openPrice,openTime: openCandle.time, closeTime: candles[j].time,  pnl: stopLoss - openPrice});
                break;
            } else if(side ==='short' && candles[j].high >= stopLoss){
                positions.push({side, takeProfit, stopLoss,
                    openPrice,openTime: openCandle.time,closeTime: candles[j].time,  pnl: openPrice - stopLoss});
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit){
                positions.push({
                    side,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: openCandle.time,
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
                    openTime: openCandle.time,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}