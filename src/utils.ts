
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