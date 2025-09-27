export interface MEXContractDetails {
  symbol: string;
  displayName: string;
  displayNameEn: string;
  positionOpenType: number;
  baseCoin: string;
  quoteCoin: QuoteCoin;
  baseCoinName: string;
  quoteCoinName: QuoteCoin;
  futureType: number;
  settleCoin: string;
  contractSize: number;
  minLeverage: number;
  maxLeverage: number;
  countryConfigContractMaxLeverage: number;
  priceScale: number;
  volScale: number;
  amountScale: number;
  priceUnit: number;
  volUnit: number;
  minVol: number;
  maxVol: number;
  bidLimitPriceRate: number;
  askLimitPriceRate: number;
  takerFeeRate: number;
  makerFeeRate: number;
  maintenanceMarginRate: number;
  initialMarginRate: number;
  riskBaseVol: number;
  riskIncrVol: number;
  riskLongShortSwitch: number;
  riskIncrMmr: number;
  riskIncrImr: number;
  riskLevelLimit: number;
  priceCoefficientVariation: number;
  indexOrigin: IndexOrigin[];
  state: number;
  isNew: boolean;
  isHot: boolean;
  isHidden: boolean;
  conceptPlate: ConceptPlate[];
  conceptPlateId: number[];
  riskLimitType: string;
  maxNumOrders: number[];
  marketOrderMaxLevel: number;
  marketOrderPriceLimitRate1: number;
  marketOrderPriceLimitRate2: number;
  triggerProtect: number;
  appraisal: number;
  showAppraisalCountdown: number;
  automaticDelivery: number;
  apiAllowed: boolean;
  depthStepList: string[];
  limitMaxVol: number;
  threshold: number;
  baseCoinIconUrl: string;
  id: number;
  vid: string;
  baseCoinId: string;
  createTime: number;
  openingTime: number;
  openingCountdownOption: number;
  showBeforeOpen: boolean;
  isMaxLeverage: boolean;
  isZeroFeeRate: boolean;
  riskLimitMode: string;
  isZeroFeeSymbol: boolean;
  liquidationFeeRate: number;
  feeRateMode: string;
  leverageFeeRates: any[];
  tieredFeeRates: any[];
  type: number;
  stopOnlyFair: boolean;
  deliveryTime?: number;
}

export enum ConceptPlate {
  McTradeZone0Fees = 'mc-trade-zone-0fees',
  McTradeZoneAI = 'mc-trade-zone-ai',
  McTradeZoneArbitrum = 'mc-trade-zone-Arbitrum',
  McTradeZoneBRC20 = 'mc-trade-zone-BRC20',
  McTradeZoneCEX = 'mc-trade-zone-CEX',
  McTradeZoneContractNew = 'mc-trade-zone-contract-new',
  McTradeZoneForex = 'mc-trade-zone-Forex',
  McTradeZoneGameFi = 'mc-trade-zone-GameFi',
  McTradeZoneLayer2 = 'mc-trade-zone-layer2',
  McTradeZoneMEME = 'mc-trade-zone-MEME',
  McTradeZoneMetaverse = 'mc-trade-zone-metaverse',
  McTradeZoneNft = 'mc-trade-zone-nft',
  McTradeZonePow = 'mc-trade-zone-pow',
  McTradeZonePreMarket = 'mc-trade-zone-PreMarket',
  McTradeZonePrivity = 'mc-trade-zone-privity',
  McTradeZoneRWA = 'mc-trade-zone-RWA',
  McTradeZoneSOL = 'mc-trade-zone-SOL',
  McTradeZoneStock = 'mc-trade-zone-Stock',
  McTradeZoneWeb3 = 'mc-trade-zone-web3',
}

export enum FeeRateMode {
  Normal = 'NORMAL',
}

export enum IndexOrigin {
  Binance = 'BINANCE',
  BinanceFuture = 'BINANCE_FUTURE',
  Bitfinex = 'BITFINEX',
  Bitget = 'BITGET',
  BitgetFuture = 'BITGET_FUTURE',
  Bitstamp = 'BITSTAMP',
  Bybit = 'BYBIT',
  BybitFuture = 'BYBIT_FUTURE',
  Coinbase = 'COINBASE',
  Gateio = 'GATEIO',
  HTX = 'HTX',
  Kraken = 'KRAKEN',
  Kucoin = 'KUCOIN',
  Mexc = 'MEXC',
  Okx = 'OKX',
  RealTimeUsStockQuote1 = 'REAL-TIME US STOCK QUOTE1',
  RealTimeUsStockQuote2 = 'REAL-TIME US STOCK QUOTE2',
}

export enum QuoteCoin {
  Usd = 'USD',
  Usdc = 'USDC',
  Usdt = 'USDT',
}

export enum MEXCOrderSide {
  CloseSell = 4,
  Sell = 3,
  CloseBuy = 2,
  Buy = 1,
}

export enum MEXCOrderType {
  Limit = 1,
  PostOnlyMarket = 2,
  Market = 5,
}

