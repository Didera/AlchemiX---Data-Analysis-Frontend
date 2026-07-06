import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Panel({
  title,
  subtitle,
  badge,
  children,
  className = "",
  actions,
}: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel__header">
        <div>
          <div className="panel__title-row">
            <h2>{title}</h2>
            {badge ? <span className="panel__badge">{badge}</span> : null}
          </div>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}
