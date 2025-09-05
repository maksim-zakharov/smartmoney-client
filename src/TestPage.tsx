import React, { useMemo, useState } from 'react';
import { Col, Row } from 'antd';
import { useAppSelector } from './store';
import { moneyFormat, numberFormat } from './MainPage/MainPage';
import { normalizePrice } from './utils';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/ui/table';
import { cn } from './lib/utils';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { TWChart } from './components/TWChart';
import { useClosePositionMutation, useGetInstrumentByIdQuery, useTinkoffPostOrderMutation } from './api/tinkoff.api';
import { useCTraderclosePositionMutation, useCTraderPlaceOrderMutation } from './api/ctrader.api';
import { Button } from './components/ui/button.tsx';
import { CirclePlus, CircleX } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog.tsx';
import { Checkbox } from './components/ui/checkbox.tsx';
import { useGetMEXCContractQuery } from './api/mexc.api.ts';
import { TypographyParagraph } from './components/ui/typography.tsx';
import { toast } from 'sonner';
import { Input } from './components/ui/input.tsx';

const FigiLabel = ({ uid }) => {
  const { data } = useGetInstrumentByIdQuery({ uid });

  return (
    <div className="flex gap-1">
      <div
        className="img"
        style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${data?.brand.logoName.replace('.png', '')}x160.png")` }}
      ></div>
      {data?.ticker}
    </div>
  );
};

const MEXCLabel = ({ symbol }) => {
  const { data } = useGetMEXCContractQuery({ symbol });

  return (
    <div className="flex gap-1">
      <div className="img" style={{ backgroundImage: `url("${data?.baseCoinIconUrl}")` }}></div>
      {data?.symbol}
    </div>
  );
};

const ForexLabel = ({ ticker }) => {
  const map = {
    XAUUSD_xp: 'GoldFut2',
    XAGUSD_xp: 'SilverFut',
    XPDUSD_xp: 'Palladium',
    XPTUSD_xp: 'Platinum',
    SPXUSD_xp: 's&p500',
    USDCNH_xp: 'USDCNY',
    EURUSD_xp: 'EURUSD3',
    CUCUSD_xp: 'Co',
  };

  return (
    <div className="flex gap-1">
      <div className="img" style={{ backgroundImage: `url("//invest-brands.cdn-tinkoff.ru/${map[ticker]}x160.png")` }}></div>
      {ticker}
    </div>
  );
};

