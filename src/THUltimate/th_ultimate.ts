export interface HistoryObject {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number;
    volume: number;
}

export class Swing {
    side?: 'high' | 'low';
    time: number;
    price: number;
    index: number;
    isIFC?: boolean;

    protected _isExtremum: boolean = false;

    // Для подсчета на графике, только для тестов
    protected _isDebug: boolean = false;

    constructor(props: Partial<Swing>) {
        Object.assign(this, props);
    }

    get isExtremum() {
        return this._isExtremum;
    }

    get text() {
        let _text = '';

        if (this._isExtremum) {
            _text = this.side === 'high' ? 'HH' : 'LL';
        }

        if (this._isDebug) {
            _text += ` ${this.index?.toFixed()}`;
        }

        return _text;
    }

    setDebug() {
        this._isDebug = true;
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
    type: 'low' | 'high';

    isIDM?: boolean;
    isBOS?: boolean;
    isCHoCH?: boolean;

    isSwipedLiquidity?: boolean;
    isConfirmed?: boolean;

    constructor(props: Partial<Cross>) {
        Object.assign(this, props);
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
            if (!this.isSwipedLiquidity || this.isConfirmed) return 'BOS';
            return 'Fake BOS';
        }
        if (this.isCHoCH) {
            if (!this.isSwipedLiquidity || this.isConfirmed) return 'CHoCH';
            return 'Fake CHoCH';
        }

        return '';
    }
}

export enum POIType {
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
        if (this.isSMT) return 'SMT';
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
        if (this.swing.isExtremum) return 'Ex OB';
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
export const calculatePOI = (
    manager: StateManager,
    withMove: boolean = false,
    newSMT: boolean = false,
    showFake: boolean = false,
) => {
    // Иногда определяеются несколько ОБ на одной свечке, убираем

    for (let i = 0; i < manager.swings.length; i++) {
        const candle = manager.candles[i];
        const trend = manager.trend[i];
        const swing = manager.swings[i];
        const index = swing?.index;

        if (swing) {
            // Нужно для определения ближайшей цели для TakeProfit
            const takeProfit = closestExtremumSwing(manager, swing)
            const _firstImbalanceIndex = findFirstImbalanceIndex(manager, index);
            const {
                lastImbalanceIndex,
                firstImbalanceIndex,
                firstCandle
            } = findLastImbalanceIndex(manager, manager.candles[index], _firstImbalanceIndex, withMove);
            // Здесь по идее нужно создавать "задачу" на поиск ордерблока.
            // И итерироваться в дальшейшем по всем задачам чтобы понять, ордерблок можно создать или пора задачу удалить.
            manager.nonConfirmsOrderblocks.set(swing.time, {
                swing,
                firstCandle,
                firstImbalanceIndex,
                lastImbalanceIndex,
                status: 'firstImbalanceIndex',
                // status: 'lastImbalanceIndex',
                // Тейк профит до ближайшего максимума
                takeProfit: takeProfit?.price,
            });
        }

        manager.calculateIDMIFC(i);

        // В этом блоке создаем все ОБ
        // Если есть хотя бы 3 свечки
        if (i >= 2) {
            manager.nonConfirmsOrderblocks.forEach((orderblock, time) => {
                let {
                    swing,
                    firstCandle,
                    firstImbalanceIndex,
                    status,
                    takeProfit,
                    lastImbalanceIndex,
                } = orderblock;

                const num = withMove ? 2 : 1;
                const firstImbIndex = firstImbalanceIndex + num;

                if (
                    firstImbIndex <= i &&
                    isImbalance(manager.candles[firstImbalanceIndex], manager.candles[i])
                ) {
                    if (withMove) {
                        firstCandle = manager.candles[firstImbIndex];
                        firstImbalanceIndex = firstImbIndex;
                    }
                    lastImbalanceIndex = i;
                    status = 'lastImbalanceIndex';

                    manager.nonConfirmsOrderblocks.set(time, {
                        ...orderblock,
                        firstImbalanceIndex,
                        firstCandle,
                        lastImbalanceIndex,
                        status,
                    });
                }

                // Это на случай если индексы не нашлись
                if (status === 'firstImbalanceIndex') {
                    return;
                }

                const lastImbalanceCandle = manager.candles[lastImbalanceIndex];
                const lastOrderblockCandle = manager.candles[firstImbalanceIndex];

                // Жестко нужно для БД, не трогать
                const open =
                    firstCandle.time === time
                        ? firstCandle.open
                        : lastOrderblockCandle.open;
                const close =
                    firstCandle.time !== time
                        ? firstCandle.close
                        : lastOrderblockCandle.close;
                const type =
                    lastImbalanceCandle.low > firstCandle.high
                        ? 'low'
                        : lastImbalanceCandle.high < firstCandle.low
                            ? 'high'
                            : null;

                if (!type) {
                    manager.nonConfirmsOrderblocks.delete(time);
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

                const lastIDMIndex = closestLeftIDMIndex(manager, swing.index, swing?.side);
                if (
                    orderBlockPart?.side === swing?.side &&
                    swing?.isExtremum &&
                    !manager.uniqueOrderBlockTimeSet.has(orderBlockPart.startCandle.time)
                ) {
                    // TODO Не торговать ОБ под IDM
                    const bossIndex = orderBlockPart.firstImbalanceIndex + index;
                    const hasBoss =
                        Boolean(manager.boses[bossIndex]) &&
                        (!showFake || manager.boses[bossIndex].isConfirmed);

                    const isSMT =
                        !newSMT &&
                        (hasBoss ||
                            (lastIDMIndex &&
                                manager.boses[lastIDMIndex].from.index <= i &&
                                manager.boses[lastIDMIndex].to.index > i));

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
                        type,
                    });
                    manager.obIdxes.add(swing.index);

                    manager.uniqueOrderBlockTimeSet.add(orderBlockPart.startCandle.time);
                }
                manager.nonConfirmsOrderblocks.delete(time);
            });
        }
        manager.calculateOBIDM(i);

        // В этом блоке по всем OB подтверждаем endCandles
        if (newSMT) {
            /**
             * Итерируюсь по свечкам
             * Записываю нахожусь ли я внутри IDM. Если да - то это SMT
             * Записываю новые ОБ и закрываю их если было касание
             */
            manager.obIdxes.forEach((obIdx) => {
                const obItem = manager.pois[obIdx];
                const startPositionIndex = obItem.index + obItem.imbalanceIndex;
                // TODO Тут нужен фильтр на SMT
                if (startPositionIndex <= i && hasHitOB(obItem, candle)) {
                    manager.obIdxes.delete(obIdx);

                    obItem.endCandle = candle;
                    obItem.endIndex = i;
                    obItem.canTrade = true;

                    if (
                        isIFC(obItem.side, candle) &&
                        ![POIType.OB_EXT, POIType.OB_IDM].includes(obItem.type)
                    ) {
                        obItem.canTrade = false;
                    }

                    const trendType = trend?.trend === 1 ? 'low' : 'high';
                    if (!trend || trendType !== obItem.side) {
                        obItem.canTrade = false;
                        return;
                    }
                }
            });
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
                    obItem.endIndex = j;
                    obItem.canTrade = true;
                    break;
                }
            }
        }
    }

    return manager.pois.map((ob, index) => {
        if (!ob) {
            return null;
        }
        // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
        const obStartIndex = ob?.index;
        const obIndex = ob?.endIndex || index;
        const startTrend = manager.trend[obStartIndex]?.trend;
        const trend = manager.trend[obIndex]?.trend;
        if (startTrend !== trend) {
            return null;
        }

        const isBuy = trend === 1 && ob?.side === 'low';
        const isSell = trend === -1 && ob?.side === 'high';

        if (isBuy || isSell) {
            return ob;
        }
        return null;
    });
};

