import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, DatePicker, Radio, Row, Select, Slider, Space, TimeRangePickerProps} from "antd";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {Chart} from "./Chart";
import {HistoryObject} from "../api";

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

const calculateCandle = (futureCandle: HistoryObject, stockCandle: HistoryObject, multiple: number = 100) => {
if(!stockCandle){
    return null;
}if(!futureCandle){
    return null;
    }

    return {
       open: futureCandle.open / multiple / stockCandle.open,
       close: futureCandle.close / multiple / stockCandle.close,
       high: futureCandle.high / multiple / stockCandle.high,
       low: futureCandle.low / multiple / stockCandle.low,
       time: futureCandle.time,
    } as HistoryObject
}

export const ArbitrageBYBITPage = () => {
    const [spotSecurities, setSpotSecurities] = useState([]);
    const [futureSecurities, setFutureSecurities] = useState([]);
    const [stockData, setStockData] = useState([]);
    const [futureData, setFutureData] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const multiple = searchParams.get('multiple') || '1';
    const tickerStock = searchParams.get('ticker-stock') || 'BTCUSD';
    const tickerFuture = searchParams.get('ticker-future') || 'BTCUSDT';
    const tf = searchParams.get('tf') || '60';
    const fromDate = searchParams.get('fromDate') || Math.floor(new Date('2024-10-01T00:00:00Z').getTime() / 1000);
    const toDate = searchParams.get('toDate') || Math.floor(new Date('2024-12-31:00:00Z').getTime() / 1000);

    useEffect(() => {
        fetchCandlesFromAlor(tickerStock, tf, 'inverse', fromDate, toDate).then(setStockData);
    }, [tf, tickerStock, fromDate, toDate]);

    useEffect(() => {
        fetchCandlesFromAlor(tickerFuture, tf, 'linear', fromDate, toDate).then(setFutureData);
    }, [tf, tickerFuture, fromDate, toDate]);

    const data = useMemo(() => {
        if(stockData.length && futureData.length){
            const stockDataTimeSet = new Set(stockData.map(d => d.time));
            // debugger
            // Пример использования
            const stockPrice = 2200;  // Текущая цена акции Сбербанка
            const futuresPrice = 2250;  // Текущая цена фьючерса на Сбербанк
            const riskFreeRate = 0.05;  // Безрисковая ставка (5% годовых)
            const timeToExpiration = 0.25;  // Время до экспирации фьючерса (3 месяца)
            const threshold = 20;  // Порог для арбитража

// Проверка на наличие арбитражных возможностей
            checkArbitrageOpportunities(stockPrice, futuresPrice, riskFreeRate, timeToExpiration, threshold);

        return futureData.filter(f => stockDataTimeSet.has(f.time)).map((item, index) => calculateCandle(item, stockData[index], Number(multiple))).filter(Boolean)
        }
        return stockData;
    }, [stockData, futureData, multiple]);

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
                onChange={onChangeRangeDates} />
        </Space>
    <Chart data={data} tf={tf}/>
    </>
}