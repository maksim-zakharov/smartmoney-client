class Structure {
    _data: number[] = [];
    _fill;

    constructor(length?: number, fill?: number) {
        this._fill = fill;
        if (length) {
            this._data = new Array(length).fill(this.fill);
        }
    }

    private get fill() {
        if (this._fill !== undefined) {
            return this._fill;
        }
        return 0;
    }

    asArray() {
        return this._data;
    }

    at(index: number) {
        if (index < 0) {
            return null;
        }
        return this._data[this._data.length - 1 - index] ?? this.fill;
    }

    /**
     * Возвращает значение data с указанным dynamic offset.
     * @description Для положительных значений смещения dynamic offset должно быть меньше или равно max offset. Для отрицательных значений смещения dynamic offsetдолжно быть меньше или равно max offset
     * @param offset Это значение положительно для прошлого динамического смещения и отрицательно для динамического будущего смещения. При установке на ноль смещение не корректируется.
     */
    getValue(offset: number): number{
        if (offset >= 0) {
            return this.at(offset);
        }

        return this._data[-offset] ?? this.fill;
    }

    get current(){
        return this.at(0);
    }

    add(val: number) {
        this._data.push(val ?? this.fill);
    }

    addAt(index: number, val: number) {
        this._data[index] = val;
    }

    /**
     * Возвращает наибольшее значение data для последних length баров. Текущий бар не учитываются
     * @link https://toslc.thinkorswim.com/center/reference/thinkScript/Functions/Tech-Analysis/Highest
     * @param [length=12] Определяет период, за который получено наибольшее значение
     */
    highest(length: number = 12) {
        const newSctuct = new Structure();
        if (!this._data.length) {
            return newSctuct;
        }
        newSctuct.add(Math.max(...this._data.slice(-length - 1, length + 1)))
        return newSctuct
    }

    /**
     * Смещения выбранной ценовой линии вперед или назад на определенное количество баров (без учета текущей цены)
     * TODO Сделать смещение вперед
     * @link https://toslc.thinkorswim.com/center/reference/Tech-Indicators/studies-library/C-D/Displacer
     * @param shift Количество баров для смещения ценовой линии. Отрицательные значения означают смещение в прошлое.
     */
    displacer(shift: number) {

        // Проверяем, что массив не пустой
        if (this._data.length === 0) {
            return null; // Или можно вернуть NaN
        }

        // Получаем последний элемент массива
        const lastValue = this.at(0);

        // Проверяем сдвиг влево
        if (shift < 0) {
            // Рассчитываем новый индекс для перемещения последнего значения
            const newIndex = this._data.length + shift - 1; // Позиция на 6 позиций назад
            if (newIndex >= 0) {
                this._data[newIndex] = lastValue; // Перемещаем значение на новый индекс
                this._data[this._data.length - 1] = 0; // Убираем последнее значение (перезаписываем его на null)
            }
        }

        return this;
    }
}

function highest(data: number[], length: number = 12) {
    const newSctuct = new Structure();
    if (!data.length) {
        return newSctuct;
    }
    newSctuct.add(Math.max(...data.slice(-length - 1, length + 1)))
    return newSctuct
}

enum CrossEnum {
    Up = 'Up',
    Any = 'Any',
    Down = 'Down'
}

function IsCross(dir: CrossEnum, array1: number[], array2: number[], i: number = 0, offset1: number = 0, offset2: number = 0) {
    let flag = false;
    let num;
    if (dir === CrossEnum.Up || dir === CrossEnum.Any) {
        num = array1[i + offset1];
        if (num > array2[i + offset2]) {
            num = array1[i + 1 + offset1];
            if (num <= array2[i + 1 + offset2]) flag = true;
        }
    }
    if (dir === CrossEnum.Down || dir === CrossEnum.Any) {
        num = array1[i + offset1];
        if (num < array2[i + offset2]) {
            num = array1[i + 1 + offset1];
            if (num >= array2[i + 1 + offset2]) flag = true;
        }
    }
    return flag;
}

function CrossOver(source1: number[], source2: number[], index: number = 0, offset1: number = 0, offset2: number = 0) {
    return IsCross(CrossEnum.Up, source1, source2, index, offset1, offset2);
}

function CrossUnder(source1: number[], source2: number[], index: number = 0, offset1: number = 0, offset2: number = 0) {
    return IsCross(CrossEnum.Down, source1, source2, index, offset1, offset2);
}

