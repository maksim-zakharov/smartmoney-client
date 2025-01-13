export interface Swing {
    side?: 'high' | 'low',
    time: number;
    price: number;
    index: number;
    text?: string;
    isIFC?: boolean;
}

export interface HistoryObject {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number
    volume: number;
}

export const tradinghubCalculateSwings = (candles: HistoryObject[]) => {
    const swings: (Swing | null)[] = new Array(candles.length).fill(null);
    const highs: (Swing | null)[] = new Array(candles.length).fill(null);
    const lows: (Swing | null)[] = new Array(candles.length).fill(null);

    const hasHighValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
        if (leftCandle.high <= currentCandle.high && (!nextCandle || nextCandle.high < currentCandle.high)
            // && nextCandle.low <= currentCandle.low TODO В методичке этого нет
        ) {
            return 'high'
        }
        return '';
    };
    const hasLowValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
        if (leftCandle.low >= currentCandle.low && (!nextCandle || nextCandle.low > currentCandle.low)
            // && nextCandle.high >= currentCandle.high TODO В методичке этого нет
        ) {
            return 'low'
        }
        return '';
    };

    // Тупо первая точка
    if (candles.length) {
        highs[0] = {
            side: 'high',
            time: candles[0].time,
            price: candles[0].high,
            index: 0
        };
        swings[0] = {
            side: 'high',
            time: candles[0].time,
            price: candles[0].high,
            index: 0
        };
    }

    // let prevCandleIndex = 0
    // for (let i = 1; i < candles.length - 1; i++) {
    //     const prevCandle = candles[prevCandleIndex];
    //     const currentCandle = candles[i];
    //     if (isInsideBar(prevCandle, currentCandle)) {
    //         continue;
    //     }
    //     let nextIndex = i + 1;
    //     let nextCandle = candles[nextIndex];
    //     // TODO в методичке этого нет
    //     // for (; nextIndex < candles.length - 1; nextIndex++) {
    //     //     nextCandle = candles[nextIndex]
    //     //     if (!isInsideBar(currentCandle, nextCandle)) {
    //     //         break;
    //     //     }
    //     // }
    //     let diff = nextIndex - i - 1;
    //     const highPullback = hasHighValidPullback(prevCandle, currentCandle, nextCandle)
    //     const lowPullback = hasLowValidPullback(prevCandle, currentCandle, nextCandle)
    //     const isValidPullback = hasValidPullback(prevCandle, currentCandle, nextCandle)
    //
    //     const swing: Swing = {
    //         side: (isValidPullback || '') as any,
    //         time: currentCandle.time,
    //         price: isValidPullback === 'high' ? currentCandle.high : currentCandle.low,
    //         index: i
    //     }
    //     highs[i] = highPullback ? {...swing, side: 'high'} : null;
    //     lows[i] = lowPullback ? {...swing, side: 'low'} : null;
    //     swings[i] = isValidPullback ? swing : null;
    //     prevCandleIndex = i;
    //     i += diff;
    // }

    let prevCandleIndex = 0
    for (let i = 1; i < candles.length - 1; i++) {
        const prevCandle = candles[prevCandleIndex];
        const currentCandle = candles[i];
        if (isInsideBar(prevCandle, currentCandle)) {
            continue;
        }
        let nextIndex = i + 1;
        let nextCandle = candles[nextIndex];
        // TODO в методичке этого нет
        for (; nextIndex < candles.length - 1; nextIndex++) {
            nextCandle = candles[nextIndex]
            if (!isInsideBar(currentCandle, nextCandle)) {

                break;
            }
        }
        let diff = nextIndex - i - 1;
        nextCandle = candles[nextIndex]
        const highPullback = hasHighValidPullback(prevCandle, currentCandle, nextCandle)
        const lowPullback = hasLowValidPullback(prevCandle, currentCandle, nextCandle)


        if(!diff || hasLowValidPullback(currentCandle, nextCandle)){
            const swing: Swing = {
                side: (highPullback || '') as any,
                time: currentCandle.time,
                price: highPullback === 'high' ? currentCandle.high : currentCandle.low,
                index: i
            }
            highs[i] = highPullback ? {...swing, side: 'high'} : highs[i];
            swings[i] = highPullback ? swing : swings[i];
        }

        if(!diff || hasHighValidPullback(currentCandle, nextCandle)){
            const swing: Swing = {
                side: (lowPullback || '') as any,
                time: currentCandle.time,
                price: lowPullback === 'high' ? currentCandle.high : currentCandle.low,
                index: i
            }
            lows[i] = lowPullback ? {...swing, side: 'low'} : lows[i];
            swings[i] = lowPullback ? swing : swings[i];
        }
        prevCandleIndex = i;
        i += diff;
    }

    let lastSwingIndex = -1;
    // фильтруем вершины подряд
    for (let i = 0; i < swings.length; i++) {
        if (!swings[i]) {
            continue;
        }
        const swing = swings[i];
        if (lastSwingIndex === -1 || swing.side !== swings[lastSwingIndex]?.side) {
            lastSwingIndex = i;
            continue;
        }
        if (swing.side === 'high') {
            // Обновляем хай
            if (swing.price > swings[lastSwingIndex]?.price) {
                swings[lastSwingIndex] = null;
                highs[lastSwingIndex] = null;
                lastSwingIndex = i;
            } else if(!lows[i]) {
                // Убираем хай подряд
                swings[i] = null;
                highs[i] = null;
            }
        }
        if (swing.side === 'low') {
            // Обновляем лой
            if (swing.price < swings[lastSwingIndex]?.price) {
                swings[lastSwingIndex] = null;
                lows[lastSwingIndex] = null;
                lastSwingIndex = i;
            } else if(!highs[i]) {
                // Обновляем лой подряд
                swings[i] = null;
                lows[i] = null;
            }
        }
    }

    return {swings, highs, lows};
}
export const calculateStructure = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    let structure: Swing[] = [];

    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push({...highs[i]});
            } else if (structure[structure.length - 1].price <= highs[i].price) {
                structure[structure.length - 1] = {...highs[i]};
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push({...lows[i]});
            } else if (structure[structure.length - 1].price >= lows[i].price) {
                structure[structure.length - 1] = {...lows[i]};
            }
        }
    }

    const isBetween = (p1: Swing, p2: Swing, p3: Swing) => {
        if (p1.side === 'high' && p2.side === 'low') {
            return p3.price > p2.price && p3.price < p1.price;
        }
        if (p1.side === 'low' && p2.side === 'high') {
            return p3.price < p2.price && p3.price > p1.price;
        }
        return false;
    }

    // Фильтровать структуру
    for (let i = 0; i < structure.length - 3; i++) {
        const [s1, s2, s3, s4] = structure.slice(i, i + 4);
        if (isBetween(s1, s2, s3) && isBetween(s1, s2, s4)) {
            structure.splice(i + 2, 2);
            i--;
        }
    }

    for (let i = 0; i < structure.length - 1; i++) {
        const currStruct = structure[i];
        const nextStruct = structure[i + 1];


        if (nextStruct.side === 'low') {
            const batch = lows.slice(currStruct.index + 1, nextStruct.index + 2);
            const index = batch.reduce((acc, curr) => {
                if (curr && candles[acc].low > curr.price) {
                    return curr.index + 1;
                }
                return acc;
            }, currStruct.index + 1);

            const lowest = candles[index];
            if (lowest) {
                structure[i + 1].index = index;
                structure[i + 1].price = lowest.low;
                structure[i + 1].time = lowest.time;
            }
        }
        if (nextStruct.side === 'high') {
            const batch = highs.slice(currStruct.index + 1, nextStruct.index + 2);
            const index = batch.reduce((acc, curr) => {
                if (curr && candles[acc].high < curr.price) {
                    return curr.index + 1;
                }
                return acc;
            }, currStruct.index + 1);

            const lowest = candles[index];
            if (lowest) {
                structure[i + 1].index = index;
                structure[i + 1].price = lowest.high;
                structure[i + 1].time = lowest.time;
            }
        }
    }

    let highParts = new Array(candles.length).fill(null);
    let lowParts = new Array(candles.length).fill(null);

    let lastStructIndex = 0;
    for (let i = 0; i < candles.length; i++) {
        while (structure[lastStructIndex]?.index === i) {
            if (structure[lastStructIndex].side === 'high') {
                highParts[i] = structure[lastStructIndex]
                lowParts[i] = null;
            } else {
                lowParts[i] = structure[lastStructIndex]
                highParts[i] = null;
            }
            lastStructIndex++;
        }
    }

    return {structure, highParts, lowParts};
}

