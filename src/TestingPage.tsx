import {
    Checkbox,
    DatePicker,
    Col,
    Form,
    Input,
    Row,
    Slider,
    Space,
    Radio,
    TimeRangePickerProps,
    Table
} from "antd";
import {TickerSelect} from "./TickerSelect";
import React, {useState} from "react";
import FormItem from "antd/es/form/FormItem";
import {TimeframeSelect} from "./TimeframeSelect";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const {RangePicker} = DatePicker;

export const TestingPage = () => {
    const [tf, onChangeTF] = useState<string>('300');
    const [isAllTickers, onCheckAllTickers] = useState<boolean>(false);
    const [ticker, onSelectTicker] = useState<string>();
    const [takeProfitStrategy, onChangeTakeProfitStrategy] = useState<"default" | "max">("default");
    const [stopMargin, setStopMargin] = useState<number>(50)
    const [feePercent, setFeePercent] = useState<number>(0.04)
    const [baseTakePercent, setBaseTakePercent] = useState<number>(1)
    const [maxTakePercent, setMaxTakePercent] = useState<number>(0.5)
    const [dates, onChangeRangeDates] = useState<Dayjs[]>([dayjs('2024-10-01T00:00:00Z'), dayjs('2025-10-01T00:00:00Z')])

    const rangePresets: TimeRangePickerProps['presets'] = [
        { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
        { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
        { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
        { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
    ];

    const oldOneTickerColumns = [
        {
            title: 'Name',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'LiqSweepDate',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'OB_Date',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'hitDate',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'closeDate',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'Side',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'TP',
            dataIndex: 'stockSymbol',
            key: 'stockSymbol',
        },
        {
            title: 'PnL',
            dataIndex: 'stockSymbol',
            key: 'PnL',
        },
    ];

    return <div style={{width: 'max-content', minWidth: "1300px"}}>
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
                        <TimeframeSelect value={tf} onSelect={onChangeTF}/>
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
            <Row gutter={8}>
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
            </Row>
            <Row gutter={8} align="bottom">
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
                    <Table columns={oldOneTickerColumns}/>
                    </FormItem>
                </Col>
                <Col span={12}>
                    <FormItem label="New Samurai">
                    <Table columns={oldOneTickerColumns}/>
                    </FormItem>
                </Col>
            </Row>
        </Form>
    </div>;
}