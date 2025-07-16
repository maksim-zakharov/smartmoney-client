import { StatArbPage } from './StatArbPage.tsx';
import React from 'react';
import { Col, Row } from 'antd';

export const SmartPage = () => {
  return (
    <>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={400} />
        </Col>
        <Col span={12}>
          <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={400} />
        </Col>
      </Row>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={400} />
        </Col>
        <Col span={12}>
          <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={400} />
        </Col>
      </Row>
    </>
  );
};
