import React, { ChangeEvent, useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { TradingService } from '../api/trading.service';
import { getTickerWithSuffix } from '../api/utils/tickers';

interface SelectedEnrichedLite {
  /** Тикер (например, BTC) */
  ticker: string;
  /** Левая биржа (дешевле/дороже) */
  left: {
    /** Биржа */
    exchange: string;
    /** Последняя цена */
    last: number;
  };
  /** Правая биржа (дороже/дешевле) */
  right: {
    /** Биржа */
    exchange: string;
    /** Последняя цена */
    last: number;
  };
}

interface TradingPanelWidgetProps {
  /** Флаг выполнения торговой операции */
  isTrading: boolean;
  /** Выбранный арбитраж (для цен и бирж) */
  selectedEnriched: SelectedEnrichedLite | null;
  /** Инстанс TradingService из родителя */
  tradingService: TradingService | null;
  /** Обновление флага isTrading в родителе */
  onSetIsTrading: (value: boolean) => void;
}

export const TradingPanelWidget: React.FC<TradingPanelWidgetProps> = ({
  isTrading,
  selectedEnriched,
  tradingService,
  onSetIsTrading,
}) => {
  const [tradingVolume, setTradingVolume] = useState<string>('100');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTradingVolume(event.target.value);
  };

  const handleClick = async () => {
    if (!tradingService || !selectedEnriched) {
      return;
    }

    const usdAmount = parseFloat(tradingVolume);
    if (Number.isNaN(usdAmount) || usdAmount <= 0) {
      toast.error('Введите корректный объем');
      return;
    }

    onSetIsTrading(true);

    try {
      const leftPrice = selectedEnriched.left.last;
      const rightPrice = selectedEnriched.right.last;

      const buyExchange =
        leftPrice < rightPrice ? selectedEnriched.left.exchange : selectedEnriched.right.exchange;
      const sellExchange =
        leftPrice < rightPrice ? selectedEnriched.right.exchange : selectedEnriched.left.exchange;

      const buySymbol = getTickerWithSuffix(buyExchange, selectedEnriched.ticker);
      const sellSymbol = getTickerWithSuffix(sellExchange, selectedEnriched.ticker);

      const getApiKeys = (exchange: string) => {
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
              authToken:
                localStorage.getItem('mexcAuthToken') || localStorage.getItem('mexcUid'),
            };
          default:
            return {};
        }
      };

      const buyKeys = getApiKeys(buyExchange);
      const sellKeys = getApiKeys(sellExchange);

      const buyExchangeUpper = buyExchange.toUpperCase();
      const sellExchangeUpper = sellExchange.toUpperCase();

      const needsAuthToken =
        ['KCEX', 'OURBIT', 'MEXC'].includes(buyExchangeUpper) ||
        ['KCEX', 'OURBIT', 'MEXC'].includes(sellExchangeUpper);

      if (needsAuthToken) {
        if (
          (buyExchangeUpper === 'KCEX' ||
            buyExchangeUpper === 'OURBIT' ||
            buyExchangeUpper === 'MEXC') &&
          !('authToken' in buyKeys && buyKeys.authToken)
        ) {
          toast.error(`Auth Token не найден для биржи ${buyExchange}`);
          return;
        }

        if (
          (sellExchangeUpper === 'KCEX' ||
            sellExchangeUpper === 'OURBIT' ||
            sellExchangeUpper === 'MEXC') &&
          !('authToken' in sellKeys && sellKeys.authToken)
        ) {
          toast.error(`Auth Token не найден для биржи ${sellExchange}`);
          return;
        }
      } else {
        const missingExchanges: string[] = [];
        if (!('apiKey' in buyKeys && buyKeys.apiKey) || !('secretKey' in buyKeys && buyKeys.secretKey)) {
          missingExchanges.push(buyExchange);
        }
        if (
          !('apiKey' in sellKeys && sellKeys.apiKey) ||
          !('secretKey' in sellKeys && sellKeys.secretKey)
        ) {
          if (!missingExchanges.includes(sellExchange)) {
            missingExchanges.push(sellExchange);
          }
        }

        if (missingExchanges.length > 0) {
          toast.error(`API ключи не найдены для бирж: ${missingExchanges.join(', ')}`);
          return;
        }
      }

      const result = await tradingService.placeArbitrageOrders({
        buyExchange,
        sellExchange,
        buySymbol,
        sellSymbol,
        usdAmount,
        // типы ключей зависят от биржи, поэтому используем опциональные поля
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buyApiKey: (buyKeys as any).apiKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buySecretKey: (buyKeys as any).secretKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buyPassphrase: (buyKeys as any).passphrase,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buyAuthToken: (buyKeys as any).authToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sellApiKey: (sellKeys as any).apiKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sellSecretKey: (sellKeys as any).secretKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sellPassphrase: (sellKeys as any).passphrase,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sellAuthToken: (sellKeys as any).authToken,
      });

      toast.success(
        `Ордера размещены! Buy: ${result.buy?.orderId || 'N/A'}, Sell: ${
          result.sell?.orderId || 'N/A'
        }`,
      );
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Ошибка при размещении ордеров:', error);
      const err = error as { message?: string };
      toast.error(`Ошибка: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      onSetIsTrading(false);
    }
  };

  return (
    <Card className="flex-shrink-0 border-muted-foreground/20 rounded">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-semibold">Торговля</CardTitle>
      </CardHeader>
      <div className="px-3 pb-3 space-y-2">
        <div>
          <Label htmlFor="trading-volume" className="text-xs">
            Объем (USD)
          </Label>
          <Input
            id="trading-volume"
            type="number"
            value={tradingVolume}
            onChange={handleChange}
            className="h-7 text-xs"
            placeholder="100"
          />
        </div>
        <Button
          onClick={handleClick}
          disabled={isTrading || !selectedEnriched}
          className="w-full h-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs"
        >
          {isTrading ? 'Выполняется...' : 'Бабло'}
        </Button>
      </div>
    </Card>
  );
};


