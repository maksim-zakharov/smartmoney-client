import {Col} from "antd";
import {Chart} from "../SoloTestPage/TestChart.tsx";
import {notTradingTime} from "../THUltimate/utils.ts";
import React, {FC, useMemo} from "react";
import useWindowDimensions from "../useWindowDimensions.tsx";
import {
    bosesToLineSerieses,
    orderblocksToImbalancePrimitives,
    orderblocksToOrderblocksPrimitives,
    roundTime,
    swingsToMarkers
} from "../utils.ts";
import {SeriesMarker, Time} from "lightweight-charts";
import {calculateTesting, defaultConfig} from "../THUltimate/th_ultimate_oneIt.ts";


const markerColors = {
    bearColor: "rgb(157, 43, 56)",
    bullColor: "rgb(20, 131, 92)"
}

export const MainPageChart: FC<{
    tf: string,
    candles: any[],
    tradesOrdernoMap: any,
    tradesMap: any,
    selectedPattern: any
}> = ({tf, candles, tradesOrdernoMap, tradesMap, selectedPattern}) => {
    const {width} = useWindowDimensions();

    const props = {
        colors: {
            backgroundColor: "white",
            lineColor: "#2962FF",
            textColor: "black",
            areaTopColor: "#2962FF",
            areaBottomColor: "rgba(41, 98, 255, 0.28)"
        }
    };

    const {swings, trend, boses, orderBlocks} = useMemo(() => calculateTesting(candles, defaultConfig), [candles])

    const primitives = useMemo(() => {
        const lastCandle = candles[candles.length - 1];
        const _primitives = [];
        const checkShow = (ob) => {
            let result = false;
            if (!ob) {
                return false;
            }
            if (!Boolean(ob.endCandle)) {
                result = true;
            }
            if (Boolean(ob.endCandle)) {
                result = true;
            }
            if (ob.isSMT) {
                result = false;
            }
            return result;
        }
        _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, checkShow, lastCandle));

        _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, checkShow, lastCandle));

        return _primitives;
    }, [orderBlocks, candles])

    const _markers: SeriesMarker<Time>[] = useMemo(() => [tradesOrdernoMap[selectedPattern?.limitOrderNumber], tradesMap[selectedPattern?.stopTradeId], tradesMap[selectedPattern?.takeTradeId]].filter(Boolean).map(t => ({
            time: roundTime(t.date, tf, false),
            position: t.side === "buy" ? "belowBar" : "aboveBar",
            color: t.side === "buy" ? "rgb(19,193,123)" : "rgb(255,117,132)",
            shape: t.side === "buy" ? "arrowUp" : "arrowDown",
            // size: t.volume,
            id: t.id,
            value: t.price,
            size: 2
            // text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
        }))
        , [tradesOrdernoMap, selectedPattern, tradesMap]);

    const markers = useMemo(() => {
        const allMarkers: any[] = [..._markers];
        const checkShow = (ob) => {
            let result = false;
            if (!ob) {
                return false;
            }
            if (!Boolean(ob.endCandle)) {
                result = true;
            }
            if (Boolean(ob.endCandle)) {
                result = true;
            }
            if (ob.isSMT) {
                result = false;
            }
            return result;
        }
        allMarkers.push(...orderBlocks.filter(checkShow).map(s => ({
            color: s.side === 'low' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.textTime || s.time) as Time,
            shape: 'text',
            position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text
        })));

        allMarkers.push(...swingsToMarkers(swings))

        return allMarkers;
    }, [swings, orderBlocks, _markers]);

    const lineSerieses = useMemo(() => bosesToLineSerieses(boses), [boses]);

    return width > 1200 && <Col span={8}>
        <Chart {...props} data={candles
            .filter(candle => !notTradingTime(candle))} lineSerieses={lineSerieses} primitives={primitives}
               ema={[]} markers={markers}/>
    </Col>
}