enum CrossDirection {
    // Перехай. Цена (close) пробивает максимум (i_y) снизу верх.
    Above = 'above',
    // Перелой. Цена (close) пробивает минимум (i_y) сверху вниз.
    Below = 'below',
}

/**
 * Берутся текущее и прошлое значения цены закрытия и экстремума и сравниваются на пересечения
 * @param close
 * @param extremumPrice
 * @param direction
 * @constructor
 */
function Crosses(close: Structure, extremumPrice: Structure, direction: CrossDirection) {
    if (!close.at(1) || extremumPrice._data.length < 2) {
        return false;
    }

    /**
     * Что проверяется? Функция проверяет, произошло ли пересечение с первым значением (close) снизу вверх через второе значение (itop_y).
     *
     * Пояснение:
     * Если на предыдущем баре (bar[1]) close было больше itop_y, а на текущем баре close стало меньше itop_y, то это будет пересечение вниз.
     *
     * Результат:
     * В данном случае пересечение вниз не происходит, так как текущий close (100) больше текущего itop_y (99).
     * Поэтому, если на предыдущем баре close было больше, чем itop_y, то функция не вернет true для CrossingDirection.BELOW.
     */
    // Проверка пересечения для направления "below" (сверху вниз)
    if (
        direction === CrossDirection.Below &&
        // Когда предыдущая цена закрытия выше последнего минимума
        close.at(1) > extremumPrice.at(1) &&
        // А новая цена закрытия ниже последнего (текущего) минимума
        close.at(0) <= extremumPrice.at(0)
    ) {
        // То считаем что произошло пробитие минимума (перелой)
        return true;
    }

    /**
     * Что проверяется? Функция проверяет, произошло ли пересечение с первым значением (close) сверху вниз через второе значение (itop_y).
     *
     * Пояснение:
     * На предыдущем баре (bar[1]) значение close должно было быть меньше itop_y для того, чтобы сработала логика пересечения "вверх".
     * На текущем баре значение close (100) больше itop_y (99).
     *
     * Результат:
     * Если на предыдущем баре (bar[1]) значение close было меньше, чем itop_y, и на текущем баре close стало больше itop_y, то это пересечение вверх.
     * В этом случае, если на предыдущем баре close было меньше, чем itop_y, то функция вернет true, потому что произошло пересечение вверх.
     * Таким образом, если на предыдущем баре close было меньше itop_y, то результат будет true.
     */
    // Проверка пересечения для направления "above" (снизу вверх)
    if (
        direction === CrossDirection.Above &&
        // Когда предыдущая цена закрытия ниже последнего максимума
        close.at(1) < extremumPrice.at(1) &&
        // А новая цена закрытия выше последнего (текущего) максимума
        close.at(0) >= extremumPrice.at(0)
    ) {
        // То считаем что произошло пробитие максимума (перехай)
        return true;
    }

    return false;
}

enum OSType {
    UpdateHigh = 1,
    UpdateLow = 0
}

/**
 * Поиск максимумов/минимумов свечного массива в рамках окна размером в len свечей
 * @param len Размер окна
 * @param candles Свечной ряд
 */
function swings(len: number = 5, candles: { high: number, low: number }[]): {
    top: number[];
    btm: number[];
} {
    // Берем хаи и лои свечек
    const highs = candles.map((price) => price.high);
    const lows = candles.map((price) => price.low);

    const os = new Structure(0, null);
    // Массив перехаев, если 0 - то не было продолжения
    const top = new Structure(0, 0);
    // Массив перелоев, если 0 - то не было продолжения
    const btm = new Structure(0, 0);

    // Проходим по данным начиная с индекса len
    // for (let i = len; i < candles.length; i++) {
    //     // За каждое окно длинную в len свечек находим максимум и минимум
    //     const highestHigh = Math.max(...highs.slice(i - len + 1, i + 1));
    //     const lowestLow = Math.min(...lows.slice(i - len + 1, i + 1));
    //
    //     const high = highs[i-len];
    //     const low = lows[i-len];
    for (let i = len; i < candles.length; i++) {
        // За каждое окно длинную в len свечек находим максимум и минимум
        const highestHigh = Math.max(...highs.slice(i - len, i));
        const lowestLow = Math.min(...lows.slice(i - len, i));

        const high = highs[i];
        const low = lows[i];

        // Если текущий хай выше прошлого максимума - 0 (произошло обновление максимума), если текущий лой ниже прошлого лоя - 1 (произошло обновление минимума), иначе берем последнее значение.
        os.add(high > highestHigh ? OSType.UpdateHigh : low < lowestLow ? OSType.UpdateLow : os.at(0));

        // Из общего массива значений разделяем его на 2 массива:
        // - если последнее значение было максимумом, а последнее нет (не обновлялось) - записываем максимум
        top.add(os.at(0) === OSType.UpdateHigh && os.at(1) === OSType.UpdateLow ? high : 0)
        // - если последнее значение было минимумом, а последнее нет (не обновлялось) - записываем минимум
        btm.add(os.at(0) === OSType.UpdateLow && os.at(1) === OSType.UpdateHigh ? low : 0)
    }

    return {top: top.asArray(), btm: btm.asArray()};
}

