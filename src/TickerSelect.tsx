import React, { FC, useMemo } from 'react';
import { Select } from 'antd';
import { symbolFuturePairs } from '../symbolFuturePairs';
import { useGetSecuritiesQQuery } from './api/alor.api.ts';

interface Props {
  value: string;
  disabled?: boolean;
  onSelect: (ticker: string) => void;
  filterSymbols?: string[];
}
const set = new Set(symbolFuturePairs.map((curr) => curr.stockSymbol));
export const TickerSelect: FC<Props> = ({ filterSymbols, disabled, value, onSelect }) => {
  const { data: securities = [] } = useGetSecuritiesQQuery({
    exchange: 'MOEX',
    limit: 1000,
  } as any);

  const filteredSecurities = filterSymbols ? securities.filter((s) => filterSymbols?.includes(s.symbol)) : securities;

  const options = useMemo(
    () =>
      filteredSecurities
        .filter((s) => set.has(s.symbol))
        .filter(
          (s) =>
            !['Unknown'].includes(s.complexProductCategory) &&
            // @ts-ignore
            !['MTQR', 'TQIF', 'ROPD', 'TQIR', 'TQRD', 'TQPI', 'CETS', 'TQTF', 'TQCB', 'TQOB', 'FQBR', 'RFUD'].includes(s.board) &&
            s.currency === 'RUB',
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol))
        .map((s) => ({
          label: s.symbol, //`${s.shortname} (${s.symbol})`,
          value: s.symbol,
        })),
    [filteredSecurities],
  );

  return (
    <Select
      value={value}
      showSearch
      disabled={disabled}
      placeholder="Введи тикер"
      onSelect={onSelect}
      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
      style={{ width: 100 }}
      options={options}
    />
  );
};
