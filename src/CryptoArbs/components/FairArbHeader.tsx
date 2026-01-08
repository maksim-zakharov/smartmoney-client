import React from 'react';
import { cn } from '../../lib/utils';
import { exchangeImgMap } from '../../utils';
import { getExchangeUrl } from '../../api/utils/tickers';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { ExternalLink } from 'lucide-react';

export interface FairRatio {
  ticker: string;
  last: number;
  fair: number;
  exchange: string;
  ratio: number;
}

export interface FairArbHeaderProps {
  fairArb: FairRatio;
}

export const FairArbHeader: React.FC<FairArbHeaderProps> = ({ fairArb }) => {
  return (
    <div className="mb-1">
      <div
        className="bg-card rounded px-3 py-1.5 selected-arb-header"
        style={{
          border: '1px solid rgba(166, 189, 213, 0.2)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">{fairArb.ticker}</span>

          <div className="h-4 w-px bg-muted-foreground/30" />

          <div className="flex items-center gap-2">
            <img
              className="h-3.5 w-3.5 rounded-full"
              src={exchangeImgMap[fairArb.exchange]}
              alt={fairArb.exchange}
            />
            <span className="text-xs font-semibold text-muted-foreground">{fairArb.exchange}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={getExchangeUrl(fairArb.exchange, fairArb.ticker)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Перейти на {fairArb.exchange}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-muted-foreground/30" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Последняя цена</span>
            <span className="text-sm font-bold tabular-nums">{fairArb.last.toFixed(6)}</span>
          </div>

          <div className="h-4 w-px bg-muted-foreground/30" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Справедливая цена</span>
            <span className="text-sm font-bold tabular-nums">{fairArb.fair.toFixed(6)}</span>
          </div>

          <div className="h-4 w-px bg-muted-foreground/30" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Отклонение</span>
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                (fairArb.ratio - 1) * 100 > 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {(fairArb.ratio - 1) * 100 > 0 ? '+' : ''}
              {((fairArb.ratio - 1) * 100).toFixed(4)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