export const calculateTesting = (
    data: HistoryObject[],
    {
        showHiddenSwings,
        showIFC,
        withMove,
        newSMT,
        byTrend,
        showFake,
        oneIteration,
    }: THConfig,
) => {
    const manager = new StateManager(data, {oneIteration, showIFC});
    // <-- Копировать в робота
    manager.calculate();

    tradinghubCalculateTrendNew(manager, {
        showHiddenSwings,
        showFake,
        showIFC,
        oneIteration,
    });

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
    let orderBlocks = calculatePOI(manager, withMove, newSMT, showFake);

    if (byTrend) {
        const currentTrend =
            manager.trend[manager.trend.length - 1]?.trend === 1 ? 'low' : 'high';
        orderBlocks = orderBlocks.filter((ob) => ob?.side === currentTrend);
    }

    return {
        swings: manager.swings,
        trend: manager.trend,
        boses: manager.boses,
        orderBlocks,
    };
};

export interface THConfig {
    withMove?: boolean;
    showHiddenSwings?: boolean;
    newSMT?: boolean;
    showIFC?: boolean;
    byTrend?: boolean;
    showFake?: boolean;
    oneIteration?: boolean;
}

export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT;

export const defaultConfig: THConfig = {
    newSMT: true,
    showHiddenSwings: false,
    withMove: false,
    byTrend: true,
    showFake: false,
    oneIteration: true,
};

// Точка входа в торговлю
export const calculateProduction = (data: HistoryObject[]) => {
    const config: THConfig = defaultConfig;

    let {orderBlocks} = calculateTesting(data, config);

    orderBlocks = orderBlocks.filter((o) => o?.type !== POIType.OB_IDM);

    return orderBlocks.filter(isNotSMT);
};

const hasHighValidPullback = (
    leftCandle: HistoryObject,
    currentCandle: HistoryObject,
    nextCandle?: HistoryObject,
) => {
    if (
        // Текущая свеча пересвипнула предыдущую
        leftCandle.high < currentCandle.high &&
        // И следующий свечи либо нет либо ее хай ниже текущего
        (!nextCandle || nextCandle.high <= currentCandle.high)
    ) {
        return 'high';
    }
    return '';
};
const hasLowValidPullback = (
    leftCandle: HistoryObject,
    currentCandle: HistoryObject,
    nextCandle?: HistoryObject,
) => {
    if (
        leftCandle.low > currentCandle.low &&
        (!nextCandle || nextCandle.low >= currentCandle.low)
    ) {
        return 'low';
    }
    return '';
};

const tryCalculatePullback = (
    index: number,
    type: 'high' | 'low',
    diff: number,
    prevCandle: HistoryObject,
    currentCandle: HistoryObject,
    nextCandle: HistoryObject,
    swings: Swing[],
) => {
    const funcMap: Record<'high' | 'low', Function> = {
        high: hasHighValidPullback,
        low: hasLowValidPullback,
    };

    const mainFunc = funcMap[type];
    const subFunc = funcMap[type === 'high' ? 'low' : 'high'];

    // diff может быть если между текущей свечой и последней есть еще свечки.
    // В таком случае нужно проверить что последняя свеча не является внутренней для текущей свечи (пересвипнула снизу)
    if (!diff || subFunc(currentCandle, nextCandle)) {
        const highPullback = mainFunc(prevCandle, currentCandle, nextCandle);
        const swing = new Swing({
            side: type,
            time: currentCandle.time,
            price: currentCandle[type],
            index,
        });
        swings[index] = highPullback ? swing : swings[index];
    }
};

const filterDoubleSwings = (
    i: number,
    lastSwingIndex: number,
    updateLastSwingIndex: (val: number) => void,
    swings: Swing[],
) => {
    // фильтруем вершины подряд
    const prevSwing = lastSwingIndex > -1 ? swings[lastSwingIndex] : null;
    const curSwing = swings[i];
    let setIndex = i;

    if (!curSwing) {
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
};

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
};

