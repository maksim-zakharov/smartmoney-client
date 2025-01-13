import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, DatePicker, Radio, Row, Select, Slider, Space, TimeRangePickerProps} from "antd";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {Chart} from "./Chart";
import {calculateCandle} from "../../symbolFuturePairs";
import {getCommonCandles} from "../utils";
import {HistoryObject} from "../th_ultimate";

const {RangePicker} = DatePicker

const fetchSecurities = (category: 'inverse' | 'linear') => fetch(`https://api.bybit.com/v5/market/tickers?category=${category}`).then(r => r.json()).then(r => r.result.list)

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf, category: 'inverse' | 'linear', fromDate, toDate) {
    const url = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${symbol}&interval=${tf}&start=${fromDate * 1000}&end=${toDate * 1000}&limit=100000`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Ошибка при запросе данных");
        }

        const data = await response.json();

        if (!data.result?.list) {
            throw new Error("Ошибка при запросе данных");
        }
        return data.result.list.map(([time, open, high, low, close, volume]) => ({time: Number(time), open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume)}) as HistoryObject);
    } catch (error) {
        console.error("Ошибка получения данных:", error);
    }
}

async function recurciveCandles(symbol, tf, category: 'inverse' | 'linear', fromDate, toDate) {
    const candles = await fetchCandlesFromAlor(symbol, tf, category, fromDate, toDate);
    if(candles.length){
        const firstCandleTime =  candles[candles.length - 1].time / 1000;
        if(firstCandleTime > fromDate){
            const result = await recurciveCandles(symbol, tf, category, fromDate, firstCandleTime - 1)
            // debugger
            return candles.concat(result);
        }
    }
    return candles;
}

// Функция для расчета справедливой цены фьючерса
function calculateFairFuturePrice(stockPrice, riskFreeRate, timeToExpiration) {
    // Формула для справедливой цены фьючерса (без дивидендов)
    const fairFuturePrice = stockPrice * Math.pow((1 + riskFreeRate), timeToExpiration);
    return fairFuturePrice;
}

// Функция для проверки арбитражных возможностей
function checkArbitrageOpportunities(stockPrice, futuresPrice, riskFreeRate, timeToExpiration, threshold) {
    // Рассчитываем справедливую цену фьючерса
    const fairFuturePrice = calculateFairFuturePrice(stockPrice, riskFreeRate, timeToExpiration);

    // Разница между текущей ценой фьючерса и его справедливой ценой
    const priceDifference = futuresPrice - fairFuturePrice;

    // Проверяем, есть ли арбитражные возможности
    if (priceDifference > threshold) {
        console.log(`Арбитраж: фьючерс переоценён. Продать фьючерс, купить акцию. Разница: ${priceDifference.toFixed(2)}`);
    } else if (priceDifference < -threshold) {
        console.log(`Арбитраж: фьючерс недооценён. Купить фьючерс, продать акцию. Разница: ${priceDifference.toFixed(2)}`);
    } else {
        console.log('Нет арбитражных возможностей в данный момент.');
    }
}

export const ArbitrageBYBITPage = () => {
    const [inputTreshold, onChange] = useState(0.006);
    const [spotSecurities, setSpotSecurities] = useState([]);
    const [futureSecurities, setFutureSecurities] = useState([]);
    const [stockData, setStockData] = useState([]);
    const [futureData, setFutureData] = useState([]);
    const [chartValues, onChangeChart] = useState({filteredBuyMarkers: [], filteredSellMarkers: []});
    const [searchParams, setSearchParams] = useSearchParams();
    const multiple = searchParams.get('multiple') || '1';
    const tickerStock = searchParams.get('ticker-stock') || 'BTCUSD';
    const tickerFuture = searchParams.get('ticker-future') || 'BTCUSDT';
    const tf = searchParams.get('tf') || '60';
    const fromDate = searchParams.get('fromDate') || Math.floor(new Date('2024-10-01T00:00:00Z').getTime() / 1000);
    const toDate = searchParams.get('toDate') || Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000);

    useEffect(() => {
        recurciveCandles(tickerStock, tf, 'inverse', fromDate, toDate).then(setStockData);
    }, [tf, tickerStock, fromDate, toDate]);

    useEffect(() => {
        recurciveCandles(tickerFuture, tf, 'linear', fromDate, toDate).then(setFutureData);
    }, [tf, tickerFuture, fromDate, toDate]);

    const commonCandles = useMemo(() => getCommonCandles(stockData, futureData), [stockData, futureData]);

    const data = useMemo(() => {
        if(stockData.length && futureData.length){
            const {filteredStockCandles, filteredFuturesCandles} = commonCandles;

        return filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple))).filter(Boolean)
        }
        return stockData;
    }, [stockData, futureData, multiple, commonCandles]);

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
        setSearchParams(searchParams)
    }

    const onSelectTicker = (type: 'stock' | 'future') => (ticker) => {
        searchParams.set(`ticker-${type}`, ticker);
        setSearchParams(searchParams)
    }

    const onSelectMultiple = (ticker) => {
        searchParams.set(`multiple`, ticker);
        setSearchParams(searchParams)
    }

    const spotOptions = useMemo(() => spotSecurities
        .sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
        label: s.symbol,
        value: s.symbol
    })), [spotSecurities]);

    const futureOptions = useMemo(() => futureSecurities
        .sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
            label: s.symbol,
            value: s.symbol
        })), [futureSecurities]);

    const onChangeRangeDates = (value: Dayjs[], dateString) => {
        console.log('Selected Time: ', value);
        console.log('Formatted Selected Time: ', dateString);

        searchParams.set('fromDate', value[0].unix());
        searchParams.set('toDate', value[1].unix());
        setSearchParams(searchParams);
    }

    const profit = useMemo(() => {
        let PnL = 0;
        for (let i = 0; i < chartValues.filteredBuyMarkers.length; i++) {
            const marker = chartValues.filteredBuyMarkers[i];
            const stockCandle = commonCandles.filteredStockCandles[marker.index];
            PnL += inputTreshold; // (stockCandle.close * inputTreshold);
        }
        for (let i = 0; i < chartValues.filteredSellMarkers.length; i++) {
            const marker = chartValues.filteredSellMarkers[i];
            const stockCandle = commonCandles.filteredStockCandles[marker.index];
            PnL += inputTreshold; // (stockCandle.close * inputTreshold);
        }

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,  // Минимальное количество знаков после запятой
            maximumFractionDigits: 2,  // Максимальное количество знаков после запятой
        }).format(PnL * 100);
    }, [chartValues, inputTreshold, commonCandles])

    const rangePresets: TimeRangePickerProps['presets'] = [
        { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
        { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
        { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
        { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
    ];

    useEffect(() => {
        fetchSecurities('inverse').then(setSpotSecurities)
    }, []);
    useEffect(() => {
        fetchSecurities('linear').then(setFutureSecurities)
    }, []);
    return <>
        <Space>
            <Radio.Group value={tf} onChange={(e) => setSize(e.target.value)}>
                <Radio.Button value="5">5M</Radio.Button>
                <Radio.Button value="15">15M</Radio.Button>
                <Radio.Button value="30">30M</Radio.Button>
                <Radio.Button value="60">1H</Radio.Button>
            </Radio.Group>
            <Select
                value={tickerStock}
                showSearch
                placeholder="Введи тикер"
                onSelect={onSelectTicker('stock')}
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{width: 160}}
                options={spotOptions}
            />
            <Select
                value={tickerFuture}
                showSearch
                placeholder="Введи тикер"
                onSelect={onSelectTicker('future')}
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{width: 160}}
                options={futureOptions}
            />
            <Select
                value={multiple}
                onSelect={onSelectMultiple}
                style={{width: 160}}
                options={[{label: '1', value: 1,},
                    {label: '10', value: 10,},
                    {label: '100', value: 100,}]}
            />
            <RangePicker
                presets={rangePresets}
                value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                format="YYYY-MM-DD"
                onChange={onChangeRangeDates}/>
            {profit}%
        </Space>
        <Slider value={inputTreshold} min={0.001} max={0.03} step={0.001} onChange={onChange}/>
        <Chart data={data} tf={tf} inputTreshold={inputTreshold} onChange={onChangeChart}/>
    </>;
}