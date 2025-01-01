import React from "react";
import {TimeRangePickerProps, DatePicker} from "antd";
import dayjs from 'dayjs';

const {RangePicker} = DatePicker

export const DatesPicker = ({value, onChange}) => {

    const rangePresets: TimeRangePickerProps['presets'] = [
        { label: 'Сегодня', value: [dayjs().startOf('day'), dayjs()] },
        { label: 'Последние 7 дней', value: [dayjs().add(-7, 'd'), dayjs()] },
        { label: 'Последние 14 дней', value: [dayjs().add(-14, 'd'), dayjs()] },
        { label: 'Последние 30 дней', value: [dayjs().add(-30, 'd'), dayjs()] },
        { label: 'Последние 90 дней', value: [dayjs().add(-90, 'd'), dayjs()] },
        { label: 'Последние 182 дня', value: [dayjs().add(-182, 'd'), dayjs()] },
        { label: 'Последние 365 дней', value: [dayjs().add(-365, 'd'), dayjs()] },
    ];
    return <RangePicker
        presets={rangePresets}
        value={value}
        format="YYYY-MM-DD"
        style={{width: 250}}
        onChange={onChange}/>
}