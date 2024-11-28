import {HistoryObject} from "./api.ts";

export interface Swing {
    side: 'high' | 'low',
    time: number;
    price: number;
}

export const calculateSwings = (candles: HistoryObject[], windowLength = 3) => {
    const swings: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу
    const highs: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу
    const lows: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу

    for (let i = 0; i < candles.length - windowLength; i++) {
        const [left, middle, right] = candles.slice(i, i + windowLength);
        const high: Swing = {
            side: 'high',
            time: middle.time,
            price: middle.high
        }
        const existHigh = left.high < middle.high && middle.high > right.high ? high : null
        highs.push(existHigh);

        const low: Swing = {
            side: 'low',
            time: middle.time,
            price: middle.low
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
    const structure: Swing[] = [];

    const highSctuct: Swing[] = [];
    const lowSctuct: Swing[] = [];
    /**
     * Нужно посчитать тренд
     * И нужно исключить внутренние свинги
     */
    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push(highs[i]);
                highSctuct.push(highs[i]);
                lowSctuct.push(null);
            } else if (structure[structure.length - 1].price <= highs[i].price) {
                structure[structure.length - 1] = highs[i];
                highSctuct[highSctuct.length - 1] = highs[i];
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push(lows[i]);
                lowSctuct.push(lows[i]);
                highSctuct.push(null);
            } else if (structure[structure.length - 1].price >= lows[i].price) {
                structure[structure.length - 1] = lows[i];
                lowSctuct[lowSctuct.length - 1] = lows[i];
            }
        }

        // const existHighIndex = highSctuct.findLastIndex(Boolean);
        // const existLowIndex = lowSctuct.findLastIndex(Boolean);
        // if (existHighIndex > -1 && existLowIndex > -1 && lowSctuct[existLowIndex]?.time === highSctuct[existHighIndex]?.time) {
        //     if (existLowIndex > 1 && lowSctuct[existLowIndex - 2]) {
        //         lowSctuct[existLowIndex - 2] = null;
        //     }
        //     if (existHighIndex > 1 && highSctuct[existHighIndex - 2]) {
        //         highSctuct[existHighIndex - 2] = null;
        //     }
        // }
    }

    return {structure, highSctuct, lowSctuct};
}

export const calculateTrend = (highs: Swing[], lows: Swing[]) => {
    const trend: any[] = [];

    const filledHighs = highs.filter(Boolean);
    const filledLows = lows.filter(Boolean);

    const minLength = Math.min(filledHighs.length, filledLows.length);

    for (let i = 1; i < minLength; i++) {
        const prevHigh = filledHighs[i - 1];
        const currHigh = filledHighs[i];
        const prevLow = filledLows[i - 1];
        const currLow = filledLows[i];

        if (prevHigh.price > currHigh.price && prevLow.price >= currLow.price) {
            trend.push({time: currLow.time, trend: -1});
        } else if (prevHigh.price <= currHigh.price && prevLow.price < currLow.price) {
            trend.push({time: currHigh.time, trend: 1});
        } else {
            if (!trend[trend.length - 1])
                trend.push(null);
            else {
                trend.push({time: Math.max(currLow.time, currHigh.time), trend: trend[trend.length - 1].trend});
            }
        }
    }

    return trend;
}