const deleteInternalOneIt = (
    i: number,
    type: 'high' | 'low',
    manager: StateManager,
) => {
    const funcMap: Record<'high' | 'low', Function> = {
        high: lowestBy,
        low: highestBy,
    };

    const crossType = type === 'high' ? 'low' : 'high';

    const condition =
        type === 'high'
            ? // Если произошел пересвип хая, ищем между точками лойный лой
            manager.swings[manager.preLastIndexMap[type]]?.price <
            manager.candles[i].high
            : // Если произошел пересвип лоя, ищем между точками хайный хай
            manager.swings[manager.preLastIndexMap[type]]?.price >
            manager.candles[i].low;

    // Если произошел пересвип хая, ищем между точками лойный лой
    if (condition) {
        const batch = manager.swings.slice(manager.preLastIndexMap[type] + 1, i);
        const lowestSwing = funcMap[type](batch, 'price');

        // Удаляем все лои которые не лойный лой
        batch
            .filter((idx) => idx && idx?.index !== lowestSwing?.index)
            .forEach((idx) => {
                manager.swings[idx.index].unmarkExtremum();
                manager.deletedSwingIndexes.add(idx.index);
            });

        manager.preLastIndexMap[crossType] = lowestSwing?.index;
        manager.preLastIndexMap[type] = null;
    }
};

const updateExtremumOneIt = (
    i: number,
    type: 'high' | 'low',
    manager: StateManager,
) => {
    if (!manager.swings[i]) {
        return;
    }

    const condition =
        !manager.preLastIndexMap[type] ||
        (type === 'high'
            ? // updateHighest
            manager.swings[manager.preLastIndexMap[type]].price <
            manager.swings[i].price
            : // updateLowest
            manager.swings[manager.preLastIndexMap[type]].price >
            manager.swings[i].price);
    if (
        manager.swings[i].side === type &&
        manager.swings[i].isExtremum &&
        condition
    ) {
        manager.preLastIndexMap[type] = i;
    }
};
// Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
const updateExtremum = (
    manager: StateManager,
    index: number,
    side: Swing['side'],
    swing: Swing,
) => {
    // Проверяем свинг по выбранной стороне
    if (!swing || swing.side !== side) {
        return;
    }

    const versusSide = side === 'low' ? 'high' : 'low';
    if (manager.confirmIndexMap[versusSide] > index) {
        return;
    }

    const isHighestHigh =
        !manager.lastExtremumMap[swing.side] ||
        (side === 'high' &&
            manager.lastExtremumMap[swing.side].price < swing.price);
    const isLowestLow =
        !manager.lastExtremumMap[swing.side] ||
        (side === 'low' && manager.lastExtremumMap[swing.side].price > swing.price);

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
        manager.lastExtremumMap[swing.side].idmSwing =
            manager.lastSwingMap[versusSide];
    }
};

const confirmExtremum = (
    manager: StateManager,
    index: number,
    side: Swing['side'],
    isNonConfirmIDM: boolean,
) => {
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

    const isHighIDMConfirmed =
        isNonConfirmIDM ||
        (side === 'high' &&
            manager.lastExtremumMap[side].idmSwing.price >
            manager.candles[index].low);
    const isLowIDMConfirmed =
        isNonConfirmIDM ||
        (side === 'low' &&
            manager.lastExtremumMap[side].idmSwing.price <
            manager.candles[index].high);

    // Если IDM не подтвержден - не смотрим
    if (!isLowIDMConfirmed && !isHighIDMConfirmed) {
        return;
    }

    // Помечаем экстремум как подтвержденный
    manager.lastExtremumMap[side].markExtremum();
    manager.confirmIndexMap[side] = index;

    // Рисуем IDM
    const from = manager.lastExtremumMap[side].idmSwing;
    const to = new Swing({
        index,
        time: manager.candles[index].time,
        price: manager.candles[index].close,
    });

    // На случай если и хай и лоу будет на одной свече, нужно подтверждение жестко с предыдущей свечки
    if (isNonConfirmIDM || manager.lastExtremumMap[side].index !== to.index) {
        manager.boses[from.index] = new Cross({
            from,
            to,
            type: versusSide,
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[side],
            isConfirmed: !isNonConfirmIDM,
        });
    }

    manager.lastExtremumMap[versusSide] = null;
};

// Фиксируем последний свинг который нашли сверху или снизу
const updateLast = (manager: StateManager, swing: Swing) => {
    if (!swing) {
        return;
    }

    manager.lastSwingMap[swing.side] = swing;
};

export class StateManager {
    candles: HistoryObject[] = [];
    swings: (Swing | null)[] = [];
    boses: Cross[] = [];
    trend: Trend[] = [];
    pois: POI[] = [];

    config: THConfig = {};

    // tradinghubCalculateSwings
    lastSwingIndex: number = -1;
    processingSwings = new Map<
        number,
        {
            currentCandle: HistoryObject;
            nextIndex: number;
            status: 'draft' | 'nextIndex';
        }
    >();

    // deleteInternalStructure
    preLastIndexMap: Record<'high' | 'low', number> = {
        high: null,
        low: null,
    };
    deletedSwingIndexes = new Set([]);

    // markHHLL
    lastSwingMap: Record<'high' | 'low', Swing & { idmSwing?: Swing }> = {
        high: null,
        low: null,
    };
    lastExtremumMap: Record<'high' | 'low', Swing & { idmSwing?: Swing }> = {
        high: null,
        low: null,
    };
    confirmIndexMap: Record<'high' | 'low', number> = {
        high: -1,
        low: -1,
    };

