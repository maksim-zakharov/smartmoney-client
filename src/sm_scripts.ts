function Max(...numbers: number[]) {
    return Math.max(...numbers);
}

function Min(...numbers: number[]) {
    return Math.min(...numbers);
}

function GetValue(plot: Structure, offset: number): number {
    if (offset >= 0) {
        return plot.at(0);
    }
    return plot._data[-offset];
}

class double {
    static nan = Number.NaN;
}

function highest(arr: number[], length: number) {
    // Проверяем, что длина массива больше либо равна нужному количеству периодов
    if (arr.length < length) return null;

    // Берем последние length элементов массива и находим максимальное значение
    const recentValues = arr.slice(-length);
    return Math.max(...recentValues);
}

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

    getValue(index: number) {
        if (index >= 0) {
            return this.at(index);
        }

        return this._data[-index];
    }

    add(val: number) {
        this._data.push(val ?? this.fill);
    }

    addAt(index: number, val: number) {
        this._data[index] = val;
    }

    highest(length: number) {
        if (!this._data.length) {
            return NaN;
        }
        return Math.max(...this._data.slice(-length))
    }
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

function Crosses(close: number[], extremumPrice: Structure, direction: CrossDirection) {
    if (close.length < 2 || extremumPrice._data.length < 2) {
        return false;
    }

    // Проверка пересечения для направления "below" (сверху вниз)
    if (
        direction === CrossDirection.Below &&
        // Когда предыдущая цена закрытия выше последнего минимума
        close[close.length - 1 - 1] > extremumPrice.at(1) &&
        // А новая цена закрытия ниже последнего (текущего) минимума
        close[close.length - 1] <= extremumPrice.at(0)
    ) {
        // То считаем что произошло пробитие минимума (перелой)
        return true;
    }

    // Проверка пересечения для направления "above" (снизу вверх)
    if (
        direction === CrossDirection.Above &&
        // Когда предыдущая цена закрытия ниже последнего максимума
        close[close.length - 1 - 1] < extremumPrice.at(1) &&
        // А новая цена закрытия выше последнего (текущего) максимума
        close[close.length - 1] >= extremumPrice.at(0)
    ) {
        // То считаем что произошло пробитие максимума (перехай)
        return true;
    }

    return false;
}

class SwingClass {
    len: number;
    os: number;
    old_os: number;
    owner: { High: number[], Low: number[] } = {High: [], Low: []};

    constructor(candles: { high: number, low: number }[]) {
        const highs = candles.map((price) => price.high);
        const lows = candles.map((price) => price.low);
        this.owner.High = highs;
        this.owner.Low = lows;
    }

    doCalc(top: number, btm: number, len: number, upper: number, lower: number) {
        this.os = this.owner.High[len] > upper ? 0 : (this.owner.Low[len] < lower ? 1 : this.old_os);
        top = this.os != 0 || this.old_os == 0 ? 0 : this.owner.High[len];
        btm = this.os != 1 || this.old_os == 1 ? 0 : this.owner.Low[len];
        this.old_os = this.os;

        return {top, btm};
    }
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

    const os = new Structure(len, null);
    // Массив перехаев, если 0 - то не было продолжения
    const top = new Structure(len, 0);
    // Массив перелоев, если 0 - то не было продолжения
    const btm = new Structure(len, 0);

    // Проходим по данным начиная с индекса len
    for (let i = len; i < candles.length; i++) {
        // За каждое окно длинную в len свечек находим максимум и минимум
        const highestHigh = Math.max(...highs.slice(i - len, i));
        const lowestLow = Math.min(...lows.slice(i - len, i));

        // Если текущий хай выше прошлого максимума - 0 (произошло обновление максимума), если текущий лой ниже прошлого лоя - 1 (произошло обновление минимума), иначе берем последнее значение.
        os.add(highs[i] > highestHigh ? OSType.UpdateHigh : lows[i] < lowestLow ? OSType.UpdateLow : os.at(0));
        // os.add(highs[i] > highestHigh ? 0 : lows[i] < lowestLow ? 1 : os.at(0));

        // Из общего массива значений разделяем его на 2 массива:
        // - если последнее значение было максимумом, а последнее нет (не обновлялось) - записываем максимум
        top.add(os.at(0) === OSType.UpdateHigh && os.at(1) === OSType.UpdateLow ? highs[i] : 0)
        // - если последнее значение было минимумом, а последнее нет (не обновлялось) - записываем минимум
        btm.add(os.at(0) === OSType.UpdateLow && os.at(1) === OSType.UpdateHigh ? lows[i] : 0)
    }

    return {top: top.asArray(), btm: btm.asArray()};
}

