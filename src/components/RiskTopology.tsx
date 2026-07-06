import type { LinkMetric, UniverseConfig } from "../types";
import { formatPercent } from "../lib/format";

interface RiskTopologyProps {
  config: UniverseConfig;
  linkMetrics: LinkMetric[];
  selectedLink: string;
  onSelectLink: (linkId: string) => void;
}

export function RiskTopology({
  config,
  linkMetrics,
  selectedLink,
  onSelectLink,
}: RiskTopologyProps) {
  const width = 820;
  const height = 450;
  const margin = 58;
  const xs = config.nodes.map((node) => node.x);
  const ys = config.nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleX = (value: number) =>
    margin + ((value - minX) / Math.max(maxX - minX, 1)) * (width - margin * 2);
  const scaleY = (value: number) =>
    margin + ((maxY - value) / Math.max(maxY - minY, 1)) * (height - margin * 2);
  const nodeMap = new Map(config.nodes.map((node) => [node.id, node]));
  const metricMap = new Map(linkMetrics.map((metric) => [metric.linkId, metric]));

  return (
    <div className="topology-wrap">
      <svg className="topology" viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <radialGradient id="planetGlow" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="18%" stopColor="#78e6ff" stopOpacity="0.92" />
            <stop offset="58%" stopColor="#4257d6" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#111735" stopOpacity="1" />
          </radialGradient>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: 55 }, (_, index) => (
          <circle
            key={`star-${index}`}
            cx={(index * 137) % width}
            cy={(index * 83) % height}
            r={index % 7 === 0 ? 1.3 : 0.7}
            className="topology-star"
          />
        ))}

        {config.interplanetary_links.map((link) => {
          const first = nodeMap.get(link.planet_a);
          const second = nodeMap.get(link.planet_b);
          const metric = metricMap.get(link.link_id);
          if (!first || !second) return null;

          const riskLevel = metric?.riskLevel.toLowerCase() ?? "low";
          const isSelected = selectedLink === link.link_id;
          const loadWidth = 2.5 + (metric?.averageLoadRatio ?? 0) * 7;

          return (
            <g
              key={link.link_id}
              className={`topology-link-group ${isSelected ? "is-selected" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLink(link.link_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectLink(link.link_id);
                }
              }}
            >
              <line
                x1={scaleX(first.x)}
                y1={scaleY(first.y)}
                x2={scaleX(second.x)}
                y2={scaleY(second.y)}
                className="topology-link-hitbox"
              />
              <line
                x1={scaleX(first.x)}
                y1={scaleY(first.y)}
                x2={scaleX(second.x)}
                y2={scaleY(second.y)}
                strokeWidth={isSelected ? loadWidth + 3 : loadWidth}
                className={`topology-link topology-link--${riskLevel}`}
              >
                <title>{`${link.link_id}\nComposite risk: ${formatPercent(metric?.compositeRisk)}\nAverage load: ${formatPercent(metric?.averageLoadRatio)}`}</title>
              </line>
            </g>
          );
        })}

        {config.nodes.map((node) => (
          <g key={node.id} transform={`translate(${scaleX(node.x)} ${scaleY(node.y)})`}>
            <circle r="25" className="topology-planet-glow" filter="url(#softGlow)" />
            <circle r="18" fill="url(#planetGlow)" className="topology-planet" />
            <text y="37" textAnchor="middle" className="topology-label">
              {node.id}
            </text>
            <text y="51" textAnchor="middle" className="topology-codex">
              base {node.codex}
            </text>
          </g>
        ))}
      </svg>

      <div className="risk-legend" aria-label="Composite risk legend">
        <span><i className="risk-dot risk-dot--low" />Low</span>
        <span><i className="risk-dot risk-dot--moderate" />Moderate</span>
        <span><i className="risk-dot risk-dot--high" />High</span>
        <span><i className="risk-dot risk-dot--critical" />Critical</span>
        <small>Line width = average load</small>
      </div>
    </div>
  );
}