    // drawBOS
    liquidityCandleMap: Record<'high' | 'low', HistoryObject> = {
        high: null,
        low: null,
    };
    prelastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null,
    };
    lastBosSwingMap: Record<'high' | 'low', number> = {
        high: null,
        low: null,
    };
    deleteIDM = new Set<number>([]);
    lastBosSwingMapSet: Record<'high' | 'low', Set<number>> = {
        high: new Set<number>([]),
        low: new Set<number>([]),
    };
    liquidityCandleMapMap: Record<'high' | 'low', Map<number, HistoryObject>> = {
        high: new Map<number, HistoryObject>([]),
        low: new Map<number, HistoryObject>([]),
    };

    // oneIterationTrend
    firstBos?: Cross;
    lastBos?: Cross;

    // calculatePOI
    uniqueOrderBlockTimeSet = new Set();
    nonConfirmsOrderblocks = new Map<
        number,
        {
            swing: Swing;
            firstCandle: HistoryObject;
            takeProfit: number;
            firstImbalanceIndex: number;
            lastImbalanceIndex?: number;
            status: 'draft' | 'firstImbalanceIndex' | 'lastImbalanceIndex';
        }
    >([]);
    obIdxes = new Set<number>([]);

    constructor(candles: HistoryObject[], config?: THConfig) {
        this.candles = candles;
        this.swings = new Array(candles.length).fill(null);
        this.boses = new Array(candles.length).fill(null);
        this.trend = new Array(candles.length).fill(null);
        this.pois = new Array(candles.length).fill(null);

        Object.assign(this.config, config || {});
    }

    calculate() {
        for (let i = 0; i < this.candles.length; i++) {
            this.calculateSwings(i);
        }
    }

    // Есть IDM, задеваем его свечой IFC (или простреливаем), открываем сделку
    calculateIDMIFC(index: number) {
        if (!this.trend[index]) {
            return;
        }

        // На нисходящем тренде нужно искать IFC сверху, на восходящем - снизу
        const idmSide = this.trend[index].trend === -1 ? 'high' : 'low';
        const lastIDMIndex = closestLeftIDMIndex(this, index, idmSide);
        const bos = this.boses[lastIDMIndex];
        if (!bos) {
            return;
        }

        const orderBlockPart = {
            startCandle: this.candles[lastIDMIndex],
            lastOrderblockCandle: this.candles[lastIDMIndex],
            lastImbalanceCandle: this.candles[index],
            firstImbalanceIndex: lastIDMIndex,
            imbalanceIndex: index,
            side: idmSide,
        } as OrderblockPart;

        // IDM Есть и он подтвержден свечой IFC
        const isConfirmedByIFC =
            bos?.isConfirmed &&
            bos.to.index === index &&
            isIFC(idmSide, this.candles[bos.to.index]) &&
            hasHitOB(orderBlockPart, this.candles[bos.to.index]);

        if (!isConfirmedByIFC) {
            return;
        }

        const swing = this.swings[lastIDMIndex];
        if (!swing) {
            return;
        }

        this.pois[lastIDMIndex] = new POI({
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTrade: true,
            takeProfit: bos.extremum.price,
            type: POIType.IDM_IFC,
            endCandle: this.candles[index],
            endIndex: index,
        });

        this.uniqueOrderBlockTimeSet.add(orderBlockPart.startCandle.time);
    }

    // Первый OB сразу после IDM, задеваем его свечой (любой) или закрываемся внутри
    calculateOBIDM(index: number) {
        // Нужно запомнить свип который был прям перед IDM
        // Можно просто пойти с конца. Нужно чтобы был последний IDM, от него найти ближайший свинг, это и будет OB IDM (строить от него)
        // Нужно не просто найти первый IDM и OB IDM от него, нужно чтобы этот OB IDM касался текущей свечой, иначе мимо
        if (!this.trend[index]) {
            return;
        }
        const idmSide = this.trend[index].trend === -1 ? 'high' : 'low';
        let idm: Cross = null;
        let OB_IDM_SWING: Swing = null;
        for (let i = index; i >= 0; i--) {
            const bos = this.boses[i];
            const swing = this.swings[i];
            if (idm && swing && idm.type === swing.side) {
                OB_IDM_SWING = swing;
                break;
            }
            if (!bos) {
                continue; // (b => b?.isIDM && b.to?.index >= index);
            }
            if (bos.to?.index >= index) {
                continue;
            }

            if (!bos.isIDM) {
                continue;
            }
            idm = bos;
        }

        if (!idm) {
            return;
        }

        if (this.pois[idm.from.index]) {
            return;
        }

        if (!OB_IDM_SWING) {
            return;
        }

        const orderBlockPart = {
            startCandle: this.candles[OB_IDM_SWING.index],
            lastOrderblockCandle: this.candles[index],
            lastImbalanceCandle: this.candles[index],
            firstImbalanceIndex: OB_IDM_SWING.index,
            imbalanceIndex: index,
            side: idmSide,
        } as OrderblockPart;

        if (!hasHitOB(orderBlockPart, this.candles[index])) {
            return;
        }

        this.pois[idm.from.index] = new POI({
            ...orderBlockPart,
            isSMT: false,
            swing: OB_IDM_SWING,
            canTrade: true,
            takeProfit: null,
            type: isIFC(orderBlockPart.side, this.candles[index])
                ? POIType.OB_IDM_IFC
                : POIType.OB_IDM,
            endCandle: this.candles[index],
            endIndex: index,
        });
    }

    // Первый OB сразу после IDM, задеваем его свечой IFC
    calculateOBIDMIFC() {
    }

    // Просто какой то уровень ликвидности (не OB), строится от свинга, не экстремум, не OB IDM, задеваем свечой IFC
    calculateLQIFC() {
    }

    // Первый свинг (ликвидность) сразу после HH/LL, задеваем ее свечой IFC
    calculateEXTLQIFC() {
    }

    // Ордерблок на свече HH/LL, задеваем его свечой (или закрываемся внутри), не IFC
    calculateOBEXT() {
    }

    // Чоч на свече HH/LL, задеваем его свечой IFC
    calculateOBEXTIFC() {
    }

    calculateTrend() {
        this.firstBos = null;
        this.lastBos = null;
        // Берем только те босы которые строятся от свингов (по сути ж которые не IDM)
        for (let i = 0; i < this.candles.length; i++) {
            oneIterationTrend(this, i);
        }
    }

    markIFCOneIt = (index: number) => {
        const bos = this.swings[index];
        if (bos && isIFC(bos.side, this.candles[bos.index])) {
            bos.isIFC = true;
        }
    };

    /**
     * @deprecated
     */
    markIFCOld = () => {
        for (let i = 0; i < this.swings.length; i++) {
            this.markIFCOneIt(i);
        }
    };

    /**
     * @deprecated
     */
    markHHLLOld = () => {
        for (let i = 0; i < this.swings.length; i++) {
            confirmExtremum(this, i, 'low', i === this.swings.length - 1);
            confirmExtremum(this, i, 'high', i === this.swings.length - 1);

            updateExtremum(this, i, 'high', this.swings[i]);
            updateExtremum(this, i, 'low', this.swings[i]);

            updateLast(this, this.swings[i]);
        }
    };

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
                index: 0,
            });
        }

        let prevCandleIndex = 0;
        let lastSwingIndex = -1;
        for (let rootIndex = 1; rootIndex < this.candles.length - 1; rootIndex++) {
            const prevCandle = this.candles[prevCandleIndex];
            const currentCandle = this.candles[rootIndex];
            if (isInsideBar(prevCandle, currentCandle)) {
                continue;
            }
            let nextIndex = rootIndex + 1;
            let nextCandle = this.candles[nextIndex];
            // TODO в методичке этого нет. После текущего свипа для подтверждения нужно дождаться пока какая-либо свеча пересвипнет текущую.
            for (; nextIndex < this.candles.length - 1; nextIndex++) {
                nextCandle = this.candles[nextIndex];
                if (!isInsideBar(currentCandle, nextCandle)) {
                    break;
                }
            }
            const diff = nextIndex - rootIndex - 1;
            nextCandle = this.candles[nextIndex];

            tryCalculatePullback(
                rootIndex,
                'high',
                diff,
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );
            tryCalculatePullback(
                rootIndex,
                'low',
                diff,
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );

            // фильтруем вершины подряд
            filterDoubleSwings(
                rootIndex,
                lastSwingIndex,
                (newIndex) => (lastSwingIndex = newIndex),
                this.swings,
            );

            prevCandleIndex = rootIndex;
            rootIndex += diff;
        }
    };

    externalCandle?: HistoryObject;

    // Проверил: точно ок
    calculateSwings(rootIndex: number) {
        // Тупо первая точка
        if (rootIndex === 0 && this.candles.length) {
            this.swings[0] = new Swing({
                side: 'high',
                time: this.candles[0].time,
                price: this.candles[0].high,
                index: 0,
            });
            return;
        }

        for (let i = 0; i < this.processingSwings.size; i++) {
            const [processingIndex, sw] = Array.from(this.processingSwings)[i];

            const prevCandle = this.candles[processingIndex - 1];
            let {currentCandle, nextIndex, status} = sw;
            let nextCandle = this.candles[nextIndex];

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
                status,
            });

            if (status === 'draft') {
                continue;
            }

            const diff = nextIndex - processingIndex - 1;
            nextCandle = this.candles[nextIndex];

            tryCalculatePullback(
                processingIndex,
                'high',
                diff,
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );
            tryCalculatePullback(
                processingIndex,
                'low',
                diff,
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );

            // markHHLL
            updateLast(this, this.swings[processingIndex]);

            // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
            filterDoubleSwings(
                processingIndex,
                this.lastSwingIndex,
                (newIndex) => (this.lastSwingIndex = newIndex),
                this.swings,
            );

            this.processingSwings.delete(processingIndex);

            // markHHLL
            updateExtremum(this, rootIndex, 'high', this.swings[processingIndex]);
            updateExtremum(this, rootIndex, 'low', this.swings[processingIndex]);

            confirmExtremum(
                this,
                rootIndex,
                'high',
                rootIndex === this.swings.length - 1,
            );
            confirmExtremum(
                this,
                rootIndex,
                'low',
                rootIndex === this.swings.length - 1,
            );

            if (this.config.showIFC) this.markIFCOneIt(processingIndex);
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
            status: 'draft',
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

    // Удаляем IDM у удаленных LL/HH TODO нужно переместить в цикл выше
    manager.boses = manager.boses.map((b) =>
        !manager.deletedSwingIndexes.has(b?.extremum?.index) ? b : null,
    );
};

