import { StatArbPage } from './StatArbPage';
import React, { useMemo } from 'react';
import { Pagination, Radio, Space } from 'antd';
import { Triangle_Page } from './Triangle_Page';
import { SegmentedLabeledOption } from 'rc-segmented';
import { useSearchParams } from 'react-router-dom';
import { symbolFuturePairs } from '../../../symbolFuturePairs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.tsx';
import { useAppSelector } from '../../store';
import { TWChart } from '../../components/TWChart.tsx';
import { TickerSettingsDialog } from '../../components/TickerSettingsDialog.tsx';
import { cn } from '../../lib/utils.ts';

export const SmartPage = () => {
  const height = 350;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('segment') || 'stocks';
  const expirationMonth = searchParams.get('expirationMonth') || '9.25';

  const span = Number(searchParams.get('span') || 6);

  const page = Number(searchParams.get('page') || 1);

  const favoritePairs = useAppSelector((state) => state.alorSlice.favoritePairs || []);

  const { cTraderSymbols } = useAppSelector((state) => state.alorSlice);

  const stockSymbols = useMemo(
    () => cTraderSymbols?.filter((s) => s.symbolCategoryId === 6 && s.symbolName.includes('_xp')) || [],
    [cTraderSymbols],
  );

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

  const options: SegmentedLabeledOption[] = [
    {
      label: 'Избранное',
      value: 'favorites',
    },
    {
      label: 'Акции',
      value: 'stocks',
    },
    {
      label: 'US-Акции',
      value: 'us-stocks',
    },
    {
      label: 'Стат-фьючи',
      value: 'futures-stats',
    },
    {
      label: 'Фандинг',
      value: 'funding',
    },
    {
      label: 'Forex',
      value: 'forex-local',
    },
    {
      label: 'ED-Триноги',
      value: 'ed-triangle',
    },
    {
      label: 'UC-Триноги',
      value: 'uc-triangle',
    },
    {
      label: 'GD-Триноги',
      value: 'gd-triangle',
    },
    {
      label: 'Другие',
      value: 'others',
    },
  ];

  const spanOptions = [
    { label: 1, value: 1 },
    { label: 2, value: 2 },
    { label: 3, value: 3 },
    { label: 4, value: 4 },
    { label: 6, value: 6 },
    { label: 8, value: 8 },
  ];

  const others = [
    { left: 'SBER', right: 'SBERP' },
    { left: 'TATN', right: 'TATNP' },
    { left: 'GAZP', right: 'LKOH' },
    { left: 'GAZP', right: 'GMKN' },
    { left: 'MRKC', right: 'LENT' },
    { left: 'GMKN', right: 'LKOH' },
    { left: 'SNGSP', right: 'TRNFP' },
    { left: 'RTKM', right: 'RTKMP' },
    { left: 'LKOH', right: 'X5' },
    { left: 'GAZP', right: 'MOEX' },
    { left: 'LKOH', right: 'TATNP' },
    { left: 'GAZP', right: 'TATNP' },
    { left: 'SMLT', right: 'AFKS' },
    { left: 'MTSS', right: 'RTKMP' },
    { left: 'TATN', right: 'GMKN' },
    { left: 'LKOH', right: 'TATN' },
    { left: 'GAZP', right: 'TATN' },
    { left: 'LKOH', right: 'MOEX' },
    { left: 'X5', right: 'RTKMP' },
    { left: 'GMKN', right: 'TATNP' },
    { left: 'GAZP', right: 'X5' },
    { left: 'TATNP', right: 'RTKMP' },
    { left: 'RTKMP', right: 'MGNT' },
    { left: 'LKOH', right: 'RTKM' },
    { left: 'MRKC', right: 'LSNGP' },
    { left: 'RUAL', right: 'GMKN' },
    { left: 'MTLR', right: 'NVTK' },
    { left: 'GMKN', right: 'MOEX' },
    { left: 'VTBR', right: 'MTSS' },
    { left: 'TATNP', right: 'MTSS' },
    { left: 'MTSS', right: 'RTKM' },
    { left: 'RUAL', right: 'MOEX' },
    { left: 'GAZP', right: 'RUAL' },
    { left: 'LKOH', right: 'SIBN' },
    { left: 'SIBN', right: 'MOEX' },
    { left: 'RTKM', right: 'MGNT' },
    { left: 'GAZP', right: 'RTKM' },
    { left: 'RUAL', right: 'LKOH' },
    { left: 'TATNP', right: 'RTKM' },
    { left: 'TUZA', right: 'RZSB' },
    { left: 'TATN', right: 'MOEX' },
    { left: 'X5', right: 'TATNP' },
    { left: 'CNRU', right: 'ENPG' },
    { left: 'TATN', right: 'RTKMP' },
    { left: 'MOEX', right: 'MGNT' },
    { left: 'MAGN', right: 'YDEX' },
    { left: 'X5', right: 'RTKM' },
    { left: 'X5', right: 'MTSS' },
    { left: 'TATNP', right: 'MOEX' },
    { left: 'TATN', right: 'MTSS' },
    { left: 'TATN', right: 'RTKM' },
    { left: 'GAZP', right: 'SIBN' },
    { left: 'MTSS', right: 'MGNT' },
    { left: 'RUAL', right: 'RTKM' },
    { left: 'LENT', right: 'LSNGP' },
    { left: 'RTKM', right: 'SIBN' },
    { left: 'MTLR', right: 'RNFT' },
    { left: 'LKOH', right: 'RTKMP' },
    { left: 'RNFT', right: 'GMKN' },
    { left: 'GAZP', right: 'MGNT' },
    { left: 'RNFT', right: 'LKOH' },
    { left: 'RUAL', right: 'MGNT' },
    { left: 'IVAT', right: 'ASTR' },
    { left: 'GAZP', right: 'RNFT' },
    { left: 'LKOH', right: 'MGNT' },
    { left: 'SIBN', right: 'MGNT' },
    { left: 'VTBR', right: 'RTKMP' },
    { left: 'NVTK', right: 'X5' },
    { left: 'GMKN', right: 'X5' },
    { left: 'GAZP', right: 'RTKMP' },
    { left: 'CNRU', right: 'PHOR' },
    { left: 'RUAL', right: 'TATN' },
    { left: 'RNFT', right: 'NVTK' },
    { left: 'GMKN', right: 'RTKM' },
    { left: 'LKOH', right: 'MTSS' },
    { left: 'GMKN', right: 'SIBN' },
    { left: 'TATN', right: 'X5' },
    { left: 'RUAL', right: 'SIBN' },
    { left: 'NVTK', right: 'SGZH' },
    { left: 'VTBR', right: 'MGNT' },
    { left: 'GAZP', right: 'MTSS' },
    { left: 'TATNP', right: 'MGNT' },
    { left: 'MTLR', right: 'LKOH' },
    { left: 'TATN', right: 'MGNT' },
    { left: 'X5', right: 'MGNT' },
    { left: 'RTKM', right: 'MOEX' },
    { left: 'LEAS', right: 'MDMG' },
    { left: 'VTBR', right: 'TATNP' },
    { left: 'IRAO', right: 'X5' },
    { left: 'MOEX', right: 'RTKMP' },
    { left: 'X5', right: 'MOEX' },
    { left: 'RUAL', right: 'PLZL' },
    { left: 'RNFT', right: 'X5' },
    { left: 'UPRO', right: 'KMAZ' },
    { left: 'X5', right: 'SIBN' },
    { left: 'RUAL', right: 'TATNP' },
    { left: 'NVTK', right: 'LKOH' },
    { left: 'VTBR', right: 'X5' },
    { left: 'GMKN', right: 'MTSS' },
    { left: 'GMKN', right: 'MGNT' },
    { left: 'MTLR', right: 'GMKN' },
    { left: 'VTBR', right: 'TATN' },
    { left: 'MAGN', right: 'NVTK' },
    { left: 'MAGN', right: 'AFKS' },
    { left: 'NVTK', right: 'AFKS' },
    { left: 'VTBR', right: 'GAZP' },
    { left: 'IRAO', right: 'TATNP' },
    { left: 'VTBR', right: 'MOEX' },
    { left: 'IRAO', right: 'RTKMP' },
    { left: 'AFLT', right: 'SBERP' },
    { left: 'AQUA', right: 'SOFL' },
    { left: 'RNFT', right: 'ALRS' },
    { left: 'MTLR', right: 'SGZH' },
    { left: 'MTLR', right: 'X5' },
    { left: 'GAZP', right: 'MTLR' },
    { left: 'GMKN', right: 'RTKMP' },
    { left: 'MTLR', right: 'AFKS' },
    { left: 'RUAL', right: 'RTKMP' },
    { left: 'ENPG', right: 'PHOR' },
    { left: 'RNFT', right: 'MAGN' },
    { left: 'TATNP', right: 'SIBN' },
    { left: 'SIBN', right: 'RTKMP' },
    { left: 'GAZP', right: 'NVTK' },
    { left: 'TATN', right: 'SIBN' },
    { left: 'RAGR', right: 'RUAL' },
    { left: 'YDEX', right: 'SVCB' },
    { left: 'MTSS', right: 'MOEX' },
    { left: 'RUAL', right: 'X5' },
    { left: 'AFKS', right: 'SGZH' },
    { left: 'MTSS', right: 'SIBN' },
    { left: 'RAGR', right: 'PLZL' },
    { left: 'VTBR', right: 'RTKM' },
    { left: 'SBER', right: 'AFLT' },
    { left: 'AFKS', right: 'YDEX' },
    { left: 'RNFT', right: 'SGZH' },
    { left: 'VTBR', right: 'LKOH' },
    { left: 'IRAO', right: 'MTSS' },
    { left: 'SMLT', right: 'YDEX' },
    { left: 'MAGN', right: 'SGZH' },
    { left: 'RUAL', right: 'MTSS' },
    { left: 'IRAO', right: 'LKOH' },
    { left: 'RNFT', right: 'TATNP' },
    { left: 'RNFT', right: 'AFKS' },
    { left: 'VTBR', right: 'GMKN' },
    { left: 'SELG', right: 'FEES' },
    { left: 'GMKN', right: 'NVTK' },
    { left: 'IRAO', right: 'NVTK' },
    { left: 'YDEX', right: 'SGZH' },
    { left: 'RNFT', right: 'RTKM' },
    { left: 'IRAO', right: 'TATN' },
    { left: 'MAGN', right: 'SMLT' },
    { left: 'IRAO', right: 'GAZP' },
    { left: 'RNFT', right: 'SIBN' },
    { left: 'MTLR', right: 'TATNP' },
    { left: 'ASTR', right: 'BELU' },
    { left: 'RNFT', right: 'TATN' },
    { left: 'ASTR', right: 'BSPB' },
    { left: 'RUAL', right: 'RNFT' },
    { left: 'VSEH', right: 'BANEP' },
    { left: 'ALRS', right: 'SIBN' },
    { left: 'NVTK', right: 'YDEX' },
    { left: 'LKOH', right: 'ALRS' },
    { left: 'MAGE', right: 'GEMA' },
    { left: 'SPBE', right: 'MOEX' },
    { left: 'RNFT', right: 'YDEX' },
    { left: 'IRAO', right: 'RTKM' },
    { left: 'X5', right: 'SGZH' },
    { left: 'BELU', right: 'BSPB' },
    { left: 'GAZP', right: 'ALRS' },
    { left: 'MTLR', right: 'TATN' },
    { left: 'VTBR', right: 'IRAO' },
    { left: 'MTLR', right: 'MAGN' },
    { left: 'SFIN', right: 'MBNK' },
    { left: 'BELU', right: 'BANEP' },
    { left: 'PLZL', right: 'MGNT' },
    { left: 'IRAO', right: 'SVCB' },
    { left: 'ALRS', right: 'YDEX' },
    { left: 'RAGR', right: 'MOEX' },
    { left: 'SMLT', right: 'SVCB' },
    { left: 'VTBR', right: 'SIBN' },
    { left: 'RNFT', right: 'MOEX' },
    { left: 'BANEP', right: 'BSPB' },
    { left: 'VTBR', right: 'RUAL' },
  ];

  const favorites = [
    ['SMLT', 'AFKS'],
    // ['RUAL', 'MOEX'],
    // ['HEAD', 'MDMG'],
    // ['RNFT', 'MAGN'],
    ['LKOH', 'SIBN'],
    // ['IVAT', 'ASTR'],
    // ['CNRU', 'PHOR'],
    // ['VTBR', 'MOEX'],
    // ['RAGR', 'RUAL'],
    ['SFIN', 'MBNK'],
  ];

  const limit = 72 / span;
  const offset = (page - 1) * limit;

  const filteredOthers = others.slice(offset, offset + limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Space>
        <Radio.Group
          block
          options={spanOptions}
          onChange={(e) => setSpan(e.target.value)}
          value={span}
          optionType="button"
          buttonStyle="solid"
        />
        {tab === 'others' && <Pagination current={page} total={others.length} pageSize={24 / span} onChange={setPage} />}
        <TickerSettingsDialog />
      </Space>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ margin: '4px auto' }}>
          {options.map((o) => (
            <TabsTrigger value={o.value.toString()}>{o.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="others">
          <div className="grid-cols-24 grid">
            {filteredOthers.map((item) => (
              <div className={cn(`col-span-${24 / span}`)}>
                <StatArbPage tickerStock={item.left} _tickerFuture={item.right} onlyChart height={height} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="us-stocks">
          <div className="grid-cols-24 grid">
            {stockSymbols.map((item) => (
              <div className={cn(`col-span-${24 / span}`)}>
                <StatArbPage
                  tickerStock={`FOREX:${item.symbolName}`}
                  _tickerFuture={`ITS:${item.symbolName.replace('_xp', '')}`}
                  multi={0.1}
                  onlyChart
                  height={height}
                />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="favorites">
          <div className="grid-cols-24 grid">
            {favoritePairs.map((fp) => (
              <div className={cn(`col-span-${24 / span}`)}>
                {fp.type === 'solo' && (
                  <div className="relative" style={{ height }}>
                    <TWChart ticker={fp.first} height={height} small multiple={1} />
                  </div>
                )}
                {fp.type === 'double' && (
                  <StatArbPage tickerStock={fp.first} _tickerFuture={fp.second} multi={fp.multiple} onlyChart height={height} />
                )}
                {fp.type === 'triple' && (
                  <Triangle_Page
                    second={fp.second}
                    first={fp.first}
                    third={fp.third}
                    onlyChart
                    multiple={fp.multiple}
                    rate={0.13}
                    noExp
                    height={height}
                    seriesType="Line"
                  />
                )}
              </div>
            ))}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*{favorites.map((pair) => (*/}
            {/*  <Col span={span}>*/}
            {/*    <StatArbPage tickerStock={pair[0]} _tickerFuture={pair[1]} onlyChart height={height} />*/}
            {/*  </Col>*/}
            {/*))}*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="UCNY-9.25" _tickerFuture="USDCNH_xp" multi={1000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="ED-9.25" _tickerFuture="EURUSD_xp" multi={100} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="GOLD-9.25" _tickerFuture="XAUUSD_xp" multi={100000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="PLD-9.25" _tickerFuture="XPDUSD_xp" multi={100000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="PLT-9.25" _tickerFuture="XPTUSD_xp" multi={100000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="SILV-9.25" _tickerFuture="XAGUSD_xp" multi={10000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="BR-9.25" _tickerFuture="BRNUSD_xp" multi={10000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="NG-9.25" _tickerFuture="NGCUSD_xp" multi={1000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="SPYF-9.25" _tickerFuture="SPXUSD_xp" multi={1000000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="HANG-9.25" _tickerFuture="HSIHKD_xp" multi={1000000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="NASD-9.25" _tickerFuture="NDXUSD_xp" multi={100000} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage tickerStock="COPPER-9.25" _tickerFuture="CUCUSD_xp" multi={0.0453592} onlyChart height={height} />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage*/}
            {/*    tickerStock="IMOEXF"*/}
            {/*    _tickerFuture={`MIX-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    height={height}*/}
            {/*    multi={10000}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage*/}
            {/*    tickerStock="CNYRUBF"*/}
            {/*    _tickerFuture={`CNY-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    height={height}*/}
            {/*    multi={100}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <StatArbPage*/}
            {/*    tickerStock="GLDRUBF"*/}
            {/*    _tickerFuture={`GL-${expirationMonth}`}*/}
            {/*    multi={100}*/}
            {/*    seriesType="Line"*/}
            {/*    onlyChart*/}
            {/*    height={height}*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    second={`CNY-${expirationMonth}`}*/}
            {/*    first={`SI-${expirationMonth}`}*/}
            {/*    third={`USDCNH_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.01}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    second={`CNY-${expirationMonth}`}*/}
            {/*    first={`SI-${expirationMonth}`}*/}
            {/*    third={`UCNY-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.001}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`EU-${expirationMonth}`}*/}
            {/*    second={`SI-${expirationMonth}`}*/}
            {/*    third={`ED-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={1}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`EU-${expirationMonth}`}*/}
            {/*    second={`SI-${expirationMonth}`}*/}
            {/*    third={`EURUSD_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={1}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`EU-${expirationMonth}`}*/}
            {/*    second={`CNY-${expirationMonth}`}*/}
            {/*    third={`EURCNH_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.01}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`SI-${expirationMonth}`}*/}
            {/*    third={`GOLD-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`SI-${expirationMonth}`}*/}
            {/*    third={`XAUUSD_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100000}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`EU-${expirationMonth}`}*/}
            {/*    third={`XAUEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100000}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`SILV-${expirationMonth}`}*/}
            {/*    second={`ED-${expirationMonth}`}*/}
            {/*    third={`XAGEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={100}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
          </div>
        </TabsContent>
        <TabsContent value="futures-stats">
          <div className="grid-cols-24 grid">
            {symbolFuturePairs.map((item) => (
              <div className={cn(`col-span-${24 / span}`)}>
                <StatArbPage tickerStock={item.stockSymbol} _tickerFuture={`${item.futuresSymbol}-9.25`} onlyChart height={height} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="stocks">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="TATN" _tickerFuture="TATNP" onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="RTKM" _tickerFuture="RTKMP" onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="MTLR" _tickerFuture="MTLRP" onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="BANE" _tickerFuture="BANEP" onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="SNGS" _tickerFuture="SNGSP" onlyChart height={height} />
            </div>
            {favorites.map((pair) => (
              <div className={cn(`col-span-${24 / span}`)}>
                <StatArbPage tickerStock={pair[0]} _tickerFuture={pair[1]} onlyChart height={height} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="forex-local">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="UCNY-9.25" _tickerFuture="USDCNH_xp" multi={1000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="ED-9.25" _tickerFuture="EURUSD_xp" multi={100} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="GOLD-9.25" _tickerFuture="XAUUSD_xp" multi={100000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="PLD-9.25" _tickerFuture="XPDUSD_xp" multi={100000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="PLT-9.25" _tickerFuture="XPTUSD_xp" multi={100000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="SILV-9.25" _tickerFuture="XAGUSD_xp" multi={10000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="BR-9.25" _tickerFuture="BRNUSD_xp" multi={10000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="NG-9.25" _tickerFuture="NGCUSD_xp" multi={1000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="SPYF-9.25" _tickerFuture="SPXUSD_xp" multi={1000000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="HANG-9.25" _tickerFuture="HSIHKD_xp" multi={1000000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="NASD-9.25" _tickerFuture="NDXUSD_xp" multi={100000} onlyChart height={height} />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage tickerStock="COPPER-9.25" _tickerFuture="CUCUSD_xp" multi={0.0453592} onlyChart height={height} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="funding">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="IMOEXF"
                _tickerFuture={`MIX-${expirationMonth}`}
                onlyChart
                height={height}
                multi={10000}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="EURRUBF"
                _tickerFuture={`EU-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="USDRUBF"
                _tickerFuture={`SI-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100000}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="CNYRUBF"
                _tickerFuture={`CNY-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="SBERF"
                _tickerFuture={`SBRF-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="GAZPF"
                _tickerFuture={`GAZR-${expirationMonth}`}
                onlyChart
                height={height}
                multi={100}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <StatArbPage
                tickerStock="GLDRUBF"
                _tickerFuture={`GL-${expirationMonth}`}
                multi={100}
                seriesType="Line"
                onlyChart
                height={height}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="uc-triangle">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
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
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    second="CNYRUBF"*/}
            {/*    first={`SI-${expirationMonth}`}*/}
            {/*    third={`UCNY-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.001}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                second={`CNY-${expirationMonth}`}
                first={`USDRUBF`}
                third={`UCNY-${expirationMonth}`}
                onlyChart
                multiple={1}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                second={`CNY-${expirationMonth}`}
                first={`SI-${expirationMonth}`}
                third={`UCNY-${expirationMonth}`}
                onlyChart
                multiple={0.001}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                second="CNYRUBF"
                first="USDRUBF"
                third={`USDCNH_xp`}
                multiple={10}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    second="CNYRUBF"*/}
            {/*    first={`SI-${expirationMonth}`}*/}
            {/*    third={`USDCNH_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.01}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                second={`CNY-${expirationMonth}`}
                first={`USDRUBF`}
                third={`USDCNH_xp`}
                onlyChart
                multiple={10}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                second={`CNY-${expirationMonth}`}
                first={`SI-${expirationMonth}`}
                third={`USDCNH_xp`}
                onlyChart
                multiple={0.01}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="ed-triangle">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
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
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
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
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`EU-${expirationMonth}`}*/}
            {/*    second={`USDRUBF`}*/}
            {/*    third={`ED-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.001}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`EU-${expirationMonth}`}
                second={`SI-${expirationMonth}`}
                third={`ED-${expirationMonth}`}
                onlyChart
                multiple={1}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first="EURRUBF"
                second="USDRUBF"
                third={`EURUSD_xp`}
                multiple={1}
                noExp
                onlyChart
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first="EURRUBF"
                second={`SI-${expirationMonth}`}
                third={`EURUSD_xp`}
                onlyChart
                multiple={1000}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`EU-${expirationMonth}`}*/}
            {/*    second={`USDRUBF`}*/}
            {/*    third={`EURUSD_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={0.001}*/}
            {/*    rate={0.13}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`EU-${expirationMonth}`}
                second={`SI-${expirationMonth}`}
                third={`EURUSD_xp`}
                onlyChart
                multiple={1}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`EU-${expirationMonth}`}
                second={`CNY-${expirationMonth}`}
                third={`EURCNH_xp`}
                onlyChart
                multiple={0.01}
                rate={0.13}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="gd-triangle">
          <div className="grid-cols-24 grid">
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first="GLDRUBF"
                second={`USDRUBF`}
                third={`GOLD-${expirationMonth}`}
                onlyChart
                multiple={31.1}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
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
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`USDRUBF`}*/}
            {/*    third={`GOLD-${expirationMonth}`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31.1}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`GL-${expirationMonth}`}
                second={`SI-${expirationMonth}`}
                third={`GOLD-${expirationMonth}`}
                onlyChart
                multiple={31100}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first="GLDRUBF"
                second={`USDRUBF`}
                third={`XAUUSD_xp`}
                onlyChart
                multiple={31100}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first="GLDRUBF"
                second={`SI-${expirationMonth}`}
                third={`XAUUSD_xp`}
                onlyChart
                multiple={31100000}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`USDRUBF`}*/}
            {/*    third={`XAUUSD_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`GL-${expirationMonth}`}
                second={`SI-${expirationMonth}`}
                third={`XAUUSD_xp`}
                onlyChart
                multiple={31100000}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`GL-${expirationMonth}`}
                second={`EU-${expirationMonth}`}
                third={`XAUEUR_xp`}
                onlyChart
                multiple={31100000}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            <div className={cn(`col-span-${24 / span}`)}>
              <Triangle_Page
                first={`SILV-${expirationMonth}`}
                second={`ED-${expirationMonth}`}
                third={`XAGEUR_xp`}
                onlyChart
                multiple={100}
                rate={0.18}
                noExp
                height={height}
                seriesType="Line"
              />
            </div>
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first="GLDRUBF"*/}
            {/*    second={`EURRUBF`}*/}
            {/*    third={`XAUEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first="GLDRUBF"*/}
            {/*    second={`EU-${expirationMonth}`}*/}
            {/*    third={`XAUEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100000}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`EURRUBF`}*/}
            {/*    third={`XAUEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
            {/*<Col span={span}>*/}
            {/*  <Triangle_Page*/}
            {/*    first={`GL-${expirationMonth}`}*/}
            {/*    second={`EU-${expirationMonth}`}*/}
            {/*    third={`XAUEUR_xp`}*/}
            {/*    onlyChart*/}
            {/*    multiple={31100000}*/}
            {/*    rate={0.18}*/}
            {/*    noExp*/}
            {/*    height={height}*/}
            {/*    seriesType="Line"*/}
            {/*  />*/}
            {/*</Col>*/}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
