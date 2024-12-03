import {Space, Table} from "antd";
import {symbolFuturePairs} from "../symbolFuturePairs";
import {useEffect, useState} from "react";
import moment from "moment";
import {Link} from "react-router-dom";

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

export const DiscrepancyRatingPage = () => {
    const tf = '300'

    const [dataSource, setDataSource] = useState([]);

    const pairs = symbolFuturePairs;

    useEffect(() => {
        setInterval(async () => {
            const results = [];
            for (const pair of pairs) {
                const candles1 = await fetchCandlesFromAlor(pair.stockSymbol, tf, moment().add(-1, 'hour').unix(), moment().add(1, 'day').unix())
                const candles2 = await fetchCandlesFromAlor(`${pair.futuresSymbol}-12.24`, tf, moment().add(-1, 'hour').unix(), moment().add(1, 'day').unix())
                const stockDataTimeSet = new Set(candles1.map(d => d.time));
                const filtered = candles2.filter(f => stockDataTimeSet.has(f.time))
                if(candles1[candles1.length - 1] && filtered[filtered.length - 1]){
                    const stockPrice = candles1[candles1.length - 1].close
                    const futurePrice = filtered[filtered.length - 1].close;

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
                    results.push({futuresShortName: pair.futuresShortName, stockSymbol: pair.stockSymbol, futureSymbol: `${pair.futuresSymbol}-12.24`, stockPrice, futurePrice,
                        diffsNumber,
                        diffs: dif})
                }
            }
            setDataSource(results.sort((a, b) => a.diffs - b.diffs));
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
            title: 'Расхождение',
            dataIndex: 'diffs',
            key: 'diffs',
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