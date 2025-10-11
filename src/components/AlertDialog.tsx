import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Form as UIForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from 'antd';
import { Button } from './ui/button';
import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addAlert, clearAlertDialog, deleteAlert } from '../api/alerts.slice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx';
import { SegmentedLabeledOption } from 'rc-segmented';
import { EditTickerConfig } from './EditTickerConfig.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.tsx';
import { Trash } from 'lucide-react';
import { deletePair } from '../api/alor.slice';
import { TypographyParagraph } from './ui/typography.tsx';
import { cn } from '../lib/utils';
import { AlorLabel, FigiLabel, ForexLabel } from '../TestPage.tsx';
import { useGetRuRateQuery } from '../api/alor.api';
import { moneyFormat, normalizePrice } from '../utils';

export const AlertDialog = () => {
  const alertConfig = useAppSelector((state) => state.alertsSlice.alertConfig);
  const alerts = useAppSelector((state) => state.alertsSlice.alerts || []);
  const filteredAlerts = alerts.filter((a) => a.ticker === alertConfig?.ticker);
  const { data: rateData } = useGetRuRateQuery();
  const USDRate = rateData?.Valute.USD.Value;

  const {
    filters,
    tinkoffAccounts,
    tinkoffPortfolio,
    tinkoffOrders,
    cTraderPositions,
    cTraderPositionPnL,
    cTraderAccount,
    cTraderSymbols,
    MEXCPositions,
  } = useAppSelector((state) => state.alorSlice);

  const map = useMemo(() => new Map<number, any>(cTraderSymbols?.map((s) => [s.symbolId, s])), [cTraderSymbols]);

  const alorPositions = useAppSelector((state) => state.alorSlice.alorPositions);

  const [pairs, setPairs] = useState(localStorage.getItem('pairs') ? JSON.parse(localStorage.getItem('pairs')) : []);

  const pnl = new Map<number, number>(
    (cTraderPositionPnL?.positionUnrealizedPnL || []).map((p) => [
      p.positionId,
      normalizePrice(parseInt(p.netUnrealizedPnL, 10), cTraderPositionPnL.moneyDigits),
    ]),
  );
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
      ...alorPositions.reduce((acc, curr) => {
        acc[curr.symbol] = curr.unrealisedPl || 0;
        return acc;
      }, {}),
    }),
    [tinkoffPortfolio?.positions, cTraderPositionsMapped, alorPositions],
  );

  const handleDeleteAlert = (data) => () => {
    dispatch(deleteAlert(data));
  };

  const dispatch = useAppDispatch();
  const FormSchema = z.object({
    ticker: z.string({
      error: 'Нужно выбрать тикер',
    }),
    price: z.number({
      error: 'Нужно выбрать цену',
    }),
    condition: z.enum(['lessThen', 'moreThen'], {
      error: 'Нужно выбрать условие',
    }),
    trigger: z.enum(['once', 'everyMinute'], {
      required_error: 'Нужно выбрать триггер',
    }),
    message: z.string().optional(),
  });

  useEffect(() => {
    if (!alertConfig) return;
    form.setValue('ticker', alertConfig.ticker);
    form.setValue('price', alertConfig.price);
  }, [alertConfig]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  function onSubmit(data: z.infer<typeof FormSchema>) {
    dispatch(addAlert(data));
    form.reset();
    handleClose();
  }

  const handleClose = () => {
    dispatch(clearAlertDialog());
  };

  const handleSendTestMessage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const values = form.getValues();

    const body = {
      chat_id: localStorage.getItem('telegramUserId'),
      text: values.message || `${values.ticker} Цена больше чем ${values.price}`,
    };

    fetch(`https://api.telegram.org/bot${localStorage.getItem('telegramToken')}/sendMessage`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const SymbolComp = ({ invoice }: { invoice: string }) => {
    if (Number.isInteger(invoice)) return <ForexLabel ticker={map.get(invoice)?.symbolName} />;
    if (invoice.includes('.') || invoice === 'RUB') return <AlorLabel symbol={invoice} />;

    return <FigiLabel uid={invoice} />;
  };

  const PairPnl = (pair) => {
    return pair.reduce((acc, curr) => acc + PnLMap[curr] || 0, 0);
  };
  const alorSymbolPositionMap = useMemo(
    () =>
      (alorPositions || []).reduce((acc, curr) => {
        acc[curr.symbol] = curr;

        return acc;
      }, {}),
    [alorPositions],
  );

  const tinkoffInstrumentUidPositionMap = useMemo(
    () =>
      (tinkoffPortfolio?.positions || []).reduce((acc, curr) => {
        acc[curr.instrumentUid] = curr;

        return acc;
      }, {}),
    [tinkoffPortfolio?.positions],
  );

  const [tab, setTab] = useState<string>('ticker');

  const options: SegmentedLabeledOption[] = [
    {
      label: 'Тикер',
      value: 'ticker',
    },
    {
      label: 'Оповещения',
      value: 'notifications',
    },
    {
      label: 'Позиции',
      value: 'positions',
    },
  ];

  return (
    <Dialog open={Boolean(alertConfig)}>
      <DialogContent onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Настройки тикера</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ margin: '4px 6px' }}>
            {options.map((o) => (
              <TabsTrigger value={o.value.toString()}>{o.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="ticker" className="p-3">
            <EditTickerConfig ticker={alertConfig?.ticker} />
            <Button variant="destructive" className="w-full mt-3" onClick={() => dispatch(deletePair({ ticker: alertConfig.ticker }))}>
              Удалить
            </Button>
          </TabsContent>
          <TabsContent value="positions" className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Инструмент</TableHead>
                  <TableHead className="text-right">Чистая прибыль RUB</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs
                  .filter((p) =>
                    p.some((symbol) =>
                      alertConfig?.ticker
                        .toUpperCase()
                        .split('/')
                        .includes(map.get(symbol)?.symbolName || symbol),
                    ),
                  )
                  .map((invoice, index) => (
                    <TableRow key={invoice.invoice} className={index % 2 ? 'rowOdd' : 'rowEven'}>
                      <TableCell className="flex gap-2">
                        {invoice.map((p) => (
                          <SymbolComp invoice={p} />
                        ))}
                      </TableCell>
                      <TableCell
                        className={
                          PairPnl(invoice) > 0 ? 'text-right profitCell' : PairPnl(invoice) < 0 ? 'text-right lossCell' : 'text-right'
                        }
                      >
                        {moneyFormat(PairPnl(invoice))}
                      </TableCell>
                      <TableCell className="text-right gap-2 flex justify-end">
                        {invoice.some(
                          (i) => !tinkoffInstrumentUidPositionMap[i] || !cTraderPositionsMapped[i] || !alorSymbolPositionMap[i],
                        ) && (
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
                                    <SymbolComp invoice={p} />
                                    <div className="flex gap-2">
                                      {/*<Input*/}
                                      {/*  size="xs"*/}
                                      {/*  type="number"*/}
                                      {/*  onChange={handleOnChangeTickerQty(p)}*/}
                                      {/*  value={qtyMap[p] || 0}*/}
                                      {/*  step={0.01}*/}
                                      {/*/>*/}
                                      {/*/!*<Button*!/*/}
                                      {/*/!*  size="xs"*!/*/}
                                      {/*/!*  variant="success"*!/*/}
                                      {/*/!*  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}*!/*/}
                                      {/*/!*  onClick={*!/*/}
                                      {/*/!*    !Number.isInteger(p) ? handleTPostOrderClick(p, 'buy') : handleCTraderPostOrderClick(p, 'buy')*!/*/}
                                      {/*/!*  }*!/*/}
                                      {/*/!*>*!/*/}
                                      {/*/!*  Купить*!/*/}
                                      {/*/!*</Button>*!/*/}
                                      {/*/!*<Button*!/*/}
                                      {/*/!*  size="xs"*!/*/}
                                      {/*/!*  variant="destructive"*!/*/}
                                      {/*/!*  disabled={!Number.isInteger(p) ? tPostOrderLoading : ctraderPostOrderLoading}*!/*/}
                                      {/*/!*  onClick={*!/*/}
                                      {/*/!*    !Number.isInteger(p) ? handleTPostOrderClick(p, 'sell') : handleCTraderPostOrderClick(p, 'sell')*!/*/}
                                      {/*/!*  }*!/*/}
                                      {/*/!*>*!/*/}
                                      {/*/!*  Продать*!/*/}
                                      {/*/!*</Button>*!/*/}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {invoice.some(
                          (i) => tinkoffInstrumentUidPositionMap[i] || cTraderPositionsMapped[i] || alorSymbolPositionMap[i],
                        ) && (
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
                                          {invoice.map((p) => (
                                            <SymbolComp invoice={p} />
                                          ))}
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
                                  // onClick={handleClosePositionClick(invoice)}
                                  // disabled={tClosePositionLoading}
                                  variant="destructive"
                                >
                                  Закрыть
                                </Button>
                              </DialogClose>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="notifications">
            <Table className="mb-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Тикер</TableHead>
                  <TableHead>Условие</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead className="text-right">Триггер</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((invoice, index) => (
                  <TableRow className={index % 2 ? 'rowOdd' : 'rowEven'}>
                    <TableCell>{invoice.ticker}</TableCell>
                    <TableCell>{invoice.condition === 'lessThen' ? 'Меньше' : 'Больше'} чем</TableCell>
                    <TableCell>{invoice.price.toFixed(5)}</TableCell>
                    <TableCell className="text-right">{invoice.trigger === 'once' ? 'Один раз' : 'Раз в минуту'}</TableCell>
                    <TableCell className="text-right">
                      {/*<Button size="sm" variant="ghost" className="p-0 h-4 w-4">*/}
                      {/*  <Pencil />*/}
                      {/*</Button>*/}

                      <Button size="sm" variant="ghost" className="p-0 h-4 w-4" onClick={handleDeleteAlert(invoice)}>
                        <Trash />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <UIForm {...form}>
              <form onSubmit={form.handleSubmit((d) => onSubmit(d))} className="p-3 pt-0 flex gap-3 flex-col">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Условие</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col">
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <RadioGroupItem value="lessThen" />
                            </FormControl>
                            <FormLabel className="font-normal">Меньше чем</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <RadioGroupItem value="moreThen" />
                            </FormControl>
                            <FormLabel className="font-normal">Больше чем</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Цена</FormLabel>
                      <FormControl>
                        <Input type="number" step={0.00001} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trigger"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Триггер</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col">
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <RadioGroupItem value="once" />
                            </FormControl>
                            <FormLabel className="font-normal">Один раз</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <RadioGroupItem value="everyMinute" />
                            </FormControl>
                            <FormLabel className="font-normal">Раз в минуту</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Сообщение</FormLabel>
                      <FormControl>
                        <Input onChange={(e) => field.onChange(e.target.value)} value={field.value} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Добавить</Button>
                <Button variant="secondary" onClick={handleSendTestMessage}>
                  Тест
                </Button>
              </form>
            </UIForm>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
