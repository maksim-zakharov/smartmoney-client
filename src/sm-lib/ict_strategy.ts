import {closestExtremumSwing, hasHitOB, isBearish, isBullish, isImbalance} from "./utils.ts";
import {OrderblockPart, POI, POIType, Swing} from "./models.ts";
import {StateManager} from "./th_ultimate.ts";
import Decimal from "decimal.js";

export const drawFVG = (manager: StateManager) => {
    const lastCandle = manager.candles[manager.candles.length - 1];
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

        const POIIndex = i-1;

        const orderBlockPart = {
            // Указываем экстремум который пробила свеча IFC
            startCandle: {
                ...manager.candles[POIIndex],
                // Это нужно для стопа, если свипнули хай - стоп должен быть за хаем свипа, если лоу - за лоем свипа
                high: side === 'high' ? manager.candles[POIIndex].high : manager.candles[i].low,
                low: side === 'low' ? manager.candles[POIIndex].low : manager.candles[i].high,
            },
            lastOrderblockCandle: manager.candles[i],
            lastImbalanceCandle: manager.candles[i],
            firstImbalanceIndex: POIIndex,
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

        // const takeProfit = closestExtremumSwing(manager, swing)
        // const takeProfitPrice = takeProfit?.price;

        const RR = 4;
        const stopPrice = swing.side === 'high' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
        const openCandle = manager.candles[i + 1];
        const openPrice = openCandle?.open;
        const stop = Math.abs(openPrice - stopPrice);
        const takeProfitPrice = (swing.side === 'high' ? new Decimal(openPrice).minus(new Decimal(stop)).mul(new Decimal(RR)) :  new Decimal(openPrice).plus(new Decimal(stop)).mul(new Decimal(RR))).toNumber();

        const index = i + 1;
        // while (manager.candles[index] && !hasHitOB(orderBlockPart, manager.candles[index])) {
        //     index++;
        // }

        manager.pois[POIIndex] = new POI({
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTest: true,
            canTrade: lastCandle.time === manager.candles[index].time,
            takeProfit: takeProfitPrice,
            type: POIType.OB_EXT,
            endCandle: manager.candles[index],
            endIndex: index,
        });

        const currentTrend = manager.trend[index]?.trend;
        const trendSide = currentTrend === -1 ? 'high' : currentTrend === 1 ? 'low' : 0;
        if (trendSide !== manager.pois[POIIndex].side) {
            manager.pois[POIIndex].canTest = false;
            manager.pois[POIIndex].canTrade = false;
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