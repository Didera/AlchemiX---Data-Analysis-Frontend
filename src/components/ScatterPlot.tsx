import type { ScatterPoint } from "../types";
import { formatNumber } from "../lib/format";

interface ScatterPlotProps {
  data: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
  referenceDiagonal?: boolean;
  emptyMessage?: string;
}

export function ScatterPlot({
  data,
  xLabel,
  yLabel,
  xFormatter = (value) => formatNumber(value, 2),
  yFormatter = (value) => formatNumber(value, 2),
  referenceDiagonal = false,
  emptyMessage = "No data in the selected range.",
}: ScatterPlotProps) {
  const clean = data.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (clean.length === 0) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  const width = 760;
  const height = 360;
  const margin = { top: 18, right: 24, bottom: 58, left: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMaxRaw = Math.max(...clean.map((point) => point.x), 1e-9);
  const yMaxRaw = Math.max(...clean.map((point) => point.y), 1e-9);
  const xMax = xMaxRaw * 1.05;
  const yMax = yMaxRaw * 1.05;
  const x = (value: number) => margin.left + (value / xMax) * plotWidth;
  const y = (value: number) => margin.top + plotHeight - (value / yMax) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => index / 4);
  const diagonalMax = Math.min(xMax, yMax);

  return (
    <div className="chart-shell">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
        {ticks.map((ratio) => (
          <g key={`grid-${ratio}`}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={margin.top + plotHeight - ratio * plotHeight}
              y2={margin.top + plotHeight - ratio * plotHeight}
              className="chart-grid-line"
            />
            <line
              x1={margin.left + ratio * plotWidth}
              x2={margin.left + ratio * plotWidth}
              y1={margin.top}
              y2={margin.top + plotHeight}
              className="chart-grid-line"
            />
            <text
              x={margin.left - 10}
              y={margin.top + plotHeight - ratio * plotHeight + 4}
              textAnchor="end"
              className="chart-axis-label"
            >
              {yFormatter(yMax * ratio)}
            </text>
            <text
              x={margin.left + ratio * plotWidth}
              y={height - 30}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {xFormatter(xMax * ratio)}
            </text>
          </g>
        ))}

        {referenceDiagonal ? (
          <line
            x1={x(0)}
            y1={y(0)}
            x2={x(diagonalMax)}
            y2={y(diagonalMax)}
            className="chart-reference-line"
          />
        ) : null}

        {clean.map((point, index) => (
          <circle
            key={`${point.label ?? "point"}-${index}`}
            cx={x(point.x)}
            cy={y(point.y)}
            r={clean.length <= 30 ? 6 : 3.7}
            className={`chart-scatter-point chart-scatter-point--${(point.group ?? "default")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`}
          >
            <title>{`${point.label ?? "Observation"}\n${xLabel}: ${xFormatter(point.x)}\n${yLabel}: ${yFormatter(point.y)}`}</title>
          </circle>
        ))}

        <text x={margin.left + plotWidth / 2} y={height - 6} textAnchor="middle" className="chart-axis-title">
          {xLabel}
        </text>
        <text
          x="18"
          y={margin.top + plotHeight / 2}
          transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}
          textAnchor="middle"
          className="chart-axis-title"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
}
