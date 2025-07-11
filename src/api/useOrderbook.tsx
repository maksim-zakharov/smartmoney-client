import { useEffect } from 'react';
import { Exchange, Format } from 'alor-api';
import { useAppSelector } from '../store';

export const useOrderbook = ({ from, code, tf, handler }) => {
  const apiAuth = useAppSelector((state) => state.alorSlice.apiAuth);
  const api = useAppSelector((state) => state.alorSlice.api);

  useEffect(() => {
    if (!apiAuth || !from) {
      return;
    }

    let unsubecribe;

    (async () => {
      unsubecribe = await api.subscriptions.candles(
        {
          tf,
          from,
          exchange: Exchange.MOEX,
          format: Format.Simple,
          code,
        },
        handler,
      );
    })();

    return () => unsubecribe?.();
  }, [apiAuth, api, from, code, tf, handler]);
};
