import {LineStyle} from "lightweight-charts";
import moment from "moment";

function Max(...numbers: number[]) {
    return Math.max(...numbers);
}

function Min(...numbers: number[]) {
    return Math.min(...numbers);
}

function GetValue(plot: Structure, offset: number): number {
    if(offset >= 0){
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

    private get fill(){
        if(this._fill !== undefined){
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

    highest(length: number){
        if(!this._data.length){
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

enum CrossDirection{
    // Цена (close) пробивает максимум (i_y) снизу верх - пробитие максимума, перехай
    Above = 'above',
    // Цена (close) пробивает минимум (i_y) сверху вниз - пробитие минимума, перелой
    Below = 'below',
}

function Crosses(close: number[], extremumPrice: number[], direction: CrossDirection) {
    for (let i = 1; i < extremumPrice.length; i++) {
        const prevClose = close[i - 1];
        const currClose = close[i];
        const prevExtremumPrice = extremumPrice[i - 1];
        const currExtremumPrice = extremumPrice[i];

        // Проверка пересечения для направления "above" (снизу вверх)
        if (
            direction === 'above' &&
            // Когда предыдущая цена закрытия ниже последнего максимума
            prevClose < prevExtremumPrice &&
            // А новая цена закрытия выше последнего (текущего) максимума
            currClose >= currExtremumPrice
        ) {
            // То считаем что произошло пробитие максимума (перехай)
            return true;
        }

        // Проверка пересечения для направления "below" (сверху вниз)
        if (
            direction === 'below' &&
            // Когда предыдущая цена закрытия выше последнего минимума
            prevClose > prevExtremumPrice &&
            // А новая цена закрытия ниже последнего (текущего) минимума
            currClose <= currExtremumPrice
        ) {
            // То считаем что произошло пробитие минимума (перелой)
            return true;
        }
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

/**
 * Поиск максимумов/минимумов свечного массива в рамках окна размером в len свечей
 * @param len Размер окна
 * @param candles Свечной ряд
 */
function swings(len: number = 5, candles: { high: number, low: number }[], withBug?: boolean = false): { top: number[]; btm: number[]; } {
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
        os.add(highs[i] > highestHigh ? (withBug ? 1 : 0) : lows[i] < lowestLow ? (withBug ? 0 : 1) : os.at(0));

        // Из общего массива значений разделяем его на 2 массива:
        // - если последнее значение было максимумом, а последнее нет (не обновлялось) - записываем максимум
        top.add(os.at(0) === 0 && os.at(1) !== 0 ? highs[i] : 0)
        // - если последнее значение было минимумом, а последнее нет (не обновлялось) - записываем минимум
        btm.add(os.at(0) === 1 && os.at(1) !== 1 ? lows[i] : 0)
    }

    return {top: top.asArray(), btm: btm.asArray()};
}

export function calculate(candles: {
    high: number,
    low: number,
    close: number,
    open: number,
    time: number
}[], windowLength?: number, withBug?: boolean) {
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

    const itrend = new Structure();

    const high = candles.map((c) => c.high);
    const close = candles.map((c) => c.close);
    const low = candles.map((c) => c.low);
    const open = candles.map((c) => c.open);

    const localLength = windowLength || 5;

    // Нашли максимумы и минимумы с окном в 50 свечек
    const {top, btm} = swings(length, candles, withBug);
    // Нашли максимумы и минимумы с окном в 5 свечек
    const {top: itop, btm: ibtm} = swings(localLength, candles, withBug);

    for (let n = length; n < candles.length; n++) {
        // Если перехай найден
        if (top[n]) {
            // Записываем цену у перехаев
            top_y.add(top[n]);
            // Записываем индекс у перехаев
            top_x.add(n - length);

            // хз
            trail_up.add(top[n]);
            trail_up_x.add(n - length);
        } else {
            // Если перехая нет - будет 0, поэтому просто повторяем предыдущее значение и индекс
            top_y.add(top_y.at(0));
            top_x.add(top_x.at(0));

            // хз
            trail_up.add(Max(high[n], trail_up.at(0)));
            trail_up_x.add(trail_up.at(0) === high[n] ? n : trail_up_x.at(0));
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

            trail_dn.add(btm[n]);
            trail_dn_x.add(n - length);
        } else {
            // Если перелоев нет - будет 0, поэтому просто повторяем предыдущее значение и индекс
            btm_y.add(btm_y.at(0));
            btm_x.add(btm_x.at(0));

            trail_dn.add(Min(low[n], trail_dn.at(0)));
            trail_dn_x.add(trail_dn.at(0) === low[n] ? n : trail_dn_x.at(0));
        }
        // Аналогично для локального перелоев
        if (ibtm[n]) {
            ibtm_y.add(ibtm[n]);
            ibtm_x.add(n - localLength);
        } else {
            ibtm_y.add(ibtm_y.at(0));
            ibtm_x.add(ibtm_x.at(0));
        }

        // Тут типо фильтруются малозначительные пробои.
        // - Для пробоя быками нужно чтобы хвост сверху был больше хвоста снизу
        // - Для пробоя медведями нужно чтобы хвост снизу был больше хвоста сверху
        // Вычисляем хвосты: если хвост сверху больше чем хвост снизу - то бык
        const bull_concordant =
            !ifilter_confluence ||
            high[n] - Max(close[n], open[n]) > Min(close[n], open[n]) - low[n];
            // high[n] - Max(close[n], open[n]) > Min(close[n], open[n] - low[n]); // TODO кажется тут баг
        // Если хвост сверху меньше чем хвост снизу - медведь
        const bear_concordant =
            !ifilter_confluence ||
            high[n] - Max(close[n], open[n]) < Min(close[n], open[n]) - low[n];
            // high[n] - Max(close[n], open[n]) < Min(close[n], open[n] - low[n]);

        if (
            // Если цена close превышает последний максимум itop_y снизу верх
            Crosses(close, itop_y.asArray(), CrossDirection.Above) &&
            // и время прошлого перехая (x) меньше времени текущего локального хая (x) (Cross который отработал перед этим - новый, а не повторный)
            itop_cross.at(1) < itop_x.at(0) &&
            // и если цена текущего ГЛОБАЛЬНОГО хая не равна цене текущего ЛОКАЛЬНОГО хая
            top_y.at(0) !== itop_y.at(0) &&
            // и если хвост сверху больше хвоста снизу
            bull_concordant
        ) {
            // Записываем что последний локальный хай был обновлен
            itop_cross.add(itop_x.at(0));
            // Тренд восходящий
            itrend.add(1);
            // Обновления локального лоя не произошло
            ibtm_cross.add(ibtm_cross.at(0));
        } else if (
            // Если цена close принижает последний минимум ibtm_y сверху вниз
            Crosses(close, ibtm_y.asArray(), CrossDirection.Below) &&
            // и время прошлого перелоя (x) меньше времени текущего локального лоя (x) (Cross который отработал перед этим - новый, а не повторный)
            ibtm_cross.at(1) < ibtm_x.at(0) &&
            // и если цена текущего ГЛОБАЛЬНОГО лоя не равна цене текущего ЛОКАЛЬНОГО лоя
            btm_y.at(0) !== ibtm_y.at(0) &&
            // и если хвост снизу больше хвоста сверху
            bear_concordant
        ) {
            // Записываем что последний локальный лой был обновлен
            ibtm_cross.add(ibtm_x.at(0));
            // Тренд нисходящий
            itrend.add(-1);
            // Обновления локального хая не произошло
            itop_cross.add(itop_cross.at(0));
        } else {
            // Продлеваем оба пересечения
            ibtm_cross.add(ibtm_cross.at(0));
            itop_cross.add(itop_cross.at(0));
            // Просто берем предыдущие значения, тренд не менялся
            itrend.add(itrend.at(0));
        }

        // console.log("itop_cross", itop_cross)
        // console.log("ibtm_cross", ibtm_cross)

        // <-- TODO ДО СЮДА ВОПРОСОВ НЕТ -->

        // plotBullInternal - формула рисования пунктирных линий, в которой находим точку начала и конца пунктирной линии
        // Рисуем пунктирную линию PaintingStrategy.DASHES
        // от точки GetValue(itop_x,-(i1-1)
        // пока точка GetValue(itop_x,-(i1-1) является последней точкой itop_x
        // и пока не пересечена новой свечой itop_cross
        // В момент пересечения GetValue(itop_cross,-(i1)) == GetValue(itop_x,-(i1)) записываем цену GetValue(itop_y,-i1)

        const itop_xArray = itop_x.asArray()
        const itop_crossArray = itop_cross.asArray()
        const itop_yArray = itop_y.asArray()
        const plotBullInternalResult = new Structure();


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
            if(!start && itop_crossArray[i] && itop_crossArray[i] === itop_x.at(0)){
                start = true;
                from = itop_crossArray[i];
                price = itop_yArray[i];
            } else if (start  && itop_crossArray[i] && itop_crossArray[i] !== itop_x.at(0)){
                debugger
                to = itop_crossArray[i];
                break;
            }



            // if(itop_crossArray[i] < itop_xArray[i] && itop_xArray[i] === itop_x.at(0)){
            //     // debugger
            //         if(itop_crossArray[i] === itop_xArray[i]){
            //             plotBullInternalResult.add(itop_yArray[i])
            //         } else {
            //             plotBullInternalResult.add(0);
            //         }
            // }
            // if(itop_crossArray[i] < itop_xArray[i] && itop_xArray[i] === itop_x.at(0)){
            //
            //     if(itop_crossArray[i - 1] === itop_yArray[i-1]){
            //         plotBullInternalResult.add(itop_yArray[i-1])
            //     } else {
            //         plotBullInternalResult.add(0);
            //     }
            // } else {
            //     break;
            // }
        }
        // if(from && to){
        //     console.log("plotBullInternalResult", [from, to]);
        // }

        // if(!Number.isNaN(plotBullInternalResult.highest(6))){
        //     console.log("plotBullInternalResult", plotBullInternalResult.highest(6))
        //     // lines.push({
        //     //     fromIndex,
        //     //     toIndex,
        //     //     price,
        //     //     color,
        //     //     style: LineStyle.LargeDashed
        //     // })
        // }

        // InternalBullStructureVal

        // Переводим fold из Thinkscript в TypeScript
        // function plotBullInternal(itop_cross: Structure, itop_x: Structure, itop_y: Structure): Structure {
        //     const result = new Structure();  // начальное значение переменной
        //     for (let i1 = 0; i1 < 1000; i1++) {
        //         const prevCross = GetValue(itop_cross, -(i1 - 1));
        //         const prevX = GetValue(itop_x, -(i1 - 1));
        //
        //         // while GetValue(itop_cross,-(i1-1)) < GetValue(itop_x,-(i1-1)) and itop_x == GetValue(itop_x,-(i1-1))
        //         if(prevCross < prevX &&  itop_x.at(0) === prevX){
        //             if(GetValue(itop_cross,-(i1)) === GetValue(itop_x,-(i1))){
        //                 result.add(GetValue(itop_y,-i1));
        //             } else {
        //                 result.add(0);
        //             }
        //         } else {
        //             break;
        //         }
        //     }
        //     return result;
        // }
        //
        //
        // const res = plotBullInternal(itop_cross, itop_x, itop_y);
        // res._data.length && console.log('plotBullInternal', res)

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
        // console.log('InternalBullStructure', InternalBullStructure);

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

    const itop_cross_array = itop_cross.asArray();
    const itop_y_array = itop_y.asArray();
    const itop_cross_result = [];
    let itop_cross_last;
    for (let i = 0; i < itop_cross_array.length; i++) {
        if(!itop_cross_array[i]){
            continue;
        }

        if(!itop_cross_last){
            itop_cross_last = itop_cross_array[i]
        } else if(itop_cross_last !== itop_cross_array[i]) {
            itop_cross_result.push({from: itop_cross_last, to: itop_cross_array[i], price: candles[itop_cross_last].high});
            itop_cross_last = null;
        }
    }


    const ibtm_cross_array =  ibtm_cross.asArray();
    const ibtm_y_array = ibtm_y.asArray();
    const ibtm_cross_result = [];
    let ibtm_cross_last;
    for (let i = 0; i < ibtm_cross_array.length; i++) {
        if(!ibtm_cross_array[i]){
            continue;
        }

        if(!ibtm_cross_last){
            ibtm_cross_last = ibtm_cross_array[i]
        } else if(ibtm_cross_last !== ibtm_cross_array[i]) {
            ibtm_cross_result.push({from: ibtm_cross_last, to: ibtm_cross_array[i], price: candles[ibtm_cross_last].low});
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

    const topLines = itop_cross_result.map(({from, to, price}) => ({price, fromTime: candles[from].time * 1000, toTime: candles[to].time * 1000, color: 'rgb(20, 131, 92)'}))

    const btmLines = ibtm_cross_result.map(({from, to, price}) => ({price, fromTime: candles[from].time * 1000, toTime: candles[to].time * 1000, color: 'rgb(157, 43, 56)'}))

    const lines = [...btmLines, ...topLines];

    // console.log("itop_x", itop_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("ibtm_x", ibtm_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("itop_x_format_time", itop_x._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("itop_y", itop_y);
    // console.log("itop_cross", itop_cross);
    // console.log("itop_cross_format_time", itop_cross._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("ibtm_cross_format_time", ibtm_cross._data.map(i => moment(candles[i].time * 1000).format('YYYY-MM-DD HH:mm')));
    // console.log("lines", lines);

    return {markers, lines, btm, ibtm, _top: top, itop, top_x, btm_x, itop_x, ibtm_x, ibtm_cross, itop_cross};
}