/// <reference types="vite/client" />

declare module 'react-plotly.js' {
  import { Component } from 'react';
  import { Layout, Data, Config, PlotMouseEvent } from 'plotly.js';

  interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    frames?: object[];
    revision?: number;
    onInitialized?: (figure: object, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: object, graphDiv: HTMLElement) => void;
    onPurge?: (figure: object, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    onSelected?: (event: PlotMouseEvent) => void;
    onClick?: (event: PlotMouseEvent) => void;
    onHover?: (event: PlotMouseEvent) => void;
    onUnhover?: (event: PlotMouseEvent) => void;
    divId?: string;
    className?: string;
    style?: React.CSSProperties;
    useResizeHandler?: boolean;
  }

  export default class Plot extends Component<PlotParams> {}
}
