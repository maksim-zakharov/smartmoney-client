import day from './stubs/MTLR_M5_1738875600_1738961999.json';
import oneIterationSwing from "./stubs/oneIterationSwing.json";
import {testData1, testData2} from "./test_data.ts";
import {Cross, HistoryObject, POI, Swing} from "./THUltimate/th_ultimate.ts";

import {notTradingTime} from "./THUltimate/th_ultimate.ts";

const convertOldHighsLowsToSwing = (candles: HistoryObject[], {highs, lows, swings}: {
    highs: any[],
    lows: any[],
    swings: any[]
}): Swing[] => {
    const result: Swing[] = new Array(candles.length).fill(null);

    if (swings) {
        for (const _high of swings) {
            if (!_high) {
                continue;
            }
            const {price, ...high} = _high;
            result[high.index] = new Swing({...high, _sidePrice: {high: high.price, low: high.price}});
            if (high._isExtremum) {
                result[high.index].markExtremum();
            }
        }
    }

    if (highs) {
        for (const {text, ..._high} of highs) {
            if (!_high) {
                continue;
            }
            const {price, ...high} = _high;
            result[high.index] = new Swing({...high, _sidePrice: {high: high.price, low: high.price}});
            if (text) {
                result[high.index].markExtremum();
            }
        }
    }

    if (lows) {
        for (const {text, ..._high} of lows) {
            if (!_high) {
                continue;
            }
            const {price, ...high} = _high;
            result[high.index] = new Swing({...high, _sidePrice: {high: high.price, low: high.price}});
            if (text) {
                result[high.index].markExtremum();
            }
        }
    }

    return result;
}

export const testMocks = new Map<string, {
    data: HistoryObject[],
    swings: Swing[],
    boses?: Cross[],
    description?: string,
    orderblocks?: POI[],
    skip?: boolean,
    allureEpic?: string,
    allureFeature?: string
}>([
    [
        'only oneIteration Swings day',
        {
            data: day.filter(d => !notTradingTime(d)),
            swings: convertOldHighsLowsToSwing(day.filter(d => !notTradingTime(d)), {swings: oneIterationSwing} as any),
            skip: true,
            allureFeature: 'Swings'
        }
    ],
    [
        'Удаляем лишний CHoCH при подтверждении длинного CHoCH',
        {
            description: 'Если образуются 2 CHoCH/BOS и оба подтверждаются на одной свечке - остается только самый первый',
            data: testData1.candles.filter(d => !notTradingTime(d)),
            swings: convertOldHighsLowsToSwing(testData1.candles, testData1.mock as any),
            boses: testData1.mock.boses as any as Cross[],
            orderblocks: testData1.mock.orderBlocks as any as POI[],
            skip: true,
            allureFeature: 'Boses'
        }
    ],
    [
        'Рисуем LCHoCH, Fake LBOS',
        {
            description: 'Нарисовали LCHoCH, мог быть LBOS но тот не подтвердился, поэтому остается IDM',
            data: testData2.candles.filter(d => !notTradingTime(d)),
            swings: convertOldHighsLowsToSwing(testData2.candles, testData2.mock as any),
            boses: testData2.mock.boses as any as Cross[],
            orderblocks: testData2.mock.orderBlocks as any as POI[],
            skip: true,
            allureFeature: 'Boses'
        }
    ],
    [
        'swings: нет локального максимума, проставляем максимум на первой свече', {
        data: [{high: 10, low: 1, open: 2, close: 9, time: 1}],
        swings: [new Swing({side: 'high', index: 0, time: 1})],
        allureFeature: 'Swings'
    }
    ],
    [
        'swings: есть локальный максимум, свеча обновляет максимум, не пробивает минимум', {
        data: [{high: 10, low: 1, open: 2, close: 9, time: 1}, {
            high: 20,
            low: 8,
            open: 9,
            close: 19,
            time: 2
        }] as any[],
        swings: [null, new Swing({side: 'high', index: 1, time: 2})],
        allureFeature: 'Swings'
    }
    ],
    [
        'swings: есть локальный максимум, свеча обновляет максимум, пробивает минимум', {
        data: [{high: 10, low: 1, open: 2, close: 9, time: 1}, {
            high: 20,
            low: 0,
            open: 9,
            close: 19,
            time: 2
        }] as any[],
        swings: [null, new Swing({side: 'double', index: 1, time: 2})],
        allureFeature: 'Swings'
    }
    ],
    [
        'swings: свеча не обновляет максимум, не пробивает минимум - внутренняя свеча', {
        data: [{high: 10, low: 1, open: 2, close: 6, time: 1}, {high: 10, low: 5, open: 6, close: 7, time: 2}] as any[],
        swings: [new Swing({side: 'high', index: 0, time: 1}), null],
        allureFeature: 'Swings'
    }
    ],
    [
        'swings: свеча не обновляет максимум, пробивает минимум - правильный откат', {
        data: [{high: 10, low: 3, open: 4, close: 8, time: 1}, {high: 8, low: 2, open: 8, close: 3, time: 2}] as any[],
        swings: [new Swing({side: 'high', index: 0, time: 1}), new Swing({
            side: 'low', index: 1, time: 2, _isExtremum: true, idmSwing: new Swing({
                side: 'high',
                time: 1,
                _sidePrice: {high: 10, low: 3},
                index: 0,
                isIFC: undefined,
                _isExtremum: false,
                _isDebug: false
            })
        })],
        allureFeature: 'Swings'
    }
    ],
]);