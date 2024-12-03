import {Space, Table} from "antd";
import {calculateCandle, calculateEMA, symbolFuturePairs} from "../symbolFuturePairs";
import {useEffect, useState} from "react";
import moment from "moment";
import {Link} from "react-router-dom";

// Функция для получения данных из Alor API
async function fetchCandlesFromAlor(symbol, tf, fromDate, toDate, limit?) {
    let url = `https://api.alor.ru/md/v2/history?tf=${tf}&symbol=${symbol}&exchange=MOEX&from=${fromDate}&to=${toDate}`;
    if(limit){
        url += `&limit=${limit}`;
    }

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

export const DiscrepancyRatingPage = () => {
    const tf = '300'

    const [dataSource, setDataSource] = useState([]);

    const pairs = symbolFuturePairs;

    useEffect(() => {
        setInterval(async () => {
            const results = [];
            for (const pair of pairs) {
                const candles1 = await fetchCandlesFromAlor(pair.stockSymbol, tf, moment().add(-1, 'week').unix(), moment().add(1, 'day').unix(), 110)
                const candles2 = await fetchCandlesFromAlor(`${pair.futuresSymbol}-12.24`, tf, moment().add(-1, 'week').unix(), moment().add(1, 'day').unix(), 110)

                const stockDataTimeSet = new Set(candles1.map(d => d.time));
                const filteredFutures = candles2.filter(f => stockDataTimeSet.has(f.time))
                const filteredFuturesSet = new Set(filteredFutures.map(d => d.time));

                const filteredStocks = candles1.filter(f => filteredFuturesSet.has(f.time))
                
                if(candles1[candles1.length - 1] && filteredFutures[filteredFutures.length - 1]){
                    const stockPrice = candles1[candles1.length - 1].close
                    const futurePrice = filteredFutures[filteredFutures.length - 1].close;

                    const diffs = stockPrice / futurePrice;
                    let dif;
                    let diffsNumber = 1;
                    if(diffs < 0.00009){
                        diffsNumber = 100000;
                        dif= diffs * 100000;
                    }
                    else if(diffs < 0.0009){
                        diffsNumber = 10000;
                        dif= diffs * 10000;
                    }
                    else if(diffs < 0.009){
                        diffsNumber = 1000;
                        dif= diffs * 1000;
                    }
                    else if(diffs < 0.09){
                        diffsNumber = 100;
                        dif= diffs * 100;
                    }
                    else if(diffs < 0.9){
                        diffsNumber = 10;
                        dif= diffs * 10;
                    }
                    else {
                        dif = diffs
                    }

                    const data = filteredFutures.map((item, index) => calculateCandle(filteredStocks[index], item, Number(diffsNumber))).filter(Boolean)

                    const ema = calculateEMA(
                        data.map((h) => h.close),
                        100
                    )[1]

                    const lastEma = ema[ema.length - 1];

                    const formatter = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 5,  // Минимальное количество знаков после запятой
                        maximumFractionDigits: 5,  // Максимальное количество знаков после запятой
                    });

                    results.push({futuresShortName: pair.futuresShortName, stockSymbol: pair.stockSymbol, futureSymbol: `${pair.futuresSymbol}-12.24`, stockPrice, futurePrice,
                        diffsNumber,
                        diffs: Number(formatter.format(dif)), ema: Number(formatter.format(lastEma)), realDiff: Number(formatter.format(Math.abs(dif - lastEma)))})
                }
            }
            setDataSource(results.sort((a, b) => b.realDiff - a.realDiff));
        }, 15000);
    }, [])

    const columns = [
        {
            title: 'Тикер акции',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'Тикер фьючерса',
            dataIndex: 'futureSymbol',
            key: 'futureSymbol',
        },
        {
            title: 'Цена акции',
            dataIndex: 'stockPrice',
            key: 'stockPrice',
        },
        {
            title: 'Цена фьючерса',
            dataIndex: 'futurePrice',
            key: 'futurePrice',
        },
        {
            title: 'Базовое расхождение',
            dataIndex: 'diffs',
            key: 'diffs',
        },
        {
            title: 'EMA 100',
            dataIndex: 'ema',
            key: 'ema',
        },
        {
            title: 'Реальное расхождение',
            dataIndex: 'realDiff',
            key: 'realDiff',
        },
        {
            title: 'Ссылка',
            dataIndex: 'diffs',
            key: 'diffs',
            render: (_, row) => {
                return <Space>
                    <Link to={`/arbitrage-moex?ticker-stock=${row.stockSymbol}&ticker-future=${row.futureSymbol}&multiple=${row.diffsNumber}&tf=${tf}`} target="_blank">Раздвижка</Link>
                    <a href={`https://www.tradingview.com/chart/?symbol=ALOR%3A${row.stockSymbol}%2FALOR%3A${row.futuresShortName.replace('Z4', 'Z2024')}*${row.diffsNumber}`} target="_blank">TradingView</a>
                    </Space>
            }
        },
    ];

    return <Table dataSource={dataSource} size="small" columns={columns} rowId="stockSymbol" pagination={{pageSize: dataSource.length}}/>
}