import { StatArbPage } from './StatArbPage';
import React, { useMemo } from 'react';
import { Col, Row, Segmented, Select, Space } from 'antd';
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

  const setTab = (tab: string) => {
    searchParams.set('segment', tab);
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
      label: 'Триноги',
      value: 'triangle',
    },
  ];
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
      </Space>
      <Segmented value={tab} style={{ margin: '8px auto' }} onChange={setTab} options={options} />
      {tab === 'stocks' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={6}>
              <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={height} />
            </Col>
          </Row>
          {/*<Typography.Title>Эксперимент</Typography.Title>*/}
          {/*<Row gutter={[8, 8]} style={{ paddingTop: 8 }}>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="GMKN" _tickerFuture="SVCB" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="PIKK" _tickerFuture="SMLT" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="MTSS" _tickerFuture="YDEX" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="ROSN" _tickerFuture="LKOH" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="ROSN" _tickerFuture="TATN" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="SBER" _tickerFuture="SBERP" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="EUTR" _tickerFuture="TRNFP" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="ALRS" _tickerFuture="PLZL" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="IRAO" _tickerFuture="MGNT" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="LKOH" _tickerFuture="RUAL" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="MAGN" _tickerFuture="X5" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="HEAD" _tickerFuture="MDMG" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="T" _tickerFuture="LENT" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="APTK" _tickerFuture="SFIN" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="CHMF" _tickerFuture="NLMK" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="GAZP" _tickerFuture="SIBN" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="AFKS" _tickerFuture="POSI" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={6}>*/}
          {/*  <StatArbPage tickerStock="UPRO" _tickerFuture="PHOR" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="LSNG" _tickerFuture="LSNGP" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="NKNC" _tickerFuture="NKNCP" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="LKOH" _tickerFuture="TATN" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="LKOH" _tickerFuture="SNGS" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="ROSN" _tickerFuture="SNGS" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*<Col span={8}>*/}
          {/*  <StatArbPage tickerStock="TATN" _tickerFuture="SNGS" onlyChart height={height} />*/}
          {/*</Col>*/}
          {/*</Row>*/}
        </>
      )}
      {tab === 'funding' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={6}>
              <StatArbPage
                tickerStock="IMOEXF"
                _tickerFuture={`MIX-${expirationMonth}`}
                onlyChart
                height={height}
                multi={10000}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="EURRUBF"
                _tickerFuture={`EU-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="USDRUBF"
                _tickerFuture={`SI-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="CNYRUBF"
                _tickerFuture={`CNY-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="SBERF"
                _tickerFuture={`SBRF-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="GAZPF"
                _tickerFuture={`GAZR-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <StatArbPage
                tickerStock="GLDRUBF"
                _tickerFuture={`GL-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </Col>
          </Row>
        </>
      )}

      {tab === 'triangle' && (
        <>
          <Row gutter={[8, 8]}>
            <Col span={6}>
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
            <Col span={6}>
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
            <Col span={6}>
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
            <Col span={6}>
              <SI_GOLD_Page
                first="GLDRUBF"
                second={`SI-${expirationMonth}`}
                third={`GOLD-${expirationMonth}`}
                onlyChart
                multiple={31100}
                rate={0.2}
                noExp
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
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
            <Col span={6}>
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
            <Col span={6}>
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
