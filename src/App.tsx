import { useEffect, useMemo, useState } from "react";
import { BarChart } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { LinkRiskTable } from "./components/LinkRiskTable";
import { MetricCard } from "./components/MetricCard";
import { Panel } from "./components/Panel";
import { RiskTopology } from "./components/RiskTopology";
import { ScatterPlot } from "./components/ScatterPlot";
import { analyzeDashboard } from "./lib/analytics";
import {
  parseIncidentCsv,
  parseTelemetryCsv,
  parseTrafficCsv,
} from "./lib/csv";
import {
  formatLatency,
  formatNumber,
  formatPercent,
  formatSignedLatency,
} from "./lib/format";
import type {
  DashboardAnalysis,
  DatasetBundle,
  LinkMetric,
  UniverseConfig,
} from "./types";

type Tab = "overview" | "congestion" | "trust" | "targeting" | "links";

const tabs: Array<{ id: Tab; label: string; marker: string }> = [
  { id: "overview", label: "Command overview", marker: "01" },
  { id: "congestion", label: "Congestion", marker: "02" },
  { id: "trust", label: "Telemetry trust", marker: "03" },
  { id: "targeting", label: "Targeting risk", marker: "04" },
  { id: "links", label: "Link intelligence", marker: "05" },
];

async function loadText(path: string): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function EmptyDashboard() {
  return (
    <main className="loading-screen">
      <div className="loading-orbit" aria-hidden="true">
        <i />
        <i />
        <b />
      </div>
      <p>Parsing historical grid intelligence…</p>
      <small>Traffic · telemetry · incident records</small>
    </main>
  );
}

function ErrorDashboard({ message }: { message: string }) {
  return (
    <main className="loading-screen loading-screen--error">
      <span className="error-symbol">!</span>
      <h1>Dashboard initialization failed</h1>
      <p>{message}</p>
      <small>Confirm the four files exist under public/data and reload the page.</small>
    </main>
  );
}

function MetricGrid({ analysis }: { analysis: DashboardAnalysis }) {
  const { metrics } = analysis;
  const visibleRecords =
    metrics.trafficRecords + metrics.telemetryRecords + metrics.incidentRecords;

  return (
    <div className="metric-grid">
      <MetricCard
        eyebrow="Visible observations"
        value={formatNumber(visibleRecords, 0)}
        detail={`${metrics.visibleLinks} links across ${metrics.visibleTicks} ticks`}
        tone="violet"
        icon="◫"
      />
      <MetricCard
        eyebrow="Average network load"
        value={formatPercent(metrics.averageLoadRatio)}
        detail={`P95 load ${formatPercent(metrics.p95LoadRatio)}`}
        tone="cyan"
        icon="⌁"
      />
      <MetricCard
        eyebrow="Median observed latency"
        value={formatLatency(metrics.medianObservedLatencyMs)}
        detail={`P95 ${formatLatency(metrics.p95ObservedLatencyMs)}`}
        tone="amber"
        icon="↯"
      />
      <MetricCard
        eyebrow="Telemetry error"
        value={formatPercent(metrics.telemetryMape)}
        detail={`Median absolute error ${formatPercent(metrics.medianTelemetryApe)}`}
        tone="red"
        icon="△"
      />
      <MetricCard
        eyebrow="Historical jam rate"
        value={formatPercent(metrics.jamRate)}
        detail={`${formatNumber(metrics.jamCount, 0)} disrupted windows`}
        tone="red"
        icon="⊗"
      />
      <MetricCard
        eyebrow="Hard saturation"
        value={formatNumber(metrics.saturatedCount, 0)}
        detail={`${formatNumber(metrics.missingObservedLatencyCount, 0)} latency values missing`}
        tone="green"
        icon="◎"
      />
    </div>
  );
}