export function calculate(candles: {
    high: number,
    low: number,
    close: number,
    open: number,
    time: number
}[], colors: { bullColor: string, bearColor: string }, windowLength?: number) {
    const markers = [];

    const showInternals = true;
    const length = 50;
    const ifilter_confluence = false;

    const top_cross = [],
        top_y = new Structure(length, 0),
        top_x = new Structure(length, 0),
        trail_up = new Structure(),
        trail_up_x = new Structure();
    const btm_cross = [],
        btm_y = new Structure(length, 0),
        btm_x = new Structure(length, 0),
        trail_dn = new Structure(),
        trail_dn_x = new Structure();
    // Серия индексов моментов перехаев
    const itop_cross = new Structure(length, 0),
        itop_y = new Structure(length, 0),
        itop_x = new Structure(length, 0);
    // Серия индексов моментов перелоев
    const ibtm_cross = new Structure(length, 0),
        ibtm_y = new Structure(length, 0),
        ibtm_x = new Structure(length, 0);

    const localLength = windowLength || 5;

    const itrend = new Structure(50, 0);

    const open = new Structure(length, 0);
    const close = new Structure(length, 0);
    const high = new Structure(length, 0);
    const low = new Structure(length, 0);

    const InternalBullStructureVal = new Structure(length, 0);
    const InternalBearStructureVal = new Structure(length, 0);

    // Нашли максимумы и минимумы с окном в 50 свечек
    const {top, btm} = swings(length, candles);
    // Нашли максимумы и минимумы с окном в 5 свечек
    const {top: itop, btm: ibtm} = swings(localLength, candles);

    for (let n = length; n < candles.length; n++) {
        // Заполняю структуры ценами
        fillPrices(candles, n, open, close, high, low)
        // Заполняется x, y. Если найден экстремум - заполняется x индекс, y цена
        fillSwings(n, length, localLength, top, top_x, top_y, btm, btm_x, btm_y, itop, ibtm, itop_x, itop_y, ibtm_x, ibtm_y)

        calculateCrossesExtremes(high, low, close, open, itop_y, btm_y, itop_cross, itop_x, ibtm_cross, ibtm_x, ibtm_y, top_y, itrend, n, ifilter_confluence)

        if (showInternals) {
            const InternalBullStructure = calculatePlotInternal(itop_cross, itop_x, itop_y, InternalBullStructureVal, showInternals)
            const InternalBearStructure = calculatePlotInternal(ibtm_cross, ibtm_x, ibtm_y, InternalBearStructureVal, showInternals)

            console.log("InternalBullStructure", InternalBullStructure)
            console.log("InternalBearStructure", InternalBearStructure)

            const bullBubble = buildBubble(candles, itop_x, InternalBullStructure, InternalBearStructure, itrend, colors,true)
            const bearBubble = buildBubble(candles, ibtm_x, InternalBearStructure, InternalBullStructure, itrend, colors,false)

            if (bullBubble) markers.push(bullBubble);
            if (bearBubble) markers.push(bearBubble);
        }

        // <-- TODO ДО СЮДА ВОПРОСОВ НЕТ -->

        const itop_crossArray = itop_cross.asArray()
        const itop_yArray = itop_y.asArray()


        // Найти первое совпадение itop_x.at(0) среди itop_crossArray
        // После последнего совпадения - брейкнуть цикл

        let start = false;
        let from, to, price;
        for (let i = 1; i < 1000; i++) {
            // if(itop_crossArray[i] && itop_crossArray[i] === itop_x.at(0)){
            //     start = true;
            //     plotBullInternalResult.add(itop_yArray[i])
            // } else if (start){
            //     break;
            // }
            if (!start && itop_crossArray[i] && itop_crossArray[i] === itop_x.at(0)) {
                start = true;
                from = itop_crossArray[i];
                price = itop_yArray[i];
            } else if (start && itop_crossArray[i] && itop_crossArray[i] !== itop_x.at(0)) {
                debugger
                to = itop_crossArray[i];
                break;
            }
        }

        function calculateInternalBullStructure(times: number[], prices: number[], showInternals: boolean) {
            const length = 6; // количество периодов для поиска максимума
            const displacedValues = new Structure(prices.length, null); //  new Array<number>(plotBullInternal.length).fill(0);

            // Рассчитываем InternalBullStructureVal для каждого периода
            for (let i = 0; i < prices.length; i++) {
                // Вычисляем максимум за последние length значений
                const start = Math.max(0, i - length + 1);
                const recentValues = prices.slice(start, i + 1);

                const highestValueIndex = recentValues.reduce((acc, curr, index, items) => {
                    if (items[index] > items[index - 1]) {
                        acc = index;
                    }

                    return acc;
                }, -1)

                // Проверка условия: если максимум не равен 0, записываем его, иначе null
                const internalBullStructureVal = highestValueIndex > -1 ? times[start + highestValueIndex] : null;

                // Смещаем значение internalBullStructureVal назад на 6 периодов, если showInternals включен
                const displacedIndex = i + 6;
                if (showInternals && displacedIndex < prices.length) {
                    displacedValues.addAt(displacedIndex, internalBullStructureVal);
                }
            }

            return displacedValues;
        }

        const InternalBullStructure = calculateInternalBullStructure(itop_x.asArray(), itop_y.asArray(), true);

        function calculateInternalBearStructure(times: number[], prices: number[], showInternals: boolean) {
            const length = 6; // количество периодов для поиска максимума
            const displacedValues = new Structure(prices.length, null);

            // Рассчитываем InternalBullStructureVal для каждого периода
            for (let i = 0; i < prices.length; i++) {
                // Вычисляем максимум за последние length значений
                const start = Math.max(0, i - length + 1);
                const recentValues = prices.slice(start, i + 1);

                const highestValueIndex = recentValues.reduce((acc, curr, index, items) => {
                    if (items[index] > items[index - 1]) {
                        acc = index;
                    }

                    return acc;
                }, -1)

                // Проверка условия: если максимум не равен 0, записываем его, иначе null
                const internalBearStructureVal = highestValueIndex > -1 ? times[start + highestValueIndex] : null;
// debugger
                // Смещаем значение internalBullStructureVal назад на 6 периодов, если showInternals включен
                const displacedIndex = i + 6;
                if (showInternals && displacedIndex < prices.length) {
                    displacedValues.addAt(displacedIndex, internalBearStructureVal);
                }
            }

            return displacedValues;
        }

        const InternalBearStructure = calculateInternalBearStructure(ibtm_x.asArray(), ibtm_y.asArray(), true);

        function AddChartBubble(condition, candle, text, bullish, isVertical) {
            const conf = bullish
                ? {
                    color: colors.bullColor,
                    position: 'aboveBar',
                    shape: 'text', // 'arrowUp',
                }
                : {
                    color: colors.bearColor,
                    position: 'belowBar',
                    shape: 'text', // 'arrowDown',
                };

            if (condition && candle) {
                // markers.push({
                //     ...conf,
                //     value: bullish ? candle?.high : candle?.low,
                //     time: candle?.time * 1000, // bar.time,
                //     text, // Текст внутри пузырька
                // });
            }
        }

        const highestCandle = (from: number, offset: number) => {
            if (from + offset < 0) {
                return null;
            }
            const batch = candles.slice(from + offset, from);
            const candle = batch.reduce((acc, curr) => {
                if (!acc) {
                    acc = curr;
                } else if (curr.high > acc.high) {
                    acc = curr;
                }

                return acc
            }, null);
            return candle;
        }
        const lowestCandle = (from: number, offset: number) => {
            if (from + offset < 0) {
                return null;
            }
            const batch = candles.slice(from + offset, from);
            const candle = batch.reduce((acc, curr) => {
                if (!acc) {
                    acc = curr;
                } else if (curr.low < acc.low) {
                    acc = curr;
                }

                return acc
            }, null);
            return candle;
        }

        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            InternalBullStructure.at(0) !== InternalBullStructure.at(1)
            && InternalBullStructure.at(5),
            // candles[InternalBullStructure.at(0)],
            highestCandle(InternalBullStructure.at(1), -6),
            itrend.at(0) === -1 || InternalBearStructure.at(5)
                ?
                'CHoCH'
                : 'BOS',
            true,
            true,
        );
        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            InternalBearStructure.at(0) !== InternalBearStructure.at(1)
            && InternalBearStructure.at(5),
            // candles[InternalBearStructure.at(0)],
            lowestCandle(InternalBearStructure.at(1), -6), // candles[InternalBearStructure.at(0)],
            itrend.at(0) === 1 || InternalBullStructure.at(5)
                ?
                'CHoCH'
                : 'BOS',
            false,
            true,
        );
    }

    const newLines = [];
    for (let i = 0; i < InternalBullStructureVal._data.length; i++) {
        if (!InternalBullStructureVal._data[i]) {
            continue;
        }
        newLines.push({
            price: InternalBullStructureVal._data[i],
            time: candles[i].time * 1000,
            color: colors.bullColor,
            bullish: true
        })
    }
    for (let i = 0; i < InternalBearStructureVal._data.length; i++) {
        if (!InternalBearStructureVal._data[i]) {
            continue;
        }
        newLines.push({
            price: InternalBearStructureVal._data[i],
            time: candles[i].time * 1000,
            color: colors.bearColor,
            bullish: false
        })
    }

    return {
        InternalBullStructureVal,
        InternalBearStructureVal,
        markers,
        newLines,
        itop_x,
        ibtm_x,
        ibtm_cross,
        itop_cross,
        itrend
    };
}