const updateLastSwing = (
    i: number,
    side: 'high' | 'low',
    manager: StateManager,
) => {
    // Если свинга нет - пропускаем
    if (!manager.swings[i]) {
        return;
    }
    // Если свинг другого типа - пропускаем
    if (manager.swings[i].side !== side) {
        return;
    }
    // Если это не HH/LL - пропускаем
    if (!manager.swings[i].isExtremum) {
        return;
    }

    // Фиксируем прошлый свинг
    manager.prelastBosSwingMap[side] = manager.lastBosSwingMap[side];
    // Фиксируем текущий свинг
    manager.lastBosSwingMap[side] = i;

    // Если новый бос более хайный (или более лольный) - то удаляем прошлый бос
    const isHighestBos =
        side === 'high' &&
        manager.swings[manager.prelastBosSwingMap[side]] &&
        manager.swings[manager.lastBosSwingMap[side]].price >
        manager.swings[manager.prelastBosSwingMap[side]].price;
    const isLowestBos =
        side === 'low' &&
        manager.swings[manager.prelastBosSwingMap[side]] &&
        manager.swings[manager.lastBosSwingMap[side]].price <
        manager.swings[manager.prelastBosSwingMap[side]].price;
    if (isHighestBos || isLowestBos) {
        manager.lastBosSwingMapSet[side].delete(manager.prelastBosSwingMap[side]);
    }

    manager.lastBosSwingMapSet[side].add(manager.lastBosSwingMap[side]);
};

