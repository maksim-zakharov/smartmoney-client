import {closestExtremumSwing, hasHitOB, isBearish, isBullish, isImbalance} from "./utils.ts";
import {OrderblockPart, POI, POIType, Swing} from "./models.ts";
import {StateManager} from "./th_ultimate.ts";

export const drawFVG = (manager: StateManager) => {
    for (let i = 2; i < manager.candles.length - 1; i++) {
        const firstCandle = manager.candles[i - 2];
        const secondCandle = manager.candles[i - 1];
        const thirdCandle = manager.candles[i];
        const fvgCandles = [firstCandle, secondCandle, thirdCandle];

        const hasImbalance = isImbalance(firstCandle, thirdCandle);
        if (!hasImbalance) {
            continue;
        }

        const everyBullish = fvgCandles.every(isBullish)
        const everyBearish = fvgCandles.every(isBearish)

        const isOneSideCandle = everyBullish || everyBearish;

        if (!isOneSideCandle) {
            continue;
        }

        const side = everyBullish ? 'low' : 'high'

        const orderBlockPart = {
            startCandle: manager.candles[i - 2],
            // Указываем экстремум который пробила свеча IFC
            startCandle: {
                ...manager.candles[i - 2],
                // Это нужно для стопа, если свипнули хай - стоп должен быть за хаем свипа, если лоу - за лоем свипа
                high: side === 'high' ? manager.candles[i - 2].high : manager.candles[i].low,
                low: side === 'low' ? manager.candles[i - 2].low : manager.candles[i].high,
            },
            lastOrderblockCandle: manager.candles[i],
            lastImbalanceCandle: manager.candles[i],
            firstImbalanceIndex: i - 2,
            lastImbalanceIndex: i,
            side,
        } as OrderblockPart;

        const swing = new Swing({
            index: i,
            side: orderBlockPart.side,
            _sidePrice: {
                high: manager.candles[i].close,
                low: manager.candles[i].close,
            },
            time: manager.candles[i].time,
        })

        const takeProfit = closestExtremumSwing(manager, swing)
        const takeProfitPrice = takeProfit?.price;

        let index = i + 1;
        while (manager.candles[index] && !hasHitOB(orderBlockPart, manager.candles[index])) {
            index++;
        }

        manager.pois[i - 2] = new POI({
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTest: true,
            canTrade: true,
            takeProfit: takeProfitPrice,
            type: POIType.OB_EXT,
            endCandle: manager.candles[index],
            endIndex: index,
        });

        const currentTrend = manager.trend[index]?.trend;
        const trendSide = currentTrend === -1 ? 'high' : currentTrend === 1 ? 'low' : 0;
        if (trendSide !== manager.pois[i - 2].side) {
            manager.pois[i - 2].canTest = false;
        }
    }
}
export const drawTrendByFVG = (manager: StateManager) => {
    for (let i = 2; i < manager.candles.length - 1; i++) {
        const firstCandle = manager.candles[i - 2];
        const secondCandle = manager.candles[i - 1];
        const thirdCandle = manager.candles[i];
        const fvgCandles = [firstCandle, secondCandle, thirdCandle];

        const hasImbalance = isImbalance(firstCandle, thirdCandle);
        if (!hasImbalance) {
            manager.trend[i + 1] = {
                time: manager.candles[i + 1].time,
                trend: manager.trend[i]?.trend
            };
            continue;
        }

        const everyBullish = fvgCandles.every(isBullish)
        const everyBearish = fvgCandles.every(isBearish)

        const isOneSideCandle = everyBullish || everyBearish;

        manager.trend[i + 1] = {
            time: manager.candles[i + 1].time,
            trend: isOneSideCandle ? (everyBullish ? 1 : -1) : manager.trend[i]?.trend
        };
    }
}