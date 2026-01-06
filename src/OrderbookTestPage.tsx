import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OrderbookView } from './components/OrderbookView';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { useAppSelector } from './store';
import { DataService } from './api/common/data.service';
import { exchangeImgMap } from './utils';
import { getFuturesTickers, TickerInfo } from './api/tickers.api';

// Список доступных бирж
const EXCHANGES = [
  'MEXC',
  'BYBIT',
  'BINANCE',
  'BITGET',
  'OKX',
  'GATE',
  'GATEIO',
  'KUCOIN',
  'BINGX',
  'OURBIT',
  'BITMART',
  'HTX',
  'PHEMEX',
  'BITUNIX',
  'XT',
  'TOOBIT',
  'HYPERLIQUID',
  'ASTER',
  'HOTCOIN',
  'KCEX',
];

interface TickerOption {
  symbol: string;
  display: string;
}

export const OrderbookTestPage = () => {
  const dataService = useAppSelector((state) => state.alorSlice.dataService) as DataService | null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const [tickers, setTickers] = useState<TickerOption[]>([]);
  const [loadingTickers, setLoadingTickers] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Читаем выбранную биржу и тикер из query параметров
  const selectedExchange = useMemo(() => {
    const exchange = searchParams.get('exchange');
    return exchange && EXCHANGES.includes(exchange.toUpperCase()) ? exchange.toUpperCase() : null;
  }, [searchParams]);

  const selectedTicker = useMemo(() => {
    return searchParams.get('ticker');
  }, [searchParams]);

  // Восстанавливаем searchValue из query параметров при изменении
  useEffect(() => {
    if (selectedExchange && selectedTicker) {
      setSearchValue(`${selectedExchange}:${selectedTicker}`);
    } else if (selectedExchange) {
      setSearchValue(`${selectedExchange}:`);
    } else {
      setSearchValue('');
    }
  }, [selectedExchange, selectedTicker]);

  // Функция для обновления query параметров
  const updateQueryParams = (exchange: string | null, ticker: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (exchange) {
      params.set('exchange', exchange);
      if (ticker) {
        params.set('ticker', ticker);
      } else {
        params.delete('ticker');
      }
    } else {
      params.delete('exchange');
      params.delete('ticker');
    }
    setSearchParams(params, { replace: true });
  };

  // Получаем список фьючерсов для выбранной биржи
  useEffect(() => {
    if (!selectedExchange) {
      setTickers([]);
      return;
    }

    const fetchTickers = async () => {
      setLoadingTickers(true);
      try {
        const tickerData = await getFuturesTickers(selectedExchange);
        
        // Извлекаем символы из данных в зависимости от формата ответа биржи
        const tickerList: TickerOption[] = tickerData
          .map((ticker: TickerInfo) => {
            // Разные биржи возвращают символы в разных полях
            let symbol = ticker.symbol || ticker.contract || ticker.instId || ticker.contractCode || '';
            
            // Нормализуем символ (убираем суффиксы)
            if (symbol.endsWith('_USDT')) {
              symbol = symbol.replace('_USDT', '');
            } else if (symbol.endsWith('USDT')) {
              symbol = symbol.replace('USDT', '');
            } else if (symbol.endsWith('-USDT-SWAP')) {
              symbol = symbol.replace('-USDT-SWAP', '');
            } else if (symbol.endsWith('-USDT')) {
              symbol = symbol.replace('-USDT', '');
            } else if (symbol.endsWith('USDTM')) {
              symbol = symbol.replace('USDTM', '');
            } else if (symbol.endsWith('usdt')) {
              symbol = symbol.replace('usdt', '').toUpperCase();
            }
            
            return {
              symbol: symbol,
              display: symbol,
            };
          })
          .filter((t: TickerOption) => t.symbol && t.symbol.length > 0)
          .sort((a: TickerOption, b: TickerOption) => a.symbol.localeCompare(b.symbol));
        
        // Удаляем дубликаты
        const uniqueTickers = Array.from(
          new Map(tickerList.map((t) => [t.symbol, t])).values()
        );
        
        setTickers(uniqueTickers);
        
        // Если биржа выбрана и поле поиска содержит двоеточие, обновляем подсказки
        if (searchValue.includes(':')) {
          const colonIndex = searchValue.indexOf(':');
          const tickerPart = searchValue.substring(colonIndex + 1).trim();
          
          if (tickerPart) {
            // Фильтруем тикеры по введенному тексту
            const filtered = uniqueTickers
              .filter((t) => t.display.toLowerCase().includes(tickerPart.toLowerCase()))
              .map((t) => t.display);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
          } else {
            // Показываем все тикеры
            setSuggestions(uniqueTickers.map((t) => t.display));
            setShowSuggestions(true);
          }
        }
      } catch (error) {
        console.error('Ошибка при получении списка фьючерсов:', error);
        setTickers([]);
      } finally {
        setLoadingTickers(false);
      }
    };

    fetchTickers();
  }, [selectedExchange, searchValue]);

  // Обработка изменений в строке поиска
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    
    // Проверяем, есть ли двоеточие
    const colonIndex = value.indexOf(':');
    
    if (colonIndex === -1) {
      // Нет двоеточия - автокомплит по биржам
      updateQueryParams(null, null);
      
      if (value.trim() === '') {
        // Показываем все биржи при пустом поле
        setSuggestions(EXCHANGES);
        setShowSuggestions(true);
      } else {
        const filtered = EXCHANGES.filter((ex) =>
          ex.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions(filtered);
        setShowSuggestions(true);
      }
    } else {
      // Есть двоеточие - автокомплит по фьючерсам
      const exchangePart = value.substring(0, colonIndex).trim().toUpperCase();
      const tickerPart = value.substring(colonIndex + 1).trim();
      
      // Проверяем, является ли первая часть валидной биржей
      const isValidExchange = EXCHANGES.some((ex) => ex.toUpperCase() === exchangePart);
      
      if (isValidExchange) {
        updateQueryParams(exchangePart, null);
        
        // Если тикеры еще не загружены, не показываем подсказки
        if (tickers.length === 0) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        
        // Если есть текст после двоеточия, проверяем, является ли он валидным тикером
        if (tickerPart) {
          // Проверяем, есть ли точное совпадение
          const exactMatch = tickers.find((t) => t.display.toLowerCase() === tickerPart.toLowerCase());
          if (exactMatch) {
            updateQueryParams(exchangePart, exactMatch.display);
            setShowSuggestions(false);
          } else {
            // Показываем автокомплит
            const filtered = tickers
              .filter((t) => t.display.toLowerCase().includes(tickerPart.toLowerCase()))
              .map((t) => t.display);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
          }
        } else {
          // Нет текста после двоеточия - показываем все тикеры
          setSuggestions(tickers.map((t) => t.display));
          setShowSuggestions(true);
        }
      } else {
        updateQueryParams(null, null);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  // Обработка выбора из автокомплита
  const handleSuggestionClick = (suggestion: string) => {
    const colonIndex = searchValue.indexOf(':');
    
    if (colonIndex === -1) {
      // Выбрана биржа
      const exchangeUpper = suggestion.toUpperCase();
      setSearchValue(`${exchangeUpper}:`);
      updateQueryParams(exchangeUpper, null);
      setShowSuggestions(false);
      inputRef.current?.focus();
    } else {
      // Выбран тикер
      const exchangePart = searchValue.substring(0, colonIndex).trim();
      const newValue = `${exchangePart}:${suggestion}`;
      setSearchValue(newValue);
      updateQueryParams(exchangePart.toUpperCase(), suggestion);
      setShowSuggestions(false);
    }
  };

  // Обработка нажатия Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Закрытие автокомплита при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Определяем символ для стакана
  const symbol = useMemo(() => {
    if (!selectedExchange || !selectedTicker) {
      return null;
    }
    
    // Форматируем тикер в зависимости от биржи
    const exchangeUpper = selectedExchange.toUpperCase();
    let formattedTicker = selectedTicker;
    
    switch (exchangeUpper) {
      case 'MEXC':
      case 'OURBIT':
      case 'GATE':
      case 'GATEIO':
      case 'XT':
      case 'KCEX':
        formattedTicker = `${selectedTicker}_USDT`;
        break;
      case 'BYBIT':
      case 'BINANCE':
      case 'BITGET':
      case 'KUCOIN':
      case 'BITMART':
      case 'BITUNIX':
      case 'ASTER':
        formattedTicker = `${selectedTicker}USDT`;
        break;
      case 'OKX':
        formattedTicker = `${selectedTicker}-USDT-SWAP`;
        break;
      case 'BINGX':
      case 'HTX':
      case 'PHEMEX':
      case 'TOOBIT':
        formattedTicker = `${selectedTicker}-USDT`;
        break;
      case 'HYPERLIQUID':
        formattedTicker = selectedTicker;
        break;
      case 'HOTCOIN':
        const hotcoinTicker = selectedTicker.toLowerCase().replace('-', '').replace('_', '');
        formattedTicker = hotcoinTicker.endsWith('usdt') ? hotcoinTicker : `${hotcoinTicker}usdt`;
        break;
      default:
        formattedTicker = `${selectedTicker}_USDT`;
    }
    
    return formattedTicker;
  }, [selectedExchange, selectedTicker]);

  return (
    <div className="flex flex-col h-screen max-h-screen gap-4 p-4 overflow-hidden">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle>Тест стакана</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Умная строка поиска */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Введите биржу (например: MEXC) или биржу:тикер (например: MEXC:BTC)"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // При фокусе показываем подсказки
                if (searchValue.trim() === '') {
                  // Если поле пустое, показываем все биржи
                  setSuggestions(EXCHANGES);
                  setShowSuggestions(true);
                } else if (suggestions.length > 0) {
                  // Если есть подсказки, показываем их
                  setShowSuggestions(true);
                } else if (searchValue.includes(':')) {
                  // Если выбрана биржа, но тикеры еще не загружены, не показываем подсказки
                  // Они появятся после загрузки тикеров
                }
              }}
              className="w-full"
            />
            
            {/* Автокомплит */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {searchValue.indexOf(':') === -1 && exchangeImgMap[suggestion] && (
                      <img
                        src={exchangeImgMap[suggestion]}
                        alt={suggestion}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
            
            {loadingTickers && (
              <div className="absolute right-2 top-2 text-sm text-muted-foreground">
                Загрузка...
              </div>
            )}
          </div>
          
          {/* Информация о выбранной паре */}
          {selectedExchange && selectedTicker && symbol && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Биржа:</span>
              {exchangeImgMap[selectedExchange] && (
                <img
                  src={exchangeImgMap[selectedExchange]}
                  alt={selectedExchange}
                  className="h-4 w-4 rounded-full"
                />
              )}
              <span className="font-medium">{selectedExchange}</span>
              <span className="text-muted-foreground">Тикер:</span>
              <span className="font-medium">{selectedTicker}</span>
              <span className="text-muted-foreground">Символ:</span>
              <span className="font-medium">{symbol}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Стакан */}
      {selectedExchange && selectedTicker && symbol && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <OrderbookView
            exchange={selectedExchange}
            symbol={symbol}
            ticker={selectedTicker}
          />
        </div>
      )}
      
      {(!selectedExchange || !selectedTicker) && (
        <Card className="flex-shrink-0">
          <CardContent className="py-8 text-center text-muted-foreground">
            Выберите биржу и тикер для отображения стакана
          </CardContent>
        </Card>
      )}
    </div>
  );
};

