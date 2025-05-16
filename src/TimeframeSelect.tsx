import React, {CSSProperties, FC} from "react";
import {Radio} from 'antd'

interface Props {
    value: string;
    onChange: (value: string) => void;
    style?: CSSProperties;
}
export const TimeframeSelect: FC<Props> = ({value, onChange, style}) => <Radio.Group style={style} value={value} onChange={(e) => onChange(e.target.value)}>
    <Radio.Button value="60">1M</Radio.Button>
    <Radio.Button value="300">5M</Radio.Button>
    <Radio.Button value="900">15M</Radio.Button>
    <Radio.Button value="1800">30M</Radio.Button>
    <Radio.Button value="3600">1H</Radio.Button>
    <Radio.Button value="14400">4H</Radio.Button>
    <Radio.Button value="D">D1</Radio.Button>
</Radio.Group>