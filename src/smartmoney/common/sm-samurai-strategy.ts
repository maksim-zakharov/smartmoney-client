import {SmBaseStrategy, Swing, Trend} from "./sm-base-strategy";
import {HistoryObject} from "../../api";

export class SmSamuraiStrategy implements SmBaseStrategy{
    readonly _name: string;

    constructor(name: string) {
        this._name = name;
    }

    calculateOrderBlocks(highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[]) {
    }

    calculateStructure(highs: Swing[], lows: Swing[], candles: HistoryObject[]) {
    }

    calculateSwings(candles: HistoryObject[]): { highs: Swing[]; lows: Swing[]; swings?: Swing[] } {
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

    calculateTrend(highs: Swing[], lows: Swing[], candles: HistoryObject[]): Trend[] {
        return [];
    }

    isOrderBlock(candles: HistoryObject[]) {
    }

    get name() {
        return this._name;
    }
}