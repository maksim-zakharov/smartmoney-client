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

    isSession?: boolean;
    isIDM?: boolean;
    isBOS?: boolean;
    isCHoCH?: boolean;

    isFake?: boolean;
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
        if (this.isSession) {
            if (this.type === 'high') return 'Session High';
            if (this.type === 'low') return 'Session Low';
            return '';
        }
        if (this.isIDM) {
            if (this.isFake) return 'Fake IDM';
            if (this.isConfirmed) return 'IDM';
            return 'Non Confirmed IDM';
        }
        if (this.isBOS) {
            if (this.isFake) return 'Fake BOS';
            if (this.isConfirmed) return 'BOS';
            return 'Non Confirmed BOS';
        }
        if (this.isCHoCH) {
            if (this.isFake) return 'Fake CHoCH';
            if (this.isConfirmed) return 'CHoCH';
            return 'Non Confirmed CHoCH';
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
    lastImbalanceIndex: number;
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
) => {
    // Иногда определяеются несколько ОБ на одной свечке, убираем

    for (let i = 0; i < manager.swings.length; i++) {
        const candle = manager.candles[i];
        const trend = manager.trend[i];
        const swing = manager.swings[i];

        if (swing) {
            manager.calculateOBEXT(swing);
        }
        if(manager.config.tradeEXTIFC)
        manager.calculateEXTIFC(i);

        // manager.calculateIDMIFC(i);
        // manager.calculateOBIDM(i);

        // В этом блоке по всем OB подтверждаем endCandles
        if (newSMT) {
            /**
             * Итерируюсь по свечкам
             * Записываю нахожусь ли я внутри IDM. Если да - то это SMT
             * Записываю новые ОБ и закрываю их если было касание
             */
            manager.obIdxes.forEach((obIdx) => {
                const obItem = manager.pois[obIdx];
                const startPositionIndex = obItem.index + obItem.lastImbalanceIndex;
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
            const startPositionIndex = obItem.index + obItem.lastImbalanceIndex;
            for (let j = startPositionIndex; j < manager.candles.length; j++) {
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
            return ob;
        }
        // Еще не касались
        if(!ob?.endIndex){
            return ob;
        }
        // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
        const obStartIndex = ob?.index;
        const startTrend = manager.trend[obStartIndex]?.trend;
        const endTrend = manager.trend[ob?.endIndex]?.trend;
        // Разный тренд в начале ОБ и в конце ОБ
        if (startTrend !== endTrend) {
            return null;
        }

        const isBuy = endTrend === 1 && ob?.side === 'low';
        const isSell = endTrend === -1 && ob?.side === 'high';

        if (isBuy || isSell) {
            return ob;
        }
        return ob;
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
        showLogs,
        showSession,
        tradeEXTIFC,
    }: THConfig,
) => {
    const manager = new StateManager(data, {showIFC, tradeEXTIFC, showLogs});
    // <-- Копировать в робота
    manager.calculate();

    tradinghubCalculateTrendNew(manager, {
        showHiddenSwings,
        showFake,
        showIFC,
    });

    if (showSession)
        calculateSession(manager);

    // Копировать в робота -->
    let orderBlocks = calculatePOI(manager, withMove, newSMT);

    if (byTrend) {
        // TODO вернуть вот так
        // let currentTrend;
        // if (manager.trend[manager.trend.length - 1]?.trend === 1) {
        //     currentTrend = 'low';
        // }
        // if (manager.trend[manager.trend.length - 1]?.trend === -1) {
        //     currentTrend = 'high';
        // }
        //
        // orderBlocks = orderBlocks.filter((ob) => currentTrend && ob?.side === currentTrend);

        const currentTrend =
            manager.trend[manager.trend.length - 1]?.trend === 1 ? 'low' : 'high';
        orderBlocks = orderBlocks.filter((ob) => ob?.side === currentTrend);
    }

    // Увеличивает на тестинге на 3% винрейт
    orderBlocks = orderBlocks.filter((ob) => [POIType.OB_EXT, POIType.EXT_LQ_IFC].includes(ob?.type));

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
    tradeEXTIFC?: boolean;
    byTrend?: boolean;
    showFake?: boolean;
    showSession?: boolean;
    showLogs?: boolean;
}

export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT;

export const defaultConfig: THConfig = {
    newSMT: false,
    showHiddenSwings: false,
    withMove: false,
    byTrend: true,
    showFake: false,
};

// Точка входа в торговлю
export const calculateProduction = (data: HistoryObject[]) => {
    const config: THConfig = defaultConfig;

    let {orderBlocks} = calculateTesting(data, config);

    return orderBlocks.filter((o) => o?.type === POIType.OB_EXT && (o.tradeOrderType === "limit"  && !o.endCandle) && !o.isSMT);
};

const hasHighValidPullback = (
    leftCandle: HistoryObject,
    currentCandle: HistoryObject,
    nextCandle?: HistoryObject,
) => {
    if (
        // Текущая свеча пересвипнула предыдущую
        leftCandle.high < currentCandle?.high &&
        // И следующий свечи либо нет либо ее хай ниже текущего
        (!nextCandle || nextCandle.high <= currentCandle?.high)
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
    /**
     * Был Вопрос почему тут "="
     * Если представить "свинг слева" как "начало уровня", то
     * "равный минимум" это касание уровня.
     * Пока уровень не пробили - он валиден.
     * И при касании мы не перерисовываем начало уровня.
     * Поэтому это не считается "более низким минимумом", и поэтому >= / <= валидно
     */
    if (
        leftCandle.low > currentCandle?.low &&
        (!nextCandle || nextCandle.low >= currentCandle?.low)
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

    // Добавил это правило, потому что был случай когда между двумя лоями был ПЕРВЫЙ хай,
    // и почему то LL перед хаем удалялся
    // То есть LL - HH - LL - ok, HH - LL - HH - ok
    const HHLLHHCondition = manager.lastExtremumMap[swing.side]?.index > manager.lastExtremumMap[versusSide]?.index;

    // Сначала чистим экстремум. На текущем свинге убираем флаг экстремума
    if (manager.lastExtremumMap[swing.side]
        &&
        (!manager.lastExtremumMap[versusSide] || HHLLHHCondition)) {
        manager.lastExtremumMap[swing.side].unmarkExtremum();
        // Если по нему был IDM - убираем IDM
        if (manager.lastExtremumMap[swing.side].idmSwing)
            manager.boses[manager.lastExtremumMap[swing.side].idmSwing.index] = null;
    }

    if (HHLLHHCondition) {
        // manager.lastExtremumMap[swing.side].idmSwing = manager.lastExtremumMap[swing.side];
        // manager.lastExtremumMap[versusSide].markExtremum();
        // debugger
    }

    // Обновляем новый экстремум и помечаем по нему IDM
    manager.lastExtremumMap[swing.side] = swing;
    if (manager.lastSwingMap[versusSide]) {
        manager.lastExtremumMap[swing.side].idmSwing =
            manager.lastSwingMap[versusSide];
    }
};

/**
 *
 * @param manager
 * @param index По этому индексу получаем свечку для проверки пересвипа ИДМ
 * @param side
 */
const confirmExtremum = (
    manager: StateManager,
    index: number,
    side: Swing['side'],
) => {
    const versusSide = side === 'low' ? 'high' : 'low';
    // Если экстремума нет - не смотрим
    if (!manager.lastExtremumMap[side]) {
        return;
    }
    // Экстремум есть но нет IDM - не смотрим
    if (!manager.lastExtremumMap[side].idmSwing) {
        manager.lastExtremumMap[side].idmSwing = closestSwing(manager, manager.lastExtremumMap[side]);
        if (!manager.lastExtremumMap[side].idmSwing) {
            return;
        }
    }

    // Если на месте IDM он уже подтвержден - не смотрим
    if (manager.boses[manager.lastExtremumMap[side].idmSwing.index]) {
        return;
    }

    const isHighIDMConfirmed =
        (side === 'high' &&
            manager.lastExtremumMap[side].idmSwing.price >
            manager.candles[index]?.low);
    const isLowIDMConfirmed =
        (side === 'low' &&
            manager.lastExtremumMap[side].idmSwing.price <
            manager.candles[index]?.high);

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
    if (manager.lastExtremumMap[side].index !== to.index) {
        manager.boses[from.index] = new Cross({
            from,
            to,
            type: versusSide,
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[side],
            isConfirmed: true,
        });
    }

    // TODO Проблема в том, что если свечка которая закрыла IDM - она по сути должна быть первым HH
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

    // calculatePOI
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
        this.calculateSwings();
    }

    calculateEXTIFC(index: number) {
        if (!this.trend[index]) {
            return;
        }
        // На нисходящем тренде нужно искать IFC сверху, на восходящем - снизу
        const extremumSide = this.trend[index].trend === -1 ? 'high' : 'low';

        // Проверить чтоб это был пинбар
        if (!isIFC(extremumSide, this.candles[index])) {
            return
        }
        const swing = new Swing({
            side: extremumSide,
            time: this.candles[index].time,
            price: this.candles[index][extremumSide],
            index,
        });
        const versusSide = swing.side === 'high' ? 'low' : 'high';
        // @ts-ignore
        const extremum = closestExtremumSwing(this, {...swing, side: versusSide})
        if(!extremum){
            return;
        }
        // Нужно для определения ближайшей цели для TakeProfit
        const takeProfit = closestExtremumSwing(this, swing)

        // Нужно убедиться что между экстремумом и IFC нет других пробитий
        let startHitIndex = index - 1;
        while(startHitIndex > extremum.index){
            if (extremum.side === 'high' &&
                (this.candles[startHitIndex].high > extremum.price
                )
            ) {
                break;
            }

            if (extremum.side === 'low' && (
                this.candles[startHitIndex].low <= extremum.price
            )) {
                break;
            }
            startHitIndex--;
        }

        // Пробитие было
        if(startHitIndex > extremum.index){
            return;
        }

        if (extremum.side === 'high' &&
            (this.candles[index].high <= extremum.price
                || this.candles[index].low >= extremum.price
                || this.candles[index].close >= extremum.price
            )
        ) {
            return;
        }

        if (extremum.side === 'low' && (
            this.candles[index].low >= extremum.price
            || this.candles[index].high <= extremum.price
            || this.candles[index].close <= extremum.price
        )) {
            return;
        }

        const orderBlockPart = {
            startCandle: this.candles[extremum.index],
            lastOrderblockCandle: this.candles[extremum.index],
            lastImbalanceCandle: this.candles[index],
            firstImbalanceIndex: extremum.index,
            lastImbalanceIndex: index,
            side: extremumSide,
        } as OrderblockPart;

        const props: Partial<POI> = {
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTrade: true,
            // Тейк профит до ближайшего максимума
            takeProfit: takeProfit?.price,
            type: POIType.EXT_LQ_IFC,
        }

        // Если index не предпоследний - canTrade false
        if (index !== this.candles.length - 2) {
            props.canTrade = false;
        }

        this.pois[swing.index] = new POI(props);
        console.log(`[${new Date(swing.time * 1000).toISOString()}] EXT_IFC`)

        this.pois[swing.index].endIndex = index;
        this.pois[swing.index].endCandle = this.candles[index];
    }

    calculateOBEXT(swing: Swing) {
        // Нужно для определения ближайшей цели для TakeProfit
        const takeProfit = closestExtremumSwing(this, swing)
        const _firstImbalanceIndex = findFirstImbalanceIndex(this, swing.index);
        try {
            const {
                lastImbalanceIndex,
                firstImbalanceIndex,
                firstCandle
            } = findLastImbalanceIndex(this, swing.index, _firstImbalanceIndex, this.config.withMove);

            const lastImbalanceCandle = this.candles[lastImbalanceIndex];
            const lastOrderblockCandle = this.candles[firstImbalanceIndex];

            // Жестко нужно для БД, не трогать
            const open =
                firstCandle.time === swing.time
                    ? firstCandle.open
                    : lastOrderblockCandle.open;
            const close =
                firstCandle.time !== swing.time
                    ? firstCandle.close
                    : lastOrderblockCandle.close;
            const side =
                lastImbalanceCandle.low > firstCandle.high
                    ? 'low'
                    : lastImbalanceCandle.high < firstCandle.low
                        ? 'high'
                        : null;

            if (!side) {
                return;
            }

            // Здесь по идее нужно создавать "задачу" на поиск ордерблока.
            // И итерироваться в дальшейшем по всем задачам чтобы понять, ордерблок можно создать или пора задачу удалить.
            const orderBlockPart = {
                startCandle: {
                    time: swing.time,
                    open,
                    close,
                    high: Math.max(firstCandle.high, lastOrderblockCandle.high),
                    low: Math.min(firstCandle.low, lastOrderblockCandle.low),
                } as HistoryObject,
                lastOrderblockCandle,
                lastImbalanceCandle,
                firstImbalanceIndex: firstImbalanceIndex - swing.index,
                lastImbalanceIndex: lastImbalanceIndex - swing.index,
                side,
            } as OrderblockPart;

            if (
                orderBlockPart?.side === swing?.side
            ) {
                this.pois[swing.index] = new POI(canTradeExtremumOrderblock(this, swing, orderBlockPart, takeProfit?.price));
                // newSMT
                this.obIdxes.add(swing.index);
            }
        } catch (e) {
            // console.error(e);
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
        if (!bos || bos.isSession) {
            return;
        }

        const orderBlockPart = {
            startCandle: this.candles[lastIDMIndex],
            lastOrderblockCandle: this.candles[lastIDMIndex],
            lastImbalanceCandle: this.candles[index],
            firstImbalanceIndex: lastIDMIndex,
            lastImbalanceIndex: index,
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
            if (!bos || bos.isSession) {
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
            lastImbalanceIndex: index,
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
            confirmExtremum(this, i, 'low');
            confirmExtremum(this, i, 'high');

            updateExtremum(this, i, 'high', this.swings[i]);
            updateExtremum(this, i, 'low', this.swings[i]);

            updateLast(this, this.swings[i]);
        }
    };

    externalCandle?: HistoryObject;

    calculateSwings() {
        let lastSwingIndex: number = -1;
        for (let rootIndex = 0; rootIndex < this.candles.length; rootIndex++) {
            // Тупо первая точка
            if (rootIndex === 0) {
                this.swings[0] = new Swing({
                    side: 'high',
                    time: this.candles[0].time,
                    price: this.candles[0].high,
                    index: 0,
                });
                this.swings[0].markExtremum();
                // this.lastSwingMap[this.swings[0].side] = this.swings[0];
                // this.lastExtremumMap[this.swings[0].side] = this.swings[0];
                // this.lastBosSwingMap[this.swings[0].side] = 0;
                continue;
            }

            // Если текущая свечка внутренняя для предыдущей - идем дальше
            const prevCandle = this.externalCandle ?? this.candles[rootIndex - 1];
            if (isInsideBar(prevCandle, this.candles[rootIndex])) {
                this.externalCandle = prevCandle;
                continue;
            }
            this.externalCandle = null;

            // Если текущая свечка не внутренняя - начинаем поиск свинга
            const currentCandle = this.candles[rootIndex];
            const nextIndex = rootIndex + 1;
            let nextCandle = this.candles[nextIndex];

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

            confirmExtremum(this, rootIndex, 'high');
            confirmExtremum(this, rootIndex, 'low');

            // markHHLL
            updateExtremum(this, rootIndex, 'high', this.swings[rootIndex]);
            updateExtremum(this, rootIndex, 'low', this.swings[rootIndex]);

            // markHHLL
            updateLast(this, this.swings[rootIndex]);

            // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
            filterDoubleSwings(
                rootIndex,
                lastSwingIndex,
                (newIndex) => (lastSwingIndex = newIndex),
                this.swings,
            );

            if (this.config.showIFC) this.markIFCOneIt(rootIndex);
        }
    }
}

/**
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
    let isFake = false;

    const isTakenOutLiquidity = hasTakenOutLiquidity(
        type,
        liquidityCandle,
        manager.candles[i],
    );
    // Если сделали пересвип тенью
    if (isTakenOutLiquidity) {
        if (showFake) {
            isFake = true;
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
        isFake,
        getCandles: () => manager.candles,
        extremum: manager.swings[lastCrossBosSwing],
        isConfirmed,
    });

    if (
        showFake &&
        manager.boses[lastBosSwing].isFake &&
        manager.boses[lastBosSwing].isConfirmed
    )
        manager.boses[lastBosSwing]?.extremum?.unmarkExtremum();

    // TODO Вспомнить зачем это тут было
    // manager.deleteIDM.add(lastCrossBosSwing);

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
        .filter((b) => b?.type === 'high' && !b?.isIDM && !b?.isSession)
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
        .filter((b) => b?.type === 'low' && !b?.isIDM && !b?.isSession)
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
            // manager.boses[i] = null;
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

/**
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
            && prevBos?.isConfirmed
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
                // TODO По сути у точки есть IDM, над IDM есть BOS, и поэтому IDM удалялся (не понятно пока зачем)
                // manager.boses[j] = null;
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
    candle.high > bar?.high && candle.low < bar?.low;

export type OrderblockPart = Pick<
    POI,
    | 'side'
    | 'lastOrderblockCandle'
    | 'lastImbalanceCandle'
    | 'firstImbalanceIndex'
    | 'lastImbalanceIndex'
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
        .filter(Boolean)
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

const closestSwing = (manager: StateManager, swing: Swing) => {
    let index = swing.index - 1;
    while (
        index > -1 &&
        (!manager.swings[index] || manager.swings[index].side === swing.side)
        ) {
        index--;
    }

    return manager.swings[index];
}

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

const findLastImbalanceIndex = (manager: StateManager, _firstCandleIndex: number, firstImbalanceIndex: number, withMove: boolean) => {
    const firstImbIndex = firstImbalanceIndex + 1;
    let firstCandle = manager.candles[_firstCandleIndex];
    let lastImbalanceIndex = firstImbIndex;

    while (manager.candles[lastImbalanceIndex] && !isImbalance(firstCandle, manager.candles[lastImbalanceIndex])) {
        lastImbalanceIndex++;
    }

    // Это на случай если индексы не нашлись
    if (!manager.candles[lastImbalanceIndex]) {
        throw new Error('Не найден конец имбаланса');
    }

    if (withMove) {
        firstCandle = manager.candles[lastImbalanceIndex - 2];
        firstImbalanceIndex = lastImbalanceIndex - 2;
    }

    return {
        firstImbalanceIndex,
        firstCandle,
        lastImbalanceIndex,
    }
}

/**
 * Находит ближайший слева индекс IDM
 * @param manager
 * @param i
 * @param side
 */
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

const canTradeIFC = (manager: StateManager, swing: Swing, orderBlockPart: OrderblockPart, takeProfit?: number) => {
    const props: Partial<POI> = {
        ...orderBlockPart,
        isSMT: false,
        swing,
        canTrade: true,
        // Тейк профит до ближайшего максимума
        takeProfit: takeProfit,
        type: POIType.EXT_LQ_IFC,
    }

    if (!swing.isExtremum) {
        return props;
    }

    let startIDMIndex = swing.index - 1;
    while (startIDMIndex > -1 && (!manager.swings[startIDMIndex] || manager.swings[startIDMIndex].side === swing.side)) {
        startIDMIndex--;
    }

    // Если не нашли ближайший свинг слева - ИДМ нет
    if (startIDMIndex === -1) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Не найден свинг слева`)
        return props;
    }

    props.type = POIType.OB_EXT;

    const idmStartSwing = manager.swings[startIDMIndex];

    // тут IDM свинг найден, теперь надо проверить что он закрылся
    let endIDMIndex = startIDMIndex + 1;
    while (manager.candles[endIDMIndex]
        && ((swing.side === 'high' && idmStartSwing.price <= manager.candles[endIDMIndex].low)
            ||
            (swing.side === 'low' && idmStartSwing.price >= manager.candles[endIDMIndex].high))
        ) {
        endIDMIndex++;
    }

    // Если IDM не подтвержден - не смотрим
    if (!manager.candles[endIDMIndex]) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] IDM не подтвержден`)
        props.canTrade = false;
        return props;
    }

    // Проверяем чтоб LL/HH находились четко между краями IDM
    if (swing.index <= startIDMIndex || swing.index >= endIDMIndex) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Свинг за пределами IDM`)
        props.isSMT = true;
        return props;
    }

    // Берем Индекс закрытия имбаланса и начинаем считать пробитие со следующей свечи
    let hitIndex = swing.index + orderBlockPart.lastImbalanceIndex + 1;

    /**
     * Важно чтобы пробитие было ПОСЛЕ закрытия IDM
     */
    while (
        manager.candles[hitIndex] && !(
            // Прокололи ОБ снизу вверх
            (swing.side === 'high' && orderBlockPart.startCandle.low <= manager.candles[hitIndex].high) ||
            // Прокололи ОБ сверху вниз
            (swing.side === 'low' && orderBlockPart.startCandle.high >= manager.candles[hitIndex].low)
        )
        ) {
        hitIndex++
    }

    // Если пробитие состоялось
    if (manager.candles[hitIndex] || endIDMIndex >= hitIndex) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] пробитие состоялось`)
        props.canTrade = false;
        return props;
    }

    manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] OB_IDM найден`)
    return props;
}

const canTradeExtremumOrderblock = (manager: StateManager, swing: Swing, orderBlockPart: OrderblockPart, takeProfit?: number) => {
    const props: Partial<POI> = {
        ...orderBlockPart,
        isSMT: false,
        swing,
        canTrade: true,
        // Тейк профит до ближайшего максимума
        takeProfit: takeProfit,
        type: POIType.LQ_IFC,
    }

    if (!swing.isExtremum) {
        return props;
    }

    let startIDMIndex = swing.index - 1;
    while (startIDMIndex > -1 && (!manager.swings[startIDMIndex] || manager.swings[startIDMIndex].side === swing.side)) {
        startIDMIndex--;
    }

    // Если не нашли ближайший свинг слева - ИДМ нет
    if (startIDMIndex === -1) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Не найден свинг слева`)
        return props;
    }

    props.type = POIType.OB_EXT;

    const idmStartSwing = manager.swings[startIDMIndex];

    // тут IDM свинг найден, теперь надо проверить что он закрылся
    let endIDMIndex = startIDMIndex + 1;
    while (manager.candles[endIDMIndex]
        && ((swing.side === 'high' && idmStartSwing.price <= manager.candles[endIDMIndex].low)
            ||
            (swing.side === 'low' && idmStartSwing.price >= manager.candles[endIDMIndex].high))
        ) {
        endIDMIndex++;
    }

    // Если IDM не подтвержден - не смотрим
    if (!manager.candles[endIDMIndex]) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] IDM не подтвержден`)
        props.canTrade = false;
        return props;
    }

    // Проверяем чтоб LL/HH находились четко между краями IDM
    if (swing.index <= startIDMIndex || swing.index >= endIDMIndex) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Свинг за пределами IDM`)
        props.isSMT = true;
        return props;
    }

    // Берем Индекс закрытия имбаланса и начинаем считать пробитие со следующей свечи
    let hitIndex = swing.index + orderBlockPart.lastImbalanceIndex + 1;

    /**
     * Важно чтобы пробитие было ПОСЛЕ закрытия IDM
     */
    while (
        manager.candles[hitIndex] && !(
            // Прокололи ОБ снизу вверх
            (swing.side === 'high' && orderBlockPart.startCandle.low <= manager.candles[hitIndex].high) ||
            // Прокололи ОБ сверху вниз
            (swing.side === 'low' && orderBlockPart.startCandle.high >= manager.candles[hitIndex].low)
        )
        ) {
        hitIndex++
    }

    // Если пробитие состоялось
    if (manager.candles[hitIndex] || endIDMIndex >= hitIndex) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] пробитие состоялось`)
        props.canTrade = false;
        return props;
    }

    manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] OB_IDM найден`)
    return props;
}

