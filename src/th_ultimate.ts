

export interface HistoryObject {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number
    volume: number;
}

export class Swing {
    side?: 'high' | 'low';
    time: number;
    price: number;
    index: number;
    isIFC?: boolean;

    protected _isExtremum: boolean = false;

    constructor(props: Partial<Swing>) {
        Object.assign(this, props)
    }

    get isExtremum() {
        return this._isExtremum;
    }

    get text() {
        if (!this._isExtremum) {
            return undefined;
        }
        return this.side === 'high' ? 'HH' : 'LL';
    }

    markExtremum() {
        this._isExtremum = true;
    }

    unmarkExtremum() {
        this._isExtremum = false;
    }
}

export class Cross {
    from: Swing;
    to?: Swing;
    extremum?: Swing;
    type: 'low' | 'high'

    isIDM?: boolean;
    isBOS?: boolean;
    isCHoCH?: boolean;

    isSwipedLiquidity?: boolean;
    isConfirmed?: boolean;

    constructor(props: Partial<Cross>) {
        Object.assign(this, props)
    }

    getCandles(): HistoryObject[] {
        return [];
    }

    get textIndex(): number {
        return this.from.index + Math.floor((this.to.index - this.from.index) / 2);
    }

    get textCandle(): HistoryObject {
        return this.getCandles()[this.textIndex];
    }

    markCHoCH() {
        this.isIDM = false;
        this.isBOS = false;
        this.isCHoCH = true;
    }

    /**
     * isIDM - IDM
     * !isConfirmed && isBOS - Fake BOS
     * isConfirmed && isBOS - BOS
     * !isConfirmed && isCHoCH - Fake CHoCH
     * isConfirmed && isCHoCH - CHoCH
     */
    get text(): string {

        if (this.isIDM) {
            return 'IDM';
        }
        if (this.isBOS) {
            if (!this.isSwipedLiquidity || this.isConfirmed)
                return 'BOS';
            return 'Fake BOS';
        }
        if (this.isCHoCH) {
            if (!this.isSwipedLiquidity || this.isConfirmed)
                return 'CHoCH';
            return 'Fake CHoCH';
        }

        return '';
    }
}

export class OrderBlock {
    textTime?: number;
    firstImbalanceIndex: number;
    imbalanceIndex: number;
    type: 'high' | 'low';
    lastOrderblockCandle: HistoryObject;
    lastImbalanceCandle: HistoryObject;
    startCandle: HistoryObject;
    // TODO только для теста
    canTrade?: boolean;
    endCandle?: HistoryObject;
    endIndex?: number;
    isSMT?: boolean;
    tradeOrderType?: 'limit' | 'market'
    takeProfit?: number;
    swing: Swing;

    constructor(props: Partial<OrderBlock>) {
        Object.assign(this, props);
    }

    get index(): number {
        return this.swing.index;
    }

    get time(): number {
        return this.startCandle.time;
    }

    get text(): string {
        if (this.swing.isExtremum)
            return 'Ex OB';
        if (this.isSMT)
            return 'SMT';
        return 'OB';
    }
}

/**
 * OB - строится на структурных точках,
 * только по тренду.
 * На все тело свечи,
 * длится пока его не коснутся,
 * и только если следующая свеча после структурной дает имбаланс
 * Если Об ни разу не пересекли - тянуть до последней свечи
 */
