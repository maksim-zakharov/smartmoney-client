// db.ts
import Dexie, { Table } from 'dexie';

import {HistoryObject} from "./THUltimate/models.ts";

export class TradingDataDB extends Dexie {
    candles!: Table<HistoryObject, string>;
    securities!: Table<any, string>;
    riskRates!: Table<any, string>;

    constructor() {
        super('TradingDataDB');

        this.version(1).stores({
            candles: 'id, ticker, time, [symbol+time]',
            securities: 'symbol',
            riskRates: 'instrument'
        });
    }
}

export const db = new TradingDataDB();