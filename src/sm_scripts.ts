function Max(...numbers: number[]) {
    return Math.max(...numbers);
}

function Min(...numbers: number[]) {
    return Math.min(...numbers);
}

class double {
    static nan = [];
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

    let colors = {};

    function CreateColor(...params) {
        return `rgb(${params.join(',')})`;
    }

    function DefineGlobalColor(key, value) {
        colors[key] = value;
    }

    const showInternals = true;
// #input InternalBullStruct = {default All, BOS, CHoCH};
// #input InternalBearStruct = {default All, BOS, CHoCH};
    const showSwings = true;
// #input SwingBullStruct = {default All, BOS, CHoCH};
// #input SwingBearStruct = {default All, BOS, CHoCH};
    const length = 50;
    const ifilter_confluence = false;
    const show_hl_swings = true;
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
        // let lastbarbn = HighestAll(If(IsNaN(close[n]), [0], [n]));

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

        /**
         * #Low Pivots Setdn
         * def btm_cross; def btm_y; def btm_x; def trail_dn; def trail_dn_x;
         * if (btm != 0) then {
         *     btm_y = btm;
         *     btm_x = n - length;
         *
         *     trail_dn = btm;
         *     trail_dn_x = n - length;
         * } else {
         *     btm_y = btm_y[1];
         *     btm_x = btm_x[1];
         *     trail_dn = Min(low, trail_dn[1]);
         *     trail_dn_x = if trail_dn == low then n else trail_dn_x[1];
         * }
         * def ibtm_cross; def ibtm_y; def ibtm_x;
         * if (ibtm != 0) then {
         *     ibtm_y = ibtm;
         *     ibtm_x = n - 5;
         * } else {
         *     ibtm_y = ibtm_y[1];
         *     ibtm_x = ibtm_x[1];
         * }
         */
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

        /**
         * #Internal Structures
         * def bull_concordant = if !ifilter_confluence then yes else high - Max(close, open) > Min(close, open - low);
         * def bear_concordant = if !ifilter_confluence then yes else high - Max(close, open) < Min(close, open - low);
         * def itrend;
         * if (Crosses(close, itop_y, CrossingDirection.ABOVE) and itop_cross[1] < itop_x  and top_y != itop_y and bull_concordant) then {
         *     itop_cross = itop_x;
         *     itrend = 1;
         *     ibtm_cross = ibtm_cross[1];
         * }
         * else if(Crosses(close, ibtm_y, CrossingDirection.BELOW) and ibtm_cross[1] < ibtm_x  and btm_y != ibtm_y and bear_concordant)then {
         *     ibtm_cross = ibtm_x;
         *     itrend = -1;
         *     itop_cross = itop_cross[1];
         * }
         * else {
         *     ibtm_cross = ibtm_cross[1];
         *     itop_cross = itop_cross[1];
         *     itrend = itrend[1];
         * }
         */
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

        /**
         * #Plot Internal Structure
         * #Bullish
         * def plotBullInternal = fold i1 = 0 to 1000 with p1 = 0 while GetValue(itop_cross,-(i1-1)) < GetValue(itop_x,-(i1-1)) and itop_x == GetValue(itop_x,-(i1-1)) do if GetValue(itop_cross,-(i1)) == GetValue(itop_x,-(i1)) then GetValue(itop_y,-i1) else 0;
         * def InternalBullStructureVal = if highest(plotBullInternal,6) != 0 then highest(plotBullInternal,6) else double.nan;
         * plot InternalBullStructure = if showInternals then Displacer(-6,InternalBullStructureVal) else double.nan;
         * InternalBullStructure.SetDefaultColor(GlobalColor("Internal Bullish"));
         * InternalBullStructure.SetPaintingStrategy(paintingStrategy = PaintingStrategy.DASHES);
         *
         * #Bearish
         * def plotBearInternal = fold i2 = 0 to 1000 with p2 = 0 while GetValue(ibtm_cross,-(i2-1)) < GetValue(ibtm_x,-(i2-1)) and ibtm_x == GetValue(ibtm_x,-(i2-1)) do if GetValue(ibtm_cross,-(i2)) == GetValue(ibtm_x,-(i2)) then GetValue(ibtm_y,-i2) else 0;
         * def InternalBearStructureVal = if highest(plotBearInternal,6) != 0 then highest(plotBearInternal,6) else double.nan;
         * plot InternalBearStructure = if showInternals then Displacer(-6,InternalBearStructureVal) else double.nan;
         * InternalBearStructure.SetDefaultColor(GlobalColor("Internal Bearish"));
         * InternalBearStructure.SetPaintingStrategy(paintingStrategy = PaintingStrategy.DASHES);
         *
         * #Labels
         * AddChartBubble(showInternals and itop_x != itop_x[1] and !IsNan(InternalBullStructure[4]), InternalBullStructure,
         *     if(itrend == -1 or !IsNan(InternalBearStructure[4])) then "CHoCH" else "BOS", GlobalColor("Internal Bullish"), yes);
         * AddChartBubble(showInternals and ibtm_x != ibtm_x[1] and !IsNan(InternalBearStructure[4]), InternalBearStructure,
         *     if(itrend == 1 or !IsNan(InternalBullStructure[4])) then "CHoCH" else "BOS", GlobalColor("Internal Bearish"), no);
         */

