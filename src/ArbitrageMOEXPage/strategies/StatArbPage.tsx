// import { Chart } from '../../Chart';
import React from 'react';
import { TWChart } from '../../components/TWChart';

export const StatArbPage = ({
  tickerStock,
  _tickerFuture,
  leftExchange = 'MOEX',
  righExchange = 'MOEX',
  onlyChart,
  height,
  seriesType = 'Candlestick',
  delimeter = 'div', // : 'div' | 'minus'
  multi = 100,
}: any) => {
  return (
    <div className="relative" style={{ height }}>
      <TWChart ticker={`${tickerStock}/${_tickerFuture}`} height={height} multiple={multi} small={onlyChart} />
    </div>
  );
};
