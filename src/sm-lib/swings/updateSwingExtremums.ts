// Если восходящий тренд - перезаписываем каждый ХХ, прошлый удаляем
import {Cross, Swing} from "../models";
import {StateManager} from "../th_ultimate";
import {findClosestRevertSwing} from "../utils";

// Проверка на новый экстремум:
const checkNewExtremum = (manager: StateManager, swing: Swing) => {
    // Свинг делает перехай прошлого свинга
    const isHighest = !manager.lastExtremumMap['high'] || manager.lastExtremumMap['high']?._sidePrice.high < swing._sidePrice.high;
    // Свинг делает перелой прошлого свинга
    const isLowest = !manager.lastExtremumMap['low'] || manager.lastExtremumMap['low']?._sidePrice.low > swing._sidePrice.low;

    return {isHighest, isLowest};
}

const unmarkSwing = (manager: StateManager, swing: Swing & { idmSwing?: Swing }) => {
    swing?.unmarkExtremum();
    if (swing?.idmSwing) {
        manager.boses[swing.idmSwing.index] = null;
    }
}

export const unmarkLastExtremum = (manager: StateManager, side: Swing['side']) => {
    // Если у экстремума уже есть IDM и он подтвержден - не снимаем маркер
    if (!manager.lastExtremumMap[side] || hasLastConfirmedIDM(manager, side)) {
        return;
    }

    console.log(`unmarkLastExtremum ${manager.lastExtremumMap[side]?.index}`)

    // Если снимаем марку с неподтвержденного HH - все последующие LL считаются невалидными
    const versusSide = side === 'high' ? 'low' : 'high';
    const versusSwings = manager.swings.filter(s => s && s.side === versusSide && manager.lastExtremumMap[side]?.index < s.index);
    versusSwings.forEach(s => unmarkSwing(manager, manager.swings[s.index]));

    if (manager.lastExtremumMap[side]?.side === 'double') {
        manager.lastExtremumMap[side].side = side === 'high' ? 'low' : 'high';
        manager.lastExtremumMap[side].idmSwing = findClosestRevertSwing(manager, manager.lastExtremumMap[side]);

        if (!manager.lastExtremumMap[side].idmSwing) {
            return;
        }

        // Рисуем IDM
        const from = manager.lastExtremumMap[side].idmSwing;
        const to = new Swing({
            index: manager.lastExtremumMap[side].index,
            side: from.side,
            _sidePrice: {
                high: manager.candles[manager.lastExtremumMap[side].index].close,
                low: manager.candles[manager.lastExtremumMap[side].index].close,
            },
            time: manager.candles[manager.lastExtremumMap[side].index].time,
        });

        manager.boses[from.index] = new Cross({
            from,
            to,
            type: manager.lastExtremumMap[side].side,
            isIDM: true,
            getCandles: () => manager.candles,
            extremum: manager.lastExtremumMap[side],
            isConfirmed: true,
        });

        manager.lastExtremumMap.low = null;
        manager.lastExtremumMap.high = null;
    } else {
        unmarkSwing(manager, manager.lastExtremumMap[side])
    }
}

// Проверка на наличие нового свинга
const checkSomeNewSwing = (
    swing: Swing,
    isHighest: boolean,
    isLowest: boolean,
) => {
    // Есть перехай и свинг хай
    const isHighestHigh = swing.side === 'high' && isHighest;
    // Есть перелой и свинг лой
    const isLowestLow = swing.side === 'low' && isLowest;
    // Свинг дабл и есть либо перехай либо перелой
    const isDouble = swing.side === 'double' && (isHighest || isLowest);

    // Здесь проверяем что либо еще нет HH/LL, либо прошлый HH ниже нового или прошлый LL выше нового
    return isHighestHigh || isLowestLow || isDouble;
}

// Обработка двойного свинга
function processDoubleSwing(
    manager: StateManager,
    swing: Swing,
    isHighest: boolean,
    isLowest: boolean
) {
    // Очистка старого экстремума если нужно
    if (manager.lastExtremumMap.high && !hasLastConfirmedIDM(manager, 'low') && isHighest) {
        unmarkLastExtremum(manager, 'high');
    }
    if (manager.lastExtremumMap.low && !hasLastConfirmedIDM(manager, 'high') && isLowest) {
        unmarkLastExtremum(manager, 'low');
    }

    // Установка нового экстремума
    if (isLowest || isHighest) {
        setNewLastExtremum(manager, swing, 'low', 'high');
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
    console.log(`setNewLastExtremum ${swing?.index} ${swing.side}`)

    manager.lastExtremumMap[side] = swing;
    if (side !== 'double') {
        swing.markExtremum();
    }
    if (manager.lastSwingMap[versusSide]) {
        swing.idmSwing = manager.lastSwingMap[versusSide];
    }
}

// Проверяем есть ли у последнего свинга подтвержденный IDM
const hasLastConfirmedIDM = (manager: StateManager, side: Swing['side']) => Boolean(manager.boses[manager.lastExtremumMap[side]?.idmSwing?.index]?.isConfirmed)

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

    const {isHighest, isLowest} = checkNewExtremum(manager, swing);

    if (!checkSomeNewSwing(swing, isHighest, isLowest)) {
        return;
    }

    if (swing.side === 'double') {
        processDoubleSwing(manager, swing, isHighest, isLowest);
    } else {
        /**
         * Если у нас уже есть Главный экстремум - нужно снять с него маркер
         */
        if (manager.lastExtremumMap[swing.side]?.side === 'double' ||

            manager.lastExtremumMap[swing.side] && !hasLastConfirmedIDM(manager, versusSide)

        ) {
            if ((swing.side === 'high' && isHighest) || (swing.side === 'low' && isLowest))
                unmarkLastExtremum(manager, swing.side);
        }

        setNewLastExtremum(manager, swing, swing.side, versusSide);
    }
};