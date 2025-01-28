import {calculateTakeProfit} from "./utils";
import {
    Cross,
    hasHitOB,
    HistoryObject,
    isIFC,
    isInsideBar,
    OrderBlock,
    OrderblockPart,
    Swing,
    Trend
} from "./th_ultimate";

export const calculateSwings = (candles: HistoryObject[]) => {
    const swings: (Swing | null)[] = [];
    const highs: (Swing | null)[] = [];
    const lows: (Swing | null)[] = [];

    for (let i = 0; i < candles.length; i++) {
        const [left, middle, right] = candles.slice(i, i + 3);
        // Чтобы на каждую свечку было значение
        if (!right) {
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

export const khrustikCalculateSwings = (candles: HistoryObject[]) => {
    const swings: (Swing | null)[] = new Array(candles.length).fill(null);
    const highs: (Swing | null)[] = new Array(candles.length).fill(null);
    const lows: (Swing | null)[] = new Array(candles.length).fill(null);

    let prevLowIndex = -1;
    let prevHighIndex = -1;
    let lastLowIndex = -1;
    let lastHighIndex = -1;

    for (let i = 0; i < candles.length; i++) {
        if (i === 0) {
            continue;
        }
        const prevCandle = candles[i - 1];
        const currentCandle = candles[i];
        // Ищем перехай или перелоу

        const high: Swing = {
            side: 'high',
            time: currentCandle.time,
            price: currentCandle.high,
            index: i
        }
        const low: Swing = {
            side: 'low',
            time: currentCandle.time,
            price: currentCandle.low,
            index: i
        }
        const existSH = currentCandle.high > prevCandle.high ? high : null;
        const existSL = currentCandle.low < prevCandle.low ? low : null;

        if (existSH?.index !== existSL?.index) {
            // Есть ли несколько вершин подряд
            if (existSH && lastHighIndex >= lastLowIndex) {
                highs[lastHighIndex] = null;
                lastHighIndex = prevHighIndex;
            }
            if (existSL && lastHighIndex <= lastLowIndex) {
                lows[lastLowIndex] = null;
                lastLowIndex = prevLowIndex;
            }
        } else {
            // if(lastLowIndex === -1 || lastHighIndex < lastLowIndex){
            //     highs[i] = existSH;
            //     if (existSH) {
            //         prevHighIndex = lastHighIndex;
            //         lastHighIndex = i;
            //     }
            //
            //     continue;
            // }
            //
            // if(lastHighIndex === -1 || lastHighIndex > lastLowIndex){
            //     lows[i] = existSL;
            //     if (existSL) {
            //         prevLowIndex = lastLowIndex;
            //         lastLowIndex = i;
            //     }
            //
            //     continue;
            // }

            highs[i] = existSH;
            if (existSH) {
                prevHighIndex = lastHighIndex;
                lastHighIndex = i;
            }
            lows[i] = existSL;
            if (existSL) {
                prevLowIndex = lastLowIndex;
                lastLowIndex = i;
            }
        }

        if (lastLowIndex === -1 || lastHighIndex < lastLowIndex) {
            highs[i] = existSH;
            if (existSH) {
                prevHighIndex = lastHighIndex;
                lastHighIndex = i;
            }
        }

        if (lastHighIndex === -1 || lastHighIndex > lastLowIndex) {
            lows[i] = existSL;
            if (existSL) {
                prevLowIndex = lastLowIndex;
                lastLowIndex = i;
            }
        }
    }

    for (let i = 0; i < highs.length; i++) {
        if (highs[i] && lows[i]) {
            swings[i] = highs[i]
        } else if (highs[i]) {
            swings[i] = highs[i]
        } else if (lows[i]) {
            swings[i] = lows[i]
        }
    }

    return {swings, highs, lows};
}

export const calculateTrend = (highs: Swing[], lows: Swing[], candles: HistoryObject[], withTrendConfirm: boolean = false, ignoreSFP: boolean = false, ignoreWick: boolean = false) => {
    const trend: Trend[] = new Array(candles.length).fill(null);

    let highLows = new Array(candles.length).fill(null);

    let prevHigh = null;
    let currHigh = null;
    let prevLow = null;
    let currLow = null;
    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            prevHigh = currHigh;
            currHigh = highs[i];
        }
        if (lows[i]) {
            prevLow = currLow;
            currLow = lows[i];
        }

        if (!prevHigh || !prevLow || !currLow || !currHigh) {
            trend[i] = null;
            continue;
        }

        const currHighCandle = candles[currHigh.index];
        const currLowCandle = candles[currLow.index];

        const noUpperSFP = (!ignoreSFP || prevHigh.price < currHigh.price && prevHigh.price < currHighCandle.close);
        const noDownSFP = (!ignoreSFP || prevLow.price > currLow.price && prevLow.price > currLowCandle.close);

        const noUpperWick = (!ignoreWick || prevHigh.price < currHigh.price && prevHigh.price < currHighCandle.close);
        const noDownWick = (!ignoreWick || candles[prevHigh.index].low > candles[currLow.index].close);

        if (prevHigh.price < currHigh.price && currHigh.index === i && (!withTrendConfirm || prevLow.price < currLow.price) && noUpperSFP && noUpperWick) {
            trend[i] = {time: currHigh.time, trend: 1, index: currHigh.index};
            highLows[i] = {high: currHigh, low: currLow};
        }
        if (prevLow.price > currLow.price && currLow.index === i && (!withTrendConfirm || prevHigh.price > currHigh.price) && noDownSFP && noDownWick) {
            trend[i] = {time: currLow.time, trend: -1, index: currLow.index};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if (!trend[i] && trend[i - 1]) {
            trend[i] = {time: candles[i].time, trend: trend[i - 1].trend, index: trend[i - 1].index};
        }
    }

    return {trend};
}

// Удаляет хай или лой если они идут 2+ подряд
const removeDuplicates = (swings: Swing[], boses: Cross[]) => {

    // Ищет ближайший IDM для текущей точки
    const closestIDM = (extremum: Swing) => {
        for (let i = extremum.index; i >= 0; i--) {
            if (!boses[i]) {
                continue;
            }
            if (extremum.side !== boses[i].type) {
                return i;
            }
        }
        return -1;
    }

    let lastExt = null;
    for (let i = 0; i < swings.length; i++) {
        const currSwing = swings[i];
        if (!currSwing) {
            continue;
        }
        // Убираем точки на которых нет HH LL
        if (!currSwing.text) {
            swings[i] = null;
            continue;
        }

        if (lastExt && currSwing.side === lastExt.side) {
            const index = closestIDM(currSwing);
            if (index > -1) {
                // Удаляем пересечение
                boses[index] = null
            }
            // Удаляем HH,LL без подтверждения
            swings[i] = null;
        } else {
            lastExt = currSwing;
        }
    }

    return {swings, boses}
}

const removeIDM = (boses: Cross[], trend: Trend[]) => {
    const IDM = boses.filter(b => b?.text).sort((a, b) => a.extremum?.index - b.extremum?.index);
    // for (let i = 0; i < IDM.length; i++) {
    //     const idmtrend = IDM[i].type === 'high' ? 1 : -1;
    //     if (trend[IDM[i].from.index] && idmtrend === trend[IDM[i].from.index].trend) {
    //         boses[IDM[i].from.index] = null;
    //     }
    // }

    for (let i = 1; i < IDM.length; i++) {
        const prev = IDM[i - 1];
        const cur = IDM[i];
        if(prev.extremum && prev.extremum?.index === cur.extremum?.index) {
            if(prev.text === 'IDM'){
                // boses[prev.from.index] = null
            } else if (cur.text === 'IDM'){
                // boses[cur.from.index] = null
            }
        }
    }

    return boses;
}

const deleteExternalStructures = (swings: Swing[], boses: Cross[]) => {
    let lastHighExternalBOS = null;
    const highs = boses.filter(b => b?.type === 'high' && ['BOS', 'CHoCH'].includes(b?.text));
    for (let i = 0; i < highs.length; i++) {
        const currBos = highs[i];

        if (!lastHighExternalBOS) {
            lastHighExternalBOS = currBos;
            continue;
        }
        if (lastHighExternalBOS.from.index < currBos.from.index && lastHighExternalBOS.to.index >= currBos.to.index) {
            boses[lastHighExternalBOS.from.index] = null;
        }
        lastHighExternalBOS = currBos;
    }

    let lastLowExternalBOS = null;
    const lows = boses.filter(b => b?.type === 'low' && ['BOS', 'CHoCH'].includes(b?.text));
    for (let i = 0; i < lows.length; i++) {
        const currBos = lows[i];

        if (!lastLowExternalBOS) {
            lastLowExternalBOS = currBos;
            continue;
        }
        if (lastLowExternalBOS.from.index < currBos.from.index && lastLowExternalBOS.to.index >= currBos.to.index) {
            boses[lastLowExternalBOS.from.index] = null;
        }
        lastLowExternalBOS = currBos;
    }

    return {swings, boses};
}

const deleteNonConfirmed = (swings: Swing[], boses: Cross[]) => {
    const bosExtremumIdx = new Set(boses.map(b => b?.extremum?.index));
    for (let i = 0; i < swings.length; i++) {
        if (swings[i] && !bosExtremumIdx.has(swings[i].index)) {
            swings[i] = null;
        }
    }

    return {swings, boses}
}

/**
 * Пытаемся найти ордерблок в массиве свечек candles.
 * @param candles Массив свечек
 * @param withMove Фича тогл, Будем ли сдвигать начало Ордерблока если имбаланс найден не между свечой 1 и 3, а между например 2 и 4 и тд.
 */
export const isOrderblock = (candles: HistoryObject[], withMove: boolean = false): OrderblockPart | null => {
    // Для создания ордерблока нужно хотя бы 3 свечки. Поиск имбаланса между свечками 1 и 3.
    if (candles.length < 3) {
        return null;
    }

    let firstImbalanceIndex;
    let firstCandle = candles[0];

    // Сначала ищем индекс свечки с которой будем искать имбаланс.
    // Для этого нужно проверить что следующая свеча после исследуемой - не является внутренней.
    for (let i = 1; i < candles.length; i++) {
        if (!isInsideBar(firstCandle, candles[i])) {
            firstImbalanceIndex = i - 1;
            break;
        }
    }

    let lastImbalanceIndex;
    if (withMove) {
        for (let i = firstImbalanceIndex; i < candles.length - 2; i++) {
            if (isImbalance(candles[i], candles[i + 2])) {
                firstCandle = candles[i];
                firstImbalanceIndex = i;

                lastImbalanceIndex = i + 2;
                break;
            }
        }
    } else {
        for (let i = firstImbalanceIndex; i < candles.length - 1; i++) {
            if (isImbalance(candles[firstImbalanceIndex], candles[i + 1])) {
                lastImbalanceIndex = i + 1;
                break;
            }
        }
    }

    // Это на случай если индексы не нашлись
    const lastImbalanceCandle = candles[lastImbalanceIndex];
    if (!lastImbalanceCandle) {
        return null;
    }

    const lastOrderblockCandle = candles[firstImbalanceIndex];

    // Жестко нужно для БД, не трогать
    const time = Math.min(firstCandle.time, lastOrderblockCandle.time);
    const open = firstCandle.time === time ? firstCandle.open : lastOrderblockCandle.open;
    const close = firstCandle.time !== time ? firstCandle.close : lastOrderblockCandle.close;
    const type = lastImbalanceCandle.low > firstCandle.high ? 'low' : lastImbalanceCandle.high < firstCandle.low ? 'high' : null;

    if (type) {
        return {
            startCandle: {
                time,
                open,
                close,
                high: Math.max(firstCandle.high, lastOrderblockCandle.high),
                low: Math.min(firstCandle.low, lastOrderblockCandle.low),
            } as HistoryObject,
            lastOrderblockCandle,
            lastImbalanceCandle,
            firstImbalanceIndex,
            imbalanceIndex: lastImbalanceIndex,
            type,
        } as OrderblockPart;
    }

    return null;
};
export const tradinghubCalculateTrendNew2 = (swings: Swing[], candles: HistoryObject[], withMove: boolean = false) => {
    const MAX_CANDLES_COUNT = 10;

    let boses: Cross[] = new Array(candles.length).fill(null);
    let trend: Trend[] = new Array(candles.length).fill(null);
    let orderBlocks: OrderBlock[] = new Array(candles.length).fill(null);

    let lastHigh = null;
    let lastLow = null;

    let highestHigh = null;
    let lowestLow = null;

    let lastHighIDM = null;
    let lastLowIDM = null;

    for (let i = 0; i < candles.length; i++) {

        if (i > 0)
            trend[i] = trend[i - 1];

        // Ловим бос для перехая
        if (highestHigh && candles[i].close > highestHigh.price) {
            const from = highestHigh;
            const to = {index: i, time: candles[i].time, price: candles[i].close}
            const extremum = lowestLow;
            const textIndex = to.index - Math.floor((to.index - from.index) / 2);
            const textCandle = candles[textIndex];

            boses[from.index] = {
                type: 'high',
                text: 'BOS',
                from,
                to,
                extremum,
                textCandle
            }
            trend[i] = {time: candles[i].time, trend: 1, index: i};
            if (i > 0 && trend[i - 1] && trend[i].trend !== trend[i - 1].trend) {
                boses[from.index].text = 'CHoCH';
                // orderBlocks = orderBlocks.map(ob => ob?.endIndex >= i ? null : ob);
            }

            lastLowIDM = lastLow;

            const batch = swings.slice(from.index, to.index).filter(s => s?.side === 'low');
            let lowest;
            for (let j = 0; j < batch.length; j++) {
                if (!lowest) {
                    lowest = batch[j];
                    swings[lowest.index].text = 'LL';
                    lowestLow = swings[lowest.index];
                } else if (lowest.price > batch[j].price) {
                    delete swings[lowest.index].text;
                    lowest = batch[j];
                    swings[lowest.index].text = 'LL';
                    lowestLow = swings[lowest.index];
                }
            }

            highestHigh = null;
            lastHigh = null;
        }
        // Ловим бос для перелоя
        if (lowestLow && candles[i].close < lowestLow.price) {
            const from = lowestLow;
            const to = {index: i, time: candles[i].time, price: candles[i].close}
            const extremum = highestHigh;
            const textIndex = to.index - Math.floor((to.index - from.index) / 2);
            const textCandle = candles[textIndex];

            boses[from.index] = {
                type: 'low',
                text: 'BOS',
                from,
                to,
                extremum,
                textCandle
            }
            trend[i] = {time: candles[i].time, trend: -1, index: i};
            if (i > 0 && trend[i - 1] && trend[i].trend !== trend[i - 1].trend) {
                boses[from.index].text = 'CHoCH';
                // orderBlocks = orderBlocks.map(ob => ob?.endIndex >= i ? null : ob);
            }

            lastHighIDM = lastHigh;

            const batch = swings.slice(from.index, to.index).filter(s => s?.side === 'high');
            let lowest;
            for (let j = 0; j < batch.length; j++) {
                if (!lowest) {
                    lowest = batch[j];
                    swings[lowest.index].text = 'HH';
                    highestHigh = swings[lowest.index];
                } else if (lowest.price < batch[j].price) {
                    delete swings[lowest.index].text;
                    lowest = batch[j];
                    swings[lowest.index].text = 'HH';
                    highestHigh = swings[lowest.index];
                }
            }

            lowestLow = null;
            lastLow = null;
        }
        if (lastHighIDM && candles[i].high >= lastHighIDM.price) {
            const from = lastHighIDM;
            const to = {index: i, time: candles[i].time, price: candles[i].close}
            const extremum = lowestLow;
            const textIndex = to.index - Math.floor((to.index - from.index) / 2);
            const textCandle = candles[textIndex];

            if (!boses[from.index]) {
                boses[from.index] = {
                    type: 'high',
                    text: 'IDM',
                    from,
                    to,
                    extremum,
                    textCandle
                }

                orderBlocks[from.index] = null;

                if (isIFC(boses[from.index].type, candles[i])) {
                    swings[i] = {
                        side: boses[from.index].type,
                        time: candles[i].time,
                        price: candles[i].high,
                        index: i,
                        isIFC: true
                    }
                }
            }

            lastHighIDM = null;
        }
        if (lastLowIDM && candles[i].low <= lastLowIDM.price) {
            const from = lastLowIDM;
            const to = {index: i, time: candles[i].time, price: candles[i].close}
            const extremum = lowestLow;
            const textIndex = to.index - Math.floor((to.index - from.index) / 2);
            const textCandle = candles[textIndex];

            if (!boses[from.index]) {
                boses[from.index] = {
                    type: 'low',
                    text: 'IDM',
                    from,
                    to,
                    extremum,
                    textCandle
                }

                orderBlocks[from.index] = null;

                if (isIFC(boses[from.index].type, candles[i])) {
                    swings[i] = {
                        side: boses[from.index].type,
                        time: candles[i].time,
                        price: candles[i].high,
                        index: i,
                        isIFC: true
                    }
                }
            }

            lastLowIDM = null;
        }

        if (swings[i]?.side === 'high' && trend[i]?.trend === -1 && (!lastHighIDM || lastHighIDM.price < swings[i].price)) {
            const high = swings[i];
            const index = high?.index
            const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
            const orderBlock = isOrderblock(candlesBatch, withMove);

            if (orderBlock?.type === 'high') {
                const obItem = {
                    type: orderBlock.type,
                    index,
                    time: orderBlock.startCandle.time,
                    lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                    lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                    firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                    imbalanceIndex: orderBlock.imbalanceIndex,
                    startCandle: orderBlock.startCandle
                } as any
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;
                for (let j = startPositionIndex; j < candles.length - 1; j++) {
                    const candle = candles[j];
                    if (hasHitOB(obItem, candle)) {
                        obItem.endCandle = candle;
                        obItem.endIndex = j
                        obItem.canTrade = true;

                        break;
                    }
                }
                orderBlocks[obItem.index] = obItem;
            }
        }

        if (swings[i]?.side === 'low' && trend[i]?.trend === 1 && (!lastLowIDM || lastLowIDM.price > swings[i].price)) {
            const low = swings[i];
            const index = low?.index
            const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
            const orderBlock = isOrderblock(candlesBatch, withMove);
            if (orderBlock?.type === 'low') {
                const obItem = {
                    type: orderBlock.type,
                    index,
                    time: orderBlock.startCandle.time,
                    lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                    lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                    firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                    imbalanceIndex: orderBlock.imbalanceIndex,
                    startCandle: orderBlock.startCandle
                } as any
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;
                for (let j = startPositionIndex; j < candles.length - 1; j++) {
                    const candle = candles[j];
                    if (hasHitOB(obItem, candle)) {
                        // debugger
                        obItem.endCandle = candle;
                        obItem.endIndex = j
                        obItem.canTrade = true;

                        break;
                    }
                }
                orderBlocks[obItem.index] = obItem;
            }
        }

        // Просто записываем посление хай и лой
        lastHigh = swings[i] && swings[i].side === 'high' ? swings[i] : lastHigh;
        lastLow = swings[i] && swings[i].side === 'low' ? swings[i] : lastLow;

        // Если нет highestHigh или lowestLow - проставляем
        if (lastHigh) {
            if (!highestHigh) {
                highestHigh = lastHigh;
                highestHigh.text = 'HH'
            }
        }
        if (lastLow) {
            if (!lowestLow) {
                lowestLow = lastLow;
                lowestLow.text = 'LL'
            }
        }
    }

    // Удаляем ОБ если он рисуется на той же свече что и прошлый ОБ
    const notEmptyOrderblocks = orderBlocks.filter(Boolean)
    for (let i = 1; i < notEmptyOrderblocks.length; i++) {
        const prevOB = notEmptyOrderblocks[i - 1];
        const curOB = notEmptyOrderblocks[i];
        if (prevOB.time === curOB.time) {
            notEmptyOrderblocks.splice(i, 1);
        }
    }

    return {trend, boses, swings, orderBlocks: notEmptyOrderblocks};
};

export const tradinghubCalculateTrend = (swings: Swing[], candles: HistoryObject[]) => {
    const trend: Trend[] = new Array(candles.length).fill(null);
    let highestHigh = null;
    let lowestLow = null;
    /**
     * Есть хаи и лои
     * 1. Находим первый хай и лой
     * 2. Если новый хай выше - создаем хаяныйхай
     * 3. Если новый лой ниже - создаем лойный лой
     * 4. Если обновили лой а последний экстремум - хайный хай - у нас новый лой. Если последний экстремум - лойный лой - обновляем лой
     * 5. Если обновили хай а последний экстремум - лойный лой - у нас новый хай. Если последний экстремум - хайный хай - обновляем хай
     */

    let lastHighestHigh = null;
    let lastLowestLow = null;

    let prevHigh = null;
    let prevLow = null;
    let lastHigh = null;
    let lastLow = null;
    for (let i = 0; i < swings.length; i++) {
        if (lastLowestLow && candles[i].close < lastLowestLow.price) {
            trend[i] = {time: candles[i].time, trend: -1, index: i};
            lastHighestHigh = highestHigh ?? lastHighestHigh;
            if (lastHighestHigh) {
                lastHighestHigh.text = 'HH';
            }
            lastLowestLow = null;
            highestHigh = null;
            lowestLow = null;
            continue;
        } else if (!lastLowestLow && lowestLow && candles[i].close < lowestLow.price) {
            trend[i] = {time: candles[i].time, trend: -1, index: i};
            lastHighestHigh = highestHigh ?? lastHighestHigh;
            highestHigh = null;
            lowestLow = null;
            continue;
        }

        if (lastHighestHigh && candles[i].close > lastHighestHigh.price) {
            trend[i] = {time: candles[i].time, trend: 1, index: i};
            lastLowestLow = lowestLow ?? lastLowestLow;
            if (lastLowestLow) {
                lastLowestLow.text = 'LL';
            }
            lastHighestHigh = null;
            lowestLow = null;
            highestHigh = null;
            continue;
        } else if (!lastHighestHigh && highestHigh && candles[i].close > highestHigh.price) {
            trend[i] = {time: candles[i].time, trend: 1, index: i};
            lastLowestLow = lowestLow ?? lastLowestLow;
            lowestLow = null;
            highestHigh = null;
            continue;
        }
        if (!swings[i]) {
            trend[i] = i > 0 ? trend[i - 1] : trend[i];
            continue;
        }
        // Если еще пусто
        highestHigh = !highestHigh && swings[i].side === 'high' ? swings[i] : highestHigh;
        lowestLow = !lowestLow && swings[i].side === 'low' ? swings[i] : lowestLow;

        // Если уже не пусто - проверяем перехай
        if (swings[i].side === 'high') {
            if (swings[i].price > highestHigh.price) {
                delete highestHigh.text;
                swings[i].text = 'HH';
                highestHigh = swings[i];
                // lowestLow = null;
            } else if (swings[i].price < highestHigh.price) {
                delete swings[i].text;
                highestHigh.text = 'HH';
            }
        }
        if (swings[i].side === 'low') {
            if (swings[i].price < lowestLow.price) {
                delete lowestLow.text;
                swings[i].text = 'LL';
                lowestLow = swings[i];
                // highestHigh = null;
            } else if (swings[i].price > lowestLow.price) {
                delete swings[i].text;
                lowestLow.text = 'LL';
            }
        }

        prevHigh = swings[i].side === 'high' && lastHigh && lastHigh.index < swings[i]?.index ? lastHigh : prevHigh;
        prevLow = swings[i].side === 'low' && lastLow && lastLow.index < swings[i]?.index ? lastLow : prevLow;

        lastHigh = swings[i].side === 'high' ? swings[i] : lastHigh;
        lastLow = swings[i].side === 'low' ? swings[i] : lastLow;

        if (swings[i].side === 'high' && prevHigh) {
            trend[i] = !lastHighestHigh && lastHigh.price > prevHigh.price ? {
                time: swings[i].time,
                trend: 1,
                index: swings[i].index
            } : trend[i - 1];
        }

        if (swings[i].side === 'low' && prevLow) {
            trend[i] = !lastLowestLow && lastLow.price < prevLow.price ? {
                time: swings[i].time,
                trend: -1,
                index: swings[i].index
            } : trend[i - 1];
        }
    }

    return trend;
}

export const calculateCrosses = (highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[]) => {
    let boses: Cross[] = [];
    let lastHigh, lastLow;

    for (let i = 0; i < candles.length; i++) {
        const lastBOS = boses[boses.length - 1];
        if (lastLow?.price > candles[i].close && (!lastBOS || lastBOS?.from?.index < lastLow?.index)) {
            const diff = i - lastLow.index;
            const textIndex = diff >= 6 ? i - Math.floor((i - lastLow.index) / 2) : lastLow.index;
            boses.push({
                from: lastLow,
                textCandle: candles[textIndex],
                to: {index: i, time: candles[i].time, price: candles[i].close},
                type: 'low',
                text: trends[i]?.trend === -1 ? 'BOS' : 'IDM'
            });
        } else if (lastHigh?.price < candles[i].close && (!lastBOS || lastBOS?.from?.index < lastHigh?.index)) {
            const diff = i - lastHigh.index;
            const textIndex = diff >= 6 ? i - Math.floor((i - lastHigh.index) / 2) : lastHigh.index;
            boses.push({
                from: lastHigh,
                textCandle: candles[textIndex],
                to: {index: i, time: candles[i].time, price: candles[i].close},
                type: 'high',
                text: trends[i]?.trend === 1 ? 'BOS' : 'IDM'
            });
        }

        if (highs[i]) {
            lastHigh = highs[i]
        }
        if (lows[i]) {
            lastLow = lows[i]
        }
    }

    return {boses};
}

export const isEqualPercents = (a: number, b: number, percent: number) => Math.abs(a - b) / Math.abs(a) * 100 < percent;

export const tradinghubCalculateCrosses = (highs: Swing[], lows: Swing[], candles: HistoryObject[], trends: Trend[]) => {
    let boses: Cross[] = [];

    const EQPercent = 0.005;

    const hasTakenOutLiquidity = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.high : bossCandle.low > currentCandle.low;

    const hasClose = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.close : bossCandle.low > currentCandle.close;

    const hasEQ = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? isEqualPercents(bossCandle.high, currentCandle.high, EQPercent) : isEqualPercents(bossCandle.low, currentCandle.low, EQPercent);

    for (let i = 0; i < candles.length; i++) {
        if (!highs[i] && !lows[i]) {
            continue;
        }

        if (highs[i]) {
            const from = highs[i];
            let to;
            let liquidityCandle = candles[i];
            let text = '';
            for (let j = i + 1; j < candles.length; j++) {
                if (trends[j]?.trend !== trends[i]?.trend) {
                    break;
                }
                const isClose = hasClose('high', liquidityCandle, candles[j]);
                if (isClose) {
                    break;
                }
                const isEQL = hasEQ('high', candles[i], candles[j]);
                if (!isEQL) {
                    continue;
                }
                to = {index: j, time: candles[j].time, price: candles[j].high};
                text = 'EQH';
            }
            for (let j = i + 1; j < candles.length; j++) {
                if (trends[j]?.trend !== trends[i]?.trend) {
                    break;
                }
                const isTakenOutLiquidity = hasTakenOutLiquidity('high', liquidityCandle, candles[j]);
                if (!isTakenOutLiquidity) {
                    continue;
                }
                const isClose = hasClose('high', liquidityCandle, candles[j]);
                if (isClose) {
                    to = {index: j, time: candles[j].time, price: candles[j].close};
                    text = 'BOS';
                    break;
                } else {
                    liquidityCandle = candles[j];
                }
            }
            if (!to) {
                continue;
            }
            const diff = to.index - i;
            const textIndex = diff >= 5 ? i - Math.round((i - to.index) / 2) : from.index;
            if (text !== 'BOS' || trends[i]?.trend === 1)
                boses.push({
                    from,
                    to,
                    textCandle: candles[textIndex],
                    type: 'high',
                    text
                })
        } else if (lows[i]) {
            const from = lows[i];
            let to;
            let liquidityCandle = candles[i];
            let text = '';
            for (let j = i + 1; j < candles.length; j++) {
                if (trends[j]?.trend !== trends[i]?.trend) {
                    break;
                }
                const isClose = hasClose('low', liquidityCandle, candles[j]);
                if (isClose) {
                    break;
                }
                const isEQL = hasEQ('low', candles[i], candles[j]);
                if (!isEQL) {
                    continue;
                }
                to = {index: j, time: candles[j].time, price: candles[j].low};
                text = 'EQL';
            }
            for (let j = i + 1; j < candles.length; j++) {
                if (trends[j]?.trend !== trends[i]?.trend) {
                    break;
                }
                const isTakenOutLiquidity = hasTakenOutLiquidity('low', liquidityCandle, candles[j]);
                if (!isTakenOutLiquidity) {
                    continue;
                }
                const isClose = hasClose('low', liquidityCandle, candles[j]);
                if (isClose) {
                    to = {index: j, time: candles[j].time, price: candles[j].close};
                    text = 'BOS';
                    break;
                } else {
                    liquidityCandle = candles[j];
                }
            }
            if (!to) {
                continue;
            }
            const diff = to.index - i;
            const textIndex = diff >= 5 ? i - Math.round((i - to.index) / 2) : from.index;
            if (text !== 'BOS' || trends[i]?.trend === -1)
                boses.push({
                    from,
                    to,
                    textCandle: candles[textIndex],
                    type: 'low',
                    text
                })
        }
    }

    // отфильтровать eql eqh
    let sorted = boses.sort((a, b) => {
        if (a.type !== b.type)
            return a.type.localeCompare(b.type);
        if (a.text !== b.text)
            return a.text.localeCompare(b.text);
        if (a.to.index !== b.to.index)
            return a.to.index - b.to.index;
        return a.from.index - b.from.index;
    })

    for (let i = 1; i < sorted.length; i++) {
        const prevBos = sorted[i - 1];
        const currBos = sorted[i];
        if (prevBos.type === currBos.type && prevBos.text === currBos.text && prevBos.to.index === currBos.to.index) {
            sorted.splice(i, 1);
            i--;
        }
    }

    sorted = sorted.sort((a, b) => a.from.index - b.from.index);

    // const sorted = boses.sort((a, b) => {
    //     if(a.type !== b.type)
    //     return a.type.localeCompare(b.type);
    //
    //     if(a.to.index !== b.to.index)
    //         return a.to.index - b.to.index;
    //
    //         return a.from.side === 'high' ? a.from.price - b.from.price : b.from.price - a.from.price; // b.from.index - a.from.index; // b.from.price - a.from.price;
    // });
    // for (let i = 1; i < sorted.length; i++) {
    //     const prevBos = sorted[i - 1];
    //     const currBos = sorted[i];
    //     if(prevBos.to.index === currBos.to.index){
    //         // TODO тут либо i - 1 либо i
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     } else if(prevBos.from.index > currBos.from.index && prevBos.to.index < currBos.to.index) {
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     }
    // }
    // // Дублирую костыль
    // for (let i = 1; i < sorted.length; i++) {
    //     const prevBos = sorted[i - 1];
    //     const currBos = sorted[i];
    //     if(prevBos.to.index === currBos.to.index){
    //         // TODO тут либо i - 1 либо i
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     } else if(prevBos.from.index > currBos.from.index && prevBos.to.index < currBos.to.index) {
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     }
    // }
    // // Дублирую костыль
    // for (let i = 1; i < sorted.length; i++) {
    //     const prevBos = sorted[i - 1];
    //     const currBos = sorted[i];
    //     if(prevBos.to.index === currBos.to.index){
    //         // TODO тут либо i - 1 либо i
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     } else if(prevBos.from.index > currBos.from.index && prevBos.to.index < currBos.to.index) {
    //         sorted[i - 1] = null
    //         sorted.splice(i - 1, 1);
    //         i--;
    //     }
    // }

    return {boses: sorted.filter(Boolean)};
}

