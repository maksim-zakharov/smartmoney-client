import {getTime, isBearish, isBullish, isCrossed, isImbalance} from "./utils.ts";
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

        const POIIndex = i - 1;

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

        const RR = 3;
        const stopPrice = swing.side === 'high' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
        const openCandle = manager.candles[i + 1];
        const openPrice = openCandle?.open;
        const stop = Math.abs(openPrice - stopPrice);
        const takeProfitPrice = (swing.side === 'high' ? new Decimal(openPrice).minus(new Decimal(stop).mul(new Decimal(RR))) : new Decimal(openPrice).plus(new Decimal(stop).mul(new Decimal(RR)))).toNumber();

        const index = i;
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
            type: POIType.FVG,
            endCandle: manager.candles[index],
            endIndex: index,
        });

        // const currentTrend = manager.trend[index]?.trend;
        // const trendSide = currentTrend === -1 ? 'high' : currentTrend === 1 ? 'low' : 0;
        // if (trendSide !== manager.pois[POIIndex].side) {
        //     manager.pois[POIIndex].canTest = false;
        //     manager.pois[POIIndex].canTrade = false;
        // }
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

interface StartSessionStrategyProps {
    //  Тейк - от х2 до хз
    RR: number;
    // Количество свечей которое берем (5 по умолчанию)
    candlesCount: number;
    // Время начала сессии: 7 утра (утренняя), 10 утра (дневная), 19:05 (вечерняя)
    sessionType: 'morning' | 'day' | 'evening'

    manager: StateManager
}

export const tradeStartSessionStrategy = ({
                                              RR = 2,
                                              candlesCount = 5,
                                              sessionType = "morning",
                                              manager
                                          }: StartSessionStrategyProps) => {
    /**
     * Торгуем только на 1-минутном графике (например)
     * Берем первые 5 минут (5 свечей), выбираем там хай и лой за период
     *
     * Далее ждем свечу которая не просто пробьет хай или лой, а закроется над или под уровнями.
     * Далее ждем следующую свечу, чтоб та отработала и тоже закрылась и между последними 3 будем искать FVG.
     * Перебираем свечи пока не найдем FVG.
     * После того как FVG найден - сразу на следующей свече открываем сделку маркетом, стоп за лой 2 свечи (для покупки), хай - для продажи.
     * Если пока искали FVG было хоть какое то закрытие свечи внутри диапазона - отменяем пробитие, ищем новое.
     * Тейк х2 (регулируется)
     *
     * Настройки:
     * - Тейк - от х2 до хз
     * - Количество свечей которое берем (5 по умолчанию)
     * - Время начала сессии: 7 утра (утренняя), 10 утра (дневная), 19:05 (вечерняя)
     */

    const sessionStartTimeMap: Record<typeof sessionType, string> = {
        morning: '07:00',
        day: '10:00',
        evening: '19:00',
    }

    // Выбрали какое время будем искать у свечи
    const firstSessionStartTime = sessionStartTimeMap[sessionType];

    const lastCandle = manager.candles[manager.candles.length - 1];
    for (let i = 0; i < manager.candles.length; i++) {
        const candle = manager.candles[i];
        // Сначала ищем первую свечу сессии
        const time = getTime(new Date(candle.time * 1000));
        if (time !== firstSessionStartTime) {
            continue;
        }

        // Далее если наткнулись на первую свечу сессии - ищем хай и лой за первые {candlesCount} свечей
        const candlesBatch = manager.candles.slice(i, i + candlesCount);
        const sessionHigh = Math.max(...candlesBatch.map(c => c.high));
        const sessionLow = Math.min(...candlesBatch.map(c => c.low));

        // Со следующей свечи после интервала ищем пробитие в какую то сторону
        let crossedCandleIndex = i + candlesCount;

        // Итерируемся пока есть свечи и пока не пробили ни один хай
        while (manager.candles[crossedCandleIndex] && isCrossed(sessionHigh, manager.candles[crossedCandleIndex]) !== 1 && isCrossed(sessionLow, manager.candles[crossedCandleIndex]) !== -1) {
            crossedCandleIndex++;
        }

        // Перебрали все свечи, дошли до конца
        if (!manager.candles[crossedCandleIndex]) {
            break;
        }

        // Проверяем какую таки вершину пробили
        const isHighCrossed = isCrossed(sessionHigh, manager.candles[crossedCandleIndex]) === 1;
        const isLowCrossed = isCrossed(sessionLow, manager.candles[crossedCandleIndex]) === -1;

        // Далее ищем FVG но уже со следующей свечи
        let FVGStartCandleIndex = crossedCandleIndex - 1;
        let FVGEndCandleIndex = crossedCandleIndex + 1;

        // TODO Тут также нужно проверять возврат в диапазон, если вернулись - искать пробитие заново
        while (manager.candles[FVGEndCandleIndex] && !isImbalance(manager.candles[FVGStartCandleIndex], manager.candles[FVGEndCandleIndex])) {
            FVGStartCandleIndex++;
            FVGEndCandleIndex++;
        }

        // Если последней свечи FVG уже нет - дошли до конца свечек
        if(!manager.candles[FVGEndCandleIndex]){
            break;
        }

        // Если же FVG на пробитии найден - со следующей свечи открываем маркет ордер

        // low - покупка, high - продажа
        const side = isHighCrossed ? 'low' : 'high'

        const orderBlockPart = {
            startCandle: {
                // Берем старт от средней свечи
                ...manager.candles[FVGStartCandleIndex + 1],
                // Внимание, по этим полям ставится стоп
                high: side === 'low' ? manager.candles[FVGEndCandleIndex].low : manager.candles[FVGStartCandleIndex + 1].high,
                // Если low (покупка)
                low: side === 'low' ? manager.candles[FVGStartCandleIndex + 1].low : manager.candles[FVGEndCandleIndex].high,
            },
            lastOrderblockCandle: manager.candles[FVGEndCandleIndex],
            lastImbalanceCandle: manager.candles[FVGEndCandleIndex],
            firstImbalanceIndex: FVGStartCandleIndex,
            lastImbalanceIndex: FVGEndCandleIndex,
            side,
        } as OrderblockPart;

        const swing = new Swing({
            index: FVGStartCandleIndex,
            side: orderBlockPart.side,
            _sidePrice: {
                high: manager.candles[FVGStartCandleIndex].close,
                low: manager.candles[FVGStartCandleIndex].close,
            },
            time: manager.candles[FVGStartCandleIndex].time,
        })

        const openPrice = manager.candles[FVGEndCandleIndex].close;
        const stopPrice = side === 'low' ? manager.candles[FVGStartCandleIndex + 1].low :  manager.candles[FVGStartCandleIndex + 1].high;
        const stopPoints = new Decimal(openPrice).minus(new Decimal(stopPrice)).abs().toNumber();
        const takeProfit = side === 'low' ? new Decimal(openPrice).plus(new Decimal(stopPoints).mul(RR)) :  new Decimal(openPrice).minus(new Decimal(stopPoints).mul(RR));

        manager.pois[FVGStartCandleIndex] = new POI({
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTest: true,
            // Проверяем для реальной торговли что последняя свеча - следующая после FVG
            canTrade: lastCandle.time === manager.candles[FVGEndCandleIndex + 1].time,
            takeProfit: takeProfit.toNumber(),
            type: POIType.CROSS_SESSION,
            endCandle: manager.candles[FVGEndCandleIndex],
            endIndex: FVGEndCandleIndex,
        });

        debugger

        i = FVGEndCandleIndex;
    }
}