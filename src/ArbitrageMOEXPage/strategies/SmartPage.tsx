import { StatArbPage } from './StatArbPage';
import React, { useMemo } from 'react';
import { Col, Input, Pagination, Radio, Row, Segmented, Select, Space } from 'antd';
import { Triangle_Page } from './Triangle_Page';
import { SI_GOLD_Page } from './SI_GOLD_Page';
import { SegmentedLabeledOption } from 'rc-segmented';
import { useSearchParams } from 'react-router-dom';
import { TimeframeSelect } from '../../TimeframeSelect.tsx';
import { DatesPicker } from '../../DatesPicker.tsx';
import dayjs, { type Dayjs } from 'dayjs';
import moment from 'moment';

export const SmartPage = () => {
  const height = 350;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('segment') || 'stocks';
  const tf = searchParams.get('tf') || '900';
  const fromDate = searchParams.get('fromDate') || moment().add(-30, 'day').unix();
  const toDate = searchParams.get('toDate') || moment().add(1, 'day').unix();
  const expirationMonth = searchParams.get('expirationMonth') || '9.25';

  const span = Number(searchParams.get('span') || 6);

  const page = Number(searchParams.get('page') || 1);

  const minProfit = Number(searchParams.get('minProfit') || 0.005);

  const setMinProfit = (value) => {
    searchParams.set('minProfit', value);
    setSearchParams(searchParams);
  };

  const setSpan = (tab: string) => {
    searchParams.set('span', tab);
    setSearchParams(searchParams);
  };

  const setTab = (tab: string) => {
    searchParams.set('segment', tab);
    setSearchParams(searchParams);
  };

  const setPage = (tab: string) => {
    searchParams.set('page', tab.toString());
    setSearchParams(searchParams);
  };

  const setSize = (tf: string) => {
    searchParams.set('tf', tf);
    setSearchParams(searchParams);
  };

  const onChangeRangeDates = (value: Dayjs[], dateString) => {
    searchParams.set('fromDate', value[0].unix());
    searchParams.set('toDate', value[1].unix());
    setSearchParams(searchParams);
  };

  const setexpirationMonth = (value) => {
    searchParams.set('expirationMonth', value);
    setSearchParams(searchParams);
  };

  const expirationMonths = useMemo(() => {
    const startYear = 24;
    const months = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 1; j <= 4; j++) {
        months.push(`${3 * j}.${startYear + i}`);
      }
    }

    return months;
  }, []);

  const options: SegmentedLabeledOption[] = [
    {
      label: 'Акции',
      value: 'stocks',
    },
    {
      label: 'Фандинг',
      value: 'funding',
    },
    {
      label: 'Forex',
      value: 'forex',
    },
    {
      label: 'Триноги',
      value: 'triangle',
    },
    {
      label: 'Другие',
      value: 'others',
    },
  ];

  const spanOptions = [
    { label: 1, value: 24 / 1 },
    { label: 3, value: 24 / 3 },
    { label: 4, value: 24 / 4 },
    { label: 6, value: 24 / 4 },
    { label: 8, value: 24 / 8 },
  ];

  const others = [
    { left: 'SBER', right: 'SBERP' },
    { left: 'TATN', right: 'TATNP' },
    { left: 'GAZP', right: 'LKOH' },
    { left: 'GAZP', right: 'GMKN' },
    { left: 'RTKM', right: 'RTKMP' },
    { left: 'GMKN', right: 'LKOH' },
    { left: 'VTBR', right: 'MTSS' },
    { left: 'LKOH', right: 'TATNP' },
    { left: 'TATN', right: 'GMKN' },
    { left: 'GMKN', right: 'TATNP' },
    { left: 'GAZP', right: 'TATNP' },
    { left: 'SMLT', right: 'AFKS' },
    { left: 'TATN', right: 'LKOH' },
    { left: 'GAZP', right: 'TATN' },
    { left: 'X5', right: 'RTKMP' },
    { left: 'LKOH', right: 'X5' },
    { left: 'GAZP', right: 'MOEX' },
    { left: 'APTK', right: 'UPRO' },
    { left: 'X5', right: 'MTSS' },
    { left: 'GMKN', right: 'MOEX' },
    { left: 'LKOH', right: 'MGNT' },
    { left: 'RNFT', right: 'LKOH' },
    { left: 'LKOH', right: 'MOEX' },
    { left: 'VTBR', right: 'X5' },
    { left: 'MTSS', right: 'MGNT' },
    { left: 'SIBN', right: 'MGNT' },
    { left: 'LKOH', right: 'SIBN' },
    { left: 'NVTK', right: 'X5' },
    { left: 'VTBR', right: 'MGNT' },
    { left: 'GAZP', right: 'X5' },
    { left: 'GAZP', right: 'RNFT' },
    { left: 'MTSS', right: 'RTKMP' },
    { left: 'TATNP', right: 'RTKMP' },
    { left: 'MRKC', right: 'LENT' },
    { left: 'RUAL', right: 'MOEX' },
    { left: 'SIBN', right: 'MOEX' },
    { left: 'LKOH', right: 'RTKMP' },
    { left: 'GAZP', right: 'SIBN' },
    { left: 'YDEX', right: 'SVCB' },
    { left: 'RNFT', right: 'NVTK' },
    { left: 'X5', right: 'TATNP' },
    { left: 'X5', right: 'MGNT' },
    { left: 'LKOH', right: 'RTKM' },
    { left: 'GAZP', right: 'MGNT' },
    { left: 'TATNP', right: 'RTKM' },
    { left: 'RUAL', right: 'GMKN' },
    { left: 'RNFT', right: 'GMKN' },
    { left: 'LKOH', right: 'NVTK' },
    { left: 'SMLT', right: 'SVCB' },
    { left: 'LEAS', right: 'MDMG' },
    { left: 'GAZP', right: 'RTKM' },
    { left: 'NVTK', right: 'AFKS' },
    { left: 'TATN', right: 'RTKM' },
    { left: 'MTSS', right: 'OZPH' },
    { left: 'TATN', right: 'MOEX' },
    { left: 'GAZP', right: 'RTKMP' },
    { left: 'TATNP', right: 'MTSS' },
    { left: 'TATN', right: 'RTKMP' },
    { left: 'LKOH', right: 'MTSS' },
    { left: 'SNGSP', right: 'TRNFP' },
    { left: 'AFKS', right: 'SGZH' },
    { left: 'GAZP', right: 'RUAL' },
    { left: 'MTLR', right: 'LKOH' },
    { left: 'TATNP', right: 'MOEX' },
    { left: 'HEAD', right: 'MDMG' },
    { left: 'GMKN', right: 'X5' },
    { left: 'RUAL', right: 'RTKM' },
    { left: 'VTBR', right: 'LKOH' },
    { left: 'MGNT', right: 'RTKMP' },
    { left: 'NVTK', right: 'SGZH' },
    { left: 'IRAO', right: 'NVTK' },
    { left: 'X5', right: 'RTKM' },
    { left: 'GMKN', right: 'RTKM' },
    { left: 'VTBR', right: 'GAZP' },
    { left: 'GMKN', right: 'SIBN' },
    { left: 'GMKN', right: 'MGNT' },
    { left: 'MTLR', right: 'GAZP' },
    { left: 'MTLR', right: 'NVTK' },
    { left: 'TATN', right: 'X5' },
    { left: 'RUAL', right: 'TATN' },
    { left: 'RTKM', right: 'MTSS' },
    { left: 'MTLR', right: 'TATNP' },
    { left: 'RTKM', right: 'SIBN' },
    { left: 'MAGN', right: 'YDEX' },
    { left: 'RNFT', right: 'X5' },
    { left: 'RUAL', right: 'LKOH' },
    { left: 'GAZP', right: 'NVTK' },
    { left: 'SMLT', right: 'YDEX' },
    { left: 'AFKS', right: 'SVCB' },
    { left: 'TATN', right: 'MTSS' },
    { left: 'GMKN', right: 'RTKMP' },
    { left: 'RTKM', right: 'MGNT' },
    { left: 'X5', right: 'SIBN' },
    { left: 'GAZP', right: 'MTSS' },
    { left: 'RNFT', right: 'TATNP' },
    { left: 'MTLR', right: 'GMKN' },
    { left: 'TATNP', right: 'MGNT' },
    { left: 'IRAO', right: 'X5' },
    { left: 'VTBR', right: 'GMKN' },
    { left: 'AFKS', right: 'YDEX' },
    { left: 'TATNP', right: 'SIBN' },
    { left: 'IRAO', right: 'AFKS' },
    { left: 'MTLR', right: 'TATN' },
    { left: 'VTBR', right: 'RTKMP' },
    { left: 'ALRS', right: 'MGNT' },
    { left: 'RNFT', right: 'AFKS' },
    { left: 'IRAO', right: 'SMLT' },
    { left: 'VTBR', right: 'TATNP' },
    { left: 'GMKN', right: 'MTSS' },
    { left: 'IRAO', right: 'SVCB' },
    { left: 'HEAD', right: 'LEAS' },
    { left: 'NVTK', right: 'MAGN' },
    { left: 'TATN', right: 'MGNT' },
    { left: 'TATN', right: 'SIBN' },
    { left: 'MTLR', right: 'RNFT' },
    { left: 'RNFT', right: 'MGNT' },
    { left: 'SIBN', right: 'RTKMP' },
    { left: 'RTKM', right: 'MOEX' },
    { left: 'VTBR', right: 'SIBN' },
    { left: 'RNFT', right: 'ALRS' },
    { left: 'VTBR', right: 'OZPH' },
    { left: 'GAZP', right: 'ALRS' },
    { left: 'SIBN', right: 'MTSS' },
    { left: 'MGNT', right: 'OZPH' },
    { left: 'LKOH', right: 'ALRS' },
    { left: 'RUAL', right: 'SIBN' },
    { left: 'VTBR', right: 'NVTK' },
    { left: 'RUAL', right: 'TATNP' },
    { left: 'RNFT', right: 'TATN' },
    { left: 'MTLR', right: 'X5' },
    { left: 'PHOR', right: 'MBNK' },
    { left: 'MVID', right: 'UPRO' },
    { left: 'RTKMP', right: 'OZPH' },
    { left: 'AFKS', right: 'X5' },
    { left: 'IRAO', right: 'LKOH' },
    { left: 'SGZH', right: 'YDEX' },
    { left: 'RNFT', right: 'SGZH' },
    { left: 'X5', right: 'OZPH' },
    { left: 'NVTK', right: 'YDEX' },
    { left: 'RNFT', right: 'MAGN' },
    { left: 'MOEX', right: 'MGNT' },
    { left: 'RUAL', right: 'RTKMP' },
    { left: 'IRAO', right: 'MTSS' },
    { left: 'VTBR', right: 'TATN' },
    { left: 'ALRS', right: 'SIBN' },
    { left: 'IRAO', right: 'TATNP' },
    { left: 'SGZH', right: 'SVCB' },
    { left: 'VTBR', right: 'IRAO' },
    { left: 'RUAL', right: 'MGNT' },
    { left: 'MOEX', right: 'RTKMP' },
    { left: 'GMKN', right: 'NVTK' },
    { left: 'MDMG', right: 'BSPB' },
    { left: 'NVTK', right: 'TATNP' },
    { left: 'NVTK', right: 'MTSS' },
    { left: 'X5', right: 'MOEX' },
    { left: 'RUAL', right: 'PLZL' },
    { left: 'LKOH', right: 'AFKS' },
    { left: 'PLZL', right: 'MGNT' },
    { left: 'SMLT', right: 'NVTK' },
    { left: 'IRAO', right: 'OZPH' },
    { left: 'AFKS', right: 'MAGN' },
    { left: 'VTBR', right: 'RNFT' },
    { left: 'VTBR', right: 'RTKM' },
    { left: 'NVTK', right: 'MGNT' },
    { left: 'RNFT', right: 'SIBN' },
    { left: 'RNFT', right: 'YDEX' },
    { left: 'SMLT', right: 'X5' },
    { left: 'X5', right: 'YDEX' },
    { left: 'MSNG', right: 'LSRG' },
  ];

  const limit = 72 / span;
  const offset = (page - 1) * limit;

  const filteredOthers = others.slice(offset, offset + limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Space>
        <TimeframeSelect value={tf} onChange={setSize} />
        <DatesPicker value={[dayjs(Number(fromDate) * 1000), dayjs(Number(toDate) * 1000)]} onChange={onChangeRangeDates} />
        <Select
          value={expirationMonth}
          onSelect={setexpirationMonth}
          style={{ width: 100 }}
          options={expirationMonths.map((v) => ({ label: v, value: v }))}
        />
        <Input style={{ width: 80 }} value={minProfit} onChange={(e) => setMinProfit(Number(e.target.value))} />
        <Radio.Group
          block
          options={spanOptions}
          onChange={(e) => setSpan(e.target.value)}
          value={span}
          optionType="button"
          buttonStyle="solid"
        />
        {tab === 'others' && <Pagination current={page} total={others.length} pageSize={24 / span} onChange={setPage} />}
      </Space>
      <Segmented value={tab} style={{ margin: '8px auto' }} onChange={setTab} options={options} />
      {tab === 'others' && (
        <>
          <Row gutter={[8, 8]}>
            {filteredOthers.map((item) => (
              <Col span={span}>
                <StatArbPage tickerStock={item.left} _tickerFuture={item.right} onlyChart height={height} />
              </Col>
            ))}
          </Row>
        </>
      )}
      {tab === 'stocks' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={span}>
              <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={height} />
            </Col>
            <Col span={span}>
              <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={height} />
            </Col>
            <Col span={span}>
              <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={height} />
            </Col>
            <Col span={span}>
              <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={height} />
            </Col>
            <Col span={span}>
              <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={height} />
            </Col>
          </Row>
        </>
      )}
      {tab === 'forex' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={span}>
              <StatArbPage tickerStock="FX:USD/CNH" _tickerFuture="UCNY-9.25" multiple={0.01} onlyChart height={height} />
            </Col>
            <Col span={span}>
              <StatArbPage tickerStock="FX:EUR/USD" _tickerFuture="ED-9.25" multiple={0.01} onlyChart height={height} />
            </Col>
          </Row>
        </>
      )}
      {tab === 'funding' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={span}>
              <StatArbPage
                tickerStock="IMOEXF"
                _tickerFuture={`MIX-${expirationMonth}`}
                onlyChart
                height={height}
                multi={10000}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="EURRUBF"
                _tickerFuture={`EU-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="USDRUBF"
                _tickerFuture={`SI-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="CNYRUBF"
                _tickerFuture={`CNY-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="SBERF"
                _tickerFuture={`SBRF-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="GAZPF"
                _tickerFuture={`GAZR-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <StatArbPage
                tickerStock="GLDRUBF"
                _tickerFuture={`GL-${expirationMonth}`}
                multi={100}
                seriesType="Line"
                onlyChart
                height={height}
              />
            </Col>
          </Row>
        </>
      )}

      {tab === 'triangle' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={span}>
              <Triangle_Page
                first="EURRUBF"
                second="USDRUBF"
                third={`ED-${expirationMonth}`}
                multiple={1}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <Triangle_Page
                first="USDRUBF"
                second="CNYRUBF"
                third={`UCNY-${expirationMonth}`}
                multiple={1}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <SI_GOLD_Page
                first="EURRUBF"
                second={`SI-${expirationMonth}`}
                third={`ED-${expirationMonth}`}
                onlyChart
                multiple={1000}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <SI_GOLD_Page
                first="GLDRUBF"
                second={`SI-${expirationMonth}`}
                third={`GOLD-${expirationMonth}`}
                onlyChart
                multiple={31100}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <SI_GOLD_Page
                first="USDRUBF"
                second={`CNY-${expirationMonth}`}
                third={`UCNY-${expirationMonth}`}
                onlyChart
                multiple={1}
                rate={0.17}
                noExp
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <Triangle_Page
                first={`SI-${expirationMonth}`}
                second={`CNY-${expirationMonth}`}
                third={`UCNY-${expirationMonth}`}
                multiple={0.001}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={span}>
              <Triangle_Page
                first={`EU-${expirationMonth}`}
                second={`SI-${expirationMonth}`}
                third={`ED-${expirationMonth}`}
                multiple={1}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
