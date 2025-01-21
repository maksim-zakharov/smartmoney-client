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


export interface OrderBlock {
    index: number;
    time: number;
    textTime?: number;
    imbalanceIndex: number;
    type: 'high' | 'low';
    lastOrderblockCandle: HistoryObject;
    lastImbalanceCandle: HistoryObject;
    startCandle: HistoryObject;
    // TODO только для теста
    canTrade?: boolean;
    endCandle?: HistoryObject;
    endIndex?: number;
    text?: string;
    isSMT?: boolean;
}

/**
 * OB - строится на структурных точках,
 * только по тренду.
 * На все тело свечи,
 * длится пока его не коснутся,
 * и только если следующая свеча после структурной дает имбаланс
 * Если Об ни разу не пересекли - тянуть до последней свечи
 */
export const calculateOB = (highs: Swing[], lows: Swing[], candles: HistoryObject[], boses: Cross[], trends: Trend[], withMove: boolean = false, newSMT: boolean = false) => {
    let ob: OrderBlock [] = [];
    // Иногда определяеются несколько ОБ на одной свечке, убираем
    let uniqueOrderBlockTimeSet = new Set();

    const MAX_CANDLES_COUNT = 10;

    let lastHighIDMIndex = null;
    for (let i = 0; i < highs.length; i++) {
        const high = highs[i];
        const index = high?.index

        if (boses[i]?.type === 'high' && boses[i]?.text === 'IDM') {
            lastHighIDMIndex = i;
        }

        if (!high) { //  || trends[index]?.trend !== -1) {
            continue;
        }
        const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
        const orderBlock = isOrderblock(candlesBatch, withMove);
        if (orderBlock?.type === 'high' && !uniqueOrderBlockTimeSet.has(orderBlock.orderblock.time)) {
            // TODO Не торговать ОБ под IDM
            const bossIndex = orderBlock.firstImbalanceIndex + index;
            const boss = boses[bossIndex];
            let text = 'OB';

            if(high.text === 'HH'){
                text = 'Ex OB';
            }

            let isSMT = false;
            if (!newSMT && (boss || (lastHighIDMIndex
                && boses[lastHighIDMIndex].from.index <= i
                && boses[lastHighIDMIndex].to.index > i))
            ) {
                text = 'SMT';
                isSMT = true;
            }

            ob.push({
                text,
                isSMT,
                type: orderBlock.type,
                index,
                time: orderBlock.orderblock.time,
                // textTime,
                lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                imbalanceIndex: orderBlock.imbalanceIndex,
                startCandle: orderBlock.orderblock
            } as OrderBlock)

            uniqueOrderBlockTimeSet.add(orderBlock.orderblock.time);
        }
    }

    let lastLowIDMIndex = null;
    for (let i = 0; i < lows.length; i++) {
        const low = lows[i];
        const index = low?.index

        if (boses[i]?.type === 'low' && boses[i]?.text === 'IDM') {
            lastLowIDMIndex = i;
        }

        if (!lows[i]) { // || trends[index]?.trend !== 1) {
            continue;
        }
        const candlesBatch = candles.slice(index, index + MAX_CANDLES_COUNT);
        const orderBlock = isOrderblock(candlesBatch, withMove);
        if (orderBlock?.type === 'low' && !uniqueOrderBlockTimeSet.has(orderBlock.orderblock.time)) {
            // TODO Не торговать ОБ под IDM
            const bossIndex = orderBlock.firstImbalanceIndex + index;
            const boss = boses[bossIndex];
            let text = 'OB';

            if(low.text === 'LL'){
                text = 'Ex OB';
            }

            let isSMT = false;
            if (!newSMT && (boss || (lastLowIDMIndex
                && boses[lastLowIDMIndex].from.index <= i
                && boses[lastLowIDMIndex].to.index > i))
            ) {
                text = 'SMT';
                isSMT = true;
            }

            ob.push({
                text,
                isSMT,
                type: orderBlock.type,
                index,
                time: orderBlock.orderblock.time,
                lastOrderblockCandle: orderBlock.lastOrderblockCandle,
                lastImbalanceCandle: orderBlock.lastImbalanceCandle,
                firstImbalanceIndex: orderBlock.firstImbalanceIndex,
                imbalanceIndex: orderBlock.imbalanceIndex,
                startCandle: orderBlock.orderblock
            } as OrderBlock)

            uniqueOrderBlockTimeSet.add(orderBlock.orderblock.time);
        }
    }

    ob = ob.sort((a, b) => a.index - b.index);

    // Где начинается позиция TODO для теста, в реальности это точка входа
    for (let i = 0; i < ob.length; i++) {
        const obItem = ob[i];
        const startPositionIndex = obItem.index + obItem.imbalanceIndex;

        const array = obItem.type === 'high' ? lows : highs;
        let lastSwingIndex = null;

        for (let j = startPositionIndex; j < candles.length - 1; j++) {
            const candle = candles[j];

            if (hasHitOB(obItem, candle)) {
                obItem.endCandle = candle;
                obItem.endIndex = j
                obItem.canTrade = true;

                // Если ОБ не только коснулись но и закрылись под ним
                if(
                    (obItem.type === 'low' && obItem.startCandle.low > candle.close)
                    || (obItem.type === 'high' && obItem.startCandle.high < candle.close)
                ){
                    obItem.canTrade = false;
                    obItem.text = 'SMT';
                    obItem.isSMT = true;
                }

                if (newSMT && lastSwingIndex === obItem.index) {
                    obItem.canTrade = false;
                    obItem.text = 'SMT';
                    obItem.isSMT = true;
                }

                break;
            }

            // Если ОБ на продажу (high) - то нужно чтобы лоу после индекса проставился 2 раза. Если 1 - то ОБ это IDM.
            if (newSMT && array[j]) {
                if(!lastSwingIndex){
                    lastSwingIndex = j;
                } else {
                    obItem.canTrade = false;
                    obItem.text = 'SMT';
                    obItem.isSMT = true;
                }
            }
        }
    }

    return ob
        .filter(obItem =>  {
            if(trends[obItem.index]?.trend !== 1 && trends[obItem.endIndex]?.trend !== 1 && obItem.type === 'low'){
                return false;
            }
            if(trends[obItem.index]?.trend !== -1 && trends[obItem.endIndex]?.trend !== -1 && obItem.type === 'high'){
                return false;
            }
            return true;
        });
};