export const calculateOB = (swings: Swing[], candles: HistoryObject[], boses: Cross[], trends: Trend[], withMove: boolean = false, newSMT: boolean = false, showFake: boolean = false) => {
    let orderblocks: OrderBlock [] = new Array(candles.length).fill(null);
    // Иногда определяеются несколько ОБ на одной свечке, убираем
    let uniqueOrderBlockTimeSet = new Set();

    let lastIDMIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    let lastExtremumIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    let nonConfirmsOrderblocks = new Map<number, {
        swing: Swing,
        firstCandle: HistoryObject,
        takeProfit: number;
        firstImbalanceIndex: number,
        lastImbalanceIndex?: number;
        status: 'draft' | 'firstImbalanceIndex' | 'lastImbalanceIndex'
    }>([]);

    let obIdxes = new Set<number>([]);

    for (let i = 0; i < swings.length; i++) {
        const candle = candles[i];
        const trend = trends[i];
        const swing = swings[i];
        const index = swing?.index

        if (boses[i]?.isIDM) {
            lastIDMIndexMap[boses[i]?.type] = i;
        }

        if (swing?.isExtremum) {
            lastExtremumIndexMap[swing.side] = i;
        }

        if (swing) {
            // Здесь по идее нужно создавать "задачу" на поиск ордерблока.
            // И итерироваться в дальшейшем по всем задачам чтобы понять, ордерблок можно создать или пора задачу удалить.
            nonConfirmsOrderblocks.set(swing.time, {
                swing,
                firstCandle: candles[index],
                firstImbalanceIndex: index,
                status: 'draft',
                // Тейк профит до ближайшего максимума
                takeProfit: swing.side === 'high' ? swings[lastExtremumIndexMap['low']]?.price : swings[lastExtremumIndexMap['high']]?.price
            })
        }

        // В этом блоке создаем все ОБ
        // Если есть хотя бы 3 свечки
        if (i >= 2) {
            nonConfirmsOrderblocks.forEach((orderblock, time) => {
                let {swing, firstCandle, firstImbalanceIndex, status, takeProfit, lastImbalanceIndex} = orderblock;
                // Сначала ищем индекс свечки с которой будем искать имбаланс.
                // Для этого нужно проверить что следующая свеча после исследуемой - не является внутренней.
                if (status === 'draft' && firstImbalanceIndex < i && !isInsideBar(firstCandle, candles[i])) {
                    firstImbalanceIndex = i - 1;
                    status = 'firstImbalanceIndex';
                    nonConfirmsOrderblocks.set(time, {...orderblock, firstImbalanceIndex, status})
                }

                // Все некст свечи внутренние
                if (status === 'draft') {
                    return;
                }

                const num = withMove ? 2 : 1;
                const firstImbIndex = firstImbalanceIndex + num

                if (firstImbIndex <= i && isImbalance(candles[firstImbalanceIndex], candles[i])) {
                    if (withMove) {
                        firstCandle = candles[firstImbIndex];
                        firstImbalanceIndex = firstImbIndex;
                    }
                    lastImbalanceIndex = i;
                    status = 'lastImbalanceIndex';
                    nonConfirmsOrderblocks.set(time, {
                        ...orderblock,
                        firstImbalanceIndex,
                        firstCandle,
                        lastImbalanceIndex,
                        status,
                    })
                }

                // Это на случай если индексы не нашлись
                if (status === 'firstImbalanceIndex') {
                    return;
                }

                const lastImbalanceCandle = candles[lastImbalanceIndex];
                const lastOrderblockCandle = candles[firstImbalanceIndex];

                // Жестко нужно для БД, не трогать
                const open = firstCandle.time === time ? firstCandle.open : lastOrderblockCandle.open;
                const close = firstCandle.time !== time ? firstCandle.close : lastOrderblockCandle.close;
                const type = lastImbalanceCandle.low > firstCandle.high ? 'low' : lastImbalanceCandle.high < firstCandle.low ? 'high' : null;

                if (!type) {
                    nonConfirmsOrderblocks.delete(time);
                    return;
                }

                const orderBlock = {
                    startCandle: {
                        time,
                        open,
                        close,
                        high: Math.max(firstCandle.high, lastOrderblockCandle.high),
                        low: Math.min(firstCandle.low, lastOrderblockCandle.low),
                    } as HistoryObject,
                    lastOrderblockCandle,
                    lastImbalanceCandle,
                    firstImbalanceIndex: firstImbalanceIndex - swing.index,
                    imbalanceIndex: lastImbalanceIndex - swing.index,
                    type,
                } as OrderblockPart;

                const lastIDMIndex = lastIDMIndexMap[swing?.side]
                if (orderBlock?.type === swing?.side && !uniqueOrderBlockTimeSet.has(orderBlock.startCandle.time)) {
                    // TODO Не торговать ОБ под IDM
                    const bossIndex = orderBlock.firstImbalanceIndex + index;
                    const hasBoss = Boolean(boses[bossIndex]) && (!showFake || boses[bossIndex].isConfirmed);

                    orderblocks[swing.index] = new OrderBlock({
                        ...orderBlock,
                        isSMT: !newSMT && (hasBoss || (lastIDMIndex
                            && boses[lastIDMIndex].from.index <= i
                            && boses[lastIDMIndex].to.index > i)),
                        swing,
                        canTrade: true,
                        tradeOrderType: 'limit',
                        takeProfit
                    })
                    obIdxes.add(swing.index);

                    uniqueOrderBlockTimeSet.add(orderBlock.startCandle.time);
                }
                nonConfirmsOrderblocks.delete(time);
            })
        }

        // В этом блоке по всем OB подтверждаем endCandles
        if (newSMT) {
            /**
             * Итерируюсь по свечкам
             * Записываю нахожусь ли я внутри IDM. Если да - то это SMT
             * Записываю новые ОБ и закрываю их если было касание
             */
            obIdxes.forEach(obIdx => {
                const obItem = orderblocks[obIdx];
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;

                const idmType = obItem.type;
                if (lastIDMIndexMap[idmType] && lastIDMIndexMap[idmType] <= i && obItem.index >= lastIDMIndexMap[idmType]) {
                    obItem.isSMT = true;
                    obItem.canTrade = false;
                }
                if (boses[lastIDMIndexMap[idmType]]?.isConfirmed && lastIDMIndexMap[idmType] && boses[lastIDMIndexMap[idmType]].to?.index - 1 <= i) {
                    obItem.isSMT = false;
                    obItem.canTrade = true;
                }
                if (startPositionIndex <= i && hasHitOB(obItem, candle)) {
                    obIdxes.delete(obIdx);

                    obItem.endCandle = candle;
                    obItem.endIndex = i;
                    obItem.canTrade = true;
                    obItem.tradeOrderType = 'market';

                    const trendType = trend?.trend === 1 ? 'low' : 'high';
                    if (!trend || trendType !== obItem.type) {
                        obItem.canTrade = false;
                        return;
                    }
                }
            })

            if (lastIDMIndexMap['high'] && boses[lastIDMIndexMap['high']].to?.index - 1 === i) {
                lastIDMIndexMap['high'] = null;
            }

            if (lastIDMIndexMap['low'] && boses[lastIDMIndexMap['low']].to?.index - 1 === i) {
                lastIDMIndexMap['low'] = null;
            }
        }
    }

    if (!newSMT) {
        // Где начинается позиция TODO для теста, в реальности это точка входа
        for (let i = 0; i < orderblocks.length; i++) {
            const obItem = orderblocks[i];
            if (!obItem) {
                continue;
            }
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
        }
    }

    return orderblocks.map((ob, index) => {
        // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
        const obStartIndex = ob?.index;
        const obIndex = ob?.endIndex || index;
        const startTrend = trends[obStartIndex]?.trend;
        const trend = trends[obIndex]?.trend;
        if (startTrend !== trend) {
            return null;
        }
        if (trend === 1 && ob?.type === 'low') {
            return ob;
        }
        if (trend === -1 && ob?.type === 'high') {
            return ob;
        }
        return null;
    });
};