// Тут типо фильтруются малозначительные пробои.
// - Для пробоя быками нужно чтобы хвост сверху был больше хвоста снизу
// - Для пробоя медведями нужно чтобы хвост снизу был больше хвоста сверху
// Вычисляем хвосты: если хвост сверху больше чем хвост снизу - то бык
function calculateConcordance(high: Structure, low: Structure, close: Structure, open: Structure, ifilter_confluence: boolean) {
    const bull_concordant = !ifilter_confluence || high.at(0) - Math.max(close.at(0), open.at(0)) > Math.min(close.at(0), open.at(0)) - low.at(0);
    const bear_concordant = !ifilter_confluence || high.at(0) - Math.max(close.at(0), open.at(0)) < Math.min(close.at(0), open.at(0)) - low.at(0);
    return {bull_concordant, bear_concordant};
}

function calculateCrossesExtremes(high: Structure, low: Structure, close: Structure, open: Structure, itop_y: Structure, btm_y: Structure, itop_cross: Structure, itop_x: Structure, ibtm_cross: Structure, ibtm_x: Structure, ibtm_y: Structure, top_y: Structure, itrend: Structure, n: number, ifilter_confluence: boolean) {
    const {bull_concordant, bear_concordant} = calculateConcordance(high, low, close, open, ifilter_confluence);

    // Проверка на восходящий тренд
    if (
        Crosses(close, itop_y, CrossDirection.Above) &&
        itop_cross.at(1) < itop_x.at(0) &&
        top_y.at(0) !== itop_y.at(0) &&
        bull_concordant
    ) {
        itop_cross.add(itop_x.at(0));  // Записываем что последний локальный хай был обновлен
        itrend.add(1);  // Тренд восходящий
        ibtm_cross.add(ibtm_cross.at(0));  // Обновления локального лоя не произошло
    }
    // Проверка на нисходящий тренд
    else if (
        Crosses(close, ibtm_y, CrossDirection.Below) &&
        ibtm_cross.at(1) < ibtm_x.at(0) &&
        btm_y.at(0) !== ibtm_y.at(0) &&
        bear_concordant
    ) {
        ibtm_cross.add(ibtm_x.at(0));  // Записываем что последний локальный лой был обновлен
        itrend.add(-1);  // Тренд нисходящий
        itop_cross.add(itop_cross.at(0));  // Обновления локального хая не произошло
    } else {
        // Если нет изменений
        ibtm_cross.add(ibtm_cross.at(0));  // Продлеваем оба пересечения
        itop_cross.add(itop_cross.at(0));  // Продлеваем оба пересечения
        itrend.add(itrend.at(0));  // Просто берем предыдущие значения, тренд не менялся
    }
}

