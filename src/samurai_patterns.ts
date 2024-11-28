import {HistoryObject} from "./api.ts";

export interface Swing {
    side: 'high' | 'low',
    time: number;
    price: number;
}

export const calculateSwings = (candles: HistoryObject[], windowLength = 3) => {
    let swings: (Swing | null)[] = [];

    for (let i = 0; i < candles.length - windowLength; i++) {
        const [left, middle, right] = candles.slice(i, i + windowLength);
        if (left.high < middle.high && middle.high > right.high) {
            swings.push({
                side: 'high',
                time: middle.time,
                price: middle.high
            })
        }
        // TODO Должен ли тут быть else? или на одной свече может быть и хай и лоу
        else if (left.low > middle.low && middle.low < right.low) {
            swings.push({
                side: 'low',
                time: middle.time,
                price: middle.low
            })
        } else {
            swings.push(null);
        }
    }

    return swings;
}