export const calculateTesting = (data: HistoryObject[], {
    moreBOS, showHiddenSwings, showIFC,
    withMove,
    newSMT,
    byTrend,
    showFake,
    oneIteration
}: THConfig) => {
    // <-- Копировать в робота
    let swings = tradinghubCalculateSwings(data, oneIteration);

    const {
        trend,
        boses,
        swings: thSwings,
    } = tradinghubCalculateTrendNew(swings, data, {moreBOS, showHiddenSwings, showFake, showIFC});
    swings = thSwings;

    // Копировать в робота -->
    let orderBlocks = calculateOB(
        swings,
        data,
        boses,
        trend,
        withMove,
        newSMT,
        showFake
    )

    if (byTrend) {
        const currentTrend = trend[trend.length - 1]?.trend === 1 ? 'low' : 'high';
        orderBlocks = orderBlocks.filter(ob => ob?.type === currentTrend);
    }

    return {swings, trend, boses, orderBlocks};
}

export interface THConfig {
    withMove?: boolean;
    moreBOS?: boolean;
    showHiddenSwings?: boolean;
    newSMT?: boolean;
    showIFC?: boolean;
    byTrend?: boolean;
    showFake?: boolean;
    oneIteration?: boolean;
}

export const isNotSMT = (obItem: OrderBlock) => !obItem || (!obItem.isSMT && obItem.text !== 'SMT')

export const defaultConfig: THConfig = {
    moreBOS: true,
    newSMT: true,
    showHiddenSwings: false,
    withMove: false,
    byTrend: true,
    showFake: false,
    oneIteration: true
}

// Точка входа в торговлю
export const calculateProduction = (data: HistoryObject[]) => {
    const config: THConfig = defaultConfig

    const {orderBlocks} = calculateTesting(data, config);

    // orderBlocks.push(...IFCtoOB(thSwings, candles));

    return orderBlocks.filter(isNotSMT);
};

const hasHighValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
    if (
        // Текущая свеча пересвипнула предыдущую
        leftCandle.high < currentCandle.high
        // И следующий свечи либо нет либо ее хай ниже текущего
        && (!nextCandle || nextCandle.high <= currentCandle.high)
    ) {
        return 'high'
    }
    return '';
};
const hasLowValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
    if (leftCandle.low > currentCandle.low && (!nextCandle || nextCandle.low >= currentCandle.low)
    ) {
        return 'low'
    }
    return '';
};