        const plotBullInternalNewFixed = itop_x.asArray();
        console.log('plotBullInternalNewFixed', plotBullInternalNewFixed);

        // #Bullish
        const plotBullInternalNew = itop_cross.asArray().map((_, i1) =>
            itop_cross.getValue(-(i1 - 1)) < itop_x.getValue(-(i1 - 1)) &&
            itop_x.at(0) === itop_x.getValue(-(i1 - 1))
                ? itop_cross.getValue(-i1) === itop_x.getValue(-i1)
                    ? itop_y.getValue(-i1)
                    : 0
                : // GetValue(itop_index, -(i1 - 1)) !== GetValue(itop_index, -(i1 - 2))
                  //   ? GetValue(itop_index, -(i1 - 1))
                0,
        );
        const plotBullInternal = itop_cross.asArray().map((_, i1) =>
            GetValue(itop_cross.asArray(), -(i1 - 1)) <
            GetValue(itop_x.asArray(), -(i1 - 1)) &&
            itop_x.at(0) === GetValue(itop_x.asArray(), -(i1 - 1))
                ? GetValue(itop_cross.asArray(), -i1) ===
                GetValue(itop_x.asArray(), -i1)
                    ? GetValue(itop_y.asArray(), -i1)
                    : 0
                : // GetValue(itop_index, -(i1 - 1)) !== GetValue(itop_index, -(i1 - 2))
                  //   ? GetValue(itop_index, -(i1 - 1))
                0,
        );

        console.log('plotBullInternalNew', plotBullInternalNew);
        console.log('plotBullInternalOld', plotBullInternal);

        const InternalBullStructureVal = Max(...plotBullInternalNewFixed.slice(-6));

        console.log('plotBullInternalNewFixed.slice(-6)', plotBullInternalNewFixed);
        console.log('InternalBullStructureVal', InternalBullStructureVal);
        const InternalBullStructure = showInternals
            ? InternalBullStructureVal
                ? [InternalBullStructureVal] // - 6]
                : []
            : // ? Displacer(-6, InternalBullStructureVal)
            double.nan;
        // InternalBullStructure.SetDefaultColor(GlobalColor("Internal Bullish"));
        // InternalBullStructure.SetPaintingStrategy(paintingStrategy = PaintingStrategy.DASHES);

        console.log('InternalBullStructure', InternalBullStructure);

        const plotBearInternalNewFixed = ibtm_x.asArray();
        console.log('plotBearInternalNewFixed', plotBearInternalNewFixed);

        function plotBearInternal(ibtm_cross, ibtm_x, ibtm_y) {
            let result = 0;

            // Цикл от 0 до 1000, как в fold
            for (let i2 = 0; i2 <= 1000; i2++) {
                // Условие цикла while из ThinkScript
                if (
                    !(
                        ibtm_cross[i2 - 1] < ibtm_x[i2 - 1] && ibtm_x[i2] === ibtm_x[i2 - 1]
                    )
                ) {
                    break;
                }

                // Если ibtm_cross[i2] == ibtm_x[i2], то выбираем значение ibtm_y[i2]
                if (ibtm_cross[i2] === ibtm_x[i2]) {
                    result = ibtm_y[i2];
                } else {
                    result = 0;
                }
            }

            return result;
        }

