import React from 'react';
import { SmartPage } from './strategies/SmartPage';

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
  return <SmartPage />;
};