// Идем по пересечениям и записываем время и прайсы хаев и лоев
function fillSwings(n: number, length: number, localLength: number, top: number[], top_x: Structure, top_y: Structure, btm: number[], btm_x: Structure, btm_y: Structure, itop: number[], ibtm: number[], itop_x: Structure, itop_y: Structure, ibtm_x: Structure, ibtm_y: Structure) {
    // Если перехай найден
    if (top[n]) {
        // Записываем цену у перехаев
        top_y.add(top[n]);
        // Записываем индекс у перехаев
        top_x.add(n + length);

        // хз
        // trail_up.add(top[n]);
        // trail_up_x.add(n - length);
    } else {
        // Если перехая нет - будет 0, поэтому просто повторяем предыдущее значение и индекс
        top_y.add(top_y.at(0));
        top_x.add(top_x.at(0));

        // хз
        // trail_up.add(Max(high[n], trail_up.at(0)));
        // trail_up_x.add(trail_up.at(0) === high[n] ? n : trail_up_x.at(0));
    }
    // Аналогично для локального перехая
    if (itop[n]) {
        itop_y.add(itop[n]);
        itop_x.add(n + localLength);
    } else {
        itop_y.add(itop_y.at(0));
        itop_x.add(itop_x.at(0));
    }

    // Если перелой найден
    if (btm[n]) {
        // Записываем цену у перелоев
        btm_y.add(btm[n]);
        // Записываем индекс у перелоев
        btm_x.add(n + length);

        // trail_dn.add(btm[n]);
        // trail_dn_x.add(n - length);
    } else {
        // Если перелоев нет - будет 0, поэтому просто повторяем предыдущее значение и индекс
        btm_y.add(btm_y.at(0));
        btm_x.add(btm_x.at(0));

        // trail_dn.add(Min(low[n], trail_dn.at(0)));
        // trail_dn_x.add(trail_dn.at(0) === low[n] ? n : trail_dn_x.at(0));
    }
    // Аналогично для локального перелоев
    if (ibtm[n]) {
        ibtm_y.add(ibtm[n]);
        ibtm_x.add(n + localLength);
    } else {
        ibtm_y.add(ibtm_y.at(0));
        ibtm_x.add(ibtm_x.at(0));
    }
}

