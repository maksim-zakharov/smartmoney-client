import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { X } from 'lucide-react';
import { exchangeImgMap } from '../../utils';
import { useAppSelector } from '../../store';
import { DataService } from '../../api/common/data.service';
import { Subscription } from 'rxjs';
import { getTickerWithSuffix } from '../../api/utils/tickers';

export interface ArbPair {
  ticker: string;
  left: { exchange: string; last: number };
  right: { exchange: string; last: number };
  ratio: number;
}

export interface FairRatio {
  ticker: string;
  last: number;
  fair: number;
  exchange: string;
  ratio: number;
}

export interface FavoriteArbItem {
  key: string;
  type: 'spread' | 'fair';
  arb?: ArbPair;
  fair?: FairRatio;
}

export interface FavoriteTabsProps {
  favoriteArbsList: FavoriteArbItem[];
  selectedArb: ArbPair | null;
  selectedFairArb: FairRatio | null;
  onArbSelect: (arb: ArbPair) => void;
  onFairArbSelect: (fair: FairRatio) => void;
  onRemoveFavorite: (key: string) => void;
  onClearSelection: () => void;
}

// Функция для получения метода подписки на свечи для биржи
const getCandlesSubscribeMethod = (dataService: DataService, exchange: string) => {
  const exchangeUpper = exchange.toUpperCase();
  switch (exchangeUpper) {
    case 'MEXC':
      return (symbol: string, resolution: string) => dataService.mexcSubscribeCandles(symbol, resolution as any);
    case 'BYBIT':
      return (symbol: string, resolution: string) => dataService.bybitSubscribeCandles(symbol, resolution as any);
    case 'BITGET':
      return (symbol: string, resolution: string) => dataService.bitgetSubscribeCandles(symbol, resolution as any);
    case 'GATE':
    case 'GATEIO':
      return (symbol: string, resolution: string) => dataService.gateSubscribeCandles(symbol, resolution as any);
    case 'BINGX':
      return (symbol: string, resolution: string) => dataService.bingxSubscribeCandles(symbol, resolution as any);
    case 'OKX':
      return (symbol: string, resolution: string) => dataService.okxSubscribeCandles(symbol, resolution as any);
    case 'OURBIT':
      return (symbol: string, resolution: string) => dataService.ourbitSubscribeCandles(symbol, resolution as any);
    case 'KUCOIN':
      return (symbol: string, resolution: string) => dataService.kucoinSubscribeCandles(symbol, resolution as any);
    case 'BINANCE':
      return (symbol: string, resolution: string) => dataService.binanceSubscribeCandles(symbol, resolution as any);
    case 'BITMART':
      return (symbol: string, resolution: string) => dataService.bitmartSubscribeCandles(symbol, resolution as any);
    case 'HTX':
      return (symbol: string, resolution: string) => dataService.htxSubscribeCandles(symbol, resolution as any);
    case 'PHEMEX':
      return (symbol: string, resolution: string) => dataService.phemexSubscribeCandles(symbol, resolution as any);
    case 'BITUNIX':
      return (symbol: string, resolution: string) => dataService.bitunixSubscribeCandles(symbol, resolution as any);
    case 'TOOBIT':
      return (symbol: string, resolution: string) => dataService.toobitSubscribeCandles(symbol, resolution as any);
    case 'XT':
      return (symbol: string, resolution: string) => dataService.xtSubscribeCandles(symbol, resolution as any);
    case 'HYPERLIQUID':
      return (symbol: string, resolution: string) => dataService.hyperliquidSubscribeCandles(symbol, resolution as any);
    case 'ASTER':
      return (symbol: string, resolution: string) => dataService.asterSubscribeCandles(symbol, resolution as any);
    case 'HOTCOIN':
      return (symbol: string, resolution: string) => dataService.hotcoinSubscribeCandles(symbol, resolution as any);
    case 'KCEX':
      return (symbol: string, resolution: string) => dataService.kcexSubscribeCandles(symbol, resolution as any);
    case 'COINEX':
      return (symbol: string, resolution: string) => dataService.coinexSubscribeCandles(symbol, resolution as any);
    default:
      return null;
  }
};

