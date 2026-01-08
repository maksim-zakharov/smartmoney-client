import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { TradingService } from '../api/trading.service';
import { getTickerWithSuffix } from '../api/utils/tickers';
import { exchangeImgMap } from '../utils';

export interface Position {
  /** Уникальный ID позиции */
  id: string;
  /** Биржа */
  exchange: string;
  /** Токен/символ */
  token: string;
  /** Направление сделки: 'Buy'/'Sell' или 'Long'/'Short' */
  side?: string;
  /** Тип маржи: 'Cross' или 'Isolated' */
  marginType?: string;
  /** Плечо */
  leverage?: number;
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
        (ex) => ex && ['MEXC', 'OURBIT', 'KCEX', 'BYBIT', 'BINANCE', 'BITMART', 'OKX'].includes(ex.toUpperCase()),
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

                // Определяем направление сделки на основе positionType
                // positionType: 1 = Long, 2 = Short (или наоборот, зависит от биржи)
                // Для MEXC/Ourbit/KCEX: positionType 1 = Long, 2 = Short
                const positionType = pos.positionType || pos.side;
                let side = '';
                if (positionType === 1 || positionType === '1') {
                  side = 'Long';
                } else if (positionType === 2 || positionType === '2' || positionType === 3 || positionType === '3') {
                  side = 'Short';
                }

                // Плечо
                const leverage = pos.leverage ? parseFloat(pos.leverage.toString()) : undefined;

                // Тип маржи: openType 1 = Isolated, 2 = Cross (для MEXC/Ourbit/KCEX)
                const openType = pos.openType || pos.openType;
                let marginType = '';
                if (openType === 1 || openType === '1') {
                  marginType = 'Isolated';
                } else if (openType === 2 || openType === '2') {
                  marginType = 'Cross';
                }

