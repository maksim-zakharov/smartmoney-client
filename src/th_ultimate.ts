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
    /**
     * class StateManager(){
     *     swings: Swing[] = [];
     *     bosses: Cross[] = [];
     *     trends: Trend[] = [];
     *     orderBlocks: Orderblock[] = [];
     *
     *     _config: THConfig = {};
     *
     *     readonly candles: HistoryObject[] = [];
     *
     *      constructor(candles: HistoryObject[], config: THConfig){
     *          Object.assign(this._config, config);
     *          this.candles = candles;
     *      }
     *
     *     calculate() {
     *     for (let i = 0; i < this.candles.length; i++) {
     *      this.calculateSwings(i, candles);
     *      this.calculateStructure(i, candles);
     *      this.calculateTrend(i, candles);
     *      this.calculateOB(i, candles);
     *     }
     *     }
     * }
     *
     *     const manager = new StateManager(candles, config);
     *
     *     manager.calculate();
     *
     *     return manager.orderBlocks;
     */
    const manager = new StateManager(data);
        // <-- Копировать в робота
    tradinghubCalculateSwings(manager, oneIteration);

    const {
        trend,
        boses,
        swings: thSwings,
    } = tradinghubCalculateTrendNew(manager, data, {moreBOS, showHiddenSwings, showFake, showIFC});
    manager.swings = thSwings;

    // Копировать в робота -->
    let orderBlocks = calculateOB(
        manager.swings,
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

    return {swings: manager.swings, trend, boses, orderBlocks};
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

export const tradinghubCalculateSwings = (manager: StateManager, oneIteration: boolean = false) => {

    // Тупо первая точка
    if (manager.candles.length) {
        manager.swings[0] = new Swing({
            side: 'high',
            time: manager.candles[0].time,
            price: manager.candles[0].high,
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
    for (let rootIndex = 1; rootIndex < manager.candles.length - 1; rootIndex++) {
        if (oneIteration) {
            // Если текущая свечка внутренняя для предыдущей - идем дальше
            if (isInsideBar(manager.candles[rootIndex - 1], manager.candles[rootIndex])) {
                continue;
            }
            // Если текущая свечка не внутренняя - начинаем поиск свинга
            processingSwings.set(rootIndex, {
                currentCandle: manager.candles[rootIndex],
                nextIndex: rootIndex + 1,
                status: 'draft'
            });

            for (let i = 0; i < processingSwings.size; i++) {
                const [processingIndex, sw] = Array.from(processingSwings)[i];
                // }
                // processingSwings.forEach((sw, processingIndex) => {
                let prevCandle = manager.candles[processingIndex - 1];
                let {
                    currentCandle,
                    nextIndex,
                    status
                } = sw;
                let nextCandle = manager.candles[nextIndex]
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
                nextCandle = manager.candles[nextIndex]

                tryCalculatePullback(processingIndex, 'high', diff, prevCandle, currentCandle, nextCandle, manager.swings);
                tryCalculatePullback(processingIndex, 'low', diff, prevCandle, currentCandle, nextCandle, manager.swings);

                const updateLast = newIndex => {
                    // console.log(`lastSwingIndex: ${lastSwingIndex} --> newIndex: ${newIndex}`)
                    lastSwingIndex = newIndex
                }

                // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
                filterDoubleSwings(processingIndex, lastSwingIndex, updateLast, manager.swings);

                processingSwings.delete(processingIndex);
            }
        } else {
            let prevCandle = manager.candles[prevCandleIndex];
            const currentCandle = manager.candles[rootIndex];
            if (isInsideBar(prevCandle, currentCandle)) {
                continue;
            }
            let nextIndex = rootIndex + 1;
            let nextCandle = manager.candles[nextIndex];
            // TODO в методичке этого нет. После текущего свипа для подтверждения нужно дождаться пока какая-либо свеча пересвипнет текущую.
            for (; nextIndex < manager.candles.length - 1; nextIndex++) {
                nextCandle = manager.candles[nextIndex]
                if (!isInsideBar(currentCandle, nextCandle)) {
                    break;
                }
            }
            let diff = nextIndex - rootIndex - 1;
            nextCandle = manager.candles[nextIndex]

            tryCalculatePullback(rootIndex, 'high', diff, prevCandle, currentCandle, nextCandle, manager.swings);
            tryCalculatePullback(rootIndex, 'low', diff, prevCandle, currentCandle, nextCandle, manager.swings);

            // фильтруем вершины подряд
            filterDoubleSwings(rootIndex, lastSwingIndex, newIndex => lastSwingIndex = newIndex, manager.swings);

            prevCandleIndex = rootIndex;
            rootIndex += diff;
        }
    }
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

const deleteInternalOneIt = (i: number, type: 'high' | 'low', candles: HistoryObject[], swings: Swing[], manager: StateManager) => {

    const funcMap: Record<'high' | 'low', Function> = {
        high: lowestBy,
        low: highestBy
    }

    const crossType = type === 'high' ? 'low' : 'high';

    const condition = type === 'high' ?
        // Если произошел пересвип хая, ищем между точками лойный лой
        swings[manager.preLastIndexMap[type]]?.price < candles[i].high
        // Если произошел пересвип лоя, ищем между точками хайный хай
        : swings[manager.preLastIndexMap[type]]?.price > candles[i].low;

    // Если произошел пересвип хая, ищем между точками лойный лой
    if (condition) {
        const batch = swings.slice(manager.preLastIndexMap[type] + 1, i);
        const lowestSwing = funcMap[type](batch, 'price');

        // Удаляем все лои которые не лойный лой
        batch
            .filter(idx => idx && idx?.index !== lowestSwing?.index)
            .forEach(idx => {
                swings[idx.index].unmarkExtremum()
                manager.deletedSwingIndexes.add(idx.index);
            })

        manager.preLastIndexMap[crossType] = lowestSwing?.index;
        manager.preLastIndexMap[type] = null;
    }
}

const updateExtremumOneIt = (i: number, type: 'high' | 'low', swings: Swing[], manager: StateManager) => {
    if (!swings[i]) {
        return;
    }

    const condition = !manager.preLastIndexMap[type] || (type === 'high' ?
        // updateHighest
        swings[manager.preLastIndexMap[type]].price < swings[i].price
        // updateLowest
        : swings[manager.preLastIndexMap[type]].price > swings[i].price)
    if (swings[i].side === type && swings[i].isExtremum && condition) {
        manager.preLastIndexMap[type] = i;
    }
}

export class StateManager {
    candles: HistoryObject[] = [];
    swings: (Swing | null)[] = [];
    boses: Cross[] = [];
    trend: Trend[] = [];

    // deleteInternalStructure
    preLastIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }
    deletedSwingIndexes = new Set([]);

    // markHHLL
    lastExtremumMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
        high: null,
        low: null
    }
    extraExtremumMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
        high: null,
        low: null
    }
    confirmIndexMap: Record<'high' | 'low', number> = {
        high: -1,
        low: -1
    }

    // drawBOS
    liquidityCandleMap: Record<'high' | 'low', HistoryObject> = {
        high: null,
        low: null
    }
    prelastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }
    lastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }
    deleteIDM = new Set<number>([]);
    lastBosSwingMapSet: Record<'high' | 'low', Set<number>> = {
        high: new Set<number>([]),
        low: new Set<number>([])
    }
    liquidityCandleMapMap: Record<'high' | 'low', Map<number, HistoryObject>> = {
        high: new Map<number, HistoryObject>([]),
        low: new Map<number, HistoryObject>([])
    }

    constructor(candles: HistoryObject[]) {
        this.candles = candles;
        this.trend = new Array(candles.length).fill(null)
        this.swings = new Array(candles.length).fill(null);
        this.boses = new Array(candles.length).fill(null);
    }
}

