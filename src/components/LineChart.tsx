import { useId } from "react";
import { formatNumber } from "../lib/format";

export interface LineChartDatum {
  label: string;
  value: number | null;
}

interface LineChartProps {
  data: LineChartDatum[];
  valueFormatter?: (value: number) => string;
  yLabel?: string;
  emptyMessage?: string;
  referenceValue?: number;
}

export function LineChart({
  data,
  valueFormatter = (value) => formatNumber(value, 2),
  yLabel,
  emptyMessage = "No data in the selected range.",
  referenceValue,
}: LineChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const clean = data.filter(
    (point): point is { label: string; value: number } =>
      point.value !== null && Number.isFinite(point.value),
  );

  if (clean.length === 0) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  const width = 760;
  const height = 280;
  const margin = { top: 18, right: 22, bottom: 42, left: 68 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = clean.map((point) => point.value);
  const rawMin = Math.min(...values, referenceValue ?? Infinity);
  const rawMax = Math.max(...values, referenceValue ?? -Infinity);
  const spread = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.08, 1e-9);
  const min = Math.max(0, rawMin - spread * 0.12);
  const max = rawMax + spread * 0.12;
  const x = (index: number) =>
    margin.left + (clean.length === 1 ? plotWidth / 2 : (index / (clean.length - 1)) * plotWidth);
  const y = (value: number) =>
    margin.top + plotHeight - ((value - min) / Math.max(max - min, 1e-9)) * plotHeight;

  const linePath = clean
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(clean.length - 1)} ${margin.top + plotHeight} L ${x(0)} ${
    margin.top + plotHeight
  } Z`;
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);
  const labelStep = Math.max(1, Math.ceil(clean.length / 6));

  return (
    <div className="chart-shell">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const tickY = y(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={tickY}
                y2={tickY}
                className="chart-grid-line"
              />
              <text x={margin.left - 10} y={tickY + 4} textAnchor="end" className="chart-axis-label">
                {valueFormatter(tick)}
              </text>
            </g>
          );
        })}

        {referenceValue !== undefined && referenceValue >= min && referenceValue <= max ? (
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={y(referenceValue)}
            y2={y(referenceValue)}
            className="chart-reference-line"
          />
        ) : null}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} className="chart-line" />

        {clean.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r="4.5" className="chart-point">
              <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
            </circle>
            {index % labelStep === 0 || index === clean.length - 1 ? (
              <text
                x={x(index)}
                y={height - 15}
                textAnchor="middle"
                className="chart-axis-label chart-axis-label--x"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        ))}

        {yLabel ? (
          <text
            x="18"
            y={height / 2}
            transform={`rotate(-90 18 ${height / 2})`}
            textAnchor="middle"
            className="chart-axis-title"
          >
            {yLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
