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

export interface Trend {
    time: number;
    trend: number;
}

export type OrderblockPart = Pick<
    POI,
    | 'side'
    | 'lastOrderblockCandle'
    | 'lastImbalanceCandle'
    | 'firstImbalanceIndex'
    | 'lastImbalanceIndex'
    | 'startCandle'
>;

export enum Side {
    Buy = 'buy',
    Sell = 'sell',
}

export type CandleWithSide = HistoryObject & { side: Side };