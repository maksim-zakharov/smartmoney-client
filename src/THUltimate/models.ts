export interface HistoryObject {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number
    volume: number;
}

export class Swing {
    side?: 'high' | 'low' | 'double';
    time: number;
    _sidePrice: Record<'high' | 'low', number> = {
        high: null,
        low: null
    }

    index: number;
    isIFC?: boolean;

    protected _isExtremum: boolean = false;

    // Для подсчета на графике, только для тестов
    protected _isDebug: boolean = false;

    constructor(props: Partial<Swing>) {
        Object.assign(this, props)
    }

    get price() {
        return this._sidePrice[this.side] || this._sidePrice['high'];
    }

    get isExtremum() {
        return this._isExtremum;
    }

    get text() {
        let _text = '';

        if (this._isExtremum) {
            _text = this.side === 'high' ? 'HH' : 'LL';
        }

        if (this.isIFC) {
            _text += ' IFC';
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
    // Считается с какой свечи начинается считаться имбаланс
    lastOrderblockCandle: HistoryObject;
    // Направление: high - рисуем сверху (шорт на отбой), low - рисуем снизу - (лонг на отбой)
    side: 'high' | 'low';
    // Считается на какой свече имбаланс заканчивается
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

export interface THConfig {
    withMove?: boolean;
    showHiddenSwings?: boolean;
    newSMT?: boolean;
    showIFC?: boolean;
    byTrend?: boolean;
    showFake?: boolean;
    oneIteration?: boolean;
    tradeIDMIFC?: boolean;
    tradeOBIDM?: boolean;
    reversSwings?: boolean;
}

export interface Trend {
    time: number;
    trend: number;
}

export type OrderblockPart = Pick<POI, 'side' | 'lastOrderblockCandle' | 'lastImbalanceCandle' | 'firstImbalanceIndex' | 'imbalanceIndex' | 'startCandle'>

export enum Side {
    Buy = 'buy',
    Sell = 'sell',
}

export type CandleWithSide = HistoryObject & { side: Side };