import { useGetPumpTickersQuery } from './api/pump-api.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils.ts';
import React, { useMemo } from 'react';
import { exchangeImgMap } from './utils.ts';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card.tsx';
import { TypographyH4 } from './components/ui/typography.tsx';

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
      {tickers
        .map(([ticker, invoice], index) => invoice.arbs.map((a) => ({ ...a, ticker })))
        .flat()
        // .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))
        .filter((b) => Math.abs(b.ratio - 1) * 100 > 1 && sumFunding(b) * 100 > 0.3)
        .sort((a, b) => {
          const aPart = sumFunding(a);
          const bPart = sumFunding(b);

          return bPart - aPart;
        })
        .map((a, index) => (
          <Card>
            <CardHeader>
              <CardTitle className={cn('text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-nowrap')}>
                {a.ticker}, фандинг {(sumFunding(a) * 100).toFixed(4)}%
              </CardTitle>
              <CardDescription className="flex gap-2">
                <div className="flex flex-col">
                  <TypographyH4>Продаем</TypographyH4>
                  {a.right.last > a.left.last && (
                    <div>
                      <div className="flex">
                        <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />
                        {a.right.exchange}: {a.right.last}
                      </div>
                      <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.right.exchange}`]?.toFixed(5)}</div>
                    </div>
                  )}
                  {a.right.last < a.left.last && (
                    <div>
                      <div className="flex">
                        <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />
                        {a.left.exchange}: {a.left.last}
                      </div>
                      <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.left.exchange}`]?.toFixed(5)}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <TypographyH4>Покупаем</TypographyH4>
                  {a.right.last < a.left.last && (
                    <div>
                      <div className="flex">
                        <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />
                        {a.right.exchange}: {a.right.last}
                      </div>
                      <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.right.exchange}`]?.toFixed(5)}</div>
                    </div>
                  )}
                  {a.right.last > a.left.last && (
                    <div>
                      <div className="flex">
                        <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />
                        {a.left.exchange}: {a.left.last}
                      </div>
                      <div className="flex">Фандинг: {fundingMap[`${a.ticker}_${a.left.exchange}`]?.toFixed(5)}</div>
                    </div>
                  )}
                </div>
              </CardDescription>
              {/*<CardDescription className="flex gap-2 items-center">*/}
              {/*  <div className="flex gap-2">*/}
              {/*    <div className="flex gap-1 items-center">*/}
              {/*      <img className="h-3 rounded-full" src={exchangeImgMap[a.left.exchange]} />*/}
              {/*      {a.left.exchange}: {a.left.last}*/}
              {/*    </div>*/}
              {/*    /*/}
              {/*    <div className="flex gap-1 items-center">*/}
              {/*      <img className="h-3 rounded-full" src={exchangeImgMap[a.right.exchange]} />*/}
              {/*      {a.right.exchange}: {a.right.last}*/}
              {/*    </div>*/}
              {/*    <div>{((a.ratio - 1) * 100).toFixed(2)}%</div>*/}
              {/*  </div>*/}
              {/*  {a.left.exchange}: {fundingMap[`${a.ticker}_${a.left.exchange}`]} - {a.right.exchange}:{' '}*/}
              {/*  /!*{fundingMap[`${a.ticker}_${a.right.exchange}`]} ={(sumFunding(a) * 100).toFixed(4)}%*!/*/}
              {/*</CardDescription>*/}
            </CardHeader>
          </Card>
        ))}

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
            .filter((b) => Math.abs(b.ratio - 1) * 100 > 1 && sumFunding(b) * 100 > 0.3)
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
                  {fundingMap[`${a.ticker}_${a.right.exchange}`]} ={(sumFunding(a) * 100).toFixed(4)}%
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </>
  );
};
