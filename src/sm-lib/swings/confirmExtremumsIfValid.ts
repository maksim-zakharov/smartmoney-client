import {StateManager} from "../th_ultimate";
import {Cross, Swing} from "../models";
import {findClosestRevertSwing} from "../utils";
import {unmarkLastExtremum} from "./updateSwingExtremums";



// Проверка наличия экстремумов
export const hasAnyExtremums = (manager: StateManager) => Boolean(manager.lastExtremumMap['high'] || manager.lastExtremumMap['low'])
// Проверка наличия IDM свингов
export const hasAnyIdmSwings = (manager: StateManager) => Boolean(manager.lastExtremumMap['high']?.idmSwing || manager.lastExtremumMap['low']?.idmSwing)
// Поиск ближайшего свинга для экстремума (если отсутствует)
export const ensureIdmSwingsExist = (manager: StateManager) => {
    // Экстремум есть но нет IDM - не смотрим
    if (!manager.lastExtremumMap['high']?.idmSwing && manager.lastExtremumMap['high']) {
        manager.lastExtremumMap['high'].idmSwing = findClosestRevertSwing(manager, manager.lastExtremumMap['high']);
    }

    if (!manager.lastExtremumMap['low']?.idmSwing && manager.lastExtremumMap['low']) {
        manager.lastExtremumMap['low'].idmSwing = findClosestRevertSwing(manager, manager.lastExtremumMap['low']);
    }
}
// Проверка подтверждения экстремума по текущей свече
export const checkExtremumConfirmation = (
    manager: StateManager,
    extremumType: 'high' | 'low',
    currentIndex: number
) => {
    if (extremumType === 'high' && manager.lastExtremumMap['high']?.side !== 'double') {
        return manager.lastExtremumMap['high']?.idmSwing?.price >
            manager.candles[currentIndex]?.low;
    }

    if (extremumType === 'low' && manager.lastExtremumMap['low']?.side !== 'double') {
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
    // console.log(`confirmSingleExtremum ${manager.lastExtremumMap[extremumType].side} Confirmed ${manager.lastExtremumMap[extremumType]?.index} at ${index}`)
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
    if (manager.lastExtremumMap[extremumType].index !== to.index && manager.lastExtremumMap[extremumType].side !== 'double') {
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
    unmarkLastExtremum(manager, oppositeExtremumType)

    manager.lastExtremumMap[oppositeExtremumType] = null;
}
/**
 *
 * @param manager
 * @param index По этому индексу получаем свечку для проверки пересвипа ИДМ
 * @param side
 */
export const confirmExtremumsIfValid = (
    manager: StateManager,
    index: number,
) => {
    // Если экстремума нет - не смотрим
    if (!hasAnyExtremums(manager)) {
        return;
    }

    ensureIdmSwingsExist(manager);

    if (!hasAnyIdmSwings(manager)) {
        return;
    }

    if (everyLastExtremumIDMIsConfirmed(manager)) {
        return;
    }

    const isHighIDMConfirmed = checkExtremumConfirmation(manager, 'high', index)
    const isLowIDMConfirmed = checkExtremumConfirmation(manager, 'low', index)

    // Если IDM не подтвержден - не смотрим
    if (!isLowIDMConfirmed && !isHighIDMConfirmed) {
        return;
    }

    if (isHighIDMConfirmed) {
        confirmSingleExtremum(manager, 'high', index);
    }

    if (isLowIDMConfirmed) {
        confirmSingleExtremum(manager, 'low', index);
    }

    /**
     * Если IDM подтверждается - значит происходит пересвип. Текущая свечка становится первой,
     * от которой мы ищем новый HH/LL
     * Если у нас подтвердился HH - то у нас образовался новый LL,
     * если предыдущий LL не был подтвержден - нужно снять с него маркер
     */

    if (isHighIDMConfirmed) {
        cleanupOppositeExtremum(manager, 'high');
    }

    if (isLowIDMConfirmed) {
        cleanupOppositeExtremum(manager, 'low');
    }
};