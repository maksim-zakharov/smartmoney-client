import Sider from "antd/es/layout/Sider";
import {Layout,Typography, Menu, MenuProps} from "antd";
import React, {useMemo, useState} from "react";
import {Content} from "antd/es/layout/layout";
import {
    calculateTesting,
    HistoryObject
} from "./th_ultimate";
import {LineStyle, Time} from "lightweight-charts";
import {Chart} from "./SoloTestPage/TestChart";
import {createRectangle2} from "./utils";
import {testData1, testData2} from "./test_data";

type MenuItem = Required<MenuProps>['items'][number] & {description?: string, candles: HistoryObject[]};

const BOSChart = ({data, showSwings, showStructure, showOrderblock, mockHighs, mockLows, mockBoses, mockOrderBlocks}: {data: HistoryObject[]}) => {
    let {swings, boses, orderBlocks} = calculateTesting(data, {withMove: false, moreBOS: true});

    // if(mockHighs){
    //     highs = mockHighs;
    // }
    //
    // if(mockLows){
    //     lows = mockLows;
    // }

    if(mockBoses){
        boses = mockBoses;
    }

    if(mockOrderBlocks){
        orderBlocks = mockOrderBlocks;
    }

    // для копирования в тест
    // const copyData = {highs, lows, boses, orderBlocks};
    // console.log(JSON.stringify(copyData));

    const lastCandle = data[data.length - 1];
    const _primitives = [];
    if(showOrderblock){
        _primitives.push(...orderBlocks.map(orderBlock => createRectangle2({
            leftTop: {
                price: orderBlock.lastOrderblockCandle.high,
                time: orderBlock.lastOrderblockCandle.time
            },
            rightBottom: {
                price: orderBlock.lastImbalanceCandle[orderBlock.type],
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
        _primitives.push(...orderBlocks.map(orderBlock =>
            createRectangle2({
                    leftTop: {price: orderBlock.startCandle.high, time: orderBlock.startCandle.time},
                    rightBottom: {price: orderBlock.startCandle.low, time: (orderBlock.endCandle || lastCandle).time}
                },
                {
                    fillColor: orderBlock.type === 'low' ? `rgba(44, 232, 156, .3)` : `rgba(255, 117, 132, .3)`,
                    showLabels: false,
                    borderWidth: 0,
                })));
    }

    const markerColors = {
        bearColor: "rgb(157, 43, 56)",
        bullColor: "rgb(20, 131, 92)"
    }
    const allMarkers1 = [];
    if(showSwings){
        allMarkers1.push(...swings.filter(Boolean).map(s => ({
            color: s.side === 'high' ? markerColors.bullColor : markerColors.bearColor,
            time: (s.time) as Time,
            shape: 'circle',
            position: s.side === 'high' ? 'aboveBar' : 'belowBar',
            text: s.text
        })));
    }

    const _lineSerieses = [];
    if(showStructure){
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
    }

    return <Chart width={1400} height={300} markers={allMarkers1} lineSerieses={_lineSerieses} primitives={_primitives}
                  data={data} ema={[]}/>
};

const UnitTestPage = () => {

    const [selectedKey, setSelectedKey] = useState('1');

    const items: MenuItem[] = [
        {
            key: '1',
            label: 'Удаляем лишний CHoCH при подтверждении длинного CHoCH',
            description: 'Если образуются 2 CHoCH/BOS и оба подтверждаются на одной свечке - остается только самый первый',
            candles: testData1.candles,
            mocks: testData1.mock
        },
        {
            key: '2',
            label: 'Рисуем LCHoCH, Fake LBOS',
            description: 'Нарисовали LCHoCH, мог быть LBOS но тот не подтвердился, поэтому остается IDM',
            candles: testData2.candles,
            mocks: testData2.mock
        },
    ];

    const menuMap = useMemo(() => items.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
    }, {}), [items])

    return  <Layout style={{margin: -8}}>
        <Sider>
            <Menu theme="dark" defaultSelectedKeys={[selectedKey]} mode="inline" items={items} onSelect={({item, key}) => setSelectedKey(key)} /></Sider>
        <Content style={{    padding: '0 24px 24px'}}>
            <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
            <Typography.Text>{menuMap[selectedKey].description}</Typography.Text>
            <Typography.Title level={3}>Как нужно</Typography.Title>
            <BOSChart showStructure showSwings mockHighs={menuMap[selectedKey].mocks.highs} mockBoses={menuMap[selectedKey].mocks.boses} mockLows={menuMap[selectedKey].mocks.lows} data={menuMap[selectedKey].candles}/>
            <Typography.Title level={3}>Как сейчас</Typography.Title>
            <BOSChart showStructure showSwings data={menuMap[selectedKey].candles}/>
        </Content>
    </Layout>
}

export default UnitTestPage;