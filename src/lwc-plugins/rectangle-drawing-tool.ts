import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    Coordinate,
    IChartApi,
    isBusinessDay,
    ISeriesApi,
    ISeriesPrimitiveAxisView,
    ISeriesPrimitivePaneRenderer,
    ISeriesPrimitivePaneView,
    MouseEventParams,
    SeriesPrimitivePaneViewZOrder,
    SeriesType,
    Time,
} from 'lightweight-charts';
import { ensureDefined } from './helpers/assertions';
import { PluginBase } from './plugin-base';
import { positionsBox } from './helpers/dimensions/positions';

class RectanglePaneRenderer implements ISeriesPrimitivePaneRenderer {
    _p1: ViewPoint;
    _p2: ViewPoint;
    _options: RectangleDrawingToolOptions;

    constructor(p1: ViewPoint, p2: ViewPoint, options: RectangleDrawingToolOptions) {
        this._p1 = p1;
        this._p2 = p2;
        this._options = options;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace(scope => {
            if (
                this._p1.x === null ||
                this._p1.y === null ||
                this._p2.x === null ||
                this._p2.y === null
            )
                return;
            const ctx = scope.context;
            const horizontalPositions = positionsBox(
                this._p1.x,
                this._p2.x,
                scope.horizontalPixelRatio
            );
            const verticalPositions = positionsBox(
                this._p1.y,
                this._p2.y,
                scope.verticalPixelRatio
            );

            const borderWidth = this._options.borderWidth ?? 1;

            const borderLeftWidth = this._options.borderLeftWidth ?? borderWidth;
            const borderRightWidth = this._options.borderRightWidth ?? borderWidth;
            const borderTopWidth = this._options.borderTopWidth ?? borderWidth;
            const borderBottomWidth = this._options.borderBottomWidth ?? borderWidth;
            // Сначала бордер
            ctx.fillStyle = this._options.borderColor || 'rgba(255, 100, 219, .2)'; // this._options.fillColor;
            ctx.fillRect(
                horizontalPositions.position,
                verticalPositions.position,
                horizontalPositions.length,
                verticalPositions.length
            )
            ctx.clearRect(
                horizontalPositions.position + borderLeftWidth,
                verticalPositions.position + borderTopWidth,
                horizontalPositions.length - (borderLeftWidth + borderRightWidth),
                verticalPositions.length - (borderTopWidth + borderBottomWidth)
            );
            // Потом внутри
            ctx.fillStyle = this._options.fillColor;
            ctx.fillRect(
                horizontalPositions.position + borderLeftWidth,
                verticalPositions.position + borderTopWidth,
                horizontalPositions.length - (borderLeftWidth + borderRightWidth),
                verticalPositions.length - (borderTopWidth + borderBottomWidth)
            );
        });
    }
}

interface ViewPoint {
    x: Coordinate | null;
    y: Coordinate | null;
}

class RectanglePaneView implements ISeriesPrimitivePaneView {
    _source: Rectangle;
    _p1: ViewPoint = { x: null, y: null };
    _p2: ViewPoint = { x: null, y: null };

    constructor(source: Rectangle) {
        this._source = source;
    }

    update() {
        const series = this._source.series;
        const y1 = series.priceToCoordinate(this._source._p1.price);
        const y2 = series.priceToCoordinate(this._source._p2.price);
        const timeScale = this._source.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this._source._p1.time);
        const x2 = timeScale.timeToCoordinate(this._source._p2.time);
        this._p1 = { x: x1, y: y1 };
        this._p2 = { x: x2, y: y2 };
    }

    renderer() {
        return new RectanglePaneRenderer(
            this._p1,
            this._p2,
            this._source._options
        );
    }
}

class RectangleAxisPaneRenderer implements ISeriesPrimitivePaneRenderer {
    _p1: number | null;
    _p2: number | null;
    _fillColor: string;
    _vertical: boolean = false;

    constructor(
        p1: number | null,
        p2: number | null,
        fillColor: string,
        vertical: boolean
    ) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
        this._vertical = vertical;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1 === null || this._p2 === null) return;
            const ctx = scope.context;
            ctx.globalAlpha = 0.5;
            const positions = positionsBox(
                this._p1,
                this._p2,
                this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
            );
            ctx.fillStyle = this._fillColor;
            if (this._vertical) {
                ctx.fillRect(0, positions.position, 15, positions.length);
            } else {
                ctx.fillRect(positions.position, 0, positions.length, 15);
            }
        });
    }
}

