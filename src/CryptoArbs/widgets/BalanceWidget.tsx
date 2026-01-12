import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { exchangeImgMap } from '../../utils';
import {
  useGetMEXCBalanceQuery,
  useGetOurbitBalanceQuery,
  useGetKCEXBalanceQuery,
  useGetBybitBalanceQuery,
  useGetBinanceBalanceQuery,
  useGetOKXBalanceQuery,
  useGetBitgetBalanceQuery,
  useGetGateBalanceQuery,
  useGetBitmartBalanceQuery,
} from '../../api/trading.api';

export interface ExchangeBalance {
  /** Биржа */
  exchange: string;
  /** Общий баланс (equity) */
  totalBalance: number | null;
  /** Доступная маржа (availableBalance или availableMargin) */
  availableMargin: number | null;
  /** Статус загрузки (только для первой загрузки) */
  isLoading: boolean;
  /** Флаг ошибки */
  hasError: boolean;
}

interface BalanceWidgetProps {
  /** Callback для передачи балансов наружу (опционально) */
  onBalancesChange?: (balances: ExchangeBalance[]) => void;
}

export const BalanceWidget: React.FC<BalanceWidgetProps> = ({ onBalancesChange }) => {
  const [balances, setBalances] = useState<ExchangeBalance[]>([]);

  const getExchangeApiKeys = (exchange: string) => {
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
          authToken: localStorage.getItem('mexcAuthToken') || localStorage.getItem('mexcUid'),
        };
      case 'OKX':
        return {
          apiKey: localStorage.getItem('okxApiKey'),
          secretKey: localStorage.getItem('okxApiSecret'),
          passphrase: localStorage.getItem('okxApiPhrase'),
        };
      default:
        return {};
    }
  };

  // Получаем ключи для всех бирж
  const mexcKeys = useMemo(() => getExchangeApiKeys('MEXC'), []);
  const ourbitKeys = useMemo(() => getExchangeApiKeys('OURBIT'), []);
  const kcexKeys = useMemo(() => getExchangeApiKeys('KCEX'), []);
  const bybitKeys = useMemo(() => getExchangeApiKeys('BYBIT'), []);
  const binanceKeys = useMemo(() => getExchangeApiKeys('BINANCE'), []);
  const okxKeys = useMemo(() => getExchangeApiKeys('OKX'), []);
  const bitgetKeys = useMemo(() => getExchangeApiKeys('BITGET'), []);
  const gateKeys = useMemo(() => getExchangeApiKeys('GATEIO'), []);
  const bitmartKeys = useMemo(() => getExchangeApiKeys('BITMART'), []);

  // RTK Query запросы с pollingInterval и skip
  const mexcBalance = useGetMEXCBalanceQuery(
    { authToken: mexcKeys.authToken || '' },
    {
      skip: !mexcKeys.authToken,
      pollingInterval: 5000,
    },
  );
  const ourbitBalance = useGetOurbitBalanceQuery(
    { authToken: ourbitKeys.authToken || '' },
    {
      skip: !ourbitKeys.authToken,
      pollingInterval: 5000,
    },
  );
  const kcexBalance = useGetKCEXBalanceQuery(
    { authToken: kcexKeys.authToken || '' },
    {
      skip: !kcexKeys.authToken,
      pollingInterval: 5000,
    },
  );
  const bybitBalance = useGetBybitBalanceQuery(
    { apiKey: bybitKeys.apiKey || '', secretKey: bybitKeys.secretKey || '' },
    {
      skip: !bybitKeys.apiKey || !bybitKeys.secretKey,
      pollingInterval: 5000,
    },
  );
  const binanceBalance = useGetBinanceBalanceQuery(
    { apiKey: binanceKeys.apiKey || '', secretKey: binanceKeys.secretKey || '' },
    {
      skip: !binanceKeys.apiKey || !binanceKeys.secretKey,
      pollingInterval: 5000,
    },
  );
  const okxBalance = useGetOKXBalanceQuery(
    { apiKey: okxKeys.apiKey || '', secretKey: okxKeys.secretKey || '', passphrase: okxKeys.passphrase || '' },
    {
      skip: !okxKeys.apiKey || !okxKeys.secretKey || !okxKeys.passphrase,
      pollingInterval: 5000,
    },
  );
  const bitgetBalance = useGetBitgetBalanceQuery(
    { apiKey: bitgetKeys.apiKey || '', secretKey: bitgetKeys.secretKey || '', passphrase: bitgetKeys.passphrase || '' },
    {
      skip: !bitgetKeys.apiKey || !bitgetKeys.secretKey || !bitgetKeys.passphrase,
      pollingInterval: 5000,
    },
  );
  const gateBalance = useGetGateBalanceQuery(
    { apiKey: gateKeys.apiKey || '', secretKey: gateKeys.secretKey || '' },
    {
      skip: !gateKeys.apiKey || !gateKeys.secretKey,
      pollingInterval: 5000,
    },
  );
  const bitmartBalance = useGetBitmartBalanceQuery(
    { apiKey: bitmartKeys.apiKey || '', secretKey: bitmartKeys.secretKey || '', passphrase: bitmartKeys.passphrase || '' },
    {
      skip: !bitmartKeys.apiKey || !bitmartKeys.secretKey || !bitmartKeys.passphrase,
      pollingInterval: 5000,
    },
  );

  // Объединяем все балансы
  useEffect(() => {
    const allBalances: ExchangeBalance[] = [];

    // MEXC
    if (mexcKeys.authToken) {
      allBalances.push({
        exchange: 'MEXC',
        totalBalance: mexcBalance.data?.success && mexcBalance.data?.data
          ? (() => {
              const usdtAsset = mexcBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.equity || usdtAsset.cashBalance || 0) : 0;
            })()
          : null,
        availableMargin: mexcBalance.data?.success && mexcBalance.data?.data
          ? (() => {
              const usdtAsset = mexcBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.availableBalance || usdtAsset.availableOpen || 0) : 0;
            })()
          : null,
        isLoading: mexcBalance.isLoading,
        hasError: mexcBalance.isError,
      });
    }

    // Ourbit
    if (ourbitKeys.authToken) {
      allBalances.push({
        exchange: 'OURBIT',
        totalBalance: ourbitBalance.data?.success && ourbitBalance.data?.data
          ? (() => {
              const usdtAsset = ourbitBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.equity || usdtAsset.cashBalance || 0) : 0;
            })()
          : null,
        availableMargin: ourbitBalance.data?.success && ourbitBalance.data?.data
          ? (() => {
              const usdtAsset = ourbitBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.availableBalance || usdtAsset.availableOpen || 0) : 0;
            })()
          : null,
        isLoading: ourbitBalance.isLoading,
        hasError: ourbitBalance.isError,
      });
    }

    // KCEX
    if (kcexKeys.authToken) {
      allBalances.push({
        exchange: 'KCEX',
        totalBalance: kcexBalance.data?.success && kcexBalance.data?.data
          ? (() => {
              const usdtAsset = kcexBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.equity || usdtAsset.cashBalance || 0) : 0;
            })()
          : null,
        availableMargin: kcexBalance.data?.success && kcexBalance.data?.data
          ? (() => {
              const usdtAsset = kcexBalance.data.data.find((asset: any) => asset.currency === 'USDT');
              return usdtAsset ? (usdtAsset.availableBalance || usdtAsset.availableOpen || 0) : 0;
            })()
          : null,
        isLoading: kcexBalance.isLoading,
        hasError: kcexBalance.isError,
      });
    }

    // Bybit
    if (bybitKeys.apiKey && bybitKeys.secretKey) {
      allBalances.push({
        exchange: 'BYBIT',
        totalBalance: bybitBalance.data?.retCode === 0 && bybitBalance.data?.result?.list?.[0]?.coin
          ? (() => {
              // Bybit возвращает { retCode: 0, result: { list: [{ accountType: 'UNIFIED', coin: [{ coin: 'USDT', equity: '288.63', walletBalance: '288.63' }] }] } }
              const account = bybitBalance.data.result.list[0];
              if (account && Array.isArray(account.coin)) {
                const usdtCoin = account.coin.find((c: any) => c.coin === 'USDT');
                return usdtCoin ? parseFloat(usdtCoin.equity || usdtCoin.walletBalance || '0') : 0;
              }
              return 0;
            })()
          : null,
        availableMargin: bybitBalance.data?.retCode === 0 && bybitBalance.data?.result?.list?.[0]?.coin
          ? (() => {
              const account = bybitBalance.data.result.list[0];
              if (account && Array.isArray(account.coin)) {
                const usdtCoin = account.coin.find((c: any) => c.coin === 'USDT');
                // Используем walletBalance - locked для доступного баланса, или availableToWithdraw если есть
                if (usdtCoin) {
                  const walletBalance = parseFloat(usdtCoin.walletBalance || '0');
                  const locked = parseFloat(usdtCoin.locked || '0');
                  const available = walletBalance - locked;
                  return available > 0 ? available : parseFloat(usdtCoin.availableToWithdraw || '0');
                }
              }
              return 0;
            })()
          : null,
        isLoading: bybitBalance.isLoading,
        hasError: bybitBalance.isError || (bybitBalance.data?.retCode !== undefined && bybitBalance.data?.retCode !== 0),
      });
    }

    // Binance
    if (binanceKeys.apiKey && binanceKeys.secretKey) {
      allBalances.push({
        exchange: 'BINANCE',
        totalBalance: Array.isArray(binanceBalance.data)
          ? (() => {
              // Binance возвращает массив балансов: [{ asset: 'USDT', balance: '100', availableBalance: '50' }]
              const usdtBalance = binanceBalance.data.find((acc: any) => acc.asset === 'USDT');
              return usdtBalance ? parseFloat(usdtBalance.balance || '0') : 0;
            })()
          : null,
        availableMargin: Array.isArray(binanceBalance.data)
          ? (() => {
              const usdtBalance = binanceBalance.data.find((acc: any) => acc.asset === 'USDT');
              return usdtBalance ? parseFloat(usdtBalance.availableBalance || '0') : 0;
            })()
          : null,
        isLoading: binanceBalance.isLoading,
        hasError: binanceBalance.isError,
      });
    }

    // OKX
    if (okxKeys.apiKey && okxKeys.secretKey && okxKeys.passphrase) {
      allBalances.push({
        exchange: 'OKX',
        totalBalance: okxBalance.data?.code === '0' && Array.isArray(okxBalance.data?.data) && okxBalance.data.data.length > 0
          ? (() => {
              // OKX возвращает { code: "0", data: [{ details: [{ ccy: 'USDT', eq: '200.10', availEq: '200.10' }], totalEq: '199.84' }] }
              const account = okxBalance.data.data[0];
              if (account && Array.isArray(account.details)) {
                const usdtDetail = account.details.find((detail: any) => detail.ccy === 'USDT');
                // Используем eq из details или totalEq из account
                if (usdtDetail) {
                  return parseFloat(usdtDetail.eq || account.totalEq || '0');
                }
                // Если USDT не найден в details, используем totalEq
                return parseFloat(account.totalEq || '0');
              }
              return 0;
            })()
          : null,
        availableMargin: okxBalance.data?.code === '0' && Array.isArray(okxBalance.data?.data) && okxBalance.data.data.length > 0
          ? (() => {
              const account = okxBalance.data.data[0];
              if (account && Array.isArray(account.details)) {
                const usdtDetail = account.details.find((detail: any) => detail.ccy === 'USDT');
                // Используем availEq или availBal из details
                if (usdtDetail) {
                  return parseFloat(usdtDetail.availEq || usdtDetail.availBal || '0');
                }
              }
              return 0;
            })()
          : null,
        isLoading: okxBalance.isLoading,
        hasError: okxBalance.isError || (okxBalance.data?.code !== undefined && okxBalance.data?.code !== '0'),
      });
    }

    // Bitget
    if (bitgetKeys.apiKey && bitgetKeys.secretKey && bitgetKeys.passphrase) {
      allBalances.push({
        exchange: 'BITGET',
        totalBalance: bitgetBalance.data?.code === '00000' && Array.isArray(bitgetBalance.data?.data)
          ? (() => {
              // Bitget возвращает { code: "00000", data: [{ coin: 'USDT', equity: '100', available: '50' }] }
              const usdtAccount = bitgetBalance.data.data.find((acc: any) => acc.coin === 'USDT');
              return usdtAccount ? parseFloat(usdtAccount.equity || '0') : 0;
            })()
          : null,
        availableMargin: bitgetBalance.data?.code === '00000' && Array.isArray(bitgetBalance.data?.data)
          ? (() => {
              const usdtAccount = bitgetBalance.data.data.find((acc: any) => acc.coin === 'USDT');
              return usdtAccount ? parseFloat(usdtAccount.available || '0') : 0;
            })()
          : null,
        isLoading: bitgetBalance.isLoading,
        hasError: bitgetBalance.isError || (bitgetBalance.data?.code !== undefined && bitgetBalance.data?.code !== '00000'),
      });
    }

    // Gate
    if (gateKeys.apiKey && gateKeys.secretKey) {
      allBalances.push({
        exchange: 'GATEIO',
        totalBalance: gateBalance.data
          ? (() => {
              // Gate возвращает объект или массив объектов
              // Если массив - ищем USDT, если объект - проверяем currency
              if (Array.isArray(gateBalance.data)) {
                const usdtAccount = gateBalance.data.find((acc: any) => acc.currency === 'USDT');
                return usdtAccount ? parseFloat(usdtAccount.total || '0') : 0;
              } else if (gateBalance.data.currency === 'USDT') {
                // Формат: { currency: 'USDT', total: '183.38', available: '158.51', ... }
                return parseFloat(gateBalance.data.total || '0');
              }
              return 0;
            })()
          : null,
        availableMargin: gateBalance.data
          ? (() => {
              if (Array.isArray(gateBalance.data)) {
                const usdtAccount = gateBalance.data.find((acc: any) => acc.currency === 'USDT');
                return usdtAccount ? parseFloat(usdtAccount.available || usdtAccount.cross_available || '0') : 0;
              } else if (gateBalance.data.currency === 'USDT') {
                // Используем cross_available если есть, иначе available
                return parseFloat(gateBalance.data.cross_available || gateBalance.data.available || '0');
              }
              return 0;
            })()
          : null,
        isLoading: gateBalance.isLoading,
        hasError: gateBalance.isError,
      });
    }

    // Bitmart
    if (bitmartKeys.apiKey && bitmartKeys.secretKey && bitmartKeys.passphrase) {
      allBalances.push({
        exchange: 'BITMART',
        totalBalance: bitmartBalance.data?.code === 1000 && Array.isArray(bitmartBalance.data?.data)
          ? (() => {
              // Bitmart возвращает { code: 1000, data: [{ currency: 'USDT', equity: '100', available_balance: '50' }] }
              const usdtAccount = bitmartBalance.data.data.find((acc: any) => acc.currency === 'USDT');
              return usdtAccount ? parseFloat(usdtAccount.equity || '0') : 0;
            })()
          : null,
        availableMargin: bitmartBalance.data?.code === 1000 && Array.isArray(bitmartBalance.data?.data)
          ? (() => {
              const usdtAccount = bitmartBalance.data.data.find((acc: any) => acc.currency === 'USDT');
              return usdtAccount ? parseFloat(usdtAccount.available_balance || '0') : 0;
            })()
          : null,
        isLoading: bitmartBalance.isLoading,
        hasError: bitmartBalance.isError || (bitmartBalance.data?.code !== undefined && bitmartBalance.data?.code !== 1000),
      });
    }

    setBalances(allBalances);
    if (onBalancesChange) {
      onBalancesChange(allBalances);
    }
  }, [
    mexcBalance.data,
    mexcBalance.isLoading,
    mexcBalance.isError,
    ourbitBalance.data,
    ourbitBalance.isLoading,
    ourbitBalance.isError,
    kcexBalance.data,
    kcexBalance.isLoading,
    kcexBalance.isError,
    bybitBalance.data,
    bybitBalance.isLoading,
    bybitBalance.isError,
    binanceBalance.data,
    binanceBalance.isLoading,
    binanceBalance.isError,
    okxBalance.data,
    okxBalance.isLoading,
    okxBalance.isError,
    bitgetBalance.data,
    bitgetBalance.isLoading,
    bitgetBalance.isError,
    gateBalance.data,
    gateBalance.isLoading,
    gateBalance.isError,
    bitmartBalance.data,
    bitmartBalance.isLoading,
    bitmartBalance.isError,
    onBalancesChange,
  ]);

  const numberFormat2 = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Table wrapperClassName="pt-1 col-span-2 h-[250px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px] text-left" colSpan={3}>
            <span>Баланс</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableHeader className="bg-[rgb(36,52,66)]">
        <TableRow>
          <TableHead className="w-[200px]">Биржа</TableHead>
          <TableHead className="text-right">Общий баланс</TableHead>
          <TableHead className="text-right">Доступная маржа</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {balances.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-[11px] text-muted-foreground">
              Нет бирж с настроенными API ключами
            </TableCell>
          </TableRow>
        ) : (
          balances.map((balance, index) => {
            const exchangeIcon = exchangeImgMap[balance.exchange.toUpperCase()];
            return (
              <TableRow key={balance.exchange} className={cn(index % 2 ? 'rowOdd' : 'rowEven')}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {exchangeIcon && <img src={exchangeIcon} alt={balance.exchange} className="h-3.5 w-3.5 rounded-full" />}
                    <span>{balance.exchange}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {balance.isLoading ? (
                    <span className="text-muted-foreground">—</span>
                  ) : balance.hasError ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    numberFormat2.format(balance.totalBalance ?? 0)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {balance.isLoading ? (
                    <span className="text-muted-foreground">—</span>
                  ) : balance.hasError ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    numberFormat2.format(balance.availableMargin ?? 0)
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

