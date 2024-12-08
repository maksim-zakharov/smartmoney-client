// Функция для получения данных из Alor API
import {HistoryObject} from "./api";

import dayjs from 'dayjs';
import {Trend} from "./samurai_patterns";

export async function fetchCandlesFromAlor(symbol, tf, fromDate?, toDate?, limit?) {
    let url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX`;
    if(limit){
        url += `&limit=${limit}`;
    }
    if(fromDate){
        url += `&from=${fromDate}`;
    }
    if(toDate){
        url += `&to=${toDate}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Ошибка при запросе данных");
        }

        const data = await response.json();
        return data.history;
    } catch (error) {
        console.error("Ошибка получения данных:", error);
    }
}

export const refreshToken = () => fetch(`https://oauth.alor.ru/refresh?token=${localStorage.getItem("token")}`, {
    method: "POST",
}).then(r => r.json()).then(r => r.AccessToken);

export const getSecurity = (symbol, token) => fetch(`https://api.alor.ru/md/v2/Securities/MOEX/${symbol}`, {
    headers: {
        "Authorization": `Bearer ${token}`,
    }
}).then(r => r.json())

export function getCommonCandles(stockCandles: HistoryObject[], futuresCandles: HistoryObject[]) {
    // Создаем множества временных меток для акций и фьючерсов
    const stockTimes = new Set(stockCandles.map(candle => candle.time));
    const futuresTimes = new Set(futuresCandles.map(candle => candle.time));

    // Находим пересечение временных меток
    const commonTimes = new Set([...stockTimes].filter(time => futuresTimes.has(time)));

    // Оставляем только те свечи, время которых есть в обоих массивах
    const filteredStockCandles = stockCandles.filter(candle => commonTimes.has(candle.time));
    const filteredFuturesCandles = futuresCandles.filter(candle => commonTimes.has(candle.time));

    return { filteredStockCandles, filteredFuturesCandles };
}

export function calculateMultiple(stockPrice: number, futurePrice: number) {
    const diffs = stockPrice / futurePrice;
    let dif;
    let diffsNumber = 1;
    if(diffs < 0.00009){
        diffsNumber = 100000;
    }
    else if(diffs < 0.0009){
        diffsNumber = 10000;
    }
    else if(diffs < 0.009){
        diffsNumber = 1000;
    }
    else if(diffs < 0.09){
        diffsNumber = 100;
    }
    else if(diffs < 0.9){
        diffsNumber = 10;
    }

    return diffsNumber;
}

export const calculateTakeProfit = ({
                                        side,
                                        openPrice,
                                        stopLoss,
                                        candles,
                                        multiStop = 1,
    maxDiff = 1
                                    }: { multiStop?: number, maxDiff?: number, side: 'short' | 'long', openPrice: number, stopLoss: number, candles: HistoryObject[] }): number => {
    if (maxDiff > 0) {
        const max = side === 'long' ? Math.max(...candles.map(c => c.high)) : Math.min(...candles.map(c => c.low));

        return side === 'long' ? openPrice + (max - openPrice) *  maxDiff : openPrice - (openPrice - max) * maxDiff;
    }
    return side === 'long' ? openPrice + Math.abs(stopLoss - openPrice) * multiStop : openPrice - Math.abs(stopLoss - openPrice) * multiStop;
};

export const persision = (num: number) => num ? num.toString().split('.')[1]?.length : 0;