/**
 * Заполняем OHLC структуры последними ценами по n
 * @param candles
 * @param n
 * @param open
 * @param close
 * @param high
 * @param low
 */
function fillPrices(candles: {
    high: number,
    low: number,
    close: number,
    open: number,
    time: number
}[], n: number, open: Structure, close: Structure, high: Structure, low: Structure) {
    open.add(candles[n].open);
    close.add(candles[n].close);
    high.add(candles[n].high);
    low.add(candles[n].low);
}

function calculatePlotInternal(cross: Structure, x: Structure, y: Structure, structureVal: Structure, showInternals?: boolean) {
    const plotBullInternal = new Structure();
    for (let i1 = 0; i1 < 1000; i1++) {
        // if (cross.getValue(-(i1-1)) < x.getValue(-(i1-1)) && x.at(0) === x.getValue(-(i1-1))) {
        //     if (cross.getValue(-i1) === x.getValue(-i1)) {
        //         plotBullInternal.add(y.getValue(-i1));
        //     } else {
        //         plotBullInternal.add(0);
        //     }
        // } else {
        //     break;
        // }
        if (cross.at(i1 + 1) < x.at(i1 + 1) && x.at(0) === x.at(i1 + 1)) {
            if (cross.at(i1) === x.at(i1)) {
                plotBullInternal.add(y.at(i1));
            } else {
                plotBullInternal.add(0);
            }
        } else {
            break;
        }
    }

    structureVal.add(plotBullInternal.highest(6).at(0)? plotBullInternal.highest(6).at(0) : 0);

    return showInternals ? structureVal.displacer(-6) : null;
}

// Тут работает окей
function buildBubble(candles, x: Structure, internalStructure: Structure, contrStructure: Structure, itrend: Structure, colors: { bullColor: string, bearColor: string }, bullish?: boolean) {
    const conf = bullish
        ? {
            color: colors.bullColor,
            position: 'aboveBar',
            shape: 'text', // 'arrowUp',
        }
        : {
            color: colors.bearColor,
            position: 'belowBar',
            shape: 'text', // 'arrowDown',
        };

    const trend = bullish ? -1 : 1;

    if (x.at(0) !== x.at(1)){ // && internalStructure.at(0)) {
        const index = x.at(0);
        return {
            ...conf,
            value: bullish ? candles[index].high  : candles[index].low, //internalStructure.at(5),
            time: candles[index].time * 1000,
            text: itrend.at(0) === trend //|| contrStructure.at(5)
                ?
                'CHoCH'
                : 'BOS', // Текст внутри пузырька
        }
    }

    return null;
}