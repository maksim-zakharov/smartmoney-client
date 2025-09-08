import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store.ts';
import { DataFeed } from '../api/datafeed.ts';
import { getTimezone } from '../utils.ts';
import {
  ChartingLibraryFeatureset,
  ChartingLibraryWidgetOptions,
  ChartMetaInfo,
  ChartTemplate,
  ChartTemplateContent,
  CustomTimezoneId,
  GmtTimezoneId,
  IChartingLibraryWidget,
  IExternalSaveLoadAdapter,
  LineToolsAndGroupsState,
  PlusClickParams,
  ResolutionString,
  StudyTemplateMetaInfo,
  SubscribeEventsMap,
  Timezone,
  widget,
} from '../assets/charting_library';
import { deleteAlert, openAlertDialog } from '../api/alerts.slice';
import { HistoryObject } from 'alor-api';

export const TWChart = ({ ticker, height = 400, data, lineSerieses, multiple = 100, small, onPlusClick }: any) => {
  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDivElement>(null);
  const dataService = useAppSelector((state) => state.alorSlice.dataService);
  const ws = useAppSelector((state) => state.alorSlice.ws);
  const cTraderAccount = useAppSelector((state) => state.alorSlice.cTraderAccount);

  const alerts = useAppSelector((state) => state.alertsSlice.alerts);
  const tickerAlerts = useMemo(() => alerts.filter((a) => a.ticker === ticker.toUpperCase()), [alerts, ticker]);

  const onNewCandleHandle = useCallback(
    (ticker: string, candle: HistoryObject) => {
      const tickerAlerts = alerts.filter((a) => a.ticker.toUpperCase() === ticker.toUpperCase());
      tickerAlerts.forEach((a) => {
        if (a.condition === 'lessThen' && candle.close < a.price) {
          const body = { chat_id: localStorage.getItem('telegramUserId'), text: a.message || `${ticker} Цена меньше чем ${a.price}` };
          fetch(`https://api.telegram.org/bot${localStorage.getItem('telegramToken')}/sendMessage`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (a.trigger === 'once') dispatch(deleteAlert(a));
        }
        if (a.condition === 'moreThen' && candle.close > a.price) {
          const body = { chat_id: localStorage.getItem('telegramUserId'), text: a.message || `${ticker} Цена больше чем ${a.price}` };
          fetch(`https://api.telegram.org/bot${localStorage.getItem('telegramToken')}/sendMessage`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (a.trigger === 'once') dispatch(deleteAlert(a));
        }
      });
    },
    [alerts],
  );

  const datafeed = useMemo(
    () =>
      dataService
        ? new DataFeed({
            onNewCandle: onNewCandleHandle,
            ws,
            dataService,
            data,
            multiple,
            ctidTraderAccountId: cTraderAccount?.ctidTraderAccountId,
          })
        : null,
    [onNewCandleHandle, ws, dataService, cTraderAccount?.ctidTraderAccountId, data, multiple],
  );

  useEffect(() => {
    if (!ref.current || !datafeed) return;

    let chartLayout;
    const data = localStorage.getItem(`settings-${ticker}`);
    if (data) {
      chartLayout = JSON.parse(data) as object;
      if (chartLayout?.charts?.[0]?.panes?.[0]?.sources?.[0]?.state) {
        chartLayout.charts[0].panes[0].sources[0].state.symbol = ticker;
        chartLayout.charts[0].panes[0].sources[0].state.shortName = ticker;
      }
    }

    const currentTimezone = getTimezone();

    const features = getFeatures();

    const config: ChartingLibraryWidgetOptions = {
      // debug
      debug: false,
      // base options
      container: ref.current,
      symbol: ticker,
      // width: width || ref.current?.clientWidth,
      height: height || ref.current?.clientHeight,
      interval: '5' as ResolutionString,
      locale: 'ru',
      library_path: process.env.NODE_ENV !== 'production' ? '/assets/charting_library/' : '/smartmoney-client/assets/charting_library/',
      datafeed: datafeed, // this.techChartDatafeedService,
      // additional options
      fullscreen: false,
      autosize: true,
      timezone: currentTimezone.name as Timezone,
      custom_timezones: [
        {
          id: currentTimezone.name as CustomTimezoneId,
          alias: `Etc/GMT${currentTimezone.utcOffset > 0 ? '+' : '-'}${currentTimezone.formattedOffset}` as GmtTimezoneId,
          title: currentTimezone.name,
        },
      ],
      overrides: {
        'paneProperties.background': 'rgb(30,44,57)',
      },
      theme: 'dark',
      saved_data: chartLayout as object,
      auto_save_delay: 1,
      time_frames: [
        {
          text: '1000y',
          resolution: '1M' as ResolutionString,
          description: 'Все', // this.translateFn(['timeframes', 'all', 'desc']),
          title: 'Все', // this.translateFn(['timeframes', 'all', 'title']),
        },
        {
          text: '3y',
          resolution: '1M' as ResolutionString,
          description: '3г', // this.translateFn(['timeframes', '3y', 'desc']),
          title: '3г', // this.translateFn(['timeframes', '3y', 'title']),
        },
        {
          text: '1y',
          resolution: '1D' as ResolutionString,
          description: '1г', // this.translateFn(['timeframes', '1y', 'desc']),
          title: '1г', // this.translateFn(['timeframes', '1y', 'title']),
        },
        {
          text: '6m',
          resolution: '1D' as ResolutionString,
          description: '6М', // this.translateFn(['timeframes', '6m', 'desc']),
          title: '6М', // this.translateFn(['timeframes', '6m', 'title']),
        },
        {
          text: '3m',
          resolution: '4H' as ResolutionString,
          description: '3М', // this.translateFn(['timeframes', '3m', 'desc']),
          title: '3М', //  this.translateFn(['timeframes', '3m', 'title']),
        },
        {
          text: '1m',
          resolution: '1H' as ResolutionString,
          description: '1М', // this.translateFn(['timeframes', '1m', 'desc']),
          title: '1М', // this.translateFn(['timeframes', '1m', 'title']),
        },
        {
          text: '14d',
          resolution: '1H' as ResolutionString,
          description: '2Н', // this.translateFn(['timeframes', '2w', 'desc']),
          title: '2Н', // this.translateFn(['timeframes', '2w', 'title']),
        },
        {
          text: '7d',
          resolution: '15' as ResolutionString,
          description: '1Н', // this.translateFn(['timeframes', '1w', 'desc']),
          title: '1Н', // this.translateFn(['timeframes', '1w', 'title']),
        },
        {
          text: '1d',
          resolution: '5' as ResolutionString,
          description: '1д', // this.translateFn(['timeframes', '1d', 'desc']),
          title: '1д', // this.translateFn(['timeframes', '1d', 'title']),
        },
      ],
      symbol_search_request_delay: 2000,
      // for some reasons TV stringifies this field. So service cannot be passed directly
      save_load_adapter: createSaveLoadAdapter(),
      // features
      disabled_features: features.disabled,
      enabled_features: features.enabled,
    };

    const chartWidget = new widget(config);
    subscribeToChartEvents(chartWidget);
    chartWidget.onChartReady(() => {
      const chart = chartWidget.chart();

      tickerAlerts.forEach((alert) => {
        chart
          .createPositionLine()
          .setPrice(alert.price) // Устанавливаем цену из события onPlusClick
          .setText(`${alert.ticker}, ${alert.condition === 'lessThen' ? 'Меньше' : 'Больше'} чем ${alert.price.toFixed(5)}`) // Подпись для линии
          .setQuantity('🔔') // Количество (опционально)
          .setLineStyle(0) // Стиль линии (0 - сплошная, 1 - пунктирная и т.д.)
          .setLineLength(100) // Длина линии (в процентах ширины графика)
          .setLineColor('#FFF'); // Цвет линии
      });
    });
  }, [datafeed, height, lineSerieses, ticker, tickerAlerts]);

  const subscribeToChartEvents = (widget: IChartingLibraryWidget): void => {
    // subscribeToChartEvent(widget, 'onPlusClick', (params: PlusClickParams) => this.selectPrice(params.price));

    subscribeToChartEvent(widget, 'onAutoSaveNeeded', () => saveChartLayout(widget));

    subscribeToChartEvent(widget, 'onPlusClick', (params: PlusClickParams) => {
      onPlusClick?.(params);

      dispatch(openAlertDialog({ ticker: params.symbol, price: Number(params.price.toFixed(5)) }));

      // работает
      // const chart = widget.chart();
      // chart
      //   .createPositionLine()
      //   .setPrice(params.price) // Устанавливаем цену из события onPlusClick
      //   .setText('Позиция') // Подпись для линии
      //   .setQuantity('1') // Количество (опционально)
      //   .setLineStyle(0) // Стиль линии (0 - сплошная, 1 - пунктирная и т.д.)
      //   .setLineLength(100) // Длина линии (в процентах ширины графика)
      //   .setLineColor('#FF0000'); // Цвет линии
    });
  };

  const saveChartLayout = (widget: IChartingLibraryWidget): void => {
    widget.save((state) => {
      localStorage.setItem(`settings-${ticker}`, JSON.stringify(state));
    });
  };

  const subscribeToChartEvent = (
    target: IChartingLibraryWidget,
    event: keyof SubscribeEventsMap,
    callback: SubscribeEventsMap[keyof SubscribeEventsMap],
  ): void => {
    // this.chartEventSubscriptions.push({ event: event, callback });
    target.subscribe(event, callback);
  };

  const getFeatures = (settings: any = {}): { enabled: ChartingLibraryFeatureset[]; disabled: ChartingLibraryFeatureset[] } => {
    const enabled = new Set<ChartingLibraryFeatureset>([
      'side_toolbar_in_fullscreen_mode',
      'chart_crosshair_menu' as ChartingLibraryFeatureset,
      'seconds_resolution',
      'chart_template_storage',
    ]);

    const disabled = new Set(
      [
        'symbol_info',
        'display_market_status',
        'save_shortcut',
        'header_quick_search',
        'header_saveload',
        'header_symbol_search',
        'symbol_search_hot_key',
        small && 'header_compare',
        small && 'left_toolbar',
        small && 'header_screenshot',
        small && 'timeframes_toolbar',
      ].filter(Boolean),
    );

    switchChartFeature('header_widget', settings.panels?.header ?? true, enabled, disabled);
    switchChartFeature('header_chart_type', settings.panels?.headerChartType ?? true, enabled, disabled);
    !small && switchChartFeature('header_compare', settings.panels?.headerCompare ?? true, enabled, disabled);
    switchChartFeature('header_resolutions', settings.panels?.headerResolutions ?? true, enabled, disabled);
    switchChartFeature('header_indicators', settings.panels?.headerIndicators ?? true, enabled, disabled);
    !small && switchChartFeature('header_screenshot', settings.panels?.headerScreenshot ?? true, enabled, disabled);
    switchChartFeature('header_settings', settings.panels?.headerSettings ?? true, enabled, disabled);
    switchChartFeature('header_undo_redo', settings.panels?.headerUndoRedo ?? true, enabled, disabled);
    switchChartFeature('header_fullscreen_button', settings.panels?.headerFullscreenButton ?? true, enabled, disabled);
    !small && switchChartFeature('left_toolbar', settings.panels?.drawingsToolbar ?? true, enabled, disabled);
    !small && switchChartFeature('timeframes_toolbar', settings.panels?.timeframesBottomToolbar ?? true, enabled, disabled);
    switchChartFeature('custom_resolutions', settings.allowCustomTimeframes ?? false, enabled, disabled);

    return {
      enabled: [...enabled.values()],
      disabled: [...disabled.values()],
    };
  };

  const switchChartFeature = (
    feature: ChartingLibraryFeatureset,
    enabled: boolean,
    enabledSet: Set<ChartingLibraryFeatureset>,
    disabledSet: Set<ChartingLibraryFeatureset>,
  ): void => {
    if (enabled) {
      enabledSet.add(feature);
    } else {
      disabledSet.add(feature);
    }
  };

  const createSaveLoadAdapter = (): IExternalSaveLoadAdapter => {
    return {
      getAllChartTemplates(): Promise<string[]> {
        return Promise.resolve([]);
      },

      getChartTemplateContent(templateName: string): Promise<ChartTemplate> {
        return Promise.resolve(null);
      },

      saveChartTemplate(newName: string, theme: ChartTemplateContent): Promise<void> {
        return Promise.resolve();
      },

      removeChartTemplate(templateName: string): Promise<void> {
        return Promise.resolve();
      },

      saveChart(chartData): Promise<string> {
        localStorage.setItem(`chartData-${ticker}`, JSON.stringify(chartData));
        return Promise.resolve('');
      },

      getAllCharts(): Promise<ChartMetaInfo[]> {
        return Promise.resolve([]);
      },

      getChartContent(): Promise<string> {
        return Promise.resolve('');
      },

      removeChart(): Promise<void> {
        return Promise.resolve();
      },

      getAllStudyTemplates(): Promise<StudyTemplateMetaInfo[]> {
        return Promise.resolve([]);
      },

      loadDrawingTemplate(): Promise<string> {
        return Promise.resolve('');
      },

      getDrawingTemplates(): Promise<string[]> {
        return Promise.resolve([]);
      },

      loadLineToolsAndGroups(): Promise<Partial<LineToolsAndGroupsState> | null> {
        return Promise.resolve(null);
      },

      removeDrawingTemplate(): Promise<void> {
        return Promise.resolve();
      },

      saveDrawingTemplate(): Promise<void> {
        return Promise.resolve();
      },

      saveLineToolsAndGroups(): Promise<void> {
        return Promise.resolve();
      },

      saveStudyTemplate(): Promise<void> {
        return Promise.resolve();
      },

      removeStudyTemplate(): Promise<void> {
        return Promise.resolve();
      },

      getStudyTemplateContent(): Promise<string> {
        return Promise.resolve('');
      },
    };
  };

  return <div ref={ref} style={{ position: 'relative', height: height || '100%' }}></div>;
};