const confirmBOS = (
    i: number,
    type: 'high' | 'low',
    manager: StateManager,
    isLastCandle: boolean,
    showFake: boolean = false,
) => {
    const lastBosSwing = manager.lastBosSwingMap[type];
    const lastCrossBosSwing =
        manager.lastBosSwingMap[type === 'high' ? 'low' : 'high'];

    if (!lastBosSwing) {
        return;
    }

    if (manager.boses[lastBosSwing] && !manager.boses[lastBosSwing].isIDM) {
        return;
    }

    const liquidityCandle =
        manager.liquidityCandleMapMap[type].get(lastBosSwing) ??
        manager.candles[lastBosSwing];
    let to: Swing = isLastCandle
        ? new Swing({
            index: i,
            time: manager.candles[i].time,
            price: manager.candles[i].close,
        })
        : null;
    let isConfirmed = false;
    let isSwipedLiquidity = false;

    const isTakenOutLiquidity = hasTakenOutLiquidity(
        type,
        liquidityCandle,
        manager.candles[i],
    );
    // Если сделали пересвип тенью
    if (isTakenOutLiquidity) {
        if (showFake) {
            isSwipedLiquidity = true;
            to = new Swing({
                index: i,
                time: manager.candles[i].time,
                price: manager.candles[i].close,
            });
        }
        const isClose = hasClose(type, liquidityCandle, manager.candles[i]);
        // Если закрылись выше прошлой точки
        if (isClose) {
            if (!showFake) {
                to = new Swing({
                    index: i,
                    time: manager.candles[i].time,
                    price: manager.candles[i].close,
                });
            }
            isConfirmed = true;
        } else {
            // Если закрылись ниже а пересвип был - то теперь нужно закрыться выше нового пересвипа
            manager.liquidityCandleMapMap[type].set(lastBosSwing, manager.candles[i]);

            if (showFake) {
                manager.swings[i] = new Swing({
                    side: type,
                    time: manager.candles[i].time,
                    price: manager.candles[i][type],
                    index: i,
                });
                manager.swings[i].markExtremum();

                manager.swings[lastBosSwing].unmarkExtremum();
                manager.deleteIDM.add(lastBosSwing);
            }
        }
    }

    if (!to) {
        return;
    }

    const from = manager.swings[lastBosSwing];
    manager.boses[lastBosSwing] = new Cross({
        from,
        to,
        type,
        isBOS: true,
        isSwipedLiquidity,
        getCandles: () => manager.candles,
        extremum: manager.swings[lastCrossBosSwing],
        isConfirmed,
    });

    if (
        showFake &&
        manager.boses[lastBosSwing].isSwipedLiquidity &&
        manager.boses[lastBosSwing].isConfirmed
    )
        manager.boses[lastBosSwing]?.extremum?.unmarkExtremum();

    manager.deleteIDM.add(lastCrossBosSwing);

    manager.lastBosSwingMapSet[type].delete(lastBosSwing);

    manager.liquidityCandleMapMap[type].delete(lastBosSwing);
};
const hasTakenOutLiquidity = (
    type: 'high' | 'low',
    bossCandle: HistoryObject,
    currentCandle: HistoryObject,
) =>
    type === 'high'
        ? bossCandle.high < currentCandle.high
        : bossCandle.low > currentCandle.low;

const hasClose = (
    type: 'high' | 'low',
    bossCandle: HistoryObject,
    currentCandle: HistoryObject,
) =>
    type === 'high'
        ? bossCandle.high < currentCandle.close
        : bossCandle.low > currentCandle.close;

const deleteInternalBOS = (manager: StateManager) => {
    // TODO Хз надо ли, выглядит ок но финрез хуже
    // Если сужение - удаляем внутренние босы
    // TODO Здесь удаляются IDM которые нужны для LL и HH (которые подтерждаются не босами), нужно их оставлять
    // TODO по хорошему это нужно удалять после объявления тренда
    if (
        manager.swings[manager.prelastBosSwingMap['high']]?.price >
        manager.swings[manager.lastBosSwingMap['high']]?.price &&
        manager.swings[manager.prelastBosSwingMap['low']]?.price <
        manager.swings[manager.lastBosSwingMap['low']]?.price
    ) {
        manager.lastBosSwingMapSet['low'].delete(manager.lastBosSwingMap['low']);
        manager.lastBosSwingMapSet['high'].delete(manager.lastBosSwingMap['high']);

        manager.liquidityCandleMapMap['low'].delete(manager.lastBosSwingMap['low']);
        manager.liquidityCandleMapMap['high'].delete(
            manager.lastBosSwingMap['high'],
        );

        manager.deleteIDM.add(manager.lastBosSwingMap['low']);
        manager.deleteIDM.add(manager.lastBosSwingMap['high']);

        manager.lastBosSwingMap['low'] = manager.prelastBosSwingMap['low'];
        manager.lastBosSwingMap['high'] = manager.prelastBosSwingMap['high'];
    }
};

// Рисует BOS если LL или HH перекрываются
/**
 * @deprecated
 * @param manager
 * @param showFake
 */
export const drawBOS = (manager: StateManager, showFake: boolean = false) => {
    for (let i = 0; i < manager.candles.length; i++) {
        deleteInternalBOS(manager);

        // BOS сверху
        confirmBOS(i, 'high', manager, i === manager.candles.length - 1, showFake);

        // BOS снизу
        confirmBOS(i, 'low', manager, i === manager.candles.length - 1, showFake);

        updateLastSwing(i, 'high', manager);
        updateLastSwing(i, 'low', manager);
    }

    manager.boses
        .filter((b) => b?.type === 'high' && !b?.isIDM)
        .sort((a, b) => a.from.price - b.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    manager.boses[curr.from.index] = null;
                    break;
                }
            }
        });

    manager.boses
        .filter((b) => b?.type === 'low' && !b?.isIDM)
        .sort((a, b) => b.from.price - a.from.price)
        .forEach((curr: any, i, array) => {
            for (let j = 0; j < i; j++) {
                const prev = array[j];
                if (isInternalBOS(curr, prev)) {
                    manager.boses[curr.from.index] = null;
                    break;
                }
            }
        });

    // Удаляем все IDM у которых BOS сформирован
    for (let i = 0; i < manager.boses.length; i++) {
        const b = manager.boses[i];
        if (
            b?.isConfirmed &&
            b?.isIDM &&
            manager.deleteIDM.has(b?.extremum?.index)
        ) {
            manager.boses[i] = null;
        }
    }
};
export const tradinghubCalculateTrendNew = (
    manager: StateManager,
    {showHiddenSwings, showFake}: THConfig,
) => {
    deleteInternalStructure(manager);

    if (!showHiddenSwings) {
        deleteEmptySwings(manager);
    }

    drawBOS(manager, showFake);

    drawTrend(manager);
};

