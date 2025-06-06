// cacheService.ts
import { db } from './db';


import {HistoryObject} from "./sm-lib/models.ts";

export const getCachedCandles = async (symbol: string): Promise<HistoryObject[]> => {
    return db.candles
        .where('ticker')
        .equals(symbol)
        .sortBy('time');
};

export const getCachedSecurity = async (symbol: string): Promise<any> => {
    return db.securities
        .get(symbol);
};

export const cacheSecurity = async (security: any): Promise<void> => {
    await db.securities.put(security);
};

export const getCachedRiskRates = async (symbol: string): Promise<any> => {
    return db.riskRates
        .get(symbol);
};

export const cacheRiskRates = async (security: any): Promise<void> => {
    await db.riskRates.put(security);
};

export const cacheCandles = async (symbol: string, candles: HistoryObject[]): Promise<void> => {
    const items = candles.map(c => ({
        ...c,
        id: `${symbol}_${c.time}`,
        ticker: symbol
    }));

    await db.candles.bulkPut(items);
};

export const clearCache = async (symbol: string): Promise<void> => {
    await db.candles.where('ticker').equals(symbol).delete();
};