import { StatArbPage } from './StatArbPage.tsx';
import React from 'react';
import { Col, Row } from 'antd';
import { Triangle_Page } from './Triangle_Page.tsx';

export const SmartPage = () => {
  const height = 350;
  return (
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
      </Row>
      <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
        <Col span={6}>
          <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={height} />
        </Col>
        <Col span={6}>
          <StatArbPage tickerStock="IMOEXF" _tickerFuture="MIX-9.25" onlyChart height={height} multi={10000} seriesType="Line" />
        </Col>
        <Col span={6}>
          <Triangle_Page first="EURRUBF" second="USDRUBF" third="ED-9.25" multiple={1} noExp onlyChart height={height} seriesType="Line" />
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
  );
};
