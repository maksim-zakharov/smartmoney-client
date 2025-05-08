import {Card, Col, Row, Statistic} from "antd";
import React, {FC, useMemo} from "react";
import useWindowDimensions from "../useWindowDimensions.tsx";
import {moneyFormat} from "./MainPage.tsx";
import moment from "moment/moment";

export const StatisticWidgets: FC<{fromDate: number, toDate: number, history: any[], timeframeLabelMap: any}> = ({fromDate, toDate, history, timeframeLabelMap}) => {
    const {width} = useWindowDimensions();

    const filteredHistory = history.filter(c => moment(c.limitTrade?.date).unix() >= fromDate && moment(c.limitTrade?.date).unix() <= toDate);

    const timeframes = useMemo(() => Array.from(new Set(filteredHistory.filter(p => p.timeframe).map(p => p.timeframe))).sort((a, b) => a - b), [filteredHistory]);


    const names = useMemo(() => Array.from(new Set(filteredHistory.filter(p => p.pattern).map(p => p.pattern))).sort((a, b) => a - b), [filteredHistory]);


    const NametotalPnL = useMemo(() => filteredHistory.filter(p => p.PnL).reduce((acc, curr) => {
        if (!acc[curr.pattern]) {
            acc[curr.pattern] = 0;
        }
        acc[curr.pattern] += curr.PnL;
        return acc;
    }, {}), [filteredHistory])
    const Namelosses = useMemo(() => filteredHistory.filter(p => p.PnL < 0).reduce((acc, curr) => {
        if (!acc[curr.pattern]) {
            acc[curr.pattern] = 0;
        }
        acc[curr.pattern]++;
        return acc;
    }, {}), [filteredHistory])
    const Nameprofits = useMemo(() => filteredHistory.filter(p => p.PnL > 0).reduce((acc, curr) => {
        if (!acc[curr.pattern]) {
            acc[curr.pattern] = 0;
        }
        acc[curr.pattern]++;
        return acc;
    }, {}), [filteredHistory])

    const totalPnL = useMemo(() => filteredHistory.filter(p => p.PnL).reduce((acc, curr) => {
        if (!acc[curr.timeframe]) {
            acc[curr.timeframe] = 0;
        }
        acc[curr.timeframe] += curr.PnL;
        return acc;
    }, {}), [filteredHistory])
    const losses = useMemo(() => filteredHistory.filter(p => p.PnL < 0).reduce((acc, curr) => {
        if (!acc[curr.timeframe]) {
            acc[curr.timeframe] = 0;
        }
        acc[curr.timeframe]++;
        return acc;
    }, {}), [filteredHistory])
    const profits = useMemo(() => filteredHistory.filter(p => p.PnL > 0).reduce((acc, curr) => {
        if (!acc[curr.timeframe]) {
            acc[curr.timeframe] = 0;
        }
        acc[curr.timeframe]++;
        return acc;
    }, {}), [filteredHistory])

    const _cells = [
        ...names.map(name => <Card bordered={false}>
            <Statistic
                title={`Общий финрез ${name}`}
                value={moneyFormat(NametotalPnL[name], 'RUB', 2, 2)}
                precision={2}
                valueStyle={{color: NametotalPnL[name] > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
            />
        </Card>),
        ...names.map(name => <Card bordered={false}>
            <Statistic
                title={`Прибыльных сделок ${name}`}
                value={Nameprofits[name]}
                valueStyle={{color: "rgb(44, 232, 156)"}}
                suffix={`(${!Nameprofits[name] ? 0 : (Nameprofits[name] * 100 / ((Nameprofits[name] || 0) + (Namelosses[name] || 0))).toFixed(2)})%`}
            />
        </Card>),
        ...names.map(name => <Card bordered={false}>
            <Statistic
                title={`Убыточных сделок ${name}`}
                value={Namelosses[name]}
                valueStyle={{color: "rgb(255, 117, 132)"}}
                suffix={`(${!Namelosses[name] ? 0 : (Namelosses[name] * 100 / ((Nameprofits[name] || 0) + (Namelosses[name] || 0))).toFixed(2)})%`}
            />
        </Card>),
        ...timeframes.map(tf =>
            <Card bordered={false}>
                <Statistic
                    title={`Общий финрез ${timeframeLabelMap[tf]}`}
                    value={moneyFormat(totalPnL[tf], 'RUB', 2, 2)}
                    precision={2}
                    valueStyle={{color: totalPnL[tf] > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                />
            </Card>),
        ...timeframes.map(tf => <Card bordered={false}>
            <Statistic
                title={`Прибыльных сделок ${timeframeLabelMap[tf]}`}
                value={profits[tf]}
                valueStyle={{color: "rgb(44, 232, 156)"}}
                suffix={`(${!profits[tf] ? 0 : (profits[tf] * 100 / ((profits[tf] || 0) + (losses[tf] || 0))).toFixed(2)})%`}
            />
        </Card>),
        ...timeframes.map(tf => <Card bordered={false}>
            <Statistic
                title={`Убыточных сделок ${timeframeLabelMap[tf]}`}
                value={losses[tf]}
                valueStyle={{color: "rgb(255, 117, 132)"}}
                suffix={`(${!losses[tf] ? 0 : (losses[tf] * 100 / ((profits[tf] || 0) + (losses[tf] || 0))).toFixed(2)})%`}
            />
        </Card>)
    ]

    const _rows = useMemo(() => {
        const _rows = [];
        const span = width > 1200 ? 4 : width > 440 ? 8 : 12;
        const multi = 24 / span;
        const rowsCount = Math.ceil(_cells.length * span / 24);
        for (let i = 0; i < rowsCount; i++) {
            const cells = _cells.slice(i * multi, i * multi + multi);
            _rows.push(cells.map(c => <Col span={span}>{c}</Col>));
        }

        return _rows;
    }, [_cells, width]);

    return <>
        {_rows.map(cells => <Row gutter={8}>
            {cells}
        </Row>)}
    </>
}