const oneIterationTrend = (manager: StateManager, rootIndex: number) => {
    const curBos = manager.boses[rootIndex];
    const lastBos = manager.lastBos;
    const firstBos = manager.firstBos;

    const log = (...args) => {
        return;
        console.log(args);
    };

    // Если бос ИДМ - просто повторяем тренд который был
    if (curBos && curBos.isIDM && lastBos) {
        const isNewTrend = lastBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {
            time: manager.candles[rootIndex].time,
            trend: isNewTrend,
        };
        log(rootIndex, 'Если бос ИДМ - просто повторяем тренд который был');
        return;
    }

    // Если первый бос/чоч случился а нового пока нет - рисуем тренд первого
    if (lastBos && !firstBos && rootIndex >= lastBos.to.index) {
        const isNewTrend = lastBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {
            time: manager.candles[rootIndex].time,
            trend: isNewTrend,
        };
        log(
            rootIndex,
            'Если первый бос/чоч случился а нового пока нет - рисуем тренд первого',
        );
    }

    // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
    if (
        firstBos &&
        lastBos &&
        lastBos.from.index > firstBos.from.index &&
        lastBos.to.index < firstBos.to.index
    ) {
        manager.boses[lastBos.from.index] = null;
        return;
    }

    // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
    if (
        firstBos &&
        lastBos &&
        firstBos.isConfirmed &&
        lastBos.isConfirmed &&
        firstBos.to.index === lastBos.to.index
    ) {
        manager.boses[lastBos.from.index] = null;
        manager.lastBos = null;
        return;
    }

    // Если есть текущий бос и прошлый, но текущий еще не закончился - рисуем тренд прошлого
    if (firstBos && lastBos && lastBos?.to.index > rootIndex) {
        const isNewTrend = firstBos.type === 'high' ? 1 : -1;
        manager.trend[rootIndex] = {
            time: manager.candles[rootIndex].time,
            trend: isNewTrend,
        };
        log(
            rootIndex,
            'Если есть текущий бос и прошлый, но текущий еще не закончился - рисуем тренд прошлого',
        );
    }

    // Если есть текущий бос и прошлый, но оба еще не закончились - рисуем предыдущий тренд
    if (
        firstBos &&
        lastBos &&
        lastBos?.to.index > rootIndex &&
        firstBos?.to.index > rootIndex &&
        manager.trend[rootIndex - 1]?.trend
    ) {
        manager.trend[rootIndex] = {
            time: manager.candles[rootIndex].time,
            trend: manager.trend[rootIndex - 1]?.trend,
        };
        log(
            rootIndex,
            'Если есть текущий бос и прошлый, но оба еще не закончились - рисуем предыдущий тренд',
        );
    }

    // Если в прошлом был БОС - то нужно рисовать его тренд.
    if (lastBos && rootIndex >= lastBos.to.index) {
        manager.trend[rootIndex] = {
            time: manager.candles[rootIndex].time,
            trend: lastBos.type === 'high' ? 1 : -1,
        };
        log(rootIndex, 'Если в прошлом был БОС - то нужно рисовать его тренд.');
    }

    // Удаляем IDM у точек которые являются босами
    if (
        lastBos &&
        manager.boses[rootIndex]?.isIDM &&
        manager.boses[rootIndex]?.type === lastBos.type
    ) {
        manager.boses[rootIndex] = null;
    }

    // либо первый чоч, либо сменился тренд, либо был фейк чоч и нужно проверить следующий чоч
    const isFirstCHoCH = !lastBos;
    const isTrendChanged = lastBos && curBos && curBos.type !== lastBos.type;
    const isAfterFake =
        Boolean(lastBos) &&
        curBos &&
        Boolean(curBos.isCHoCH) &&
        !curBos.isConfirmed &&
        curBos.type === lastBos.type;
    if (
        curBos &&
        !curBos.isIDM &&
        (isFirstCHoCH ||
            ((isTrendChanged || isAfterFake) && curBos.to.index > lastBos.to.index))
    ) {
        curBos.markCHoCH();
    }

    if (curBos && !curBos.isIDM && curBos.isConfirmed) {
        if (manager.lastBos) {
            manager.firstBos = manager.lastBos;
            log(
                rootIndex,
                'Записали firstBos',
                `${manager.firstBos.from.index} - ${manager.firstBos.to.index}`,
            );
        }
        manager.lastBos = curBos;
        log(
            rootIndex,
            'Записали lastBos',
            `${curBos.from.index} - ${curBos.to.index}`,
        );
    }
};

/**
 * @deprecated
 * TODO
 * Переписать на oneIteration
 * Сравнивать не cur/next а prev/cur
 * Через свинги без фильтрации onlybos
 * @param manager
 */
const drawTrend = (manager: StateManager) => {
    let onlyBOSes = manager.boses.filter(
        (bos) => manager.swings[bos?.from?.index]?.isExtremum,
    );
    for (let i = 0; i < onlyBOSes.length; i++) {
        const prevBos = onlyBOSes[i - 1];
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        let to = !nextBos ? manager.trend.length : nextBos.to.index;
        if (nextBos && !curBos.isConfirmed && !nextBos.isConfirmed) {
            to = manager.trend.length;
        }

        // Если текущий бос внутри предыдущего боса - то текущий бос нужно выпилить и не учитывать в тренде
        if (
            curBos?.from.index > prevBos?.from.index &&
            curBos?.to.index < prevBos?.to.index
        ) {
            manager.boses[curBos.from.index] = null;
            continue;
        }

        for (let j = curBos.to.index; j < to; j++) {
            const type = curBos.type;
            const isNewTrend = curBos.isConfirmed
                ? type === 'high'
                    ? 1
                    : -1
                : manager.trend[j - 1]?.trend;
            manager.trend[j] = {time: manager.candles[j].time, trend: isNewTrend};

            // Удаляем IDM у точек которые являются босами
            if (manager.boses[j]?.isIDM && manager.boses[j]?.type === type) {
                manager.boses[j] = null;
            }
        }

        // либо сменился тренд, либо был фейк чоч, и нужно проверить следующий чоч
        const isTrendChanged = nextBos && curBos.type !== nextBos.type;
        const isAfterFake =
            nextBos &&
            curBos.isCHoCH &&
            !curBos.isConfirmed &&
            curBos.type === nextBos.type;
        if ((isTrendChanged || isAfterFake) && curBos.to.index < nextBos.to.index) {
            nextBos.markCHoCH();
        }
    }

    onlyBOSes = manager.boses
        .filter((bos) => manager.swings[bos?.from?.index]?.isExtremum)
        .sort((a, b) => a.to.index - b.to.index);
    for (let i = 0; i < onlyBOSes.length - 1; i++) {
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        // Если оба боса подтвердились одной свечой, значит второй бос лишний и оставляем самый длинный
        if (
            curBos.isConfirmed &&
            nextBos.isConfirmed &&
            curBos.to.index === nextBos.to.index
        ) {
            manager.boses[nextBos.from.index] = null;
        }
    }
};

