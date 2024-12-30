import {HistoryObject} from "./api";
import {
    Cross,
    khrustikCalculateSwings
} from "./samurai_patterns";

class CandlesBuilder{
    _candles: HistoryObject[] = [];

    constructor() {
    }

    add(options: {highest?: boolean, eqh?: boolean, eql?: boolean, lowest?: boolean,bullish?: boolean,bearish?: boolean}){
        const lastCandle = this._candles[this._candles.length - 1];

        const open = lastCandle?.open || 100;
        const close = lastCandle?.close || 110;
        const high = lastCandle?.high || 110;
        const low = lastCandle?.low || 90;

        const eq = options.lowest === options.highest;
        if(eq){
            this._candles.push({
                open: close,
                close: close > open ? close - 10 : close + 10,
                high: options.highest ? high + 10 : high - 10,
                low: options.lowest ? low - 10 : low + 10,
                volume: 1000,
                time: 1000000000000000000
            });
        }else {
            this._candles.push({
                open: close,
                close: options.bullish ? close + 10 :  close - 10,
                high: options.eqh ? high : options.highest ? high + 10 : high - 10,
                low: options.eql ? low :  options.lowest ? low - 10 : low + 10,
                volume: 1000,
                time: 1000000000000000000
            });
        }

        return this;
    }

    addBullish(){
        const lastCandle = this._candles[this._candles.length - 1];
        const time = lastCandle?.time || 1000000000000000000;
        this._candles.push({
            open: 40,
            close: 80,
            high: 110,
            low: 20,
            volume: 1000,
            time: time + 1
        });

        return this;
    }

    addBearish(){
        const lastCandle = this._candles[this._candles.length - 1];
        const time = lastCandle?.time || 1000000000000000000;
        this._candles.push({
            close: 40,
            open: 80,
            high: 110,
            low: 20,
            volume: 1000,
            time: time + 1
        });

        return this;
    }

    addInternalBar(){
        // const lastCandle = this._candles[this._candles.length - 1];
        //
        // const close = lastCandle?.close || 110;
        // const high = lastCandle?.high || 110;
        // const low = lastCandle?.low || 90;
        //
        // this._candles.push({
        //     open: close,
        //     close: close + 10,
        //     high: high - 10,
        //     low: low + 10,
        //     volume: 1000,
        //     time: 1000000000000000000
        // });

        this.add({
            highest: false,
            lowest: false
        })

        return this;
    }

    addExternalBar(){
        // const lastCandle = this._candles[this._candles.length - 1];
        //
        // const close = lastCandle?.close || 110;
        // const high = lastCandle?.high || 110;
        // const low = lastCandle?.low || 90;
        //
        // this._candles.push({
        //     open: close,
        //     close: close + 10,
        //     high: high + 10,
        //     low: low - 10,
        //     volume: 1000,
        //     time: 1000000000000000000
        // });

        this.add({
            highest: true,
            lowest: true
        })

        return this;
    }

    addSwingBullish(index?: number){
        const lastCandle = this._candles[this._candles.length - 1];
        const indexCandle = this._candles[index];

        const close = lastCandle?.close || 110;
        const high = indexCandle?.high || lastCandle?.high || 110;
        const low = lastCandle?.low || 90;

        this._candles.push({
            open: close,
            close: close + 10,
            high: high + 10,
            low: low + 10,
            volume: 1000,
            time: 1000000000000000000
        });

        return this;
    }

    addBearishEH(){
        const lastCandle = this._candles[this._candles.length - 1];

        const close = lastCandle?.close || 110;
        const high = lastCandle?.high || 110;
        const low = lastCandle?.low || 90;

        this._candles.push({
            open: close,
            close: close - 10,
            high: high,
            low: low - 10,
            volume: 1000,
            time: 1000000000000000000
        });

        return this;
    }

    addSwingBearish(index?: number){
        const lastCandle = this._candles[this._candles.length - 1];
        const indexCandle = this._candles[index];

        const close = lastCandle?.close || 110;
        const high = lastCandle?.high || 110;
        const low = indexCandle?.low || lastCandle?.low || 90;

        this._candles.push({
            open: close,
            close: close - 10,
            high: high - 10,
            low: low - 10,
            volume: 1000,
            time: 1000000000000000000
        });

        return this;
    }

    addSwingHighBearish(){
        const lastCandle = this._candles[this._candles.length - 1];

        const close = lastCandle?.close || 110;
        const high = lastCandle?.high || 110;
        const low = lastCandle?.low || 90;

        this._candles.push({
            open: close,
            close: close - 10,
            high: high + 10,
            low: low + 10,
            volume: 1000,
            time: 1000000000000000000
        });

        return this;
    }

    toArray() {
        return this._candles;
    }
}

describe('sm_khrustik', () => {
    it('khrustikCalculateSwings 1', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .addSwingBearish()
            .addSwingBullish()
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[1]?.side).toEqual('high');
        expect(swings.lows[2]?.side).toEqual('low');
        expect(swings.highs[3]?.side).toEqual('high');
    })

    it('khrustikCalculateSwings 2', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .addExternalBar()
            .addSwingBullish()
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[1]?.side).toEqual('high');
        expect(swings.lows[2]?.side).toEqual('low');
        expect(swings.highs[3]?.side).toEqual('high');
    })

    it('khrustikCalculateSwings 3', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .addInternalBar()
            .addSwingBearish(1)
            .addSwingBullish(1)
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[1]?.side).toEqual('high');
        expect(swings.lows[3]?.side).toEqual('low');
        expect(swings.highs[4]?.side).toEqual('high');
    })

    it('khrustikCalculateSwings 4', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .add({
                highest: true,
                lowest: false,
            })
            .add({
                highest: true,
                lowest: true,
            })
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[2]?.side).toEqual('high');
        expect(swings.lows[3]?.side).toEqual('low');
        expect(swings.highs[3]?.side).toEqual('high');
    })

    it('khrustikCalculateSwings 5', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .add({
                eqh: true,
                lowest: false,
            })
            .add({
                highest: true,
                lowest: true,
            })
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[1]?.side).toEqual('high');
        expect(swings.lows[3]?.side).toEqual('low');
        expect(swings.highs[3]?.side).toEqual('high');
    })

    it('khrustikCalculateSwings 6', () => {
        const builder = new CandlesBuilder();

        const candles = builder
            .addBullish()
            .addSwingBullish()
            .add({
                highest: true,
                lowest: false
            })
            .addBearish()
            .addSwingBullish(2)
            .toArray();

        const swings = khrustikCalculateSwings(candles)
        expect(swings.highs[2]?.side).toEqual('high');
        expect(swings.lows[3]?.side).toEqual('low');
        expect(swings.highs[4]?.side).toEqual('high');
    })
})