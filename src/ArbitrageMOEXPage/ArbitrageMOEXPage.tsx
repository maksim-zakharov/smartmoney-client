import React, { ReactNode, useMemo } from 'react';
import { Layout, Menu, MenuProps, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { OldPage } from './strategies/OldPage';
import { Triangle_Page } from './strategies/Triangle_Page.tsx';
import { SI_GOLD_Page } from './strategies/SI_GOLD_Page';
import { CNY_TOM_Page } from './strategies/CNY_TOM_Page';
import { CNYRUBF_Page } from './strategies/CNYRUBF_Page.tsx';
import { useSearchParams } from 'react-router-dom';
import { StatArbPage } from './strategies/StatArbPage.tsx';
import { MOEX_CNY_Page } from './strategies/MOEX_CNY_Page.tsx';
import { SPBXPage } from './strategies/SPBXPage.tsx';
import { FundingPage } from './strategies/FundingPage.tsx';
import { SmartPage } from './strategies/SmartPage.tsx';

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
  // const { data: tdData } = useTdCandlesQuery({
  //   start_date: '2020-07-14',
  //   outputsize: 5000,
  //   symbol: 'GOLD/USD',
  //   interval: '5min',
  //   apikey: '20dc749373754927b09d95723d963e88',
  // });

  const [searchParams, setSearchParams] = useSearchParams();

  const items: MenuItem[] = [
    { key: 'Funding', label: 'Funding', element: <FundingPage /> },
    { key: 'old', label: 'Future/Stock', element: <OldPage /> },
    { key: 'smart', label: 'Smart', element: <SmartPage /> },
    { key: 'BANE', label: 'BANE/BANEP', element: <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" /> },
    { key: 'tatn', label: 'TATN/TATNP', element: <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" /> },
    { key: 'rtkm', label: 'RTKM/RTKMP', element: <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" /> },
    { key: 'mtlr', label: 'MTLR/MTLRP', element: <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" /> },
    { key: 'SBER', label: 'SBER/SBERP', element: <StatArbPage tickerStock="SBER" _tickerFuture="SBERP" /> },
    { key: 'SNGS', label: 'SNGS/SNGSP', element: <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" /> },
    {
      key: 'IMOEXF',
      label: 'IMOEXF/MIX-9.25',
      element: <StatArbPage tickerStock="IMOEXF" _tickerFuture="MIX-9.25" seriesType="Line" multi={10000} />,
    },
    { key: 'rosn-tatn', label: 'ROSN/TATN', element: <StatArbPage tickerStock="ROSN" _tickerFuture="TATN" /> },
    { key: 'rosn-LKOH', label: 'ROSN/LKOH', element: <StatArbPage tickerStock="ROSN" _tickerFuture="LKOH" /> },
    { key: 'SBER/VTBR', label: 'SBER/VTBR', element: <StatArbPage tickerStock="SBER" _tickerFuture="VTBR" /> },
    { key: 'SBER/CBOM', label: 'SBER/CBOM', element: <StatArbPage tickerStock="SBER" _tickerFuture="CBOM" /> },
    { key: 'VTBR/CBOM', label: 'VTBR/CBOM', element: <StatArbPage tickerStock="VTBR" _tickerFuture="CBOM" /> },
    { key: 'PIKK/SMLT', label: 'PIKK/SMLT', element: <StatArbPage tickerStock="PIKK" _tickerFuture="SMLT" /> },
    {
      key: 'SPBX-arbs',
      label: 'SPBX-arbs',
      element: <SPBXPage tickerStock="BANE" _tickerFuture="BANE" righExchange="SPBX" />,
    },
    { key: 'cny_tom', label: 'CNY!1 / CNYRUB_TOM', element: <CNY_TOM_Page /> },
    { key: 'cnyrubf', label: 'CNY!1 / CNYRUBF', element: <CNYRUBF_Page /> },
    { key: 'ed', label: 'EU/SI/ED', element: <Triangle_Page first="EU" second="SI" third="ED" multiple={1} /> },
    {
      key: 'ED FOREX',
      label: 'EU/SI vs FX:EUR/USD',
      element: <Triangle_Page first="EU" second="SI" third="FX:EUR/USD" multiple={1} />,
    },
    {
      key: 'CNY FOREX',
      label: 'SI/CNY vs FX:USD/CNY',
      element: <Triangle_Page first="SI" second="CNY" third="FX:USD/CNY" multiple={0.001} />,
    },
    {
      key: 'SI_CNY',
      label: 'SI/CNY/UC',
      element: <Triangle_Page first="SI" second="CNY" third="UCNY" multiple={0.001} />,
    },
    {
      key: 'USDRUBF/CNY-9.25/UCNY-9.25',
      label: 'USDRUBF/CNY-9.25/UCNY-9.25',
      element: <Triangle_Page first="USDRUBF" second="CNY-6.25" third="UCNY-6.25" multiple={1} noExp />,
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
    {
      key: 'USDRUBF/GLDRUBF/GL-9.25',
      label: 'USDRUBF/GLDRUBF/GL-9.25',
      element: <Triangle_Page first="USDRUBF" second="GLDRUBF" third="GL-9.25" multiple={1000000} noExp />,
    },
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
    { key: 'MOEXCN', label: 'MOEX/CR/MOEXCN', element: <MOEX_CNY_Page /> },
    { key: 'SI_GOLD', label: 'SI_GOLD', element: <SI_GOLD_Page /> },
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
