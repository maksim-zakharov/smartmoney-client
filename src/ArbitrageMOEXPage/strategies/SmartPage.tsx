import { StatArbPage } from './StatArbPage';
import React from 'react';
import { Col, Row, Segmented } from 'antd';
import { Triangle_Page } from './Triangle_Page';
import { SI_GOLD_Page } from './SI_GOLD_Page';
import { SegmentedLabeledOption } from 'rc-segmented';
import { useSearchParams } from 'react-router-dom';

export const SmartPage = () => {
  const height = 350;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('segment') || 'stocks';
  const setTab = (tab: string) => {
    searchParams.set('segment', tab);
    setSearchParams(searchParams);
  };

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
    <>
      <Segmented value={tab} style={{ marginBottom: 8 }} onChange={setTab} options={options} />
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
          <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
            <Col span={6}>
              <StatArbPage tickerStock="GMKN" _tickerFuture="SVCB" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="PIKK" _tickerFuture="SMLT" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="MTSS" _tickerFuture="YDEX" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="ROSN" _tickerFuture="LKOH" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="ROSN" _tickerFuture="TATN" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="SBER" _tickerFuture="SBERP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="EUTR" _tickerFuture="TRNFP" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="ALRS" _tickerFuture="PLZL" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="IRAO" _tickerFuture="MGNT" onlyChart height={height} />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="LKOH" _tickerFuture="RUAL" onlyChart height={height} />
            </Col>
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
          </Row>
        </>
      )}
      {tab === 'funding' && (
        <>
          <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
            <Col span={6}>
              <StatArbPage tickerStock="IMOEXF" _tickerFuture="MIX-9.25" onlyChart height={height} multi={10000} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="EURRUBF" _tickerFuture="EU-9.25" onlyChart height={height} multi={100000} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="USDRUBF" _tickerFuture="SI-9.25" onlyChart height={height} multi={100000} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="CNYRUBF" _tickerFuture="CNY-9.25" onlyChart height={height} multi={100} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="SBERF" _tickerFuture="SBRF-9.25" onlyChart height={height} multi={100} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="GAZPF" _tickerFuture="GAZR-9.25" onlyChart height={height} multi={100} seriesType="Line" />
            </Col>
            <Col span={6}>
              <StatArbPage tickerStock="GLDRUBF" _tickerFuture="GL-9.25" onlyChart height={height} multi={100} seriesType="Line" />
            </Col>
          </Row>
        </>
      )}

      {tab === 'triangle' && (
        <>
          <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
            <Col span={6}>
              <Triangle_Page
                first="EURRUBF"
                second="USDRUBF"
                third="ED-9.25"
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
                third="UCNY-9.25"
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
                second="SI-9.25"
                third="ED-9.25"
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
                second="SI-9.25"
                third="GOLD-9.25"
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
                second="CNY-9.25"
                third="UCNY-9.25"
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
                first="SI-9.25"
                second="CNY-9.25"
                third="UCNY-9.25"
                multiple={0.001}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </Col>
            <Col span={6}>
              <Triangle_Page
                first="EU-9.25"
                second="SI-9.25"
                third="ED-9.25"
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
    </>
  );
};
