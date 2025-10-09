import { Content, Header } from 'antd/es/layout/layout';
import { Layout, Menu, Space, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArbitrageMOEXPage } from './ArbitrageMOEXPage/ArbitrageMOEXPage';
import { useGetUserInfoQuery } from './api/alor.api';
import { useAppDispatch, useAppSelector } from './store';
import { AppsTokenResponse, deletePair, initApi, selectCTraderAccount, setTiToken } from './api/alor.slice';
import { TestPage } from './TestPage';
import {
  useAuthAuthQuery,
  useAuthCodeQuery,
  useGetCTraderPositionPnLQuery,
  useGetCTraderPositionsQuery,
  useGetCTraderSymbolsQuery,
  useSelectAccountQuery,
  useSummaryQuery,
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
import { deleteAlert } from './api/alerts.slice';
import { AlertDialog } from './components/AlertDialog.tsx';
import { TypographyH4 } from './components/ui/typography.tsx';
import { useGetWalletBalanceQuery } from './api/bybit.api.ts';
import { useGetAccountsQuery } from './api/gate.api.ts';
import { useGetBalanceQuery } from './api/bingx.api.ts';

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
  const favoritePairs = useAppSelector((state) => state.alorSlice.favoritePairs || []);

  const { refetch } = useGetUserInfoQuery({}, { skip: !localStorage.getItem('token') || !api });

  const code = new URLSearchParams(window.location.href.split('?')[1]).get('code');

  const redirect_uri =
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173/' : `https://maksim-zakharov.github.io/smartmoney-client/`;

  const tiBrokerAccountId = localStorage.getItem('tiBrokerAccountId');

  useSummaryQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
    },
    {
      pollingInterval: 5000,
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  // useCashflowQuery(
  //   {
  //     ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
  //     from: dayjs().add(-1, 'month').unix(),
  //     to: dayjs().unix(),
  //   },
  //   {
  //     // pollingInterval: 60000,
  //     skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
  //   },
  // );

  useGetWalletBalanceQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );
  useGetAccountsQuery(
    {
      apiKey: localStorage.getItem('gateApiKey'),
      secretKey: localStorage.getItem('gateSecretKey'),
    },
    {
      pollingInterval: 5000,
      skip: !localStorage.getItem('gateApiKey') || !localStorage.getItem('gateSecretKey'),
    },
  );

  useGetBalanceQuery(
    {
      apiKey: localStorage.getItem('bingxApiKey'),
      secretKey: localStorage.getItem('bingxSecretKey'),
    },
    {
      pollingInterval: 5000,
      skip: !localStorage.getItem('bingxApiKey') || !localStorage.getItem('bingxSecretKey'),
    },
  );

  // useGetPositionsQuery(
  //   {
  //     format: 'Simple',
  //     portfolio: localStorage.getItem('aPortfolio'),
  //     exchange: 'MOEX',
  //   },
  //   {
  //     skip: !api || !localStorage.getItem('aPortfolio'),
  //     pollingInterval: 5000,
  //   },
  // );

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

  const [aPortfolio, setaPortfolio] = useState<string | null>(localStorage.getItem('aPortfolio'));
  const handleaPortfolio = (e) => {
    setaPortfolio(e.target.value);
    localStorage.setItem('aPortfolio', e.target.value);
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

  const [bingxApiKey, setbingxApiKey] = useState<string | null>(localStorage.getItem('bingxApiKey'));
  const handlebingxApiKey = (e) => {
    setbingxApiKey(e.target.value);
    localStorage.setItem('bingxApiKey', e.target.value);
  };

  const [bingxSecretKey, setbingxSecretKey] = useState<string | null>(localStorage.getItem('bingxSecretKey'));
  const handlebingxSecretKey = (e) => {
    setbingxSecretKey(e.target.value);
    localStorage.setItem('bingxSecretKey', e.target.value);
  };

  const [gateApiKey, setgateApiKey] = useState<string | null>(localStorage.getItem('gateApiKey'));
  const handlegateApiKey = (e) => {
    setgateApiKey(e.target.value);
    localStorage.setItem('gateApiKey', e.target.value);
  };

  const [gateSecretKey, setgateSecretKey] = useState<string | null>(localStorage.getItem('gateSecretKey'));
  const handlegateSecretKey = (e) => {
    setgateSecretKey(e.target.value);
    localStorage.setItem('gateSecretKey', e.target.value);
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
              <DialogContent className="sm:max-w-xl gap-2">
                <DialogHeader>
                  <DialogTitle>Настройки</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="keys">
                  <TabsList className="px-2">
                    <TabsTrigger value="keys">Управление API</TabsTrigger>
                    <TabsTrigger value="alerts">Оповещения</TabsTrigger>
                    <TabsTrigger value="tickers">Тикеры</TabsTrigger>
                  </TabsList>
                  <TabsContent value="keys">
                    <div className="p-3 flex gap-3 flex-col">
                      <TypographyH4>Telegram</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="alorToken">Token</Label>
                          <Input id="alorToken" value={telegramToken} onChange={handletelegramToken} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="alorToken">UserID</Label>
                          <Input id="alorToken" value={telegramUserId} onChange={handletelegramUserId} />
                        </div>
                      </div>
                      <TypographyH4>Alor</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="alorToken">Token</Label>
                          <Input id="alorToken" value={aToken} onChange={handleEditAToken} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="alorToken">Портфель</Label>
                          <Input id="alorToken" value={aPortfolio} onChange={handleaPortfolio} />
                        </div>
                      </div>
                      <TypographyH4>Тинькофф</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="alorToken">Token</Label>
                          <Input id="tToken" value={tiToken} onChange={handleEditToken} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="brokerAccountId">BrokerAccountId</Label>
                          <Input id="brokerAccountId" value={brokerAccountId} onChange={handleEditBrokerAccountId} />
                        </div>
                      </div>
                      <TypographyH4>Bybit</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="bybitApiKey">Api Key</Label>
                          <Input id="bybitApiKey" value={bybitApiKey} onChange={handleEditbybitApiKey} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="bybitSecretKey">Secret Key</Label>
                          <Input id="bybitSecretKey" value={bybitSecretKey} onChange={handleEditbybitSecretKey} />
                        </div>
                      </div>
                      <TypographyH4>Bingx</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="bingxApiKey">Api key</Label>
                          <Input id="bingxApiKey" value={bingxApiKey} onChange={handlebingxApiKey} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="bingxSecretKey">Secret key</Label>
                          <Input id="bingxSecretKey" value={bingxSecretKey} onChange={handlebingxSecretKey} />
                        </div>
                      </div>
                      <TypographyH4>Gate</TypographyH4>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="gateApiKey">Api key</Label>
                          <Input id="gateApiKey" value={gateApiKey} onChange={handlegateApiKey} />
                        </div>
                        <div className="flex gap-2 flex-col">
                          <Label htmlFor="gateSecretKey">Secret key</Label>
                          <Input id="gateSecretKey" value={gateSecretKey} onChange={handlegateSecretKey} />
                        </div>
                      </div>

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
                  <TabsContent value="tickers">
                    <Table className="mb-3">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Тикер</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>Мультипликатор</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {favoritePairs.map((invoice, index) => (
                          <TableRow className={index % 2 ? 'rowOdd' : 'rowEven'}>
                            <TableCell>{[invoice.first, invoice.second, invoice.third].filter(Boolean).join('/')}</TableCell>
                            <TableCell>{invoice.type}</TableCell>
                            <TableCell>{invoice.multiple}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-0 h-4 w-4"
                                onClick={() =>
                                  dispatch(deletePair({ ticker: [invoice.first, invoice.second, invoice.third].filter(Boolean).join('/') }))
                                }
                              >
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
          <Routes>
            {menuItems.map((item) => (
              <Route path={item.key} element={item.element} />
            ))}
          </Routes>
          <AlertDialog />
        </Content>
      </Layout>
    </ThemeProvider>
  );
}
