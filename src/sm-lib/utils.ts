import {CandleWithSide, Cross, HistoryObject, POI, Side, Swing} from "./models.ts";
import {StateManager} from "./th_ultimate.ts";

export const formatDate = (_date: Date) => {
    // 2025-05-19T19:40:00.000Z

    // Скорректированная дата под смещение
    const adjustedDate = new Date(_date.getTime() + 180 * 60000);

    const str = adjustedDate.toISOString();
    const [date, time] = str.split('T');
    const [hour, minute, second] = time.split(':');

    return `${date} ${hour}:${minute}`;
}
export const getTime = (_date: Date) => {
    // 2025-05-19T19:40:00.000Z

    // Скорректированная дата под смещение
    const adjustedDate = new Date(_date.getTime() + 180 * 60000);

    const str = adjustedDate.toISOString();
    const [date, time] = str.split('T');
    const [hour, minute, second] = time.split(':');

    return `${hour}:${minute}`;
}
export const isBearish = (candle: HistoryObject) => candle.open > candle.close;
export const isBullish = (candle: HistoryObject) => candle.open < candle.close;

// Вспомогательная функция для получения номера недели в году
export function getWeekNumber(date: Date): { week: number, year: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return {week: weekNo, year: d.getUTCFullYear()};
}

/**
 * Проверяет есть ли правый бар внутри левого
 * @param candle
 * @param bar
 */
export const isInsideBar = (candle: HistoryObject, bar: HistoryObject) =>
    candle.high > bar?.high && candle.low < bar?.low;
export const isImbalance = (leftCandle: HistoryObject, rightCandle: HistoryObject) =>
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
export const highestBy = <T>(batch: T[], key: keyof T) =>
    batch.reduce((acc, idx, i) => {
        if (!acc && idx) {
            acc = idx;
        } else if (idx && acc[key] < idx[key]) {
            acc = idx;
        }
        return acc;
    }, batch[0]);
export const lowestBy = <T>(batch: T[], key: keyof T) =>
    batch.reduce((acc, idx, i) => {
        if (!acc && idx) {
            acc = idx;
        } else if (idx && acc[key] > idx[key]) {
            acc = idx;
        }
        return acc;
    }, batch[0]); // Является ли candle - IFC свечой
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
export const isInternalBOS = (leftBos: Cross, rightBos: Cross) =>
    leftBos.from.index < rightBos.from.index &&
    leftBos.to.index >= rightBos.to.index;
export const isNotSMT = (obItem: POI) => !obItem || !obItem.isSMT;
export const hasTakenOutLiquidity = (
    type: 'high' | 'low',
    bossCandle: HistoryObject,
    currentCandle: HistoryObject,
) =>
    type === 'high'
        ? bossCandle.high < currentCandle.high
        : bossCandle.low > currentCandle.low;

// Смотрим пробила ли свеча candle цену price. 1 - пробила снизу вверх, -1 - сверху вниз, 0 - не пробила.
export const isCrossed = (price: number, candle: HistoryObject) => {
    if (price < candle.close) {
        return 1
    } else if (price > candle.close) {
        return -1;
    }
    return 0;
}

export const hasClose = (
    type: 'high' | 'low',
    bossCandle: HistoryObject,
    currentCandle: HistoryObject,
) =>
    type === 'high'
        ? bossCandle.high < currentCandle.close
        : bossCandle.low > currentCandle.close;

export const closestSwing = (manager: StateManager, swing: Swing) => {
    let index = swing.index - 1;
    while (
        index > -1 &&
        (!manager.swings[index] || manager.swings[index].side === swing.side)
        ) {
        index--;
    }

    return manager.swings[index];
}

export const findClosestConfirmedCHoCH = (manager: StateManager, index: number) => manager.boses.find(b => b && b.extremum?.index === index && b.isCHoCH && b.isConfirmed)
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
export const closestExtremumSwing = (manager: StateManager, swing: Swing) => {
    let index = swing.index - 1;
    while (
        index > -1 &&
        (!manager.swings[index] || !manager.swings[index].isExtremum || manager.swings[index].side === swing.side)
        ) {
        index--;
    }

    return manager.swings[index];
}