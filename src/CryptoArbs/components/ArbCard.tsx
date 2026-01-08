import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle } from '../../components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Copy, ExternalLink, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { exchangeImgMap } from '../../utils';
import { getExchangeUrl } from '../../api/utils/tickers';

export interface ArbPair {
  ticker: string;
  left: {
    exchange: string;
    last: number;
  };
  right: {
    exchange: string;
    last: number;
  };
  ratio: number;
}

export interface EnrichedArb extends ArbPair {
  spread: number;
  funding: number;
  sellExchange: {
    exchange: string;
    last: number;
  };
  buyExchange: {
    exchange: string;
    last: number;
  };
  sellFunding?: number;
  sellFundingTime?: string | null;
  buyFunding?: number;
  buyFundingTime?: string | null;
  isSelected: boolean;
}

export interface ArbCardProps {
  arb: EnrichedArb;
  onSelect: (arb: ArbPair) => void;
  isFavorite: (key: string) => boolean;
  getArbPairKey: (arb: ArbPair) => string;
  toggleFavorite: (key: string) => void;
  excludedTickers: Set<string>;
  setExcludedTickers: (tickers: Set<string>) => void;
  formatFundingTime: (timeString: string | null | undefined) => string;
}

export const ArbCard: React.FC<ArbCardProps> = ({
  arb,
  onSelect,
  isFavorite,
  getArbPairKey,
  toggleFavorite,
  excludedTickers,
  setExcludedTickers,
  formatFundingTime,
}) => {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-2 w-full rounded',
        arb.isSelected ? 'ring-2 ring-primary shadow-lg border-primary' : '',
      )}
      onClick={() =>
        onSelect({
          ticker: arb.ticker,
          left: arb.left,
          right: arb.right,
          ratio: arb.ratio,
        })
      }
    >
      <CardHeader className="pb-2 pt-2 px-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold tabular-nums">{arb.ticker}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Copy
                  className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard
                      .writeText(arb.ticker)
                      .then(() => {
                        toast.success(`Тикер ${arb.ticker} скопирован`);
                      })
                      .catch(() => {
                        toast.error('Не удалось скопировать тикер');
                      });
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Копировать</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors cursor-pointer',
                    isFavorite(getArbPairKey(arb))
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground hover:text-yellow-500',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(getArbPairKey(arb));
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFavorite(getArbPairKey(arb)) ? 'Удалить из избранного' : 'Добавить в избранное'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {arb.funding >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                arb.funding >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {arb.funding.toFixed(4)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <EyeOff
                  className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExcluded = new Set(excludedTickers);
                    newExcluded.add(arb.ticker);
                    setExcludedTickers(newExcluded);
                    localStorage.setItem(
                      'crypto-arbs-excluded-tickers',
                      JSON.stringify(Array.from(newExcluded)),
                    );
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Скрыть монету</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <div className="flex flex-col gap-1.5 p-2 rounded bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDown className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-400">Продаем</span>
            </div>
            <div className="flex items-center gap-2">
              <img
                className="h-4 w-4 rounded-full"
                src={exchangeImgMap[arb.sellExchange.exchange]}
                alt={arb.sellExchange.exchange}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {arb.sellExchange.exchange}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={getExchangeUrl(arb.sellExchange.exchange, arb.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Перейти на {arb.sellExchange.exchange}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-base font-bold tabular-nums">
              {arb.sellExchange.last.toFixed(6)}
            </div>
            <div className="text-xs text-muted-foreground">
              Фандинг:{' '}
              <span className="font-mono">
                {arb.sellFunding !== undefined ? `${arb.sellFunding.toFixed(4)}%` : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Время: {formatFundingTime(arb.sellFundingTime)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-2 rounded bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUp className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-400">Покупаем</span>
            </div>
            <div className="flex items-center gap-2">
              <img
                className="h-4 w-4 rounded-full"
                src={exchangeImgMap[arb.buyExchange.exchange]}
                alt={arb.buyExchange.exchange}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {arb.buyExchange.exchange}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={getExchangeUrl(arb.buyExchange.exchange, arb.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Перейти на {arb.buyExchange.exchange}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-base font-bold tabular-nums">
              {arb.buyExchange.last.toFixed(6)}
            </div>
            <div className="text-xs text-muted-foreground">
              Фандинг:{' '}
              <span className="font-mono">
                {arb.buyFunding !== undefined ? `${arb.buyFunding.toFixed(4)}%` : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Время: {formatFundingTime(arb.buyFundingTime)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-muted-foreground/20">
          <span className="text-sm font-semibold">Спред</span>
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              arb.spread > 0 ? 'text-green-500' : 'text-red-500',
            )}
          >
            {arb.spread > 0 ? '+' : ''}
            {arb.spread.toFixed(2)}%
          </span>
        </div>
      </CardHeader>
    </Card>
  );
};


