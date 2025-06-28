import React, { ReactNode, useMemo, useState } from 'react';
import { DatePicker, Layout, Menu, MenuProps, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import { MTLRPage } from './strategies/MTLRPage.tsx';
import { OldPage } from './strategies/OldPage.tsx';

const { RangePicker } = DatePicker;

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
  const [selectedKey, setSelectedKey] = useState('mtlr');

  const items: MenuItem[] = [
    { key: 'old', label: 'Old', element: <OldPage /> },
    { key: 'mtlr', label: 'MTLR - MTLRP', element: <MTLRPage /> },
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
