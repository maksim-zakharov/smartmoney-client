import {CandleWithSide, Cross, HistoryObject, OrderblockPart, POI, Side, Swing} from "./th_ultimate.ts";
import {StateManager} from "./th_ultimate.ts";


export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT
export const hasHighValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
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
export const hasLowValidPullback = (leftCandle: HistoryObject, currentCandle: HistoryObject, nextCandle?: HistoryObject) => {
    if (leftCandle.low > currentCandle.low && (!nextCandle || nextCandle.low >= currentCandle.low)
    ) {
        return 'low'
    }
    return '';
}
export const hasClose = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.close : bossCandle.low > currentCandle.close;
export const isIFC = (side: Swing['side'], candle: HistoryObject) => {
    const body = Math.abs(candle.open - candle.close);
    const upWick = candle.high - Math.max(candle.open, candle.close);
    const downWick = Math.min(candle.open, candle.close) - candle.low;

    return (side === 'high' && upWick > body && upWick > downWick)
        || (side === 'low' && upWick < downWick && body < downWick)
}
export const isInsideBar = (candle: HistoryObject, bar: HistoryObject) => candle.high > bar.high && candle.low < bar.low;
export const isInternalBOS = (leftBos: Cross, rightBos: Cross) => leftBos.from.index < rightBos.from.index
    && leftBos.to.index >= rightBos.to.index
export const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) => leftCandle.low > rightCandle.high ? 'low' : leftCandle.high < rightCandle.low ? 'high' : null;
export const hasHitOB = (ob: OrderblockPart, candle: HistoryObject) =>
    (ob.side === 'high'
        && ob.startCandle.low <= candle.high
    )
    || (ob.side === 'low'
        // Если был прокол
        && ob.startCandle.high >= candle.low
    );
export const highestBy = <T>(batch: T[], key: keyof T) => batch.reduce((acc, idx, i) => {
    if (!acc && idx) {
        acc = idx;
    } else if (idx && acc[key] < idx[key]) {
        acc = idx;
    }
    return acc;
}, batch[0])
export const lowestBy = <T>(batch: T[], key: keyof T) => batch.reduce((acc, idx, i) => {
    if (!acc && idx) {
        acc = idx;
    } else if (idx && acc[key] > idx[key]) {
        acc = idx;
    }
    return acc;
}, batch[0])
export const hasTakenOutLiquidity = (type: 'high' | 'low', bossCandle: HistoryObject, currentCandle: HistoryObject) => type === 'high' ? bossCandle.high < currentCandle.high : bossCandle.low > currentCandle.low;
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

export const closestLeft = (candles: HistoryObject[], swings: Swing[], n: number, offset = 0, side?: Swing['side']) => {
    let closest: Swing;
    let i1 = n - offset;
    while (candles[i1]) {
        closest = swings[i1];
        if (closest && (!side || side === closest.side)) {
            break;
        }
        i1--;
    }

    return {closest, index: i1};
}

export const closestRight = (candles: HistoryObject[], swings: Swing[], n: number, offset = 0, side?: Swing['side']) => {
    let closest: Swing;
    let i1 = n + offset;
    while (candles[i1]) {
        closest = swings[i1];
        if (closest && (!side || side === closest.side)) {
            break;
        }
        i1++;
    }

    return {closest, index: i1};
}

export const removeRightSwingsAtInsideBars = (n: number, candles: HistoryObject[], swings: Swing[], cross: Cross[]) => {
    let i = n;
    while (candles[i + 1]) {
        const cur = candles[n];
        const next = candles[i + 1];
        if (isInsideBar(cur, next)) {
            cross[i + 1] = null;
            swings[i + 1] = null;
        } else {
            break;
        }
        i++;
    }

    return i;
}

export const isCross = (n: number, candles: HistoryObject[], type: Swing['side'], offset = 0) => {
    let index = n + 1 + offset;
    while (candles[index] && (type === 'low' ? candles[n].low < candles[index].low : candles[n].high > candles[index].high)) {
        index++;
    }

    if (!candles[index]) {
        return undefined;
    }

    return index;
}

export const buildIDMLine = (manager: StateManager, n: number, swing: Swing) => {
    if (!swing) {
        return;
    }

    const swingSide = swing.side;
    if (swingSide === 'double') {
        return;
    }

    const versusSide = swingSide === 'high' ? 'low' : 'high';

    if (manager.lastExtremumMap[versusSide] && !manager.lastExtremumMap[versusSide].idmSwing) {
        manager.lastExtremumMap[versusSide].idmSwing = swing

        let offset = manager.lastExtremumMap[versusSide].index - n;
        let index = isCross(n, manager.candles, swingSide, offset);
        let isConfirmed = Boolean(index);
        if (!index) {
            index = manager.candles.length - 1;
        }

        const to = new Swing({
            index, time: manager.candles[index].time,
            _sidePrice: {
                high: manager.candles[index].close,
                low: manager.candles[index].close
            }
        });

        manager.boses[manager.lastExtremumMap[versusSide].idmSwing.index] = new Cross({
            from: manager.lastExtremumMap[versusSide].idmSwing,
            to,
            type: swingSide,
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[versusSide],
            isConfirmed
        })
    }
}