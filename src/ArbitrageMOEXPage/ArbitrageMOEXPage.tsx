import React, { ReactNode, useMemo } from 'react';
import { MenuProps } from 'antd';
import { OldPage } from './strategies/OldPage';
import { Triangle_Page } from './strategies/Triangle_Page';
import { SI_GOLD_Page } from './strategies/SI_GOLD_Page';
import { CNY_TOM_Page } from './strategies/CNY_TOM_Page';
import { CNYRUBF_Page } from './strategies/CNYRUBF_Page';
import { useSearchParams } from 'react-router-dom';
import { StatArbPage } from './strategies/StatArbPage';
import { MOEX_CNY_Page } from './strategies/MOEX_CNY_Page';
import { SPBXPage } from './strategies/SPBXPage';
import { FundingPage } from './strategies/FundingPage';
import { SmartPage } from './strategies/SmartPage';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../components/ui/sidebar.tsx';
import { Typography } from 'antd';

type MenuItem = Required<MenuProps>['items'][number] & { element?: ReactNode };

export async function fetchSecurityDetails(symbol, token) {
  const url = `https://api.alor.ru/md/v2/Securities/MOEX/${symbol}?instrumentGroup=RFUD`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе данных');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка получения данных:', error);
  }
}

export const ArbitrageMOEXPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const items: MenuItem[] = [
    { key: 'Funding', label: 'Funding', element: <FundingPage /> },
    { key: 'old', label: 'Future/Stock', element: <OldPage /> },
    { key: 'smart', label: 'Smart', element: <SmartPage /> },
    { key: 'BANE', label: 'BANE/BANEP', element: <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" /> },
    { key: 'tatn', label: 'TATN/TATNP', element: <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" /> },
    {
      key: 'tatn-minus',
      label: 'TATN-TATNP',
      element: <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" multi={1} delimeter="minus" />,
    },
    { key: 'rtkm', label: 'RTKM/RTKMP', element: <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" /> },
    { key: 'mtlr', label: 'MTLR/MTLRP', element: <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" /> },
    { key: 'SBER', label: 'SBER/SBERP', element: <StatArbPage tickerStock="SBER" _tickerFuture="SBERP" /> },
    { key: 'SNGS', label: 'SNGS/SNGSP', element: <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" /> },
    {
      key: 'BYBIT:BTCUSD',
      label: 'BYBIT:BTCUSD/GATE:BTC_USDT',
      element: <StatArbPage tickerStock="BYBIT:BTCUSDT" _tickerFuture="GATE:BTC_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:ETHUSD',
      label: 'BYBIT:ETHUSD/GATE:ETHUSD',
      element: <StatArbPage tickerStock="BYBIT:ETHUSDT" _tickerFuture="GATE:ETH_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:XRPUSD',
      label: 'BYBIT:XRPUSD/GATE:XRPUSD',
      element: <StatArbPage tickerStock="BYBIT:XRPUSDT" _tickerFuture="GATE:XRP_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:SOLUSDT',
      label: 'BYBIT:SOLUSDT/GATE:XRPUSD',
      element: <StatArbPage tickerStock="BYBIT:SOLUSDT" _tickerFuture="GATE:SOL_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:TRXUSDT',
      label: 'BYBIT:TRXUSDT/GATE:TRXUSDT',
      element: <StatArbPage tickerStock="BYBIT:TRXUSDT" _tickerFuture="GATE:TRX_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:DOGEUSDT',
      label: 'BYBIT:DOGEUSDT/GATE:DOGEUSDT',
      element: <StatArbPage tickerStock="BYBIT:DOGEUSDT" _tickerFuture="GATE:DOGE_USDT" multi={100} />,
    },
    {
      key: 'MEXC:DOGEUSDT',
      label: 'MEXC:DOGEUSDT/GATE:DOGEUSDT',
      element: <StatArbPage tickerStock="MEXC:DOGE_USDT" _tickerFuture="GATE:DOGE_USDT" multi={100} />,
    },
    {
      key: 'MEXC:PUBLIC_USDT',
      label: 'MEXC:PUBLIC_USDT/GATE:PUBLIC_USDT',
      element: <StatArbPage tickerStock="MEXC:PUBLIC_USDT" _tickerFuture="GATE:PUBLIC_USDT" multi={100} />,
    },
    {
      key: 'MEXC:WAI_USDT',
      label: 'MEXC:WAI_USDT/GATE:WAI_USDT',
      element: <StatArbPage tickerStock="MEXC:WAI_USDT" _tickerFuture="GATE:WAI_USDT" multi={100} />,
    },
    {
      key: 'MEXC:OKB_USDT',
      label: 'MEXC:OKB_USDT/GATE:OKB_USDT',
      element: <StatArbPage tickerStock="MEXC:OKB_USDT" _tickerFuture="GATE:OKB_USDT" multi={100} />,
    },
    {
      key: 'BINGX:OKB-USDT',
      label: 'BINGX:OKB-USDT/GATE:OKB_USDT',
      element: <StatArbPage tickerStock="BINGX:OKB-USDT" _tickerFuture="GATE:OKB_USDT" multi={100} />,
    },
    {
      key: 'BINGX:HOUSE-USDT',
      label: 'BINGX:HOUSE-USDT/GATE:HOUSE_USDT',
      element: <StatArbPage tickerStock="BINGX:HOUSE-USDT" _tickerFuture="GATE:HOUSE_USDT" multi={100} />,
    },
    {
      key: 'BINGX:PI-USDT',
      label: 'BINGX:PI-USDT/GATE:PI_USDT',
      element: <StatArbPage tickerStock="BINGX:PI-USDT" _tickerFuture="GATE:PI_USDT" multi={100} />,
    },
    {
      key: 'MEXC:MAT_USDT',
      label: 'MEXC:MAT_USDT/GATE:MAT_USDT',
      element: <StatArbPage tickerStock="MEXC:MAT_USDT" _tickerFuture="GATE:MAT_USDT" multi={100} />,
    },
    {
      key: 'MEXC:BOOM_USDT',
      label: 'MEXC:BOOM_USDT/GATE:BOOM_USDT',
      element: <StatArbPage tickerStock="MEXC:BOOM_USDT" _tickerFuture="GATE:BOOM_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:MITOUSDT',
      label: 'BYBIT:MITOUSDT/MEXC:MITO_USDT',
      element: <StatArbPage tickerStock="BYBIT:MITOUSDT" _tickerFuture="MEXC:MITO_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:XNYUSDT',
      label: 'BYBIT:XNYUSDT/MEXC:XNY_USDT',
      element: <StatArbPage tickerStock="BYBIT:XNYUSDT" _tickerFuture="MEXC:XNY_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:WLFIUSDT',
      label: 'BYBIT:WLFIUSDT/MEXC:WLFI_USDT',
      element: <StatArbPage tickerStock="BYBIT:WLFIUSDT" _tickerFuture="MEXC:WLFI_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:BTRUSDT',
      label: 'BYBIT:BTRUSDT/MEXC:BTR_USDT',
      element: <StatArbPage tickerStock="BYBIT:BTRUSDT" _tickerFuture="MEXC:BTR_USDT" multi={100} />,
    },
    {
      key: 'BYBIT:CELBUSDT',
      label: 'BYBIT:CELBUSDT/MEXC:CELB_USDT',
      element: <StatArbPage tickerStock="BYBIT:CELBUSDT" _tickerFuture="MEXC:CELB_USDT" multi={100} />,
    },
    {
      key: 'GMGN:MITO_USDT',
      label: 'GMGN:MITOUSDT/MEXC:MITO_USDT',
      element: <StatArbPage tickerStock="GMGN:MITOUSDT" _tickerFuture="MEXC:MITO_USDT" multi={100} />,
    },
    {
      key: 'BINANCE:XPLUSDT',
      label: 'BINANCE:XPLUSDT/BYBIT:XPLUSDT',
      element: <StatArbPage tickerStock="BINANCE:XPLUSDT" _tickerFuture="BYBIT:XPLUSDT" multi={100} />,
    },
    {
      key: 'MEXC:XPL_USDT',
      label: 'MEXC:XPL_USDT/BYBIT:XPLUSDT',
      element: <StatArbPage tickerStock="MEXC:XPL_USDT" _tickerFuture="BYBIT:XPLUSDT" multi={100} />,
    },
    {
      key: 'MEXC:LEVER_USDT',
      label: 'MEXC:LEVER_USDT/GATE:LEVER_USDT',
      element: <StatArbPage tickerStock="MEXC:LEVER_USDT" _tickerFuture="GATE:LEVER_USDT" multi={100} />,
    },
    {
      key: 'MEXC:PLAY_USDT',
      label: 'MEXC:PLAY_USDT/GATE:PLAY_USDT',
      element: <StatArbPage tickerStock="MEXC:PLAY_USDT" _tickerFuture="GATE:PLAY_USDT" multi={100} />,
    },
    {
      key: 'MEXC:GLMR_USDT',
      label: 'MEXC:GLMR_USDT/GATE:GLMR_USDT',
      element: <StatArbPage tickerStock="MEXC:GLMR_USDT" _tickerFuture="GATE:GLMR_USDT" multi={100} />,
    },
    {
      key: 'IMOEXF',
      label: 'IMOEXF/MIX-9.25',
      element: <StatArbPage tickerStock="IMOEXF" _tickerFuture="MIX-9.25" seriesType="Line" multi={10000} />,
    },
    {
      key: 'GAZPF',
      label: 'GAZPF/GAZR-9.25',
      element: <StatArbPage tickerStock="GAZPF" _tickerFuture="GAZR-9.25" seriesType="Line" multi={10000} />,
    },
    {
      key: 'XAGUSD_xp',
      label: 'SILV-9.25/XAGUSD_xp',
      element: <StatArbPage tickerStock="SILV-9.25" _tickerFuture="XAGUSD_xp" multi={10000} />,
    },
    {
      key: 'USDCNH_xp',
      label: 'UCNY-9.25/USDCNH_xp',
      element: <StatArbPage tickerStock="UCNY-9.25" _tickerFuture="USDCNH_xp" multi={1000} />,
    },
    {
      key: 'XAUUSD_xp',
      label: 'GOLD-9.25/XAUUSD_xp',
      element: <StatArbPage tickerStock="GOLD-9.25" _tickerFuture="XAUUSD_xp" multi={100000} />,
    },
    {
      key: 'XAUUSD_xp12',
      label: 'GOLD-12.25/XAUUSD_xp',
      element: <StatArbPage tickerStock="GOLD-12.25" _tickerFuture="XAUUSD_xp" multi={100000} />,
    },
    {
      key: 'XPDUSD_xp',
      label: 'PLD-9.25/XPDUSD_xp',
      element: <StatArbPage tickerStock="PLD-9.25" _tickerFuture="XPDUSD_xp" multi={100000} />,
    },
    {
      key: 'XPTUSD_xp',
      label: 'PLT-9.25/XPDUSD_xp',
      element: <StatArbPage tickerStock="PLT-9.25" _tickerFuture="XPTUSD_xp" multi={100000} />,
    },
    {
      key: 'EURUSD_xp',
      label: 'ED-9.25/EURUSD_xp',
      element: <StatArbPage tickerStock="ED-9.25" _tickerFuture="EURUSD_xp" multi={100} />,
    },
    {
      key: 'BRNUSD_xp',
      label: 'BR-9.25/BRNUSD_xp',
      element: <StatArbPage tickerStock="BR-9.25" _tickerFuture="BRNUSD_xp" multi={10000} />,
    },
    {
      key: 'NGCUSD_xp',
      label: 'NG-9.25/NGCUSD_xp',
      element: <StatArbPage tickerStock="NG-9.25" _tickerFuture="NGCUSD_xp" multi={1000} />,
    },
    {
      key: 'SPXUSD_xp',
      label: 'SPYF-9.25/SPXUSD_xp',
      element: <StatArbPage tickerStock="SPYF-9.25" _tickerFuture="SPXUSD_xp" multi={1000000} />,
    },
    {
      key: 'SPXUSD_xp12',
      label: 'SPYF-12.25/SPXUSD_xp',
      element: <StatArbPage tickerStock="SPYF-12.25" _tickerFuture="SPXUSD_xp" multi={1000000} />,
    },
    {
      key: 'NDXUSD_xp',
      label: 'NASD-9.25/NDXUSD_xp',
      element: <StatArbPage tickerStock="NASD-9.25" _tickerFuture="NDXUSD_xp" multi={100000} />,
    },
    {
      key: 'CUCUSD_xp',
      label: 'COPPER-9.25/CUCUSD_xp',
      element: <StatArbPage tickerStock="COPPER-9.25" _tickerFuture="CUCUSD_xp" multi={0.0453592} />,
    },
    { key: 'rosn-tatn', label: 'ROSN/TATN', element: <StatArbPage tickerStock="ROSN" _tickerFuture="TATN" /> },
    { key: 'rosn-LKOH', label: 'ROSN/LKOH', element: <StatArbPage tickerStock="ROSN" _tickerFuture="LKOH" /> },
    { key: 'SBER/VTBR', label: 'SBER/VTBR', element: <StatArbPage tickerStock="SBER" _tickerFuture="VTBR" /> },
    { key: 'SBER/CBOM', label: 'SBER/CBOM', element: <StatArbPage tickerStock="SBER" _tickerFuture="CBOM" /> },
    { key: 'VTBR/MOEX', label: 'VTBR/MOEX', element: <StatArbPage tickerStock="VTBR" _tickerFuture="MOEX" /> },
    { key: 'PIKK/SMLT', label: 'PIKK/SMLT', element: <StatArbPage tickerStock="PIKK" _tickerFuture="SMLT" /> },
    { key: 'MTSS/YDEX', label: 'MTSS/YDEX', element: <StatArbPage tickerStock="MTSS" _tickerFuture="YDEX" /> },
    { key: 'GAZP/RUAL', label: 'GAZP/RUAL', element: <StatArbPage tickerStock="GAZP" _tickerFuture="RUAL" /> },
    { key: 'GMKN/SVCB', label: 'GMKN/SVCB', element: <StatArbPage tickerStock="GMKN" _tickerFuture="SVCB" /> },
    { key: 'PLZL/NLMK', label: 'PLZL/NLMK', element: <StatArbPage tickerStock="PLZL" _tickerFuture="NLMK" /> },
    {
      key: 'SPBX-arbs',
      label: 'SPBX-arbs',
      element: <SPBXPage tickerStock="BANE" _tickerFuture="BANE" righExchange="SPBX" />,
    },
    { key: 'cny_tom', label: 'CNY!1 / CNYRUB_TOM', element: <CNY_TOM_Page /> },
    { key: 'cnyrubf', label: 'CNY!1 / CNYRUBF', element: <CNYRUBF_Page /> },
    { key: 'ed', label: 'EU/SI/ED', element: <Triangle_Page first="EU-9.25" second="SI-9.25" third="ED-9.25" multiple={10} /> },
    {
      key: 'SI_CNY',
      label: 'SI/CNY/UC',
      element: <Triangle_Page first="SI-9.25" second="CNY-9.25" third="UCNY-9.25" multiple={0.01} />,
    },
    {
      key: 'SILV FOREX',
      label: 'FX:SILVER/SV1!',
      element: <StatArbPage tickerStock="FX:XAG/USD" _tickerFuture="SILV-9.25" multiple={1} />,
    },
    {
      key: 'EURRUBF/EU-9.25',
      label: 'EURRUBF/EU-9.25',
      element: <StatArbPage tickerStock="EURRUBF" _tickerFuture={`EU-9.25`} multi={100000} seriesType="Line" />,
    },
    {
      key: 'USDRUBF/SI-9.25',
      label: 'USDRUBF/SI-9.25',
      element: <StatArbPage tickerStock="USDRUBF" _tickerFuture={`SI-9.25`} multi={100000} seriesType="Line" />,
    },
    {
      key: 'CNYRUBF/CNY-9.25',
      label: 'CNYRUBF/CNY-9.25',
      element: <StatArbPage tickerStock="CNYRUBF" _tickerFuture={`CNY-9.25`} multi={100} seriesType="Line" />,
    },
    {
      key: 'GLDRUBF/GL-9.25',
      label: 'GLDRUBF/GL-9.25',
      element: <StatArbPage tickerStock="GLDRUBF" _tickerFuture={`GL-9.25`} multi={100} seriesType="Line" />,
    },
    {
      key: 'USD/CNH FOREX',
      label: 'FX:USDCNH/UCNY1!',
      element: <StatArbPage tickerStock="FX:USD/CNH" _tickerFuture="UCNY-9.25" multiple={0.01} />,
    },
    {
      key: 'ED FOREX',
      label: 'FX:EURUSD/ED1!',
      element: <StatArbPage tickerStock="FX:EUR/USD" _tickerFuture="ED-9.25" multiple={0.01} />,
    },
    {
      key: 'ED_sint FOREX',
      label: 'EU/SI vs FX:EUR/USD',
      element: <Triangle_Page first="EU" second="SI" third="FX:EUR/USD" multiple={1} />,
    },
    {
      key: 'CNY FOREX',
      label: 'SI/CNY vs FX:USD/CNY',
      element: <Triangle_Page first="SI" second="CNY" third="FX:USD/CNY" multiple={0.001} />,
    },
    {
      key: 'USDRUBF/CNY-9.25/UCNY-9.25',
      label: 'USDRUBF/CNY-9.25/UCNY-9.25',
      element: <Triangle_Page first="USDRUBF" second="CNY-9.25" third="UCNY-9.25" multiple={1} noExp />,
    },
    {
      key: 'SI-9.25/CNYRUBF/UCNY-9.25',
      label: 'SI-9.25/CNYRUBF/UCNY-9.25',
      element: <Triangle_Page first="SI-9.25" second="CNYRUBF" third="UCNY-9.25" multiple={0.001} noExp />,
    },
    {
      key: 'USDRUBF/CNYRUBF/UCNY-9.25',
      label: 'USDRUBF/CNYRUBF/UCNY-9.25',
      element: <Triangle_Page first="USDRUBF" second="CNYRUBF" third="UCNY-9.25" multiple={1} noExp />,
    },
    // {
    //   key: 'USDRUBF/GLDRUBF/GL-9.25',
    //   label: 'USDRUBF/GLDRUBF/GL-9.25',
    //   element: <Triangle_Page first="USDRUBF" second="GLDRUBF" third="GL-9.25" multiple={1000000} noExp />,
    // },
    {
      key: 'EURRUBF/USDRUBF/ED-9.25',
      label: 'EURRUBF/USDRUBF/ED-9.25',
      element: <Triangle_Page first="EURRUBF" second="USDRUBF" third="ED-9.25" multiple={1} noExp />,
    },
    {
      key: 'GLDRUBF/SI-9.25/GOLD-9.25',
      label: 'GLDRUBF/SI-9.25/GOLD-9.25',
      element: <Triangle_Page first="GLDRUBF" second="SI-9.25" third="GOLD-9.25" multiple={31100} noExp />,
    },
    {
      key: 'GLDRUBF/SI-9.25/XAUUSD_xp',
      label: 'GLDRUBF/SI-9.25/XAUUSD_xp',
      element: <Triangle_Page first="GLDRUBF" second="SI-9.25" third="XAUUSD_xp" multiple={31100000} noExp />,
    },
    { key: 'MOEXCN', label: 'MOEX/CR/MOEXCN', element: <MOEX_CNY_Page /> },
    {
      key: 'SI_GOLD',
      label: 'SI_GOLD',
      element: <SI_GOLD_Page first="GLDRUBF" second="SI-9.25" third="GOLD-9.25" multiple={31100} rate={0.2} noExp seriesType="Line" />,
    },
  ];
  const selectedKey = searchParams.get('tab') || items[0]?.key;
  const setSelectedKey = (value) => {
    searchParams.set('tab', value);
    setSearchParams(searchParams);
  };

  const menuMap = useMemo(
    () =>
      items.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      }, {}),
    [items],
  );

  return (
    // <Layout style={{ margin: -8 }}>
    //   <Sider>
    //     <Menu
    //       style={{ overflow: 'auto', height: 'calc(100vh - 36px)' }}
    //       theme="dark"
    //       defaultSelectedKeys={[selectedKey]}
    //       mode="inline"
    //       items={items}
    //       onSelect={({ item, key }) => setSelectedKey(key)}
    //     />
    //   </Sider>
    //   <Content style={{ padding: '0 24px 24px' }}>
    //     <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
    //     {menuMap[selectedKey].element ?? 'not found'}
    //   </Content>
    // </Layout>

    <SidebarProvider>
      <Sidebar>
        {/*<SidebarHeader />*/}
        <SidebarContent>
          {/*<SidebarGroup />*/}
          {/*<SidebarGroupLabel>Application</SidebarGroupLabel>*/}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={selectedKey === item.key} onClick={() => setSelectedKey(item.key)}>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <div className="w-full">
        <SidebarTrigger />
        <Typography.Title>{menuMap[selectedKey].label}</Typography.Title>
        {menuMap[selectedKey].element ?? 'not found'}
      </div>
    </SidebarProvider>
  );
};