const tryCalculatePullback = (index: number, type: 'high' | 'low', diff: number, prevCandle: HistoryObject, currentCandle: HistoryObject, nextCandle: HistoryObject, swings: Swing[]) => {
    const funcMap: Record<'high' | 'low', Function> = {
        high: hasHighValidPullback,
        low: hasLowValidPullback
    }

    const mainFunc = funcMap[type];
    const subFunc = funcMap[type === 'high' ? 'low' : 'high'];

    // diff может быть если между текущей свечой и последней есть еще свечки.
    // В таком случае нужно проверить что последняя свеча не является внутренней для текущей свечи (пересвипнула снизу)
    if (!diff || subFunc(currentCandle, nextCandle)) {
        const highPullback = mainFunc(prevCandle, currentCandle, nextCandle)
        const swing = new Swing({
            side: type,
            time: currentCandle.time,
            price: currentCandle[type],
            index
        })
        swings[index] = highPullback ? swing : swings[index];
    }
}

const filterDoubleSwings = (i: number, lastSwingIndex: number, updateLastSwingIndex: (val: number) => void, swings: Swing[]) => {
    // фильтруем вершины подряд
    const prevSwing = lastSwingIndex > -1 ? swings[lastSwingIndex] : null;
    const curSwing = swings[i];
    let setIndex = i;
    if (curSwing) {
        if (curSwing.side === prevSwing?.side) {
            let toDeleteIndex;
            if (curSwing.side === 'high') {
                if (curSwing.price >= prevSwing?.price) {
                    toDeleteIndex = lastSwingIndex;
                } else if (curSwing.price < prevSwing?.price) {
                    toDeleteIndex = i;
                    setIndex = lastSwingIndex;
                }
            }
            if (curSwing.side === 'low') {
                if (curSwing.price <= prevSwing?.price) {
                    toDeleteIndex = lastSwingIndex;
                } else if (curSwing.price > prevSwing?.price) {
                    toDeleteIndex = i;
                    setIndex = lastSwingIndex;
                }
            }
            // Обновляем хай
            if (toDeleteIndex) {
                swings[toDeleteIndex] = null;
            }
        }
        updateLastSwingIndex(setIndex);
    }
}

export const tradinghubCalculateSwings = (candles: HistoryObject[], oneIteration: boolean = false) => {
    const swings: (Swing | null)[] = new Array(candles.length).fill(null);

    // Тупо первая точка
    if (candles.length) {
        swings[0] = new Swing({
            side: 'high',
            time: candles[0].time,
            price: candles[0].high,
            index: 0
        });
    }

    let prevCandleIndex = 0
    let lastSwingIndex = -1;
    const processingSwings = new Map<number, {
        currentCandle: HistoryObject,
        nextIndex: number,
        status: 'draft' | 'nextIndex'
    }>();
    for (let rootIndex = 1; rootIndex < candles.length - 1; rootIndex++) {
        if (oneIteration) {
            // Если текущая свечка внутренняя для предыдущей - идем дальше
            if (isInsideBar(candles[rootIndex - 1], candles[rootIndex])) {
                continue;
            }
            // Если текущая свечка не внутренняя - начинаем поиск свинга
            processingSwings.set(rootIndex, {
                currentCandle: candles[rootIndex],
                nextIndex: rootIndex + 1,
                status: 'draft'
            });

            for (let i = 0; i < processingSwings.size; i++) {
                const [processingIndex, sw] = Array.from(processingSwings)[i];
                // }
                // processingSwings.forEach((sw, processingIndex) => {
                let prevCandle = candles[processingIndex - 1];
                let {
                    currentCandle,
                    nextIndex,
                    status
                } = sw;
                let nextCandle = candles[nextIndex]
                if (status === 'draft' && !isInsideBar(currentCandle, nextCandle)) {
                    status = 'nextIndex';
                } else {
                    nextIndex = rootIndex + 1;
                }
                processingSwings.set(processingIndex, {
                    ...sw,
                    nextIndex,
                    status
                });

                if (status === 'draft') {
                    break;
                }

                let diff = nextIndex - processingIndex - 1;
                nextCandle = candles[nextIndex]

                tryCalculatePullback(processingIndex, 'high', diff, prevCandle, currentCandle, nextCandle, swings);
                tryCalculatePullback(processingIndex, 'low', diff, prevCandle, currentCandle, nextCandle, swings);

                const updateLast = newIndex => {
                    // console.log(`lastSwingIndex: ${lastSwingIndex} --> newIndex: ${newIndex}`)
                    lastSwingIndex = newIndex
                }

                // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
                filterDoubleSwings(processingIndex, lastSwingIndex, updateLast, swings);

                processingSwings.delete(processingIndex);
            }
        } else {
            let prevCandle = candles[prevCandleIndex];
            const currentCandle = candles[rootIndex];
            if (isInsideBar(prevCandle, currentCandle)) {
                continue;
            }
            let nextIndex = rootIndex + 1;
            let nextCandle = candles[nextIndex];
            // TODO в методичке этого нет. После текущего свипа для подтверждения нужно дождаться пока какая-либо свеча пересвипнет текущую.
            for (; nextIndex < candles.length - 1; nextIndex++) {
                nextCandle = candles[nextIndex]
                if (!isInsideBar(currentCandle, nextCandle)) {
                    break;
                }
            }
            let diff = nextIndex - rootIndex - 1;
            nextCandle = candles[nextIndex]

            tryCalculatePullback(rootIndex, 'high', diff, prevCandle, currentCandle, nextCandle, swings);
            tryCalculatePullback(rootIndex, 'low', diff, prevCandle, currentCandle, nextCandle, swings);

            // фильтруем вершины подряд
            filterDoubleSwings(rootIndex, lastSwingIndex, newIndex => lastSwingIndex = newIndex, swings);

            prevCandleIndex = rootIndex;
            rootIndex += diff;
        }
    }

    return swings;
}

