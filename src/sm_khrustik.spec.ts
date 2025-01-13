import {
    khrustikCalculateSwings
} from "./samurai_patterns";
import {CandlesBuilder} from "./utils";
import {Cross, HistoryObject} from "./th_ultimate";

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