export const TestPage = () => {
  const USDRate = 80.59;

  const [tPostOrderMutation, { isLoading: tPostOrderLoading }] = useTinkoffPostOrderMutation();
  const [ctraderPostOrderMutation, { isLoading: ctraderPostOrderLoading }] = useCTraderPlaceOrderMutation();

  const [tClosePositionMutation, { isLoading: tClosePositionLoading }] = useClosePositionMutation();
  const [ctraderClosePositionMutation, { isLoading: ctraderClosePositionLoading }] = useCTraderclosePositionMutation();

  const [qtyMap, setQtyMap] = useState(localStorage.getItem('qtyMap') ? JSON.parse(localStorage.getItem('qtyMap')) : {});

  const {
    tinkoffAccounts,
    tinkoffPortfolio,
    tinkoffOrders,
    cTraderPositions,
    cTraderPositionPnL,
    cTraderAccount,
    cTraderSymbols,
    MEXCPositions,
  } = useAppSelector((state) => state.alorSlice);

  const handleCTraderPostOrderClick = (symbolId: string, side: 'buy' | 'sell') => async () => {
    const lots = qtyMap[symbolId];
    if (!lots) return;

    await ctraderPostOrderMutation({
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      symbolId,
      side,
      lots,
    }).unwrap();
  };

  const handleTPostOrderClick = (instrumentUid: string, side: 'buy' | 'sell') => async () => {
    const quantity = qtyMap[instrumentUid];
    if (!quantity) return;

    await tPostOrderMutation({
      brokerAccountId: tinkoffPortfolio?.accountId,
      instrumentUid,
      side,
      quantity,
    }).unwrap();
  };

  const map = useMemo(() => new Map<number, any>(cTraderSymbols?.map((s) => [s.symbolId, s])), [cTraderSymbols]);

  const [selected, setSelected] = useState();

  const handleSelectForex = (symbol: string) => () => {
    setSelected(symbol);
  };

  const pnl = new Map<number, number>(
    (cTraderPositionPnL?.positionUnrealizedPnL || []).map((p) => [
      p.positionId,
      normalizePrice(parseInt(p.netUnrealizedPnL, 10), cTraderPositionPnL.moneyDigits),
    ]),
  );

  const instrumentTypeMap = {
    etf: 'Фонды',
    share: 'Акции',
    futures: 'Фьючерсы',
    currency: 'Валюты',
    bond: 'Облигации',
  };

  const bondsMargin = useMemo(
    () =>
      (tinkoffPortfolio?.positions || [])
        .filter((p) => ['bond', 'etf'].includes(p.instrumentType))
        .reduce((acc, cur) => acc + cur.quantity * cur.currentPrice, 0),
    [tinkoffPortfolio?.positions],
  );

  const PairPnl = (pair) => {
    return pair.reduce((acc, curr) => acc + PnLMap[curr] || 0, 0);
  };

  const totalPnL = useMemo(
    () =>
      (tinkoffPortfolio?.positions || [])
        .filter((p) => ['share', 'futures'].includes(p.instrumentType))
        .reduce((acc, cur) => acc + cur.expectedYield, 0),
    [tinkoffPortfolio?.positions],
  );

  const totalPnLForex = useMemo(
    () => (cTraderPositions?.position || []).reduce((acc, cur) => acc + pnl.get(cur.positionId), 0),
    [cTraderPositions?.position, pnl],
  );

  const amount = (tinkoffPortfolio?.totalAmountPortfolio || 0) - bondsMargin;

  const cTraderPositionsMapped = useMemo<any[]>(() => {
    const positionMap = (cTraderPositions?.position || []).reduce((acc, curr) => {
      if (!acc[curr.tradeData.symbolId]) {
        acc[curr.tradeData.symbolId] = { ...curr, PnL: pnl.get(curr.positionId), volume: curr.tradeData.volume };
      } else {
        acc[curr.tradeData.symbolId].PnL += pnl.get(curr.positionId);
        acc[curr.tradeData.symbolId].swap += curr.swap;
        acc[curr.tradeData.symbolId].volume += curr.tradeData.volume;
        acc[curr.tradeData.symbolId].usedMargin += curr.usedMargin;
      }

      return acc;
    }, {});

    return Object.entries(positionMap)
      .map(([key, value]) => value)
      .sort((a, b) => b.PnL - a.PnL);
  }, [cTraderPositions?.position, pnl]);

  const PnLMap = useMemo(
    () => ({
      ...(tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr.expectedYield;
        return acc;
      }, {}),
      ...cTraderPositionsMapped.reduce((acc, curr) => {
        acc[curr.tradeData.symbolId] = (curr.PnL || 0) * USDRate;
        return acc;
      }, {}),
    }),
    [tinkoffPortfolio?.positions, cTraderPositionsMapped],
  );

  const total = totalPnL + totalPnLForex * USDRate;

  const tinkoffPositionsMap = useMemo(
    () =>
      (tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        if (!acc[curr.instrumentType]) {
          acc[curr.instrumentType] = [];
        }
        acc[curr.instrumentType].push(curr);

        return acc;
      }, {}),
    [tinkoffPortfolio?.positions],
  );

  const tinkoffInstrumentUidPositionMap = useMemo(
    () =>
      (tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr;

        return acc;
      }, {}),
    [tinkoffPortfolio?.positions],
  );

  const [selectedTicker, setSelectedTicker] = useState([]);

  const [pairs, setPairs] = useState(localStorage.getItem('pairs') ? JSON.parse(localStorage.getItem('pairs')) : []);

  const handleDeletePair = (pair) => {
    setPairs(pairs.filter((p) => p !== pair));

    localStorage.setItem('pairs', JSON.stringify(pairs.filter((p) => p !== pair)));
  };

  const handleAddPair = () => {
    pairs.push(selectedTicker);
    setPairs(pairs);

    localStorage.setItem('pairs', JSON.stringify(pairs));

    setSelectedTicker([]);
  };

  const handleClosePositionClick = (tickers: string[]) => async (e) => {
    const ctraderTickers = tickers.filter((t) => Number.isInteger(t));
    await Promise.all(
      ctraderTickers.map((symbolId) =>
        ctraderClosePositionMutation({
          ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
          symbolId,
        }).unwrap(),
      ),
    );

    toast.success('Позиции в CTrader закрыты');

    const tiTickers = tickers.filter((t) => !Number.isInteger(t));
    await Promise.all(
      tiTickers.map((instrumentUid) =>
        tClosePositionMutation({
          brokerAccountId: tinkoffPortfolio?.accountId,
          instrumentUid,
        }).unwrap(),
      ),
    );

    toast.success('Позиции в Тинькофф закрыты');
  };

  const handleOnChangeTickerQty = (ticker: string) => (e) => {
    const qty = Number(e.target.value);

    setQtyMap((prevState) => ({ ...prevState, [ticker]: qty }));

    localStorage.setItem('qtyMap', JSON.stringify({ ...qtyMap, [ticker]: qty }));
  };

  const totalPositions = useMemo(() => {
    const tiPos = [...(tinkoffPortfolio?.positions || [])];
    tiPos.push(
      ...cTraderPositionsMapped.map((t) => ({
        ...t,
        instrumentType: 'forex',
      })),
    );

    return tiPos;
  }, [tinkoffPortfolio?.positions, cTraderPositionsMapped]);

  return (
    <>
      <Row gutter={[8, 8]}>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Портфель {tinkoffPortfolio?.accountId}</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  amount > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(amount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (акции)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalPnL > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalPnL)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (forex)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  totalPnLForex > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(totalPnLForex, 'USD')}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <CardHeader>
              <CardDescription>Текущий финрез (общий)</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                  total > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
                )}
              >
                {moneyFormat(total)}
              </CardTitle>
            </CardHeader>
          </Card>
        </Col>
      </Row>
      <div className="grid grid-cols-3 gap-2 flex-wrap">
        <Table wrapperClassName="pt-2 min-w-[470px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-center" colSpan={6}>
                Арбитражные пары
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead className="text-right">Чистая прибыль RUB</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map((invoice, index) => (
              <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
                <TableCell className="flex gap-2">
                  {invoice.map((p) => (Number.isInteger(p) ? <ForexLabel ticker={map.get(p)?.symbolName} /> : <FigiLabel uid={p} />))}
                </TableCell>
                <TableCell
                  className={PairPnl(invoice) > 0 ? 'text-right profitCell' : PairPnl(invoice) < 0 ? 'text-right lossCell' : 'text-right'}
                >
                  {moneyFormat(PairPnl(invoice))}
                </TableCell>
                <TableCell className="text-right gap-2 flex justify-end">
                  {invoice.some((i) => !tinkoffInstrumentUidPositionMap[i] || !cTraderPositionsMapped[i]) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="xs" variant="success">
                          Открыть
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md gap-0">
                        <DialogHeader>
                          <DialogTitle>Открытие позиции</DialogTitle>
                        </DialogHeader>
                        <div className="p-3 gap-2 flex flex-col">
                          <TypographyParagraph>Выберите объем для позиций</TypographyParagraph>
                          {invoice.map((p) => (
                            <div className="flex items-center justify-between gap-2">
                              {Number.isInteger(p) ? <ForexLabel ticker={map.get(p)?.symbolName} /> : <FigiLabel uid={p} />}
                              <div className="flex gap-2">
                                <Input size="xs" type="number" onChange={handleOnChangeTickerQty(p)} value={qtyMap[p] || 0} step={0.01} />
                                <Button
                                  size="xs"
                                  variant="success"
                                  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}
                                  onClick={!Number.isInteger(p) ? handleTPostOrderClick(p, 'buy') : handleCTraderPostOrderClick(p, 'buy')}
                                >
                                  Купить
                                </Button>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}
                                  onClick={!Number.isInteger(p) ? handleTPostOrderClick(p, 'sell') : handleCTraderPostOrderClick(p, 'sell')}
                                >
                                  Продать
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {invoice.some((i) => tinkoffInstrumentUidPositionMap[i] || cTraderPositionsMapped[i]) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="xs" variant="destructive">
                          Закрыть
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md gap-0">
                        <DialogHeader>
                          <DialogTitle>Закрытие позиции</DialogTitle>
                        </DialogHeader>
                        <div className="p-3 gap-2 flex flex-col">
                          <TypographyParagraph>Вы уверены что хотите закрыть позицию?</TypographyParagraph>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Инструмент</TableHead>
                                <TableHead className="text-right">Доход</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[invoice].map((invoice, index) => (
                                <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                                  <TableCell className="flex gap-2">
                                    {invoice.map((p) =>
                                      Number.isInteger(p) ? <ForexLabel ticker={map.get(p)?.symbolName} /> : <FigiLabel uid={p} />,
                                    )}
                                  </TableCell>
                                  <TableCell
                                    className={
                                      PairPnl(invoice) > 0
                                        ? 'text-right profitCell'
                                        : PairPnl(invoice) < 0
                                          ? 'text-right lossCell'
                                          : 'text-right'
                                    }
                                  >
                                    {moneyFormat(PairPnl(invoice))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <DialogClose asChild>
                          <Button
                            className="m-2"
                            onClick={handleClosePositionClick(invoice)}
                            disabled={tClosePositionLoading}
                            variant="destructive"
                          >
                            Закрыть
                          </Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDeletePair(invoice)} className="p-0 h-5 w-5">
                    <CircleX />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <CirclePlus /> Добавить пару для сравнения
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md gap-0">
                    <DialogHeader>
                      <DialogTitle>Добавление пары для сравнения</DialogTitle>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Инструмент</TableHead>
                          <TableHead className="text-right">Доход</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...(tinkoffPortfolio?.positions || []), ...cTraderPositionsMapped].map((invoice, index) => (
                          <TableRow className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                            <TableCell className="flex gap-2">
                              <Checkbox
                                checked={selectedTicker.includes(invoice.instrumentUid || invoice.tradeData.symbolId)}
                                className="flex"
                                onCheckedChange={(checked) =>
                                  checked
                                    ? setSelectedTicker((prevState) => [...prevState, invoice.instrumentUid || invoice.tradeData.symbolId])
                                    : setSelectedTicker((prevState) =>
                                        prevState.filter((p) => p !== (invoice.instrumentUid || invoice.tradeData.symbolId)),
                                      )
                                }
                              />
                              {invoice.instrumentUid && <FigiLabel uid={invoice.instrumentUid} />}
                              {invoice.tradeData?.symbolId && <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />}
                            </TableCell>
                            <TableCell
                              className={
                                (invoice.expectedYield || invoice.PnL) > 0
                                  ? 'text-right profitCell'
                                  : (invoice.expectedYield || invoice.PnL) < 0
                                    ? 'text-right lossCell'
                                    : 'text-right'
                              }
                            >
                              {moneyFormat(invoice.expectedYield || invoice.PnL || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button className="m-2" disabled={selectedTicker.length < 2} onClick={handleAddPair}>
                      Добавить
                    </Button>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <Table wrapperClassName="pt-2 col-span-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-left" colSpan={10}>
                Портфель
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableHeader className="bg-[rgb(36,52,66)]">
            <TableRow>
              <TableHead className="w-[200px]">Инструмент</TableHead>
              <TableHead className="w-[200px]">Тип</TableHead>
              <TableHead className="w-[200px]">Брокер</TableHead>
              <TableHead>Лотов</TableHead>
              <TableHead>Маржа</TableHead>
              {/*<TableHead>Количество</TableHead>*/}
              <TableHead>Средняя цена позиции</TableHead>
              <TableHead>Текущая цена</TableHead>
              <TableHead className="text-right">Свопы</TableHead>
              <TableHead className="text-right">Вариационка</TableHead>
              <TableHead className="text-right">Доход</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalPositions.map((invoice, index) =>
              invoice.instrumentType === 'forex' ? (
                <TableRow
                  key={invoice.invoice}
                  className={index % 2 ? 'rowOdd' : 'rowEven'}
                  onClick={handleSelectForex(map.get(invoice.tradeData.symbolId)?.symbolName)}
                >
                  <TableCell>
                    <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />
                  </TableCell>
                  <TableCell>Форекс</TableCell>
                  <TableCell>XPBEE</TableCell>
                  <TableCell>{invoice.volume / 10000}</TableCell>
                  <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell
                    className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}
                  >
                    {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  {/*<TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
                  {/*  {moneyFormat(invoice.PnL, 'USD', 0, 2)}*/}
                  {/*</TableCell>*/}
                  <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>
                    {moneyFormat(invoice.PnL * USDRate, 'RUB', 0, 2)}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={invoice.invoice}
                  className={cn(index % 2 ? 'rowOdd' : 'rowEven', selected === instrumentTypeMap[invoice.instrumentType] && 'rowHover')}
                >
                  <TableCell>
                    <FigiLabel uid={invoice.instrumentUid} />
                  </TableCell>
                  <TableCell>{instrumentTypeMap[invoice.instrumentType]}</TableCell>
                  <TableCell>Тинькофф</TableCell>
                  <TableCell>{numberFormat(invoice.quantityLots)}</TableCell>
                  <TableCell>-</TableCell>
                  {/*<TableCell>{numberFormat(invoice.quantity)}</TableCell>*/}
                  <TableCell>{moneyFormat(invoice.averagePositionPrice, 'RUB', 0, 4)}</TableCell>
                  <TableCell>{invoice.currentPrice}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell
                    className={
                      invoice.varMargin > 0 ? 'text-right profitCell' : invoice.varMargin < 0 ? 'text-right lossCell' : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.varMargin)}
                  </TableCell>
                  <TableCell
                    className={
                      invoice.expectedYield > 0 ? 'text-right profitCell' : invoice.expectedYield < 0 ? 'text-right lossCell' : 'text-right'
                    }
                  >
                    {moneyFormat(invoice.expectedYield)}
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
        {/*<Table wrapperClassName="pt-2">*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px] text-center" colSpan={6}>*/}
        {/*        Forex*/}
        {/*      </TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableHeader className="bg-[rgb(36,52,66)]">*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px]">Инструмент</TableHead>*/}
        {/*      <TableHead>Лотов</TableHead>*/}
        {/*      <TableHead>Использованная маржа</TableHead>*/}
        {/*      <TableHead className="text-right">Своп</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль USDT</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль RUB</TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableBody>*/}
        {/*    {cTraderPositionsMapped.map((invoice, index) => (*/}
        {/*      <TableRow*/}
        {/*        key={invoice.invoice}*/}
        {/*        className={index % 2 ? 'rowOdd' : 'rowEven'}*/}
        {/*        onClick={handleSelectForex(map.get(invoice.tradeData.symbolId)?.symbolName)}*/}
        {/*      >*/}
        {/*        <TableCell>*/}
        {/*          <ForexLabel ticker={map.get(invoice.tradeData.symbolId)?.symbolName} />*/}
        {/*        </TableCell>*/}
        {/*        <TableCell>{invoice.volume / 10000}</TableCell>*/}
        {/*        <TableCell>{moneyFormat(normalizePrice(parseInt(invoice.usedMargin, 10), invoice.moneyDigits), 'USD', 0, 2)}</TableCell>*/}
        {/*        <TableCell className={invoice.swap > 0 ? 'text-right profitCell' : invoice.swap < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(normalizePrice(parseInt(invoice.swap, 10), invoice.moneyDigits), 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(invoice.PnL, 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell className={invoice.PnL > 0 ? 'text-right profitCell' : invoice.PnL < 0 ? 'text-right lossCell' : 'text-right'}>*/}
        {/*          {moneyFormat(invoice.PnL * USDRate, 'RUB', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*      </TableRow>*/}
        {/*    ))}*/}
        {/*  </TableBody>*/}
        {/*</Table>*/}
        {/*<Table wrapperClassName="pt-2">*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px] text-center" colSpan={6}>*/}
        {/*        MEXC*/}
        {/*      </TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableHeader>*/}
        {/*    <TableRow>*/}
        {/*      <TableHead className="w-[200px]">Инструмент</TableHead>*/}
        {/*      <TableHead>Лотов</TableHead>*/}
        {/*      <TableHead>Использованная маржа</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль USDT</TableHead>*/}
        {/*      <TableHead className="text-right">Чистая прибыль RUB</TableHead>*/}
        {/*    </TableRow>*/}
        {/*  </TableHeader>*/}
        {/*  <TableBody>*/}
        {/*    {(MEXCPositions || []).map((invoice, index) => (*/}
        {/*      <TableRow key={invoice.symbol} className={index % 2 ? 'rowOdd' : 'rowEven'}>*/}
        {/*        <TableCell>*/}
        {/*          <MEXCLabel symbol={invoice.symbol} />*/}
        {/*        </TableCell>*/}
        {/*        <TableCell>{invoice.holdVol}</TableCell>*/}
        {/*        <TableCell>{moneyFormat(invoice.marginRatio, 'USD', 0, 2)}</TableCell>*/}
        {/*        <TableCell*/}
        {/*          className={*/}
        {/*            invoice.profitRatio > 0 ? 'text-right profitCell' : invoice.profitRatio < 0 ? 'text-right lossCell' : 'text-right'*/}
        {/*          }*/}
        {/*        >*/}
        {/*          {moneyFormat(invoice.profitRatio, 'USD', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*        <TableCell*/}
        {/*          className={*/}
        {/*            invoice.profitRatio > 0 ? 'text-right profitCell' : invoice.profitRatio < 0 ? 'text-right lossCell' : 'text-right'*/}
        {/*          }*/}
        {/*        >*/}
        {/*          {moneyFormat(invoice.profitRatio * 80, 'RUB', 0, 2)}*/}
        {/*        </TableCell>*/}
        {/*      </TableRow>*/}
        {/*    ))}*/}
        {/*  </TableBody>*/}
        {/*</Table>*/}
      </div>
      {selected && <TWChart ticker={selected} height={400} multiple={1} small />}
    </>
  );
};