export function calculate(candles: {
    high: number,
    low: number,
    close: number,
    open: number,
    time: number
}[], windowLength?: number) {
    let markers = [];

    const colors = {};

    function CreateColor(...params) {
        return `rgb(${params.join(',')})`;
    }

    function DefineGlobalColor(key, value) {
        colors[key] = value;
    }

    const showInternals = true;
    const length = 50;
    const ifilter_confluence = false;
    DefineGlobalColor('Internal Bullish', CreateColor(20, 131, 92));
    DefineGlobalColor('Internal Bearish', CreateColor(157, 43, 56));
    DefineGlobalColor('Swing Bullish', CreateColor(20, 131, 92));
    DefineGlobalColor('Swing Bearish', CreateColor(157, 43, 56));

    const top_cross = [],
        top_y = new Structure(),
        top_x = new Structure(),
        trail_up = new Structure(),
        trail_up_x = new Structure();
    // Серия индексов моментов перехаев
    const itop_cross = new Structure(),
        itop_y = new Structure(),
        itop_x = new Structure();
    // Серия индексов моментов перелоев
    const ibtm_cross = new Structure(),
        ibtm_y = new Structure(),
        ibtm_x = new Structure();
    const btm_cross = [],
        btm_y = new Structure(),
        btm_x = new Structure(),
        trail_dn = new Structure(),
        trail_dn_x = new Structure();

    const localLength = windowLength || 5;

    const itrend = new Structure(50, 0);

    const high = candles.map((c) => c.high);
    const close = candles.map((c) => c.close);
    const low = candles.map((c) => c.low);
    const open = candles.map((c) => c.open);

    // Нашли максимумы и минимумы с окном в 50 свечек
    const {top, btm} = swings(length, candles);
    // Нашли максимумы и минимумы с окном в 5 свечек
    const {top: itop, btm: ibtm} = swings(localLength, candles);

    for (let n = length; n < candles.length; n++) {

        fillSwings(n, length, localLength, top, top_x, top_y, btm, btm_x, btm_y, itop, ibtm, itop_x, itop_y, ibtm_x, ibtm_y)

        calculateCrossesExtremes(high, low, close, open, itop_y, btm_y, itop_cross, itop_x, ibtm_cross, ibtm_x, ibtm_y, top_y, itrend, n, ifilter_confluence)

        /** Рисуем пунктирные линии
         * def plotBullInternal =
         *      fold i1 = 0 to 1000
         *          with p1 = 0
         *              while GetValue(itop_cross,-(i1-1)) < GetValue(itop_x,-(i1-1)) and itop_x == GetValue(itop_x,-(i1-1))
         *                  do
         *                      if GetValue(itop_cross,-(i1)) == GetValue(itop_x,-(i1))
         *                          then GetValue(itop_y,-i1)
         *                          else 0;
         */

            // <-- TODO ДО СЮДА ВОПРОСОВ НЕТ -->

            // plotBullInternal - формула рисования пунктирных линий, в которой находим точку начала и конца пунктирной линии
            // Рисуем пунктирную линию PaintingStrategy.DASHES
            // от точки GetValue(itop_x,-(i1-1)
            // пока точка GetValue(itop_x,-(i1-1) является последней точкой itop_x
            // и пока не пересечена новой свечой itop_cross
            // В момент пересечения GetValue(itop_cross,-(i1)) == GetValue(itop_x,-(i1)) записываем цену GetValue(itop_y,-i1)

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

        // console.log('InternalBearStructure', InternalBearStructure);

        function GlobalColor(key) {
            return colors[key];
        }

        function AddChartBubble(condition, candle, text, bullish, isVertical) {
            const conf = bullish
                ? {
                    color: GlobalColor('Internal Bullish'),
                    position: 'aboveBar',
                    shape: 'text', // 'arrowUp',
                }
                : {
                    color: GlobalColor('Internal Bearish'),
                    position: 'belowBar',
                    shape: 'text', // 'arrowDown',
                };

            if (condition && candle) {
                markers.push({
                    ...conf,
                    value: bullish ? candle?.high : candle?.low,
                    time: candle?.time * 1000, // bar.time,
                    text, // Текст внутри пузырька
                });
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

    const plotBullInternal = [];
    for (let i1 = 0; i1 < 1000; i1++) {

        // Пока мы копим последнее значение - рисуем его
        if (itop_x.at(0) === itop_x.at(i1)) {
            plotBullInternal.push(itop_y.at(i1));
        } else {
            break;
        }

        // if (itop_cross.at(i1) < itop_x.at(i1) && itop_x.at(0) === itop_x.at(i1)) {
        //     if (itop_cross.at(i1) === itop_x.at(i1)) {
        //         plotBullInternal.push(itop_y.at(i1));
        //     } else {
        //         plotBullInternal.push(0);
        //     }
        // }
    }

    const itop_cross_array = itop_cross.asArray();
    const itop_x_array = itop_x.asArray();
    const itop_y_array = itop_y.asArray();
    const itop_cross_result = [];
    let itop_cross_last;
    let itop_cross_price;
    for (let i = 0; i < itop_cross_array.length; i++) {
        if (!itop_cross_array[i]) {
            continue;
        }

        if (!itop_cross_last) {
            itop_cross_last = itop_cross_array[i]
            itop_cross_price = itop_y_array[i];
        } else if (itop_cross_last !== itop_cross_array[i]) {
            itop_cross_result.push({
                from: itop_cross_last,
                to: itop_cross_array[i],
                price: itop_cross_price
            });
            itop_cross_last = null;
            itop_cross_price = null;
        }
    }


    const ibtm_cross_array = ibtm_cross.asArray();
    const ibtm_y_array = ibtm_y.asArray();
    const ibtm_cross_result = [];
    let ibtm_cross_last;
    let ibtm_cross_price;
    for (let i = 0; i < ibtm_cross_array.length; i++) {
        if (!ibtm_cross_array[i]) {
            continue;
        }

        if (!ibtm_cross_last) {
            ibtm_cross_last = ibtm_cross_array[i]
            ibtm_cross_price = ibtm_y_array[i];
        } else if (ibtm_cross_last !== ibtm_cross_array[i]) {
            ibtm_cross_result.push({
                from: ibtm_cross_last,
                to: ibtm_cross_array[i],
                price: ibtm_cross_price
            });
            ibtm_cross_last = null;
        }
    }

    // console.log('Цены локальных перехаев', itop_y);
    // console.log('Индексы локальных перехаев', itop_x);
    // console.log('Время локальных пересечений свнизу верх', itop_cross);
    // console.log('Цены локальных перелоев', ibtm_y);
    // console.log('Индексы локальных перелоев', ibtm_x);
    // console.log('Время локальных пересечений сверху вниз', ibtm_cross);

    // console.log("itop_cross_result", itop_cross_result)

    const topLines = itop_cross_result.map(({from, to, price}) => ({
        price,
        fromTime: candles[from].time * 1000,
        toTime: candles[to].time * 1000,
        color: 'rgb(20, 131, 92)'
    }))

    const btmLines = ibtm_cross_result.map(({from, to, price}) => ({
        price,
        fromTime: candles[from].time * 1000,
        toTime: candles[to].time * 1000,
        color: 'rgb(157, 43, 56)'
    }))

    const lines = [...btmLines, ...topLines];

    // console.log("itop_x", itop_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("ibtm_x", ibtm_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("itop_x_format_time", itop_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("itop_y", itop_y);
    // console.log("itop_cross", itop_cross);
    // console.log("itop_cross_format_time", itop_cross._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("ibtm_cross_format_time", ibtm_cross._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("lines", lines);

    return {markers, lines, btm, ibtm, _top: top, itop, top_x, btm_x, itop_x, ibtm_x, ibtm_cross, itop_cross, itrend};
}

// Тут типо фильтруются малозначительные пробои.
// - Для пробоя быками нужно чтобы хвост сверху был больше хвоста снизу
// - Для пробоя медведями нужно чтобы хвост снизу был больше хвоста сверху
// Вычисляем хвосты: если хвост сверху больше чем хвост снизу - то бык
function calculateConcordance(high: number[], low: number[], close: number[], open: number[], n: number, ifilter_confluence: boolean) {
    const bull_concordant = !ifilter_confluence || high[n] - Math.max(close[n], open[n]) > Math.min(close[n], open[n]) - low[n];
    const bear_concordant = !ifilter_confluence || high[n] - Math.max(close[n], open[n]) < Math.min(close[n], open[n]) - low[n];
    return {bull_concordant, bear_concordant};
}

function calculateCrossesExtremes(high: number[], low: number[], close: number[], open: number[], itop_y: Structure, btm_y: Structure, itop_cross: Structure, itop_x: Structure, ibtm_cross: Structure, ibtm_x: Structure, ibtm_y: Structure, top_y: Structure, itrend: Structure, n: number, ifilter_confluence: boolean) {
    const {bull_concordant, bear_concordant} = calculateConcordance(high, low, close, open, n, ifilter_confluence);

    // Проверка на восходящий тренд
    if (
        Crosses(close.slice(n - 1, n + 1), itop_y, CrossDirection.Above) &&
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
        Crosses(close.slice(n - 1, n + 1), ibtm_y, CrossDirection.Below) &&
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

function fillSwings(n: number, length: number, localLength: number, top: number[], top_x: Structure, top_y: Structure, btm: number[], btm_x: Structure, btm_y: Structure, itop: number[], ibtm: number[], itop_x: Structure, itop_y: Structure, ibtm_x: Structure, ibtm_y: Structure) {
    // Если перехай найден
    if (top[n]) {
        // Записываем цену у перехаев
        top_y.add(top[n]);
        // Записываем индекс у перехаев
        top_x.add(n - length);

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
        itop_x.add(n - localLength);
    } else {
        itop_y.add(itop_y.at(0));
        itop_x.add(itop_x.at(0));
    }

    // Если перелой найден
    if (btm[n]) {
        // Записываем цену у перелоев
        btm_y.add(btm[n]);
        // Записываем индекс у перелоев
        btm_x.add(n - length);

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
        ibtm_x.add(n - localLength);
    } else {
        ibtm_y.add(ibtm_y.at(0));
        ibtm_x.add(ibtm_x.at(0));
    }
}