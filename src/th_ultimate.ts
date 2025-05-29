export interface HistoryObject {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number;
    volume: number;
}

export class Swing {
    side?: 'high' | 'low' | 'double';
    time: number;
    index: number;
    isIFC?: boolean;

    _sidePrice = {
        high: 0,
        low: 0
    };

    protected _isExtremum: boolean = false;

    // Для подсчета на графике, только для тестов
    protected _isDebug: boolean = false;

    constructor(props: Partial<Swing>) {
        Object.assign(this, props);
    }

    get price() {
        if (this.side === 'double')
            return this._sidePrice['high']
        return this._sidePrice[this.side];
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
    isWeekly?: boolean;

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
        if (this.isWeekly) {
            if (this.type === 'high') return 'Weekly High';
            if (this.type === 'low') return 'Weekly Low';
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

    CHOCH_IDM = 'CHOCH_IDM',

    FLIP_IDM = 'FLIP_IDM',

    One_Side_FVG = 'One_Side_FVG',

    Breaking_Block = 'Breaking_Block'
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
    canTest?: boolean;
    canTrade?: boolean;
    reasons?: string[];

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
            case POIType.One_Side_FVG:
                return 'limit';
            case POIType.Breaking_Block:
                return 'limit';
            default:
                return 'limit';
        }
    }

    get text(): string {
        if (this.isSMT) return 'SMT';
        if (this.type === POIType.One_Side_FVG) {
            return '1-Side_FVG';
        }
        if (this.type === POIType.Breaking_Block) {
            return 'BB';
        }
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
        if (this.type === POIType.CHOCH_IDM) {
            return 'CHOCH_IDM';
        }
        if (this.type === POIType.FLIP_IDM) {
            return 'FLIP_IDM';
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
            if (manager.config.tradeCHoCHWithIDM)
                manager.calculateCHoCHWithIDM(swing);
            if (manager.config.tradeFlipWithIDM)
                manager.calculateBOSWithIDM(swing);
            if (manager.config.tradeOBEXT)
                manager.calculateOBEXT(swing);
        }
        if (manager.config.tradeEXTIFC)
            manager.calculateEXTIFC(i);

        if (manager.config.tradeIDMIFC)
            manager.calculateIDMIFC(i);
        if (manager.config.tradeOBIDM)
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
                const startPositionIndex = obItem.index + obItem.lastImbalanceIndex;
                // TODO Тут нужен фильтр на SMT
                if (startPositionIndex <= i && hasHitOB(obItem, candle)) {
                    manager.obIdxes.delete(obIdx);

                    obItem.endCandle = candle;
                    obItem.endIndex = i;
                    obItem.canTrade = false;
                    obItem.canTest = true;

                    if (
                        ['bottom2top', 'top2bottom'].includes(isIFC(obItem.side === 'high' ? obItem.startCandle.low : obItem.startCandle.high, candle)) &&
                        ![POIType.OB_EXT, POIType.OB_IDM].includes(obItem.type)
                    ) {
                        obItem.canTrade = false;
                        obItem.canTest = false;
                    }

                    const trendType = trend?.trend === 1 ? 'low' : 'high';
                    if (!trend || trendType !== obItem.side) {
                        obItem.canTrade = false;
                        obItem.canTest = false;
                        return;
                    }
                }
            });
        }
    }

    // console.log(manager.pois.filter(p => p?.type === POIType.CHOCH_IDM))

    return manager.pois;

    // return manager.pois.map((ob, index) => {
    //     if (!ob) {
    //         return ob;
    //     }
    //     // Либо смотрим тренд по закрытию ОБ либо если закрытия нет - по открытию.
    //     const obStartIndex = ob?.index;
    //     const obIndex = ob?.endIndex || index;
    //     const startTrend = manager.trend[obStartIndex]?.trend;
    //     const trend = manager.trend[obIndex]?.trend;
    //     if (startTrend !== trend) {
    //         return null;
    //     }
    //
    //     const isBuy = trend === 1 && ob?.side === 'low';
    //     const isSell = trend === -1 && ob?.side === 'high';
    //
    //     if (isBuy || isSell) {
    //         return ob;
    //     }
    //     return null;
    // });
};

export const calculateTesting = (
    data: HistoryObject[],
    {
        showHiddenSwings,
        showIFC,
        withMove,
        newSMT,
        showFake,
        showLogs,
        showSession,
        showWeekly,
        tradeEXTIFC,
        tradeIDMIFC,
        tradeCHoCHWithIDM,
        tradeFlipWithIDM,
        tradeOBEXT,
        tradeOBIDM,
        showFVG,
        tradeBB
    }: THConfig,
) => {
    const manager = new StateManager(data, {
        showIFC,
        tradeIDMIFC,
        tradeFlipWithIDM,
        tradeCHoCHWithIDM,
        tradeOBEXT,
        tradeEXTIFC,
        tradeOBIDM,
        showLogs
    });

    // <-- Копировать в робота
    manager.calculateSwings();

    if (showFVG)
        manager.drawFVG();

    tradinghubCalculateTrendNew(manager, {
        showHiddenSwings,
        showFake,
        showIFC,
    });

    if (showSession)
        calculateSession(manager);

    if (showWeekly)
        calculateWeek(manager);

    // Копировать в робота -->
    calculatePOI(manager, withMove, newSMT);

    if (tradeBB)
        manager.calculateBreakerBlocks()

    // Увеличивает на тестинге на 3% винрейт
    let orderBlocks = manager.pois.filter((ob) => ob?.canTest && [POIType.OB_EXT, POIType.EXT_LQ_IFC, POIType.IDM_IFC, POIType.CHOCH_IDM, POIType.FLIP_IDM, POIType.OB_IDM, POIType.One_Side_FVG, POIType.Breaking_Block].includes(ob?.type));

    return {
        swings: manager.swings,
        trend: manager.trend,
        boses: manager.boses,
        orderBlocks,
    };
};

export interface THConfig {
    withMove?: boolean;
    tradeBB?: boolean;
    showHiddenSwings?: boolean;
    newSMT?: boolean;
    showIFC?: boolean;
    tradeEXTIFC?: boolean;
    tradeCHoCHWithIDM?: boolean;
    tradeFlipWithIDM?: boolean;
    tradeOBEXT?: boolean;
    tradeOBIDM?: boolean;
    tradeIDMIFC?: boolean;
    showFake?: boolean;
    showSession?: boolean;
    showWeekly?: boolean;
    showLogs?: boolean;
    showFVG?: boolean;
}

export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT;

export const defaultConfig: THConfig = {
    newSMT: false,
    showHiddenSwings: true,
    withMove: false,
    showFake: false,
    tradeOBEXT: true
};