        function plotBearInternal2(ibtm_cross, ibtm_x, ibtm_y) {
            let p2 = 0;
            let i2 = 0;

            while (i2 < 1000) {
                // Проверяем условия цикла
                if (
                    ibtm_cross[ibtm_cross.length - i2 - 1] <
                    ibtm_x[ibtm_x.length - i2 - 1] &&
                    ibtm_x[ibtm_x.length - i2 - 1] === ibtm_x[ibtm_x.length - i2 - 2]
                ) {
                    // Выполняем условие внутри цикла
                    if (
                        ibtm_cross[ibtm_cross.length - i2] === ibtm_x[ibtm_x.length - i2]
                    ) {
                        p2 += ibtm_y[ibtm_y.length - i2];
                    } else {
                        p2 += 0;
                    }
                    i2++;
                } else {
                    break;
                }
            }

            return p2;
        }

        function plotBearInternal3(data) {
            let p2 = 0;

            // data - это объект, содержащий массивы значений ibtm_cross, ibtm_x и ibtm_y.
            // Предполагается, что данные отсортированы в порядке, где data.ibtm_cross[i] соответствует -i2.
            const {ibtm_cross, ibtm_x, ibtm_y} = data;
            const limit = Math.min(1000, ibtm_cross.length);

            for (let i2 = 0; i2 < limit; i2++) {
                // Условия продолжения цикла
                if (
                    ibtm_cross[i2 - 1] >= ibtm_x[i2 - 1] ||
                    ibtm_x[i2] !== ibtm_x[i2 - 1]
                ) {
                    break;
                }

                // Основное условие
                if (ibtm_cross[i2] === ibtm_x[i2]) {
                    p2 = ibtm_y[i2];
                } else {
                    p2 = 0;
                }
            }

            return p2;
        }

        const result = plotBearInternal(ibtm_cross, ibtm_x, ibtm_y);
        console.log('plotBearInternal', result);
        const result2 = plotBearInternal2(ibtm_cross, ibtm_x, ibtm_y);
        console.log('plotBearInternal2', result2);
        const result3 = plotBearInternal3({ibtm_cross, ibtm_x, ibtm_y});
        console.log('plotBearInternal3', result3);
        // const plotBearInternal = ibtm_cross
        //   .asArray()
        //   .map((_, i1) =>
        //     GetValue(ibtm_cross.asArray(), -(i1 - 1)) <
        //       GetValue(ibtm_x.asArray(), -(i1 - 1)) &&
        //     last(ibtm_x.asArray()) === GetValue(ibtm_x.asArray(), -(i1 - 1))
        //       ? GetValue(ibtm_x.asArray(), -i1) === GetValue(ibtm_x.asArray(), -i1)
        //         ? GetValue(ibtm_y.asArray(), -i1)
        //         : 0
        //       : 0,
        //   );
        const InternalBearStructureVal = Max(...plotBearInternalNewFixed.slice(-6));

        const highest = (from, count, key: 'high' | 'low') => {

            const batch = candles.slice(from, from + count).map(c => c[key]);

            return key === 'high' ? Math.max(...batch) : Math.min(...batch);
        }

        console.log('plotBearInternalNewFixed.slice(-6)', plotBearInternalNewFixed);
        console.log('InternalBullStructureVal', InternalBearStructureVal);
        const InternalBearStructure = showInternals
            ? InternalBearStructureVal
                ? InternalBearStructureVal // highest(InternalBearStructureVal, 6, 'low') // - 6]
                : 0
            : // ? Displacer(-6, InternalBullStructureVal)
            double.nan;
        // InternalBullStructure.SetDefaultColor(GlobalColor("Internal Bullish"));
        // InternalBullStructure.SetPaintingStrategy(paintingStrategy = PaintingStrategy.DASHES);

