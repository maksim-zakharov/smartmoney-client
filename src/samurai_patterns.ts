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
        if (left.high < middle.high && middle.high > right.high) {
            const high: Swing = {
                side: 'high',
                time: middle.time,
                price: middle.high
            }
            highs.push(high);
            swings.push(high)
            lows.push(null);
        }
        // TODO Должен ли тут быть else? или на одной свече может быть и хай и лоу
        if (left.low > middle.low && middle.low < right.low) {
            const low: Swing = {
                side: 'low',
                time: middle.time,
                price: middle.low
            }
            highs.push(null);
            swings.push(low)
            lows.push(low);
        } else {
            highs.push(null);
            swings.push(null)
            lows.push(null);
        }
    }

    return {swings, highs, lows};
}

export const calculateStructure = (swings: Swing[], candles: HistoryObject[]) => {
    const structure = [];
    const trend: number[] = [];
    /**
     * Нужно посчитать тренд
     * И нужно исключить внутренние свинги
     */
    for (let i = 0; i < swings.length; i++) {
    }

    return {structure, trend}
}