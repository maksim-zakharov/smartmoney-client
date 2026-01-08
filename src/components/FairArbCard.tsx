import React from 'react';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Copy, ExternalLink, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { exchangeImgMap } from '../utils';
import { getExchangeUrl } from '../api/utils/tickers';

export interface FairRatio {
  ticker: string;
  exchange: string;
  last: number;
  fair: number;
  ratio: number;
}

export interface FairArbCardProps {
  fair: FairRatio;
  isSelected: boolean;
  onSelect: (fair: FairRatio) => void;
  isFavorite: (key: string) => boolean;
  getFairArbPairKey: (fair: FairRatio) => string;
  toggleFavorite: (key: string) => void;
  excludedTickers: Set<string>;
  setExcludedTickers: (tickers: Set<string>) => void;
}

export const FairArbCard: React.FC<FairArbCardProps> = ({
  fair,
  isSelected,
  onSelect,
  isFavorite,
  getFairArbPairKey,
  toggleFavorite,
  excludedTickers,
  setExcludedTickers,
}) => {
  const spread = (fair.ratio - 1) * 100;

  return (
    <Card
      key={`${fair.ticker}_${fair.exchange}_fair`}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 py-2 w-full',
        isSelected ? 'ring-2 ring-primary shadow-lg border-primary' : 'border-muted-foreground/20',
      )}
      onClick={() => onSelect(fair)}
    >
      <CardHeader className="pb-2 pt-2 px-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold tabular-nums">{fair.ticker}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Copy
                  className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard
                      .writeText(fair.ticker)
                      .then(() => {
                        toast.success(`Тикер ${fair.ticker} скопирован`);
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
                    isFavorite(getFairArbPairKey(fair))
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground hover:text-yellow-500',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(getFairArbPairKey(fair));
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFavorite(getFairArbPairKey(fair)) ? 'Удалить из избранного' : 'Добавить в избранное'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold tabular-nums', spread > 0 ? 'text-green-500' : 'text-red-500')}>
              {spread > 0 ? '+' : ''}
              {spread.toFixed(4)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <EyeOff
                  className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExcluded = new Set(excludedTickers);
                    newExcluded.add(fair.ticker);
                    setExcludedTickers(newExcluded);
                    localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(Array.from(newExcluded)));
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Скрыть монету</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <img className="h-4 w-4 rounded-full" src={exchangeImgMap[fair.exchange]} alt={fair.exchange} />
            <span className="text-xs font-semibold text-muted-foreground">{fair.exchange}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={getExchangeUrl(fair.exchange, fair.ticker)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Перейти на {fair.exchange}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Последняя цена</div>
              <div className="text-base font-bold tabular-nums">{fair.last.toFixed(6)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Справедливая цена</div>
              <div className="text-base font-bold tabular-nums">{fair.fair.toFixed(6)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-muted-foreground/20">
            <span className="text-sm font-semibold">Отклонение</span>
            <span className={cn('text-sm font-bold tabular-nums', spread > 0 ? 'text-green-500' : 'text-red-500')}>
              {spread > 0 ? '+' : ''}
              {spread.toFixed(4)}%
            </span>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

