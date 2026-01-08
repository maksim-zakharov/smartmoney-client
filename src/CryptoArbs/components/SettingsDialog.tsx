import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Settings } from 'lucide-react';
import { exchangeImgMap } from '../../utils';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setShowAll,
  setEnabledExchanges,
  toggleExchange,
  removeExcludedTicker,
  setMinSpread,
  setMinFunding,
  setMaxFunding,
  setSameFundingTime,
  setMinFairRatio,
  setMaxFairRatio,
  setIsSettingsOpen,
} from '../cryptoArbsSettings.slice';

export interface SettingsDialogProps {
  allExchanges: string[];
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ allExchanges }) => {
  const dispatch = useAppDispatch();
  const {
    isSettingsOpen,
    showAll,
    enabledExchanges,
    excludedTickers,
    minSpread,
    minFunding,
    maxFunding,
    sameFundingTime,
    minFairRatio,
    maxFairRatio,
  } = useAppSelector((state) => state.cryptoArbsSettings);

  const enabledExchangesSet = new Set(enabledExchanges);
  const excludedTickersSet = new Set(excludedTickers);
  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => dispatch(setIsSettingsOpen(open))}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 flex-shrink-0">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-3 pb-3">
          <div>
            <h3 className="text-sm font-semibold mb-3">Основные</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Биржи</h4>
                <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto">
                  <Button
                    variant={showAll ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      dispatch(setShowAll(true));
                      // При выборе "Все" очищаем выбор конкретных бирж
                      dispatch(setEnabledExchanges([]));
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    Все
                  </Button>
                  {allExchanges.map((exchange) => (
                    <Button
                      key={exchange}
                      variant={!showAll && enabledExchangesSet.has(exchange) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        // При клике на конкретную биржу отключаем режим "Все"
                        dispatch(setShowAll(false));
                        dispatch(toggleExchange(exchange));
                        // Если все биржи сняты, включаем режим "Все"
                        const updated = enabledExchangesSet.has(exchange)
                          ? enabledExchanges.filter((e) => e !== exchange)
                          : [...enabledExchanges, exchange];
                        if (updated.length === 0) {
                          dispatch(setShowAll(true));
                        }
                      }}
                      className="h-7 px-2 text-xs flex items-center gap-1.5"
                    >
                      {exchangeImgMap[exchange] && (
                        <img src={exchangeImgMap[exchange]} alt={exchange} className="h-3.5 w-3.5 rounded-full" />
                      )}
                      {exchange}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Исключенные монеты</h4>
                <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto">
                  {excludedTickersSet.size === 0 ? (
                    <p className="text-sm text-muted-foreground">Нет исключенных монет</p>
                  ) : (
                    Array.from(excludedTickersSet).map((ticker) => (
                      <Button
                        key={ticker}
                        variant="default"
                        size="sm"
                        className="h-7 px-2 text-xs flex items-center gap-1.5 relative"
                        onClick={() => {
                          dispatch(removeExcludedTicker(ticker));
                        }}
                      >
                        <span>{ticker}</span>
                        <span className="text-xs ml-1">×</span>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-muted-foreground/20 pt-4">
            <h3 className="text-sm font-semibold mb-3">Арбитражи</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Минимальный спред (%)</h4>
                <Input
                  id="min-spread"
                  type="number"
                  step="0.1"
                  min="0"
                  value={minSpread}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      dispatch(setMinSpread(value));
                    }
                  }}
                  className="h-8"
                />
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Фандинг</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="min-funding" className="text-xs text-muted-foreground mb-1 block">
                      От (%)
                    </Label>
                    <Input
                      id="min-funding"
                      type="number"
                      step="0.1"
                      value={minFunding === -Infinity ? '' : minFunding}
                      onChange={(e) => {
                        const value = e.target.value === '' ? -Infinity : parseFloat(e.target.value);
                        if (e.target.value === '' || !isNaN(value)) {
                          dispatch(setMinFunding(value));
                        }
                      }}
                      className="h-8"
                      placeholder="Без ограничения"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-funding" className="text-xs text-muted-foreground mb-1 block">
                      До (%)
                    </Label>
                    <Input
                      id="max-funding"
                      type="number"
                      step="0.1"
                      value={maxFunding === Infinity ? '' : maxFunding}
                      onChange={(e) => {
                        const value = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                        if (e.target.value === '' || !isNaN(value)) {
                          dispatch(setMaxFunding(value));
                        }
                      }}
                      className="h-8"
                      placeholder="Без ограничения"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Фандинг в одно время</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same-funding-time"
                    checked={sameFundingTime}
                    onCheckedChange={(checked) => dispatch(setSameFundingTime(checked === true))}
                  />
                  <Label htmlFor="same-funding-time" className="text-xs text-muted-foreground cursor-pointer">
                    Включить
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-muted-foreground/20 pt-4">
            <h3 className="text-sm font-semibold mb-3">Справедливая</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Отклонение</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="min-fair-ratio" className="text-xs text-muted-foreground mb-1 block">
                      От (%)
                    </Label>
                    <Input
                      id="min-fair-ratio"
                      type="number"
                      step="0.1"
                      value={minFairRatio === -Infinity ? '' : minFairRatio}
                      onChange={(e) => {
                        const value = e.target.value === '' ? -Infinity : parseFloat(e.target.value);
                        if (e.target.value === '' || !isNaN(value)) {
                          dispatch(setMinFairRatio(value));
                        }
                      }}
                      className="h-8"
                      placeholder="Без ограничения"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-fair-ratio" className="text-xs text-muted-foreground mb-1 block">
                      До (%)
                    </Label>
                    <Input
                      id="max-fair-ratio"
                      type="number"
                      step="0.1"
                      value={maxFairRatio === Infinity ? '' : maxFairRatio}
                      onChange={(e) => {
                        const value = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                        if (e.target.value === '' || !isNaN(value)) {
                          dispatch(setMaxFairRatio(value));
                        }
                      }}
                      className="h-8"
                      placeholder="Без ограничения"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

