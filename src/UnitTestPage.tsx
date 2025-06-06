import Sider from "antd/es/layout/Sider";
import {Layout, Menu, MenuProps, Typography} from "antd";
import React, {useMemo, useState} from "react";
import {Content} from "antd/es/layout/layout";
import {calculateTesting, defaultConfig} from "./sm-lib/th_ultimate.ts";
import {Chart} from "./SoloTestPage/UpdatedChart";
import {
    bosesToLineSerieses,
    orderblocksToImbalancePrimitives,
    orderblocksToOrderblocksPrimitives,
    swingsToMarkers
} from "./utils";
import {testMocks} from "./test.mocks.ts";

import {Cross, HistoryObject, POI, Swing} from "./sm-lib/models.ts";

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
    _primitives.push(...orderblocksToImbalancePrimitives(orderBlocks, Boolean, lastCandle));
    _primitives.push(...orderblocksToOrderblocksPrimitives(orderBlocks, Boolean, lastCandle));

    const allMarkers1 = swingsToMarkers(swings);

    const _lineSerieses = bosesToLineSerieses(boses);

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