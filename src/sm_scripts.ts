function Max(...numbers: number[]) {
    return Math.max(...numbers);
}

function Min(...numbers: number[]) {
    return Math.min(...numbers);
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

function GetValue(dataArray: number[], shift: number = 0) {
    // if (shift < 0 || shift >= dataArray.length) {
    //   return null;
    //   // throw new Error("Shift out of bounds");
    // }
    // return dataArray[dataArray.length - 1 - shift];

    return dataArray[-shift];
}

class Structure {
    _data: number[] = [];

    constructor(length?: number, fill?: number) {
        if (length) {
            this._data = new Array(length).fill(fill ?? 0);
        }
    }

    asArray() {
        return this._data;
    }

    at(index: number) {
        if (index < 0) {
            return null;
        }
        return this._data[this._data.length - 1 - index] ?? 0;
    }

    getValue(index: number) {
        if (index >= 0) {
            return this.at(index);
        }

        return this._data[-index];
    }

    add(val: number) {
        this._data.push(val ?? 0);
    }

    addAt(index: number, val: number){
        this._data[index] = val;
    }

    displaced(shift: number){
        const result = new Array(this._data.length).fill(null); // Массив для хранения результата

        for (let i = 0; i < this._data.length; i++) {
            const newIndex = i - shift; // Считаем новый индекс
            if (newIndex >= 0 && newIndex < this._data.length) {
                result[i] = this._data[newIndex]; // Записываем смещенное значение
            }
        }
        this._data = result;
        return result;
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

function swings(len: number = 5, candles: { high: number, low: number }[]) {
    const highs = candles.map((price) => price.high);
    const lows = candles.map((price) => price.low);

    const os = new Structure(0, 0); //   new Array<number>(len).fill(0);
    const top = new Structure(0, 0);// new Array<number>(len).fill(0);
    const btm = new Structure(0, 0);// new Array<number>(len).fill(0);

    // Проходим по данным начиная с индекса len
    for (let i = len; i < candles.length; i++) {
        const highestHigh = Math.max(...highs.slice(i - len, i));
        const lowestLow = Math.min(...lows.slice(i - len, i));

        os.add(highs[i] > highestHigh ? 0 : lows[i] < lowestLow ? 1 : os.at(0));

        // Определяем top и btm
        top.add(os.at(0) === 0 && os.at(1) !== 0 ? highs[i] : 0)
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
}[], windowLength?: number) {
    const markers = [];

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
    const itop_cross = new Structure(),
        itop_y = new Structure(),
        itop_x = new Structure();
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

    const {top: _top, btm} = swings(length, candles);
    const {top: itop, btm: ibtm} = swings(localLength, candles);
    console.log("_top", _top)
    console.log("btm", btm)
    console.log("itop", itop)
    console.log("ibtm", ibtm)


    for (let n = length; n < candles.length; n++) {
        if (_top[n]) {
            // Записываем цену у перехаев
            top_y.add(_top[n]);
            // Записываем индекс у перехаев
            top_x.add(n - length);

            trail_up.add(_top[n]);
            trail_up_x.add(n - length);
        } else {
            // Если перехая нет - будет 0, поэтому просто повторяем предыдущее значение и индекс
            top_y.add(top_y.at(0));
            top_x.add(top_x.at(0));

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

        const bull_concordant =
            !ifilter_confluence ||
            // high[n] - Max(close[n], open[n]) > Min(close[n], open[n]) - low[n];
            high[n] - Max(close[n], open[n]) > Min(close[n], open[n] - low[n]); // TODO кажется тут баг
        const bear_concordant =
            !ifilter_confluence ||
            // high[n] - Max(close[n], open[n]) < Min(close[n], open[n]) - low[n];
            high[n] - Max(close[n], open[n]) < Min(close[n], open[n] - low[n]);

        if (
            // Если цена close пересекает линию itop_y снизу верх
            CrossOver(close, itop_y.asArray()) &&
            // Crosses(close, itop_y.asArray(), CrossingDirection.ABOVE) &&
            // и время прошлого пересечения сверху (x) меньше времени текущего локального перехая (x)
            itop_cross.at(1) < itop_x.at(0) &&
            // и если цена текущего ГЛОБАЛЬНОГО хая не равна цене текущего ЛОКАЛЬНОГО хая
            top_y.at(0) !== itop_y.at(0) &&
            // и если хвост сверху больше хвоста снизу
            bull_concordant
        ) {
            // Добавляем время текущего пересечения сверху
            itop_cross.add(itop_x.at(0));
            // Тренд восходящий
            itrend.add(1);
            // Продлеваем время пересечения снизу
            ibtm_cross.add(ibtm_cross.at(0));
        } else if (
            // Если цена close пересекает линию ibtm_y сверху вниз
            CrossUnder(close, ibtm_y.asArray()) &&
            // Crosses(close, ibtm_y.asArray(), CrossingDirection.BELOW) &&
            // и время прошлого пересечения (x) меньше времени текущего локального перелоя (x)
            ibtm_cross.at(1) < ibtm_x.at(0) &&
            // и если цена текущего ГЛОБАЛЬНОГО лоя не равна цене текущего ЛОКАЛЬНОГО лоя
            btm_y.at(0) !== ibtm_y.at(0) &&
            // и если хвост снизу больше хвоста сверху
            bear_concordant
        ) {
            // Добавляем время текущего пересечения снизу
            ibtm_cross.add(ibtm_x.at(0));
            // Тренд нисходящий
            itrend.add(-1);
            // Продлеваем время пересечения сверху
            itop_cross.add(itop_cross.at(0));
        } else {
            // Продлеваем оба пересечения
            ibtm_cross.add(ibtm_cross.at(0));
            itop_cross.add(itop_cross.at(0));
            // Просто берем предыдущие значения, тренд не менялся
            itrend.add(itrend.at(0));
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
                    if(index === 0 || items[index] > items[index - 1]){
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
        console.log('InternalBullStructure', InternalBullStructure);

        function calculateInternalBearStructure(times: number[], prices: number[], showInternals: boolean) {
            const length = 6; // количество периодов для поиска максимума
            const displacedValues = new Structure(prices.length, null);

            // Рассчитываем InternalBullStructureVal для каждого периода
            for (let i = 0; i < prices.length; i++) {
                // Вычисляем максимум за последние length значений
                const start = Math.max(0, i - length + 1);
                const recentValues = prices.slice(start, i + 1);

                const highestValueIndex = recentValues.reduce((acc, curr, index, items) => {
                    if(index === 0 || items[index] > items[index - 1]){
                        acc = index;
                    }

                    return acc;
                }, -1)

                // Проверка условия: если максимум не равен 0, записываем его, иначе null
                const internalBearStructureVal = highestValueIndex > -1 ? times[start + highestValueIndex] : null;

                // Смещаем значение internalBullStructureVal назад на 6 периодов, если showInternals включен
                const displacedIndex = i + 6;
                if (showInternals && displacedIndex < prices.length) {
                    displacedValues.addAt(displacedIndex, internalBearStructureVal);
                }
            }

            return displacedValues;
        }

        const InternalBearStructure = calculateInternalBearStructure(ibtm_x.asArray(), ibtm_y.asArray(), true);
            console.log('InternalBearStructure', InternalBearStructure);

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

        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            InternalBullStructure.at(0) !== InternalBullStructure.getValue(1)
            && !Number.isNaN(InternalBullStructure.at(4)),
            candles[InternalBullStructure.at(0)],
            itrend.at(0) === -1 // || !Number.isNaN(InternalBearStructure.at(4))
                ?
                'CHoCH'
                : 'BOS',
            true,
            true,
        );
        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            InternalBearStructure.at(0) !== InternalBearStructure.getValue(1)
            && !Number.isNaN(InternalBearStructure.at(4)),
            candles[InternalBearStructure.at(0)],
            itrend.at(0) === -1 // || !Number.isNaN(InternalBullStructure.at(4))
                ?
                'CHoCH'
                : 'BOS',
            false,
            true,
        );
    }

    console.log('Цены локальных перехаев', itop_y);
    console.log('Индексы локальных перехаев', itop_x);
    console.log('Время локальных пересечений свнизу верх', itop_cross);
    console.log('Цены локальных перелоев', ibtm_y);
    console.log('Индексы локальных перелоев', ibtm_x);
    console.log('Время локальных пересечений сверху вниз', ibtm_cross);

    console.log(markers);

    return {markers, btm, ibtm, _top, itop, top_x, btm_x, itop_x, ibtm_x, ibtm_cross, itop_cross};
}