// Точка входа в торговлю
export const calculateProduction = (data: HistoryObject[]) => {
    const config: THConfig = defaultConfig;

    let {orderBlocks} = calculateTesting(data, config);

    return orderBlocks.filter((o) => o?.type === POIType.OB_EXT && o.canTrade && !o.isSMT);
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

const tryCalculatePullbackMulti = (
    index: number,
    prevCandle: HistoryObject,
    currentCandle: HistoryObject,
    nextCandle: HistoryObject,
    swings: Swing[],
) => {
    // В таком случае нужно проверить что последняя свеча не является внутренней для текущей свечи (пересвипнула снизу)
    const highPullback = hasHighValidPullback(prevCandle, currentCandle, nextCandle);
    const lowPullback = hasLowValidPullback(prevCandle, currentCandle, nextCandle);

    if (!lowPullback && !highPullback) {
        return;
    }

    let side: Swing['side'];
    if (lowPullback) {
        side = 'low'
    }
    if (highPullback) {
        side = 'high'
    }
    if (highPullback && lowPullback) {
        side = 'double';
    }

    const swing = new Swing({
        side,
        time: currentCandle.time,
        _sidePrice: {
            high: currentCandle.high,
            low: currentCandle.low,
        },
        index,
    });

    // А так сделано временно пока нет double, это для того что если на этом свинге у нас уже есть перехай - то не делать перелой, хотя надо бы учитывать
    swings[index] = swing;
};

const tryCalculatePullback = (
    index: number,
    type: 'high' | 'low',
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

    // В таком случае нужно проверить что последняя свеча не является внутренней для текущей свечи (пересвипнула снизу)
    const highPullback = mainFunc(prevCandle, currentCandle, nextCandle);
    const swing = new Swing({
        side: type,
        time: currentCandle.time,
        _sidePrice: {
            high: currentCandle.high,
            low: currentCandle.low,
        },
        index,
    });
    // Так было
    // swings[index] = highPullback ? swing : swings[index];
    // А так сделано временно пока нет double, это для того что если на этом свинге у нас уже есть перехай - то не делать перелой, хотя надо бы учитывать
    swings[index] = highPullback && !swings[index] ? swing : swings[index];
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
        side: from.side,
        _sidePrice: {
            high: manager.candles[index].close,
            low: manager.candles[index].close,
        },
        time: manager.candles[index].time,
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

    calculateCHoCHWithIDM(swing: Swing) {
        /**
         * Сначала найти ЧОЧ
         * От экстремума с ЧОЧ строить EX OB
         * Между Ex OB и касанием ОБ - должен быть противоположный экстремум (с IDM) (наверно один)
         */
        if (!this.trend[swing.index]) {
            return;
        }

        const reasons = [];

        // Просто ищем подтвержденный чоч на этом свинге
        const CHoCH = this.boses.find(b => b && b.extremum?.index === swing.index && b.isCHoCH && b.isConfirmed);
        if (!CHoCH) {
            return;
        }
        reasons.push(`CHoCH ${formatDate(new Date(CHoCH.from.time * 1000))} - ${formatDate(new Date(CHoCH.to.time * 1000))}`)

        // high - продажа, low - покупка
        const obSide = CHoCH.type;

        // После ЧОЧ нужно найти первый подтвержденный справа ПРОТИВПОЛОЖНЫЙ IDM
        const IDM = this.boses.find(b => b && b?.to?.index > CHoCH?.to?.index && b.isIDM && b.isConfirmed && b.from.side !== obSide);
        if (!IDM) {
            return;
        }
        reasons.push(`IDM ${formatDate(new Date(IDM.from.time * 1000))} - ${formatDate(new Date(IDM.to.time * 1000))}`)

        // Теперь надо искать ближайший откат слева от IDM и пытаться там построить OB
        // @ts-ignore
        const OBSwing = closestSwing(this, {...IDM.from, side: IDM.extremum.side});
        if (!OBSwing) {
            return;
        }

        const imbalance = findImbalance(this, OBSwing.index);
        if (!imbalance) {
            return;
        }

        const {firstImbalanceIndex, lastImbalanceIndex} = imbalance;
        const firstCandle = this.candles[firstImbalanceIndex];

        const lastOrderblockCandle = this.candles[firstImbalanceIndex];
        const lastImbalanceCandle = this.candles[lastImbalanceIndex];

        // Жестко нужно для БД, не трогать
        const open =
            firstCandle.time === OBSwing.time
                ? firstCandle.open
                : lastOrderblockCandle.open;
        const close =
            firstCandle.time !== OBSwing.time
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
                time: firstCandle.time,
                open,
                close,
                high: Math.max(firstCandle.high, lastOrderblockCandle.high),
                low: Math.min(firstCandle.low, lastOrderblockCandle.low),
            } as HistoryObject,
            lastOrderblockCandle,
            lastImbalanceCandle,
            firstImbalanceIndex: firstImbalanceIndex - OBSwing.index,
            lastImbalanceIndex: lastImbalanceIndex - OBSwing.index,
            side,
        } as OrderblockPart;

        if (
            orderBlockPart?.side === OBSwing?.side
        ) {
            // debugger

            // Нужно для определения ближайшей цели для TakeProfit
            const takeProfit = IDM.extremum

            this.pois[OBSwing.index] = new POI(canTradeCHoCHExtremumOrderblock(this, OBSwing, CHoCH, IDM, orderBlockPart, takeProfit?.price));
            this.pois[OBSwing.index].type = POIType.CHOCH_IDM
            this.pois[OBSwing.index].reasons.unshift(...imbalance.reasons);
            this.pois[OBSwing.index].reasons.unshift(...reasons);
        }
    }

    calculateBOSWithIDM(swing: Swing) {
        /**
         * Сначала найти ЧОЧ
         * От экстремума с ЧОЧ строить EX OB
         * Между Ex OB и касанием ОБ - должен быть противоположный экстремум (с IDM) (наверно один)
         */
        if (!this.trend[swing.index]) {
            return;
        }

        const reasons = [];

        // Просто ищем подтвержденный BOS на этом свинге
        const BOS = this.boses.find(b => b && b.extremum?.index === swing.index && b.isBOS && b.isConfirmed);
        if (!BOS) {
            return;
        }
        reasons.push(`BOS ${formatDate(new Date(BOS.from.time * 1000))} - ${formatDate(new Date(BOS.to.time * 1000))}`)

        // high - продажа, low - покупка
        const obSide = BOS.type;

        // После BOS нужно найти первый подтвержденный справа ПРОТИВПОЛОЖНЫЙ IDM
        const IDM = this.boses.find(b => b && b?.to?.index > BOS?.to?.index && b.isIDM && b.isConfirmed && b.from.side !== obSide);
        if (!IDM) {
            return;
        }
        reasons.push(`IDM ${formatDate(new Date(IDM.from.time * 1000))} - ${formatDate(new Date(IDM.to.time * 1000))}`)

        // Теперь надо искать ближайший откат слева от IDM и пытаться там построить OB
        // @ts-ignore
        const OBSwing = closestSwing(this, {...IDM.from, side: IDM.extremum.side});
        if (!OBSwing) {
            return;
        }

        const imbalance = findImbalance(this, OBSwing.index);
        if (!imbalance) {
            return;
        }

        const {firstImbalanceIndex, lastImbalanceIndex} = imbalance;
        const firstCandle = this.candles[firstImbalanceIndex];

        const lastOrderblockCandle = this.candles[firstImbalanceIndex];
        const lastImbalanceCandle = this.candles[lastImbalanceIndex];

        // Жестко нужно для БД, не трогать
        const open =
            firstCandle.time === OBSwing.time
                ? firstCandle.open
                : lastOrderblockCandle.open;
        const close =
            firstCandle.time !== OBSwing.time
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
                time: firstCandle.time,
                open,
                close,
                high: Math.max(firstCandle.high, lastOrderblockCandle.high),
                low: Math.min(firstCandle.low, lastOrderblockCandle.low),
            } as HistoryObject,
            lastOrderblockCandle,
            lastImbalanceCandle,
            firstImbalanceIndex: firstImbalanceIndex - OBSwing.index,
            lastImbalanceIndex: lastImbalanceIndex - OBSwing.index,
            side,
        } as OrderblockPart;

        if (
            orderBlockPart?.side === OBSwing?.side
        ) {
            // debugger

            // Нужно для определения ближайшей цели для TakeProfit
            const takeProfit = IDM.extremum

            this.pois[OBSwing.index] = new POI(canTradeCHoCHExtremumOrderblock(this, OBSwing, BOS, IDM, orderBlockPart, takeProfit?.price));
            this.pois[OBSwing.index].type = POIType.FLIP_IDM
            this.pois[OBSwing.index].reasons.unshift(...imbalance.reasons);
            this.pois[OBSwing.index].reasons.unshift(...reasons);
        }
    }

    /**
     * Внимание! Свеча IFC свипает хай (по наблюдениям),
     * при этом открытие может быть внутри HH свечи или внутри ОБ, это не важно.
     * @param index
     */
    calculateEXTIFC(index: number) {
        if (!this.trend[index]) {
            return;
        }
        // На нисходящем тренде нужно искать IFC сверху, на восходящем - снизу
        const extremumSide = this.trend[index].trend === -1 ? 'high' : 'low';

        const swing = new Swing({
            side: extremumSide,
            time: this.candles[index].time,
            price: this.candles[index][extremumSide],
            index,
        });
        const versusSide = swing.side === 'high' ? 'low' : 'high';
        // @ts-ignore
        const extremum = closestExtremumSwing(this, {...swing, side: versusSide})
        if (!extremum) {
            return;
        }

        // Проверить чтоб это был пинбар
        if (!['bottom2top', 'top2bottom'].includes(isIFC(extremum.price, this.candles[index]))) {
            return
        }

        // Нужно для определения ближайшей цели для TakeProfit
        const takeProfit = closestExtremumSwing(this, swing)

        // Нужно убедиться что между экстремумом и IFC нет других пробитий
        let startHitIndex = index - 1;
        while (startHitIndex > extremum.index) {
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
        if (startHitIndex > extremum.index) {
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
            // Указываем экстремум который пробила свеча IFC
            startCandle: {
                ...this.candles[extremum.index],
                // Это нужно для стопа, если свипнули хай - стоп должен быть за хаем свипа, если лоу - за лоем свипа
                high: extremum.side === 'high' ? Math.max(this.candles[extremum.index].high, this.candles[index].high) : this.candles[extremum.index].high,
                low: extremum.side === 'low' ? Math.min(this.candles[extremum.index].low, this.candles[index].low) : this.candles[extremum.index].low,
            },
            // Указываем индекс экстремума
            firstImbalanceIndex: extremum.index,
            lastOrderblockCandle: this.candles[extremum.index],
            // Здесь просто указываем свечу IFC
            lastImbalanceCandle: this.candles[index],
            // Здесь просто указываем индекс IFC
            lastImbalanceIndex: index,
            // Указываем направление экстремума: high - на продажу, low - на покупку
            side: extremumSide,
        } as OrderblockPart;

        const props: Partial<POI> = {
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTrade: true,
            canTest: true,
            // Тейк профит до ближайшего максимума
            takeProfit: takeProfit?.price,
            type: POIType.EXT_LQ_IFC,
        }

        // Если index не предпоследний - canTrade false
        if (index !== this.candles.length - 2) {
            props.canTrade = false;
        }

        this.pois[swing.index] = new POI(props);

        this.pois[swing.index].endCandle = this.candles[swing.index];
        this.pois[swing.index].endIndex = swing.index;
        this.pois[swing.index].reasons = [];
        this.pois[swing.index].textTime = swing.time;

        // debugger
        console.log(`[${new Date(swing.time * 1000).toISOString()}] EXT_IFC`)

        this.pois[swing.index].endIndex = index;
        this.pois[swing.index].endCandle = this.candles[index];
    }

    calculateOBEXT(swing: Swing) {
        // Нужно для определения ближайшей цели для TakeProfit
        const takeProfit = closestExtremumSwing(this, swing)
        let takeProfitPrice = takeProfit?.price;

        const imbalance = findImbalance(this, swing.index);
        if (!imbalance) {
            return;
        }

        const {firstImbalanceIndex, lastImbalanceIndex} = imbalance;
        const firstCandle = this.candles[firstImbalanceIndex];

        // const _firstImbalanceIndex = findFirstImbalanceIndex(this, swing.index);
        try {
            // const {
            //     lastImbalanceIndex,
            //     firstImbalanceIndex,
            //     firstCandle
            // } = findLastImbalanceIndex(this, swing.index, _firstImbalanceIndex, this.config.withMove);

            const lastOrderblockCandle = this.candles[firstImbalanceIndex];
            const lastImbalanceCandle = this.candles[lastImbalanceIndex];

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
                    time: firstCandle.time,
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

            /**
             * В случае торговли по тренду может быть такое что слева нет точки которая будет тейк профитом
             */
            const isBuyAndLowTakeProfit = side === 'low' && takeProfitPrice <= orderBlockPart.startCandle.high;
            const isSellAndHighTakeProfit = side === 'high' && takeProfitPrice >= orderBlockPart.startCandle.low;
            if (isBuyAndLowTakeProfit || isSellAndHighTakeProfit) {
                const openPrice = side === 'low' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
                const stopLoss = side === 'high' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
                const bodyPrice = Math.abs(openPrice - stopLoss);
                const RR = 4;
                takeProfitPrice = side === 'low' ? openPrice + bodyPrice * RR : openPrice - bodyPrice * RR;
            }

            if (
                orderBlockPart?.side === swing?.side && !this.pois[swing.index]
            ) {
                this.pois[swing.index] = new POI(canTradeExtremumOrderblock(this, swing, orderBlockPart, takeProfitPrice));

                if (this.pois[swing.index].canTest) {
                    let endIndex = this.pois[swing.index].endIndex || this.candles.length - 1;
                    let maxTakeProfitBetween = takeProfitPrice;
                    let startIndex = swing.index;
                    // while (startIndex <= endIndex) {
                    //     const buyTake = maxTakeProfitBetween > this.candles[startIndex].high ? maxTakeProfitBetween : this.candles[startIndex].high;
                    //     const sellTake = maxTakeProfitBetween < this.candles[startIndex].low ? maxTakeProfitBetween : this.candles[startIndex].low;
                    //     maxTakeProfitBetween = side === 'low' ? buyTake : sellTake;
                    //     startIndex++;
                    // }
                    // this.pois[swing.index].takeProfit = maxTakeProfitBetween;

                    // Если между тейкпрофитом и касанием есть хай выше - не торгуем
                    while (startIndex <= endIndex) {
                        const buyTake = side === 'low' && maxTakeProfitBetween < this.candles[startIndex].high;
                        const sellTake = side === 'high' && maxTakeProfitBetween > this.candles[startIndex].low;
                        if (sellTake || buyTake) {
                            this.pois[swing.index].canTrade = false;
                            this.pois[swing.index].canTest = false;
                            break;
                        }
                        startIndex++;
                    }
                }

                this.pois[swing.index].reasons.unshift(...imbalance.reasons);
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
        if (!bos?.isIDM) {
            return;
        }

        const lastIDMCandle = this.candles[lastIDMIndex]

        // IDM Есть и он подтвержден свечой IFC
        const isConfirmedByIFC =
            bos?.isConfirmed &&
            bos.to.index === index &&
            ['bottom2top', 'top2bottom'].includes(isIFC(bos.from.price, this.candles[bos.to.index]));

        if (!isConfirmedByIFC) {
            return;
        }

        // Нужно убедиться что между экстремумом и IFC нет других пробитий
        let startHitIndex = index - 1;
        while (startHitIndex > lastIDMIndex) {
            if (idmSide === 'high' &&
                (this.candles[startHitIndex].high > lastIDMCandle[idmSide]
                )
            ) {
                break;
            }

            if (idmSide === 'low' && (
                this.candles[startHitIndex].low <= lastIDMCandle[idmSide]
            )) {
                break;
            }
            startHitIndex--;
        }

        // Пробитие было
        if (startHitIndex > lastIDMIndex) {
            return;
        }

        if (idmSide === 'high' &&
            (this.candles[index].high <= lastIDMCandle[idmSide]
                || this.candles[index].low >= lastIDMCandle[idmSide]
                || this.candles[index].close >= lastIDMCandle[idmSide]
            )
        ) {
            return;
        }

        if (idmSide === 'low' && (
            this.candles[index].low >= lastIDMCandle[idmSide]
            || this.candles[index].high <= lastIDMCandle[idmSide]
            || this.candles[index].close <= lastIDMCandle[idmSide]
        )) {
            return;
        }

        const orderBlockPart = {
            // Указываем IDM который пробила свеча IFC
            startCandle: {
                ...lastIDMCandle,
                // Это нужно для стопа, если свипнули хай - стоп должен быть за хаем свипа, если лоу - за лоем свипа
                high: idmSide === 'high' ? Math.max(this.candles[lastIDMIndex].high, this.candles[index].high) : this.candles[lastIDMIndex].high,
                low: idmSide === 'low' ? Math.min(this.candles[lastIDMIndex].low, this.candles[index].low) : this.candles[lastIDMIndex].low,
            },
            // Указываем индекс IDM
            firstImbalanceIndex: lastIDMIndex,
            lastOrderblockCandle: lastIDMCandle,
            // Здесь просто указываем свечу IFC
            lastImbalanceCandle: this.candles[index],
            // Здесь просто указываем индекс IFC
            lastImbalanceIndex: index,
            side: idmSide,
        } as OrderblockPart;

        const swing = this.swings[lastIDMIndex];
        if (!swing) {
            return;
        }

        const props: Partial<POI> = {
            ...orderBlockPart,
            isSMT: false,
            swing,
            canTrade: true,
            canTest: true,
            // Тейк профит до ближайшего максимума
            takeProfit: bos.extremum.price,
            type: POIType.IDM_IFC,
            endCandle: this.candles[index],
            endIndex: index,
            reasons: [],
            textTime: this.candles[index].time
        }

        this.pois[index] = new POI(props);
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
            if (!bos || bos.isSession || bos.isWeekly) {
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
            type: POIType.OB_IDM,
            // ['bottom2top', 'top2bottom'].includes(isIFC(orderBlockPart.side === 'high' ? orderBlockPart.startCandle.low : orderBlockPart.startCandle.high, this.candles[index]))
            //     ? POIType.OB_IDM_IFC
            //     : POIType.OB_IDM,
            endCandle: this.candles[index],
            endIndex: index,
        });
    }

    markIFCOneIt = (index: number) => {
        const bos = this.swings[index];
        if (bos && ['bottom2top', 'top2bottom'].includes(isIFC(bos.price, this.candles[bos.index]))) {
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

    drawFVG() {
        for (let i = 2; i < this.candles.length; i++) {
            const firstCandle = this.candles[i - 2];
            const middleCandle = this.candles[i];
            const lastCandle = this.candles[i];

            const isBullishOneSide = isBullish(firstCandle) && isBullish(middleCandle) && isBullish(lastCandle) && firstCandle.close < middleCandle.close
            const isBearishOneSide = isBearish(firstCandle) && isBearish(middleCandle) && isBearish(lastCandle) && firstCandle.close > middleCandle.close

            const oneSide = isBullishOneSide || isBearishOneSide

            if (!oneSide) {
                continue;
            }

            if (!isImbalance(firstCandle, lastCandle)) {
                continue
            }

            const side = firstCandle.high < lastCandle.low ? 'low' : 'high';

            const orderBlockPart = {
                startCandle: {
                    ...firstCandle,
                    open: side === 'low' ? firstCandle.high : firstCandle.low,
                    low: side === 'low' ? firstCandle.high : firstCandle.low,
                    close: side === 'low' ? lastCandle.low : lastCandle.high,
                    high: side === 'low' ? lastCandle.low : lastCandle.high,
                },
                lastOrderblockCandle: lastCandle,
                lastImbalanceCandle: lastCandle,
                firstImbalanceIndex: i - 2,
                lastImbalanceIndex: i,
                side,
            } as OrderblockPart;

            const swing = new Swing({
                side,
                time: firstCandle.time,
                _sidePrice: firstCandle,
                index: i - 2,
            })

            // Нужно для определения ближайшей цели для TakeProfit
            const takeProfit = closestExtremumSwing(this, swing)

            this.pois[i - 2] = new POI({
                ...orderBlockPart,
                isSMT: false,
                swing,
                canTrade: false,
                canTest: true,
                // Тейк профит до ближайшего максимума
                takeProfit: takeProfit?.price,
                type: POIType.One_Side_FVG,
                reasons: [],
                // endCandle: lastCandle,
                // endIndex: i
            });

            const obItem = this.pois[i - 2];

            for (let j = i + 1; j < this.candles.length; j++) {
                const candle = this.candles[j];
                if (hasHitOB(obItem, candle)) {
                    obItem.endCandle = candle;
                    obItem.endIndex = j;
                    break;
                }
            }
        }
    }

    calculateBreakerBlocks() {
        /**
         * Уровни перед разворотными ликвидностями
         * Появляются в ключевые моменты дня когда ожидаем всплеск ликвидности
         * Самый мощный инструмент
         * Формируется перед всплеском ликвидности
         * На бычьем рынке - BB строится сверху (как OB) на медвежьем - снизу. По сути контртренд
         * Нужно чтобы цена пробила BB и закрылась выше (на бычьем) или ниже (на медвежьем)
         * Сразу после этого можно искать лонги или шорты
         */

        for (let i = 0; i < this.candles.length; i++) {
            const swing = this.swings[i];
            if (!swing)
                continue;

            if (!swing.isExtremum)
                continue;

            const trend = this.trend[i];
            if (!trend)
                continue;

            // -1 - Продажа, 1 - Покупка
            const trendSide = trend.trend === -1 ? 'high' : 'low';
            if (swing.side === trendSide)
                continue;

            const candle = this.candles[i];

            const orderBlockPart = {
                startCandle: candle,
                lastOrderblockCandle: candle,
                lastImbalanceCandle: candle,
                firstImbalanceIndex: i,
                lastImbalanceIndex: i,
                side: swing.side,
                isSMT: false,
                swing,
                canTrade: false,
                canTest: true,
                type: POIType.Breaking_Block,
                reasons: []
            } as Partial<POI>;

            for (let j = i + 1; j < this.candles.length; j++) {
                const needBuy = orderBlockPart.side === 'high';
                const needSell = orderBlockPart.side === 'low';
                const closeAbove = needBuy && this.candles[j].close > orderBlockPart.startCandle.high;
                const closeBelow = needSell && this.candles[j].close < orderBlockPart.startCandle.low;

                if (closeAbove || closeBelow) {
                    // @ts-ignore
                    this.pois[swing.index] = new POI(orderBlockPart);

                    for (let k = j + 1; k < this.candles.length; k++) {
                        const hitToBuy = needBuy && this.candles[k].low < orderBlockPart.startCandle.high;
                        const hitToSell = needSell && this.candles[k].high > orderBlockPart.startCandle.low;

                        if (hitToBuy || hitToSell) {
                            const takeProfit = closestExtremumSwing(this, new Swing({
                                index: k,
                                time: this.candles[k].time,
                                _sidePrice: {
                                    high: this.candles[k].close,
                                    low: this.candles[k].close,
                                },
                            }));
                            this.pois[swing.index].takeProfit = takeProfit?.price;

                            if ((needBuy && takeProfit?.price <= orderBlockPart.startCandle.high) || (needSell && takeProfit?.price >= orderBlockPart.startCandle.low)) {
                                const openPrice = orderBlockPart.side === 'high' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
                                const stopLoss = orderBlockPart.side === 'low' ? orderBlockPart.startCandle.high : orderBlockPart.startCandle.low;
                                const body = Math.abs(openPrice - stopLoss);
                                this.pois[swing.index].takeProfit = orderBlockPart.side === 'high' ? openPrice + body * 5 : openPrice - body * 5;
                            }
                            this.pois[swing.index].endIndex = k;
                            this.pois[swing.index].endCandle = this.candles[k];
                            break;
                        }
                    }

                    break;
                }
            }
        }
    }

    calculateSwings() {
        let lastSwingIndex: number = -1;
        for (let i = 0; i < this.candles.length; i++) {
            // Тупо первая точка
            if (i === 0) {
                this.swings[0] = new Swing({
                    side: 'high',
                    time: this.candles[0].time,
                    _sidePrice: this.candles[0],
                    index: 0,
                });
                this.swings[0].markExtremum();
                continue;
            }

            // Если текущая свечка внутренняя для предыдущей - идем дальше
            const prevCandle = this.externalCandle ?? this.candles[i - 1];
            if (isInsideBar(prevCandle, this.candles[i])) {
                this.externalCandle = prevCandle;
                continue;
            }
            this.externalCandle = null;

            // Если текущая свечка не внутренняя - начинаем поиск свинга
            const currentCandle = this.candles[i];
            const nextIndex = i + 1;
            let nextCandle = this.candles[nextIndex];

            nextCandle = this.candles[nextIndex];

            tryCalculatePullback(
                i,
                'high',
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );
            tryCalculatePullback(
                i,
                'low',
                prevCandle,
                currentCandle,
                nextCandle,
                this.swings,
            );

            // tryCalculatePullbackMulti(
            //     i,
            //     prevCandle,
            //     currentCandle,
            //     nextCandle,
            //     this.swings
            // )

            confirmExtremum(this, i, 'high');
            confirmExtremum(this, i, 'low');

            // markHHLL
            updateExtremum(this, i, 'high', this.swings[i]);
            updateExtremum(this, i, 'low', this.swings[i]);

            // markHHLL
            updateLast(this, this.swings[i]);

            // фильтруем вершины подряд. Просто итерируемся по свингам, если подряд
            filterDoubleSwings(
                i,
                lastSwingIndex,
                (newIndex) => (lastSwingIndex = newIndex),
                this.swings,
            );

            if (this.config.showIFC) this.markIFCOneIt(i);
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
            _sidePrice: {
                high: manager.candles[i].close,
                low: manager.candles[i].close,
            },
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
                _sidePrice: {
                    high: manager.candles[i].close,
                    low: manager.candles[i].close,
                },
            });
        }
        const isClose = hasClose(type, liquidityCandle, manager.candles[i]);
        // Если закрылись выше прошлой точки
        if (isClose) {
            if (!showFake) {
                to = new Swing({
                    index: i,
                    time: manager.candles[i].time,
                    _sidePrice: {
                        high: manager.candles[i].close,
                        low: manager.candles[i].close,
                    },
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
        .filter((b) => b?.type === 'high' && !b?.isIDM && !b?.isSession && !b?.isWeekly)
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
        .filter((b) => b?.type === 'low' && !b?.isIDM && !b?.isSession && !b?.isWeekly)
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
    let endlessTrend = false;
    for (let i = 0; i < onlyBOSes.length; i++) {
        const prevBos = onlyBOSes[i - 1];
        const curBos = onlyBOSes[i];
        const nextBos = onlyBOSes[i + 1];

        let to = !nextBos ? manager.trend.length : nextBos.to.index;
        if (nextBos && !curBos.isConfirmed && !nextBos.isConfirmed) {
            to = manager.trend.length;
        }

        if (!curBos.isConfirmed) {
            endlessTrend = true
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

        const type = curBos.type;
        const side = type === 'high' ? 1 : -1

        for (let j = curBos.to.index; j < to; j++) {
            manager.trend[j] = {
                time: manager.candles[j].time,
                trend: curBos.isConfirmed && !endlessTrend ? side : manager.trend[j - 1]?.trend
            };

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

// Является ли candle - IFC свечой
/**
 * Проверяем пробила ли свеча candle цену price и закрепилась ниже/выше пробития
 * @param crossPrice
 * @param candle
 */
export const isIFC = (crossPrice: number, candle: HistoryObject): 'inside' | 'outside' | 'bottom2top' | 'top2bottom' => {
    const maxBodyPrice = Math.max(candle.open, candle.close);
    const minBodyPrice = Math.min(candle.open, candle.close);

    if (crossPrice >= maxBodyPrice && crossPrice <= candle.high) {
        // Пробила снизу вверх (IFC)
        return 'bottom2top'
    }

    if (crossPrice <= minBodyPrice && crossPrice >= candle.low) {
        // Пробила сверху вниз (IFC)
        return 'top2bottom'
    }

    if (crossPrice > candle.high || crossPrice < candle.low) {
        // Цена вне свечи != IFC
        return 'outside'
    }

    // Свеча внутри тела != IFC
    return 'inside'
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

export const hasHitOB = (ob: Partial<POI>, candle: HistoryObject) =>
    (ob.side === 'high' && ob.startCandle.low <= candle.high) ||
    (ob.side === 'low' &&
        // Если был прокол
        ob.startCandle.high >= candle.low);

export const notTradingTime = (candle: HistoryObject) => {
    const hours = new Date(candle.time * 1000).getHours();
    const minutes = new Date(candle.time * 1000).getMinutes();

    // Открытие утреннего аукциона
    if (hours > 1 && hours < 7) {
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
    minStep?: number,
) =>
    orderBlocks
        .filter(Boolean)
        .filter(({startCandle: {high, low}, side}) =>
            hasNear(
                {high, low, side: side === 'high' ? Side.Sell : Side.Buy} as any,
                currentCandle,
                minStep,
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
    {high, low, side}: CandleWithSide,
    currentCandle: HistoryObject,
    minStep?: number,
) => {
    if (minStep) {
        // Максимум в стакане - 50ж
        const steps = 30;
        const stepsRange = minStep * steps;

        // Разница между закрытием свечи точки входа и хай текущей свечи меньше либо равна 40 шагам цены
        if (side === Side.Sell && low - currentCandle.close <= stepsRange) {
            return true;
        }
        // Разница между хай свечи точки входа и закрытием текущей свечи меньше либо равна 40 шагам цены
        if (side === Side.Buy && currentCandle.close - high <= stepsRange) {
            return true;
        }
    } else {
        // Близость к цене 0.7%
        const price = 1.006;
        if (side === Side.Sell && low / currentCandle.high <= price) {
            return true;
        }
        if (side === Side.Buy && currentCandle.low / high <= price) {
            return true;
        }
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

function findImbalance(manager: StateManager, firstCandleIndex: number): {
    firstImbalanceIndex: number;
    lastImbalanceIndex: number,
    reasons: string[]
} | null {
    let reasons: string[] = [];

    // Индекс начальной свечи имбаланса
    let i = firstCandleIndex;

    while (i < manager.candles.length - 2) {
        // Индекс средней свечи имбаланса
        let j = i + 1;

        // Пропускаем все внутренние свечи относительно i
        while (j < manager.candles.length && isInsideBar(manager.candles[i], manager.candles[j])) {
            reasons.push(`Свеча ${formatDate(new Date(manager.candles[j].time * 1000))} внутренняя для ${formatDate(new Date(manager.candles[i].time * 1000))}`)
            j++;
        }
        // Проверяем границы массива после поиска j
        if (j >= manager.candles.length - 1) break;

        reasons.push(`Свеча ${formatDate(new Date(manager.candles[j].time * 1000))} не внутренняя для ${formatDate(new Date(manager.candles[i].time * 1000))}`)

        // Индес последней свечи имбаланса
        let k = j + 1;

        // Пропускаем все внутренние свечи относительно j
        while (k < manager.candles.length && isInsideBar(manager.candles[j], manager.candles[k])) {
            reasons.push(`Свеча ${formatDate(new Date(manager.candles[k].time * 1000))} внутренняя для ${formatDate(new Date(manager.candles[j].time * 1000))}`)
            k++;
        }
        // Проверяем границы массива после поиска j
        if (k >= manager.candles.length - 1) break;

        // Проверяем имбаланс между i и k
        if (isImbalance(manager.candles[i], manager.candles[k])) {
            reasons.push(`Имбаланс есть: ${formatDate(new Date(manager.candles[i].time * 1000))} | ${formatDate(new Date(manager.candles[k].time * 1000))}`)
            return {firstImbalanceIndex: i, lastImbalanceIndex: k, reasons};
        } else {
            // Если имбаланса нет, продолжаем поиск с новой начальной свечи
            reasons.push(`Имбаланса нет: ${formatDate(new Date(manager.candles[i].time * 1000))} | ${formatDate(new Date(manager.candles[k].time * 1000))}`)
            i = j;
        }
    }

    return null;
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
const canTradeCHoCHExtremumOrderblock = (manager: StateManager, swing: Swing, CHoCH: Cross, IDM: Cross, orderBlockPart: OrderblockPart, takeProfit?: number) => {
    const props: Partial<POI> = {
        ...orderBlockPart,
        isSMT: false,
        swing,
        canTrade: true,
        canTest: true,
        // Тейк профит до ближайшего максимума
        takeProfit: takeProfit,
        type: POIType.LQ_IFC,
        reasons: []
    }

    const idmStartSwing = CHoCH.from;

    // Берем Индекс закрытия имбаланса и начинаем считать пробитие со следующей свечи
    let hitIndex = swing.index + orderBlockPart.lastImbalanceIndex + 1;

    /**
     * Важно чтобы пробитие было ПОСЛЕ закрытия IDM
     */
    while (
        manager.candles[hitIndex] && !hasHitOB(props, manager.candles[hitIndex])) {
        hitIndex++
    }

    const IDMEndTrend = manager.trend[IDM.to.index]?.trend;
    if (!IDMEndTrend) {
        props.canTrade = false;
        props.canTest = false;
        props.reasons.push(`Тренд отсутствует`)
        return props;
    }

    const isBuy = IDMEndTrend === -1 && props?.side === 'high';
    const isSell = IDMEndTrend === 1 && props?.side === 'low';

    // Если тренд лонг а ОБ в шорт, или тренд в шорт а ОБ в лонг - не торгуем и не тестируем
    if (isBuy && isSell) {
        props.canTrade = false;
        props.canTest = false;
        props.reasons.push(`ОБ по тренду: Тренд: ${IDMEndTrend === 1 ? 'Бычий' : IDMEndTrend === -1 ? 'Медвежий' : 'undefined'} Направление ОБ: ${props?.side === 'low' ? 'Продажа' : 'Покупка'}`)
        return props;
    }

    if (hitIndex && IDM.to.index > hitIndex) {
        props.canTrade = false;
        props.canTest = false;
        props.reasons.push(`Пробитие ${formatDate(new Date(manager.candles[hitIndex].time * 1000))} было раньше чем подтверждение IDM ${formatDate(new Date(manager.candles[IDM.to.index].time * 1000))}`)
        return props;
    }

    // Если пробитие состоялось
    if (manager.candles[hitIndex]) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] пробитие состоялось`)
        props.canTrade = false;
        props.endCandle = manager.candles[hitIndex];
        props.endIndex = hitIndex;
        props.reasons.push(`Есть пробитие: ${formatDate(new Date(manager.candles[hitIndex].time * 1000))}`)
        if (CHoCH?.to?.index >= hitIndex) {
            props.isSMT = true;
            props.reasons.push(`SMT: Находимся между ${formatDate(new Date(manager.candles[CHoCH?.from?.index].time * 1000))} и ${formatDate(new Date(manager.candles[CHoCH?.to?.index].time * 1000))}`)
        }

        const hitEndTrend = manager.trend[hitIndex]?.trend;

        // Если начальный и конечный тренд не равны - то и не тестируем
        if (IDMEndTrend !== hitEndTrend) {
            props.canTest = false;
            props.reasons.push(`Тренды IDM ${IDMEndTrend} не равен тренду касания ${hitEndTrend}`)
        }

        return props;
    }

    // Тренд на последнюю свечку
    const currentTrend = manager.trend[manager.trend.length - 1]?.trend;
    // Если тренда у ОБ нет или он не совпадает с текущим - не торгуем
    if (!IDMEndTrend || currentTrend !== IDMEndTrend) {
        props.canTrade = false;
        props.reasons.push(`Тренд ОБ не равен текущему тренду: ${IDMEndTrend} != ${currentTrend}`)
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
        canTest: true,
        // Тейк профит до ближайшего максимума
        takeProfit: takeProfit,
        type: POIType.LQ_IFC,
        reasons: []
    }

    if (!swing.isExtremum) {
        props.canTrade = false;
        props.canTest = false;
        return props;
    }

    let startIDMIndex = swing.index - 1;
    while (startIDMIndex > -1 && (!manager.swings[startIDMIndex] || manager.swings[startIDMIndex].side === swing.side)) {
        startIDMIndex--;
    }

    // Если не нашли ближайший свинг слева - ИДМ нет
    if (startIDMIndex === -1) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Не найден свинг слева`)
        props.canTrade = false;
        props.canTest = false;
        props.reasons.push(`${formatDate(new Date(manager.candles[startIDMIndex].time * 1000))} Правильный откат не найден`)
        return props;
    }
    props.reasons.push(`${formatDate(new Date(manager.candles[startIDMIndex].time * 1000))} Правильный откат`)

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
        props.canTest = false;
        props.reasons.push(`IDM не подтвержден`)
        return props;
    }
    props.reasons.push(`${formatDate(new Date(manager.candles[endIDMIndex].time * 1000))} Подтверждение IDM`)

    // Проверяем чтоб LL/HH находились четко между краями IDM
    if (swing.index <= startIDMIndex || swing.index >= endIDMIndex) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] Свинг за пределами IDM`)
        props.canTest = false;
        props.canTrade = false;
        props.reasons.push(`Свинг ${swing.index} за пределами IDM ${formatDate(new Date(manager.candles[startIDMIndex].time * 1000))} - ${formatDate(new Date(manager.candles[endIDMIndex].time * 1000))}`)
        return props;
    }

    // Берем Индекс закрытия имбаланса и начинаем считать пробитие со следующей свечи
    let hitIndex = swing.index + orderBlockPart.lastImbalanceIndex + 1;

    /**
     * Важно чтобы пробитие было ПОСЛЕ закрытия IDM
     */
    while (
        manager.candles[hitIndex] && !hasHitOB(props, manager.candles[hitIndex])) {
        hitIndex++
    }

    const startTrend = manager.trend[props.swing.index]?.trend;
    if (!startTrend) {
        props.canTest = false;
        props.reasons.push(`Тренд отсутствует`)
        return props;
    }

    const isBuy = startTrend === -1 && props?.side === 'high';
    const isSell = startTrend === 1 && props?.side === 'low';

    // Если тренд лонг а ОБ в шорт, или тренд в шорт а ОБ в лонг - не торгуем и не тестируем
    if (!isBuy && !isSell) {
        props.canTrade = false;
        props.canTest = false;
        props.reasons.push(`ОБ не по тренду: Тренд: ${startTrend === 1 ? 'Бычий' : startTrend === -1 ? 'Медвежий' : 'undefined'} Направление ОБ: ${props?.side === 'low' ? 'Продажа' : 'Покупка'}`)
        return props;
    }

    // Если пробитие состоялось
    if (manager.candles[hitIndex]) {
        manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] пробитие состоялось`)
        props.canTrade = false;
        props.endCandle = manager.candles[hitIndex];
        props.endIndex = hitIndex;
        props.reasons.push(`Есть пробитие: ${formatDate(new Date(manager.candles[hitIndex].time * 1000))}`)
        if (endIDMIndex >= hitIndex) {
            props.isSMT = true;
            props.reasons.push(`SMT: Находимся между ${formatDate(new Date(manager.candles[startIDMIndex].time * 1000))} и ${formatDate(new Date(manager.candles[endIDMIndex].time * 1000))}`)
        }

        const endTrend = manager.trend[hitIndex]?.trend;

        // Если начальный и конечный тренд не равны - то и не тестируем
        if (startTrend !== endTrend) {
            props.canTest = false;
            props.reasons.push(`Тренды не равны: ${startTrend} != ${endTrend}`)
        }

        return props;
    }

    // Тренд на последнюю свечку
    const currentTrend = manager.trend[manager.trend.length - 1]?.trend;
    // Если тренда у ОБ нет или он не совпадает с текущим - не торгуем
    if (!startTrend || currentTrend !== startTrend) {
        props.canTrade = false;
        props.reasons.push(`Тренд ОБ не равен текущему тренду: ${startTrend} != ${currentTrend}`)
        return props;
    }

    manager.config.showLogs && console.log(`[${new Date(swing.time * 1000).toISOString()}] OB_IDM найден`)
    return props;
}

// Вспомогательная функция для получения номера недели в году
function getWeekNumber(date: Date): { week: number, year: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return {week: weekNo, year: d.getUTCFullYear()};
}

const calculateWeek = (manager: StateManager) => {
    if (!manager.candles.length) {
        return;
    }

    const lastCandle = manager.candles[manager.candles.length - 1];
    const lastCandleDate = new Date(lastCandle.time * 1000);
    // Получаем номер недели и год последней свечи
    const lastCandleWeek = getWeekNumber(lastCandleDate);
    const targetWeek = lastCandleWeek.week;
    const targetYear = lastCandleWeek.year;

    const weeklyCandlesIndexes: number[] = [];
    // Идём с конца массива к началу
    for (let i = manager.candles.length - 1; i >= 0; i--) {
        const candle = manager.candles[i];
        const candleDate = new Date(candle.time * 1000);
        const candleWeek = getWeekNumber(candleDate);

        if (candleWeek.year === targetYear && candleWeek.week === targetWeek) {
            weeklyCandlesIndexes.push(i);
        } else {
            break; // Предполагаем, что массив упорядочен по времени
        }
    }

    if (!weeklyCandlesIndexes.length) {
        return
    }

    const weeklyHighIndex = weeklyCandlesIndexes.reduce((maxIndex, c) =>
        manager.candles[c].high > manager.candles[maxIndex].high ? c : maxIndex, weeklyCandlesIndexes[0]);
    const weeklyLowIndex = weeklyCandlesIndexes.reduce((minIndex, c) =>
        manager.candles[c].low < manager.candles[minIndex].low ? c : minIndex, weeklyCandlesIndexes[0]);

    // sessionHigh
    manager.boses[weeklyHighIndex] = new Cross({
        from: new Swing({
            side: 'high',
            index: weeklyHighIndex,
            time: manager.candles[weeklyHighIndex].time,
            _sidePrice: {
                high: manager.candles[weeklyHighIndex].high,
                low: manager.candles[weeklyHighIndex].high,
            }
        }),
        to: new Swing({
            side: 'high',
            index: manager.candles.length - 1,
            time: lastCandle.time,
            _sidePrice: {
                high: lastCandle.high,
                low: lastCandle.high,
            }
        }),
        type: 'high',
        isWeekly: true, // Изменили флаг с isSession на isWeekly
        getCandles: () => manager.candles,
    });

    // sessionLow
    manager.boses[weeklyLowIndex] = new Cross({
        from: new Swing({
            side: 'low',
            index: weeklyLowIndex,
            time: manager.candles[weeklyLowIndex].time,
            _sidePrice: {
                high: manager.candles[weeklyLowIndex].low,
                low: manager.candles[weeklyLowIndex].low,
            }
        }),
        to: new Swing({
            side: 'low',
            index: manager.candles.length - 1,
            time: lastCandle.time,
            _sidePrice: {
                high: lastCandle.low,
                low: lastCandle.low,
            }
        }),
        type: 'low',
        isWeekly: true, // Изменили флаг с isSession на isWeekly
        getCandles: () => manager.candles,
    });
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

    const sessionHighIndex = sessionCandlesIndexes.reduce((maxIndex, c) => manager.candles[c].high > manager.candles[maxIndex].high ? c : maxIndex, sessionCandlesIndexes[0]);
    const sessionLowIndex = sessionCandlesIndexes.reduce((minIndex, c) => manager.candles[c].low < manager.candles[minIndex].low ? c : minIndex, sessionCandlesIndexes[0]);

    // sessionHigh
    manager.boses[sessionHighIndex] = new Cross({
        from: new Swing({
            index: sessionHighIndex,
            side: 'high',
            time: manager.candles[sessionHighIndex].time,
            _sidePrice: {
                high: manager.candles[sessionHighIndex].high,
                low: manager.candles[sessionHighIndex].high,
            }
        }),
        to: new Swing({
            index: manager.candles.length - 1,
            side: 'high',
            time: lastCandle.time,
            _sidePrice: {
                high: lastCandle.high,
                low: lastCandle.high,
            }
        }),
        type: 'high',
        isSession: true,
        getCandles: () => manager.candles,
    });

    // sessionLow
    manager.boses[sessionLowIndex] = new Cross({
        from: new Swing({
            index: sessionLowIndex,
            side: 'low',
            time: manager.candles[sessionLowIndex].time,
            _sidePrice: {
                high: manager.candles[sessionLowIndex].low,
                low: manager.candles[sessionLowIndex].low,
            }
        }),
        to: new Swing({
            index: manager.candles.length - 1,
            side: 'low',
            time: lastCandle.time,
            _sidePrice: {
                high: lastCandle.low,
                low: lastCandle.low,
            }
        }),
        type: 'low',
        isSession: true,
        getCandles: () => manager.candles,
    });
}

const formatDate = (_date: Date) => {
    // 2025-05-19T19:40:00.000Z

    // Скорректированная дата под смещение
    const adjustedDate = new Date(_date.getTime() + 180 * 60000);

    const str = adjustedDate.toISOString();
    const [date, time] = str.split('T');
    const [hour, minute, second] = time.split(':');

    return `${date} ${hour}:${minute}`;
}

export const isBearish = (candle: HistoryObject) => candle.open > candle.close;
export const isBullish = (candle: HistoryObject) => candle.open < candle.close;