export interface Trend {
    time: number;
    trend: number;
    index: number;
}

const deleteInternalStructures = (swings: Swing[], boses: Cross[]) => {
    let lastHighBOS = null;
    let lastLowBOS = null;
    for (let i = 0; i < boses.length; i++) {
        const currBos = boses[i];

        if (!currBos) {
            continue;
        }

        if (currBos.type === 'high') {
            if (!lastHighBOS) {
                lastHighBOS = currBos;
            } else if (lastHighBOS.from.index < currBos.from.index && lastHighBOS.to.index >= currBos.to.index) {
                boses[i] = null;
                swings[i] = null;
            } else {
                lastHighBOS = null;
            }
            continue;
        } else if (currBos.type === 'low') {
            if (!lastLowBOS) {
                lastLowBOS = currBos;
            } else if (lastLowBOS.from.index < currBos.from.index && lastLowBOS.to.index >= currBos.to.index) {
                boses[i] = null;
                swings[i] = null;
            } else {
                lastLowBOS = null;
            }
            continue;
        }
    }

    return {swings, boses};
}
export const deleteEmptySwings = (swings: Swing[]) => {
    for (let i = 0; i < swings.length; i++) {
        if (!swings[i]?.text) {
            swings[i] = null;
            continue;
        }
    }

    return swings;
}
export const deleteInternalStructure = (swings: Swing[], boses: Cross[]) => {
    let preLastHighIndex = null;
    let lastHighIndex = null;

    let preLastLowIndex = null;
    let lastLowIndex = null;

    let deletedSwingIndexes = new Set([]);

    for (let i = 0; i < swings.length; i++) {
        if (swings[i] && swings[i].side === 'high' && swings[i].text === 'HH') {
            preLastHighIndex = lastHighIndex;
            lastHighIndex = i;
        }
        if (swings[i] && swings[i].side === 'low' && swings[i].text === 'LL') {
            preLastLowIndex = lastLowIndex;
            lastLowIndex = i;
        }

        if (swings[preLastHighIndex]?.price > swings[lastHighIndex]?.price && swings[preLastLowIndex]?.price < swings[lastLowIndex]?.price) {
            swings[lastLowIndex] = null;
            swings[lastHighIndex] = null;

            deletedSwingIndexes.add(lastLowIndex)
            deletedSwingIndexes.add(lastHighIndex)

            lastLowIndex = preLastLowIndex;
            lastHighIndex = preLastHighIndex;
        }
    }

    boses = boses.map(b => !deletedSwingIndexes.has(b?.extremum?.index) ? b : null);

    return {swings, boses};
}