export const deleteInternalStructure = (swings: Swing[], candles: HistoryObject[], boses: Cross[]) => {

    const manager = new StateManager(candles);
    // Алгоритм такой
    /**
     * Если в рамках первых двух точек я нахожу следующие 2 точки внутренними, то записываю их внутренними до тех пор, пока хотя бы одна точка не станет внешней.
     * Если внешняя точка снизу и вторая точка была тоже снизу - из внутренних ищу самую высокую.
     * Если внешняя точка сверху и вторая точка была тоже сверху - из внутренних ищу самую низкую.
     *
     * Остальные удаляются
     */
    for (let i = 0; i < swings.length; i++) {
        deleteInternalOneIt(i, 'high', candles, swings, manager);
        deleteInternalOneIt(i, 'low', candles, swings, manager);

        // updateHighest
        updateExtremumOneIt(i, 'high', swings, manager);

        // updateLowest
        updateExtremumOneIt(i, 'low', swings, manager);
    }

    // Удаляем IDM у удаленных LL/HH
    boses = boses.map(b => !manager.deletedSwingIndexes.has(b?.extremum?.index) ? b : null);

    return {swings, boses};
}

export const markHHLL = (manager: StateManager) => {
    // Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
    const updateHighestHigh = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'high'
            && (!manager.extraExtremumMap[swing.side] || manager.extraExtremumMap[swing.side].price < swing.price)
            && manager.confirmIndexMap['low'] <= index
        ) {
            if (manager.extraExtremumMap[swing.side]) {
                manager.extraExtremumMap[swing.side].unmarkExtremum();
                if (manager.extraExtremumMap[swing.side].idmSwing)
                    manager.boses[manager.extraExtremumMap[swing.side].idmSwing.index] = null;
            }
            manager.extraExtremumMap[swing.side] = swing;
            manager.extraExtremumMap[swing.side].idmSwing = manager.lastExtremumMap['low'];
        }
    }

    const updateLowestLow = (index: number, swing: Swing) => {
        if (swing
            && swing.side === 'low'
            && (!manager.extraExtremumMap[swing.side] || manager.extraExtremumMap[swing.side].price > swing.price)
            && manager.confirmIndexMap['high'] <= index
        ) {
            if (manager.extraExtremumMap[swing.side]) {
                manager.extraExtremumMap[swing.side].unmarkExtremum();
                if (manager.extraExtremumMap[swing.side].idmSwing)
                    manager.boses[manager.extraExtremumMap[swing.side].idmSwing.index] = null;
            }

            manager.extraExtremumMap[swing.side] = swing;
            manager.extraExtremumMap[swing.side].idmSwing = manager.lastExtremumMap['high'];
        }
    }

    const confirmLowestLow = (index: number, isNonConfirmIDM: boolean) => {
        if (manager.extraExtremumMap['low']
            && manager.extraExtremumMap['low'].idmSwing
            && !manager.boses[manager.extraExtremumMap['low'].idmSwing.index]
            && (isNonConfirmIDM || manager.extraExtremumMap['low'].idmSwing.price < manager.candles[index].high)
        ) {
            manager.extraExtremumMap['low'].markExtremum();
            manager.confirmIndexMap['low'] = index;
            const from = manager.extraExtremumMap['low'].idmSwing
            const to = new Swing({index, time: manager.candles[index].time, price: manager.candles[index].close});

            if (isNonConfirmIDM || manager.extraExtremumMap['low'].index !== to.index) {
                manager.boses[from.index] = new Cross({
                    from,
                    to,
                    type: 'high',
                    isIDM: true,
                    getCandles: () => manager.candles,
                    extremum: manager.extraExtremumMap['low'],
                    isConfirmed: !isNonConfirmIDM
                })
            }

            manager.extraExtremumMap['high'] = null;
        }
    }

    const confirmHighestHigh = (index: number, isNonConfirmIDM: boolean) => {
        if (manager.extraExtremumMap['high']
            && manager.extraExtremumMap['high'].idmSwing
            && !manager.boses[manager.extraExtremumMap['high'].idmSwing.index]
            && (isNonConfirmIDM || manager.extraExtremumMap['high'].idmSwing.price > manager.candles[index].low)
        ) {
            manager.extraExtremumMap['high'].markExtremum();
            manager.confirmIndexMap['high'] = index;
            const from = manager.extraExtremumMap['high'].idmSwing
            const to = new Swing({index, time: manager.candles[index].time, price: manager.candles[index].close});

            if (isNonConfirmIDM || manager.extraExtremumMap['high'].index !== to.index) {
                manager.boses[from.index] = new Cross({
                    from,
                    to,
                    type: 'low',
                    isIDM: true,
                    getCandles: () => manager.candles,
                    extremum: manager.extraExtremumMap['high'],
                    isConfirmed: !isNonConfirmIDM
                })
            }

            manager.extraExtremumMap['low'] = null;
        }
    }

    const updateLast = (swing: Swing) => {
        if (swing)
            manager.lastExtremumMap[swing.side] = swing;
    }

    for (let i = 0; i < manager.swings.length; i++) {
        confirmLowestLow(i, i === manager.swings.length - 1)
        confirmHighestHigh(i, i === manager.swings.length - 1);

        updateHighestHigh(i, manager.swings[i]);
        updateLowestLow(i, manager.swings[i]);

        updateLast(manager.swings[i])
    }

    return manager.boses;
}

