// Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
import {Swing} from "../models.ts";
import {StateManager} from "../th_ultimate.ts";

// Проверка на новый экстремум:
const checkNewExtremum = (manager: StateManager, swing: Swing) => {
    const isOneOfEmpty = !manager.lastExtremumMap['high'] || !manager.lastExtremumMap['low'];
    // Свинг делает перехай прошлого свинга
    const isHighest = manager.lastExtremumMap['high']?._sidePrice.high < swing._sidePrice.high;
    // Свинг делает перелой прошлого свинга
    const isLowest = manager.lastExtremumMap['low']?._sidePrice.low > swing._sidePrice.low;

    return {isHighest, isLowest, isOneOfEmpty};
}


const unmarkLastExtremum = (manager: StateManager, side: Swing['side']) => {
    manager.lastExtremumMap[side]?.unmarkExtremum();
    if (manager.lastExtremumMap[side]?.idmSwing) {
        manager.boses[manager.lastExtremumMap[side].idmSwing.index] = null;
    }
}
// Проверка на наличие нового свинга
const checkSomeNewSwing = (
    swing: Swing,
    isHighest: boolean,
    isLowest: boolean,
    isOneOfEmpty: boolean
) => {
    // Есть перехай и свинг хай
    const isHighestHigh = swing.side === 'high' && isHighest;
    // Есть перелой и свинг лой
    const isLowestLow = swing.side === 'low' && isLowest;
    // Свинг дабл и есть либо перехай либо перелой
    const isDouble = swing.side === 'double' && (isHighest || isLowest);

    // Здесь проверяем что либо еще нет HH/LL, либо прошлый HH ниже нового или прошлый LL выше нового
    return isOneOfEmpty || isHighestHigh || isLowestLow || isDouble;
}

// Обработка двойного свинга
function processDoubleSwing(
    manager: StateManager,
    swing: Swing,
    isHighest: boolean,
    isLowest: boolean
) {
    // Очистка старого экстремума если нужно
    if (manager.lastExtremumMap.high && !manager.lastExtremumMap.low && isHighest) {
        unmarkLastExtremum(manager, 'high');
    }
    if (manager.lastExtremumMap.low && !manager.lastExtremumMap.high && isLowest) {
        unmarkLastExtremum(manager, 'low');
    }

    // Установка нового экстремума
    if (isLowest) {
        setNewLastExtremum(manager, swing, 'low', 'high');
    }
    if (isHighest) {
        setNewLastExtremum(manager, swing, 'high', 'low');
    }
}

// Установка нового экстремума
function setNewLastExtremum(
    manager: StateManager,
    swing: Swing & { idmSwing?: Swing },
    side: Swing['side'],
    versusSide: Swing['side']
) {
    manager.lastExtremumMap[side] = swing;
    if (side !== 'double') {
        swing.markExtremum();
    }
    if (manager.lastSwingMap[versusSide]) {
        swing.idmSwing = manager.lastSwingMap[versusSide];
    }
}

export const updateSwingExtremums = (
    manager: StateManager,
    index: number,
    swing: Swing,
) => {
    // Проверяем свинг по выбранной стороне
    if (!swing) {
        return;
    }

    const versusSide = swing.side === 'low' ? 'high' : 'low';
    if (manager.confirmIndexMap[versusSide] > index) {
        return;
    }

    const {isHighest, isLowest, isOneOfEmpty} = checkNewExtremum(manager, swing);

    if (!checkSomeNewSwing(swing, isHighest, isLowest, isOneOfEmpty)) {
        return;
    }

    if (swing.side === 'double') {
        processDoubleSwing(manager, swing, isHighest, isLowest);
    } else {
        /**
         * Если у нас уже есть Главный экстремум - нужно снять с него маркер
         */
        if (manager.lastExtremumMap[swing.side] && !manager.lastExtremumMap[versusSide]) {
            unmarkLastExtremum(manager, swing.side);
        }
        setNewLastExtremum(manager, swing, swing.side, versusSide);
    }
};