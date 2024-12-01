import {HistoryObject} from "./api.ts";

export interface Swing {
    side: 'high' | 'low',
    time: number;
    price: number;
    index: number;
}

export const calculateSwings = (candles: HistoryObject[], windowLength = 3) => {
    const swings: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу
    const highs: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу
    const lows: (Swing | null)[] = [null]; // null потому что не учитываем левую свечу

    for (let i = 0; i < candles.length - windowLength; i++) {
        const [left, middle, right] = candles.slice(i, i + windowLength);
        const high: Swing = {
            side: 'high',
            time: middle.time,
            price: middle.high,
            index: i
        }
        const existHigh = left.high < middle.high && middle.high > right.high ? high : null
        highs.push(existHigh);

        const low: Swing = {
            side: 'low',
            time: middle.time,
            price: middle.low,
            index: i
        }
        const existLow = left.low > middle.low && middle.low < right.low ? low : null
        lows.push(existLow);

        if (existHigh)
            swings.push(existHigh)
        if (existLow)
            swings.push(existLow)
        if (!existHigh && !existLow)
            swings.push(null)
    }

    return {swings, highs, lows};
}

export const calculateStructure = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    let structure: Swing[] = [];
    /**
     * Нужно посчитать тренд
     * И нужно исключить внутренние свинги
     */
    for (let i = 0; i < candles.length; i++) {
        if (highs[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'low') {
                structure.push(highs[i]);
            } else if (structure[structure.length - 1].price <= highs[i].price) {
                structure[structure.length - 1] = highs[i];
            }
        }
        if (lows[i]) {
            if (!structure[structure.length - 1] || structure[structure.length - 1].side === 'high') {
                structure.push(lows[i]);
            } else if (structure[structure.length - 1].price >= lows[i].price) {
                structure[structure.length - 1] = lows[i];
            }
        }
    }

    const isBetween = (p1: Swing, p2: Swing, p3: Swing) => {
        if (p1.side === 'high' && p2.side === 'low') {
            return p3.price > p2.price && p3.price < p1.price;
        }
        if (p1.side === 'low' && p2.side === 'high') {
            return p3.price < p2.price && p3.price > p1.price;
        }
        return false;
    }

    // Фильтровать структуру
    for (let i = 0; i < structure.length - 3; i++) {
        const [s1, s2, s3, s4] = structure.slice(i, i + 4);
        if (isBetween(s1, s2, s3) && isBetween(s1, s2, s4)) {
            structure.splice(i + 2, 2);
            i -= 1;
        }
    }

    let highParts = new Array(candles.length).fill(null);
    let lowParts = new Array(candles.length).fill(null);

    let lastStructIndex = 0;
    for (let i = 0; i < candles.length; i++) {
        while(structure[lastStructIndex]?.index === i){
            if(structure[lastStructIndex].side === 'high'){
                highParts[i] = structure[lastStructIndex]
                lowParts[i] = null;
            } else {
                lowParts[i] = structure[lastStructIndex]
                highParts[i] = null;
            }
            lastStructIndex++;
        }
    }

    return {structure, highParts, lowParts};
}

export const calculateTrend = (highs: Swing[], lows: Swing[], candles: HistoryObject[]) => {
    const trend = new Array(candles.length).fill(null);
    const filteredExtremums = [];

    const filledHighs = highs.filter(Boolean);
    const filledLows = lows.filter(Boolean);

    const minLength = Math.min(filledHighs.length, filledLows.length);

    let highLows = new Array(candles.length).fill(null);

    let prevHigh = null;
    let currHigh = null;
    let prevLow = null;
    let currLow = null;
    for (let i = 0; i < candles.length; i++) {
        if(highs[i]){
            prevHigh = currHigh;
            currHigh = highs[i];
        }
        if(lows[i]){
            prevLow = currLow;
            currLow = lows[i];
        }

        if(!prevHigh || !prevLow || !currLow || !currHigh){
            trend[i] = null;
            continue;
        }
        // if(i === 2367){
        //     debugger
        // }

        if (prevHigh.price < currHigh.price && currHigh.index === i) {
            trend[i] = {time: currHigh.time, trend: 1};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if (prevLow.price > currLow.price && currLow.index === i) {
            trend[i] = {time: currLow.time, trend: -1};
            highLows[i] = {high: currHigh, low: currLow};
        }

        if(!trend[i] && trend[i-1]) {
            trend[i] = {time: candles[i].time, trend: trend[i-1].trend};
        }
    }

    // for (let i = 1; i < minLength; i++) {
    //     const prevHigh = filledHighs[i - 1];
    //     const currHigh = filledHighs[i];
    //     const prevLow = filledLows[i - 1];
    //     const currLow = filledLows[i];
    //
    //     if (prevHigh.price > currHigh.price && prevLow.price >= currLow.price) {
    //         trend.push({time: currLow.time, trend: -1});
    //         highLows.push({high: currHigh, low: currLow});
    //     } else if (prevHigh.price <= currHigh.price && prevLow.price < currLow.price) {
    //         trend.push({time: currHigh.time, trend: 1});
    //         highLows.push({high: currHigh, low: currLow});
    //     } else {
    //         if (!trend[trend.length - 1])
    //             trend.push(null);
    //         else {
    //             trend.push({time: Math.max(currLow.time, currHigh.time), trend: trend[trend.length - 1].trend});
    //         }
    //     }
    // }
    //
    // highLows.forEach(hl => {
    //     filteredExtremums.push(hl.high);
    //     filteredExtremums.push(hl.low);
    // })

    return {trend, filteredExtremums};
}