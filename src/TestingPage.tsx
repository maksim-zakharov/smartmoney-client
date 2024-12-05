import {
    Card,
    Checkbox,
    Col,
    DatePicker,
    Form,
    Input,
    Radio,
    Row,
    Slider,
    Space,
    Statistic,
    Table,
    TimeRangePickerProps
} from "antd";
import {TickerSelect} from "./TickerSelect";
import React, {useEffect, useMemo, useState} from "react";
import FormItem from "antd/es/form/FormItem";
import {TimeframeSelect} from "./TimeframeSelect";
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import {moneyFormat} from "./MainPage";
import {
    calculateOB,
    calculatePositions,
    calculateStructure,
    calculateSwings,
    calculateTrend
} from "./samurai_patterns";
import {fetchCandlesFromAlor, getSecurity, refreshToken} from "./utils";

const {RangePicker} = DatePicker;

export const TestingPage = () => {
    const [data, setData] = useState([]);
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [ticker, onSelectTicker] = useState<string>('MTLR');
    const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<"default" | "max">("default");
    const [stopMargin, setStopMargin] = useState<number>(50)
    const [feePercent, setFeePercent] = useState<number>(0.04)
    const [baseTakePercent, setBaseTakePercent] = useState<number>(1)
    const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5)
    const [security, setSecurity] = useState();
    const [token, setToken] = useState();
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([dayjs('2024-10-01T00:00:00Z'), dayjs('2025-10-01T00:00:00Z')])

    const positions = useMemo(() => {
        const {swings: swingsData, highs, lows} = calculateSwings(data);
        const {structure, highParts, lowParts} = calculateStructure(highs, lows, data);
        const {trend: newTrend} = calculateTrend(highParts, lowParts, data);
        const orderBlocks = calculateOB(highParts, lowParts, data, newTrend);
        return calculatePositions(orderBlocks, data, takeProfitStrategy === 'default' ? 0 : maxTakePercent, baseTakePercent).map((curr) => {
            const diff = (curr.side === 'long' ? (curr.openPrice - curr.stopLoss) : (curr.stopLoss - curr.openPrice))
            const stopLossMarginPerLot = diff * (security?.lotsize || 1)
            curr.quantity = stopLossMarginPerLot ? Math.floor(stopMargin / stopLossMarginPerLot) : 0;
            const openFee = curr.openPrice * curr.quantity * (security?.lotsize || 1) * feePercent / 100;
            const closeFee = (curr.pnl > 0 ? curr.takeProfit : curr.stopLoss) * curr.quantity * (security?.lotsize || 1) * feePercent / 100;
            curr.newPnl = curr.pnl * curr.quantity * (security?.lotsize || 1) - closeFee - openFee;
            curr.fee = openFee + closeFee;

            return curr;
        });
    }, [data, feePercent, security, baseTakePercent, maxTakePercent, takeProfitStrategy])

    const {PnL, profits, losses, fee} = useMemo(() => {
        if(!security){
            return {
                PnL: 0,
                profits: 0,
                losses: 0,
                fee: 0
            }
        }
        return {
            PnL: positions.reduce((acc, curr) => acc + curr.newPnl, 0),
            fee: positions.reduce((acc, curr) => acc + curr.fee, 0),
            profits: positions.filter(p => p.newPnl > 0).length,
            losses: positions.filter(p => p.newPnl < 0).length
        };
    }, [positions, stopMargin, security?.lotsize])

    useEffect(() => {
        ticker && fetchCandlesFromAlor(ticker, tf, dates[0].unix(), dates[1].unix()).then(setData);
    }, [tf, ticker, dates]);

    useEffect(() => {
        localStorage.getItem('token') && refreshToken().then(setToken)
    }, [])

    useEffect(() => {
        token && getSecurity(ticker, token).then(setSecurity)
    }, [ticker, token])

    const rangePresets: TimeRangePickerProps['presets'] = [
        { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
        { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
        { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
        { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
    ];

    const oldOneTickerColumns = [
        {
            title: 'OpenTime',
            dataIndex: 'openTime',
            key: 'openTime',
            render: (val) => dayjs(val * 1000).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'OpenPrice',
            dataIndex: 'openPrice',
            key: 'openPrice',
        },
        {
            title: 'CloseTime',
            dataIndex: 'closeTime',
            key: 'closeTime',
        render: (val) => dayjs(val * 1000).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'StopLoss',
            dataIndex: 'stopLoss',
            key: 'stopLoss',
            render: (val) => moneyFormat(val, 'RUB', security?.minstep, security?.minstep)
        },
        {
            title: 'TakeProfit',
            dataIndex: 'takeProfit',
            key: 'takeProfit',
            render: (val) => moneyFormat(val, 'RUB', 2, 2)
        },
        {
            title: 'Side',
            dataIndex: 'side',
            key: 'side',
        },
        {
            title: 'PnL',
            dataIndex: 'newPnl',
            key: 'newPnl',
            render: (val) => moneyFormat(val, 'RUB', 2, 2)
        },
    ];

    const rowClassName = (record: any, index: number) => {
        // Например, подсветим строку, если age == 32
        return record.newPnl < 0 ? 'sell' : 'buy';
    };

    return <div style={{width: 'max-content', minWidth: "1500px"}}>
        <Form layout="vertical">
            <Row gutter={8}>
                <Col>
                    <FormItem label="Тикер">
                        <Space>
                            <Checkbox value={isAllTickers}
                                      onChange={e => onCheckAllTickers(e.target.checked)}>Все</Checkbox>
                            <TickerSelect value={ticker} disabled={isAllTickers} onSelect={onSelectTicker}/>
                        </Space>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Таймфрейм">
                        <TimeframeSelect value={tf} onChange={onChangeTF}/>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Период">
                        <RangePicker
                            presets={rangePresets}
                            value={dates}
                            format="YYYY-MM-DD"
                            onChange={onChangeRangeDates}/>
                    </FormItem>
                </Col>
            </Row>
            <Row gutter={8} align="bottom">
                <Col>
                    <FormItem label="Тейк-профит стратегия">
                        <Radio.Group onChange={e => onChangeTakeProfitStrategy(e.target.value)} value={takeProfitStrategy}>
                            <Radio value="default">Стоп-лосс</Radio>
                            <Radio value="max">Экстремум</Radio>
                        </Radio.Group>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Базовый коэф. тейк-профита">
                        <Slider value={baseTakePercent} disabled={takeProfitStrategy === "max"} onChange={setBaseTakePercent} min={1} step={1} max={10}/>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Max коэф. тейк-профита">
                        <Slider value={maxTakePercent} disabled={takeProfitStrategy === "default"} onChange={setMaxTakePercent} min={0.1} step={0.1} max={1}/>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Риск на сделку">
                        <Input value={stopMargin} onChange={e => setStopMargin(Number(e.target.value))}/>
                    </FormItem>
                </Col>
                <Col>
                    <FormItem label="Размер комиссии в %">
                        <Slider value={feePercent} onChange={setFeePercent} min={0.01} step={0.01} max={0.4}/>
                    </FormItem>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <FormItem label="Old Dobrynia">
                        <Row gutter={8}>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Общий финрез"
                                        value={moneyFormat(PnL, 'RUB', 2, 2)}
                                        precision={2}
                                        valueStyle={{color: PnL > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Комиссия"
                                        value={moneyFormat(fee, 'RUB', 2, 2)}
                                        precision={2}
                                        valueStyle={{color: fee > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Тейки"
                                        value={profits}
                                        valueStyle={{color: "rgb(44, 232, 156)"}}
                                        suffix={`(${!profits ? 0 : (profits * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Лоси"
                                        value={losses}
                                        valueStyle={{color: "rgb(255, 117, 132)"}}
                                        suffix={`(${!losses ? 0 : (losses * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    <Table rowClassName={rowClassName} size="small" columns={oldOneTickerColumns}/>
                    </FormItem>
                </Col>
                <Col span={12}>
                    <FormItem label="New Samurai">
                        <Row gutter={8}>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Общий финрез"
                                        value={moneyFormat(PnL, 'RUB', 2, 2)}
                                        precision={2}
                                        valueStyle={{color: PnL > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Комиссия"
                                        value={moneyFormat(fee, 'RUB', 2, 2)}
                                        precision={2}
                                        valueStyle={{color: fee > 0 ? "rgb(44, 232, 156)" : "rgb(255, 117, 132)"}}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Тейки"
                                        value={profits}
                                        valueStyle={{color: "rgb(44, 232, 156)"}}
                                        suffix={`(${!profits ? 0 : (profits * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card bordered={false}>
                                    <Statistic
                                        title="Лоси"
                                        value={losses}
                                        valueStyle={{color: "rgb(255, 117, 132)"}}
                                        suffix={`(${!losses ? 0 : (losses * 100 / (profits + losses)).toFixed(2)})%`}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    <Table rowClassName={rowClassName} size="small" columns={oldOneTickerColumns} dataSource={positions}/>
                    </FormItem>
                </Col>
            </Row>
        </Form>
    </div>;
}