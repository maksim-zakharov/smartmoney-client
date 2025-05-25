import {Table} from "antd";
import React, {FC, useMemo, useState} from "react";
import moment from "moment/moment";
import {Link} from "react-router-dom";
import {moneyFormat, summ} from "./MainPage.tsx";
import useWindowDimensions from "../useWindowDimensions.tsx";

export const HistoryTable: FC<{pageSize: number, history: any[], onSelect: (row: any) => void, selectedPattern: string, getPatternKey: (row: any) => string}> = ({selectedPattern, getPatternKey, pageSize, history, onSelect}) => {
    const {width} = useWindowDimensions();

    const [{fromDate, toDate}, setDates] = useState({
        fromDate: moment().add(-1, 'week').unix(),
        toDate: moment().unix(),
    });

    const historyTableData = useMemo(() => {
        let data = history.map((p: any) => ({
            ...p,
            id: getPatternKey(p),
        }));

        const dayPositionsWithSummaryMap = {};
        for (let i = 0; i < data.length; i++) {
            const currentDay = moment(data[i].limitTrade?.date).format(
                'YYYY-MM-DD',
            );
            if (!dayPositionsWithSummaryMap[currentDay]) {
                const currentDayPositions = data.filter(
                    (p) => moment(p.limitTrade?.date).format('YYYY-MM-DD') === currentDay,
                );

                const profitTrades = currentDayPositions.filter(p => p.PnL > 0);
                const lossTrades = currentDayPositions.filter(p => p.PnL < 0);

                dayPositionsWithSummaryMap[currentDay] = [
                    {
                        type: 'summary',
                        PnL: summ(currentDayPositions.map((p) => p.PnL)),
                        openDate: currentDay,
                        stats: {
                            profitTrades,
                            lossTrades
                        }
                    },
                ];
                dayPositionsWithSummaryMap[currentDay].push(...currentDayPositions);
            }
        }

        data = Object.entries(dayPositionsWithSummaryMap)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, value]) => value)
            .flat();

        return data;
    }, [history]);

    const historyColumns = [
        {
            title: "Тикер",
            dataIndex: "ticker",
            key: "ticker"
        },
        width > 1200 && {
            title: "Паттерн",
            dataIndex: "pattern",
            key: "pattern"
        },
        width > 1200 && {
            title: "Тип",
            dataIndex: "side",
            key: "side",
            render: (value, row) => row?.type !== 'summary' ? row?.limitTrade?.side || "-" : ""
        },
        width > 1200 && {
            title: "Пересвип",
            dataIndex: "liquidSweepTime",
            key: "liquidSweepTime",
            render: (value, row) => row?.type !== 'summary' ? moment(value).format("YYYY-MM-DD HH:mm") : ""
        },
        width > 1200 && {
            title: "ОБ",
            dataIndex: "orderblockTime",
            key: "orderblockTime",
            render: (value, row) => row?.type !== 'summary' ? moment(value).format("YYYY-MM-DD HH:mm") : ""
        },
        width > 1200 && {
            title: "Вход",
            dataIndex: "limitTrade",
            key: "limitTrade",
            render: (value, row) => row?.type !== 'summary' ? value?.price || "-" : ""
        },
        {
            title: "Время",
            dataIndex: "limitTrade",
            key: "limitTrade",
            // colSpan: 2,
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 4 : 1,
            }),
            render: (value, row) => {
                if (row?.type !== 'summary') {
                    return row?.limitTrade?.date ? moment(row?.limitTrade?.date).format("YYYY-MM-DD HH:mm") : "-"
                }

                const formatDate = moment(row?.openDate).format('LL');

                const percent = row.stats.profitTrades.length * 100 / (row.stats.profitTrades.length + row.stats.lossTrades.length)

                return `${formatDate} Profits: ${row.stats.profitTrades.length} / Losses: ${row.stats.lossTrades.length} (Profit rate: ${percent.toFixed(0)}%)`
            }
        },
        {
            title: "Стоп цена",
            dataIndex: "stopLossTrade",
            key: "stopLossTrade",
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 0 : 1,
            }),
            render: (value, row) => {
                if (row.type === 'summary') {
                    return '';
                }
                if (!value?.price) {
                    return "-";
                }
                const percent = row.limitTrade?.price > value?.price ? row.limitTrade?.price / value?.price : value?.price / row.limitTrade?.price

                return `${value?.price} (${((percent - 1) * 100).toFixed(2)}%)`;
            }
        },
        {
            title: "Стоп время",
            dataIndex: "stopLossTrade",
            key: "stopLossTrade",
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 0 : 1,
            }),
            render: (value, row) => row?.type !== 'summary' ? value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-" : ""
        },
        {
            title: "Тейк цена",
            dataIndex: "takeProfitTrade",
            key: "takeProfitTrade",
            onCell: (row, index) => ({
                colSpan: row.type === 'summary' ? 0 : 1,
            }),
            render: (value, row) => {
                if (row.type === 'summary') {
                    return '';
                }
                if (!value?.price) {
                    return "-";
                }
                const percent = row.limitTrade?.price > value?.price ? row.limitTrade?.price / value?.price : value?.price / row.limitTrade?.price

                return `${value?.price} (${((percent - 1) * 100).toFixed(2)}%)`;
            }
        },
        {
            title: "Тейк время",
            dataIndex: "takeProfitTrade",
            key: "takeProfitTrade",
            render: (value, row) => row?.type !== 'summary' ? value?.date ? moment(value?.date).format("YYYY-MM-DD HH:mm") : "-" : ""
        },
        {
            title: "Финрез",
            dataIndex: "PnL",
            key: "PnL",
            align: "right",
            render: (value, row) => row.PnL ? moneyFormat(row.PnL, "RUB", 2, 2) : "-"
        },
        width > 1200 && {
            title: "Действия",
            render: (value, row) => {
                return row?.type !== 'summary' ?
                    <Link
                        to={`/test?ticker=${row.ticker}&checkboxes=showHiddenSwings%2CtradeOB%2CBOS%2Cswings%2CmoreBOS%2CshowEndOB%2CnewSMT%2CsmartTrend%2CshowPositions&fromDate=${fromDate}&toDate=${toDate}`}
                        target="_blank">Тестер</Link> : '';
            }
        }
    ].filter(Boolean);

    return <Table size="small" dataSource={historyTableData} columns={historyColumns as any} rowKey={getPatternKey}
                  pagination={{
                      pageSize,
                  }}
                  onRow={(record) => {
                      return {
                          style: getPatternKey(selectedPattern) === getPatternKey(record) ? {backgroundColor: "rgba(179, 199, 219, .2)"} : record.PnL < 0 ? {
                              backgroundColor: "#d1261b66",
                              color: "rgb(255, 117, 132)"
                          } : record.PnL > 0 ? {
                              backgroundColor: "#15785566",
                              color: "rgb(44, 232, 156)"
                          } : undefined,
                          onClick: () => onSelect(record),
                          className: "hoverable",
                      };
                  }}/>
}