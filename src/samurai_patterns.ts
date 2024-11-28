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
    const trend: number[] = [];
    /**
     * Нужно посчитать тренд
     * И нужно исключить внутренние свинги
     */
    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push(highs[i]);
            } else {
                structure[structure.length - 1] = highs[i];
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push(lows[i]);
            } else {
                structure[structure.length - 1] = lows[i];
            }
        }
    }

    return {structure, trend}
}