const updateLastSwing = (i: number, type: 'high' | 'low', swings: Swing[]
    , manager: StateManager,
                         moreBOS: boolean = false
) => {
    if (swings[i] && swings[i].side === type && swings[i].isExtremum) {
        manager.prelastBosSwingMap[type] = manager.lastBosSwingMap[type];
        manager.lastBosSwingMap[type] = i;

        if (moreBOS) {
            // Если новый бос более хайный (или более лольный) - то удаляем прошлый бос
            if (type === 'high' && swings[manager.prelastBosSwingMap[type]] && swings[manager.lastBosSwingMap[type]].price > swings[manager.prelastBosSwingMap[type]].price) {
                manager.lastBosSwingMapSet[type].delete(manager.prelastBosSwingMap[type])
            }
            if (type === 'low' && swings[manager.prelastBosSwingMap[type]] && swings[manager.lastBosSwingMap[type]].price < swings[manager.prelastBosSwingMap[type]].price) {
                manager.lastBosSwingMapSet[type].delete(manager.prelastBosSwingMap[type])
            }

            manager.lastBosSwingMapSet[type].add(manager.lastBosSwingMap[type])
        } else {
            manager.liquidityCandleMap[type] = null;
        }
    }
}

const confirmBOS = (i: number, type: 'high' | 'low',
                    candles: HistoryObject[],
                    swings: Swing[],
                    boses: Cross[],
                    lastBosSwing: number,
                    lastCrossBosSwing: number,
                    isLastCandle: boolean,
                    manager: StateManager,
                    moreBOS: boolean = false,
                    showFake: boolean = false
) => {
    if (lastBosSwing && (!boses[lastBosSwing] || boses[lastBosSwing].isIDM)) {
        let from = swings[lastBosSwing];
        let liquidityCandle = (moreBOS ? manager.liquidityCandleMapMap[type].get(lastBosSwing) : manager.liquidityCandleMap[type]) ?? candles[lastBosSwing];
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
                    manager.liquidityCandleMapMap[type].set(lastBosSwing, candles[i])
                } else {
                    manager.liquidityCandleMap[type] = candles[i];
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
                    manager.deleteIDM.add(lastBosSwing);
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

            manager.deleteIDM.add(lastCrossBosSwing);

            if (moreBOS) {
                manager.lastBosSwingMapSet[type].delete(lastBosSwing)
            }

            if (moreBOS) {
                manager.liquidityCandleMapMap[type].delete(lastBosSwing)
            } else {
                manager.liquidityCandleMap[type] = null;
            }
        }
    }
}
const hasTakenOutLiquidity = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.high : bossCandle.low > currentCandle.low;