export interface Cross {
    from: Swing,
    textCandle: HistoryObject,
    to?: Swing,
    extremum?: Swing,
    type: 'low' | 'high',
    text: string
}

export const markHHLL = (candles: HistoryObject[], swings: Swing[]) => {
    let boses: Cross[] = new Array(candles.length).fill(null);

    let lastLow: (Swing & { idmSwing?: Swing }) = null;
    let lowestLow: (Swing & { idmSwing?: Swing }) = null;

    let lastHigh: (Swing & { idmSwing?: Swing }) = null;
    let highestHigh: (Swing & { idmSwing?: Swing }) = null;

    let confirmHighIndex: number = -1;
    let confirmLowIndex: number = -1;

    // Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
    const updateHighestHigh = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'high'
            && (!highestHigh || highestHigh.price < swing.price)
            && confirmLowIndex <= index
        ) {
            if (highestHigh) {
                delete highestHigh.text
                if (highestHigh.idmSwing)
                    boses[highestHigh.idmSwing.index] = null;
            }
            highestHigh = swing;
            highestHigh.idmSwing = lastLow;
        }
    }

    const updateLowestLow = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'low'
            && (!lowestLow || lowestLow.price > swing.price)
            && confirmHighIndex <= index
        ) {
            if (lowestLow) {
                delete lowestLow.text
                if (lowestLow.idmSwing)
                    boses[lowestLow.idmSwing.index] = null;
            }

            lowestLow = swing;
            lowestLow.idmSwing = lastHigh;
        }
    }

    const confirmLowestLow = (index: number) => {
        if (lowestLow
            && lowestLow.idmSwing
            && !boses[lowestLow.idmSwing.index]
            && lowestLow.idmSwing.price < candles[index].high
        ) {
            lowestLow.text = 'LL';
            confirmLowIndex = index;
            const from = lowestLow.idmSwing
            const to = {index, time: candles[index].time, price: candles[index].close}

            const textIndex = from.index + Math.floor((to.index - from.index) / 2);

            if (lowestLow.index !== to.index) {
                boses[from.index] = {
                    type: 'high',
                    text: 'IDM',
                    from,
                    textCandle: candles[textIndex],
                    to,
                    extremum: lowestLow
                } as Cross
            }

            highestHigh = null;
        }
    }

    const confirmHighestHigh = (index: number) => {
        if (highestHigh
            && highestHigh.idmSwing
            && !boses[highestHigh.idmSwing.index]
            && highestHigh.idmSwing.price > candles[index].low
        ) {
            highestHigh.text = 'HH';
            confirmHighIndex = index;
            const from = highestHigh.idmSwing
            const to = {index, time: candles[index].time, price: candles[index].close}

            const textIndex = from.index + Math.floor((to.index - from.index) / 2);

            if (highestHigh.index !== to.index) {
                boses[from.index] = {
                    type: 'low',
                    text: 'IDM',
                    from,
                    textCandle: candles[textIndex],
                    to,
                    extremum: highestHigh
                } as Cross
            }

            lowestLow = null;
        }
    }

    const updateLast = (swing: Swing) => {
        lastHigh = swing && swing.side === 'high' ? swing : lastHigh;
        lastLow = swing && swing.side === 'low' ? swing : lastLow;
    }

    for (let i = 0; i < swings.length; i++) {
        confirmLowestLow(i)
        confirmHighestHigh(i);

        updateHighestHigh(i, swings[i]);
        updateLowestLow(i, swings[i]);

        updateLast(swings[i])
    }

    return boses;
}
// Рисует BOS если LL или HH перекрываются
export const drawBOS = (candles: HistoryObject[], swings: Swing[], boses: Cross[]) => {
    const hasTakenOutLiquidity = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.high : bossCandle.low > currentCandle.low;

    const hasClose = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.close : bossCandle.low > currentCandle.close;

    let prelastLowBosSwing = null;
    let prelastHighBosSwing = null;

    let lastLowBosSwing = null;
    let lastHighBosSwing = null;

    let liquidityHighCandle = null;
    let liquidityLowCandle = null;

    let deleteIDM = new Set([]);

    for (let i = 0; i < candles.length; i++) {
        // TODO Хз надо ли, выглядит ок но финрез хуже
        if (
            swings[prelastHighBosSwing]?.price > swings[lastHighBosSwing]?.price
            && swings[prelastLowBosSwing]?.price < swings[lastLowBosSwing]?.price
        ) {
            // debugger
            swings[lastLowBosSwing] = null;
            swings[lastHighBosSwing] = null;

            deleteIDM.add(lastLowBosSwing);
            deleteIDM.add(lastHighBosSwing);

            lastLowBosSwing = prelastLowBosSwing;
            lastHighBosSwing = prelastHighBosSwing;
            continue;
        }

        if (lastHighBosSwing && (!boses[lastHighBosSwing] || boses[lastHighBosSwing].text === 'IDM')) {
            let from = swings[lastHighBosSwing];
            let liquidityCandle = liquidityHighCandle ?? candles[lastHighBosSwing];
            let to;

            const text = 'BOS';

            const isTakenOutLiquidity = hasTakenOutLiquidity('high', liquidityCandle, candles[i]);
            if (isTakenOutLiquidity) {
                const isClose = hasClose('high', liquidityCandle, candles[i]);
                if (isClose) {
                    to = {index: i, time: candles[i].time, price: candles[i].close};
                } else {
                    liquidityHighCandle = candles[i];
                }
            }

            if (to) {
                const diff = to.index - lastHighBosSwing;
                const textIndex = diff >= 5 ? lastHighBosSwing - Math.round((lastHighBosSwing - to.index) / 2) : from.index;

                boses[lastHighBosSwing] = {
                    from,
                    to,
                    textCandle: candles[textIndex],
                    type: 'high',
                    text,
                    extremum: swings[lastLowBosSwing]
                }

                deleteIDM.add(lastLowBosSwing);

                liquidityHighCandle = null;
            }
        }

        if (lastLowBosSwing && (!boses[lastLowBosSwing] || boses[lastLowBosSwing].text === 'IDM')) {
            let from = swings[lastLowBosSwing];
            let liquidityCandle = liquidityLowCandle ?? candles[lastLowBosSwing];
            let to;

            const text = 'BOS';

            const isTakenOutLiquidity = hasTakenOutLiquidity('low', liquidityCandle, candles[i]);
            if (isTakenOutLiquidity) {
                const isClose = hasClose('low', liquidityCandle, candles[i]);
                if (isClose) {
                    to = {index: i, time: candles[i].time, price: candles[i].close};
                } else {
                    liquidityLowCandle = candles[i];
                }
            }

            if (to) {
                const diff = to.index - lastLowBosSwing;
                const textIndex = diff >= 5 ? lastLowBosSwing - Math.round((lastLowBosSwing - to.index) / 2) : from.index;

                boses[lastLowBosSwing] = {
                    from,
                    to,
                    textCandle: candles[textIndex],
                    type: 'low',
                    text,
                    extremum: swings[lastHighBosSwing]
                }

                deleteIDM.add(lastHighBosSwing);

                liquidityLowCandle = null;
            }
        }

        if (swings[i] && swings[i].side === 'high' && swings[i].text === 'HH') {
            prelastHighBosSwing = lastHighBosSwing;
            lastHighBosSwing = i;
            liquidityHighCandle = null;
        }

        if (swings[i] && swings[i].side === 'low' && swings[i].text === 'LL') {
            prelastLowBosSwing = lastLowBosSwing;
            lastLowBosSwing = i;
            liquidityLowCandle = null;
        }

        // if (!swings[i]) {
        //     continue;
        // }
        //
        // if(i > 227){
        //     debugger
        // }
        //
        // if (swings[i].side === 'high' && (!onlyExtremum || swings[i].text === 'HH')) {
        //     const from = swings[i];
        //     let to;
        //     let liquidityCandle = candles[i];
        //     let text = '';
        //     for (let j = i + 1; j < candles.length; j++) {
        //         const isTakenOutLiquidity = hasTakenOutLiquidity('high', liquidityCandle, candles[j]);
        //         if (!isTakenOutLiquidity) {
        //             continue;
        //         }
        //         const isClose = hasClose('high', liquidityCandle, candles[j]);
        //         if (isClose) {
        //             to = {index: j, time: candles[j].time, price: candles[j].close};
        //             text = 'BOS';
        //             break;
        //         } else {
        //             liquidityCandle = candles[j];
        //         }
        //     }
        //     if (!to) {
        //         continue;
        //     }
        //     const diff = to.index - i;
        //     const textIndex = diff >= 5 ? i - Math.round((i - to.index) / 2) : from.index;
        //     if (text) {
        //         lastHighBOSIndex = i;
        //         boses[lastHighBOSIndex] = {
        //             from,
        //             to,
        //             textCandle: candles[textIndex],
        //             type: 'high',
        //             text
        //         }
        //     }
        // } else if (swings[i].side === 'low' && (!onlyExtremum || swings[i].text === 'LL')) {
        //     const from = swings[i];
        //     let to;
        //     let liquidityCandle = candles[i];
        //     let text = '';
        //     for (let j = i + 1; j < candles.length; j++) {
        //         const isTakenOutLiquidity = hasTakenOutLiquidity('low', liquidityCandle, candles[j]);
        //         if (!isTakenOutLiquidity) {
        //             continue;
        //         }
        //         const isClose = hasClose('low', liquidityCandle, candles[j]);
        //         if (isClose) {
        //             to = {index: j, time: candles[j].time, price: candles[j].close};
        //             text = 'BOS';
        //             break;
        //         } else {
        //             liquidityCandle = candles[j];
        //         }
        //     }
        //     if (!to) {
        //         continue;
        //     }
        //     const diff = to.index - i;
        //     const textIndex = diff >= 5 ? i - Math.round((i - to.index) / 2) : from.index;
        //     if (text){
        //         lastLowBOSIndex = i;
        //         boses[lastLowBOSIndex] = {
        //             from,
        //             to,
        //             textCandle: candles[textIndex],
        //             type: 'low',
        //             text
        //         }
        //     }
        // }
    }

    // boses = boses.filter(b => !(deleteIDM.has(b?.extremum?.index) && b?.extremum?.text === 'IDM'));

    for (let i = 0; i < boses.length; i++) {
        const b = boses[i];
        if (b?.text === 'IDM' && deleteIDM.has(b?.extremum?.index)) {
            boses[i] = null;
        }
    }

    return boses;
}
export const tradinghubCalculateTrendNew = (swings: Swing[], candles: HistoryObject[]) => {
    let boses = markHHLL(candles, swings)

    swings = markIFC(candles, swings);

    swings = deleteEmptySwings(swings);
    const internal = deleteInternalStructure(swings, boses);
    boses = internal.boses;
    swings = internal.swings;

    boses = drawBOS(candles, swings, boses);

    const withTrend = drawTrend(candles, swings, boses);
    const trend = withTrend.trend
    boses = withTrend.boses;

    // swings = markIFC(candles, swings);

    return {trend, boses, swings};
};
const drawTrend = (candles: HistoryObject[], swings: Swing[], boses: Cross[]) => {
    const trend: Trend[] = new Array(candles.length).fill(null);

    const onlyBOSes = boses.filter(bos => swings[bos?.from?.index]?.text);
    for (let i = 0; i < onlyBOSes.length; i++) {
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        const to = !nextBos ? trend.length : nextBos.to.index;
        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            trend[j] = {time: candles[j].time, trend: type === 'high' ? 1 : -1, index: i}
        }

        if (nextBos && curBos.type !== nextBos.type) {
            nextBos.text = 'CHoCH'
        }
    }

    return {trend, boses};
}
const markIFC = (candles: HistoryObject[], swings: Swing[]) => {

    for (let i = 0; i < swings.length; i++) {
        const bos = swings[i];
        if (bos && isIFC(bos.side, candles[bos.index])) {
            bos.isIFC = true
        }
    }

    return swings;
}
export const isIFC = (side: Swing['side'], candle: HistoryObject) => {
    const body = Math.abs(candle.open - candle.close);
    const upWick = candle.high - Math.max(candle.open, candle.close);
    const downWick = Math.min(candle.open, candle.close) - candle.low;

    return (side === 'high' && upWick > body && upWick > downWick)
        || (side === 'low' && upWick < downWick && body < downWick)
}
export const isInsideBar = (candle: HistoryObject, bar: HistoryObject) => candle.high > bar.high && candle.low < bar.low;