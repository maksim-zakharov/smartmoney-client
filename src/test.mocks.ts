import day from './stubs/MTLR_M5_1738875600_1738961999.json';
import {Cross, HistoryObject, notTradingTime, POI, Swing} from "./th_ultimate.ts";
import oneIterationSwing from "./stubs/oneIterationSwing.json";
import {testData1, testData2} from "./test_data.ts";

const convertOldHighsLowsToSwing = (candles: HistoryObject[], {highs, lows, swings}: {highs: any[], lows: any[], swings: any[]}): Swing[] => {
    const result: Swing[] = new Array(candles.length).fill(null);

    if(swings){
        for (const high of swings) {
            if(!high){
                continue;
            }
            result[high.index] = new Swing(high);
            if(high._isExtremum){
                result[high.index].markExtremum();
            }
        }
    }

    if(highs){
        for (const {text, ...high} of highs) {
            result[high.index] = new Swing(high);
            if(text){
                result[high.index].markExtremum();
            }
        }
    }

    if(lows){
        for (const {text, ...high} of lows) {
            result[high.index] = new Swing(high);
            if(text){
                result[high.index].markExtremum();
            }
        }
    }

    return result;
}

export const testMocks = new Map<string, {data: HistoryObject[], swings: Swing[], boses?: Cross[], description?: string, orderblocks?: POI[]}>([
    [
        'only oneIteration Swings day',
        {
            data: day.filter(d => !notTradingTime(d)),
            swings: convertOldHighsLowsToSwing(day.filter(d => !notTradingTime(d)), {swings: oneIterationSwing} as any),
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
        }
    ]
]);