export const notTradingTime = (candle: HistoryObject) => {
    const hours = new Date(candle.time * 1000).getHours();
    const minutes = new Date(candle.time * 1000).getMinutes();

    // Открытие утреннего аукциона
    if (hours > 2 && hours < 10) {
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
    // if (hours === 19 && minutes === 0) {
    //   return true;
    // }

    return false;
};

export const calculateMOEXFutureFee = (side: 'buy' | 'sell', security: any, brokerFee = 0.5):number => {
    const cfiCodeExchangeFeeMap = {
        // Валюта
        'FFXCSX': 0.00660,
        // Акции
        'FFXPSX': 0.01980,
        // Товарка
        'FCXCSX': 0.01320
    }

    const exchangeFeePercent = cfiCodeExchangeFeeMap[security.cfiCode];
    if(!exchangeFeePercent){
        return 0;
    }

    const margin = side === 'buy'? security.marginbuy : security.marginsell;
    const exchangeFee = margin * exchangeFeePercent;

    return exchangeFee * (1 + brokerFee);
}

export const calculateFutureQuantityByStopMargin  = (stopMargin: number, openPrice: number, stopPrice: number) => {
    const loss = Math.abs(stopPrice - openPrice);
    return Math.floor(stopMargin / loss);
}

function getDateOnly(dateString) {
    return dayjs(dateString).format('YYYY-MM-DD'); // Возвращаем дату в формате "год-месяц-день"
}

export const groupedTrades = trades => trades.reduce((acc, trade) => {
    const date = getDateOnly(trade.openTime * 1000);
    if (!acc[date]) {
        acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
}, {});

export const calculateDrawdowns = (positions) => {

    const trades = groupedTrades(positions);
    const allDates = Object.keys(trades).sort();
    const cumulativePnLs = [];
    allDates.forEach(date => {
        let cumulativePnL = 0;
        // Суммируем PnL для всех сделок этого дня
        trades[date].forEach(trade => {
            cumulativePnL += trade.pnl;
        });
        cumulativePnLs.push({value: cumulativePnL});
    });
    const drawdown = calculateDrawdown(cumulativePnLs)
    return drawdown;

// Массив всех дат в порядке возрастания
//     const allDates = Object.keys(trades).sort();

// Переменные для накопленного PnL и расчета просадки
    let cumulativePnL = 0;
    let maxPnL = 0;
    const dailyDrawdowns = [];

// Для каждого дня считаем накопленный PnL и просадку
    allDates.forEach(date => {
        // Суммируем PnL для всех сделок этого дня
        trades[date].forEach(trade => {
            cumulativePnL += trade.pnl;
        });

        // Вычисляем просадку за период (смотрим на текущий накопленный PnL и максимум за этот период)
        maxPnL = Math.max(maxPnL, cumulativePnL);
        const drawdown = cumulativePnL - maxPnL;

        // Сохраняем результаты для этого дня
        dailyDrawdowns.push({
            date,
            cumulativePnL,
            maxPnL,
            drawdown
        });
    });

    return dailyDrawdowns;
};

export const calculateDrawdown = (positions: { value: number }[]): number => {
    if (!positions.length) {
        return 0;
    }

    return maxDrawdown_(positions.map(p => p.value), 0, positions.length - 1)[0];
}

function maxDrawdown_(equityCurve, idxStart, idxEnd) {
    // Initialisations
    let highWaterMark = -Infinity;
    let maxDd = -Infinity;
    let idxHighWaterMark = -1;
    let idxStartMaxDd = -1;
    let idxEndMaxDd = -1;

    // Loop over all the values to compute the maximum drawdown
    for (let i = idxStart; i < idxEnd + 1; ++i) {
        if (equityCurve[i] > highWaterMark) {
            highWaterMark = equityCurve[i];
            idxHighWaterMark = i;
        }

        const dd = (highWaterMark - equityCurve[i]) / highWaterMark;

        if (dd > maxDd) {
            maxDd = dd;
            idxStartMaxDd = idxHighWaterMark;
            idxEndMaxDd = i;
        }
    }

    // Return the computed values
    return [maxDd, idxStartMaxDd, idxEndMaxDd];
}

export const fillTrendByMinorData = (newTrend: Trend[], trendData: HistoryObject[], data: HistoryObject[]) => {
    if(!newTrend.length){
        return [];
    }
    if(!trendData.length){
        return [];
    }
    if(!data.length){
        return [];
    }
    // let lastTrendIndex = newTrend.findIndex(Boolean)
    // if(lastTrendIndex < 0){
    //     return [];
    // }
    // const modifiedTrend = [];
    //
    // for (let i = 0; i < data.length; i++) {
    //     let lastTrend = newTrend[lastTrendIndex];
    //     let lastTrendCandle = trendData[lastTrendIndex];
    //     if(!lastTrendCandle){
    //         modifiedTrend.push(modifiedTrend[modifiedTrend.length - 1]);
    //         continue;
    //     }
    //     modifiedTrend.push(lastTrend);
    //     if(lastTrendCandle.time < data[i].time){
    //         lastTrendIndex++;
    //         lastTrendCandle = trendData[lastTrendIndex];
    //         lastTrend = newTrend[lastTrendIndex]
    //     }
    // }

    let lastTrendIndex = newTrend.findIndex(Boolean);
    if(lastTrendIndex < 0){
        return [];
    }
    const modifiedTrend = [];

    for (let i = 0; i < data.length; i++) {
        let lastTrend = newTrend[lastTrendIndex];
        let lastTrendCandle = trendData[lastTrendIndex];
        modifiedTrend.push(lastTrend ?? modifiedTrend[modifiedTrend.length - 1]);
        if (lastTrendCandle && lastTrendCandle.time < data[i].time) {
            lastTrendIndex++;
            lastTrendCandle = trendData[lastTrendIndex];
            lastTrend = newTrend[lastTrendIndex];
        }
    }

    return modifiedTrend;
}
