import React from 'react';
import { Button } from '../../components/ui/button';
import { X } from 'lucide-react';
import { exchangeImgMap } from '../../utils';

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
            <X
              className="h-3 w-3 ml-1 hover:text-destructive transition-colors"
              onClick={(e) => {
                e.stopPropagation();
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
            />
          </Button>
        );
      })}
    </div>
  );
};

