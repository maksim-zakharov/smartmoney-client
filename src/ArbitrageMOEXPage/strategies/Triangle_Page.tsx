// import { Chart } from '../../Chart';
import React from 'react';
import { TWChart } from '../../components/TWChart.tsx';

export const Triangle_Page = ({ first, second, third, multiple, noExp, onlyChart, height, seriesType = 'Candlestick' }: any) => {
  return (
    <div className="relative" style={{ height }}>
      <TWChart ticker={`${first}/${second}/${third}`} height={height} multiple={multiple} small={onlyChart} />
    </div>
  );
};
