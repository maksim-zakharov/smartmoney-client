import { Content, Header } from 'antd/es/layout/layout';
import { Layout, Menu, Space, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArbitrageMOEXPage } from './ArbitrageMOEXPage/ArbitrageMOEXPage';
import { ArbitrageBYBITPage } from './ArbitrageBYBITPage/ArbitrageBYBITPage';
import { useGetUserInfoQuery } from './api/alor.api';
import { useAppDispatch, useAppSelector } from './store';
import { AppsTokenResponse, initApi, selectCTraderAccount, setTiToken } from './api/alor.slice';
import { TestPage } from './TestPage';
import {
  useAuthAuthQuery,
  useAuthCodeQuery,
  useGetCTraderPositionPnLQuery,
  useGetCTraderPositionsQuery,
  useGetCTraderSymbolsQuery,
  useSelectAccountQuery,
} from './api/ctrader.api';
import { ThemeProvider } from './components/theme-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { useGetTinkoffAccountsQuery, useGetTinkoffOrdersQuery, useGetTinkoffPortfolioQuery } from './api/tinkoff.api';
import { useGetMEXCPositionsQuery } from './api/mexc.api';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { Trash } from 'lucide-react';
import { Button } from './components/ui/button.tsx';
import { deleteAlert } from './api/alerts.slice.ts';
import { AlertDialog } from './components/AlertDialog.tsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const api = useAppSelector((state) => state.alorSlice.api);
  const tiToken = useAppSelector((state) => state.alorSlice.tToken);
  const { accessToken } = useAppSelector((state) => state.alorSlice.cTraderAuth || ({} as AppsTokenResponse));
  const cTraderAccount = useAppSelector((state) => state.alorSlice.cTraderAccount);
  const cTraderAccounts = useAppSelector((state) => state.alorSlice.cTraderAccounts);
  const { cTraderSymbols } = useAppSelector((state) => state.alorSlice);
  const alerts = useAppSelector((state) => state.alertsSlice.alerts || []);

  const { refetch } = useGetUserInfoQuery({}, { skip: !localStorage.getItem('token') || !api });

  const code = new URLSearchParams(window.location.href.split('?')[1]).get('code');

  const redirect_uri =
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173/' : `https://maksim-zakharov.github.io/smartmoney-client/`;

  const tiBrokerAccountId = localStorage.getItem('tiBrokerAccountId');

  useGetMEXCPositionsQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  useGetTinkoffAccountsQuery(
    {},
    {
      pollingInterval: 5000,
      skip: !tiToken,
    },
  );

  useGetTinkoffPortfolioQuery(
    {
      brokerAccountId: tiBrokerAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !tiToken || !tiBrokerAccountId,
    },
  );

  useGetTinkoffOrdersQuery(
    {
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
    {},
    {
      skip: !accessToken,
    },
  );

  useAuthAuthQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  useGetCTraderPositionsQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !cTraderAccount?.ctidTraderAccountId,
    },
  );

  useGetCTraderPositionPnLQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !cTraderAccount?.ctidTraderAccountId,
    },
  );

  useGetCTraderSymbolsQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      skip: !cTraderAccount?.ctidTraderAccountId,
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

  const [telegramToken, settelegramToken] = useState<string | null>(localStorage.getItem('telegramToken'));
  const handletelegramToken = (e) => {
    settelegramToken(e.target.value);
    localStorage.setItem('telegramToken', e.target.value);
  };

  const [telegramUserId, settelegramUserId] = useState<string | null>(localStorage.getItem('telegramUserId'));
  const handletelegramUserId = (e) => {
    settelegramUserId(e.target.value);
    localStorage.setItem('telegramUserId', e.target.value);
  };

  const [aToken, setAToken] = useState<string | null>(localStorage.getItem('token'));
  const handleEditAToken = (e) => {
    setAToken(e.target.value);
    localStorage.setItem('token', e.target.value);
  };

  const handleEditToken = (e) => {
    dispatch(setTiToken(e.target.value));
    localStorage.setItem('tiToken', e.target.value);
  };

  const [brokerAccountId, setBrokerAccountId] = useState<string | null>(localStorage.getItem('tiBrokerAccountId'));
  const handleEditBrokerAccountId = (e) => {
    setBrokerAccountId(e.target.value);
    localStorage.setItem('tiBrokerAccountId', e.target.value);
  };

  const [bybitApiKey, setbybitApiKey] = useState<string | null>(localStorage.getItem('bybitApiKey'));
  const handleEditbybitApiKey = (e) => {
    setbybitApiKey(e.target.value);
    localStorage.setItem('bybitApiKey', e.target.value);
  };

  const [bybitSecretKey, setbybitSecretKey] = useState<string | null>(localStorage.getItem('bybitSecretKey'));
  const handleEditbybitSecretKey = (e) => {
    setbybitSecretKey(e.target.value);
    localStorage.setItem('bybitSecretKey', e.target.value);
  };

  function onClick(params) {
    console.log(params);
    navigate(params.key);
  }

  const handleCTraderLogin = () => (window.location.href = `https://176.114.69.4/ctrader?redirect_uri=${encodeURIComponent(redirect_uri)}`);

  const handleDeleteAlert = (data) => () => {
    dispatch(deleteAlert(data));
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
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
            {cTraderAccount?.ctidTraderAccountId && (
              <>
                Аккаунт CTrader:{' '}
                <div>
                  {cTraderAccount?.brokerTitleShort} {cTraderAccount?.traderLogin}
                </div>
              </>
            )}
            {!accessToken && (
              <Button size="small" onClick={handleCTraderLogin}>
                Войти в cTrader
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Настройки</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg gap-2">
                <DialogHeader>
                  <DialogTitle>Настройки</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="keys">
                  <TabsList className="px-2">
                    <TabsTrigger value="keys">Безопасность</TabsTrigger>
                    <TabsTrigger value="alerts">Оповещения</TabsTrigger>
                  </TabsList>
                  <TabsContent value="keys">
                    <div className="p-3 flex gap-3 flex-col">
                      <Label htmlFor="alorToken">Телеграм Токен</Label>
                      <Input id="alorToken" value={telegramToken} onChange={handletelegramToken} />
                      <Label htmlFor="alorToken">Телеграм UserID</Label>
                      <Input id="alorToken" value={telegramUserId} onChange={handletelegramUserId} />
                      <Label htmlFor="alorToken">Алор Токен</Label>
                      <Input id="alorToken" value={aToken} onChange={handleEditAToken} />
                      <Label htmlFor="tToken">Тинькофф Токен</Label>
                      <Input id="tToken" value={tiToken} onChange={handleEditToken} />
                      <Label htmlFor="tBrokerAccountId">Тинькофф BrokerAccountId</Label>
                      <Input id="tBrokerAccountId" value={brokerAccountId} onChange={handleEditBrokerAccountId} />
                      <Label htmlFor="bybitApiKey">Bybit Api Key</Label>
                      <Input id="bybitApiKey" value={bybitApiKey} onChange={handleEditbybitApiKey} />
                      <Label htmlFor="bybitSecretKey">Bybit Secret Key</Label>
                      <Input id="bybitSecretKey" value={bybitSecretKey} onChange={handleEditbybitSecretKey} />

                      <Label htmlFor="bybitSecretKey">cTraderAccount</Label>
                      <RadioGroup
                        id="ctidTraderAccountId"
                        value={cTraderAccount?.ctidTraderAccountId}
                        onValueChange={(val) => dispatch(selectCTraderAccount(Number(val)))}
                      >
                        {cTraderAccounts?.map((cTraderAccount) => (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={cTraderAccount?.ctidTraderAccountId} id={cTraderAccount?.ctidTraderAccountId} />
                            <Label htmlFor={cTraderAccount?.ctidTraderAccountId}>
                              {cTraderAccount?.brokerTitleShort} {cTraderAccount?.traderLogin}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </TabsContent>
                  <TabsContent value="alerts" className="px-2 pb-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Тикер</TableHead>
                          <TableHead>Условие</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead className="text-right">Триггер</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map((invoice, index) => (
                          <TableRow className={index % 2 ? 'rowOdd' : 'rowEven'}>
                            <TableCell>{invoice.ticker}</TableCell>
                            <TableCell>{invoice.condition === 'lessThen' ? 'Меньше' : 'Больше'} чем</TableCell>
                            <TableCell>{invoice.price.toFixed(5)}</TableCell>
                            <TableCell className="text-right">{invoice.trigger === 'once' ? 'Один раз' : 'Раз в минуту'}</TableCell>
                            <TableCell className="text-right">
                              {/*<Button size="sm" variant="ghost" className="p-0 h-4 w-4">*/}
                              {/*  <Pencil />*/}
                              {/*</Button>*/}

                              <Button size="sm" variant="ghost" className="p-0 h-4 w-4" onClick={handleDeleteAlert(invoice)}>
                                <Trash />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
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
          {!cTraderAccount?.ctidTraderAccountId ||
            (cTraderSymbols?.length > 0 && (
              <Routes>
                {menuItems.map((item) => (
                  <Route path={item.key} element={item.element} />
                ))}
              </Routes>
            ))}
          <AlertDialog />
        </Content>
      </Layout>
    </ThemeProvider>
  );
}
