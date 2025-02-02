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
export const calculateOB = (manager: StateManager, withMove: boolean = false, newSMT: boolean = false, showFake: boolean = false) => {
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

    for (let i = 0; i < manager.swings.length; i++) {
        const candle = manager.candles[i];
        const trend = manager.trend[i];
        const swing = manager.swings[i];
        const index = swing?.index

        if (manager.boses[i]?.isIDM) {
            lastIDMIndexMap[manager.boses[i]?.type] = i;
        }

        if (swing?.isExtremum) {
            lastExtremumIndexMap[swing.side] = i;
        }

        if (swing) {
            // Здесь по идее нужно создавать "задачу" на поиск ордерблока.
            // И итерироваться в дальшейшем по всем задачам чтобы понять, ордерблок можно создать или пора задачу удалить.
            nonConfirmsOrderblocks.set(swing.time, {
                swing,
                firstCandle: manager.candles[index],
                firstImbalanceIndex: index,
                status: 'draft',
                // Тейк профит до ближайшего максимума
                takeProfit: swing.side === 'high' ? manager.swings[lastExtremumIndexMap['low']]?.price : manager.swings[lastExtremumIndexMap['high']]?.price
            })
        }

        // В этом блоке создаем все ОБ
        // Если есть хотя бы 3 свечки
        if (i >= 2) {
            nonConfirmsOrderblocks.forEach((orderblock, time) => {
                let {swing, firstCandle, firstImbalanceIndex, status, takeProfit, lastImbalanceIndex} = orderblock;
                // Сначала ищем индекс свечки с которой будем искать имбаланс.
                // Для этого нужно проверить что следующая свеча после исследуемой - не является внутренней.
                if (status === 'draft' && firstImbalanceIndex < i && !isInsideBar(firstCandle, manager.candles[i])) {
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

                if (firstImbIndex <= i && isImbalance(manager.candles[firstImbalanceIndex], manager.candles[i])) {
                    if (withMove) {
                        firstCandle = manager.candles[firstImbIndex];
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

                const lastImbalanceCandle = manager.candles[lastImbalanceIndex];
                const lastOrderblockCandle = manager.candles[firstImbalanceIndex];

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
                    const hasBoss = Boolean(manager.boses[bossIndex]) && (!showFake || manager.boses[bossIndex].isConfirmed);

                    manager.orderblocks[swing.index] = new OrderBlock({
                        ...orderBlock,
                        isSMT: !newSMT && (hasBoss || (lastIDMIndex
                            && manager.boses[lastIDMIndex].from.index <= i
                            && manager.boses[lastIDMIndex].to.index > i)),
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
                const obItem = manager.orderblocks[obIdx];
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;

                const idmType = obItem.type;
                if (lastIDMIndexMap[idmType] && lastIDMIndexMap[idmType] <= i && obItem.index >= lastIDMIndexMap[idmType]) {
                    obItem.isSMT = true;
                    obItem.canTrade = false;
                }
                if (manager.boses[lastIDMIndexMap[idmType]]?.isConfirmed && lastIDMIndexMap[idmType] && manager.boses[lastIDMIndexMap[idmType]].to?.index - 1 <= i) {
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

            if (lastIDMIndexMap['high'] && manager.boses[lastIDMIndexMap['high']].to?.index - 1 === i) {
                lastIDMIndexMap['high'] = null;
            }

            if (lastIDMIndexMap['low'] && manager.boses[lastIDMIndexMap['low']].to?.index - 1 === i) {
                lastIDMIndexMap['low'] = null;
            }
        }
    }

    if (!newSMT) {
        // Где начинается позиция TODO для теста, в реальности это точка входа
        for (let i = 0; i < manager.orderblocks.length; i++) {
            const obItem = manager.orderblocks[i];
            if (!obItem) {
                continue;
            }
            const startPositionIndex = obItem.index + obItem.imbalanceIndex;
            for (let j = startPositionIndex; j < manager.candles.length - 1; j++) {
                const candle = manager.candles[j];

                if (hasHitOB(obItem, candle)) {
                    obItem.endCandle = candle;
                    obItem.endIndex = j
                    obItem.canTrade = true;
                    break;
                }
            }
        }
    }

    return manager.orderblocks.map((ob, index) => {
        // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
        const obStartIndex = ob?.index;
        const obIndex = ob?.endIndex || index;
        const startTrend = manager.trend[obStartIndex]?.trend;
        const trend = manager.trend[obIndex]?.trend;
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
    if(oneIteration){
        manager.calculate();
    } else {
        tradinghubCalculateSwings(manager);
    }

    tradinghubCalculateTrendNew(manager, {moreBOS, showHiddenSwings, showFake, showIFC});

    // Копировать в робота -->
    let orderBlocks = calculateOB(
        manager,
        withMove,
        newSMT,
        showFake
    )

    if (byTrend) {
        const currentTrend = manager.trend[manager.trend.length - 1]?.trend === 1 ? 'low' : 'high';
        orderBlocks = orderBlocks.filter(ob => ob?.type === currentTrend);
    }

    return {swings: manager.swings, trend: manager.trend, boses: manager.boses, orderBlocks};
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

export const tradinghubCalculateSwings = (manager: StateManager) => {
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
    for (let rootIndex = 1; rootIndex < manager.candles.length - 1; rootIndex++) {
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

export interface Trend {
    time: number;
    trend: number;
    index: number;
}

export const deleteEmptySwings = (manager: StateManager) => {
    for (let i = 0; i < manager.swings.length; i++) {
        if (!manager.swings[i]?.isExtremum) {
            manager.swings[i] = null;
            continue;
        }
    }
}

const deleteInternalOneIt = (i: number, type: 'high' | 'low', manager: StateManager) => {

    const funcMap: Record<'high' | 'low', Function> = {
        high: lowestBy,
        low: highestBy
    }

    const crossType = type === 'high' ? 'low' : 'high';

    const condition = type === 'high' ?
        // Если произошел пересвип хая, ищем между точками лойный лой
        manager.swings[manager.preLastIndexMap[type]]?.price < manager.candles[i].high
        // Если произошел пересвип лоя, ищем между точками хайный хай
        : manager.swings[manager.preLastIndexMap[type]]?.price > manager.candles[i].low;

    // Если произошел пересвип хая, ищем между точками лойный лой
    if (condition) {
        const batch = manager.swings.slice(manager.preLastIndexMap[type] + 1, i);
        const lowestSwing = funcMap[type](batch, 'price');

        // Удаляем все лои которые не лойный лой
        batch
            .filter(idx => idx && idx?.index !== lowestSwing?.index)
            .forEach(idx => {
                manager.swings[idx.index].unmarkExtremum()
                manager.deletedSwingIndexes.add(idx.index);
            })

        manager.preLastIndexMap[crossType] = lowestSwing?.index;
        manager.preLastIndexMap[type] = null;
    }
}

const updateExtremumOneIt = (i: number, type: 'high' | 'low', manager: StateManager) => {
    if (!manager.swings[i]) {
        return;
    }

    const condition = !manager.preLastIndexMap[type] || (type === 'high' ?
        // updateHighest
        manager.swings[manager.preLastIndexMap[type]].price < manager.swings[i].price
        // updateLowest
        : manager.swings[manager.preLastIndexMap[type]].price > manager.swings[i].price)
    if (manager.swings[i].side === type && manager.swings[i].isExtremum && condition) {
        manager.preLastIndexMap[type] = i;
    }
}

export class StateManager {
    candles: HistoryObject[] = [];
    swings: (Swing | null)[] = [];
    boses: Cross[] = [];
    trend: Trend[] = [];
    orderblocks: OrderBlock[] = [];

    // tradinghubCalculateSwings
    lastSwingIndex: number = -1;
    processingSwings = new Map<number, {
        currentCandle: HistoryObject,
        nextIndex: number,
        status: 'draft' | 'nextIndex'
    }>()

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
        this.swings = new Array(candles.length).fill(null);
        this.boses = new Array(candles.length).fill(null);
        this.trend = new Array(candles.length).fill(null)
        this.orderblocks = new Array(candles.length).fill(null)
    }

    calculate() {
        for (let i = 0; i < this.candles.length; i++) {
            this.calculateSwings(i);
        }
    }

    calculateSwings(rootIndex: number) {
        // Тупо первая точка
        if (rootIndex === 0 && this.candles.length) {
            this.swings[0] = new Swing({
                side: 'high',
                time: this.candles[0].time,
                price: this.candles[0].high,
                index: 0
            });
            return;
        }

        // Если текущая свечка внутренняя для предыдущей - идем дальше
        if (isInsideBar(this.candles[rootIndex - 1], this.candles[rootIndex])) {
            return;
        }
        // Если текущая свечка не внутренняя - начинаем поиск свинга
        this.processingSwings.set(rootIndex, {
            currentCandle: this.candles[rootIndex],
            nextIndex: rootIndex + 1,
            status: 'draft'
        });

        for (let i = 0; i < this.processingSwings.size; i++) {
            const [processingIndex, sw] = Array.from(this.processingSwings)[i];
            // }
            // processingSwings.forEach((sw, processingIndex) => {
            let prevCandle = this.candles[processingIndex - 1];
            let {
                currentCandle,
                nextIndex,
                status
            } = sw;
            let nextCandle = this.candles[nextIndex]

            if (!nextCandle) {
                break;
            }

            if (status === 'draft' && !isInsideBar(currentCandle, nextCandle)) {
                status = 'nextIndex';
            } else {
                nextIndex = rootIndex + 1;
            }
            this.processingSwings.set(processingIndex, {
                ...sw,
                nextIndex,
                status
            });

            if (status === 'draft') {
                break;
            }

            let diff = nextIndex - processingIndex - 1;
            nextCandle = this.candles[nextIndex]

            tryCalculatePullback(processingIndex, 'high', diff, prevCandle, currentCandle, nextCandle, this.swings);
            tryCalculatePullback(processingIndex, 'low', diff, prevCandle, currentCandle, nextCandle, this.swings);

            const updateLast = newIndex => {
                // console.log(`lastSwingIndex: ${lastSwingIndex} --> newIndex: ${newIndex}`)
                this.lastSwingIndex = newIndex
            }

            // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
            filterDoubleSwings(processingIndex, this.lastSwingIndex, updateLast, this.swings);

            this.processingSwings.delete(processingIndex);
        }
    }
}

export const deleteInternalStructure = (manager: StateManager) => {
    // Алгоритм такой
    /**
     * Если в рамках первых двух точек я нахожу следующие 2 точки внутренними, то записываю их внутренними до тех пор, пока хотя бы одна точка не станет внешней.
     * Если внешняя точка снизу и вторая точка была тоже снизу - из внутренних ищу самую высокую.
     * Если внешняя точка сверху и вторая точка была тоже сверху - из внутренних ищу самую низкую.
     *
     * Остальные удаляются
     */
    for (let i = 0; i < manager.swings.length; i++) {
        deleteInternalOneIt(i, 'high', manager);
        deleteInternalOneIt(i, 'low', manager);

        // updateHighest
        updateExtremumOneIt(i, 'high', manager);

        // updateLowest
        updateExtremumOneIt(i, 'low', manager);
    }

    // Удаляем IDM у удаленных LL/HH
    manager.boses = manager.boses.map(b => !manager.deletedSwingIndexes.has(b?.extremum?.index) ? b : null);
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
export const drawBOS = (manager: StateManager, moreBOS: boolean = false, showFake: boolean = false) => {
    for (let i = 0; i < manager.candles.length; i++) {
        // TODO Хз надо ли, выглядит ок но финрез хуже
        // Если сужение - удаляем внутренние босы
        if (
            manager.swings[manager.prelastBosSwingMap['high']]?.price > manager.swings[manager.lastBosSwingMap['high']]?.price
            && manager.swings[manager.prelastBosSwingMap['low']]?.price < manager.swings[manager.lastBosSwingMap['low']]?.price
        ) {
            if (!moreBOS) {
                manager.swings[manager.lastBosSwingMap['low']] = null;
                manager.swings[manager.lastBosSwingMap['high']] = null;
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
            manager.lastBosSwingMapSet['high'].forEach(lastBosSwing => confirmBOS(i, 'high', manager.candles, manager.swings, manager.boses, lastBosSwing, manager.lastBosSwingMap['low'], i === manager.candles.length - 1, manager, moreBOS, showFake))
        } else {
            confirmBOS(i, 'high', manager.candles, manager.swings, manager.boses, manager.lastBosSwingMap['high'], manager.lastBosSwingMap['low'], i === manager.candles.length - 1, manager, moreBOS, showFake);
        }

        // BOS снизу
        if (moreBOS) {
            manager.lastBosSwingMapSet['low'].forEach(lastBosSwing => confirmBOS(i, 'low', manager.candles, manager.swings, manager.boses, lastBosSwing, manager.lastBosSwingMap['high'], i === manager.candles.length - 1, manager, moreBOS, showFake))
        } else {
            confirmBOS(i, 'low', manager.candles, manager.swings, manager.boses, manager.lastBosSwingMap['low'], manager.lastBosSwingMap['high'], i === manager.candles.length - 1, manager, moreBOS, showFake);
        }

        updateLastSwing(i, 'high', manager.swings, manager, moreBOS);
        updateLastSwing(i, 'low', manager.swings, manager, moreBOS);
    }

    manager.boses
        .filter(b => b?.type === 'high' && !b?.isIDM)
        .sort((a, b) => a.from.price - b.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    manager.boses[curr.from.index] = null;
                    break;
                }
            }
        })

    manager.boses
        .filter(b => b?.type === 'low' && !b?.isIDM)
        .sort((a, b) => b.from.price - a.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    manager.boses[curr.from.index] = null;
                    break;
                }
            }
        })

    // Удаляем все IDM у которых BOS сформирован
    for (let i = 0; i < manager.boses.length; i++) {
        const b = manager.boses[i];
        if (b?.isConfirmed && b?.isIDM && manager.deleteIDM.has(b?.extremum?.index)) {
            manager.boses[i] = null;
        }
    }
}
export const tradinghubCalculateTrendNew = (manager: StateManager, {
    moreBOS, showHiddenSwings, showIFC, showFake
}: THConfig) => {

    markHHLL(manager)

    if (showIFC)
        markIFC(manager);

    deleteInternalStructure(manager);

    if (!showHiddenSwings) {
        deleteEmptySwings(manager);
    }

    drawBOS(manager, moreBOS, showFake);

    drawTrend(manager);
};
const drawTrend = (manager: StateManager) => {
    let onlyBOSes = manager.boses.filter(bos => manager.swings[bos?.from?.index]?.isExtremum);
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
            manager.boses[curBos.from.index] = null;
            continue;
        }

        if(curBos.isConfirmed){
            for (let j = curBos.to.index; j < to; j++) {
                const type = curBos.type;
                manager.trend[j] = {time: manager.candles[j].time, trend: type === 'high' ? 1 : -1, index: i}

                // Удаляем IDM у точек которые являются босами
                if (manager.boses[j]?.isIDM && manager.boses[j]?.type === type) {
                    manager.boses[j] = null;
                }
            }
        }

        if (nextBos && curBos.type !== nextBos.type && curBos.to.index < nextBos.to.index) {
            nextBos.markCHoCH()
        }
    }

    onlyBOSes = manager.boses
        .filter(bos => manager.swings[bos?.from?.index]?.isExtremum)
        .sort((a, b) => a.to.index - b.to.index);
    for (let i = 0; i < onlyBOSes.length - 1; i++) {
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
        if (curBos.isConfirmed && nextBos.isConfirmed && curBos.to.index === nextBos.to.index) {
            manager.boses[nextBos.from.index] = null;
        }
    }
}
const markIFC = (manager: StateManager) => {

    for (let i = 0; i < manager.swings.length; i++) {
        const bos = manager.swings[i];
        if (bos && isIFC(bos.side, manager.candles[bos.index])) {
            bos.isIFC = true
        }
    }
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