// Функция для получения метода отписки от свечей для биржи
const getCandlesUnsubscribeMethod = (dataService: DataService, exchange: string) => {
  const exchangeUpper = exchange.toUpperCase();
  switch (exchangeUpper) {
    case 'MEXC':
      return (symbol: string, resolution: string) => dataService.mexcUnsubscribeCandles(symbol, resolution as any);
    case 'BYBIT':
      return (symbol: string, resolution: string) => dataService.bybitUnsubscribeCandles(symbol, resolution as any);
    case 'BITGET':
      return (symbol: string, resolution: string) => dataService.bitgetUnsubscribeCandles(symbol, resolution as any);
    case 'GATE':
    case 'GATEIO':
      return (symbol: string, resolution: string) => dataService.gateUnsubscribeCandles(symbol, resolution as any);
    case 'BINGX':
      return (symbol: string, resolution: string) => dataService.bingxUnsubscribeCandles(symbol, resolution as any);
    case 'OKX':
      return (symbol: string, resolution: string) => dataService.okxUnsubscribeCandles(symbol, resolution as any);
    case 'OURBIT':
      return (symbol: string, resolution: string) => dataService.ourbitUnsubscribeCandles(symbol, resolution as any);
    case 'KUCOIN':
      return (symbol: string, resolution: string) => dataService.kucoinUnsubscribeCandles(symbol, resolution as any);
    case 'BINANCE':
      return (symbol: string, resolution: string) => dataService.binanceUnsubscribeCandles(symbol, resolution as any);
    case 'BITMART':
      return (symbol: string, resolution: string) => dataService.bitmartUnsubscribeCandles(symbol, resolution as any);
    case 'HTX':
      return (symbol: string, resolution: string) => dataService.htxUnsubscribeCandles(symbol, resolution as any);
    case 'PHEMEX':
      return (symbol: string, resolution: string) => dataService.phemexUnsubscribeCandles(symbol, resolution as any);
    case 'BITUNIX':
      return (symbol: string, resolution: string) => dataService.bitunixUnsubscribeCandles(symbol, resolution as any);
    case 'TOOBIT':
      return (symbol: string, resolution: string) => dataService.toobitUnsubscribeCandles(symbol, resolution as any);
    case 'XT':
      return (symbol: string, resolution: string) => dataService.xtUnsubscribeCandles(symbol, resolution as any);
    case 'HYPERLIQUID':
      return (symbol: string, resolution: string) => dataService.hyperliquidUnsubscribeCandles(symbol, resolution as any);
    case 'ASTER':
      return (symbol: string, resolution: string) => dataService.asterUnsubscribeCandles(symbol, resolution as any);
    case 'HOTCOIN':
      return (symbol: string, resolution: string) => dataService.hotcoinUnsubscribeCandles(symbol, resolution as any);
    case 'KCEX':
      return (symbol: string, resolution: string) => dataService.kcexUnsubscribeCandles(symbol, resolution as any);
    case 'COINEX':
      return (symbol: string, resolution: string) => dataService.coinexUnsubscribeCandles(symbol, resolution as any);
    default:
      return null;
  }
};

// Компонент для отображения спреда в реальном времени через вебсокеты
const RealTimeSpread: React.FC<{
  ticker: string;
  leftExchange: string;
  rightExchange: string;
}> = ({ ticker, leftExchange, rightExchange }) => {
  const dataService = useAppSelector((state) => state.alorSlice.dataService) as DataService | null;
  const [spread, setSpread] = useState<number | null>(null);

  useEffect(() => {
    if (!dataService || !ticker) {
      setSpread(null);
      return;
    }

    const subscriptions: Subscription[] = [];
    let leftPrice: number | null = null;
    let rightPrice: number | null = null;

    const updateSpread = () => {
      if (leftPrice !== null && rightPrice !== null && rightPrice !== 0) {
        // Формируем цену арбитража: левая цена (close) делится на правую цену (close)
        const ratio = leftPrice / rightPrice;
        const calculatedSpread = (ratio - 1) * 100;
        setSpread(calculatedSpread);
      } else {
        setSpread(null);
      }
    };

    // Получаем методы подписки на свечи для обеих бирж
    const leftSubscribeMethod = getCandlesSubscribeMethod(dataService, leftExchange);
    const rightSubscribeMethod = getCandlesSubscribeMethod(dataService, rightExchange);
    const leftUnsubscribeMethod = getCandlesUnsubscribeMethod(dataService, leftExchange);
    const rightUnsubscribeMethod = getCandlesUnsubscribeMethod(dataService, rightExchange);

    if (!leftSubscribeMethod || !rightSubscribeMethod) {
      setSpread(null);
      return;
    }

    // Подписываемся на свечи для левой биржи (используем разрешение '1' - 1 минута)
    const leftSymbol = getTickerWithSuffix(leftExchange, ticker);
    const leftSub = leftSubscribeMethod(leftSymbol, '1').subscribe({
      next: (candle: any) => {
        // Получаем цену close из свечи
        if (candle && candle.close !== undefined) {
          leftPrice = Number(candle.close);
          updateSpread();
        }
      },
    });
    subscriptions.push(leftSub);

    // Подписываемся на свечи для правой биржи (используем разрешение '1' - 1 минута)
    const rightSymbol = getTickerWithSuffix(rightExchange, ticker);
    const rightSub = rightSubscribeMethod(rightSymbol, '1').subscribe({
      next: (candle: any) => {
        // Получаем цену close из свечи
        if (candle && candle.close !== undefined) {
          rightPrice = Number(candle.close);
          updateSpread();
        }
      },
    });
    subscriptions.push(rightSub);

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
      // Отписываемся от свечей
      try {
        if (leftUnsubscribeMethod) {
          leftUnsubscribeMethod(leftSymbol, '1');
        }
        if (rightUnsubscribeMethod) {
          rightUnsubscribeMethod(rightSymbol, '1');
        }
      } catch (e) {
        // Игнорируем ошибки отписки
      }
    };
  }, [dataService, ticker, leftExchange, rightExchange]);

  if (spread === null) {
    return null;
  }

  return (
    <span className={spread >= 0 ? 'text-green-500' : 'text-red-500'}>
      {spread >= 0 ? '+' : ''}
      {spread.toFixed(2)}%
    </span>
  );
};