abstract class RectangleAxisPaneView implements ISeriesPrimitivePaneView {
    _source: Rectangle;
    _p1: number | null = null;
    _p2: number | null = null;
    _vertical: boolean = false;

    constructor(source: Rectangle, vertical: boolean) {
        this._source = source;
        this._vertical = vertical;
    }

    abstract getPoints(): [Coordinate | null, Coordinate | null];

    update() {
        [this._p1, this._p2] = this.getPoints();
    }

    renderer() {
        return new RectangleAxisPaneRenderer(
            this._p1,
            this._p2,
            this._source._options.fillColor,
            this._vertical
        );
    }
    zOrder(): SeriesPrimitivePaneViewZOrder {
        return 'bottom';
    }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
    getPoints(): [Coordinate | null, Coordinate | null] {
        const series = this._source.series;
        const y1 = series.priceToCoordinate(this._source._p1.price);
        const y2 = series.priceToCoordinate(this._source._p2.price);
        return [y1, y2];
    }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
    getPoints(): [Coordinate | null, Coordinate | null] {
        const timeScale = this._source.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this._source._p1.time);
        const x2 = timeScale.timeToCoordinate(this._source._p2.time);
        return [x1, x2];
    }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
    _source: Rectangle;
    _p: Point;
    _pos: Coordinate | null = null;
    constructor(source: Rectangle, p: Point) {
        this._source = source;
        this._p = p;
    }
    abstract update(): void;
    abstract text(): string;

    coordinate() {
        return this._pos ?? -1;
    }

    visible(): boolean {
        return this._source._options.showLabels;
    }

    tickVisible(): boolean {
        return this._source._options.showLabels;
    }

    textColor() {
        return this._source._options.labelTextColor;
    }
    backColor() {
        return this._source._options.labelColor;
    }
    movePoint(p: Point) {
        this._p = p;
        this.update();
    }
}

class RectangleTimeAxisView extends RectangleAxisView {
    update() {
        const timeScale = this._source.chart.timeScale();
        this._pos = timeScale.timeToCoordinate(this._p.time);
    }
    text() {
        return this._source._options.timeLabelFormatter(this._p.time);
    }
}

class RectanglePriceAxisView extends RectangleAxisView {
    update() {
        const series = this._source.series;
        this._pos = series.priceToCoordinate(this._p.price);
    }
    text() {
        return this._source._options.priceLabelFormatter(this._p.price);
    }
}

export interface Point {
    time: Time;
    price: number;
}

export interface RectangleDrawingToolOptions {
    fillColor: string;
    previewFillColor: string;
    labelColor: string;
    labelTextColor: string;
    showLabels: boolean;
    priceLabelFormatter: (price: number) => string;
    timeLabelFormatter: (time: Time) => string;
    borderWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderColor?: string;
}

const defaultOptions: RectangleDrawingToolOptions = {
    fillColor: 'rgba(200, 50, 100, 0.75)',
    previewFillColor: 'rgba(200, 50, 100, 0.25)',
    labelColor: 'rgba(200, 50, 100, 1)',
    labelTextColor: 'white',
    showLabels: true,
    priceLabelFormatter: (price: number) => price.toFixed(2),
    timeLabelFormatter: (time: Time) => {
        if (typeof time == 'string') return time;
        const date = isBusinessDay(time)
            ? new Date(time.year, time.month, time.day)
            : new Date(time * 1000);
        return date.toLocaleDateString();
    },
};

export class Rectangle extends PluginBase {
    _options: RectangleDrawingToolOptions;
    _p1: Point;
    _p2: Point;
    _paneViews: RectanglePaneView[];
    _timeAxisViews: RectangleTimeAxisView[];
    _priceAxisViews: RectanglePriceAxisView[];
    _priceAxisPaneViews: RectanglePriceAxisPaneView[];
    _timeAxisPaneViews: RectangleTimeAxisPaneView[];

