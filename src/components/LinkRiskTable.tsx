import { useMemo, useState } from "react";
import type { LinkMetric } from "../types";
import {
  formatLatency,
  formatPercent,
  formatSignedLatency,
} from "../lib/format";

type SortKey =
  | "linkId"
  | "averageLoadRatio"
  | "p95ObservedLatencyMs"
  | "trustScore"
  | "jamRate"
  | "compositeRisk";

interface LinkRiskTableProps {
  metrics: LinkMetric[];
  selectedLink: string;
  onSelectLink: (linkId: string) => void;
}

export function LinkRiskTable({
  metrics,
  selectedLink,
  onSelectLink,
}: LinkRiskTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("compositeRisk");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...metrics].sort((first, second) => {
      const a = first[sortKey];
      const b = second[sortKey];
      const comparison =
        typeof a === "string" && typeof b === "string"
          ? a.localeCompare(b)
          : (Number(a ?? 0) - Number(b ?? 0));
      return direction === "asc" ? comparison : -comparison;
    });
  }, [direction, metrics, sortKey]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "linkId" ? "asc" : "desc");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (direction === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="table-wrap">
      <table className="risk-table">
        <thead>
          <tr>
            <th><button onClick={() => changeSort("linkId")}>Link{sortIndicator("linkId")}</button></th>
            <th><button onClick={() => changeSort("averageLoadRatio")}>Avg load{sortIndicator("averageLoadRatio")}</button></th>
            <th><button onClick={() => changeSort("p95ObservedLatencyMs")}>P95 latency{sortIndicator("p95ObservedLatencyMs")}</button></th>
            <th>Telemetry delta</th>
            <th><button onClick={() => changeSort("trustScore")}>Trust score{sortIndicator("trustScore")}</button></th>
            <th><button onClick={() => changeSort("jamRate")}>Jam rate{sortIndicator("jamRate")}</button></th>
            <th><button onClick={() => changeSort("compositeRisk")}>Composite risk{sortIndicator("compositeRisk")}</button></th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((metric) => (
            <tr
              key={metric.linkId}
              className={selectedLink === metric.linkId ? "is-selected" : ""}
              onClick={() => onSelectLink(metric.linkId)}
            >
              <td>
                <strong>{metric.linkId}</strong>
                <span>{metric.capacityUnits} capacity units</span>
              </td>
              <td>{formatPercent(metric.averageLoadRatio)}</td>
              <td>{formatLatency(metric.p95ObservedLatencyMs)}</td>
              <td className={(metric.meanTelemetryDeltaMs ?? 0) > 0 ? "cell-alert" : ""}>
                {formatSignedLatency(metric.meanTelemetryDeltaMs)}
              </td>
              <td>
                <div className="score-cell">
                  <span>{formatPercent(metric.trustScore)}</span>
                  <i><b style={{ width: `${metric.trustScore * 100}%` }} /></i>
                </div>
              </td>
              <td>{formatPercent(metric.jamRate)}</td>
              <td>
                <div className="score-cell score-cell--risk">
                  <span>{formatPercent(metric.compositeRisk)}</span>
                  <i><b style={{ width: `${metric.compositeRisk * 100}%` }} /></i>
                </div>
              </td>
              <td><span className={`risk-pill risk-pill--${metric.riskLevel.toLowerCase()}`}>{metric.riskLevel}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