export const FavoriteTabs: React.FC<FavoriteTabsProps> = ({
  favoriteArbsList,
  selectedArb,
  selectedFairArb,
  onArbSelect,
  onFairArbSelect,
  onRemoveFavorite,
  onClearSelection,
}) => {
  if (favoriteArbsList.length === 0) {
    return null;
  }

  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {favoriteArbsList.map((fav) => {
        const isSelected =
          fav.type === 'spread'
            ? selectedArb?.ticker === fav.arb?.ticker &&
              selectedArb?.left.exchange === fav.arb?.left.exchange &&
              selectedArb?.right.exchange === fav.arb?.right.exchange
            : selectedFairArb?.ticker === fav.fair?.ticker && selectedFairArb?.exchange === fav.fair?.exchange;

        return (
          <Button
            key={fav.key}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs flex items-center gap-1.5"
            onClick={() => {
              if (fav.type === 'spread' && fav.arb) {
                onArbSelect({
                  ticker: fav.arb.ticker,
                  left: fav.arb.left,
                  right: fav.arb.right,
                  ratio: fav.arb.ratio,
                });
              } else if (fav.type === 'fair' && fav.fair) {
                onFairArbSelect(fav.fair);
              }
            }}
          >
            {fav.type === 'spread' && fav.arb ? (
              <>
                <span>{fav.arb.ticker}</span>
                {exchangeImgMap[fav.arb.left.exchange] && (
                  <img
                    src={exchangeImgMap[fav.arb.left.exchange]}
                    alt={fav.arb.left.exchange}
                    className="h-3.5 w-3.5 rounded-full"
                  />
                )}
                <span>{fav.arb.left.exchange}</span>
                <span>/</span>
                {exchangeImgMap[fav.arb.right.exchange] && (
                  <img
                    src={exchangeImgMap[fav.arb.right.exchange]}
                    alt={fav.arb.right.exchange}
                    className="h-3.5 w-3.5 rounded-full"
                  />
                )}
                <span>{fav.arb.right.exchange}</span>
                <RealTimeSpread
                  ticker={fav.arb.ticker}
                  leftExchange={fav.arb.left.exchange}
                  rightExchange={fav.arb.right.exchange}
                />
              </>
            ) : (
              <>
                {fav.fair && exchangeImgMap[fav.fair.exchange] && (
                  <img src={exchangeImgMap[fav.fair.exchange]} alt={fav.fair.exchange} className="h-3.5 w-3.5 rounded-full" />
                )}
                <span>{fav.fair?.ticker}</span>
                <span>{fav.fair?.exchange}</span>
              </>
            )}
            <span
              className="h-3 w-3 ml-1 hover:text-destructive transition-colors cursor-pointer flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const wasSelected = isSelected;
                onRemoveFavorite(fav.key);
                // Если удаляли выбранный арбитраж, выбираем первый из оставшихся
                if (wasSelected && favoriteArbsList.length > 1) {
                  const remaining = favoriteArbsList.filter((f) => f.key !== fav.key);
                  if (remaining.length > 0) {
                    const first = remaining[0];
                    if (first.type === 'spread' && first.arb) {
                      onArbSelect({
                        ticker: first.arb.ticker,
                        left: first.arb.left,
                        right: first.arb.right,
                        ratio: first.arb.ratio,
                      });
                    } else if (first.type === 'fair' && first.fair) {
                      onFairArbSelect(first.fair);
                    }
                  } else {
                    // Если больше нет избранных, очищаем выбор
                    onClearSelection();
                  }
                } else if (wasSelected) {
                  // Если удаляли последний избранный, очищаем выбор
                  onClearSelection();
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </Button>
        );
      })}
    </div>
  );
};

