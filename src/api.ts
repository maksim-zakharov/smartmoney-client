import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";


import {HistoryObject} from "./sm-lib/models";

export interface Security {
    symbol: string;
    shortname: string;
    description: string;
    exchange: string;
    market: string;
    type: string;
    lotsize: number;
    facevalue: number;
    cfiCode: string;
    cancellation: Date;
    minstep: number;
    rating: number;
    marginbuy: number;
    marginsell: number;
    marginrate: number;
    pricestep: number;
    priceMax: number;
    priceMin: number;
    theorPrice: number;
    theorPriceLimit: number;
    volatility: number;
    currency: string;
    ISIN: string;
    yield: null;
    board: string;
    primary_board: string;
    tradingStatus: number;
    tradingStatusInfo: string;
    complexProductCategory: string;
    priceMultiplier: number;
    priceShownUnits: number;
}

export const api = createApi({
    reducerPath: "api",
    tagTypes: [
        "User"
    ],
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NODE_ENV !== 'production' ? "http://91.236.198.2:3000" : undefined
    }),
    endpoints: (builder) => ({
        candles: builder.query<{ candles: HistoryObject[] }, any>({
            query: (params) => ({
                url: "/api/candles",
                params
            })
        }),
        security: builder.query<Security, { symbol: string }>({
            query: (params) => ({
                url: "/api/security",
                params
            })
        }),
        portfolio: builder.query<any, any>({
            query: (params) => ({
                url: "/api/portfolio",
                params
            })
        }),
        orderblocks: builder.query<any, { symbol: string, tf: string, from: number, to: number }>({
            query: (params) => ({
                url: "/api/orderblocks",
                params
            })
        })
    })
});

export const {
    useCandlesQuery,
    useSecurityQuery,
    usePortfolioQuery,
    useOrderblocksQuery
} = api;