function OverviewTab({
  viewAnalysis,
  rangeAnalysis,
  config,
  selectedLink,
  onSelectLink,
}: {
  viewAnalysis: DashboardAnalysis;
  rangeAnalysis: DashboardAnalysis;
  config: UniverseConfig;
  selectedLink: string;
  onSelectLink: (value: string) => void;
}) {
  return (
    <>
      <MetricGrid analysis={viewAnalysis} />

      <div className="dashboard-grid dashboard-grid--hero">
        <Panel
          title="Risk-weighted Zeta-26 topology"
          subtitle="Click any interplanetary link to focus every analytical view on that route."
          badge="Interactive"
          className="panel--topology"
        >
          <RiskTopology
            config={config}
            linkMetrics={rangeAnalysis.linkMetrics}
            selectedLink={selectedLink}
            onSelectLink={onSelectLink}
          />
        </Panel>

        <Panel
          title="Intelligence briefing"
          subtitle="Automatically generated findings from the active filters."
          badge={`${viewAnalysis.insights.length} signals`}
          className="panel--briefing"
        >
          <div className="insight-list">
            {viewAnalysis.insights.map((insight, index) => (
              <article key={insight}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{insight}</p>
              </article>
            ))}
          </div>
          <div className="method-note">
            <strong>Interpretation rule</strong>
            <p>
              Risk scores in this screen are transparent descriptive indices used for exploration.
              They are not replacements for the three trained Phase 2 models.
            </p>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Average load trend"
          subtitle="Mean load ratio aggregated into roughly 25 time windows."
          badge="Traffic history"
        >
          <LineChart
            data={viewAnalysis.tickTrend.map((point) => ({
              label: point.label,
              value: point.averageLoadRatio,
            }))}
            valueFormatter={(value) => formatPercent(value)}
            yLabel="Average load ratio"
            referenceValue={0.9}
          />
        </Panel>

        <Panel
          title="Targeting frequency trend"
          subtitle="Historical jam rate per time window."
          badge="Incident history"
        >
          <LineChart
            data={viewAnalysis.tickTrend.map((point) => ({
              label: point.label,
              value: point.jamRate,
            }))}
            valueFormatter={(value) => formatPercent(value)}
            yLabel="Jam rate"
          />
        </Panel>
      </div>
    </>
  );
}

function CongestionTab({
  viewAnalysis,
  rangeAnalysis,
}: {
  viewAnalysis: DashboardAnalysis;
  rangeAnalysis: DashboardAnalysis;
}) {
  const { metrics } = viewAnalysis;
  const rankedLinks = [...rangeAnalysis.linkMetrics]
    .sort((a, b) => b.p95LoadRatio - a.p95LoadRatio)
    .map((metric) => ({
      label: metric.linkId,
      value: metric.p95LoadRatio,
      detail: `${metric.saturationCount} saturated`,
    }));

  return (
    <>
      <div className="metric-grid metric-grid--four">
        <MetricCard
          eyebrow="Pearson relationship"
          value={formatNumber(metrics.loadLatencyPearson, 3)}
          detail="Linear relationship between load ratio and observed latency"
          tone="cyan"
          icon="r"
        />
        <MetricCard
          eyebrow="Spearman relationship"
          value={formatNumber(metrics.loadLatencySpearman, 3)}
          detail="Monotonic relationship, less sensitive to outliers"
          tone="violet"
          icon="ρ"
        />
        <MetricCard
          eyebrow="P95 observed latency"
          value={formatLatency(metrics.p95ObservedLatencyMs)}
          detail={`Maximum ${formatLatency(metrics.maxObservedLatencyMs)}`}
          tone="amber"
          icon="↯"
        />
        <MetricCard
          eyebrow="Unavailable latency"
          value={formatNumber(metrics.missingObservedLatencyCount, 0)}
          detail="Excluded from averages and scatter analysis"
          tone="red"
          icon="∅"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Load ratio vs. observed latency"
          subtitle="A positive relationship indicates artificial delay grows as links become busier."
          badge={`${formatNumber(viewAnalysis.congestionScatter.length, 0)} sampled points`}
        >
          <ScatterPlot
            data={viewAnalysis.congestionScatter}
            xLabel="Load ratio"
            yLabel="Observed latency"
            xFormatter={(value) => formatPercent(value)}
            yFormatter={formatLatency}
          />
        </Panel>

        <Panel
          title="Latency escalation by load band"
          subtitle="Median observed latency for each 10-percentage-point load bucket."
          badge="Non-linearity view"
        >
          <BarChart
            data={viewAnalysis.loadBands
              .filter((band) => band.medianLatencyMs !== null)
              .map((band) => ({
                label: band.label,
                value: band.medianLatencyMs ?? 0,
                detail: `${band.samples} valid observations`,
              }))}
            valueFormatter={formatLatency}
          />
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Load pressure over time"
          subtitle="Average load ratio grouped into compact tick windows."
          badge="Trend"
        >
          <LineChart
            data={viewAnalysis.tickTrend.map((point) => ({
              label: point.label,
              value: point.averageLoadRatio,
            }))}
            valueFormatter={formatPercent}
            yLabel="Average load"
            referenceValue={0.9}
          />
        </Panel>

        <Panel
          title="Links ranked by P95 load"
          subtitle="High P95 load identifies links that repeatedly approach stress conditions."
          badge="All links"
        >
          <BarChart data={rankedLinks} valueFormatter={formatPercent} compact />
        </Panel>
      </div>
    </>
  );
}