const hasClose = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.close : bossCandle.low > currentCandle.close;

// Рисует BOS если LL или HH перекрываются
export const drawBOS = (candles: HistoryObject[], swings: Swing[], boses: Cross[], moreBOS: boolean = false, showFake: boolean = false) => {

    const manager = new StateManager(candles);

    for (let i = 0; i < candles.length; i++) {
        // TODO Хз надо ли, выглядит ок но финрез хуже
        // Если сужение - удаляем внутренние босы
        if (
            swings[manager.prelastBosSwingMap['high']]?.price > swings[manager.lastBosSwingMap['high']]?.price
            && swings[manager.prelastBosSwingMap['low']]?.price < swings[manager.lastBosSwingMap['low']]?.price
        ) {
            if (!moreBOS) {
                swings[manager.lastBosSwingMap['low']] = null;
                swings[manager.lastBosSwingMap['high']] = null;
            } else {
                manager.lastBosSwingMapSet['low'].delete(manager.lastBosSwingMap['low'])
                manager.lastBosSwingMapSet['high'].delete(manager.lastBosSwingMap['high'])

                manager.liquidityCandleMapMap['low'].delete(manager.lastBosSwingMap['low'])
                manager.liquidityCandleMapMap['high'].delete(manager.lastBosSwingMap['high'])
            }

            manager.deleteIDM.add(manager.lastBosSwingMap['low']);
            manager.deleteIDM.add(manager.lastBosSwingMap['high']);

            manager.lastBosSwingMap['low'] = manager.prelastBosSwingMap['low'];
            manager.lastBosSwingMap['high'] = manager.prelastBosSwingMap['high'];
            continue;
        }

        // BOS сверху
        if (moreBOS) {
            manager.lastBosSwingMapSet['high'].forEach(lastBosSwing => confirmBOS(i, 'high', candles, swings, boses, lastBosSwing, manager.lastBosSwingMap['low'], i === candles.length - 1, manager, moreBOS, showFake))
        } else {
            confirmBOS(i, 'high', candles, swings, boses, manager.lastBosSwingMap['high'], manager.lastBosSwingMap['low'], i === candles.length - 1, manager, moreBOS, showFake);
        }

        // BOS снизу
        if (moreBOS) {
            manager.lastBosSwingMapSet['low'].forEach(lastBosSwing => confirmBOS(i, 'low', candles, swings, boses, lastBosSwing, manager.lastBosSwingMap['high'], i === candles.length - 1, manager, moreBOS, showFake))
        } else {
            confirmBOS(i, 'low', candles, swings, boses, manager.lastBosSwingMap['low'], manager.lastBosSwingMap['high'], i === candles.length - 1, manager, moreBOS, showFake);
        }

        updateLastSwing(i, 'high', swings, manager, moreBOS);
        updateLastSwing(i, 'low', swings, manager, moreBOS);
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
        if (b?.isConfirmed && b?.isIDM && manager.deleteIDM.has(b?.extremum?.index)) {
            boses[i] = null;
        }
    }

    return boses;
}
export const tradinghubCalculateTrendNew = (manager: StateManager, candles: HistoryObject[], {
    moreBOS, showHiddenSwings, showIFC, showFake
}: THConfig) => {

    let boses = markHHLL(manager)

    if (showIFC)
        manager.swings = markIFC(candles, manager.swings);

    const internal = deleteInternalStructure(manager.swings, candles, boses);
    boses = internal.boses;
    manager.swings = internal.swings;

    if (!showHiddenSwings) {
        manager.swings = deleteEmptySwings(manager.swings);
    }

    boses = drawBOS(candles, manager.swings, boses, moreBOS, showFake);

    const withTrend = drawTrend(candles, manager.swings, boses);
    const trend = withTrend.trend
    boses = withTrend.boses;

    return {trend, boses, swings: manager.swings};
};
const drawTrend = (candles: HistoryObject[], swings: Swing[], boses: Cross[]) => {
    const manager = new StateManager(candles);

    let onlyBOSes = boses.filter(bos => swings[bos?.from?.index]?.isExtremum);
    for (let i = 0; i < onlyBOSes.length; i++) {
        const prevBos = onlyBOSes[i - 1];
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        let to = !nextBos ? manager.trend.length : nextBos.to.index;
        if (nextBos && !curBos.isConfirmed && !nextBos.isConfirmed) {
            to = manager.trend.length;
        }

        // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
        if (curBos?.from.index > prevBos?.from.index && curBos?.to.index < prevBos?.to.index) {
            boses[curBos.from.index] = null;
            continue;
        }

        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            manager.trend[j] = {time: candles[j].time, trend: type === 'high' ? 1 : -1, index: i}

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

    return {trend: manager.trend, boses};
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