        console.log('InternalBearStructure', InternalBearStructure);
        // let InternalBearStructureVal = plotBearInternalNewFixed.length
        //   ? plotBearInternalNewFixed.slice(-6)
        //   : double.nan;
        // const InternalBearStructure = showInternals
        //   ? InternalBearStructureVal.map((i) => i + 6)
        //   : double.nan;
        // // InternalBearStructure.SetDefaultColor(GlobalColor("Internal Bearish"));
        // // InternalBearStructure.SetPaintingStrategy(paintingStrategy = PaintingStrategy.DASHES);
        // console.log('InternalBearStructure', InternalBearStructure);

        // InternalBullStructure.map((index) =>
        //   AddChartBubble(
        //     showInternals &&
        //       // Отображать только если есть пересечения
        //       itop_x.at(0) !== itop_x.getValue(1) &&
        //       !IsNan(InternalBullStructure[InternalBullStructure.length - 1 - 4]),
        //     // index > 0,
        //     // &&
        //     // !IsNan(InternalBullStructure[InternalBullStructure.length - 1 - 4]),
        //     candles[InternalBearStructure[InternalBearStructure.length - 1]], // last(InternalBullStructure),
        //     itrend.at(0) === -1 ||
        //       !IsNan(InternalBearStructure[InternalBearStructure.length - 1 - 4])
        //       ? 'CHoCH'
        //       : 'BOS',
        //     true,
        //     true,
        //   ),
        // );

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
                    value: candle?.close,
                    time: candle?.time * 1000, // bar.time,
                    text, // Текст внутри пузырька
                });
            }
        }

        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            itop_x.at(0) !== itop_x.getValue(1),
            // && !IsNan(InternalBullStructure[InternalBullStructure.length - 1 - 4])
            // index > 0,
            // &&
            // !IsNan(InternalBullStructure[InternalBullStructure.length - 1 - 4]),
            candles[InternalBullStructure[InternalBullStructure.length - 1]], // last(InternalBullStructure),
            itrend.at(0) === -1
                ? // || !IsNan(InternalBearStructure[InternalBearStructure.length - 1 - 4])
                'CHoCH'
                : 'BOS',
            true,
            true,
        );
        // #Labels
        // AddChartBubble(
        //   showInternals &&
        //     // Отображать только если есть пересечения
        //     itop_x.at(0) !== itop_x.getValue(1) &&
        //     InternalBullStructure > -1,
        //   // &&
        //   //   !IsNan(InternalBullStructure[4])
        //   candles[InternalBullStructure], // last(InternalBullStructure),
        //   itrend.at(0) === -1 ? 'CHoCH' : 'BOS',
        //   true,
        //   true,
        // );

        // InternalBearStructure.map((index) =>
        //   AddChartBubble(
        //     showInternals &&
        //       // Отображать только если есть пересечения
        //       ibtm_x.at(0) !== ibtm_x.at(1) &&
        //       index > 0,
        //     // InternalBearStructure > -1,
        //     // !IsNan(InternalBearStructure[4]),
        //     candles[InternalBearStructure[InternalBearStructure.length - 1]], // last(InternalBearStructure),
        //     itrend.at(0) === 1 || !IsNan(InternalBullStructure[4])
        //       ? 'CHoCH'
        //       : 'BOS',
        //     false,
        //     false,
        //   ),
        // );
        AddChartBubble(
            showInternals &&
            // Отображать только если есть пересечения
            ibtm_x.at(0) !== ibtm_x.at(1),
            // index > 0,
            // InternalBearStructure > -1,
            // && !IsNan(InternalBearStructure[InternalBearStructure.length - 1 - 4])
            candles[InternalBearStructure], // last(InternalBearStructure),
            itrend.at(0) === 1
                ? // || !IsNan(InternalBullStructure[4])
                'CHoCH'
                : 'BOS',
            false,
            false,
        );
        // AddChartBubble(
        //   showInternals &&
        //     // Отображать только если есть пересечения
        //     ibtm_x.at(0) !== ibtm_x.at(1) &&
        //     InternalBearStructure > -1,
        //   // !IsNan(InternalBearStructure[4]),
        //   candles[InternalBearStructure], // last(InternalBearStructure),
        //   itrend.at(0) === 1 ? 'CHoCH' : 'BOS',
        //   false,
        //   false,
        // );
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