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

enum POIType {
    // IDM IFC (свип IDM свечей IFC)
    IDM_IFC = 'IDM_IFC',
    // OB IDM (первый ОБ над IDM)
    OB_IDM = 'OB_IDM',
    // OB IDM IFC (свип OB IDM свечой IFC)
    OB_IDM_IFC = 'OB_IDM_IFC',
    // LQ IFC (свип любого свинга свечой IFC)
    LQ_IFC = 'LQ_IFC',
    // EXT LQ IFC (свип экстремума свечой IFC)
    EXT_LQ_IFC = 'EXT_LQ_IFC',
    // OB EXT (OB На экстремуме)
    OB_EXT = 'OB_EXT',
    // CHOCH IFC (свич чоч свечой IFC)
    CHOCH_IFC = 'CHOCH_IFC',
}

export class POI {
    textTime?: number;
    firstImbalanceIndex: number;
    imbalanceIndex: number;
    lastOrderblockCandle: HistoryObject;
    // Направление: high - рисуем сверху (шорт на отбой), low - рисуем снизу - (лонг на отбой)
    side: 'high' | 'low';
    lastImbalanceCandle: HistoryObject;
    startCandle: HistoryObject;
    // TODO только для теста
    canTrade?: boolean;
    endCandle?: HistoryObject;
    endIndex?: number;
    isSMT?: boolean;
    takeProfit?: number;
    swing: Swing;
    type: POIType;

    constructor(props: Partial<POI>) {
        Object.assign(this, props);
    }

    get index(): number {
        return this.swing.index;
    }

    get time(): number {
        return this.startCandle.time;
    }

    // Все IFC после касания торгуются маркетом. Просто ОБ - лимиткой
    get tradeOrderType(): 'limit' | 'market' {
        switch (this.type) {
            case POIType.CHOCH_IFC:
                return 'market';
            case POIType.IDM_IFC:
                return 'market';
            case POIType.LQ_IFC:
                return 'market';
            case POIType.OB_IDM_IFC:
                return 'market';
            case POIType.EXT_LQ_IFC:
                return 'market';
            case POIType.OB_IDM:
                return 'limit';
            case POIType.OB_EXT:
                return 'limit';
            default:
                return 'limit';
        }
    }

