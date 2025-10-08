import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.tsx';
import { cn } from './lib/utils';
import React, { useMemo, useState } from 'react';
import { exchangeImgMap } from './utils.ts';

const avg = (values: number[]) => {
  return values.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / values.length;
};

export const ArbitrageTable = ({
  bitstampTickers,
  mexcTickers,
  mexcSpotTickers,
  bingxSpotTickers,
  bingxFuturesTickers,
  gateSpotTickers,
  gateFuturesTickers,
  bybitSpotTickers,
  bybitFuturesTickers,
  binanceFuturesTickers,
  binanceSpotTickers,
  htxTickers,
  kukoinTickers,
  bitgetTickers,
}) => {
  const [sorter, setSorter] = useState<any>({
    riseFallRate: 'desc',
  });

  const bitgetFuturesMap = useMemo(
    () => new Map<string, number>(bitgetTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPr)])),
    [bitgetTickers],
  );

  const kukoinFuturesMap = useMemo(
    () => new Map<string, number>(kukoinTickers.map((t) => [t.symbol.split('-USDT')[0], Number(t.last)])),
    [kukoinTickers],
  );

  const bybitSpotsMap = useMemo(
    () => new Map<string, number>(bybitSpotTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [bybitSpotTickers],
  );

  const bybitFuturesMap = useMemo(
    () => new Map<string, number>(bybitFuturesTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [bybitFuturesTickers],
  );

  const binanceSpotMap = useMemo(
    () => new Map<string, number>(binanceSpotTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [binanceSpotTickers],
  );

  const binanceFuturesMap = useMemo(
    () => new Map<string, number>(binanceFuturesTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [binanceFuturesTickers],
  );

  const htxFuturesMap = useMemo(
    () => new Map<string, number>(htxTickers.map((t) => [t.contract_code.split('-USDT')[0], Number(t.close)])),
    [htxTickers],
  );

  const bitstampMap = useMemo(
    () => new Map<string, number>(bitstampTickers.map((t) => [t.pair.split('/USD-PERP')[0], Number(t.last)])),
    [bitstampTickers],
  );

  const gateSpotMap = useMemo(
    () => new Map<string, number>(gateSpotTickers.map((t) => [t.currency_pair.split('_USDT')[0], Number(t.last)])),
    [gateSpotTickers],
  );

  const gateFuturesMap = useMemo(
    () => new Map<string, number>(gateFuturesTickers.map((t) => [t.contract.split('_USDT')[0], Number(t.last)])),
    [gateFuturesTickers],
  );

  const bingxSpotMap = useMemo(
    () => new Map<string, number>(bingxSpotTickers.map((t) => [t.symbol.split('-USDT')[0], Number(t.lastPrice)])),
    [bingxSpotTickers],
  );

  const bingxFuturesMap = useMemo(
    () => new Map<string, number>(bingxFuturesTickers.map((t) => [t.symbol.split('-USDT')[0], Number(t.lastPrice)])),
    [bingxFuturesTickers],
  );

  const mexcSpotMap = useMemo(
    () => new Map<string, number>(mexcSpotTickers.map((t) => [t.symbol.split('USDT')[0], Number(t.lastPrice)])),
    [mexcSpotTickers],
  );

  const mexcFuturesMap = useMemo(
    () => new Map<string, number>(mexcTickers.map((t) => [t.symbol.split('_USDT')[0], Number(t.lastPrice)])),
    [mexcTickers],
  );

  const allTickers = useMemo(
    () =>
      new Set<string>(
        [
          ...bitstampTickers.map((t) => t.pair.split('/USD-PERP')[0]),
          ...bingxFuturesTickers.map((t) => t.symbol.split('-USDT')[0]),
          ...gateSpotTickers.map((t) => t.currency_pair.split('_USDT')[0]),
          ...gateFuturesTickers.map((t) => t.contract.split('_USDT')[0]),
          ...htxTickers.map((t) => t.contract_code.split('-USDT')[0]),
          ...bybitSpotTickers.map((t) => t.symbol.split('USDT')[0]),
          ...bybitFuturesTickers.map((t) => t.symbol.split('USDT')[0]),
          ...binanceSpotTickers.map((t) => t.symbol.split('USDT')[0]),
          ...binanceFuturesTickers.map((t) => t.symbol.split('USDT')[0]),
          ...mexcSpotTickers.map((t) => t.symbol.split('USDT')[0]),
          ...mexcTickers.map((t) => t.symbol.split('_USDT')[0]),
          ...bitgetTickers.map((t) => t.symbol.split('USDT')[0]),
          ...kukoinTickers.map((t) => t.symbol.split('-USDT')[0]),
        ].filter((ticker) => !ticker.includes('-')),
      ),
    [bitstampTickers, mexcTickers],
  );

  const avgPrices = useMemo(
    () =>
      new Map<string, number>(
        Array.from(allTickers).map((ticker) => [
          ticker,
          avg(
            [
              bitgetFuturesMap.get(ticker),
              kukoinFuturesMap.get(ticker),

              bybitSpotsMap.get(ticker),
              bybitFuturesMap.get(ticker),

              binanceSpotMap.get(ticker),
              binanceFuturesMap.get(ticker),

              htxFuturesMap.get(ticker),
              bitstampMap.get(ticker),

              gateSpotMap.get(ticker),
              gateFuturesMap.get(ticker),

              bingxSpotMap.get(ticker),
              bingxFuturesMap.get(ticker),
              mexcSpotMap.get(ticker),
              mexcFuturesMap.get(ticker),
            ].filter(Boolean),
          ),
        ]),
      ),
    [allTickers],
  );

  const tickersDelta = useMemo(
    () =>
      new Map<string, number>(
        Array.from(allTickers).map((ticker) => [
          ticker,
          Math.max(
            Math.abs(bitgetFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(kukoinFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(bybitSpotsMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(bybitFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(binanceSpotMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(binanceFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(htxFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(bitstampMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(gateSpotMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(gateFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(bingxSpotMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(bingxFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),

            Math.abs(mexcSpotMap.get(ticker) / avgPrices.get(ticker) || 0),
            Math.abs(mexcFuturesMap.get(ticker) / avgPrices.get(ticker) || 0),
          ),
        ]),
      ),
    [avgPrices, allTickers],
  );

  const tickersCounts = useMemo(
    () =>
      new Map<string, number>(
        Array.from(allTickers).map((ticker) => [
          ticker,
          [
            bitgetFuturesMap.get(ticker),
            kukoinFuturesMap.get(ticker),

            bybitSpotsMap.get(ticker),
            bybitFuturesMap.get(ticker),

            binanceSpotMap.get(ticker),
            binanceFuturesMap.get(ticker),

            htxFuturesMap.get(ticker),
            bitstampMap.get(ticker),

            gateSpotMap.get(ticker),
            gateFuturesMap.get(ticker),

            bingxSpotMap.get(ticker),
            bingxFuturesMap.get(ticker),

            mexcSpotMap.get(ticker),
            mexcFuturesMap.get(ticker),
          ].filter(Boolean).length,
        ]),
      ),
    [avgPrices, allTickers],
  );

  return (
    <Table wrapperClassName="pt-2 h-120">
      {/*<TableHeader>*/}
      {/*  <TableRow>*/}
      {/*    <TableHead className="w-[200px] text-left" colSpan={4}>*/}
      {/*      Mexc Фьючерсы*/}
      {/*    </TableHead>*/}
      {/*  </TableRow>*/}
      {/*</TableHeader>*/}
      <TableHeader className="bg-[rgb(36,52,66)]">
        <TableRow>
          <TableHead>Тикер</TableHead>
          <TableHead>Средняя</TableHead>
          <TableHead>Дельта</TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['MEXC']} />
              Mexc Spot
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['MEXC']} />
              Mexc Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BINGX']} />
              Bingx Spot
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BINGX']} />
              Bingx Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['GATEIO']} />
              Gate Spot
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['GATEIO']} />
              Gate Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BYBIT']} />
              Bybit Spot
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BYBIT']} />
              Bybit Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BINANCE']} />
              Binance Spot
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BINANCE']} />
              Binance Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BITGET']} />
              Bitget Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['KUCOIN']} />
              Kukoin Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['HTX']} />
              HTX Futures
            </div>
          </TableHead>
          <TableHead>
            <div className="flex gap-1 items-center">
              <img className="h-3 rounded-full" src={exchangeImgMap['BITSTAMP']} />
              Bitstamp
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...allTickers]
          .filter((invoice) => tickersDelta.get(invoice) >= 1.05 && tickersCounts.get(invoice) >= 7)
          .sort((a, b) => {
            const counts = tickersCounts.get(b) - tickersCounts.get(a);
            if (counts) {
              return counts;
            }

            return tickersDelta.get(b) - tickersDelta.get(a);
          })
          .map((invoice, index) => (
            <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
              <TableCell>${invoice}</TableCell>
              <TableCell>{avgPrices.get(invoice)}</TableCell>
              <TableCell>{tickersDelta.get(invoice)?.toFixed(4)}</TableCell>
              <TableCell
              // className={
              //   mexcSpotMap.get(invoice) / avgPrices.get(invoice) > 1
              //     ? 'profitCell'
              //     : mexcSpotMap.get(invoice) / avgPrices.get(invoice) < 1
              //       ? 'lossCell'
              //       : ''
              // }
              >
                {mexcSpotMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  mexcFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : mexcFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {mexcFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
              // className={
              //   bingxSpotMap.get(invoice) / avgPrices.get(invoice) > 1
              //     ? 'profitCell'
              //     : bingxSpotMap.get(invoice) / avgPrices.get(invoice) < 1
              //       ? 'lossCell'
              //       : ''
              // }
              >
                {bingxSpotMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  bingxFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : bingxFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {bingxFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
              // className={
              //   gateSpotMap.get(invoice) / avgPrices.get(invoice) > 1
              //     ? 'profitCell'
              //     : gateSpotMap.get(invoice) / avgPrices.get(invoice) < 1
              //       ? 'lossCell'
              //       : ''
              // }
              >
                {gateSpotMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  gateFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : gateFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {gateFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
              // className={
              //   bybitSpotsMap.get(invoice) / avgPrices.get(invoice) > 1
              //     ? 'profitCell'
              //     : bybitSpotsMap.get(invoice) / avgPrices.get(invoice) < 1
              //       ? 'lossCell'
              //       : ''
              // }
              >
                {bybitSpotsMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  bybitFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : bybitFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {bybitFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
              // className={
              //   binanceSpotMap.get(invoice) / avgPrices.get(invoice) > 1
              //     ? 'profitCell'
              //     : binanceSpotMap.get(invoice) / avgPrices.get(invoice) < 1
              //       ? 'lossCell'
              //       : ''
              // }
              >
                {binanceSpotMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  binanceFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : binanceFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {binanceFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  bitgetFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : bitgetFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {bitgetFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  kukoinFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : kukoinFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {kukoinFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  htxFuturesMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : htxFuturesMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {htxFuturesMap.get(invoice) || '-'}
              </TableCell>
              <TableCell
                className={
                  bitstampMap.get(invoice) / avgPrices.get(invoice) > 1
                    ? 'profitCell'
                    : bitstampMap.get(invoice) / avgPrices.get(invoice) < 1
                      ? 'lossCell'
                      : ''
                }
              >
                {bitstampMap.get(invoice) || '-'}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
};
