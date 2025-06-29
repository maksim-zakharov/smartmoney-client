import { Content, Header } from 'antd/es/layout/layout';
import { Layout, Menu, theme } from 'antd';
import React from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import MainPage from './MainPage/MainPage';
import SoloTestPage from './SoloTestPage/SoloTestPage';
import { ArbitrageMOEXPage } from './ArbitrageMOEXPage/ArbitrageMOEXPage';
import { ArbitrageBYBITPage } from './ArbitrageBYBITPage/ArbitrageBYBITPage';
import { DiscrepancyRatingPage } from './DiscrepancyRatingPage';
import { MultiTestPage } from './MultiTestPage';
import DemoPage from './DemoPage/DemoPage';
import UnitTestPage from './UnitTestPage';
import NewTestingPage from './NewTestingPage';
import { ScreenerPage } from './ScreenerPage';
import { CNYFundingPage } from './CNYFundingPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '/', label: 'Главная', element: <MainPage /> },
    { key: '/test', label: 'BOS/IDM', element: <SoloTestPage /> },
    { key: '/arbitrage-moex', label: 'Арбитраж MOEX', element: <ArbitrageMOEXPage /> },
    { key: '/arbitrage-bybit', label: 'Арбитраж BYBIT', element: <ArbitrageBYBITPage /> },
    { key: '/discrepancy-rating', label: 'Расдвижки', element: <DiscrepancyRatingPage /> },
    { key: '/testing', label: 'Тестирование', element: <MultiTestPage /> },
    { key: '/demo', label: 'Обучение', element: <DemoPage /> },
    { key: '/unit-testing', label: 'Мок-тестирование', element: <UnitTestPage /> },
    { key: '/new-testing', label: 'Новые тесты', element: <NewTestingPage /> },
    { key: '/screener', label: 'Скринер плотностей', element: <ScreenerPage /> },
    { key: '/cny-funding', label: 'CNY Funding', element: <CNYFundingPage /> },
  ];

  function onClick(params) {
    console.log(params);
    navigate(params.key);
  }

  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="demo-logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={[location.pathname]}
          onClick={onClick}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content
        style={{
          padding: 8,
          margin: 0,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <Routes>
          {menuItems.map((item) => (
            <Route path={item.key} element={item.element} />
          ))}
        </Routes>
      </Content>
    </Layout>
  );
}