    get text(): string {
        if (this.isSMT)
            return 'SMT';
        if (this.type === POIType.OB_EXT) {
            return 'OB_EXT';
        }
        if (this.type === POIType.OB_IDM) {
            return 'OB_IDM';
        }
        if (this.type === POIType.OB_IDM_IFC) {
            return 'OB_IDM_IFC';
        }
        if (this.type === POIType.LQ_IFC) {
            return 'LQ_IFC';
        }
        if (this.type === POIType.EXT_LQ_IFC) {
            return 'EXT_LQ_IFC';
        }
        if (this.type === POIType.CHOCH_IFC) {
            return 'CHOCH_IFC';
        }
        if (this.type === POIType.IDM_IFC) {
            return 'IDM_IFC';
        }
        if (this.swing.isExtremum)
            return 'Ex OB';
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
/**
 * @deprecated
 * TODO
 * Переписать на calculatePOI
 * Зона POI шире чем ордерблок
 * Варианты по хрустику:
 * - IDM IFC (свип IDM свечей IFC)
 * - OB IDM (первый ОБ над IDM)
 * - OB IDM IFC (свип OB IDM свечой IFC)
 * - LQ IFC (свип любого свинга свечой IFC)
 * - EXT LQ IFC (свип экстремума свечой IFC)
 * - OB EXT (OB На экстремуме)
 * - CHOCH IFC (свич чоч свечой IFC)
 * Хорошо бы на все это тесты написать
 * @param manager
 * @param withMove
 * @param newSMT
 * @param showFake
 */
export const calculatePOI = (manager: StateManager, withMove: boolean = false, newSMT: boolean = false, showFake: boolean = false) => {
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

        // Нужно для определения ближайшей цели для TakeProfit
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

                const orderBlockPart = {
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
                    side: type,
                } as OrderblockPart;

                const lastIDMIndex = lastIDMIndexMap[swing?.side]
                if (orderBlockPart?.side === swing?.side && swing?.isExtremum && !uniqueOrderBlockTimeSet.has(orderBlockPart.startCandle.time)) {
                    // TODO Не торговать ОБ под IDM
                    const bossIndex = orderBlockPart.firstImbalanceIndex + index;
                    const hasBoss = Boolean(manager.boses[bossIndex]) && (!showFake || manager.boses[bossIndex].isConfirmed);

                    const isSMT = !newSMT && (hasBoss || (lastIDMIndex
                        && manager.boses[lastIDMIndex].from.index <= i
                        && manager.boses[lastIDMIndex].to.index > i))

                    let type = POIType.LQ_IFC;
                    if (swing.isExtremum) {
                        type = POIType.OB_EXT;
                    }

                    manager.pois[swing.index] = new POI({
                        ...orderBlockPart,
                        isSMT,
                        swing,
                        canTrade: true,
                        takeProfit,
                        type
                    })
                    obIdxes.add(swing.index);

                    uniqueOrderBlockTimeSet.add(orderBlockPart.startCandle.time);
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
                const obItem = manager.pois[obIdx];
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;

                const idmType = obItem.side;
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

                    if (isIFC(obItem.side, candle) && ![POIType.OB_EXT, POIType.OB_IDM].includes(obItem.type)) {
                        obItem.canTrade = false;
                    }

                    const trendType = trend?.trend === 1 ? 'low' : 'high';
                    if (!trend || trendType !== obItem.side) {
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
        for (let i = 0; i < manager.pois.length; i++) {
            const obItem = manager.pois[i];
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

    return manager.pois.map((ob, index) => {
        // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
        const obStartIndex = ob?.index;
        const obIndex = ob?.endIndex || index;
        const startTrend = manager.trend[obStartIndex]?.trend;
        const trend = manager.trend[obIndex]?.trend;
        if (startTrend !== trend) {
            return null;
        }
        if (trend === 1 && ob?.side === 'low') {
            return ob;
        }
        if (trend === -1 && ob?.side === 'high') {
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
    const manager = new StateManager(data, {oneIteration});
    // <-- Копировать в робота
    manager.calculate();

    tradinghubCalculateTrendNew(manager, {moreBOS, showHiddenSwings, showFake, showIFC, oneIteration});

    // if (oneIteration) {
    //     // Потом переписать в просто calculate
    //     manager.calculateTrend();
    // }

    // const manager1 = new StateManager(data);
    // manager1.calculate();
    // tradinghubCalculateTrendNew(manager1, {moreBOS, showHiddenSwings, showFake, showIFC, oneIteration: false});
    //
    // const manager2 = new StateManager(data);
    // manager2.calculate();
    // tradinghubCalculateTrendNew(manager2, {moreBOS, showHiddenSwings, showFake, showIFC, oneIteration: true});
    // manager2.calculateTrend();
    //
    //
    // console.log('old', manager1.trend)
    // console.log('new', manager2.trend)
    // console.log(JSON.stringify(manager1.trend.slice(0)) === JSON.stringify(manager2.trend.slice(0)))
    // console.log(JSON.stringify(manager1.boses.slice(0)) === JSON.stringify(manager2.boses.slice(0)))

    // Копировать в робота -->
    let orderBlocks = calculatePOI(
        manager,
        withMove,
        newSMT,
        showFake
    )

    if (byTrend) {
        const currentTrend = manager.trend[manager.trend.length - 1]?.trend === 1 ? 'low' : 'high';
        orderBlocks = orderBlocks.filter(ob => ob?.side === currentTrend);
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

export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT

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

    if(!curSwing){
        return;
    }

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

export interface Trend {
    time: number;
    trend: number;
}

/**
 * @deprecated
 * @param manager
 */
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
// Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
const updateExtremum = (manager: StateManager, index: number, side: Swing['side'], swing: Swing) => {
    // Проверяем свинг по выбранной стороне
    if (!swing || swing.side !== side) {
        return;
    }

    const versusSide = side === 'low' ? 'high' : 'low';
    if (manager.confirmIndexMap[versusSide] > index) {
        return;
    }

    const isHighestHigh = !manager.lastExtremumMap[swing.side] || side === 'high' && manager.lastExtremumMap[swing.side].price < swing.price;
    const isLowestLow = !manager.lastExtremumMap[swing.side] || side === 'low' && manager.lastExtremumMap[swing.side].price > swing.price;

    // Здесь проверяем что либо еще нет HH/LL, либо прошлый HH ниже нового или прошлый LL выше нового
    if (!isLowestLow && !isHighestHigh) {
        return;
    }

    // Сначала чистим экстремум. На текущем свинге убираем флаг экстремума
    if (manager.lastExtremumMap[swing.side]) {
        manager.lastExtremumMap[swing.side].unmarkExtremum();
        // Если по нему был IDM - убираем IDM
        if (manager.lastExtremumMap[swing.side].idmSwing)
            manager.boses[manager.lastExtremumMap[swing.side].idmSwing.index] = null;
    }

    // Обновляем новый экстремум и помечаем по нему IDM
    manager.lastExtremumMap[swing.side] = swing;
    if (manager.lastSwingMap[versusSide]) {
        manager.lastExtremumMap[swing.side].idmSwing = manager.lastSwingMap[versusSide];
    }
}

const confirmExtremum = (manager: StateManager, index: number, side: Swing['side'], isNonConfirmIDM: boolean) => {
    const versusSide = side === 'low' ? 'high' : 'low';
    // Если экстремума нет - не смотрим
    if (!manager.lastExtremumMap[side]) {
        return;
    }
    // Экстремум есть но нет IDM - не смотрим
    if (!manager.lastExtremumMap[side].idmSwing) {
        return;
    }

    // Если на месте IDM он уже подтвержден - не смотрим
    if (manager.boses[manager.lastExtremumMap[side].idmSwing.index]) {
        return;
    }

    const isHighIDMConfirmed = isNonConfirmIDM || side === 'high' && manager.lastExtremumMap[side].idmSwing.price > manager.candles[index].low;
    const isLowIDMConfirmed = isNonConfirmIDM || side === 'low' && manager.lastExtremumMap[side].idmSwing.price < manager.candles[index].high;

    // Если IDM не подтвержден - не смотрим
    if (!isLowIDMConfirmed && !isHighIDMConfirmed) {
        return;
    }

    // Помечаем экстремум как подтвержденный
    manager.lastExtremumMap[side].markExtremum();
    manager.confirmIndexMap[side] = index;

    // Рисуем IDM
    const from = manager.lastExtremumMap[side].idmSwing
    const to = new Swing({index, time: manager.candles[index].time, price: manager.candles[index].close});
    if (isNonConfirmIDM || manager.lastExtremumMap[side].index !== to.index) {
        manager.boses[from.index] = new Cross({
            from,
            to,
            type: versusSide,
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[side],
            isConfirmed: !isNonConfirmIDM
        })
    }

    manager.lastExtremumMap[versusSide] = null;
}

// Фиксируем последний свинг который нашли сверху или снизу
const updateLast = (manager: StateManager, swing: Swing) => {
    if(!swing){
        return;
    }

    manager.lastSwingMap[swing.side] = swing;
}

export class StateManager {
    candles: HistoryObject[] = [];
    swings: (Swing | null)[] = [];
    boses: Cross[] = [];
    trend: Trend[] = [];
    pois: POI[] = [];

    config: THConfig = {};

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
    lastSwingMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
        high: null,
        low: null
    }
    lastExtremumMap: Record<'high' | 'low', (Swing & { idmSwing?: Swing })> = {
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

    // oneIterationTrend
    firstBos?: Cross;
    lastBos?: Cross;

    constructor(candles: HistoryObject[], config?: THConfig) {
        this.candles = candles;
        this.swings = new Array(candles.length).fill(null);
        this.boses = new Array(candles.length).fill(null);
        this.trend = new Array(candles.length).fill(null)
        this.pois = new Array(candles.length).fill(null)

        Object.assign(this.config, config || {});
    }

    calculate() {
        for (let i = 0; i < this.candles.length; i++) {
            this.calculateSwings(i, this.config.oneIteration);
        }
    }

    calculateTrend() {
        this.firstBos = null;
        this.lastBos = null;
        // Берем только те босы которые строятся от свингов (по сути ж которые не IDM)
        for (let i = 0; i < this.candles.length; i++) {
            oneIterationTrend(this, i);
        }
    }

    /**
     * @deprecated
     */
    markHHLLOld = () => {
        for (let i = 0; i < this.swings.length; i++) {
            confirmExtremum(this, i, 'low', i === this.swings.length - 1)
            confirmExtremum(this, i, 'high', i === this.swings.length - 1);

            updateExtremum(this, i, 'high', this.swings[i]);
            updateExtremum(this, i, 'low', this.swings[i]);

            updateLast(this, this.swings[i])
        }
    }

    /**
     * @deprecated
     */
    calculateSwingsOld = () => {
        // Тупо первая точка
        if (this.candles.length) {
            this.swings[0] = new Swing({
                side: 'high',
                time: this.candles[0].time,
                price: this.candles[0].high,
                index: 0
            });
        }

        let prevCandleIndex = 0
        let lastSwingIndex = -1;
        for (let rootIndex = 1; rootIndex < this.candles.length - 1; rootIndex++) {
            let prevCandle = this.candles[prevCandleIndex];
            const currentCandle = this.candles[rootIndex];
            if (isInsideBar(prevCandle, currentCandle)) {
                continue;
            }
            let nextIndex = rootIndex + 1;
            let nextCandle = this.candles[nextIndex];
            // TODO в методичке этого нет. После текущего свипа для подтверждения нужно дождаться пока какая-либо свеча пересвипнет текущую.
            for (; nextIndex < this.candles.length - 1; nextIndex++) {
                nextCandle = this.candles[nextIndex]
                if (!isInsideBar(currentCandle, nextCandle)) {
                    break;
                }
            }
            let diff = nextIndex - rootIndex - 1;
            nextCandle = this.candles[nextIndex]

            tryCalculatePullback(rootIndex, 'high', diff, prevCandle, currentCandle, nextCandle, this.swings);
            tryCalculatePullback(rootIndex, 'low', diff, prevCandle, currentCandle, nextCandle, this.swings);

            // фильтруем вершины подряд
            filterDoubleSwings(rootIndex, lastSwingIndex, newIndex => lastSwingIndex = newIndex, this.swings);

            prevCandleIndex = rootIndex;
            rootIndex += diff;
        }
    }

    externalCandle?: HistoryObject;

    // Проверил: точно ок
    calculateSwings(rootIndex: number, oneIterationHHLL: boolean = false) {
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

        for (let i = 0; i < this.processingSwings.size; i++) {
            const [processingIndex, sw] = Array.from(this.processingSwings)[i];

            let prevCandle = this.candles[processingIndex - 1];
            let {
                currentCandle,
                nextIndex,
                status
            } = sw;
            let nextCandle = this.candles[nextIndex]

            if (!nextCandle) {
                continue;
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
                continue;
            }

            let diff = nextIndex - processingIndex - 1;
            nextCandle = this.candles[nextIndex]

            tryCalculatePullback(processingIndex, 'high', diff, prevCandle, currentCandle, nextCandle, this.swings);
            tryCalculatePullback(processingIndex, 'low', diff, prevCandle, currentCandle, nextCandle, this.swings);

            // TODO Вот тут если по processingIndex появился свинг, то для HH LL нужно делать updateLast
            if(oneIterationHHLL){
                updateLast(this, this.swings[processingIndex]);
            }

            // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
            filterDoubleSwings(processingIndex, this.lastSwingIndex, newIndex => this.lastSwingIndex = newIndex, this.swings);

            this.processingSwings.delete(processingIndex);

            if(oneIterationHHLL) {
                confirmExtremum(this, rootIndex, 'low', rootIndex === this.swings.length - 1)
                confirmExtremum(this, rootIndex, 'high', rootIndex === this.swings.length - 1);

                updateExtremum(this, rootIndex, 'high', this.swings[processingIndex]);
                updateExtremum(this, rootIndex, 'low', this.swings[processingIndex]);
            }
        }

        // Если текущая свечка внутренняя для предыдущей - идем дальше
        const leftCandle = this.externalCandle ?? this.candles[rootIndex - 1];
        if (isInsideBar(leftCandle, this.candles[rootIndex])) {
            this.externalCandle = leftCandle;
            return;
        }
        this.externalCandle = null;

        // Если текущая свечка не внутренняя - начинаем поиск свинга
        this.processingSwings.set(rootIndex, {
            currentCandle: this.candles[rootIndex],
            nextIndex: rootIndex + 1,
            status: 'draft'
        });
    }
}

/**
 * @deprecated
 * @param manager
 */
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

const updateLastSwing = (i: number, type: 'high' | 'low', manager: StateManager,
                         moreBOS: boolean = false
) => {
    if (manager.swings[i] && manager.swings[i].side === type && manager.swings[i].isExtremum) {
        manager.prelastBosSwingMap[type] = manager.lastBosSwingMap[type];
        manager.lastBosSwingMap[type] = i;

        if (moreBOS) {
            // Если новый бос более хайный (или более лольный) - то удаляем прошлый бос
            if (type === 'high' && manager.swings[manager.prelastBosSwingMap[type]] && manager.swings[manager.lastBosSwingMap[type]].price > manager.swings[manager.prelastBosSwingMap[type]].price) {
                manager.lastBosSwingMapSet[type].delete(manager.prelastBosSwingMap[type])
            }
            if (type === 'low' && manager.swings[manager.prelastBosSwingMap[type]] && manager.swings[manager.lastBosSwingMap[type]].price < manager.swings[manager.prelastBosSwingMap[type]].price) {
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

const deleteInternalBOS = (manager: StateManager, moreBOS: boolean = false) => {
    // TODO Хз надо ли, выглядит ок но финрез хуже
    // Если сужение - удаляем внутренние босы
    // TODO Здесь удаляются IDM которые нужны для LL и HH (которые подтерждаются не босами), нужно их оставлять
    // TODO по хорошему это нужно удалять после объявления тренда
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
    }
}

// Рисует BOS если LL или HH перекрываются
/**
 * @deprecated
 * @param manager
 * @param moreBOS
 * @param showFake
 */
export const drawBOS = (manager: StateManager, moreBOS: boolean = false, showFake: boolean = false) => {
    for (let i = 0; i < manager.candles.length; i++) {

        deleteInternalBOS(manager, moreBOS)

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

        updateLastSwing(i, 'high', manager, moreBOS);
        updateLastSwing(i, 'low', manager, moreBOS);
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
    moreBOS, showHiddenSwings, showIFC, showFake, oneIteration
}: THConfig) => {

    if(!oneIteration)
    manager.markHHLLOld()

    if (showIFC)
        markIFC(manager);

    deleteInternalStructure(manager);

    if (!showHiddenSwings) {
        deleteEmptySwings(manager);
    }

    drawBOS(manager, moreBOS, showFake);

    drawTrend(manager);
};

const oneIterationTrend = (manager: StateManager, rootIndex: number) => {
    const curBos = manager.boses[rootIndex];
    const lastBos = manager.lastBos;
    const firstBos = manager.firstBos;

    const log = (...args) => {
        return;
        console.log(args);
    }

    // Если бос ИДМ - просто повторяем тренд который был
    if (curBos && curBos.isIDM && lastBos) {
        const isNewTrend = lastBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {time: manager.candles[rootIndex].time, trend: isNewTrend}
        log(rootIndex, 'Если бос ИДМ - просто повторяем тренд который был');
        return;
    }

    // Если первый бос/чоч случился а нового пока нет - рисуем тренд первого
    if (lastBos && !firstBos && rootIndex >= lastBos.to.index) {
        const isNewTrend = lastBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {time: manager.candles[rootIndex].time, trend: isNewTrend}
        log(rootIndex, 'Если первый бос/чоч случился а нового пока нет - рисуем тренд первого');
    }

    // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
    if (firstBos && lastBos && lastBos.from.index > firstBos.from.index && lastBos.to.index < firstBos.to.index) {
        manager.boses[lastBos.from.index] = null;
        return;
    }

    // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
    if (firstBos && lastBos && firstBos.isConfirmed && lastBos.isConfirmed && firstBos.to.index === lastBos.to.index) {
        manager.boses[lastBos.from.index] = null;
        manager.lastBos = null;
        return;
    }

    // Если есть текущий бос и прошлый, но текущий еще не закончился - рисуем тренд прошлого
    if (firstBos && lastBos && lastBos?.to.index > rootIndex) {
        const isNewTrend = firstBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {time: manager.candles[rootIndex].time, trend: isNewTrend}
        log(rootIndex, 'Если есть текущий бос и прошлый, но текущий еще не закончился - рисуем тренд прошлого');
    }

    // Если есть текущий бос и прошлый, но оба еще не закончились - рисуем предыдущий тренд
    if (firstBos && lastBos && lastBos?.to.index > rootIndex && firstBos?.to.index > rootIndex && manager.trend[rootIndex - 1]?.trend) {
        manager.trend[rootIndex] = {time: manager.candles[rootIndex].time, trend: manager.trend[rootIndex - 1]?.trend}
        log(rootIndex, 'Если есть текущий бос и прошлый, но оба еще не закончились - рисуем предыдущий тренд');
    }

    // Если в прошлом был БОС - то нужно рисовать его тренд.
    if (lastBos && rootIndex >= lastBos.to.index) {
        manager.trend[rootIndex] = {time: manager.candles[rootIndex].time, trend: lastBos.type === 'high' ? 1 : -1}
        log(rootIndex, 'Если в прошлом был БОС - то нужно рисовать его тренд.');
    }

    // Удаляем IDM у точек которые являются босами
    if (lastBos && manager.boses[rootIndex]?.isIDM && manager.boses[rootIndex]?.type === lastBos.type) {
        manager.boses[rootIndex] = null;
    }

    // либо первый чоч, либо сменился тренд, либо был фейк чоч и нужно проверить следующий чоч
    const isFirstCHoCH = !lastBos;
    const isTrendChanged = lastBos && curBos && curBos.type !== lastBos.type;
    const isAfterFake = Boolean(lastBos) && curBos && Boolean(curBos.isCHoCH) && !curBos.isConfirmed && curBos.type === lastBos.type
    if (curBos && !curBos.isIDM && (isFirstCHoCH || ((isTrendChanged || isAfterFake) && curBos.to.index > lastBos.to.index))) {
        curBos.markCHoCH()
    }

    if (curBos && !curBos.isIDM && curBos.isConfirmed) {
        if (manager.lastBos) {
            manager.firstBos = manager.lastBos;
            log(rootIndex, 'Записали firstBos', `${manager.firstBos.from.index} - ${manager.firstBos.to.index}`)
        }
        manager.lastBos = curBos;
        log(rootIndex, 'Записали lastBos', `${curBos.from.index} - ${curBos.to.index}`)
    }
}

/**
 * @deprecated
 * TODO
 * Переписать на oneIteration
 * Сравнивать не cur/next а prev/cur
 * Через свинги без фильтрации onlybos
 * @param manager
 */
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

        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            const isNewTrend = curBos.isConfirmed ? type === 'high' ? 1 : -1 : manager.trend[j - 1]?.trend;
            manager.trend[j] = {time: manager.candles[j].time, trend: isNewTrend}

            // Удаляем IDM у точек которые являются босами
            if (manager.boses[j]?.isIDM && manager.boses[j]?.type === type) {
                manager.boses[j] = null;
            }
        }

        // либо сменился тренд, либо был фейк чоч, и нужно проверить следующий чоч
        const isTrendChanged = nextBos && curBos.type !== nextBos.type;
        const isAfterFake = nextBos && curBos.isCHoCH && !curBos.isConfirmed && curBos.type === nextBos.type
        if ((isTrendChanged || isAfterFake) && curBos.to.index < nextBos.to.index) {
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

export type OrderblockPart = Pick<POI, 'side' | 'lastOrderblockCandle' | 'lastImbalanceCandle' | 'firstImbalanceIndex' | 'imbalanceIndex' | 'startCandle'>

const isInternalBOS = (leftBos: Cross, rightBos: Cross) => leftBos.from.index < rightBos.from.index
    && leftBos.to.index >= rightBos.to.index
const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;

export const hasHitOB = (ob: POI, candle: HistoryObject) =>
    (ob.side === 'high'
        && ob.startCandle.low <= candle.high
    )
    || (ob.side === 'low'
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

export const filterNearOrderblock = (orderBlocks: POI[], currentCandle: HistoryObject) => orderBlocks.filter(({
                                                                                                                  startCandle: {
                                                                                                                      high,
                                                                                                                      low
                                                                                                                  },
                                                                                                                  side
                                                                                                              }) =>
    hasNear(
        true,
        {high, low, side: side === 'high' ? Side.Sell : Side.Buy} as any,
        currentCandle,
    ),
)
    .filter(ob => ob.side === 'high' ? currentCandle.high < ob.startCandle.high : currentCandle.low > ob.startCandle.low)
    .sort((a, b) => {
        const aDiff = a.side === 'high' ? a.startCandle.low - currentCandle.high : currentCandle.low - a.startCandle.high;
        const bDiff = b.side === 'high' ? b.startCandle.low - currentCandle.high : currentCandle.low - b.startCandle.high;

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