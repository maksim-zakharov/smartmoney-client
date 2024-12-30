import {HistoryObject} from "./api";
import {
    calculateCrosses,
    calculateOB,
    calculateStructure,
    calculateTrend,
    Cross,
    khrustikCalculateSwings,
    Swing, tradinghubCalculateTrendNew
} from "./samurai_patterns";

describe('sm_khrustik', () => {
    it('khrustikCalculateSwings', () => {
        const candles: HistoryObject[] = [
            {
                time: 1733900100,
                close: 81.05,
                open: 81.05,
                high: 81.05,
                low: 81.05,
                volume: 17831
            },
            {
                time: 1733900400,
                close: 81.23,
                open: 81.06,
                high: 81.43,
                low: 80.6,
                volume: 802656
            },
            {
                time: 1733900700,
                close: 81.34,
                open: 81.18,
                high: 81.23,
                low: 81.18,
                volume: 752133
            },
            {
                time: 1733901000,
                close: 81.57,
                open: 81.34,
                high: 81.7,
                low: 81.25,
                volume: 604443
            },
            {
                time: 1733901300,
                close: 81.87,
                open: 81.57,
                high: 81.13,
                low: 81.5,
                volume: 965895
            },
            {
                time: 1733901600,
                close: 81.88,
                open: 81.85,
                high: 81.53,
                low: 81.62,
                volume: 967596
            },
            {
                time: 1733901900,
                close: 81.5,
                open: 81.9,
                high: 81.33,
                low: 81.42,
                volume: 707524
            },
            {
                time: 1733902200,
                close: 81.68,
                open: 81.51,
                high: 81.8,
                low: 81.4,
                volume: 640396
            },
            {
                time: 1733902500,
                close: 81.84,
                open: 81.66,
                high: 81.3,
                low: 81.58,
                volume: 624952
            },
            {
                time: 1733902800,
                close: 81.79,
                open: 81.9,
                high: 81.6,
                low: 81.71,
                volume: 342778
            },
            {
                time: 1733903100,
                close: 81.48,
                open: 81.79,
                high: 81.02,
                low: 81.45,
                volume: 346951
            },
            {
                time: 1733903400,
                close: 81.48,
                open: 81.79,
                high: 81.68,
                low: 81.45,
                volume: 346951
            },
            {
                time: 1733903700,
                close: 81.48,
                open: 81.79,
                high: 81.01,
                low: 81.45,
                volume: 346951
            }
        ]

        const structures: (Cross | any)[] = [
            {from: {index: 3}, extremum: {index: 4}, to: {index: 5}, text: 'IDM', type: 'high'}
        ]

        const result = [];

        structures.forEach((s, index) => {
            expect(s.from.index).toEqual(result[index].from.index)
            expect(s.extremum.index).toEqual(result[index].from.index)
            expect(s.to.index).toEqual(result[index].from.index)
            expect(s.text).toEqual(result[index].text)
            expect(s.type).toEqual(result[index].type)
        })
    })
})