export interface Trend {
    time: number;
    trend: number;
    index: number;
}

export const deleteEmptySwings = (swings: Swing[]) => {
    for (let i = 0; i < swings.length; i++) {
        if (!swings[i]?.isExtremum) {
            swings[i] = null;
            continue;
        }
    }

    return swings;
}

const deleteInternalOneIt = (i: number, type: 'high' | 'low', candles: HistoryObject[], swings: Swing[], preLastIndexMap: Record<'high' | 'low', number>, deletedSwingIndexes: Set<number>) => {

    const funcMap: Record<'high' | 'low', Function> = {
        high: lowestBy,
        low: highestBy
    }

    const crossType = type === 'high' ? 'low' : 'high';

    const condition = type === 'high' ?
        // Если произошел пересвип хая, ищем между точками лойный лой
        swings[preLastIndexMap[type]]?.price < candles[i].high
        // Если произошел пересвип лоя, ищем между точками хайный хай
        : swings[preLastIndexMap[type]]?.price > candles[i].low;

    // Если произошел пересвип хая, ищем между точками лойный лой
    if (condition) {
        const batch = swings.slice(preLastIndexMap[type] + 1, i);
        const lowestSwing = funcMap[type](batch, 'price');

        // Удаляем все лои которые не лойный лой
        batch
            .filter(idx => idx && idx?.index !== lowestSwing?.index)
            .forEach(idx => {
                swings[idx.index].unmarkExtremum()
                deletedSwingIndexes.add(idx.index);
            })

        preLastIndexMap[crossType] = lowestSwing?.index;
        preLastIndexMap[type] = null;
    }
}

const updateExtremumOneIt = (i: number, type: 'high' | 'low', swings: Swing[], preLastIndexMap: Record<'high' | 'low', number>) => {
    if(!swings[i]){
        return;
    }

    const condition = !preLastIndexMap[type] || (type === 'high' ?
        // updateHighest
        swings[preLastIndexMap[type]].price < swings[i].price
        // updateLowest
        : swings[preLastIndexMap[type]].price > swings[i].price)
    if (swings[i].side === type && swings[i].isExtremum && condition) {
        preLastIndexMap[type] = i;
    }
}

export const deleteInternalStructure = (swings: Swing[], candles: HistoryObject[], boses: Cross[]) => {

    let preLastIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    let deletedSwingIndexes = new Set([]);
    // Алгоритм такой
    /**
     * Если в рамках первых двух точек я нахожу следующие 2 точки внутренними, то записываю их внутренними до тех пор, пока хотя бы одна точка не станет внешней.
     * Если внешняя точка снизу и вторая точка была тоже снизу - из внутренних ищу самую высокую.
     * Если внешняя точка сверху и вторая точка была тоже сверху - из внутренних ищу самую низкую.
     *
     * Остальные удаляются
     */
    for (let i = 0; i < swings.length; i++) {
        deleteInternalOneIt(i, 'high', candles, swings, preLastIndexMap, deletedSwingIndexes);
        deleteInternalOneIt(i, 'low', candles, swings, preLastIndexMap, deletedSwingIndexes);

        // updateHighest
        updateExtremumOneIt(i, 'high', swings, preLastIndexMap);

        // updateLowest
        updateExtremumOneIt(i, 'low', swings, preLastIndexMap);
    }

    // Удаляем IDM у удаленных LL/HH
    boses = boses.map(b => !deletedSwingIndexes.has(b?.extremum?.index) ? b : null);

    return {swings, boses};
}

