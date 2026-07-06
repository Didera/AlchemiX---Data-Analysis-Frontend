import { formatNumber } from "../lib/format";

export interface BarChartDatum {
  label: string;
  value: number;
  detail?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  compact?: boolean;
}

export function BarChart({
  data,
  valueFormatter = (value) => formatNumber(value, 2),
  emptyMessage = "No data in the selected range.",
  compact = false,
}: BarChartProps) {
  const clean = data.filter((item) => Number.isFinite(item.value));

  if (clean.length === 0) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  const width = 760;
  const rowHeight = compact ? 34 : 42;
  const margin = { top: 12, right: 84, bottom: 22, left: 155 };
  const height = margin.top + margin.bottom + clean.length * rowHeight;
  const plotWidth = width - margin.left - margin.right;
  const max = Math.max(...clean.map((item) => item.value), 1e-9);

  return (
    <div className="chart-shell chart-shell--bar">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
        {clean.map((item, index) => {
          const barWidth = Math.max(1, (item.value / max) * plotWidth);
          const y = margin.top + index * rowHeight;

          return (
            <g key={`${item.label}-${index}`}>
              <text x={margin.left - 12} y={y + 22} textAnchor="end" className="chart-axis-label chart-bar-label">
                {item.label}
              </text>
              <rect
                x={margin.left}
                y={y + 6}
                width={plotWidth}
                height={20}
                rx={7}
                className="chart-bar-track"
              />
              <rect
                x={margin.left}
                y={y + 6}
                width={barWidth}
                height={20}
                rx={7}
                className="chart-bar"
              >
                <title>{`${item.label}: ${valueFormatter(item.value)}${item.detail ? ` · ${item.detail}` : ""}`}</title>
              </rect>
              <text x={width - margin.right + 10} y={y + 22} className="chart-bar-value">
                {valueFormatter(item.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