    constructor(
        p1: Point,
        p2: Point,
        options: Partial<RectangleDrawingToolOptions> = {}
    ) {
        super();
        this._p1 = p1;
        this._p2 = p2;
        this._options = {
            ...defaultOptions,
            ...options,
        };
        this._paneViews = [new RectanglePaneView(this)];
        this._timeAxisViews = [
            new RectangleTimeAxisView(this, p1),
            new RectangleTimeAxisView(this, p2),
        ];
        this._priceAxisViews = [
            new RectanglePriceAxisView(this, p1),
            new RectanglePriceAxisView(this, p2),
        ];
        this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
        this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
    }

    updateAllViews() {
        this._paneViews.forEach(pw => pw.update());
        this._timeAxisViews.forEach(pw => pw.update());
        this._priceAxisViews.forEach(pw => pw.update());
        this._priceAxisPaneViews.forEach(pw => pw.update());
        this._timeAxisPaneViews.forEach(pw => pw.update());
    }

    priceAxisViews() {
        return this._priceAxisViews;
    }

    timeAxisViews() {
        return this._timeAxisViews;
    }

    paneViews() {
        return this._paneViews;
    }

    priceAxisPaneViews() {
        return this._priceAxisPaneViews;
    }

    timeAxisPaneViews() {
        return this._timeAxisPaneViews;
    }

    applyOptions(options: Partial<RectangleDrawingToolOptions>) {
        this._options = { ...this._options, ...options };
        this.requestUpdate();
    }
}

class PreviewRectangle extends Rectangle {
    constructor(
        p1: Point,
        p2: Point,
        options: Partial<RectangleDrawingToolOptions> = {}
    ) {
        super(p1, p2, options);
        this._options.fillColor = this._options.previewFillColor;
    }

    public updateEndPoint(p: Point) {
        this._p2 = p;
        this._paneViews[0].update();
        this._timeAxisViews[1].movePoint(p);
        this._priceAxisViews[1].movePoint(p);
        this.requestUpdate();
    }
}

export class RectangleDrawingTool {
    private _chart: IChartApi | undefined;
    private _series: ISeriesApi<SeriesType> | undefined;
    private _defaultOptions: Partial<RectangleDrawingToolOptions>;
    private _rectangles: Rectangle[];
    private _previewRectangle: PreviewRectangle | undefined = undefined;
    private _points: Point[] = [];
    private _drawing: boolean = true;
    private _toolbarButton: HTMLDivElement | undefined;

    constructor(
        chart: IChartApi,
        series: ISeriesApi<SeriesType>,
        options: Partial<RectangleDrawingToolOptions>,
        anchors: {leftTop: Point, rightBottom: Point}
    ) {
        this._chart = chart;
        this._series = series;
        this._defaultOptions = options;
        this._rectangles = [];


        this._addPoint(anchors.leftTop);
        this._addPoint(anchors.rightBottom);

        this._chart.subscribeClick(this._clickHandler);
        this._chart.subscribeCrosshairMove(this._moveHandler);
    }

    private _clickHandler = (param: MouseEventParams) => this._onClick(param);
    private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

    private _onClick(param: MouseEventParams) {
        if (!this._drawing || !param.point || !param.time || !this._series) return;
        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) {
            return;
        }
        this._addPoint({
            time: param.time,
            price,
        });
    }

    private _onMouseMove(param: MouseEventParams) {
        if (!this._drawing || !param.point || !param.time || !this._series) return;
        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) {
            return;
        }
        if (this._previewRectangle) {
            this._previewRectangle.updateEndPoint({
                time: param.time,
                price,
            });
        }
    }

    private _addPoint(p: Point) {
        this._points.push(p);
        if (this._points.length >= 2) {
            this._addNewRectangle(this._points[0], this._points[1]);
            this._removePreviewRectangle();
        }
        if (this._points.length === 1) {
            this._addPreviewRectangle(this._points[0]);
        }
    }

    private _addNewRectangle(p1: Point, p2: Point) {
        const rectangle = new Rectangle(p1, p2, { ...this._defaultOptions });
        this._rectangles.push(rectangle);
        ensureDefined(this._series).attachPrimitive(rectangle);
    }

    private _addPreviewRectangle(p: Point) {
        this._previewRectangle = new PreviewRectangle(p, p, {
            ...this._defaultOptions,
        });
        ensureDefined(this._series).attachPrimitive(this._previewRectangle);
    }

    private _removePreviewRectangle() {
        if (this._previewRectangle) {
            ensureDefined(this._series).detachPrimitive(this._previewRectangle);
            this._previewRectangle = undefined;
        }
    }
}