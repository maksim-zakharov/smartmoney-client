import { useGetRuRateQuery } from './api/alor.api.ts';
import { moneyFormat } from './MainPage/MainPage.tsx';
import { useState } from 'react';
import { Slider } from './components/ui/slider.tsx';

// Пример конфигурации: 8 пар и 4 тройки с коэффициентами (замените на реальные)
const initialPairs = [
  {
    id: `UCNY-12.25/USDCNH_xp`,
    type: 'pair',
    instruments: [
      { name: `UCNY-12.25`, value: 1, ratio: 1 }, // Базовый
      { name: `USDCNH_xp`, value: 0.01, ratio: 0.01 },
    ],
  },
  {
    id: `ED-12.25/EURUSD_xp`,
    type: 'pair',
    instruments: [
      { name: `ED-12.25`, value: 1, ratio: 1 }, // Базовый
      { name: `EURUSD_xp`, value: 0.01, ratio: 0.01 },
    ],
  },
  {
    id: `GOLD-12.25/XAUUSD_xp`,
    type: 'pair',
    instruments: [
      { name: `GOLD-12.25`, value: 1, ratio: 1 }, // Базовый
      { name: `XAUUSD_xp`, value: 0.01, ratio: 0.01 },
    ],
  },
  {
    id: `SILV-12.25/XAGUSD_xp`,
    type: 'pair',
    instruments: [
      { name: `SILV-12.25`, value: 5, ratio: 1 }, // Базовый
      { name: `XAGUSD_xp`, value: 0.01, ratio: 0.002 },
    ],
  },
  {
    id: `PLT-12.25/XPTUSD_xp`,
    type: 'pair',
    instruments: [
      { name: `PLT-12.25`, value: 1, ratio: 1 }, // Базовый
      { name: `XPTUSD_xp`, value: 0.01, ratio: 0.01 },
    ],
  },
];

const initialTriples = [
  {
    id: `SI-12.25/CNY-12.25/USDCNH_xp`,
    type: 'triple',
    instruments: [
      { name: `SI-12.25`, value: 24, ratio: 1 }, // Базовый
      { name: `CNY-12.25`, value: 170, ratio: 7.08 }, // ratio зависит от курса Юаня
      { name: `USDCNH_xp`, value: 0.24, ratio: 0.01 }, // Пример третьего
    ],
  },
  {
    id: `EU-12.25/SI-12.25/EURUSD_xp`,
    type: 'triple',
    instruments: [
      { name: `EU-12.25`, value: 20, ratio: 1 }, // Базовый
      { name: `SI-12.25`, value: 23, ratio: 1.15 }, // ratio зависит от курса Евро
      { name: `EURUSD_xp`, value: 0.2, ratio: 0.01 }, // Пример третьего
    ],
  },
  {
    id: `EU-12.25/CNY-12.25/EURCNH_xp`,
    type: 'triple',
    instruments: [
      { name: `EU-12.25`, value: 1, ratio: 1 }, // Базовый
      { name: `CNY-12.25`, value: 8, ratio: 8 }, // ratio зависит от курса Евро и юаня
      { name: `EURCNH_xp`, value: 0.01, ratio: 0.01 }, // Пример третьего
    ],
  },
];

