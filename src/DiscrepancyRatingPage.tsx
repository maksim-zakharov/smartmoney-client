import {Space, Table} from "antd";
import {calculateCandle, calculateEMA, symbolFuturePairs} from "../symbolFuturePairs";
import {useEffect, useState} from "react";
import moment from "moment";
import {Link} from "react-router-dom";
import {calculateMultiple, fetchCandlesFromAlor, getCommonCandles} from "./utils";

export const DiscrepancyRatingPage = () => {
    const tf = '300'

    const [dataSource, setDataSource] = useState([]);

    const pairs = symbolFuturePairs;

    useEffect(() => {
        const interval = setInterval(async () => {
            const results = [];
            const from = moment().add(-30, 'day').unix();
            const to = moment().add(1, 'day').unix();

            for (const pair of pairs) {
                const [candles1, candles2] = await Promise.all([fetchCandlesFromAlor(pair.stockSymbol, tf, from, to), fetchCandlesFromAlor(`${pair.futuresSymbol}-12.24`, tf, from, to)])

                const {filteredStockCandles, filteredFuturesCandles} = getCommonCandles(candles1, candles2);
                
                if(filteredStockCandles[filteredStockCandles.length - 1] && filteredFuturesCandles[filteredFuturesCandles.length - 1]){
                    const stockPrice = filteredStockCandles[filteredStockCandles.length - 1].close
                    const futurePrice = filteredFuturesCandles[filteredFuturesCandles.length - 1].close;

                    const multiple = calculateMultiple(stockPrice, futurePrice);
                    const diffs = stockPrice / futurePrice;
                    let dif= diffs * multiple;

                    const data = filteredFuturesCandles.map((item, index) => calculateCandle(filteredStockCandles[index], item, Number(multiple))).filter(Boolean)

                    const ema = calculateEMA(
                        data.map((h) => h.close),
                        100
                    )[1]

                    const lastEma = ema[ema.length - 1];

                    const formatter = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 5,  // Минимальное количество знаков после запятой
                        maximumFractionDigits: 5,  // Максимальное количество знаков после запятой
                    });

                    results.push({
                        futuresShortName: pair.futuresShortName,
                        stockSymbol: pair.stockSymbol,
                        futureSymbol: `${pair.futuresSymbol}-12.24`,
                        stockPrice,
                        futurePrice,
                        multiple,
                        diffs: Number(formatter.format(dif)), ema: Number(formatter.format(lastEma)), realDiff: Number(formatter.format(Math.abs(dif - lastEma)))})
                }
            }
            setDataSource(results.sort((a, b) => b.realDiff - a.realDiff));
        }, 30000);

        return () => {
            clearInterval(interval);
        }
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
                    <Link to={`/arbitrage-moex?ticker-stock=${row.stockSymbol}&ticker-future=${row.futureSymbol}&multiple=${row.multiple}&tf=${tf}`} target="_blank">Раздвижка</Link>
                    <a href={`https://www.tradingview.com/chart/?symbol=ALOR%3A${row.stockSymbol}%2FALOR%3A${row.futuresShortName.replace('Z4', 'Z2024')}*${row.multiple}`} target="_blank">TradingView</a>
                    </Space>
            }
        },
    ];

    return <Table dataSource={dataSource} size="small" columns={columns} rowId="stockSymbol" pagination={{pageSize: dataSource.length}}/>
}