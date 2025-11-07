import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils.ts';
import React, { useMemo } from 'react';
import { exchangeImgMap } from './utils.ts';

export const CryptoArbs = () => {
  const { data: tickersMap = {} } = useGetPumpTickersQuery(
    {},
    {
      pollingInterval: 5000,
    },
  );

  const tickers = Object.entries(tickersMap);

  const fundingMap = useMemo(() => {
    return tickers
      .map(([ticker, invoice], index) => invoice.funding.map((a) => ({ ...a, ticker })))
      .flat()
      .reduce((acc, funding) => {
        const key = `${funding.ticker}_${funding.exchange}`;
        acc[key] = Number(funding.fundingRate);

        return acc;
      }, {});
  }, [tickers]);

  const sumFunding = (a) => {
    const leftFunding = fundingMap[`${a.ticker}_${a.left.exchange}`];
    const rightFunding = fundingMap[`${a.ticker}_${a.right.exchange}`];

    if (!rightFunding || !leftFunding) {
      return -Infinity;
    }

    return a.ratio > 1 ? leftFunding - rightFunding : rightFunding - leftFunding;
  };

  return (
    <>
      <Table wrapperClassName="pt-2">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] text-left" colSpan={11}>
              Crypto Funding
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableHeader className="bg-[rgb(36,52,66)]">
          <TableRow>
            <TableHead className="w-[100px]">Инструмент</TableHead>
            <TableHead className="w-[100px]">Арба</TableHead>
            <TableHead className="w-[100px]">Фандинг</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickers
            .map(([ticker, invoice], index) => invoice.arbs.map((a) => ({ ...a, ticker })))
            .flat()
            // .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))
            .filter(
              (b) =>
                Math.abs(b.ratio - 1) * 100 > 1 &&
                Number(fundingMap[`${b.ticker}_${b.left.exchange}`] - fundingMap[`${b.ticker}_${b.right.exchange}`]) * 100 > 0.5,
            )
            .sort((a, b) => {
              const aPart = sumFunding(a);
              const bPart = sumFunding(b);

              return bPart - aPart;
            })
            .map((a, index) => (
              <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                <TableCell>{a.ticker}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="flex gap-1 items-center">
                      <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />
                      {a.left.exchange}: {a.left.last}
                    </div>
                    /
                    <div className="flex gap-1 items-center">
                      <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />
                      {a.right.exchange}: {a.right.last}
                    </div>
                    <div>{((a.ratio - 1) * 100).toFixed(2)}%</div>
                  </div>
                </TableCell>
                <TableCell>
                  {a.left.exchange}: {fundingMap[`${a.ticker}_${a.left.exchange}`]} - {a.right.exchange}:{' '}
                  {fundingMap[`${a.ticker}_${a.right.exchange}`]} =
                  {(Number(fundingMap[`${a.ticker}_${a.left.exchange}`] - fundingMap[`${a.ticker}_${a.right.exchange}`]) * 100).toFixed(4)}%
                </TableCell>
              </TableRow>
            ))}
          {/*{tickers*/}
          {/*  .sort(*/}
          {/*    (a, b) => Math.max(...b[1].arbs.map((a) => Math.abs(a.ratio - 1))) - Math.max(...a[1].arbs.map((a) => Math.abs(a.ratio - 1))),*/}
          {/*  )*/}
          {/*  .map(([ticker, invoice], index) => (*/}
          {/*    <TableRow key={ticker} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>*/}
          {/*      <TableCell>{ticker}</TableCell>*/}
          {/*      <TableCell>*/}
          {/*        {invoice.arbs*/}
          {/*          // .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))*/}
          {/*          .map((a) => (*/}
          {/*            <div className="flex gap-2">*/}
          {/*              <div className="flex gap-1 items-center">*/}
          {/*                <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />*/}
          {/*                {a.left.exchange}: {a.left.last}*/}
          {/*              </div>*/}
          {/*              /*/}
          {/*              <div className="flex gap-1 items-center">*/}
          {/*                <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />*/}
          {/*                {a.right.exchange}: {a.right.last}*/}
          {/*              </div>*/}
          {/*              <div>{((a.ratio - 1) * 100).toFixed(2)}%</div>*/}
          {/*            </div>*/}
          {/*          ))}*/}
          {/*      </TableCell>*/}
          {/*      <TableCell>{ticker}</TableCell>*/}
          {/*      <TableCell>{ticker}</TableCell>*/}
          {/*    </TableRow>*/}
          {/*  ))}*/}
        </TableBody>
      </Table>
    </>
  );
};