export const calculateBreakingBlocks = (crosses: Cross[], candles: HistoryObject[]) => {
    let bb = [];
    let lastCrossIndex = 0;
    for (let i = 0; i < candles.length; i++) {
        const lastCross = crosses[lastCrossIndex];
        if (!lastCross) {
            break;
        }
        if (lastCross.to.index < i) {
            const textIndex = i - Math.floor((i - lastCross.from.index) / 2);

            if (lastCross.type === 'high' && candles[i].low <= lastCross.to.price && lastCross.to.index + 1 < i) {
                bb.push({
                    type: 'high',
                    textCandle: candles[textIndex],
                    price: lastCross.from.price,
                    fromTime: lastCross.from.time,
                    toTime: candles[i].time,
                    text: 'Breaking Block'
                });
                lastCrossIndex++;
            }
            if (lastCross.type === 'low' && candles[i].high >= lastCross.to.price && lastCross.to.index + 1 < i) {
                bb.push({
                    type: 'low',
                    textCandle: candles[textIndex],
                    price: lastCross.from.price,
                    fromTime: lastCross.from.time,
                    toTime: candles[i].time,
                    text: 'Breaking Block'
                });
                lastCrossIndex++;
            }
        }
    }

    return bb;
}

export const calculatePositionsByIFC = (candles: HistoryObject[], swings: Swing[], trends: Trend[], maxDiff?: number, multiStop?: number) => {
    const positions = [];
    for (let i = 0; i < swings.length; i++) {
        const obItem = swings[i];
        if (!obItem || !obItem.isIFC) {
            continue;
        }

        const side = obItem.side === 'high' ? 'short' : 'long';

        if(side === 'long' && trends[i]?.trend === -1){
            continue;
        }

        if(side === 'short' && trends[i]?.trend === 1){
            continue;
        }

        const candle = candles[obItem.index];
        const stopLoss = side === 'long' ? candle.low : candle.high;
        const openPrice = candle.close;

        const takeProfit = calculateTakeProfit({
            side,
            openPrice,
            stopLoss,
            maxDiff,
            multiStop,
            maxPrice: 0
        })
        if (Math.abs(takeProfit - openPrice) / Math.abs(openPrice - stopLoss) < 1) {
            continue;
        }
        const tradeCandle = candles[obItem.index + 1];
        for (let j = obItem.index + 1; j < candles.length; j++) {
            if (side === 'long' && candles[j].low <= stopLoss) {
                positions.push({
                    side, name: 'IFC', takeProfit, stopLoss,
                    openPrice, openTime: tradeCandle.time, closeTime: candles[j].time, pnl: stopLoss - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].high >= stopLoss) {
                positions.push({
                    side, name: 'IFC', takeProfit, stopLoss,
                    openPrice, openTime: tradeCandle.time, closeTime: candles[j].time, pnl: openPrice - stopLoss
                });
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit) {
                positions.push({
                    side,
                    name: 'IFC',
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: tradeCandle.time,
                    closeTime: candles[j].time,

                    pnl: takeProfit - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].low <= takeProfit) {
                positions.push({
                    side,
                    name: 'IFC',
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: tradeCandle.time,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}

export const calculatePositionsByOrderblocks = (candles: HistoryObject[], swings: Swing[], ob: OrderBlock[], maxDiff?: number, multiStop?: number, limitOrder: boolean = true, stopPaddingPercent: number = 0) => {
    const positions = [];
    let lastExtremumIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }
    for (let i = 0; i < candles.length; i++) {
        const obItem = ob[i];
        const swing = swings[i];
        if(swing?.isExtremum){
            lastExtremumIndexMap[swing?.side] = i;
        }

        if (!obItem || !obItem.endCandle || !obItem.canTrade || obItem.text === 'SMT') {
            continue;
        }

        const side = obItem.type === 'high' ? 'short' : 'long';
        let stopLoss = side === 'long' ? obItem.startCandle.low : obItem.startCandle.high;
        let openPrice = side === 'long' ? obItem.startCandle.high : obItem.startCandle.low;
        const openTime = limitOrder ? obItem.endCandle.time : candles[obItem.endIndex + 1].time;

        const lastExtremumIndex = obItem.type === 'high' ? lastExtremumIndexMap['low'] : lastExtremumIndexMap['high'];

        if(!limitOrder){
            openPrice = candles[obItem.endIndex + 1].open;
        }

        if(stopPaddingPercent){
            stopLoss *= (1 - stopPaddingPercent / 100);
        }

        let takeProfit = obItem.takeProfit;
        if(!maxDiff || !takeProfit){
            takeProfit = calculateTakeProfit({
                side,
                openPrice,
                stopLoss,
                maxDiff,
                multiStop,
                maxPrice: lastExtremumIndex ? swings[lastExtremumIndex].price : 0
            })
        }
        const profit = Math.abs(takeProfit - openPrice);
        const loss = Math.abs(stopLoss - openPrice);
        const RR = profit / loss;

        if (RR < 2) {
            continue;
        }

        if (!limitOrder && side === 'short' && candles[obItem.endIndex].close >= openPrice) {
            continue;
        }
        if (!limitOrder && side === 'long' && candles[obItem.endIndex].close <= openPrice) {
            continue;
        }

        for (let j = obItem.endIndex + 1; j < candles.length; j++) {
            if (side === 'long' && candles[j].low <= stopLoss) {
                positions.push({
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: stopLoss - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].high >= stopLoss) {
                positions.push({
                    side, name: obItem.text, takeProfit, stopLoss,
                    openPrice, openTime, closeTime: candles[j].time, pnl: openPrice - stopLoss
                });
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit) {
                positions.push({
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: takeProfit - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].low <= takeProfit) {
                positions.push({
                    side,
                    name: obItem.text,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}

export const isWickCandle = (candle: HistoryObject, type: 'high' | 'low', wickRatio = 2) => {
    const body = Math.abs(candle.open - candle.close);
    const bodyHigh = Math.max(candle.open, candle.close)
    const bodyLow = Math.min(candle.open, candle.close)
    const topWick = candle.high - bodyHigh;
    const bottomWick = bodyLow - candle.low;

    const bodyWickRatio = body / wickRatio;

    const hasWick = type === 'high' ? bodyWickRatio <= topWick : bodyWickRatio <= bottomWick

    return hasWick && (type === 'high' ? topWick > bottomWick : bottomWick > topWick);
}
/**
 * Прошлый хай пробит, но пробит только хвостом и закрытие было под прошлым хаем
 * @link https://smart-money.trading/smart-money-concept/#%D0%9B%D0%BE%D0%B6%D0%BD%D1%8B%D0%B9_%D0%BF%D1%80%D0%BE%D0%B1%D0%BE%D0%B9_%E2%80%93_%D0%BF%D0%B0%D1%82%D1%82%D0%B5%D1%80%D0%BD_SFP
 * @param swings
 * @param candles
 */
export const calculateFakeout = (swings: Swing[], candles: HistoryObject[]) => {
    const fakeouts = [];

    let lastSwingMap: Record<'high' | 'low', Swing> = {
        high: null,
        low: null
    }
    for (let i = 0; i < swings.length; i++) {
        if (swings[i]) {
            if (lastSwingMap[swings[i].side]) {
                const lastCandle = candles[lastSwingMap[swings[i].side].index];
                const currCandle = candles[swings[i].index];
                const canPushHigh = swings[i].side === 'high' && currCandle.high > lastCandle.high && currCandle.close < lastCandle.high;
                const canPushLow = swings[i].side === 'low' && currCandle.low < lastCandle.low && currCandle.close > lastCandle.low;
                if ((canPushHigh || canPushLow) && isWickCandle(currCandle, swings[i].side)) {
                    fakeouts.push(swings[i])
                }
            }
            lastSwingMap[swings[i].side] = swings[i];
        }
    }

    return fakeouts
}

export const calculatePositionsByFakeouts = (fakeouts: Swing[], candles: HistoryObject[], multiStop?: number) => {
    const positions = [];
    for (let i = 0; i < fakeouts.length; i++) {
        const fakeout = fakeouts[i];
        const fakeoutIndex = fakeout.index;
        const side = fakeout.side === 'high' ? 'short' : 'long';
        const openCandle = candles[fakeoutIndex + 1];
        const stopLoss = side === 'long' ? openCandle.low : openCandle.high;
        const openPrice = openCandle.open;

        const takeProfit = calculateTakeProfit({
            side,
            openPrice,
            stopLoss,
            maxDiff: 0,
            multiStop,
            maxPrice: 0
        })
        if (Math.abs(takeProfit - openPrice) / Math.abs(openPrice - stopLoss) < 1) {
            continue;
        }
        for (let j = fakeout.index + 2; j < candles.length; j++) {
            if (side === 'long' && candles[j].low <= stopLoss) {
                positions.push({
                    side, takeProfit, stopLoss,
                    openPrice, openTime: openCandle.time, closeTime: candles[j].time, pnl: stopLoss - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].high >= stopLoss) {
                positions.push({
                    side, takeProfit, stopLoss,
                    openPrice, openTime: openCandle.time, closeTime: candles[j].time, pnl: openPrice - stopLoss
                });
                break;
            } else if (side === 'long' && candles[j].high >= takeProfit) {
                positions.push({
                    side,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: openCandle.time,
                    closeTime: candles[j].time,
                    pnl: takeProfit - openPrice
                });
                break;
            } else if (side === 'short' && candles[j].low <= takeProfit) {
                positions.push({
                    side,
                    takeProfit,
                    stopLoss,
                    openPrice,
                    openTime: openCandle.time,
                    closeTime: candles[j].time,

                    pnl: openPrice - takeProfit
                });
                break;
            }
        }
    }

    return positions;
}
const isInsideBar = (candle: HistoryObject, bar: HistoryObject) => candle.high > bar.high && candle.low < bar.low;
const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;