                allPositions.push({
                  id: `${exchange}-${pos.positionId}`,
                  exchange,
                  token: baseTicker,
                  side,
                  marginType,
                  leverage,
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

                // Преобразуем side из Bybit формата (Buy/Sell) в Long/Short
                let side = pos.side;
                if (side === 'Buy') {
                  side = 'Long';
                } else if (side === 'Sell') {
                  side = 'Short';
                }

                // Плечо
                const leverage = pos.leverage ? parseFloat(pos.leverage) : undefined;

                // Тип маржи для Bybit: tradeMode 0 = Cross, 1 = Isolated
                // Или можно использовать autoAddMargin: 0 = Cross, 1 = Isolated
                const tradeMode = pos.tradeMode;
                let marginType = '';
                if (tradeMode === 0 || tradeMode === '0') {
                  marginType = 'Cross';
                } else if (tradeMode === 1 || tradeMode === '1') {
                  marginType = 'Isolated';
                }

                allPositions.push({
                  id: `${exchange}-${posSymbol}-${pos.positionIdx || 0}`,
                  exchange,
                  token: baseTicker,
                  side,
                  marginType,
                  leverage,
                  entryPrice: parseFloat(pos.avgPrice || '0'),
                  volume: parseFloat(pos.size || '0'),
                  pnl: parseFloat(pos.curRealisedPnl || pos.cumRealisedPnl || '0'),
                  unrealizedPnl: parseFloat(pos.unrealisedPnl || '0'),
                });
              }
            }
          } else if (exchangeUpper === 'BINANCE') {
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

            // Binance возвращает массив позиций напрямую
            if (Array.isArray(response)) {
              for (const pos of response) {
                // Извлекаем базовый тикер из symbol (убираем USDT)
                const posSymbol = pos.symbol || '';
                let baseTicker = posSymbol.replace('USDT', '');

                // Если тикер не совпадает с выбранным, пропускаем
                if (baseTicker !== ticker) {
                  continue;
                }

                // Пропускаем пустые позиции (positionAmt = "0" или 0)
                const positionAmt = parseFloat(pos.positionAmt || '0');
                if (positionAmt === 0) {
                  continue;
                }

                // Определяем side на основе positionAmt и positionSide
                let side = '';
                if (pos.positionSide === 'LONG' || (positionAmt > 0 && pos.positionSide === 'BOTH')) {
                  side = 'Long';
                } else if (pos.positionSide === 'SHORT' || (positionAmt < 0 && pos.positionSide === 'BOTH')) {
                  side = 'Short';
                } else if (positionAmt > 0) {
                  side = 'Long';
                } else if (positionAmt < 0) {
                  side = 'Short';
                }

                // Binance не возвращает leverage в этом endpoint
                // marginType определяем по isolatedMargin
                const leverage = undefined;
                const marginType = pos.isolatedMargin && parseFloat(pos.isolatedMargin) > 0 ? 'Isolated' : 'Cross';

                allPositions.push({
                  id: `${exchange}-${posSymbol}-${pos.positionSide || 'BOTH'}`,
                  exchange,
                  token: baseTicker,
                  side,
                  marginType,
                  leverage,
                  entryPrice: parseFloat(pos.entryPrice || '0'),
                  volume: Math.abs(positionAmt), // Абсолютное значение для объема
                  pnl: 0, // Binance не возвращает реализованный PnL в этом endpoint
                  unrealizedPnl: parseFloat(pos.unRealizedProfit || '0'),
                });
              }
            }
          } else if (exchangeUpper === 'BITMART') {
            if (!keys.apiKey || !keys.secretKey || !keys.passphrase) {
              // eslint-disable-next-line no-console
              console.warn(`No API keys or passphrase for ${exchangeUpper}, skipping`);
              continue;
            }

            // eslint-disable-next-line no-console
            console.log(`Fetching positions from ${exchangeUpper} for symbol:`, symbolWithSuffix);

            const response = await tradingServiceRef.current!.getPositions({
              exchange,
              symbol: symbolWithSuffix,
              apiKey: keys.apiKey,
              secretKey: keys.secretKey,
              passphrase: keys.passphrase,
            });

            // eslint-disable-next-line no-console
            console.log(`${exchangeUpper} positions response:`, response);

            // Bitmart возвращает данные в формате { code, message, data: [...] }
            if (response.code === 1000 && Array.isArray(response.data)) {
              for (const pos of response.data) {
                // Извлекаем базовый тикер из symbol (убираем USDT)
                const posSymbol = pos.symbol || '';
                let baseTicker = posSymbol.replace('USDT', '');

                // Если тикер не совпадает с выбранным, пропускаем
                if (baseTicker !== ticker) {
                  continue;
                }

                // Пропускаем пустые позиции (position_amount = "0" или 0)
                const positionAmount = parseFloat(pos.position_amount || '0');
                if (positionAmount === 0) {
                  continue;
                }

                // Определяем side на основе position_side
                // position_side может быть "both", "long", "short"
                let side = '';
                if (pos.position_side === 'long' || pos.position_side === 'Long') {
                  side = 'Long';
                } else if (pos.position_side === 'short' || pos.position_side === 'Short') {
                  side = 'Short';
                } else if (pos.position_side === 'both' || pos.position_side === 'Both') {
                  // Если both, определяем по знаку position_amount
                  side = positionAmount > 0 ? 'Long' : 'Short';
                }

                // Плечо
                const leverage = pos.leverage ? parseFloat(pos.leverage.toString()) : undefined;

                // Тип маржи: open_type может быть "isolated" или "cross"
                const openType = pos.open_type || '';
                let marginType = '';
                if (openType === 'isolated' || openType === 'Isolated') {
                  marginType = 'Isolated';
                } else if (openType === 'cross' || openType === 'Cross') {
                  marginType = 'Cross';
                }

                // Используем entry_price или open_avg_price
                const entryPrice = parseFloat(pos.entry_price || pos.open_avg_price || '0');

                allPositions.push({
                  id: `${exchange}-${posSymbol}-${pos.position_side || 'both'}`,
                  exchange,
                  token: baseTicker,
                  side,
                  marginType,
                  leverage,
                  entryPrice,
                  volume: Math.abs(positionAmount), // Абсолютное значение для объема
                  pnl: parseFloat(pos.realized_value || '0'), // Реализованный PnL
                  unrealizedPnl: parseFloat(pos.unrealized_pnl || '0'), // Нереализованный PnL
                });
              }
            }
          } else if (exchangeUpper === 'OKX') {
            // eslint-disable-next-line no-console
            console.log(`OKX keys check: apiKey:`, !!keys.apiKey, 'secretKey:', !!keys.secretKey, 'passphrase:', !!keys.passphrase);
            if (!keys.apiKey || !keys.secretKey || !keys.passphrase) {
              // eslint-disable-next-line no-console
              console.warn(`No API keys or passphrase for ${exchangeUpper}, skipping. apiKey:`, !!keys.apiKey, 'secretKey:', !!keys.secretKey, 'passphrase:', !!keys.passphrase);
              continue;
            }

            // eslint-disable-next-line no-console
            console.log(`Fetching positions from ${exchangeUpper} for symbol:`, symbolWithSuffix);

            const response = await tradingServiceRef.current!.getPositions({
              exchange,
              symbol: symbolWithSuffix,
              apiKey: keys.apiKey,
              secretKey: keys.secretKey,
              passphrase: keys.passphrase,
            });

            // eslint-disable-next-line no-console
            console.log(`${exchangeUpper} positions response:`, response);

            // OKX возвращает данные в формате { code, msg, data: [...] }
            if (response.code === '0' && Array.isArray(response.data)) {
              for (const pos of response.data) {
                // Извлекаем базовый тикер из instId (формат: BTC-USDT, BTC-USDT-SWAP)
                const posSymbol = pos.instId || '';
                // Разделяем по дефису и берем первую часть (BTC из BTC-USDT)
                const parts = posSymbol.split('-');
                const baseTicker = parts[0] || '';

                // Если тикер не совпадает с выбранным, пропускаем
                if (baseTicker !== ticker) {
                  continue;
                }

                // Пропускаем пустые позиции (pos = "0" или 0)
                const positionSize = parseFloat(pos.pos || '0');
                if (positionSize === 0) {
                  continue;
                }

                // Определяем side на основе pos (положительное = Long, отрицательное = Short)
                let side = '';
                if (positionSize > 0) {
                  side = 'Long';
                } else if (positionSize < 0) {
                  side = 'Short';
                }

                // Плечо
                const leverage = pos.lever ? parseFloat(pos.lever.toString()) : undefined;

                // Тип маржи: mgnMode может быть "isolated" или "cross"
                const mgnMode = pos.mgnMode || '';
                let marginType = '';
                if (mgnMode === 'isolated' || mgnMode === 'Isolated') {
                  marginType = 'Isolated';
                } else if (mgnMode === 'cross' || mgnMode === 'Cross') {
                  marginType = 'Cross';
                }

                // Используем avgPx для цены входа
                const entryPrice = parseFloat(pos.avgPx || '0');

                // Объем позиции в базовой валюте (pos)
                // Для расчета позиции в USDT используем notionalUsd или pos * avgPx
                const positionValue = parseFloat(pos.notionalUsd || '0') || Math.abs(positionSize) * entryPrice;

                allPositions.push({
                  id: `${exchange}-${posSymbol}-${pos.posId || '0'}`,
                  exchange,
                  token: baseTicker,
                  side,
                  marginType,
                  leverage,
                  entryPrice,
                  volume: Math.abs(positionSize), // Объем в базовой валюте
                  pnl: parseFloat(pos.realizedPnl || pos.settledPnl || '0'), // Реализованный PnL
                  unrealizedPnl: parseFloat(pos.upl || '0'), // Нереализованный PnL (upl = unrealized profit and loss)
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
      case 'OKX':
        return {
          apiKey: localStorage.getItem('okxApiKey'),
          secretKey: localStorage.getItem('okxApiSecret'),
          passphrase: localStorage.getItem('okxApiPhrase'),
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
                  colSpan={7}
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
                const exchangeIcon = exchangeImgMap[position.exchange.toUpperCase()];
                return (
                  <TableRow key={position.id}>
                    <TableCell className="py-1 px-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {exchangeIcon && (
                            <img
                              src={exchangeIcon}
                              alt={position.exchange}
                              className="h-3.5 w-3.5 rounded-full"
                            />
                          )}
                          <span>
                            {position.exchange}:{position.token}
                          </span>
                        </div>
                        {(position.marginType || position.leverage) && (
                          <span
                            className={cn(
                              'text-[10px]',
                              position.side === 'Long' || position.side === 'Buy'
                                ? 'text-green-500'
                                : position.side === 'Short' || position.side === 'Sell'
                                  ? 'text-red-500'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {position.marginType}
                            {position.marginType && position.leverage && ' '}
                            {position.leverage && `${position.leverage.toFixed(2)}x`}
                          </span>
                        )}
                      </div>
                    </TableCell>
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

