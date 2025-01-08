import {Anchor, Layout, Menu, MenuProps, Typography} from "antd";
import Sider from "antd/es/layout/Sider";
import {Content} from "antd/es/layout/layout";
import {ReactNode, useMemo, useState} from "react";
import ImpulseAndCorrectionPage from "./pages/ImpulseAndCorrectionPage";
import StructureMappingPage from "./pages/StructureMappingPage";

type MenuItem = Required<MenuProps>['items'][number] & {element?: ReactNode};

const DemoPage = () => {

    const [selectedKey, setSelectedKey] = useState('1');

    const items: MenuItem[] = [
        {key: '1', label: 'Impulse & Correction', element: <ImpulseAndCorrectionPage/>},
        {key: '2', label: 'Structure Mapping', element: <StructureMappingPage/>},
        {key: '3', label: 'Imbalance / FVG'},
        {key: '4', label: 'Order flow'},
        {key: '5', label: 'Order block'},
        {key: '6', label: 'IFC Candle'},
        {key: '7', label: 'Smart Money Trap'},
        {key: '8', label: 'Session Liquidity'},
        {key: '9', label: 'Daily Candle Liquidity'},
        {key: '10', label: 'POI Identification'},
        {key: '11', label: 'Entry Types Explanation'},
    ]

    const menuMap = useMemo(() => items.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
    }, {}), [items])

    return <Layout style={{margin: -8}}>
        <Sider>
            <Menu theme="dark" defaultSelectedKeys={[selectedKey]} mode="inline" items={items} onSelect={({item, key}) => setSelectedKey(key)} /></Sider>
        <Content style={{    padding: '0 24px 24px'}}>
            <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
            {menuMap[selectedKey].element ?? 'not found'}
        </Content>
        <Sider>
            <Anchor
                affix={false}
                items={[
                    {
                        key: '1',
                        href: '/#/demo#anchor-demo-basic',
                        title: 'Basic demo',
                    },
                    {
                        key: '2',
                        href: '/#/demo#anchor-demo-static',
                        title: 'Static demo',
                    },
                    {
                        key: '3',
                        href: '/#/demo#api',
                        title: 'API',
                        children: [
                            {
                                key: '4',
                                href: '/#/demo#anchor-props',
                                title: 'Anchor Props',
                            },
                            {
                                key: '5',
                                href: '/#/demo#link-props',
                                title: 'Link Props',
                            },
                        ],
                    },
                ]}
            /></Sider>
    </Layout>
}

export default DemoPage