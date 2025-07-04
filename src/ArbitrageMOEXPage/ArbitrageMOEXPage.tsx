import React, { ReactNode, useMemo } from 'react';
import { Layout, Menu, MenuProps, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { MTLRPage } from './strategies/MTLRPage';
import { OldPage } from './strategies/OldPage';
import { EDPage } from './strategies/EDPage';
import { SI_CNY_Page } from './strategies/SI_CNY_Page';
import { SI_GOLD_Page } from './strategies/SI_GOLD_Page';
import { BANEPage } from './strategies/BANEPage';
import { CNY_TOM_Page } from './strategies/CNY_TOM_Page';
import { KZT_TOM_Page } from './strategies/KZT_TOM_Page.tsx';
import { RTKMPage } from './strategies/RTKMPage.tsx';
import { NVTKPage } from './strategies/NVTKPage.tsx';
import { PLZLPage } from './strategies/PLZLPage.tsx';
import { CNYRUBF_Page } from './strategies/CNYRUBF_Page.tsx';
import { useSearchParams } from 'react-router-dom';
import { TATNPage } from './strategies/TATNPage.tsx';
import { SNGSPage } from './strategies/SNGSPage.tsx';
import { SBERPage } from './strategies/SBERPage.tsx';

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
    { key: 'mtlr', label: 'MTLR/MTLRP', element: <MTLRPage /> },
    { key: 'tatn', label: 'TATN/TATNP', element: <TATNPage /> },
    { key: 'bane', label: 'BANE/BANEP', element: <BANEPage /> },
    { key: 'rtkm', label: 'RTKM/RTKMP', element: <RTKMPage /> },
    { key: 'SNGS', label: 'SNGS/SNGSP', element: <SNGSPage /> },
    { key: 'SBER', label: 'SBER/SBERP', element: <SBERPage /> },
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
