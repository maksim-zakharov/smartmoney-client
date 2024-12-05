// Функция для получения данных из Alor API
import {HistoryObject} from "./api";

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
