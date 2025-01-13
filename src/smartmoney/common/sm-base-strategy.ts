import {HistoryObject} from "../../th_ultimate";

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

export const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;

export interface SmBaseStrategy {
    readonly _name: string;
    /**
     * свинги
     * тренд
     * CHoCH
     * IDM
     * BOS
     * ОБ
     * Имбаланс
     * Breaking block
     * Mitigation Block
     */

    get name();

    calculateSwings(candles: HistoryObject[]): {highs : Swing[], lows: Swing[], swings?: Swing[]}

    calculateTrend(highs: Swing[], lows: Swing[], candles: HistoryObject[]): Trend[]

    calculateStructure(highs: Swing[], lows: Swing[], candles: HistoryObject[]);

    isOrderBlock(candles: HistoryObject[])

    calculateOrderBlocks(highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[])

    calculateBreakingBlocks?(highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[])

    calculateMitigationBlocks?(highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[])
}