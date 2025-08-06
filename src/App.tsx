import { Content, Header } from 'antd/es/layout/layout';
import { Button, Layout, Menu, Space, theme } from 'antd';
import React, { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArbitrageMOEXPage } from './ArbitrageMOEXPage/ArbitrageMOEXPage';
import { ArbitrageBYBITPage } from './ArbitrageBYBITPage/ArbitrageBYBITPage';
import { useGetUserInfoQuery } from './api/alor.api';
import { useAppDispatch, useAppSelector } from './store';
import { AppsTokenResponse, initApi } from './api/alor.slice';
import { TestPage } from './TestPage.tsx';
import {
  useAuthCodeQuery,
  useGetTinkoffAccountsQuery,
  useGetTinkoffOrdersQuery,
  useGetTinkoffPortfolioQuery,
  useSelectAccountQuery,
} from './api.ts';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const api = useAppSelector((state) => state.alorSlice.api);
  const { accessToken } = useAppSelector((state) => state.alorSlice.cTraderAuth || ({} as AppsTokenResponse));
  const cTraderAccount = useAppSelector((state) => state.alorSlice.cTraderAccount);

  const { refetch } = useGetUserInfoQuery({}, { skip: !localStorage.getItem('token') || !api });

  const code = new URLSearchParams(window.location.href.split('?')[1]).get('code');

  const redirect_uri =
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173/' : `https://maksim-zakharov.github.io/smartmoney-client/`;

  const tiToken = localStorage.getItem('tiToken');
  const tiBrokerAccountId = localStorage.getItem('tiBrokerAccountId');

  useEffect(() => {}, []);

  useGetTinkoffAccountsQuery(
    {
      token: tiToken,
    },
    {
      pollingInterval: 5000,
      skip: !tiToken,
    },
  );

  useGetTinkoffPortfolioQuery(
    {
      token: tiToken,
      brokerAccountId: tiBrokerAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !tiToken || !tiBrokerAccountId,
    },
  );

  useGetTinkoffOrdersQuery(
    {
      token: tiToken,
      brokerAccountId: tiBrokerAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !tiToken || !tiBrokerAccountId,
    },
  );

  useAuthCodeQuery(
    {
      code,
      redirect_uri: redirect_uri,
    },
    {
      skip: Boolean(!code || accessToken),
    },
  );

  useSelectAccountQuery(
    {
      accessToken,
    },
    {
      skip: !accessToken,
    },
  );

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (localStorage.getItem('token'))
      dispatch(initApi({ token: localStorage.getItem('token'), accessToken: localStorage.getItem('accessToken') }));
  }, []);

  const menuItems = [
    // { key: '/', label: 'Главная', element: <MainPage /> },
    { key: '/', label: 'Главная', element: <ArbitrageMOEXPage /> },
    // { key: '/test', label: 'BOS/IDM', element: <SoloTestPage /> },
    { key: '/arbitrage-moex', label: 'Арбитраж MOEX', element: <ArbitrageMOEXPage /> },
    { key: '/arbitrage-bybit', label: 'Арбитраж BYBIT', element: <ArbitrageBYBITPage /> },
    // { key: '/discrepancy-rating', label: 'Расдвижки', element: <DiscrepancyRatingPage /> },
    // { key: '/testing', label: 'Тестирование', element: <MultiTestPage /> },
    // { key: '/demo', label: 'Обучение', element: <DemoPage /> },
    // { key: '/unit-testing', label: 'Мок-тестирование', element: <UnitTestPage /> },
    // { key: '/new-testing', label: 'Новые тесты', element: <NewTestingPage /> },
    // { key: '/screener', label: 'Скринер плотностей', element: <ScreenerPage /> },
    // { key: '/cny-funding', label: 'CNY Funding', element: <CNYFundingPage /> },
    { key: '/test123', label: 'Test', element: <TestPage /> },
  ];

  function onClick(params) {
    console.log(params);
    navigate(params.key);
  }

  const handleCTraderLogin = () => (window.location.href = `https://176.114.69.4/auth?redirect_uri=${encodeURIComponent(redirect_uri)}`);

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
        <Space>
          {cTraderAccount?.ctidTraderAccountId && <>Аккаунт CTrader: {cTraderAccount?.traderLogin}</>}
          <Button size="small" onClick={handleCTraderLogin}>
            Войти в cTrader
          </Button>
        </Space>
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
