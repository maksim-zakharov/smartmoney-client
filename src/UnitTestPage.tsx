import Sider from "antd/es/layout/Sider";
import {Layout, Menu, MenuProps, Typography} from "antd";
import React, {useMemo, useState} from "react";
import {Content} from "antd/es/layout/layout";
import {calculateTesting, Cross, defaultConfig, HistoryObject, POI, Swing} from "./th_ultimate";
import {LineStyle, Time} from "lightweight-charts";
import {Chart} from "./SoloTestPage/TestChart";
import {createRectangle2, swingsToMarkers} from "./utils";
import {testMocks} from "./test.mocks.ts";

type MenuItem = Required<MenuProps>['items'][number] & { description?: string, data: HistoryObject[] };

const BOSChart = ({data, swings: outerSwings, boses: outerBoses, orderblocks: outerOrderblocks}: {
    data: HistoryObject[],
    swings?: Swing[],
    boses?: Cross[],
    orderblocks?: POI[]
}) => {
    let {swings, boses, orderBlocks} = calculateTesting(data, defaultConfig);

    if(outerSwings){
        swings = outerSwings;
    }
    if(outerBoses){
        boses = outerBoses;
    }
    // if(outerOrderblocks){
    //     orderBlocks = outerOrderblocks;
    // }

    // для копирования в тест
    // const copyData = {highs, lows, boses, orderBlocks};
    // console.log(JSON.stringify(copyData));

    const lastCandle = data[data.length - 1];
    const _primitives = [];
    _primitives.push(...orderBlocks.filter(Boolean).map(orderBlock => createRectangle2({
        leftTop: {
            price: orderBlock.lastOrderblockCandle.high,
            time: orderBlock.lastOrderblockCandle.time
        },
        rightBottom: {
            price: orderBlock.lastImbalanceCandle[orderBlock.side],
            time: (orderBlock.endCandle || lastCandle).time
        }
    }, {
        fillColor: 'rgba(179, 199, 219, .3)',
        showLabels: false,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderWidth: 2,
        borderColor: '#222'
    })));
    _primitives.push(...orderBlocks.filter(Boolean).map(orderBlock =>
        createRectangle2({
                leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time},
                rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time}
            },
            {
                fillColor: orderBlock.side === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                showLabels: false,
                borderWidth: 0,
            })));

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }
    const allMarkers1 = [];
    allMarkers1.push(...swingsToMarkers(swings));

    const _lineSerieses = [];
    _lineSerieses.push(...boses.filter(Boolean).map(marker => {
        const color = marker.type === 'high' ? markerColors.bullColor : markerColors.bearColor
        const options = {
            color, // Цвет линии
            priceLineVisible: false,
            lastValueVisible: false,
            lineWidth: 1,
            lineStyle: LineStyle.LargeDashed,
        };
        let data = [];
        let markers = [];
// 5. Устанавливаем данные для линии
        if (marker.from.time === marker.textCandle.time || marker.to.time === marker.textCandle.time) {
            data = [
                {time: marker.from.time as Time, value: marker.from.price}, // начальная точка между свечками
                {time: marker.to.time as Time, value: marker.from.price}, // конечная точка между свечками
            ];
        } else
            data = [
                {time: marker.from.time as Time, value: marker.from.price}, // начальная точка между свечками
                {time: marker.textCandle.time as Time, value: marker.from.price}, // конечная точка между свечками
                {time: marker.to.time as Time, value: marker.from.price}, // конечная точка между свечками
            ].sort((a, b) => a.time - b.time);

        markers = [{
            color,
            time: (marker.textCandle.time) as Time,
            shape: 'text',
            position: marker.type === 'high' ? 'aboveBar' : 'belowBar',
            text: marker.text
        }]
        return {options, data, markers}
    }));

    return <Chart width={1400} height={300} markers={allMarkers1} lineSerieses={_lineSerieses} primitives={_primitives}
                  data={data} ema={[]}/>
};

const UnitTestPage = () => {
    const items: MenuItem[] = Array.from(testMocks).map(([key, {description, data, swings, boses, orderblocks}]) => ({
        key,
        label: key,
        description,
        data,
        swings, boses, orderblocks
    }))

    const [selectedKey, setSelectedKey] = useState(items[0]?.key as string);

    const menuMap = useMemo(() => items.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
    }, {}), [items])

    return <Layout style={{margin: -8}}>
        <Sider>
            <Menu theme="dark" defaultSelectedKeys={[selectedKey]} mode="inline" items={items}
                  onSelect={({item, key}) => setSelectedKey(key)}/></Sider>
        <Content style={{padding: '0 24px 24px'}}>
            <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
            <Typography.Text>{menuMap[selectedKey].description}</Typography.Text>
            <Typography.Title level={3}>Как нужно</Typography.Title>
            <BOSChart {...menuMap[selectedKey]}/>
            <Typography.Title level={3}>Как сейчас</Typography.Title>
            <BOSChart data={menuMap[selectedKey].data}/>
        </Content>
    </Layout>
}

export default UnitTestPage;