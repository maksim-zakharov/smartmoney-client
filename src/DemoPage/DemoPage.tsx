import { Layout, Menu, MenuProps, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { ReactNode, useMemo, useState } from 'react';
import ImpulseAndCorrectionPage from './pages/ImpulseAndCorrectionPage';
import StructureMappingPage from './pages/StructureMappingPage';
import ImbalancePage from './pages/ImbalancePage';
import OrderblockPage from './pages/OrderblockPage';
import OrderFlowPage from './pages/OrderFlowPage';
import IFCPage from './pages/IFCPage';
import SMTPage from './pages/SMTPage';
import SessionLiquidityPage from './pages/SessionLiquidityPage';
import DailyLiquidityPage from './pages/DailyLiquidityPage';
import POIPage from './pages/POIPage';
import EntryPage from './pages/EntryPage';
import MultipleTimeFramePage from './pages/MultipleTimeFramePage';

type MenuItem = Required<MenuProps>['items'][number] & { element?: ReactNode };

const DemoPage = () => {
  const [selectedKey, setSelectedKey] = useState('1');

  const items: MenuItem[] = [
    { key: '1', label: 'Impulse & Correction', element: <ImpulseAndCorrectionPage /> },
    { key: '2', label: 'Structure Mapping', element: <StructureMappingPage /> },
    { key: '3', label: 'Imbalance / FVG', element: <ImbalancePage /> },
    { key: '4', label: 'Order flow', element: <OrderFlowPage /> },
    { key: '5', label: 'Order block', element: <OrderblockPage /> },
    { key: '6', label: 'IFC Candle', element: <IFCPage /> },
    { key: '7', label: 'Smart Money Trap', element: <SMTPage /> },
    { key: '8', label: 'Session Liquidity', element: <SessionLiquidityPage /> },
    { key: '9', label: 'Daily Candle Liquidity', element: <DailyLiquidityPage /> },
    { key: '10', label: 'POI Identification', element: <POIPage /> },
    { key: '11', label: 'Multiple Time Frame', element: <MultipleTimeFramePage /> },
    { key: '12', label: 'Entry Types Explanation', element: <EntryPage /> },
  ];

  const menuMap = useMemo(
    () =>
      items.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      }, {}),
    [items],
  );

  return (
    <Layout style={{ margin: -8 }}>
      <Sider>
        <Menu
          theme="dark"
          defaultSelectedKeys={[selectedKey]}
          mode="inline"
          items={items}
          onSelect={({ item, key }) => setSelectedKey(key)}
        />
      </Sider>
      <Content style={{ padding: '0 24px 24px' }}>
        <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
        {menuMap[selectedKey].element ?? 'not found'}
      </Content>
    </Layout>
  );
};

export default DemoPage;
