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
    // it('khrustikCalculateSwings', () => {
    //     const candles: HistoryObject[] = [
    //         {
    //             time: 1733900100,
    //             close: 81.05,
    //             open: 81.05,
    //             high: 81.05,
    //             low: 81.05,
    //             volume: 17831
    //         },
    //         {
    //             time: 1733900400,
    //             close: 81.23,
    //             open: 81.06,
    //             high: 81.43,
    //             low: 80.6,
    //             volume: 802656
    //         },
    //         {
    //             time: 1733900700,
    //             close: 81.34,
    //             open: 81.18,
    //             high: 81.23,
    //             low: 81.18,
    //             volume: 752133
    //         },
    //         {
    //             time: 1733901000,
    //             close: 81.57,
    //             open: 81.34,
    //             high: 81.7,
    //             low: 81.25,
    //             volume: 604443
    //         },
    //         {
    //             time: 1733901300,
    //             close: 81.87,
    //             open: 81.57,
    //             high: 81.13,
    //             low: 81.5,
    //             volume: 965895
    //         },
    //         {
    //             time: 1733901600,
    //             close: 81.88,
    //             open: 81.85,
    //             high: 81.53,
    //             low: 81.62,
    //             volume: 967596
    //         },
    //         {
    //             time: 1733901900,
    //             close: 81.5,
    //             open: 81.9,
    //             high: 81.33,
    //             low: 81.42,
    //             volume: 707524
    //         },
    //         {
    //             time: 1733902200,
    //             close: 81.68,
    //             open: 81.51,
    //             high: 81.8,
    //             low: 81.4,
    //             volume: 640396
    //         },
    //         {
    //             time: 1733902500,
    //             close: 81.84,
    //             open: 81.66,
    //             high: 81.3,
    //             low: 81.58,
    //             volume: 624952
    //         },
    //         {
    //             time: 1733902800,
    //             close: 81.79,
    //             open: 81.9,
    //             high: 81.6,
    //             low: 81.71,
    //             volume: 342778
    //         },
    //         {
    //             time: 1733903100,
    //             close: 81.48,
    //             open: 81.79,
    //             high: 81.02,
    //             low: 81.45,
    //             volume: 346951
    //         },
    //         {
    //             time: 1733903400,
    //             close: 81.48,
    //             open: 81.79,
    //             high: 81.68,
    //             low: 81.45,
    //             volume: 346951
    //         },
    //         {
    //             time: 1733903700,
    //             close: 81.48,
    //             open: 81.79,
    //             high: 81.01,
    //             low: 81.45,
    //             volume: 346951
    //         }
    //     ]
    //
    //     const structures: (Cross | any)[] = [
    //         {from: {index: 3}, extremum: {index: 4}, to: {index: 5}, text: 'IDM', type: 'high'}
    //     ]
    //
    //     const result = [];
    //
    //     structures.forEach((s, index) => {
    //         expect(s.from.index).toEqual(result[index].from.index)
    //         expect(s.extremum.index).toEqual(result[index].from.index)
    //         expect(s.to.index).toEqual(result[index].from.index)
    //         expect(s.text).toEqual(result[index].text)
    //         expect(s.type).toEqual(result[index].type)
    //     })
    // })

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