export enum MEXCOrderOpenType {
  Isolated = 1,
  Cross = 2,
}

export enum MEXCOrderState {
  Uninformed = 1,
  Uncompleted = 2,
  Completed = 3,
  Canceled = 4,
  Invalid = 5,
}

export enum MEXCPositionMode {
  Hedge = 1,
  OneWay = 2,
}

export enum MEXCPositionType {
  Long = 1,
  Short = 2,
}

export enum MEXCPositionState {
  Holding = 1,
  AutoHolding = 2,
  Closed = 3,
}

export interface MEXCPosition {
  positionId: number;
  symbol: string;
  positionType: MEXCPositionType;
  openType: MEXCOrderOpenType;
  state: MEXCPositionState;
  holdVol: number;
  frozenVol: number;
  closeVol: number;
  holdAvgPrice: number;
  holdAvgPriceFullyScale: string;
  openAvgPrice: number;
  openAvgPriceFullyScale: string;
  closeAvgPrice: number;
  liquidatePrice: number;
  oim: number;
  im: number;
  holdFee: number;
  realised: number;
  leverage: number;
  marginRatio: number;
  createTime: number;
  updateTime: number;
  autoAddIm: boolean;
  version: number;
  profitRatio: number;
  newOpenAvgPrice: number;
  newCloseAvgPrice: number;
  closeProfitLoss: number;
  fee: number;
  deductFeeList: [];
  totalFee: number;
  zeroSaveTotalFeeBinance: number;
  zeroTradeTotalFeeBinance: number;
}

export interface MEXCOrder {
  orderId: string;
  symbol: string;
  // Если 0 - не привязано к позиции
  positionId: number;
  price: number;
  priceStr: string;
  vol: number;
  leverage: number;
  side: MEXCOrderSide;
  category: number;
  orderType: MEXCOrderType;
  dealAvgPrice: number;
  dealAvgPriceStr: string;
  dealVol: number;
  orderMargin: number;
  takerFee: number;
  makerFee: number;
  profit: number;
  feeCurrency: string;
  openType: MEXCOrderOpenType;
  state: MEXCOrderState;
  externalOid: string;
  errorCode: number;
  usedMargin: number;
  createTime: number;
  updateTime: number;
  positionMode: MEXCPositionMode;
  reduceOnly: boolean;
  version: number;
  showCancelReason: number;
  showProfitRateShare: number;
  bboTypeNum: number;
  totalFee: number;
  zeroSaveTotalFeeBinance: number;
  zeroTradeTotalFeeBinance: number;
}

export enum MEXCResponseCode {
  Ok = 0,
  TooManyRequests = 510,
  NoMargin = 2005,
  InsufficientQuantity = 2008,
  PositionNotFound = 2009,
  // Кредитное плечо несовместимо с открытой позицией
  InvalidLeverage = 2021,
  // Бан аккаунта
  BAN = 6009,
  // У заявке объем меньше чем минимальный
  MinVolume = 7008,
  // Превышен максимальный объем
  MaxVolume = 8819,
}

export interface MEXCResponse<T> {
  success: boolean;
  code: MEXCResponseCode;
  message?: string;
  _extend?: any;
  data: T;
}

export interface MEXCCreateLimitOrderResponse {
  orderId: string;
  ts: number;
}

export interface MEXCCancelOrdersResponse {
  orderId: number;
  errorCode: number;
  errorMsg: string;
}

export interface MEXCContractDetail {
  symbol: string;
  displayName: string;
  displayNameEn: string;
  positionOpenType: number;
  baseCoin: string;
  quoteCoin: string;
  settleCoin: string;
  contractSize: number;
  minLeverage: number;
  maxLeverage: number;
  priceScale: number;
  volScale: number;
  amountScale: number;
  priceUnit: number;
  volUnit: number;
  minVol: number;
  maxVol: number;
  bidLimitPriceRate: number;
  askLimitPriceRate: number;
  takerFeeRate: number;
  makerFeeRate: number;
  maintenanceMarginRate: number;
  initialMarginRate: number;
  riskBaseVol: number;
  riskIncrVol: number;
  riskIncrMmr: number;
  riskIncrImr: number;
  riskLevelLimit: number;
  priceCoefficientVariation: number;
  indexOrigin: string[];
  state: number;
  isNew: boolean;
  isHot: boolean;
  isHidden: boolean;
  conceptPlate: string[];
  riskLimitType: string;
  maxNumOrders: number[];
  marketOrderMaxLevel: number;
  marketOrderPriceLimitRate1: number;
  marketOrderPriceLimitRate2: number;
  triggerProtect: number;
  appraisal: number;
  showAppraisalCountdown: number;
  automaticDelivery: number;
  apiAllowed: boolean;
}

export interface MEXCOrderRequest {
  marketCeiling: boolean;
  leverage: string;
  openType: MEXCOrderOpenType;
  positionMode: MEXCPositionMode;
  price: string;
  side: MEXCOrderSide;
  symbol: string;
  type: MEXCOrderType;
  vol: number;
  positionId?: number;
}

