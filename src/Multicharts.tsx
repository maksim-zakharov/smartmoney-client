import { useSearchParams } from 'react-router-dom';
import { TWChart } from './components/TWChart.tsx';
import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover.tsx';
import { Button } from './components/ui/button.tsx';
import { Grid3x3 } from 'lucide-react';
import GridSizeSelector from './components/GridSizeSelector.tsx';
import { cn } from './lib/utils.ts';
import { Input } from './components/ui/input.tsx';

export const Multicharts = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const rows = Number(searchParams.get('rows') || 1);
  const height = 940 / rows;

  const span = Number(searchParams.get('span') || 6);
  const ticker = searchParams.get('ticker') || 'BTC';

  const [inputTicker, setInputTicker] = useState(ticker);

  useEffect(() => {
    setInputTicker(ticker);
  }, [ticker]);

  const setRows = (tab: string) => {
    searchParams.set('rows', tab);
    setSearchParams(searchParams);
  };

  const setSpan = (tab: string) => {
    searchParams.set('span', tab);
    setSearchParams(searchParams);
  };

  const setTicker = (ticker: string) => {
    searchParams.set('ticker', ticker);
    setSearchParams(searchParams);
  };

  const handleSelect = (size: { rows: number; cols: number }) => {
    setSpan(size.cols.toString());
    setRows(size.rows.toString());
    // You can use this to update your app state, e.g., create a grid of that size
  };

  const tickers = [
    {
      exchange: 'MEXC',
      ticker: `${ticker}_USDT`,
    },
    {
      exchange: 'GATEIO',
      ticker: `${ticker}_USDT`,
    },
    {
      exchange: 'BYBIT',
      ticker: `${ticker}USDT`,
    },
    {
      exchange: 'BITGET',
      ticker: `${ticker}USDT`,
    },
    {
      exchange: 'OKX',
      ticker: `${ticker}-USDT-SWAP`,
    },
  ];

  const onClickSearch = () => {
    setTicker(inputTicker);
  };

  return (
    <>
      <form className="flex gap-2">
        <Input value={inputTicker} onChange={(e) => setInputTicker(e.currentTarget.value)} />
        <Button type="submit" onClick={onClickSearch}>
          Найти
        </Button>
      </form>
      <Popover>
        <PopoverTrigger>
          <Button variant="outline" className="justify-between font-normal">
            <Grid3x3 />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <GridSizeSelector value={{ cols: span, rows: rows }} onSelect={handleSelect} maxRows={4} maxCols={8} />
        </PopoverContent>
      </Popover>

      <div className="grid-cols-24 grid">
        {tickers.map((ticker) => (
          <div className={cn(`relative col-span-${24 / span}`)} style={{ height }}>
            <TWChart ticker={`${ticker.exchange}:${ticker.ticker}`} height={height} small multiple={1} />
          </div>
        ))}
      </div>
    </>
  );
};