function TrustTab({
  viewAnalysis,
  rangeAnalysis,
}: {
  viewAnalysis: DashboardAnalysis;
  rangeAnalysis: DashboardAnalysis;
}) {
  const { metrics } = viewAnalysis;
  const rankedTrust = [...rangeAnalysis.linkMetrics]
    .sort((a, b) => b.trustRisk - a.trustRisk)
    .map((metric) => ({
      label: metric.linkId,
      value: metric.trustRisk,
      detail: `MAPE ${formatPercent(metric.telemetryMape)}`,
    }));
  const suspicious = [...rangeAnalysis.linkMetrics]
    .sort((a, b) => b.trustRisk - a.trustRisk)
    .slice(0, 3);

  return (
    <>
      <div className="metric-grid metric-grid--four">
        <MetricCard
          eyebrow="Reported ↔ measured correlation"
          value={formatNumber(metrics.telemetryCorrelation, 3)}
          detail="Overall alignment before inspecting persistent bias"
          tone="cyan"
          icon="↔"
        />
        <MetricCard
          eyebrow="Median absolute % error"
          value={formatPercent(metrics.medianTelemetryApe)}
          detail={`Mean absolute % error ${formatPercent(metrics.telemetryMape)}`}
          tone="violet"
          icon="Δ"
        />
        <MetricCard
          eyebrow="Under-reporting frequency"
          value={formatPercent(metrics.telemetryUnderreportRate)}
          detail={`Mean signed delta ${formatSignedLatency(metrics.meanTelemetryDeltaMs)}`}
          tone="red"
          icon="↓"
        />
        <MetricCard
          eyebrow="Missing self-reports"
          value={formatNumber(metrics.missingTelemetryCount, 0)}
          detail="Null reports are removed from trust calculations"
          tone="amber"
          icon="∅"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Self-reported vs. measured latency"
          subtitle="Points below the diagonal would over-report; points above it under-report actual latency."
          badge={`${formatNumber(viewAnalysis.telemetryScatter.length, 0)} sampled points`}
        >
          <ScatterPlot
            data={viewAnalysis.telemetryScatter}
            xLabel="Self-reported latency"
            yLabel="Measured latency"
            xFormatter={formatLatency}
            yFormatter={formatLatency}
            referenceDiagonal
          />
        </Panel>

        <Panel
          title="Telemetry trust-risk ranking"
          subtitle="Combines absolute percentage error with severe persistent under-reporting."
          badge="Descriptive index"
        >
          <BarChart data={rankedTrust} valueFormatter={formatPercent} compact />
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid--trust-bottom">
        <Panel
          title="Telemetry error trend"
          subtitle="Mean absolute percentage difference between reported and measured latency."
          badge="Trend"
        >
          <LineChart
            data={viewAnalysis.tickTrend.map((point) => ({
              label: point.label,
              value: point.telemetryErrorRate,
            }))}
            valueFormatter={formatPercent}
            yLabel="Absolute percentage error"
          />
        </Panel>

        <Panel
          title="Links requiring investigation"
          subtitle="Top links by persistent telemetry discrepancy."
          badge="Priority queue"
        >
          <div className="suspect-list">
            {suspicious.map((metric, index) => (
              <article key={metric.linkId}>
                <span className="suspect-rank">#{index + 1}</span>
                <div>
                  <strong>{metric.linkId}</strong>
                  <p>
                    MAPE {formatPercent(metric.telemetryMape)} · severe under-reporting {formatPercent(metric.severeUnderreportRate)}
                  </p>
                </div>
                <b>{formatPercent(metric.trustScore)} trust</b>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function TargetingTab({
  viewAnalysis,
  rangeAnalysis,
}: {
  viewAnalysis: DashboardAnalysis;
  rangeAnalysis: DashboardAnalysis;
}) {
  const { metrics } = viewAnalysis;
  const rankedLinks = [...rangeAnalysis.linkMetrics]
    .sort((a, b) => b.jamRate - a.jamRate)
    .map((metric) => ({
      label: metric.linkId,
      value: metric.jamRate,
      detail: `${metric.jamCount} jams`,
    }));

  return (
    <>
      <div className="metric-grid metric-grid--four">
        <MetricCard
          eyebrow="Successful disruptions"
          value={formatNumber(metrics.jamCount, 0)}
          detail={`${formatPercent(metrics.jamRate)} of visible link windows`}
          tone="red"
          icon="⊗"
        />
        <MetricCard
          eyebrow="Share when jammed"
          value={formatPercent(metrics.averageShareWhenJammed)}
          detail={`Safe windows average ${formatPercent(metrics.averageShareWhenSafe)}`}
          tone="amber"
          icon="◒"
        />
        <MetricCard
          eyebrow="Traffic-share relationship"
          value={formatNumber(metrics.trafficShareJamCorrelation, 3)}
          detail="Point-biserial correlation with the jammed flag"
          tone="violet"
          icon="r"
        />
        <MetricCard
          eyebrow="Visible link set"
          value={formatNumber(metrics.visibleLinks, 0)}
          detail="Compare targeting behavior without relying on one route"
          tone="cyan"
          icon="⌘"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Jam probability by traffic-share decile"
          subtitle="Higher deciles represent the most predictable, heavily used link windows."
          badge="D1 lowest · D10 highest"
        >
          <BarChart
            data={viewAnalysis.trafficShareBands.map((band) => ({
              label: band.label,
              value: band.jamRate,
              detail: `${band.jamCount}/${band.samples} jammed`,
            }))}
            valueFormatter={formatPercent}
          />
        </Panel>

        <Panel
          title="Historical jam rate by link"
          subtitle="A link-level view of past successful Chimera disruptions."
          badge="All links"
        >
          <BarChart data={rankedLinks} valueFormatter={formatPercent} compact />
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <Panel
          title="Average traffic share vs. jam rate"
          subtitle="Each point represents one interplanetary link."
          badge="Link relationship"
        >
          <ScatterPlot
            data={rangeAnalysis.linkTargetingScatter}
            xLabel="Average traffic share"
            yLabel="Historical jam rate"
            xFormatter={formatPercent}
            yFormatter={formatPercent}
          />
        </Panel>

        <Panel
          title="Targeting frequency over time"
          subtitle="Jam rate aggregated into time windows for the selected filter."
          badge="Trend"
        >
          <LineChart
            data={viewAnalysis.tickTrend.map((point) => ({
              label: point.label,
              value: point.jamRate,
            }))}
            valueFormatter={formatPercent}
            yLabel="Jam rate"
          />
        </Panel>
      </div>
    </>
  );
}

function LinkDetail({ metric }: { metric: LinkMetric | undefined }) {
  if (!metric) {
    return (
      <div className="link-detail-empty">
        Select a link from the table or topology to inspect its complete analytical profile.
      </div>
    );
  }

  return (
    <div className="link-detail">
      <div className="link-detail__identity">
        <span>{metric.planetA}</span>
        <i />
        <span>{metric.planetB}</span>
      </div>
      <div className="link-detail__stats">
        <article><small>Capacity</small><strong>{metric.capacityUnits}</strong></article>
        <article><small>Average load</small><strong>{formatPercent(metric.averageLoadRatio)}</strong></article>
        <article><small>P95 latency</small><strong>{formatLatency(metric.p95ObservedLatencyMs)}</strong></article>
        <article><small>Trust score</small><strong>{formatPercent(metric.trustScore)}</strong></article>
        <article><small>Jam rate</small><strong>{formatPercent(metric.jamRate)}</strong></article>
        <article><small>Composite risk</small><strong>{formatPercent(metric.compositeRisk)}</strong></article>
      </div>
      <div className="risk-breakdown">
        <div><span>Congestion</span><i><b style={{ width: `${metric.congestionRisk * 100}%` }} /></i><strong>{formatPercent(metric.congestionRisk)}</strong></div>
        <div><span>Trust</span><i><b style={{ width: `${metric.trustRisk * 100}%` }} /></i><strong>{formatPercent(metric.trustRisk)}</strong></div>
        <div><span>Targeting</span><i><b style={{ width: `${metric.targetingRisk * 100}%` }} /></i><strong>{formatPercent(metric.targetingRisk)}</strong></div>
      </div>
    </div>
  );
}

function LinksTab({
  rangeAnalysis,
  selectedLink,
  onSelectLink,
}: {
  rangeAnalysis: DashboardAnalysis;
  selectedLink: string;
  onSelectLink: (value: string) => void;
}) {
  const selectedMetric = rangeAnalysis.linkMetrics.find(
    (metric) => metric.linkId === selectedLink,
  );

  return (
    <>
      <Panel
        title="Unified link intelligence table"
        subtitle="Sortable evidence covering traffic pressure, telemetry integrity, targeting history, and the combined descriptive risk index."
        badge={`${rangeAnalysis.linkMetrics.length} links`}
      >
        <LinkRiskTable
          metrics={rangeAnalysis.linkMetrics}
          selectedLink={selectedLink}
          onSelectLink={onSelectLink}
        />
      </Panel>

      <div className="dashboard-grid dashboard-grid--link-bottom">
        <Panel
          title={selectedMetric ? `${selectedMetric.linkId} profile` : "Selected link profile"}
          subtitle="Component-level evidence for a single interplanetary connection."
          badge={selectedMetric?.riskLevel ?? "No selection"}
        >
          <LinkDetail metric={selectedMetric} />
        </Panel>

        <Panel
          title="Risk-index formula"
          subtitle="The calculation is intentionally explainable and auditable."
          badge="Not an ML prediction"
        >
          <div className="formula-stack">
            <article>
              <span>01</span>
              <div><strong>Congestion risk</strong><p>P95 load, P95-to-median latency amplification, saturation frequency, and missing observations.</p></div>
            </article>
            <article>
              <span>02</span>
              <div><strong>Trust risk</strong><p>70% normalized MAPE + 30% severe under-reporting frequency.</p></div>
            </article>
            <article>
              <span>03</span>
              <div><strong>Targeting risk</strong><p>65% historical jam rate + 35% average traffic share.</p></div>
            </article>
            <article>
              <span>04</span>
              <div><strong>Composite risk</strong><p>40% congestion + 30% trust + 30% targeting. Use it for dashboard triage, then defer to trained models for route decisions.</p></div>
            </article>
          </div>
        </Panel>
      </div>
    </>
  );
}

export default function App() {
  const [bundle, setBundle] = useState<DatasetBundle | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedLink, setSelectedLink] = useState("all");
  const [tickStart, setTickStart] = useState(0);
  const [tickEnd, setTickEnd] = useState(499);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadText("data/link_traffic_history.csv"),
      loadText("data/link_telemetry.csv"),
      loadText("data/link_incident_history.csv"),
      loadJson<UniverseConfig>("data/universe-config.json"),
    ])
      .then(([trafficText, telemetryText, incidentText, config]) => {
        if (!active) return;
        const data: DatasetBundle = {
          traffic: parseTrafficCsv(trafficText),
          telemetry: parseTelemetryCsv(telemetryText),
          incidents: parseIncidentCsv(incidentText),
          config,
        };
        setBundle(data);

        const ticks = [
          ...data.traffic.map((row) => row.tick),
          ...data.telemetry.map((row) => row.tick),
          ...data.incidents.map((row) => row.tick),
        ];
        setTickStart(Math.min(...ticks));
        setTickEnd(Math.max(...ticks));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unknown data-loading error.");
      });

    return () => {
      active = false;
    };
  }, []);

  const tickBounds = useMemo(() => {
    if (!bundle) return { min: 0, max: 0 };
    const ticks = [
      ...bundle.traffic.map((row) => row.tick),
      ...bundle.telemetry.map((row) => row.tick),
      ...bundle.incidents.map((row) => row.tick),
    ];
    return { min: Math.min(...ticks), max: Math.max(...ticks) };
  }, [bundle]);

  const normalizedStart = Math.max(tickBounds.min, Math.min(tickStart, tickEnd));
  const normalizedEnd = Math.min(tickBounds.max, Math.max(tickStart, tickEnd));

  const rangedData = useMemo(() => {
    if (!bundle) return null;
    const inside = (tick: number) => tick >= normalizedStart && tick <= normalizedEnd;
    return {
      traffic: bundle.traffic.filter((row) => inside(row.tick)),
      telemetry: bundle.telemetry.filter((row) => inside(row.tick)),
      incidents: bundle.incidents.filter((row) => inside(row.tick)),
    };
  }, [bundle, normalizedEnd, normalizedStart]);

  const rangeAnalysis = useMemo(() => {
    if (!bundle || !rangedData) return null;
    return analyzeDashboard(
      rangedData.traffic,
      rangedData.telemetry,
      rangedData.incidents,
      bundle.config,
    );
  }, [bundle, rangedData]);

  const viewAnalysis = useMemo(() => {
    if (!bundle || !rangedData) return null;
    const match = (linkId: string) => selectedLink === "all" || linkId === selectedLink;
    return analyzeDashboard(
      rangedData.traffic.filter((row) => match(row.link_id)),
      rangedData.telemetry.filter((row) => match(row.link_id)),
      rangedData.incidents.filter((row) => match(row.link_id)),
      bundle.config,
    );
  }, [bundle, rangedData, selectedLink]);

  if (error) return <ErrorDashboard message={error} />;
  if (!bundle || !rangeAnalysis || !viewAnalysis) return <EmptyDashboard />;

  const totalRecords =
    bundle.traffic.length + bundle.telemetry.length + bundle.incidents.length;
  const activeLinkLabel = selectedLink === "all" ? "All interplanetary links" : selectedLink;

  const resetFilters = () => {
    setSelectedLink("all");
    setTickStart(tickBounds.min);
    setTickEnd(tickBounds.max);
  };

  return (
    <div className="app-shell">

      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark"><span>A</span><i /></div>
          <div>
            <p>ALCHEMIX / ZETA-26</p>
            <h1>Chimera Intelligence Console</h1>
          </div>
        </div>
        <div className="header-status">
          <span><i className="status-dot" />Historical data online</span>
          <strong>{formatNumber(totalRecords, 0)} records parsed</strong>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav className="sidebar-nav" aria-label="Dashboard sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.marker}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="sidebar-card">
            <span className="sidebar-card__eyebrow">Universe profile</span>
            <strong>{bundle.config.universe_metadata.system_name}</strong>
            <dl>
              <div><dt>Planets</dt><dd>{bundle.config.nodes.length}</dd></div>
              <div><dt>Links</dt><dd>{bundle.config.interplanetary_links.length}</dd></div>
              <div><dt>Max void hop</dt><dd>{formatNumber(bundle.config.universe_metadata.max_void_hop_distance_km / 1_000_000, 0)}M km</dd></div>
              <div><dt>Light speed</dt><dd>{formatNumber(bundle.config.universe_metadata.speed_of_light_kms, 0)} km/s</dd></div>
            </dl>
          </section>

          <section className="sidebar-card sidebar-card--source">
            <span className="sidebar-card__eyebrow">Source coverage</span>
            <div><i className="source-dot source-dot--cyan" /><span>Traffic</span><b>{formatNumber(bundle.traffic.length, 0)}</b></div>
            <div><i className="source-dot source-dot--violet" /><span>Telemetry</span><b>{formatNumber(bundle.telemetry.length, 0)}</b></div>
            <div><i className="source-dot source-dot--red" /><span>Incidents</span><b>{formatNumber(bundle.incidents.length, 0)}</b></div>
          </section>
        </aside>

        <main className="main-content">
          <section className="page-heading">
            <div>
              <span className="page-kicker">PHASE 02 / ANALYTICAL CO-PILOT</span>
              <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p>
                Analyze congestion scaling, telemetry deception, and predictable-route targeting before the routing agent commits a packet.
              </p>
            </div>
            <div className="active-filter-badge">
              <span>Active scope</span>
              <strong>{activeLinkLabel}</strong>
              <small>Ticks {normalizedStart}–{normalizedEnd}</small>
            </div>
          </section>

          <section className="filter-bar">
            <label>
              <span>Link focus</span>
              <select value={selectedLink} onChange={(event) => setSelectedLink(event.target.value)}>
                <option value="all">All links</option>
                {bundle.config.interplanetary_links.map((link) => (
                  <option key={link.link_id} value={link.link_id}>{link.link_id}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Start tick</span>
              <input
                type="number"
                min={tickBounds.min}
                max={tickBounds.max}
                value={tickStart}
                onChange={(event) => setTickStart(Number(event.target.value))}
              />
            </label>
            <label>
              <span>End tick</span>
              <input
                type="number"
                min={tickBounds.min}
                max={tickBounds.max}
                value={tickEnd}
                onChange={(event) => setTickEnd(Number(event.target.value))}
              />
            </label>
            <div className="range-visual" aria-hidden="true">
              <i
                style={{
                  left: `${((normalizedStart - tickBounds.min) / Math.max(1, tickBounds.max - tickBounds.min)) * 100}%`,
                  right: `${100 - ((normalizedEnd - tickBounds.min) / Math.max(1, tickBounds.max - tickBounds.min)) * 100}%`,
                }}
              />
            </div>
            <button className="reset-button" onClick={resetFilters}>Reset filters</button>
          </section>

          <div className="dashboard-content">
            {activeTab === "overview" ? (
              <OverviewTab
                viewAnalysis={viewAnalysis}
                rangeAnalysis={rangeAnalysis}
                config={bundle.config}
                selectedLink={selectedLink}
                onSelectLink={setSelectedLink}
              />
            ) : null}
            {activeTab === "congestion" ? (
              <CongestionTab viewAnalysis={viewAnalysis} rangeAnalysis={rangeAnalysis} />
            ) : null}
            {activeTab === "trust" ? (
              <TrustTab viewAnalysis={viewAnalysis} rangeAnalysis={rangeAnalysis} />
            ) : null}
            {activeTab === "targeting" ? (
              <TargetingTab viewAnalysis={viewAnalysis} rangeAnalysis={rangeAnalysis} />
            ) : null}
            {activeTab === "links" ? (
              <LinksTab
                rangeAnalysis={rangeAnalysis}
                selectedLink={selectedLink}
                onSelectLink={setSelectedLink}
              />
            ) : null}
          </div>

          <footer className="app-footer">
            <span>AlchemiX analytical frontend</span>
            <p>
              Saturated links and null latency values are treated as unavailable, never as zero latency.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
