import {Cross, HistoryObject, POI, Swing} from "./models.ts";
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
export const hasClose = (
    type: 'high' | 'low',
    bossCandle: HistoryObject,
    currentCandle: HistoryObject,
) =>
    type === 'high'
        ? bossCandle.high < currentCandle.close
        : bossCandle.low > currentCandle.close;

// Проверка наличия экстремумов
export const hasAnyExtremums = (manager: StateManager) => Boolean(manager.lastExtremumMap['high'] || manager.lastExtremumMap['low'])

// Проверка наличия IDM свингов
export const hasAnyIdmSwings = (manager: StateManager) => Boolean(manager.lastExtremumMap['high']?.idmSwing || manager.lastExtremumMap['low']?.idmSwing)

// Поиск ближайшего свинга для экстремума (если отсутствует)
export const ensureIdmSwingsExist = (manager: StateManager) => {
    // Экстремум есть но нет IDM - не смотрим
    if (!manager.lastExtremumMap['high']?.idmSwing && manager.lastExtremumMap['high']) {
        manager.lastExtremumMap['high'].idmSwing = closestSwing(manager, manager.lastExtremumMap['high']);
    }

    if (!manager.lastExtremumMap['low']?.idmSwing && manager.lastExtremumMap['low']) {
        manager.lastExtremumMap['low'].idmSwing = closestSwing(manager, manager.lastExtremumMap['low']);
    }
}

// Проверка подтверждения экстремума по текущей свече
export const checkExtremumConfirmation = (
    manager: StateManager,
    extremumType: 'high' | 'low',
    currentIndex: number
) => {
    if (extremumType === 'high') {
        return manager.lastExtremumMap['high']?.idmSwing?.price >
            manager.candles[currentIndex]?.low;
    }

    if (extremumType === 'low') {
        return manager.lastExtremumMap['low']?.idmSwing?.price <
            manager.candles[currentIndex]?.high
    }

    return false;
}

// Подтверждение конкретного экстремума
export const confirmSingleExtremum = (
    manager: StateManager,
    extremumType: 'high' | 'low',
    index: number
): void => {
    // Помечаем экстремум как подтвержденный
    manager.lastExtremumMap[extremumType].markExtremum();
    manager.confirmIndexMap[extremumType] = index;

    // Рисуем IDM
    const from = manager.lastExtremumMap[extremumType].idmSwing;
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
    if (manager.lastExtremumMap[extremumType].index !== to.index) {
        manager.boses[from.index] = new Cross({
            from,
            to,
            type: extremumType === 'high' ? 'low' : 'high',
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[extremumType],
            isConfirmed: true,
        });
    }
}

// Проверка подтверждения всех IDM последний экстремумов
export const everyLastExtremumIDMIsConfirmed = (manager: StateManager) => Boolean(manager.boses[manager.lastExtremumMap['high']?.idmSwing?.index] && manager.boses[manager.lastExtremumMap['low']?.idmSwing?.index])

// Очистка противоположного экстремума при подтверждении
export const cleanupOppositeExtremum = (
    manager: StateManager,
    oppositeExtremumType: 'high' | 'low'
): void => {
    // TODO Проблема в том, что если свечка которая закрыла IDM - она по сути должна быть первым HH
    if (!manager.boses[manager.lastExtremumMap[oppositeExtremumType]?.idmSwing?.index]?.isConfirmed) {
        manager.lastExtremumMap[oppositeExtremumType]?.unmarkExtremum()
    }
    manager.lastExtremumMap[oppositeExtremumType] = null;
    // manager.lastExtremumMap['low'] = manager.swings[index];
    // manager.lastExtremumMap['low']?.markExtremum()
}

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