export const isIFC = (side: Swing['side'], candle: HistoryObject) => {
    const body = Math.abs(candle.open - candle.close);
    const upWick = candle.high - Math.max(candle.open, candle.close);
    const downWick = Math.min(candle.open, candle.close) - candle.low;

    return (
        (side === 'high' && upWick > body && upWick > downWick) ||
        (side === 'low' && upWick < downWick && body < downWick)
    );
};

/**
 * Проверяет есть ли правый бар внутри левого
 * @param candle
 * @param bar
 */
export const isInsideBar = (candle: HistoryObject, bar: HistoryObject) =>
    candle.high > bar.high && candle.low < bar.low;

export type OrderblockPart = Pick<
    POI,
    | 'side'
    | 'lastOrderblockCandle'
    | 'lastImbalanceCandle'
    | 'firstImbalanceIndex'
    | 'imbalanceIndex'
    | 'startCandle'
>;

const isInternalBOS = (leftBos: Cross, rightBos: Cross) =>
    leftBos.from.index < rightBos.from.index &&
    leftBos.to.index >= rightBos.to.index;
const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) =>
    leftCandle.low > rightCandle.high
        ? 'low'
        : leftCandle.high < rightCandle.low
            ? 'high'
            : null;

export const hasHitOB = (ob: OrderblockPart, candle: HistoryObject) =>
    (ob.side === 'high' && ob.startCandle.low <= candle.high) ||
    (ob.side === 'low' &&
        // Если был прокол
        ob.startCandle.high >= candle.low);
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

const highestBy = <T>(batch: T[], key: keyof T) =>
    batch.reduce((acc, idx, i) => {
        if (!acc && idx) {
            acc = idx;
        } else if (idx && acc[key] < idx[key]) {
            acc = idx;
        }
        return acc;
    }, batch[0]);

const lowestBy = <T>(batch: T[], key: keyof T) =>
    batch.reduce((acc, idx, i) => {
        if (!acc && idx) {
            acc = idx;
        } else if (idx && acc[key] > idx[key]) {
            acc = idx;
        }
        return acc;
    }, batch[0]);

export enum Side {
    Buy = 'buy',
    Sell = 'sell',
}

export type CandleWithSide = HistoryObject & { side: Side };

export const filterNearOrderblock = (
    orderBlocks: POI[],
    currentCandle: HistoryObject,
) =>
    orderBlocks
        .filter(({startCandle: {high, low}, side}) =>
            hasNear(
                true,
                {high, low, side: side === 'high' ? Side.Sell : Side.Buy} as any,
                currentCandle,
            ),
        )
        .filter((ob) =>
            ob.side === 'high'
                ? currentCandle.high < ob.startCandle.high
                : currentCandle.low > ob.startCandle.low,
        )
        .sort((a, b) => {
            const aDiff =
                a.side === 'high'
                    ? a.startCandle.low - currentCandle.high
                    : currentCandle.low - a.startCandle.high;
            const bDiff =
                b.side === 'high'
                    ? b.startCandle.low - currentCandle.high
                    : currentCandle.low - b.startCandle.high;

            return aDiff - bDiff;
        })
        .slice(0, 1);

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

const closestExtremumSwing = (manager: StateManager, swing: Swing) => {
    let index = swing.index - 1;
    while (
        index > -1 &&
        (!manager.swings[index] || !manager.swings[index].isExtremum || manager.swings[index].side === swing.side)
        ) {
        index--;
    }

    return manager.swings[index];
}

const findFirstImbalanceIndex = (manager: StateManager, i: number) => {
    // Сначала ищем индекс свечки с которой будем искать имбаланс.
    // Для этого нужно проверить что следующая свеча после исследуемой - не является внутренней.

    let firstImbalanceIndex = i + 1;
    let firstCandle = manager.candles[i];

    while (isInsideBar(firstCandle, manager.candles[firstImbalanceIndex])) {
        firstImbalanceIndex++;
    }

    return firstImbalanceIndex - 1;
}

const findLastImbalanceIndex = (manager: StateManager, _firstCandle: HistoryObject, firstImbalanceIndex: number, withMove: boolean) => {
    const num = withMove ? 2 : 1;
    const firstImbIndex = firstImbalanceIndex + num;
    let firstCandle = _firstCandle;
    let lastImbalanceIndex = firstImbIndex;

    while (manager.candles[lastImbalanceIndex] && !isImbalance(manager.candles[firstImbalanceIndex], manager.candles[lastImbalanceIndex])) {
        lastImbalanceIndex++;
    }

    if (withMove) {
        firstCandle = manager.candles[firstImbIndex];
        firstImbalanceIndex = firstImbIndex;
    }

    return {
        firstImbalanceIndex,
        firstCandle,
        lastImbalanceIndex,
    }
}

const closestLeftIDMIndex = (manager: StateManager, i: number, side: 'high' | 'low') => {
    let startIndex = i;
    while (startIndex > -1 && (!manager.boses[startIndex]?.isIDM || manager.boses[startIndex].type !== side)) {
        startIndex--;
    }
    if (startIndex === -1) {
        return undefined;
    }
    return startIndex;
}
