import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { TradingService } from '../api/trading.service';
import { getTickerWithSuffix } from '../api/utils/tickers';

export interface Position {
  /** Уникальный ID позиции */
  id: string;
  /** Биржа */
  exchange: string;
  /** Токен/символ */
  token: string;
  /** Цена входа */
  entryPrice: number;
  /** Объем */
  volume: number;
  /** Реализованный PnL */
  pnl: number;
  /** Нереализованный PnL */
  unrealizedPnl: number;
}

interface PositionsWidgetProps {
  /** Тикер (например, BTC) */
  ticker: string;
  /** Левая биржа */
  leftExchange: string;
  /** Правая биржа */
  rightExchange: string;
}

export const PositionsWidget: React.FC<PositionsWidgetProps> = ({
  ticker,
  leftExchange,
  rightExchange,
}) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isTrading, setIsTrading] = useState(false);
  const tradingServiceRef = React.useRef<TradingService | null>(null);

  useEffect(() => {
    if (!tradingServiceRef.current) {
      tradingServiceRef.current = new TradingService();
    }
  }, []);

  // Запрос позиций по крону каждые 5 секунд
  useEffect(() => {
    if (!tradingServiceRef.current) {
      return;
    }

    // Проверяем, что метод getPositions существует
    if (typeof tradingServiceRef.current.getPositions !== 'function') {
      // eslint-disable-next-line no-console
      console.error('getPositions is not a function on TradingService');
      return;
    }

    const fetchPositions = async () => {
      const allPositions: Position[] = [];
      const exchanges = [leftExchange, rightExchange].filter(
        (ex) => ex && ['MEXC', 'OURBIT', 'KCEX', 'BYBIT'].includes(ex.toUpperCase()),
      );

      // eslint-disable-next-line no-console
      console.log('Fetching positions for exchanges:', exchanges, 'ticker:', ticker);

      for (const exchange of exchanges) {
        try {
          const keys = getExchangeApiKeys(exchange);
          const exchangeUpper = exchange.toUpperCase();
          const symbolWithSuffix = getTickerWithSuffix(exchange, ticker);

          // eslint-disable-next-line no-console
          console.log(`Processing ${exchangeUpper}, has authToken:`, !!keys.authToken);

          if (['MEXC', 'OURBIT', 'KCEX'].includes(exchangeUpper)) {
            if (!keys.authToken) {
              // eslint-disable-next-line no-console
              console.warn(`No authToken for ${exchangeUpper}, skipping`);
              continue; // Пропускаем если нет ключей
            }

            // eslint-disable-next-line no-console
            console.log(`Fetching positions from ${exchangeUpper} for symbol:`, symbolWithSuffix);

            const response = await tradingServiceRef.current!.getPositions({
              exchange,
              symbol: symbolWithSuffix,
              authToken: keys.authToken,
            });

            // eslint-disable-next-line no-console
            console.log(`${exchangeUpper} positions response:`, response);

            if (response.success && response.data && Array.isArray(response.data)) {
              // Парсим позиции из ответа
              for (const pos of response.data) {
                // Извлекаем базовый тикер из symbol (убираем суффикс _USDT, USDT, -USDT-SWAP)
                const posSymbol = pos.symbol || '';
                let baseTicker = posSymbol
                  .replace('_USDT', '')
                  .replace('USDT', '')
                  .replace('-USDT-SWAP', '')
                  .replace('-SWAP-USDT', '');

                // Если тикер не совпадает с выбранным, пропускаем
                if (baseTicker !== ticker) {
                  continue;
                }

                // Рассчитываем unrealized PnL на основе текущей цены и цены входа
                // Пока используем closeProfitLoss, если он есть, иначе 0
                const unrealizedPnl = parseFloat(pos.closeProfitLoss || '0');

                allPositions.push({
                  id: `${exchange}-${pos.positionId}`,
                  exchange,
                  token: baseTicker,
                  entryPrice: parseFloat(pos.openAvgPrice || pos.holdAvgPrice || pos.newOpenAvgPrice || '0'),
                  volume: parseFloat(pos.holdVol || '0'),
                  pnl: parseFloat(pos.realised || '0'),
                  unrealizedPnl,
                });
              }
            }
          } else if (exchangeUpper === 'BYBIT') {
            if (!keys.apiKey || !keys.secretKey) {
              // eslint-disable-next-line no-console
              console.warn(`No API keys for ${exchangeUpper}, skipping`);
              continue;
            }

            // eslint-disable-next-line no-console
            console.log(`Fetching positions from ${exchangeUpper} for symbol:`, symbolWithSuffix);

            const response = await tradingServiceRef.current!.getPositions({
              exchange,
              symbol: symbolWithSuffix,
              apiKey: keys.apiKey,
              secretKey: keys.secretKey,
            });

            // eslint-disable-next-line no-console
            console.log(`${exchangeUpper} positions response:`, response);

            // Bybit возвращает данные в формате { retCode, retMsg, result: { list: [...] } }
            if (response.retCode === 0 && response.result && Array.isArray(response.result.list)) {
              for (const pos of response.result.list) {
                // Извлекаем базовый тикер из symbol (убираем USDT)
                const posSymbol = pos.symbol || '';
                let baseTicker = posSymbol.replace('USDT', '');

                // Если тикер не совпадает с выбранным, пропускаем
                if (baseTicker !== ticker) {
                  continue;
                }

                // Пропускаем пустые позиции (size = "0" или side = "")
                if (!pos.size || parseFloat(pos.size) === 0 || !pos.side) {
                  continue;
                }

                allPositions.push({
                  id: `${exchange}-${posSymbol}-${pos.positionIdx || 0}`,
                  exchange,
                  token: baseTicker,
                  entryPrice: parseFloat(pos.avgPrice || '0'),
                  volume: parseFloat(pos.size || '0'),
                  pnl: parseFloat(pos.curRealisedPnl || pos.cumRealisedPnl || '0'),
                  unrealizedPnl: parseFloat(pos.unrealisedPnl || '0'),
                });
              }
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Ошибка при получении позиций с ${exchange}:`, error);
          // Показываем детали ошибки для отладки
          if (error instanceof Error) {
            // eslint-disable-next-line no-console
            console.error(`Error message: ${error.message}`);
          }
          // Не показываем toast для ошибок, чтобы не спамить
        }
      }

      // Фильтруем только по выбранному тикеру
      const filteredPositions = allPositions.filter((pos) => pos.token === ticker);
      setPositions(filteredPositions);
    };

    // Выполняем сразу при монтировании
    fetchPositions();

    // Устанавливаем интервал на 5 секунд
    const interval = setInterval(fetchPositions, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [ticker, leftExchange, rightExchange]);

  const getExchangeApiKeys = (exchange: string) => {
    const exchangeUpper = exchange.toUpperCase();
    switch (exchangeUpper) {
      case 'BYBIT':
        return {
          apiKey: localStorage.getItem('bybitApiKey'),
          secretKey: localStorage.getItem('bybitSecretKey'),
        };
      case 'BINANCE':
        return {
          apiKey: localStorage.getItem('binanceApiKey'),
          secretKey: localStorage.getItem('binanceSecretKey'),
        };
      case 'BITGET':
        return {
          apiKey: localStorage.getItem('bitgetApiKey'),
          secretKey: localStorage.getItem('bitgetSecretKey'),
          passphrase: localStorage.getItem('bitgetPhrase'),
        };
      case 'BITMART':
        return {
          apiKey: localStorage.getItem('bitmartApiKey'),
          secretKey: localStorage.getItem('bitmartSecretKey'),
          passphrase: localStorage.getItem('bitmartMemo'),
        };
      case 'GATE':
      case 'GATEIO':
        return {
          apiKey: localStorage.getItem('gateApiKey'),
          secretKey: localStorage.getItem('gateSecretKey'),
        };
      case 'KCEX':
        return {
          authToken: localStorage.getItem('kcexAuthToken'),
        };
      case 'OURBIT':
        return {
          authToken: localStorage.getItem('ourbitAuthToken'),
        };
      case 'MEXC':
        return {
          authToken: localStorage.getItem('mexcAuthToken') || localStorage.getItem('mexcUid'),
        };
      default:
        return {};
    }
  };

  const handleClosePosition = async (position: Position) => {
    if (!tradingServiceRef.current) {
      return;
    }

    const exchange = position.exchange;
    const exchangeUpper = exchange.toUpperCase();
    const symbolWithSuffix = getTickerWithSuffix(exchange, position.token);
    const keys: any = getExchangeApiKeys(exchange);
    const needsAuthToken = ['KCEX', 'OURBIT', 'MEXC'].includes(exchangeUpper);

    try {
      setIsTrading(true);

      if (needsAuthToken) {
        if (!keys.authToken) {
          toast.error(`Auth Token не найден для биржи ${exchange}`);
          return;
        }
      } else {
        if (!keys.apiKey || !keys.secretKey) {
          toast.error(`API ключи не найдены для биржи ${exchange}`);
          return;
        }
      }

      // TODO: Определить сторону закрытия на основе позиции
      const closeSide = 'SELL'; // Заглушка, будет определяться из данных позиции

      await tradingServiceRef.current.placeMarketOrder({
        exchange,
        symbol: symbolWithSuffix,
        side: closeSide,
        usdAmount: position.volume,
        apiKey: keys.apiKey,
        secretKey: keys.secretKey,
        passphrase: keys.passphrase,
        authToken: keys.authToken,
      });

      setPositions((prev) => prev.filter((p) => p.id !== position.id));
      toast.success(`Позиция ${position.token} на ${exchange} закрыта`);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Ошибка при закрытии позиции:', error);
      const err = error as { message?: string };
      toast.error(`Ошибка при закрытии позиции: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsTrading(false);
    }
  };

  const handleCloseAll = async () => {
    for (const pos of positions) {
      // eslint-disable-next-line no-await-in-loop
      await handleClosePosition(pos);
    }
  };
  return (
    <Card className="mt-2 flex-shrink-0 border-muted-foreground/20">
      <CardHeader className="py-2 px-3 flex items-center justify-between">
        <CardTitle className="text-xs font-semibold">Позиции</CardTitle>
        <Button
          variant="outline"
          size="xs"
          className="h-6 text-[10px]"
          onClick={handleCloseAll}
          disabled={isTrading || positions.length === 0}
        >
          Закрыть все
        </Button>
      </CardHeader>
      <div className="px-3 pb-3 overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="py-1 px-1">Биржа</TableHead>
              <TableHead className="py-1 px-1">Тикер</TableHead>
              <TableHead className="py-1 px-1 text-right">Ср. цена входа</TableHead>
              <TableHead className="py-1 px-1 text-right">Позиция</TableHead>
              <TableHead className="py-1 px-1 text-right">Маржа</TableHead>
              <TableHead className="py-1 px-1 text-right">Нереализованный PNL</TableHead>
              <TableHead className="py-1 px-1 text-right">Реализованный PNL</TableHead>
              <TableHead className="py-1 px-1 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-2 px-1 text-center text-[11px] text-muted-foreground"
                >
                  Позиции отсутствуют
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => {
                const margin = position.volume * position.entryPrice;
                const numberFormat2 = new Intl.NumberFormat('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const numberFormat4 = new Intl.NumberFormat('ru-RU', {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                });
                return (
                  <TableRow key={position.id}>
                    <TableCell className="py-1 px-1">{position.exchange}</TableCell>
                    <TableCell className="py-1 px-1">{position.token}</TableCell>
                    <TableCell className="py-1 px-1 text-right">
                      {numberFormat4.format(position.entryPrice)}
                    </TableCell>
                    <TableCell className="py-1 px-1 text-right">
                      {numberFormat2.format(margin)} USDT
                    </TableCell>
                    <TableCell className="py-1 px-1 text-right">
                      {numberFormat2.format(margin)} USDT
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-1 px-1 text-right',
                        position.unrealizedPnl > 0
                          ? 'text-green-500'
                          : position.unrealizedPnl < 0
                            ? 'text-red-500'
                            : '',
                      )}
                    >
                      {numberFormat4.format(position.unrealizedPnl)} USDT
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-1 px-1 text-right',
                        position.pnl > 0 ? 'text-green-500' : position.pnl < 0 ? 'text-red-500' : '',
                      )}
                    >
                      {numberFormat4.format(position.pnl)} USDT
                    </TableCell>
                  <TableCell className="py-1 px-1 text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-6 text-[10px]"
                      onClick={() => handleClosePosition(position)}
                      disabled={isTrading}
                    >
                      Закрыть
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

