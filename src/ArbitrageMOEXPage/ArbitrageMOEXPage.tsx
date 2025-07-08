import React, { ReactNode, useMemo } from 'react';
import { Layout, Menu, MenuProps, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { OldPage } from './strategies/OldPage';
import { EDPage } from './strategies/EDPage';
import { SI_CNY_Page } from './strategies/SI_CNY_Page';
import { SI_GOLD_Page } from './strategies/SI_GOLD_Page';
import { CNY_TOM_Page } from './strategies/CNY_TOM_Page';
import { KZT_TOM_Page } from './strategies/KZT_TOM_Page.tsx';
import { NVTKPage } from './strategies/NVTKPage.tsx';
import { PLZLPage } from './strategies/PLZLPage.tsx';
import { CNYRUBF_Page } from './strategies/CNYRUBF_Page.tsx';
import { useSearchParams } from 'react-router-dom';
import { KZOSPage } from './strategies/KZOSPage.tsx';

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
    { key: 'old', label: 'Future/Stock', element: <OldPage /> },
    { key: 'BANE', label: 'BANE/BANEP', element: <KZOSPage tickerStock="BANE" _tickerFuture="BANEP" /> },
    { key: 'LSNG', label: 'LSNG/LSNGP', element: <KZOSPage tickerStock="LSNG" _tickerFuture="LSNGP" /> },
    { key: 'MISB', label: 'MISB/MISBP', element: <KZOSPage tickerStock="MISB" _tickerFuture="MISBP" /> },
    { key: 'mtlr', label: 'MTLR/MTLRP', element: <KZOSPage tickerStock="MTLR" _tickerFuture="MTLRP" /> },
    { key: 'tatn', label: 'TATN/TATNP', element: <KZOSPage tickerStock="TATN" _tickerFuture="TATNP" /> },
    { key: 'rtkm', label: 'RTKM/RTKMP', element: <KZOSPage tickerStock="RTKM" _tickerFuture="RTKMP" /> },
    { key: 'SNGS', label: 'SNGS/SNGSP', element: <KZOSPage tickerStock="SNGS" _tickerFuture="SNGSP" /> },
    { key: 'SVET', label: 'SVET/SVETP', element: <KZOSPage tickerStock="SVET" _tickerFuture="SVETP" /> },
    { key: 'SBER', label: 'SBER/SBERP', element: <KZOSPage tickerStock="SBER" _tickerFuture="SBERP" /> },
    { key: 'KZOS', label: 'KZOS/KZOSP', element: <KZOSPage tickerStock="KZOS" _tickerFuture="KZOSP" /> },
    { key: 'nvtk', label: 'NVTK/NGM', element: <NVTKPage /> },
    { key: 'plzl', label: 'PLZL/GOLD', element: <PLZLPage /> },
    // { key: 'CNTL', label: 'CNTL - CNTLP', element: <CNTLPage /> },
    { key: 'cny_tom', label: 'CNY!1 / CNYRUB_TOM', element: <CNY_TOM_Page /> },
    { key: 'cnyrubf', label: 'CNY!1 / CNYRUBF', element: <CNYRUBF_Page /> },
    { key: 'KZT_tom', label: 'KZT!1 / KZTRUB_TOM', element: <KZT_TOM_Page /> },
    { key: 'ed', label: 'EU!1/(ED*SI)', element: <EDPage /> },
    { key: 'SI_CNY', label: 'SI!1/(CNY*UCNY)', element: <SI_CNY_Page /> },
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
