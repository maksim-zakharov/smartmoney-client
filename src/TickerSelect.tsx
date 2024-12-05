import React, {FC, useEffect, useMemo, useState} from "react";
import {Select} from "antd";

const fetchSecurities = () => fetch('https://apidev.alor.ru/md/v2/Securities?exchange=MOEX&limit=10000').then(r => r.json())

interface Props {
    value: string;
    disabled?: boolean;
    onSelect: (ticker: string) => void;
}
export const TickerSelect: FC<Props> = ({disabled, value, onSelect}) => {
    const [securities, setSecurities] = useState([]);

    useEffect(() => {
        fetchSecurities().then(setSecurities)
    }, []);

    const options = useMemo(() => securities.filter(s => !['Unknown'].includes(s.complexProductCategory) && !['MTQR', 'TQIF', 'ROPD', 'TQIR', 'TQRD', 'TQPI', 'CETS', 'TQTF', 'TQCB', 'TQOB', 'FQBR', 'RFUD'].includes(s.board) && s.currency === 'RUB').sort((a, b) => a.symbol.localeCompare(b.symbol)).map(s => ({
        label: `${s.shortname} (${s.symbol})`,
        value: s.symbol
    })), [securities]);

    return <Select
        value={value}
        showSearch
        disabled={disabled}
        placeholder="Введи тикер"
        onSelect={onSelect}
        filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        style={{width: 260}}
        options={options}
    />
}