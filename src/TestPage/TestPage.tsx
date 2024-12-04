import React, {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Checkbox, DatePicker, Radio, Select, Slider, Space, TimeRangePickerProps} from "antd";
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {Chart} from "./TestChart";
import {calculateEMA} from "../../symbolFuturePairs";
import {fetchCandlesFromAlor} from "../utils";

const {RangePicker} = DatePicker

const fetchSecurities = () => fetch('https://apidev.alor.ru/md/v2/Securities?exchange=MOEX&limit=10000').then(r => r.json())

export const TestPage = () => {
    const [securities, setSecurities] = useState([]);
    const [data, setData] = useState([]);
    const [ema, setEma] = useState([]);
    const [checkboxValues, setCheckboxValues] = useState([]);
    const [windowLength, setWindowLength] = useState(5);
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker') || 'MTLR';
    const tf = searchParams.get('tf') || '900';
    const fromDate = searchParams.get('fromDate') || Math.floor(new Date('2024-10-01T00:00:00Z').getTime() / 1000);
    const toDate = searchParams.get('toDate') || Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000);

    useEffect(() => {
        setEma(calculateEMA(
            data.map((h) => h.close),
            100
        )[1]);
    }, [data])

    useEffect(() => {
        fetchSecurities().then(setSecurities)
    }, []);

    useEffect(() => {
        fetchCandlesFromAlor(ticker, tf, fromDate, toDate).then(setData);
    }, [tf, ticker, fromDate, toDate]);

    const config = useMemo(() => ({
        smPatterns: checkboxValues.includes('smPatterns'),
        trend: checkboxValues.includes('trend'),
        swings: checkboxValues.includes('swings'),
        noDoubleSwing: checkboxValues.includes('noDoubleSwing'),
        noInternal: checkboxValues.includes('noInternal'),
        smartTrend: checkboxValues.includes('smartTrend'),
        BOS: checkboxValues.includes('BOS'),
        showOB: checkboxValues.includes('showOB'),
        showEndOB: checkboxValues.includes('showEndOB'),
    }), [checkboxValues])

    const setSize = (tf: string) => {
        searchParams.set('tf', tf);
        setSearchParams(searchParams)
    }

    const onSelectTicker = (ticker) => {
        searchParams.set('ticker', ticker);
        setSearchParams(searchParams)
    }

    const options = useMemo(() => securities.filter(s => !['Unknown'].includes(s.complexProductCategory) && !['TQIF', 'ROPD', 'TQIR', 'TQRD', 'TQPI', 'CETS', 'TQTF', 'TQCB', 'TQOB', 'FQBR'].includes(s.board)).sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
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

    return <>
        <Space>
            <Radio.Group value={tf} onChange={(e) => setSize(e.target.value)}>
                <Radio.Button value="300">5M</Radio.Button>
                <Radio.Button value="900">15M</Radio.Button>
                <Radio.Button value="1800">30M</Radio.Button>
                <Radio.Button value="3600">1H</Radio.Button>
            </Radio.Group>
            <Select
                value={ticker}
                showSearch
                placeholder="Введи тикер"
                onSelect={onSelectTicker}
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{width: 160}}
                options={options}
            />
            <RangePicker
                presets={rangePresets}
                value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]}
                format="YYYY-MM-DD"
                onChange={onChangeRangeDates} />
        </Space>
        <Slider defaultValue={windowLength} onChange={setWindowLength}/>
        <Checkbox.Group onChange={setCheckboxValues}>
            <Checkbox key="smPatterns" value="smPatterns">smPatterns</Checkbox>
            <Checkbox key="trend" value="trend">Тренд</Checkbox>
            <Checkbox key="swings" value="swings">Swings</Checkbox>
            <Checkbox key="noDoubleSwing" value="noDoubleSwing">Исключить свинги подряд</Checkbox>
            {/*<Checkbox key="noInternal" value="noInternal">Исключить внутренние свинги</Checkbox>*/}
            <Checkbox key="smartTrend" value="smartTrend">Умный тренд</Checkbox>
            <Checkbox key="BOS" value="BOS">Структуры</Checkbox>
            <Checkbox key="showOB" value="showOB">Ордерблоки</Checkbox>
            <Checkbox key="showEndOB" value="showEndOB">Отработанные Ордерблоки</Checkbox>
        </Checkbox.Group>
        <Chart data={data} ema={ema} windowLength={windowLength} tf={Number(tf)} {...config} />
    </>
}

export default TestPage;