const calculateSession = (manager: StateManager) => {
    if (!manager.candles.length) {
        return;
    }

    const lastCandle = manager.candles[manager.candles.length - 1];
    const lastCandleDate = new Date(lastCandle.time * 1000);
    const targetDay = lastCandleDate.getUTCDate();
    const targetMonth = lastCandleDate.getUTCMonth();
    const targetYear = lastCandleDate.getUTCFullYear();

    const sessionCandlesIndexes: number[] = [];
    // Идём с конца массива к началу
    for (let i = manager.candles.length - 1; i >= 0; i--) {
        const candle = manager.candles[i];
        const candleDate = new Date(candle.time * 1000);
        if (
            candleDate.getUTCFullYear() === targetYear &&
            candleDate.getUTCMonth() === targetMonth &&
            candleDate.getUTCDate() === targetDay
        ) {
            sessionCandlesIndexes.push(i);
        } else {
            break; // Предполагаем, что массив упорядочен по времени
        }
    }

    if (!sessionCandlesIndexes.length) {
        return
    }

    const sessionHighIndex = sessionCandlesIndexes.reduce((maxIndex, c) => manager.candles[c].high > manager.candles[maxIndex].high ? c : maxIndex, 0);
    const sessionLowIndex = sessionCandlesIndexes.reduce((minIndex, c) => manager.candles[c].low < manager.candles[minIndex].low ? c : minIndex, 0);

    // sessionHigh
    manager.boses[sessionHighIndex] = new Cross({
        from: new Swing({
            index: sessionHighIndex,
            time: manager.candles[sessionHighIndex].time,
            price: manager.candles[sessionHighIndex].high,
        }),
        to: new Swing({
            index: manager.candles.length - 1,
            time: lastCandle.time,
            price: lastCandle.high,
        }),
        type: 'high',
        isSession: true,
        getCandles: () => manager.candles,
    });

    // sessionLow
    manager.boses[sessionLowIndex] = new Cross({
        from: new Swing({
            index: sessionLowIndex,
            time: manager.candles[sessionLowIndex].time,
            price: manager.candles[sessionLowIndex].low,
        }),
        to: new Swing({
            index: manager.candles.length - 1,
            time: lastCandle.time,
            price: lastCandle.low,
        }),
        type: 'low',
        isSession: true,
        getCandles: () => manager.candles,
    });
}