export const markHHLL = (candles: HistoryObject[], swings: Swing[]) => {
    let boses: Cross[] = new Array(candles.length).fill(null);

    let lastExtremumMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
        high: null,
        low: null
    }

    let extraExtremumMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
        high: null,
        low: null
    }

    let confirmIndexMap: Record<'high' | 'low', number> = {
        high: -1,
        low: -1
    }

    // Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
    const updateHighestHigh = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'high'
            && (!extraExtremumMap[swing.side] || extraExtremumMap[swing.side].price < swing.price)
            && confirmIndexMap['low'] <= index
        ) {
            if (extraExtremumMap[swing.side]) {
                extraExtremumMap[swing.side].unmarkExtremum();
                if (extraExtremumMap[swing.side].idmSwing)
                    boses[extraExtremumMap[swing.side].idmSwing.index] = null;
            }
            extraExtremumMap[swing.side] = swing;
            extraExtremumMap[swing.side].idmSwing = lastExtremumMap['low'];
        }
    }

    const updateLowestLow = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'low'
            && (!extraExtremumMap[swing.side] || extraExtremumMap[swing.side].price > swing.price)
            && confirmIndexMap['high'] <= index
        ) {
            if (extraExtremumMap[swing.side]) {
                extraExtremumMap[swing.side].unmarkExtremum();
                if (extraExtremumMap[swing.side].idmSwing)
                    boses[extraExtremumMap[swing.side].idmSwing.index] = null;
            }

            extraExtremumMap[swing.side] = swing;
            extraExtremumMap[swing.side].idmSwing = lastExtremumMap['high'];
        }
    }

    const confirmLowestLow = (index: number, isNonConfirmIDM: boolean) => {
        if (extraExtremumMap['low']
            && extraExtremumMap['low'].idmSwing
            && !boses[extraExtremumMap['low'].idmSwing.index]
            && (isNonConfirmIDM || extraExtremumMap['low'].idmSwing.price < candles[index].high)
        ) {
            extraExtremumMap['low'].markExtremum();
            confirmIndexMap['low'] = index;
            const from = extraExtremumMap['low'].idmSwing
            const to = new Swing({index, time: candles[index].time, price: candles[index].close});

            if (isNonConfirmIDM || extraExtremumMap['low'].index !== to.index) {
                boses[from.index] = new Cross({
                    from,
                    to,
                    type: 'high',
                    isIDM: true,
                    getCandles: () => candles,
                    extremum: extraExtremumMap['low'],
                    isConfirmed: !isNonConfirmIDM
                })
            }

            extraExtremumMap['high'] = null;
        }
    }

    const confirmHighestHigh = (index: number, isNonConfirmIDM: boolean) => {
        if (extraExtremumMap['high']
            && extraExtremumMap['high'].idmSwing
            && !boses[extraExtremumMap['high'].idmSwing.index]
            && (isNonConfirmIDM || extraExtremumMap['high'].idmSwing.price > candles[index].low)
        ) {
            extraExtremumMap['high'].markExtremum();
            confirmIndexMap['high'] = index;
            const from = extraExtremumMap['high'].idmSwing
            const to = new Swing({index, time: candles[index].time, price: candles[index].close});

            if (isNonConfirmIDM || extraExtremumMap['high'].index !== to.index) {
                boses[from.index] = new Cross({
                    from,
                    to,
                    type: 'low',
                    isIDM: true,
                    getCandles: () => candles,
                    extremum: extraExtremumMap['high'],
                    isConfirmed: !isNonConfirmIDM
                })
            }

            extraExtremumMap['low'] = null;
        }
    }

    const updateLast = (swing: Swing) => {
        if (swing)
            lastExtremumMap[swing.side] = swing;
    }

    for (let i = 0; i < swings.length; i++) {
        confirmLowestLow(i, i === swings.length - 1)
        confirmHighestHigh(i, i === swings.length - 1);

        updateHighestHigh(i, swings[i]);
        updateLowestLow(i, swings[i]);

        updateLast(swings[i])
    }

    return boses;
}

