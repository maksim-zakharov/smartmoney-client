import {Table} from "antd";
import React, {FC, useMemo, useState} from "react";
import moment from "moment/moment";
import {Link, useSearchParams} from "react-router-dom";
import {moneyFormat} from "./MainPage.tsx";
import useWindowDimensions from "../useWindowDimensions.tsx";
import {calculateRR} from "../utils";

export const PositionsTable: FC<{
    pageSize: number,
    onSelect: (row: any) => void,
    positions: any[],
    accTradesOrdernoQtyMap: any
}> = ({pageSize, onSelect, positions, accTradesOrdernoQtyMap}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const symbol = searchParams.get("ticker") || "SBER";

    const [{fromDate, toDate}, setDates] = useState({
        fromDate: moment().add(-1, 'week').unix(),
        toDate: moment().unix(),
    });

    const {width} = useWindowDimensions();

    const _positions = useMemo(() => positions.map(p => ({
        ...p,
        RR: calculateRR(p)
    })), [positions]);

    const positionsColumns = [
        {
            title: "Тикер",
            dataIndex: "ticker",
            key: "ticker"
        },
        {
            title: "Паттерн",
            dataIndex: "pattern",
            key: "pattern"
        },
        width > 1200 && {
            title: "Время пересвипа",
            dataIndex: "liquidSweepTime",
            key: "liquidSweepTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        width > 1200 && {
            title: "Время ОБ",
            dataIndex: "orderblockTime",
            key: "orderblockTime",
            render: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        },
        width > 1200 && {
            title: "Вход",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value) => value?.price || "-"
        },
        {
            title: "Время",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value, row) => row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
        },
        {
            title: "Стоп-лосс",
            dataIndex: "stopLoss",
            key: "stopLoss",
            render: (value, row) => {
                if (!value?.stopPrice) {
                    return "-";
                }
                const openPrice = row.limitTrade?.price;
                const stopLoss = value?.stopPrice

                const side = openPrice > stopLoss ? 'buy' : 'sell';
                const percent = side === 'buy' ? openPrice / stopLoss : stopLoss / openPrice

                const PnL = side === 'buy' ? openPrice - stopLoss : stopLoss - openPrice;

                return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * (accTradesOrdernoQtyMap[row.limitTrade?.orderno] || row.limitTrade?.qtyUnits), 'RUB', 2, 2)})`;
            }
        },
        {
            title: "Тейк-профит",
            dataIndex: "takeProfit",
            key: "takeProfit",
            render: (value, row) => {
                if (!value?.stopPrice) {
                    return "-";
                }
                const openPrice = row.limitTrade?.price;
                const takeProfit = value?.stopPrice

                const side = openPrice > takeProfit ? 'buy' : 'sell';
                const percent = side === 'buy' ? openPrice / takeProfit : takeProfit / openPrice

                const PnL = side === 'buy' ? openPrice - takeProfit : takeProfit - openPrice;

                return `${value?.stopPrice} (${((percent - 1) * 100).toFixed(2)}%) (${moneyFormat(PnL * (accTradesOrdernoQtyMap[row.limitTrade?.orderno] || row.limitTrade?.qtyUnits), 'RUB', 2, 2)})`;
            }
        },
        {
            title: "RR",
            dataIndex: "RR",
            key: "RR",
            align: "right",
            render: (value) => value?.toFixed(2)
        },
        width > 1200 && {
            title: "Действия",
            render: (value, row) => {
                return <Link
                    to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2CnewSMT%2CsmartTrend%2CshowPositions&fromDate=${fromDate}&toDate=${toDate}`}
                    target="_blank">Тестер</Link>;
            }
        }
    ].filter(Boolean);

    return <Table size="small" dataSource={_positions} columns={positionsColumns}
                  pagination={{
                      pageSize,
                  }}
                  onRow={(record) => {
                      return {
                          onClick: () => onSelect(record),
                          className: "hoverable",
                          style: symbol === record.ticker ? {backgroundColor: "rgba(179, 199, 219, .2)"} : undefined
                      };
                  }}/>
}