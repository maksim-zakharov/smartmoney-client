import { StatArbPage } from './StatArbPage.tsx';
import React from 'react';
import { Col, Row, Typography } from 'antd';
import { Triangle_Page } from './Triangle_Page.tsx';

export const SmartPage = () => {
  return (
    <>
      <Row gutter={[8, 8]}>
        <Col span={8}>
          <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={400} />
        </Col>
      </Row>
      <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
        <Col span={8}>
          <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="IMOEXF" _tickerFuture="MIX-9.25" onlyChart height={400} multi={10000} seriesType="Line" />
        </Col>
      </Row>
      <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
        <Col span={8}>
          <Triangle_Page first="EURRUBF" second="USDRUBF" third="ED-9.25" multiple={1} noExp onlyChart height={400} seriesType="Line" />
        </Col>
        <Col span={8}>
          <Triangle_Page first="USDRUBF" second="CNYRUBF" third="UCNY-9.25" multiple={1} noExp onlyChart height={400} seriesType="Line" />
        </Col>
      </Row>
      <Typography.Title>Эксперимент</Typography.Title>
      <Row gutter={[8, 8]} style={{ paddingTop: 8 }}>
        <Col span={8}>
          <StatArbPage tickerStock="MTSS" _tickerFuture="YDEX" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="ROSN" _tickerFuture="LKOH" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="ROSN" _tickerFuture="TATN" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="SBER" _tickerFuture="SBERP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="LSNG" _tickerFuture="LSNGP" onlyChart height={400} />
        </Col>
        <Col span={8}>
          <StatArbPage tickerStock="NKNC" _tickerFuture="NKNCP" onlyChart height={400} />
        </Col>
        {/*<Col span={8}>*/}
        {/*  <StatArbPage tickerStock="LKOH" _tickerFuture="TATN" onlyChart height={400} />*/}
        {/*</Col>*/}
        {/*<Col span={8}>*/}
        {/*  <StatArbPage tickerStock="LKOH" _tickerFuture="SNGS" onlyChart height={400} />*/}
        {/*</Col>*/}
        {/*<Col span={8}>*/}
        {/*  <StatArbPage tickerStock="ROSN" _tickerFuture="SNGS" onlyChart height={400} />*/}
        {/*</Col>*/}
        {/*<Col span={8}>*/}
        {/*  <StatArbPage tickerStock="TATN" _tickerFuture="SNGS" onlyChart height={400} />*/}
        {/*</Col>*/}
      </Row>
    </>
  );
};
