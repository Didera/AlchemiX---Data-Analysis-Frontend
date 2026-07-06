import type { ReactNode } from "react";

interface MetricCardProps {
  eyebrow: string;
  value: string;
  detail: string;
  tone?: "cyan" | "violet" | "amber" | "red" | "green";
  icon?: ReactNode;
}

export function MetricCard({
  eyebrow,
  value,
  detail,
  tone = "cyan",
  icon,
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__topline">
        <span className="metric-card__eyebrow">{eyebrow}</span>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
      <span className="metric-card__detail">{detail}</span>
    </article>
  );
}