export const calculateTesting = (data: HistoryObject[], {
    moreBOS, showHiddenSwings, newStructure, showIFC,
    withMove,
    newSMT
}: THConfig) => {
    // <-- Копировать в робота
    let {highs, lows, swings: _swings} = tradinghubCalculateSwings(data);
    const {highParts, lowParts} = calculateStructure(
        highs,
        lows,
        data,
    );

    const {
        trend,
        boses,
        swings: thSwings,
    } = tradinghubCalculateTrendNew(_swings, data, {moreBOS, showHiddenSwings, showIFC, newStructure});
    _swings = thSwings;
    highs = thSwings.map((t) => t?.side === 'high' ? t : null);
    lows = thSwings.map((t) => t?.side === 'low' ? t : null);

    // Копировать в робота -->
    const orderBlocks = calculateOB(
        newStructure ? highs : highParts,
        newStructure ? lows : lowParts,
        data,
        boses,
        trend,
        withMove,
        newSMT
    )

    return {swings: _swings, highs, lows, trend, boses, orderBlocks};
}

export interface THConfig {
    withMove?: boolean;
    moreBOS?: boolean;
    newStructure?: boolean;
    showHiddenSwings?: boolean;
    newSMT?: boolean;
    showIFC?: boolean;
}

// Точка входа в торговлю
export const calculateProduction = (data: HistoryObject[]) => {
    const config: THConfig = {
        withMove: false,
        moreBOS: true
    }

    const {orderBlocks} = calculateTesting(data, config);

    // orderBlocks.push(...IFCtoOB(thSwings, candles));

    return orderBlocks; // .filter((obItem) => !obItem.isSMT);
};

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


        if (!diff || hasLowValidPullback(currentCandle, nextCandle)) {
            const swing: Swing = {
                side: (highPullback || '') as any,
                time: currentCandle.time,
                price: currentCandle.high,
                index: i
            }
            highs[i] = highPullback ? {...swing, side: 'high'} : highs[i];
            swings[i] = highPullback ? swing : swings[i];
        }

        if (!diff || hasHighValidPullback(currentCandle, nextCandle)) {
            const swing: Swing = {
                side: (lowPullback || '') as any,
                time: currentCandle.time,
                price: currentCandle.low,
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
            } else if (!lows[i]) {
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
            } else if (!highs[i]) {
                // Обновляем лой подряд
                swings[i] = null;
                lows[i] = null;
            }
        }
    }

    return {swings, highs, lows};
}