// Рисует BOS если LL или HH перекрываются
export const drawBOS = (candles: HistoryObject[], swings: Swing[], boses: Cross[], moreBOS: boolean = false, showFake: boolean = false) => {
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

    const updateLastSwing = (i: number, type: 'high' | 'low') => {
        if (swings[i] && swings[i].side === type && swings[i].isExtremum) {
            prelastBosSwingMap[type] = lastBosSwingMap[type];
            lastBosSwingMap[type] = i;

            if (moreBOS) {
                // Если новый бос более хайный (или более лольный) - то удаляем прошлый бос
                if (type === 'high' && swings[prelastBosSwingMap[type]] && swings[lastBosSwingMap[type]].price > swings[prelastBosSwingMap[type]].price) {
                    lastBosSwingMapSet[type].delete(prelastBosSwingMap[type])
                }
                if (type === 'low' && swings[prelastBosSwingMap[type]] && swings[lastBosSwingMap[type]].price < swings[prelastBosSwingMap[type]].price) {
                    lastBosSwingMapSet[type].delete(prelastBosSwingMap[type])
                }

                lastBosSwingMapSet[type].add(lastBosSwingMap[type])
            } else {
                liquidityCandleMap[type] = null;
            }
        }
    }

    const confirmBOS = (i: number, lastBosSwing: number, lastCrossBosSwing: number, type: 'high' | 'low', isLastCandle: boolean) => {
        if (lastBosSwing && (!boses[lastBosSwing] || boses[lastBosSwing].isIDM)) {
            let from = swings[lastBosSwing];
            let liquidityCandle = (moreBOS ? liquidityCandleMapMap[type].get(lastBosSwing) : liquidityCandleMap[type]) ?? candles[lastBosSwing];
            let to: Swing = isLastCandle ? new Swing({index: i, time: candles[i].time, price: candles[i].close}) : null;
            let isConfirmed = false;
            let isSwipedLiquidity = false;

            const isTakenOutLiquidity = hasTakenOutLiquidity(type, liquidityCandle, candles[i]);
            // Если сделали пересвип тенью
            if (isTakenOutLiquidity) {
                if (showFake) {
                    isSwipedLiquidity = true;
                    to = new Swing({index: i, time: candles[i].time, price: candles[i].close});
                }
                const isClose = hasClose(type, liquidityCandle, candles[i]);
                // Если закрылись выше прошлой точки
                if (isClose) {
                    if (!showFake) {
                        to = new Swing({index: i, time: candles[i].time, price: candles[i].close});
                    }
                    isConfirmed = true;
                } else {
                    // Если закрылись ниже а пересвип был - то теперь нужно закрыться выше нового пересвипа
                    if (moreBOS) {
                        liquidityCandleMapMap[type].set(lastBosSwing, candles[i])
                    } else {
                        liquidityCandleMap[type] = candles[i];
                    }

                    if (showFake) {
                        swings[i] = new Swing({
                            side: type,
                            time: candles[i].time,
                            price: candles[i][type],
                            index: i
                        })
                        swings[i].markExtremum();

                        swings[lastBosSwing].unmarkExtremum();
                        deleteIDM.add(lastBosSwing);
                    }
                }
            }

            if (to) {
                boses[lastBosSwing] = new Cross({
                    from,
                    to,
                    type,
                    isBOS: true,
                    isSwipedLiquidity,
                    getCandles: () => candles,
                    extremum: swings[lastCrossBosSwing],
                    isConfirmed
                })

                if (showFake && boses[lastBosSwing].isSwipedLiquidity && boses[lastBosSwing].isConfirmed)
                    boses[lastBosSwing]?.extremum?.unmarkExtremum();

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
            lastBosSwingMapSet['high'].forEach(lastBosSwing => confirmBOS(i, lastBosSwing, lastBosSwingMap['low'], 'high', i === candles.length - 1))
        } else {
            confirmBOS(i, lastBosSwingMap['high'], lastBosSwingMap['low'], 'high', i === candles.length - 1);
        }

        // BOS снизу
        if (moreBOS) {
            lastBosSwingMapSet['low'].forEach(lastBosSwing => confirmBOS(i, lastBosSwing, lastBosSwingMap['high'], 'low', i === candles.length - 1))
        } else {
            confirmBOS(i, lastBosSwingMap['low'], lastBosSwingMap['high'], 'low', i === candles.length - 1);
        }

        updateLastSwing(i, 'high');
        updateLastSwing(i, 'low');
    }

    boses
        .filter(b => b?.type === 'high' && !b?.isIDM)
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
        .filter(b => b?.type === 'low' && !b?.isIDM)
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

    // Удаляем все IDM у которых BOS сформирован
    for (let i = 0; i < boses.length; i++) {
        const b = boses[i];
        if (b?.isConfirmed && b?.isIDM && deleteIDM.has(b?.extremum?.index)) {
            boses[i] = null;
        }
    }

    return boses;
}
export const tradinghubCalculateTrendNew = (swings: Swing[], candles: HistoryObject[], {
    moreBOS, showHiddenSwings, showIFC, showFake
}: THConfig) => {

    let boses = markHHLL(candles, swings)

    if (showIFC)
        swings = markIFC(candles, swings);

    const internal = deleteInternalStructure(swings, candles, boses);
    boses = internal.boses;
    swings = internal.swings;

    if (!showHiddenSwings) {
        swings = deleteEmptySwings(swings);
    }

    boses = drawBOS(candles, swings, boses, moreBOS, showFake);

    const withTrend = drawTrend(candles, swings, boses);
    const trend = withTrend.trend
    boses = withTrend.boses;

    return {trend, boses, swings};
};
const drawTrend = (candles: HistoryObject[], swings: Swing[], boses: Cross[]) => {
    const trend: Trend[] = new Array(candles.length).fill(null);

    let onlyBOSes = boses.filter(bos => swings[bos?.from?.index]?.isExtremum);
    for (let i = 0; i < onlyBOSes.length; i++) {
        const prevBos = onlyBOSes[i - 1];
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        let to = !nextBos ? trend.length : nextBos.to.index;
        if (nextBos && !curBos.isConfirmed && !nextBos.isConfirmed) {
            to = trend.length;
        }

        // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
        if (curBos?.from.index > prevBos?.from.index && curBos?.to.index < prevBos?.to.index) {
            boses[curBos.from.index] = null;
            continue;
        }

        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            trend[j] = {time: candles[j].time, trend: type === 'high' ? 1 : -1, index: i}

            // Удаляем IDM у точек которые являются босами
            if (boses[j]?.isIDM && boses[j]?.type === type) {
                boses[j] = null;
            }
        }

        if (nextBos && curBos.type !== nextBos.type && curBos.to.index < nextBos.to.index) {
            nextBos.markCHoCH()
        }
    }

    onlyBOSes = boses
        .filter(bos => swings[bos?.from?.index]?.isExtremum)
        .sort((a, b) => a.to.index - b.to.index);
    for (let i = 0; i < onlyBOSes.length - 1; i++) {
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
        if (curBos.isConfirmed && nextBos.isConfirmed && curBos.to.index === nextBos.to.index) {
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

export type OrderblockPart = Pick<OrderBlock, 'type' | 'lastOrderblockCandle' | 'lastImbalanceCandle' | 'firstImbalanceIndex' | 'imbalanceIndex' | 'startCandle'>

const isInternalBOS = (leftBos: Cross, rightBos: Cross) => leftBos.from.index < rightBos.from.index
    && leftBos.to.index >= rightBos.to.index
const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;

export const hasHitOB = (ob: OrderBlock, candle: HistoryObject) =>
    (ob.type === 'high'
        && ob.startCandle.low <= candle.high
    )
    || (ob.type === 'low'
        // Если был прокол
        && ob.startCandle.high >= candle.low
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

const highestBy = <T>(batch: T[], key: keyof T) => batch.reduce((acc, idx, i) => {
    if (!acc && idx) {
        acc = idx;
    } else if (idx && acc[key] < idx[key]) {
        acc = idx;
    }
    return acc;
}, batch[0])

const lowestBy = <T>(batch: T[], key: keyof T) => batch.reduce((acc, idx, i) => {
    if (!acc && idx) {
        acc = idx;
    } else if (idx && acc[key] > idx[key]) {
        acc = idx;
    }
    return acc;
}, batch[0])

export enum Side {
    Buy = 'buy',
    Sell = 'sell',
}

export type CandleWithSide = HistoryObject & { side: Side };

export const filterNearOrderblock = (orderBlocks: OrderBlock[], currentCandle: HistoryObject) => orderBlocks.filter(({
                                                                                                                         startCandle: {
                                                                                                                             high,
                                                                                                                             low
                                                                                                                         },
                                                                                                                         type
                                                                                                                     }) =>
    hasNear(
        true,
        {high, low, side: type === 'high' ? Side.Sell : Side.Buy} as any,
        currentCandle,
    ),
)
    .filter(ob => ob.type === 'high' ? currentCandle.high < ob.startCandle.high : currentCandle.low > ob.startCandle.low)
    .sort((a, b) => {
        const aDiff = a.type === 'high' ? a.startCandle.low - currentCandle.high : currentCandle.low - a.startCandle.high;
        const bDiff = b.type === 'high' ? b.startCandle.low - currentCandle.high : currentCandle.low - b.startCandle.high;

        return aDiff - bDiff;
    })
    .slice(0, 1)

export const hasNear = (
    isNear: boolean,
    {high, low, side}: CandleWithSide,
    currentCandle: HistoryObject,
) => {
    if (!isNear) {
        return true;
    }

    // Близость к цене 0.7%
    const price = 1.007;

    if (side === Side.Sell && low / currentCandle.high <= price) {
        return true;
    }
    if (side === Side.Buy && currentCandle.low / high <= price) {
        return true;
    }

    return false;
};