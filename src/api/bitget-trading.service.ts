/**
 * Интерфейс для размещения рыночного ордера на Bitget
 */
export interface BitgetPlaceMarketOrderParams {
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  secretKey: string;
  /** Passphrase */
  passphrase: string;
  /** Символ (например, BTCUSDT) */
  symbol: string;
  /** Сторона ордера: BUY или SELL */
  side: 'BUY' | 'SELL';
  /** Количество в долларах */
  usdAmount: number;
}

/**
 * Интерфейс ответа при размещении ордера
 */
export interface BitgetPlaceOrderResponse {
  /** Код ответа */
  code: string;
  /** Сообщение */
  msg: string;
  /** Данные ордера */
  data?: {
    /** ID ордера */
    orderId: string;
  };
}

/**
 * Сервис для торговли на Bitget
 */
export class BitgetTradingService {
  private readonly backendUrl: string;

  constructor(backendUrl: string = 'http://5.35.13.149') {
    this.backendUrl = backendUrl;
  }

  /**
   * Размещает рыночный ордер на Bitget
   */
  async placeMarketOrder(params: BitgetPlaceMarketOrderParams): Promise<BitgetPlaceOrderResponse> {
    const { apiKey, secretKey, passphrase, symbol, side, usdAmount } = params;

    // Формируем данные для запроса
    const orderData: any = {
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'isolated',
      marginCoin: 'USDT',
      side: side.toLowerCase(),
      orderType: 'market',
      // Для рыночного ордера количество будет рассчитано на бекенде на основе usdAmount
      usdAmount,
    };

    const targetUrl = 'https://api.bitget.com/api/v2/mix/order/place-order';

    // Отправляем через общий прокси
    const response = await fetch(
      `${this.backendUrl}/proxy?url=${encodeURIComponent(targetUrl)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ACCESS-KEY': apiKey,
          'ACCESS-TIMESTAMP': Date.now().toString(),
          'ACCESS-PASSPHRASE': passphrase,
        },
        body: JSON.stringify({
          ...orderData,
          _apiKey: apiKey,
          _secretKey: secretKey,
          _passphrase: passphrase,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Ошибка при размещении ордера',
      }));
      throw new Error(error.message || 'Ошибка при размещении ордера');
    }

    return await response.json();
  }
}