// Компонент для пары
const PairCalculator = ({ group, onUpdate }) => {
  const [instruments, setInstruments] = useState(group.instruments);
  const [baseIndex, setBaseIndex] = useState(0); // Индекс базового инструмента

  const handleChange = (index, val) => {
    const value = parseFloat(val);
    if (isNaN(value) || value < 0) return;

    const newInstruments = [...instruments];
    newInstruments[index].value = value;
    setBaseIndex(index); // Делаем этот базовым

    // Пересчёт остальных относительно базового
    const baseValue = value;
    const baseRatio = newInstruments[index].ratio;
    newInstruments.forEach((inst, i) => {
      if (i !== index) {
        inst.value = Math.round(baseValue * (inst.ratio / baseRatio) * 1000) / 1000;
      }
    });

    setInstruments(newInstruments);
    onUpdate(group.id, newInstruments);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
      <h3>Пара: {group.id}</h3>
      {instruments.map((inst, index) => (
        <label key={index} style={{ display: 'block', margin: '5px 0' }}>
          {inst.name}:
          <input
            type="number"
            value={inst.value}
            onChange={(e) => handleChange(index, e.target.value)}
            min="0"
            step={index === 0 ? '1' : '0.01'} // Шаг для контрактов/лотов
            style={{ marginLeft: '10px', width: '100px' }}
          />
        </label>
      ))}
      <Slider defaultValue={[instruments[0].value]} onValueChange={(val) => handleChange(0, val)} max={500} step={1} />
    </div>
  );
};

// Компонент для тройки (аналогично, но для 3 полей)
const TripleCalculator = ({ group, onUpdate }) => {
  const [instruments, setInstruments] = useState(group.instruments);
  const [baseIndex, setBaseIndex] = useState(0);

  const handleChange = (index, val) => {
    const value = parseFloat(val);
    if (isNaN(value) || value < 0) return;

    const newInstruments = [...instruments];
    newInstruments[index].value = value;
    setBaseIndex(index);

    const baseValue = value;
    const baseRatio = newInstruments[index].ratio;
    newInstruments.forEach((inst, i) => {
      if (i !== index) {
        inst.value = Math.round(baseValue * (inst.ratio / baseRatio) * 1000) / 1000;
      }
    });

    setInstruments(newInstruments);
    onUpdate(group.id, newInstruments);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
      <h3>Тройка: {group.id}</h3>
      {instruments.map((inst, index) => (
        <label key={index} style={{ display: 'block', margin: '5px 0' }}>
          {inst.name}:
          <input
            type="number"
            value={inst.value}
            onChange={(e) => handleChange(index, e)}
            min="0"
            step={index === 0 ? '1' : '0.01'}
            style={{ marginLeft: '10px', width: '100px' }}
          />
        </label>
      ))}
      <Slider defaultValue={[instruments[0].value]} onValueChange={(val) => handleChange(0, val)} max={500} step={1} />
    </div>
  );
};

export const ArbitrageCalculator = () => {
  const { data: rateData } = useGetRuRateQuery();
  const EURRate = rateData?.Valute.EUR.Value;
  const USDRate = rateData?.Valute.USD.Value;
  const CNYRate = rateData?.Valute.CNY.Value;

  const [groups, setGroups] = useState([...initialPairs, ...initialTriples]);

  const updateGroup = (groupId, updatedInstruments) => {
    setGroups(groups.map((group) => (group.id === groupId ? { ...group, instruments: updatedInstruments } : group)));
  };

  return (
    <div className="flex gap-2 flex-col">
      Курсы валют
      <span>EUR: {moneyFormat(EURRate, 'RUB', 0, 2)}</span>
      <span>USD: {moneyFormat(USDRate, 'RUB', 0, 2)}</span>
      <span>CNY: {moneyFormat(CNYRate, 'RUB', 0, 2)}</span>
      <span>UCNY: {moneyFormat(USDRate / CNYRate, 'CNY', 0, 2)}</span>
      <span>EURUSD: {moneyFormat(EURRate / USDRate, 'USD', 0, 2)}</span>
      <span>EURCNY: {moneyFormat(EURRate / CNYRate, 'CNY', 0, 2)}</span>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Калькулятор лотности для арбитража (множественные пары и тройки)</h1>

        {groups.map((group) => {
          if (group.type === 'pair') {
            return <PairCalculator key={group.id} group={group} onUpdate={updateGroup} />;
          } else {
            return <TripleCalculator key={group.id} group={group} onUpdate={updateGroup} />;
          }
        })}
      </div>
    </div>
  );
};
