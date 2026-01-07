import React from 'react';
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, ExternalLink, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../lib/utils';
import { getExchangeUrl } from '../api/utils/tickers';

interface ExchangeSideInfo {
  /** Биржа */
  exchange: string;
  /** Последняя цена */
  last: number;
}

interface SelectedEnrichedLite {
  /** Тикер (например, BTC) */
  ticker: string;
  /** Сводный funding по спреду */
  funding: number;
  /** Спред в процентах */
  spread: number;
  /** Сторона продажи */
  sellExchange: ExchangeSideInfo;
  /** Сторона покупки */
  buyExchange: ExchangeSideInfo;
  /** Funding ставки для продажи, % */
  sellFunding?: number;
  /** Время следующего funding для продажи */
  sellFundingTime?: number | string | null;
  /** Funding ставки для покупки, % */
  buyFunding?: number;
  /** Время следующего funding для покупки */
  buyFundingTime?: number | string | null;
}

interface ArbPairLite {
  /** Левая биржа */
  left: { exchange: string };
  /** Правая биржа */
  right: { exchange: string };
}

interface SelectedArbWidgetProps {
  /** Обогащённые данные по выбранному арбитражу */
  selectedEnriched: SelectedEnrichedLite;
  /** Пара бирж для арбитража */
  selectedArb: ArbPairLite;
  /** Карта иконок бирж */
  exchangeImgMap: Record<string, string>;
  /** Форматирование времени funding */
  formatFundingTime: (value?: number | string | null) => string;
  /** Ссылка на TradingView для спреда */
  getTradingViewSpreadUrl: (leftExchange: string, rightExchange: string, ticker: string) => string;
}

export const SelectedArbWidget: React.FC<SelectedArbWidgetProps> = ({
  selectedEnriched,
  selectedArb,
  exchangeImgMap,
  formatFundingTime,
  getTradingViewSpreadUrl,
}) => {
  return (
    <div className="mb-2">
        <div
          className="bg-card rounded-lg px-3 py-1.5 selected-arb-header"
          style={{
            border: '1px solid rgba(166, 189, 213, 0.2)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">{selectedEnriched.ticker}</span>

            <div className="h-4 w-px bg-muted-foreground/30" />

            <div className="flex items-center gap-1.5">
              {selectedEnriched.funding >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  selectedEnriched.funding >= 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {selectedEnriched.funding.toFixed(4)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Спред</span>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  selectedEnriched.spread > 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {selectedEnriched.spread > 0 ? '+' : ''}
                {selectedEnriched.spread.toFixed(2)}%
              </span>
            </div>

            <div className="h-4 w-px bg-muted-foreground/30" />

            <div className="flex items-center gap-2">
              <ArrowDown className="h-3.5 w-3.5 text-red-400" />
              <img
                className="h-3.5 w-3.5 rounded-full"
                src={exchangeImgMap[selectedEnriched.sellExchange.exchange]}
                alt={selectedEnriched.sellExchange.exchange}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {selectedEnriched.sellExchange.exchange}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={getExchangeUrl(selectedEnriched.sellExchange.exchange, selectedEnriched.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Перейти на {selectedEnriched.sellExchange.exchange}</p>
                </TooltipContent>
              </Tooltip>
              <span className="text-sm font-bold tabular-nums">
                {selectedEnriched.sellExchange.last.toFixed(6)}
              </span>
              <span className="text-xs text-muted-foreground">
                Ф:{' '}
                {selectedEnriched.sellFunding !== undefined
                  ? `${selectedEnriched.sellFunding.toFixed(4)}%`
                  : 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFundingTime(selectedEnriched.sellFundingTime)}
              </span>
            </div>

            <div className="h-4 w-px bg-muted-foreground/30" />

            <div className="flex items-center gap-2">
              <ArrowUp className="h-3.5 w-3.5 text-green-400" />
              <img
                className="h-3.5 w-3.5 rounded-full"
                src={exchangeImgMap[selectedEnriched.buyExchange.exchange]}
                alt={selectedEnriched.buyExchange.exchange}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {selectedEnriched.buyExchange.exchange}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={getExchangeUrl(selectedEnriched.buyExchange.exchange, selectedEnriched.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Перейти на {selectedEnriched.buyExchange.exchange}</p>
                </TooltipContent>
              </Tooltip>
              <span className="text-sm font-bold tabular-nums">
                {selectedEnriched.buyExchange.last.toFixed(6)}
              </span>
              <span className="text-xs text-muted-foreground">
                Ф:{' '}
                {selectedEnriched.buyFunding !== undefined
                  ? `${selectedEnriched.buyFunding.toFixed(4)}%`
                  : 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFundingTime(selectedEnriched.buyFundingTime)}
              </span>
            </div>

            <div className="h-4 w-px bg-muted-foreground/30" />

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={getTradingViewSpreadUrl(
                    selectedArb.left.exchange,
                    selectedArb.right.exchange,
                    selectedEnriched.ticker,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Перейти в TV</span>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Открыть график спреда в TradingView</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
  );
};