export interface MEXCFlashClosePositionRequest {
  leverage: string;
  openType: MEXCOrderOpenType;
  positionMode: MEXCPositionMode;
  side: MEXCOrderSide;
  symbol: string;
  type: MEXCOrderType;
  vol: number;
  positionId: number;
  flashClose: boolean;
  priceProtect: string;
  reduceOnly: boolean;
}

export interface MEXCLastPriceResponse {
  symbol: string;
  price: string;
}

export interface MexcSpotSymbol {
  id: string;
  mcd: Mcd;
  cd: string;
  vn: string;
  fn: string;
  srt: number;
  sts: number;
  tp: Tp;
  in: string;
  fot?: number;
  ot?: number;
  cp: Cp[];
  ci: number[];
  ps: number;
  qs: number;
  cdm: number;
  st: number;
  dst: number;
  tt: number;
  ca: string;
  fne: string;
}

export enum Cp {
  McTradeZone0Fees = 'mc-trade-zone-0fees',
  McTradeZoneAI = 'mc-trade-zone-ai',
  McTradeZoneAIAGENT = 'mc-trade-zone-AIAGENT',
  McTradeZoneArbitrum = 'mc-trade-zone-Arbitrum',
  McTradeZoneAssessment = 'mc-trade-zone-assessment',
  McTradeZoneBRC20 = 'mc-trade-zone-BRC20',
  McTradeZoneBTCECOS = 'mc-trade-zone-BTCECOS',
  McTradeZoneBTCInsp = 'mc-trade-zone-BTCInsp',
  McTradeZoneCEX = 'mc-trade-zone-CEX',
  McTradeZoneDePIN = 'mc-trade-zone-DePIN',
  McTradeZoneDesci = 'mc-trade-zone-desci',
  McTradeZoneGameFi = 'mc-trade-zone-GameFi',
  McTradeZoneInnovation = 'mc-trade-zone-innovation',
  McTradeZoneLayer2 = 'mc-trade-zone-layer2',
  McTradeZoneMEME = 'mc-trade-zone-MEME',
  McTradeZoneMainly = 'mc-trade-zone-mainly',
  McTradeZoneMetaverse = 'mc-trade-zone-metaverse',
  McTradeZoneNewlisting2 = 'mc-trade-zone-newlisting2',
  McTradeZoneNft = 'mc-trade-zone-nft',
  McTradeZonePow = 'mc-trade-zone-pow',
  McTradeZonePrivity = 'mc-trade-zone-privity',
  McTradeZoneRWA = 'mc-trade-zone-RWA',
  McTradeZoneSOL = 'mc-trade-zone-SOL',
  McTradeZoneStandalone = 'mc-trade-zone-standalone',
  McTradeZoneTON = 'mc-trade-zone-TON',
  McTradeZoneTRON = 'mc-trade-zone-TRON',
  McTradeZoneTrump = 'mc-trade-zone-Trump',
  McTradeZoneWLFI = 'mc-trade-zone-WLFI',
  McTradeZoneWeb3 = 'mc-trade-zone-web3',
  McTradeZoneXStocks = 'mc-trade-zone-xStocks',
  McTradeZoneZK = 'mc-trade-zone-ZK',
}

export enum Mcd {
  C207872Fd9934A37Acd75E30Cf0D566E = 'c207872fd9934a37acd75e30cf0d566e',
  C2Fbd0Fec371424992E46F9D8915Ae70 = 'c2fbd0fec371424992e46f9d8915ae70',
  Febc9973Be4D4D53Bb374476239Eb219 = 'febc9973be4d4d53bb374476239eb219',
  The128F589271Cb4951B03E71E6323Eb7Be = '128f589271cb4951b03e71e6323eb7be',
  The17E4Dc71Aef547Ec8C3C481C4Fdc4996 = '17e4dc71aef547ec8c3c481c4fdc4996',
  The34309140878B4Ae99F195Ac091D49Bab = '34309140878b4ae99f195ac091d49bab',
  The3E2Dd24F788D4D899386Fab956792733 = '3e2dd24f788d4d899386fab956792733',
  The93C38B0169214F8689763Ce9A63A73Ff = '93c38b0169214f8689763ce9a63a73ff',
}

export enum Tp {
  Assess = 'ASSESS',
  Main = 'MAIN',
  New = 'NEW',
}

export interface MexcTickerDayStatistic {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  prevClosePrice: string;
  lastPrice: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: null;
  openTime: number;
  closeTime: number;
  count: null;
}

export interface MexcTrade {
  id: null;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
  // ASK - Продажа маркетом по биду
  // BID - Покупка маркетом по аску
  tradeType: 'BID' | 'ASK';
}

export interface MexcOrderbook {
  asks: MexcOrderbookRow[];
  bids: MexcOrderbookRow[];
}
export interface MexcOrderbookRow {
  price: number;
  value: number;
}
