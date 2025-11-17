import React, { useMemo, useState } from 'react';
import { useAppSelector } from './store';
import { moneyFormat, numberFormat } from './utils';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Card, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { useGetCTraderCashflowQuery, useGetCTraderDealsQuery } from './api/ctrader.api';
import { ChevronDownIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import type { DateRange } from 'react-day-picker/dist/cjs/types/shared';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { ForexLabel } from './TestPage/TestPage'; // Импорт ForexLabel из оригинального файла, предполагая, что он экспортирован
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './components/ui/chart'; // Предполагаем, что shadcn chart компоненты доступны
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { AppsTokenResponse } from './api/alor.slice';
import { useGetRuRateQuery } from './api/alor.api.ts';

export const CTraderHistory = () => {
  const { data: rateData } = useGetRuRateQuery();
  const USDRate = rateData?.Valute.USD.Value;
  const [searchParams, setSearchParams] = useSearchParams();

  const preset = searchParams.get('preset') || undefined;
  const setPreset = (preset: string) => {
    searchParams.set('preset', preset);
    setSearchParams(searchParams);
  };

  const setDateRange = (range: DateRange) => {
    searchParams.set('from', dayjs(range.from).format('YYYY-MM-DD'));
    searchParams.set('to', dayjs(range.to).format('YYYY-MM-DD'));
    searchParams.delete('preset');
    setSearchParams(searchParams);
  };

  const { from, to } = useMemo(() => {
    const from = dayjs(searchParams.get('from') || dayjs().startOf('month').format('YYYY-MM-DD')).toDate();
    const to = dayjs(searchParams.get('to') || dayjs().endOf('month').format('YYYY-MM-DD')).toDate();

    switch (preset) {
      case 'today':
        return {
          from: dayjs().startOf('day').toDate(),
          to: dayjs().endOf('day').toDate(),
        };
      case 'yesterday':
        return {
          from: dayjs().add(-1, 'day').startOf('day').toDate(),
          to: dayjs().add(-1, 'day').endOf('day').toDate(),
        };
      case 'week':
        return {
          from: dayjs().startOf('week').toDate(),
          to: dayjs().endOf('week').toDate(),
        };
      case 'month':
        return {
          from: dayjs().startOf('month').toDate(),
          to: dayjs().endOf('month').toDate(),
        };
      default:
        return { from, to };
    }
  }, [searchParams, preset]);

  const dateRange: DateRange = { from, to };

  const { cTraderAccount, cTraderSymbols, cTraderSummary } = useAppSelector((state) => state.alorSlice);
  const { accessToken } = useAppSelector((state) => state.alorSlice.cTraderAuth || ({} as AppsTokenResponse));

  const { data: deals = [] } = useGetCTraderDealsQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      from: from.getTime(),
      to: to.getTime(),
    },
    {
      pollingInterval: 15000,
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  const { data: ctraderCashflow = [] } = useGetCTraderCashflowQuery(
    {
      ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
      from: from.getTime(),
      to: to.getTime(),
    },
    {
      pollingInterval: 15000,
      skip: !accessToken || !cTraderAccount?.ctidTraderAccountId,
    },
  );

  const closesPositions = deals.filter((d) => Boolean(d.closePositionDetail));

  const ctraderDealsTotal = useMemo(() => {
    return closesPositions.reduce(
      (acc, invoice) =>
        acc + (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) / 10 ** invoice.closePositionDetail.moneyDigits,
      0,
    );
  }, [closesPositions]);

  const symbolPositionsMap = closesPositions.reduce((acc, invoice) => {
    if (!acc[invoice.symbolId]) {
      acc[invoice.symbolId] = 0;
    }

    acc[invoice.symbolId] +=
      (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) / 10 ** invoice.closePositionDetail.moneyDigits;

    return acc;
  }, {});

  const map = useMemo(() => new Map<number, any>(cTraderSymbols?.map((s) => [s.symbolId, s])), [cTraderSymbols]);

  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Данные для графика чистого дохода (кумулятивный PnL от закрытых позиций)
  const purePnLData = useMemo(() => {
    const sortedCloses = [...closesPositions].sort((a, b) => a.createTimestamp - b.createTimestamp);
    let cumulative = 0;
    return sortedCloses.map((item) => {
      const profit = (item.closePositionDetail.grossProfit + item.closePositionDetail.swap) / 10 ** item.closePositionDetail.moneyDigits;
      cumulative += profit;
      return {
        date: dayjs(item.createTimestamp).format('YYYY-MM-DD'),
        pnl: cumulative,
      };
    });
  }, [closesPositions]);

  // Данные для графика дохода с учетом пополнений/выводов (баланс со временем)
  const balanceData = useMemo(() => {
    const allEvents = [
      ...closesPositions.map((item) => ({
        timestamp: item.createTimestamp,
        type: 'pnl',
        amount: (item.closePositionDetail.grossProfit + item.closePositionDetail.swap) / 10 ** item.closePositionDetail.moneyDigits,
      })),
      ...ctraderCashflow.map((item) => ({
        timestamp: item.changeBalanceTimestamp,
        type: item.operationType === 0 ? 'deposit' : 'withdrawal',
        amount: item.delta / 10 ** item.moneyDigits,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    let cumulative = 0;
    return allEvents.map((event) => {
      cumulative += event.type === 'withdrawal' ? -event.amount : event.amount;
      return {
        date: dayjs(event.timestamp).format('YYYY-MM-DD'),
        balance: cumulative,
      };
    });
  }, [closesPositions, ctraderCashflow]);

  const chartConfig: ChartConfig = {
    pnl: {
      label: 'PnL',
      color: 'hsl(var(--chart-1))',
    },
    balance: {
      label: 'Balance',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <div className="p-4">
      {/* Хедер */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">CTrader History</h1>
        <div className="flex gap-2">
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Не выбрано" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="yesterday">Вчера</SelectItem>
              <SelectItem value="week">Текущая неделя</SelectItem>
              <SelectItem value="month">Текущий месяц</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger>
              <Button variant="outline" className="justify-between font-normal">
                {dateRange ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 'Select date'}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={dateRange}
                captionLayout="dropdown"
                onSelect={setDateRange}
                className="rounded-lg border shadow-sm"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* График чистого дохода */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Чистый доход</CardTitle>
        </CardHeader>
        <ChartContainer config={chartConfig}>
          <LineChart data={purePnLData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="pnl" stroke={chartConfig.pnl.color} />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* График дохода с учетом пополнений и вывода */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Доход с учетом пополнений и вывода</CardTitle>
        </CardHeader>
        <ChartContainer config={chartConfig}>
          <LineChart data={balanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="balance" stroke={chartConfig.balance.color} />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Карточки с группировкой PnL по символам */}
      <div>
        <h2 className="text-xl font-semibold mb-2">PnL по инструментам</h2>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(symbolPositionsMap).map(([symbolId, value]) => (
            <Card key={symbolId}>
              <CardHeader>
                <CardDescription>
                  <ForexLabel ticker={map.get(Number(symbolId))?.symbolName} />
                </CardDescription>
                <CardTitle className={cn(value > 0 ? 'profitCell' : value < 0 ? 'lossCell' : '', 'text-2xl font-semibold tabular-nums')}>
                  {moneyFormat(value as number, 'USDT', 0, 2)}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Таблица ввода/вывода с селектором */}
      <div className="mb-4">
        <Table wrapperClassName="pt-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] text-left" colSpan={11}>
                Ctrader История позиций
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableHeader className="bg-[rgb(36,52,66)]">
            <TableRow>
              <TableHead className="w-[100px]">Инструмент</TableHead>
              <TableHead className="w-[100px]">Направление</TableHead>
              <TableHead className="w-[100px]">Время закрытия</TableHead>
              <TableHead className="w-[200px]">Цена входа</TableHead>
              <TableHead className="w-[200px]">Цена закрытия</TableHead>
              <TableHead className="w-[200px]">Лоты</TableHead>
              <TableHead className="w-[100px] text-right">Свопы</TableHead>
              <TableHead className="text-right">Валовая прибыль</TableHead>
              <TableHead className="text-right">Чистая прибыль</TableHead>
              <TableHead className="text-right">Чистая прибыль RUB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closesPositions.map((invoice, index) => (
              <TableRow key={invoice.invoice} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                <TableCell>
                  <ForexLabel ticker={map.get(invoice.symbolId)?.symbolName} />
                </TableCell>
                <TableCell>{invoice.tradeSide === 1 ? 'Продажа' : 'Покупка'}</TableCell>
                <TableCell>{dayjs(invoice.createTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>
                {/*<TableCell>{dayjs(invoice.utcLastUpdateTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>*/}
                <TableCell>{moneyFormat(invoice.closePositionDetail.entryPrice, 'USDT', 0, 2)}</TableCell>
                <TableCell>{moneyFormat(invoice.executionPrice, 'USDT', 0, 2)}</TableCell>
                <TableCell>
                  {numberFormat(invoice.volume / (map.get(invoice.symbolId)?.symbolName?.endsWith('CNH_xp') ? 10000000 : 10000), 2, 2)}
                </TableCell>
                <TableCell
                  className={
                    invoice.closePositionDetail.swap > 0
                      ? 'text-right profitCell'
                      : invoice.closePositionDetail.swap < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(invoice.closePositionDetail.swap / 10 ** invoice.closePositionDetail.moneyDigits, 'USDT', 0, 2)}
                </TableCell>
                <TableCell
                  className={
                    invoice.closePositionDetail.grossProfit > 0
                      ? 'text-right profitCell'
                      : invoice.closePositionDetail.grossProfit < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(invoice.closePositionDetail.grossProfit / 10 ** invoice.closePositionDetail.moneyDigits, 'USDT', 0, 2)}
                </TableCell>
                <TableCell
                  className={
                    invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap > 0
                      ? 'text-right profitCell'
                      : invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(
                    (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap) /
                      10 ** invoice.closePositionDetail.moneyDigits,
                    'USDT',
                    0,
                    2,
                  )}
                </TableCell>
                <TableCell
                  className={
                    invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap > 0
                      ? 'text-right profitCell'
                      : invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap < 0
                        ? 'text-right lossCell'
                        : 'text-right'
                  }
                >
                  {moneyFormat(
                    (USDRate * (invoice.closePositionDetail.grossProfit + invoice.closePositionDetail.swap)) /
                      10 ** invoice.closePositionDetail.moneyDigits,
                    'RUB',
                    0,
                    2,
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                colSpan={10}
                className={ctraderDealsTotal > 0 ? 'text-right profitCell' : ctraderDealsTotal < 0 ? 'text-right lossCell' : 'text-right'}
              >
                Реализовано: {moneyFormat(ctraderDealsTotal, 'USDT', 0, 2)} ({moneyFormat(USDRate * ctraderDealsTotal, 'RUB')})
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Таблица ввода/вывода с селектором */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Таблица ввода/вывода</h2>
          <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'deposit' | 'withdrawal')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Фильтр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="deposit">Пополнения</SelectItem>
              <SelectItem value="withdrawal">Снятия</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Время</TableHead>
              <TableHead className="w-[100px]">Тип</TableHead>
              <TableHead className="w-[100px]">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ctraderCashflow.map((invoice, index) => (
              <TableRow key={invoice.balanceHistoryId} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                <TableCell>{dayjs(invoice.changeBalanceTimestamp).format('DD-MM-YYYY HH:mm')}</TableCell>
                <TableCell>{invoice.operationType === 0 ? 'Пополнение счета' : 'Снятие со счета'}</TableCell>
                <TableCell className={invoice.operationType === 0 ? 'profitCell' : 'lossCell'}>
                  {invoice.delta / 10 ** invoice.moneyDigits}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
