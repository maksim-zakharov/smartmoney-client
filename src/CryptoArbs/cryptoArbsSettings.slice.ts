import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Функция для загрузки начального состояния из localStorage
const loadInitialState = () => {
  const showAll = (() => {
    const saved = localStorage.getItem('crypto-arbs-show-all');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return true; // По умолчанию показываем все
  })();

  const enabledExchanges = (() => {
    const saved = localStorage.getItem('crypto-arbs-enabled-exchanges');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const minSpread = (() => {
    const saved = localStorage.getItem('crypto-arbs-min-spread');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : 1;
    }
    return 1; // По умолчанию 1%
  })();

  const minFunding = (() => {
    const saved = localStorage.getItem('crypto-arbs-min-funding');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : -Infinity;
    }
    return -Infinity; // По умолчанию без ограничения
  })();

  const maxFunding = (() => {
    const saved = localStorage.getItem('crypto-arbs-max-funding');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : Infinity;
    }
    return Infinity; // По умолчанию без ограничения
  })();

  const minFairRatio = (() => {
    const saved = localStorage.getItem('crypto-arbs-min-fair-ratio');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : -Infinity;
    }
    return -Infinity; // По умолчанию без ограничения
  })();

  const maxFairRatio = (() => {
    const saved = localStorage.getItem('crypto-arbs-max-fair-ratio');
    if (saved !== null && saved !== '') {
      const parsed = parseFloat(saved);
      return !isNaN(parsed) ? parsed : Infinity;
    }
    return Infinity; // По умолчанию без ограничения
  })();

  const sameFundingTime = (() => {
    const saved = localStorage.getItem('crypto-arbs-same-funding-time');
    if (saved !== null) {
      return saved === 'true';
    }
    return false; // По умолчанию выключено
  })();

  const excludedTickers = (() => {
    const saved = localStorage.getItem('crypto-arbs-excluded-tickers');
    return saved ? JSON.parse(saved) : [];
  })();

  return {
    showAll,
    enabledExchanges,
    minSpread,
    minFunding,
    maxFunding,
    minFairRatio,
    maxFairRatio,
    sameFundingTime,
    excludedTickers,
    isSettingsOpen: false,
  };
};

interface CryptoArbsSettingsState {
  showAll: boolean;
  enabledExchanges: string[];
  excludedTickers: string[];
  minSpread: number;
  minFunding: number;
  maxFunding: number;
  sameFundingTime: boolean;
  minFairRatio: number;
  maxFairRatio: number;
  isSettingsOpen: boolean;
}

const initialState: CryptoArbsSettingsState = loadInitialState();

export const cryptoArbsSettingsSlice = createSlice({
  name: 'cryptoArbsSettings',
  initialState,
  reducers: {
    setShowAll: (state, action: PayloadAction<boolean>) => {
      state.showAll = action.payload;
      localStorage.setItem('crypto-arbs-show-all', JSON.stringify(action.payload));
    },
    setEnabledExchanges: (state, action: PayloadAction<string[]>) => {
      state.enabledExchanges = action.payload;
      if (action.payload.length > 0) {
        localStorage.setItem('crypto-arbs-enabled-exchanges', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('crypto-arbs-enabled-exchanges');
      }
    },
    toggleExchange: (state, action: PayloadAction<string>) => {
      const exchange = action.payload;
      const index = state.enabledExchanges.indexOf(exchange);
      if (index > -1) {
        state.enabledExchanges.splice(index, 1);
      } else {
        state.enabledExchanges.push(exchange);
      }
      if (state.enabledExchanges.length > 0) {
        localStorage.setItem('crypto-arbs-enabled-exchanges', JSON.stringify(state.enabledExchanges));
      } else {
        localStorage.removeItem('crypto-arbs-enabled-exchanges');
      }
    },
    setExcludedTickers: (state, action: PayloadAction<string[]>) => {
      state.excludedTickers = action.payload;
      localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(action.payload));
    },
    addExcludedTicker: (state, action: PayloadAction<string>) => {
      if (!state.excludedTickers.includes(action.payload)) {
        state.excludedTickers.push(action.payload);
        localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(state.excludedTickers));
      }
    },
    removeExcludedTicker: (state, action: PayloadAction<string>) => {
      const index = state.excludedTickers.indexOf(action.payload);
      if (index > -1) {
        state.excludedTickers.splice(index, 1);
        localStorage.setItem('crypto-arbs-excluded-tickers', JSON.stringify(state.excludedTickers));
      }
    },
    setMinSpread: (state, action: PayloadAction<number>) => {
      state.minSpread = action.payload;
      localStorage.setItem('crypto-arbs-min-spread', action.payload.toString());
    },
    setMinFunding: (state, action: PayloadAction<number>) => {
      state.minFunding = action.payload;
      localStorage.setItem('crypto-arbs-min-funding', action.payload === -Infinity ? '' : action.payload.toString());
    },
    setMaxFunding: (state, action: PayloadAction<number>) => {
      state.maxFunding = action.payload;
      localStorage.setItem('crypto-arbs-max-funding', action.payload === Infinity ? '' : action.payload.toString());
    },
    setSameFundingTime: (state, action: PayloadAction<boolean>) => {
      state.sameFundingTime = action.payload;
      localStorage.setItem('crypto-arbs-same-funding-time', action.payload.toString());
    },
    setMinFairRatio: (state, action: PayloadAction<number>) => {
      state.minFairRatio = action.payload;
      localStorage.setItem('crypto-arbs-min-fair-ratio', action.payload === -Infinity ? '' : action.payload.toString());
    },
    setMaxFairRatio: (state, action: PayloadAction<number>) => {
      state.maxFairRatio = action.payload;
      localStorage.setItem('crypto-arbs-max-fair-ratio', action.payload === Infinity ? '' : action.payload.toString());
    },
    setIsSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.isSettingsOpen = action.payload;
    },
  },
});

export const {
  setShowAll,
  setEnabledExchanges,
  toggleExchange,
  setExcludedTickers,
  addExcludedTicker,
  removeExcludedTicker,
  setMinSpread,
  setMinFunding,
  setMaxFunding,
  setSameFundingTime,
  setMinFairRatio,
  setMaxFairRatio,
  setIsSettingsOpen,
} = cryptoArbsSettingsSlice.actions;

export default cryptoArbsSettingsSlice.reducer;