const calculateStructure = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    let structure: Swing[] = [];

    // Просто формируется массив structure
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

    // Выбирает самый лой и самый хай
    for (let i = 0; i < structure.length - 1; i++) {
        const currStruct = structure[i];
        const nextStruct = structure[i + 1];

        const idx = 0; // было 1 теперь ок

        if (nextStruct.side === 'low') {
            const batch = lows.slice(currStruct.index + 1, nextStruct.index + 2);
            const index = batch.reduce((acc, curr) => {
                if (curr && candles[acc].low > curr.price) {
                    return curr.index + idx;
                }
                return acc;
            }, currStruct.index + idx);

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
                    return curr.index + idx;
                }
                return acc;
            }, currStruct.index + idx);

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

export const deleteEmptySwings = (swings: Swing[]) => {
    for (let i = 0; i < swings.length; i++) {
        if (!swings[i]?.text) {
            swings[i] = null;
            continue;
        }
    }

    return swings;
}
export const deleteInternalStructure = (swings: Swing[], candles: HistoryObject[], boses: Cross[], {
    newStructure
}: THConfig) => {
    let preLastHighIndex = null;
    let lastHighIndex = null;

    let preLastLowIndex = null;
    let lastLowIndex = null;

    let deletedSwingIndexes = new Set([]);

    if (!newStructure) {
        // Это не правильно
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
    } else {

        // Алгоритм такой
        /**
         * Если в рамках первых двух точек я нахожу следующие 2 точки внутренними, то записываю их внутренними до тех пор, пока хотя бы одна точка не станет внешней.
         * Если внешняя точка снизу и вторая точка была тоже снизу - из внутренних ищу самую высокую.
         * Если внешняя точка сверху и вторая точка была тоже сверху - из внутренних ищу самую низкую.
         *
         * Остальные удаляются
         */
        for (let i = 0; i < swings.length; i++) {
            // Оставить лойный лой
            if (swings[preLastHighIndex]?.price < candles[i].high) {
                const batch = swings.slice(preLastHighIndex + 1, i);
                const minIndex = batch.reduce((acc, idx, i) => {
                    if (!acc && idx) {
                        acc = idx;
                    } else if (idx && acc.price > idx.price) {
                        acc = idx;
                    }
                    return acc;
                }, batch[0])

                batch
                    .filter(idx => idx && idx?.index !== minIndex?.index)
                    .forEach(idx => {
                        delete swings[idx.index].text;
                        deletedSwingIndexes.add(idx.index);
                    })

                preLastLowIndex = minIndex?.index;
                preLastHighIndex = null;
            }
            //
            if (swings[preLastLowIndex]?.price > candles[i].low) {
                const batch = swings.slice(preLastLowIndex + 1, i);
                const minIndex = batch.reduce((acc, idx, i) => {
                    if (!acc && idx) {
                        acc = idx;
                    } else if (idx && acc.price < idx.price) {
                        acc = idx;
                    }
                    return acc;
                }, batch[0])

                batch
                    .filter(idx => idx && idx?.index !== minIndex?.index)
                    .forEach(idx => {
                        delete swings[idx.index].text;
                        deletedSwingIndexes.add(idx.index);
                    })

                preLastHighIndex = minIndex?.index;
                preLastLowIndex = null;
            }
            if (swings[i] && swings[i].side === 'high' && swings[i].text === 'HH') {
                if (!preLastHighIndex || swings[preLastHighIndex].price < swings[i].price) {
                    preLastHighIndex = i;
                }

                lastHighIndex = i;
            }
            if (swings[i] && swings[i].side === 'low' && swings[i].text === 'LL') {
                if (!preLastLowIndex || swings[preLastLowIndex].price > swings[i].price) {
                    preLastLowIndex = i;
                }
                lastLowIndex = i;
            }
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
        // test
        // if(swings[i]){
        //     swings[i].text = i.toString();
        // }
        confirmLowestLow(i)
        confirmHighestHigh(i);

        updateHighestHigh(i, swings[i]);
        updateLowestLow(i, swings[i]);

        updateLast(swings[i])
    }

    return boses;
}

// Рисует BOS если LL или HH перекрываются
export const drawBOS = (candles: HistoryObject[], swings: Swing[], boses: Cross[], moreBOS: boolean = false) => {
    const hasTakenOutLiquidity = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.high : bossCandle.low > currentCandle.low;

    const hasClose = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.close : bossCandle.low > currentCandle.close;

    let liquidityCandleMap: Record<'high' | 'low', HistoryObject> = {
        high: null,
        low: null
    }

    let prelastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }
    let lastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    let deleteIDM = new Set([]);

    let lastBosSwingMapSet: Record<'high' | 'low', Set<number>> = {
        high: new Set<number>([]),
        low: new Set<number>([])
    }

    let liquidityCandleMapMap: Record<'high' | 'low', Map<number, HistoryObject>> = {
        high: new Map<number, HistoryObject>([]),
        low: new Map<number, HistoryObject>([])
    }

    const updateLastSwing = (i: number, type: 'high' | 'low', text: string) => {
        if (swings[i] && swings[i].side === type && swings[i].text === text) {
            prelastBosSwingMap[type] = lastBosSwingMap[type];
            lastBosSwingMap[type] = i;

            if (moreBOS) {
                lastBosSwingMapSet[type].add(lastBosSwingMap[type])
            } else {
                liquidityCandleMap[type] = null;
            }
        }
    }

    const confirmBOS = (i: number, lastBosSwing: number, lastCrossBosSwing: number, type: 'high' | 'low') => {
        if (lastBosSwing && (!boses[lastBosSwing] || boses[lastBosSwing].text === 'IDM')) {
            let from = swings[lastBosSwing];
            let liquidityCandle = (moreBOS ? liquidityCandleMapMap[type].get(lastBosSwing) : liquidityCandleMap[type]) ?? candles[lastBosSwing];
            let to;

            const text = 'BOS';

            const isTakenOutLiquidity = hasTakenOutLiquidity(type, liquidityCandle, candles[i]);
            if (isTakenOutLiquidity) {
                const isClose = hasClose(type, liquidityCandle, candles[i]);
                if (isClose) {
                    to = {index: i, time: candles[i].time, price: candles[i].close};
                } else {
                    if (moreBOS) {
                        liquidityCandleMapMap[type].set(lastBosSwing, liquidityCandleMap[type])
                    } else {
                        liquidityCandleMap[type] = candles[i];
                    }
                }
            }

            if (to) {
                const diff = to.index - lastBosSwing;
                const textIndex = diff >= 5 ? lastBosSwing - Math.round((lastBosSwing - to.index) / 2) : from.index;

                boses[lastBosSwing] = {
                    from,
                    to,
                    textCandle: candles[textIndex],
                    type,
                    text,
                    extremum: swings[lastCrossBosSwing]
                }

                deleteIDM.add(lastCrossBosSwing);

                if (moreBOS) {
                    lastBosSwingMapSet[type].delete(lastBosSwing)
                }

                if (moreBOS) {
                    liquidityCandleMapMap[type].delete(lastBosSwing)
                } else {
                    liquidityCandleMap[type] = null;
                }
            }
        }
    }

    for (let i = 0; i < candles.length; i++) {
        // TODO Хз надо ли, выглядит ок но финрез хуже
        // Если сужение - удаляем внутренние босы
        if (
            swings[prelastBosSwingMap['high']]?.price > swings[lastBosSwingMap['high']]?.price
            && swings[prelastBosSwingMap['low']]?.price < swings[lastBosSwingMap['low']]?.price
        ) {
            if (!moreBOS) {
                swings[lastBosSwingMap['low']] = null;
                swings[lastBosSwingMap['high']] = null;
            } else {
                lastBosSwingMapSet['low'].delete(lastBosSwingMap['low'])
                lastBosSwingMapSet['high'].delete(lastBosSwingMap['high'])

                liquidityCandleMapMap['low'].delete(lastBosSwingMap['low'])
                liquidityCandleMapMap['high'].delete(lastBosSwingMap['high'])
            }

            deleteIDM.add(lastBosSwingMap['low']);
            deleteIDM.add(lastBosSwingMap['high']);

            lastBosSwingMap['low'] = prelastBosSwingMap['low'];
            lastBosSwingMap['high'] = prelastBosSwingMap['high'];
            continue;
        }

        // BOS сверху
        if (moreBOS) {
            lastBosSwingMapSet['high'].forEach(lastBosSwing => confirmBOS(i, lastBosSwing, lastBosSwingMap['low'], 'high'))
        } else {
            confirmBOS(i, lastBosSwingMap['high'], lastBosSwingMap['low'], 'high');
        }

        // BOS снизу
        if (moreBOS) {
            lastBosSwingMapSet['low'].forEach(lastBosSwing => confirmBOS(i, lastBosSwing, lastBosSwingMap['high'], 'low'))
        } else {
            confirmBOS(i, lastBosSwingMap['low'], lastBosSwingMap['high'], 'low');
        }

        updateLastSwing(i, 'high', 'HH');
        updateLastSwing(i, 'low', 'LL');
    }

    boses
        .filter(b => b?.type === 'high' && b?.text !== 'IDM')
        .sort((a, b) => a.from.price - b.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    boses[curr.from.index] = null;
                    break;
                }
            }
        })

    boses
        .filter(b => b?.type === 'low' && b?.text !== 'IDM')
        .sort((a, b) => b.from.price - a.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    boses[curr.from.index] = null;
                    break;
                }
            }
        })

    for (let i = 0; i < boses.length; i++) {
        const b = boses[i];
        if (b?.text === 'IDM' && deleteIDM.has(b?.extremum?.index)) {
            boses[i] = null;
        }
    }

    return boses;
}
export const tradinghubCalculateTrendNew = (swings: Swing[], candles: HistoryObject[], {
    moreBOS, showHiddenSwings, showIFC, newStructure
}: THConfig) => {

    let boses = markHHLL(candles, swings)

    if (showIFC)
        swings = markIFC(candles, swings);

    if (!showHiddenSwings) {
        swings = deleteEmptySwings(swings);
    }

    const internal = deleteInternalStructure(swings, candles, boses, {
        newStructure
    });
    boses = internal.boses;
    swings = internal.swings;

    boses = drawBOS(candles, swings, boses, moreBOS);

    const withTrend = drawTrend(candles, swings, boses);
    const trend = withTrend.trend
    boses = withTrend.boses;

    return {trend, boses, swings};
};
const drawTrend = (candles: HistoryObject[], swings: Swing[], boses: Cross[]) => {
    const trend: Trend[] = new Array(candles.length).fill(null);

    let onlyBOSes = boses.filter(bos => swings[bos?.from?.index]?.text);
    for (let i = 0; i < onlyBOSes.length; i++) {
        const prevBos = onlyBOSes[i - 1];
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        const to = !nextBos ? trend.length : nextBos.to.index;

        // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
        if (curBos?.from.index > prevBos?.from.index && curBos?.to.index < prevBos?.to.index) {
            boses[curBos.from.index] = null;
            continue;
        }

        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            trend[j] = {time: candles[j].time, trend: type === 'high' ? 1 : -1, index: i}
        }

        if (nextBos && curBos.type !== nextBos.type && curBos.to.index < nextBos.to.index) {
            nextBos.text = 'CHoCH'
        }
    }

    onlyBOSes = boses
        .filter(bos => swings[bos?.from?.index]?.text)
        .sort((a, b) => a.to.index - b.to.index);
    for (let i = 0; i < onlyBOSes.length; i++) {
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
        if (curBos.to.index === nextBos?.to.index) {
            boses[nextBos.from.index] = null;
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
export const isOrderblock = (candles: HistoryObject[], withMove: boolean = false) => {
    if (candles.length < 3) {
        return null;
    }
    let firstImbalanceIndex;
    let firstCandle = candles[0];

    for (let i = 1; i < candles.length; i++) {
        if (!isInsideBar(firstCandle, candles[i])) {
            firstImbalanceIndex = i - 1;
            break;
        }
    }

    let lastImbalanceIndex;
    if (withMove) {
        // Берем не только первый имбаланс, а ближайший из 10 свечей
        for (let i = firstImbalanceIndex; i < candles.length - 2; i++) {
            if (isImbalance(candles[i], candles[i + 2])) {
                firstCandle = candles[i];
                firstImbalanceIndex = i;

                lastImbalanceIndex = i + 2;
                break;
            }
        }
    } else {
        // Берем не только первый имбаланс, а ближайший из 10 свечей
        for (let i = firstImbalanceIndex; i < candles.length - 1; i++) {
            if (isImbalance(candles[firstImbalanceIndex], candles[i + 1])) {
                lastImbalanceIndex = i + 1;
                break;
            }
        }
    }

    const lastImbalanceCandle = candles[lastImbalanceIndex];
    const lastOrderblockCandle = candles[firstImbalanceIndex];
    if (!lastImbalanceCandle) {
        return null;
    }

    // Жестко нужно для БД, не трогать
    const time = Math.min(firstCandle.time, lastOrderblockCandle.time);
    const open = firstCandle.time === time ? firstCandle.open : lastOrderblockCandle.open;
    const close = firstCandle.time !== time ? firstCandle.close : lastOrderblockCandle.close;

    if (lastImbalanceCandle.low > firstCandle.high) {
        return {
            orderblock: {
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
            type: 'low',
        };
    }
    if (lastImbalanceCandle.high < firstCandle.low) {
        return {
            orderblock: {
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
            type: 'high',
        };
    }
    return null;
};

const isInternalBOS = (leftBos: Cross, rightBos: Cross) => leftBos.from.index < rightBos.from.index
    && leftBos.to.index >= rightBos.to.index
const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;

export const hasHitOB = (ob: OrderBlock, candle: HistoryObject) =>
    (ob.type === 'high'
        // && ob.startCandle.low > candle.open
        && ob.startCandle.low <= candle.high
        // && ob.startCandle.low > candle.close
    )
    || (ob.type === 'low'
        // И открытие выше ОБ
        // && ob.startCandle.high < candle.open
        // Если был прокол
        && ob.startCandle.high >= candle.low
        // И закрытие выше ОБ
        // && ob.startCandle.high < candle.close
    );
export const notTradingTime = (candle: HistoryObject) => {
    const hours = new Date(candle.time * 1000).getHours();
    const minutes = new Date(candle.time * 1000).getMinutes();

    // Открытие утреннего аукциона
    if (hours > 2 && hours < 10) {
        return true;
    }

    // Открытие утренней сессии
    // хз удалять ли
    // if (hours === 10 && minutes === 0) {
    //   return true;
    // }

    // закрытие дневной сессии
    if (hours === 18 && minutes >= 45) {
        return true;
    }

    // Открытие вечерней сессии
    // хз удалять ли
    if (hours === 19 && minutes === 0) {
        return true;
    }

    return false;
};