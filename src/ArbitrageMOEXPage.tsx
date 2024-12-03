import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {DatePicker, Radio, Select, Space, TimeRangePickerProps} from "antd";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {Chart} from "./Chart";
import {calculateCandle} from "../symbolFuturePairs";
import moment from "moment";

const {RangePicker} = DatePicker

const fetchSecurities = () => fetch('https://apidev.alor.ru/md/v2/Securities?exchange=MOEX&limit=10000').then(r => r.json())

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf, fromDate, toDate) {
    const url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX&from=${fromDate}&to=${toDate}`;

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
        return data.history;
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

export const ArbitrageMOEXPage = () => {
    const [securities, setSecurities] = useState([]);
    const [stockData, setStockData] = useState([]);
    const [futureData, setFutureData] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const multiple = searchParams.get('multiple') || '100';
    const tickerStock = searchParams.get('ticker-stock') || 'SBER';
    const tickerFuture = searchParams.get('ticker-future') || 'SBRF-12.24';
    const tf = searchParams.get('tf') || '900';
    const fromDate = searchParams.get('fromDate') || moment().add(-60, 'day').unix();
    const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();

    useEffect(() => {
        fetchCandlesFromAlor(tickerStock, tf, fromDate, toDate).then(setStockData);
    }, [tf, tickerStock, fromDate, toDate]);

    useEffect(() => {
        fetchCandlesFromAlor(tickerFuture, tf, fromDate, toDate).then(setFutureData);
    }, [tf, tickerFuture, fromDate, toDate]);

    const data = useMemo(() => {
        if(stockData.length && futureData.length){
            const stockDataTimeSet = new Set(stockData.map(d => d.time));
            const filteredFutures = futureData.filter(f => stockDataTimeSet.has(f.time))
            const filteredFuturesSet = new Set(filteredFutures.map(d => d.time));

            const filteredStocks = stockData.filter(f => filteredFuturesSet.has(f.time))

        return filteredFutures.map((item, index) => calculateCandle(filteredStocks[index], item, Number(multiple))).filter(Boolean)
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

    const options = useMemo(() => securities
        .filter(s => !['Unknown'].includes(s.complexProductCategory)
            && !['TQIF', 'ROPD', 'TQIR', 'TQRD', 'TQPI', 'CETS', 'TQTF', 'TQCB', 'TQOB', 'FQBR'].includes(s.board))
        .sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
        label: s.symbol,
        value: s.symbol
    })), [securities]);

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
        fetchSecurities().then(setSecurities)
    }, []);
    return <>
        <Space>
            <Radio.Group value={tf} onChange={(e) => setSize(e.target.value)}>
                <Radio.Button value="300">5M</Radio.Button>
                <Radio.Button value="900">15M</Radio.Button>
                <Radio.Button value="1800">30M</Radio.Button>
                <Radio.Button value="3600">1H</Radio.Button>
                <Radio.Button value="14400">4H</Radio.Button>
                <Radio.Button value="D">D1</Radio.Button>
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
                options={options}
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
                options={options}
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