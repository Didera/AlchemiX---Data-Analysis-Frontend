import type {
  DashboardAnalysis,
  DashboardMetrics,
  IncidentRow,
  LinkMetric,
  LoadBandMetric,
  ScatterPoint,
  TelemetryRow,
  TickTrendPoint,
  TrafficRow,
  TrafficShareBandMetric,
  UniverseConfig,
} from "../types";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const finite = (values: Array<number | null | undefined>): number[] =>
  values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));

function mean(values: Array<number | null | undefined>): number | null {
  const clean = finite(values);
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function quantile(values: Array<number | null | undefined>, q: number): number | null {
  const clean = finite(values).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0] ?? null;

  const position = (clean.length - 1) * q;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = clean[lowerIndex];
  const upper = clean[upperIndex];

  if (lower === undefined || upper === undefined) return null;
  if (lowerIndex === upperIndex) return lower;

  const weight = position - lowerIndex;
  return lower + (upper - lower) * weight;
}

function median(values: Array<number | null | undefined>): number | null {
  return quantile(values, 0.5);
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const xMean = mean(xs);
  const yMean = mean(ys);
  if (xMean === null || yMean === null) return null;

  let numerator = 0;
  let xSquared = 0;
  let ySquared = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index];
    const y = ys[index];
    if (x === undefined || y === undefined) continue;

    const xDelta = x - xMean;
    const yDelta = y - yMean;
    numerator += xDelta * yDelta;
    xSquared += xDelta ** 2;
    ySquared += yDelta ** 2;
  }

  const denominator = Math.sqrt(xSquared * ySquared);
  return denominator === 0 ? null : numerator / denominator;
}

function rank(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const result = new Array<number>(values.length);
  let cursor = 0;

  while (cursor < sorted.length) {
    let end = cursor;
    while (end + 1 < sorted.length && sorted[end + 1]?.value === sorted[cursor]?.value) {
      end += 1;
    }

    const averageRank = (cursor + end) / 2 + 1;
    for (let index = cursor; index <= end; index += 1) {
      const originalIndex = sorted[index]?.index;
      if (originalIndex !== undefined) result[originalIndex] = averageRank;
    }

    cursor = end + 1;
  }

  return result;
}

function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  return pearson(rank(xs), rank(ys));
}

function sampleEvenly<T>(values: T[], maximum: number): T[] {
  if (values.length <= maximum) return values;
  const result: T[] = [];
  const step = values.length / maximum;

  for (let index = 0; index < maximum; index += 1) {
    const sourceIndex = Math.min(values.length - 1, Math.floor(index * step));
    const value = values[sourceIndex];
    if (value !== undefined) result.push(value);
  }

  return result;
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const value of values) {
    const groupKey = key(value);
    const group = groups.get(groupKey);
    if (group) group.push(value);
    else groups.set(groupKey, [value]);
  }

  return groups;
}

function round(value: number | null, digits = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getRiskLevel(score: number): LinkMetric["riskLevel"] {
  if (score >= 0.72) return "Critical";
  if (score >= 0.52) return "High";
  if (score >= 0.32) return "Moderate";
  return "Low";
}

function buildLinkMetrics(
  traffic: TrafficRow[],
  telemetry: TelemetryRow[],
  incidents: IncidentRow[],
  config: UniverseConfig,
): LinkMetric[] {
  const trafficGroups = groupBy(traffic, (row) => row.link_id);
  const telemetryGroups = groupBy(telemetry, (row) => row.link_id);
  const incidentGroups = groupBy(incidents, (row) => row.link_id);

  return config.interplanetary_links.map((link) => {
    const trafficRows = trafficGroups.get(link.link_id) ?? [];
    const telemetryRows = telemetryGroups.get(link.link_id) ?? [];
    const incidentRows = incidentGroups.get(link.link_id) ?? [];

    const observedLatencies = trafficRows.map((row) => row.observed_latency_ms);
    const medianLatency = median(observedLatencies);
    const p95Latency = quantile(observedLatencies, 0.95);
    const p95Load = quantile(trafficRows.map((row) => row.load_ratio), 0.95) ?? 0;
    const saturationCount = trafficRows.filter((row) => row.status === "saturated").length;
    const missingObservedLatencyCount = trafficRows.filter(
      (row) => row.observed_latency_ms === null,
    ).length;

    const validTelemetryRows = telemetryRows.filter(
      (row) => row.self_reported_latency_ms !== null,
    );
    const telemetryDeltas = validTelemetryRows.map(
      (row) => row.measured_latency_ms - (row.self_reported_latency_ms ?? 0),
    );
    const telemetryAbsolutePercentageErrors = validTelemetryRows.map((row) =>
      row.measured_latency_ms === 0
        ? 0
        : Math.abs(row.measured_latency_ms - (row.self_reported_latency_ms ?? 0)) /
          row.measured_latency_ms,
    );
    const severeUnderreportCount = validTelemetryRows.filter((row) => {
      const selfReported = row.self_reported_latency_ms ?? 0;
      return (
        row.measured_latency_ms > 0 &&
        (row.measured_latency_ms - selfReported) / row.measured_latency_ms > 0.15
      );
    }).length;

    const jamCount = incidentRows.filter((row) => row.jammed_flag).length;
    const jamRate = incidentRows.length === 0 ? 0 : jamCount / incidentRows.length;
    const averageTrafficShare = mean(incidentRows.map((row) => row.traffic_share)) ?? 0;
    const p95TrafficShare = quantile(
      incidentRows.map((row) => row.traffic_share),
      0.95,
    ) ?? 0;

    const latencyAmplification =
      medianLatency !== null && p95Latency !== null && medianLatency > 0
        ? p95Latency / medianLatency
        : null;
    const telemetryMape = mean(telemetryAbsolutePercentageErrors);
    const underreportRate =
      validTelemetryRows.length === 0
        ? null
        : telemetryDeltas.filter((value) => value > 0).length / validTelemetryRows.length;
    const severeUnderreportRate =
      validTelemetryRows.length === 0
        ? null
        : severeUnderreportCount / validTelemetryRows.length;

    const reportedValues = validTelemetryRows.map(
      (row) => row.self_reported_latency_ms ?? 0,
    );
    const measuredValues = validTelemetryRows.map((row) => row.measured_latency_ms);

    // These are transparent descriptive indices for the dashboard, not trained-model outputs.
    const congestionRisk = clamp01(
      0.55 * clamp01(p95Load / 0.9) +
        0.3 * clamp01(((latencyAmplification ?? 1) - 1) / 3) +
        0.1 * clamp01(saturationCount / Math.max(1, trafficRows.length * 0.005)) +
        0.05 * clamp01(missingObservedLatencyCount / Math.max(1, trafficRows.length * 0.1)),
    );

    const trustRisk = clamp01(
      0.7 * clamp01((telemetryMape ?? 0) / 0.35) +
        0.3 * clamp01((severeUnderreportRate ?? 0) / 0.7),
    );

    const targetingRisk = clamp01(
      0.65 * clamp01(jamRate / 0.15) +
        0.35 * clamp01(averageTrafficShare / 0.12),
    );

    const compositeRisk = clamp01(
      0.4 * congestionRisk + 0.3 * trustRisk + 0.3 * targetingRisk,
    );

    return {
      linkId: link.link_id,
      planetA: link.planet_a,
      planetB: link.planet_b,
      capacityUnits: link.capacity_units,
      samples: trafficRows.length,
      averageLoadRatio: round(mean(trafficRows.map((row) => row.load_ratio)) ?? 0) ?? 0,
      p95LoadRatio: round(p95Load) ?? 0,
      medianObservedLatencyMs: round(medianLatency, 3),
      averageObservedLatencyMs: round(mean(observedLatencies), 3),
      p95ObservedLatencyMs: round(p95Latency, 3),
      latencyAmplification: round(latencyAmplification),
      saturationCount,
      saturationRate:
        trafficRows.length === 0 ? 0 : round(saturationCount / trafficRows.length) ?? 0,
      missingObservedLatencyCount,
      telemetrySamples: validTelemetryRows.length,
      missingTelemetryCount: telemetryRows.length - validTelemetryRows.length,
      meanTelemetryDeltaMs: round(mean(telemetryDeltas), 3),
      telemetryMape: round(telemetryMape),
      medianTelemetryApe: round(median(telemetryAbsolutePercentageErrors)),
      underreportRate: round(underreportRate),
      severeUnderreportRate: round(severeUnderreportRate),
      telemetryCorrelation: round(pearson(reportedValues, measuredValues)),
      jamCount,
      jamRate: round(jamRate) ?? 0,
      averageTrafficShare: round(averageTrafficShare) ?? 0,
      p95TrafficShare: round(p95TrafficShare) ?? 0,
      congestionRisk: round(congestionRisk) ?? 0,
      trustRisk: round(trustRisk) ?? 0,
      trustScore: round(1 - trustRisk) ?? 0,
      targetingRisk: round(targetingRisk) ?? 0,
      compositeRisk: round(compositeRisk) ?? 0,
      riskLevel: getRiskLevel(compositeRisk),
    };
  });
}

function buildTickTrend(
  traffic: TrafficRow[],
  telemetry: TelemetryRow[],
  incidents: IncidentRow[],
  bucketSize: number,
): TickTrendPoint[] {
  const trafficByBucket = groupBy(traffic, (row) => String(Math.floor(row.tick / bucketSize)));
  const telemetryByBucket = groupBy(
    telemetry,
    (row) => String(Math.floor(row.tick / bucketSize)),
  );
  const incidentsByBucket = groupBy(
    incidents,
    (row) => String(Math.floor(row.tick / bucketSize)),
  );

  const bucketNumbers = new Set<number>();
  [...trafficByBucket.keys(), ...telemetryByBucket.keys(), ...incidentsByBucket.keys()].forEach(
    (key) => bucketNumbers.add(Number(key)),
  );

  return [...bucketNumbers]
    .sort((a, b) => a - b)
    .map((bucket) => {
      const trafficRows = trafficByBucket.get(String(bucket)) ?? [];
      const telemetryRows = telemetryByBucket.get(String(bucket)) ?? [];
      const incidentRows = incidentsByBucket.get(String(bucket)) ?? [];
      const validTelemetryRows = telemetryRows.filter(
        (row) => row.self_reported_latency_ms !== null && row.measured_latency_ms !== 0,
      );

      return {
        tick: bucket * bucketSize,
        label: `${bucket * bucketSize}–${bucket * bucketSize + bucketSize - 1}`,
        averageLoadRatio:
          round(mean(trafficRows.map((row) => row.load_ratio))) ?? 0,
        averageObservedLatencyMs: round(
          mean(trafficRows.map((row) => row.observed_latency_ms)),
          3,
        ),
        telemetryErrorRate: round(
          mean(
            validTelemetryRows.map(
              (row) =>
                Math.abs(
                  row.measured_latency_ms - (row.self_reported_latency_ms ?? 0),
                ) / row.measured_latency_ms,
            ),
          ),
        ),
        jamRate:
          incidentRows.length === 0
            ? 0
            : round(
                incidentRows.filter((row) => row.jammed_flag).length /
                  incidentRows.length,
              ) ?? 0,
        saturatedCount: trafficRows.filter((row) => row.status === "saturated").length,
      };
    });
}

function buildLoadBands(traffic: TrafficRow[]): LoadBandMetric[] {
  const bands: LoadBandMetric[] = [];

  for (let index = 0; index < 10; index += 1) {
    const min = index / 10;
    const max = (index + 1) / 10;
    const rows = traffic.filter(
      (row) => row.load_ratio >= min && (index === 9 ? row.load_ratio <= max : row.load_ratio < max),
    );
    const latencies = rows.map((row) => row.observed_latency_ms);

    bands.push({
      label: `${Math.round(min * 100)}–${Math.round(max * 100)}%`,
      min,
      max,
      samples: finite(latencies).length,
      averageLatencyMs: round(mean(latencies), 3),
      medianLatencyMs: round(median(latencies), 3),
      p95LatencyMs: round(quantile(latencies, 0.95), 3),
    });
  }

  return bands;
}

function buildTrafficShareBands(incidents: IncidentRow[]): TrafficShareBandMetric[] {
  const sortedShares = incidents.map((row) => row.traffic_share).sort((a, b) => a - b);
  if (sortedShares.length === 0) return [];

  const boundaries = Array.from({ length: 11 }, (_, index) =>
    quantile(sortedShares, index / 10),
  );

  return Array.from({ length: 10 }, (_, index) => {
    const min = boundaries[index] ?? 0;
    const max = boundaries[index + 1] ?? min;
    const rows = incidents.filter((row) => {
      if (index === 9) return row.traffic_share >= min && row.traffic_share <= max;
      return row.traffic_share >= min && row.traffic_share < max;
    });
    const jamCount = rows.filter((row) => row.jammed_flag).length;

    return {
      label: `D${index + 1}`,
      min: round(min, 5) ?? 0,
      max: round(max, 5) ?? 0,
      samples: rows.length,
      jamRate: rows.length === 0 ? 0 : round(jamCount / rows.length) ?? 0,
      jamCount,
      averageShare: round(mean(rows.map((row) => row.traffic_share)) ?? 0, 5) ?? 0,
    };
  });
}

function buildMetrics(
  traffic: TrafficRow[],
  telemetry: TelemetryRow[],
  incidents: IncidentRow[],
): DashboardMetrics {
  const validTraffic = traffic.filter((row) => row.observed_latency_ms !== null);
  const loadValues = traffic.map((row) => row.load_ratio);
  const latencyValues = traffic.map((row) => row.observed_latency_ms);
  const pairedLoads = validTraffic.map((row) => row.load_ratio);
  const pairedLatencies = validTraffic.map((row) => row.observed_latency_ms ?? 0);
  const validTelemetry = telemetry.filter((row) => row.self_reported_latency_ms !== null);
  const telemetryDeltas = validTelemetry.map(
    (row) => row.measured_latency_ms - (row.self_reported_latency_ms ?? 0),
  );
  const telemetryErrors = validTelemetry
    .filter((row) => row.measured_latency_ms !== 0)
    .map(
      (row) =>
        Math.abs(row.measured_latency_ms - (row.self_reported_latency_ms ?? 0)) /
        row.measured_latency_ms,
    );
  const jammedRows = incidents.filter((row) => row.jammed_flag);
  const safeRows = incidents.filter((row) => !row.jammed_flag);
  const jamIndicators = incidents.map((row) => (row.jammed_flag ? 1 : 0));

  return {
    trafficRecords: traffic.length,
    telemetryRecords: telemetry.length,
    incidentRecords: incidents.length,
    visibleLinks: new Set([
      ...traffic.map((row) => row.link_id),
      ...telemetry.map((row) => row.link_id),
      ...incidents.map((row) => row.link_id),
    ]).size,
    visibleTicks: new Set([
      ...traffic.map((row) => row.tick),
      ...telemetry.map((row) => row.tick),
      ...incidents.map((row) => row.tick),
    ]).size,
    averageLoadRatio: round(mean(loadValues)) ?? 0,
    p95LoadRatio: round(quantile(loadValues, 0.95)) ?? 0,
    averageObservedLatencyMs: round(mean(latencyValues), 3),
    medianObservedLatencyMs: round(median(latencyValues), 3),
    p95ObservedLatencyMs: round(quantile(latencyValues, 0.95), 3),
    maxObservedLatencyMs: round(quantile(latencyValues, 1), 3),
    saturatedCount: traffic.filter((row) => row.status === "saturated").length,
    saturationRate:
      traffic.length === 0
        ? 0
        : round(traffic.filter((row) => row.status === "saturated").length / traffic.length) ?? 0,
    missingObservedLatencyCount: traffic.length - validTraffic.length,
    loadLatencyPearson: round(pearson(pairedLoads, pairedLatencies)),
    loadLatencySpearman: round(spearman(pairedLoads, pairedLatencies)),
    missingTelemetryCount: telemetry.length - validTelemetry.length,
    meanTelemetryDeltaMs: round(mean(telemetryDeltas), 3),
    medianTelemetryDeltaMs: round(median(telemetryDeltas), 3),
    telemetryMape: round(mean(telemetryErrors)),
    medianTelemetryApe: round(median(telemetryErrors)),
    telemetryUnderreportRate:
      validTelemetry.length === 0
        ? null
        : round(telemetryDeltas.filter((value) => value > 0).length / validTelemetry.length),
    telemetryCorrelation: round(
      pearson(
        validTelemetry.map((row) => row.self_reported_latency_ms ?? 0),
        validTelemetry.map((row) => row.measured_latency_ms),
      ),
    ),
    jamCount: jammedRows.length,
    jamRate: incidents.length === 0 ? 0 : round(jammedRows.length / incidents.length) ?? 0,
    averageShareWhenJammed: round(mean(jammedRows.map((row) => row.traffic_share))),
    averageShareWhenSafe: round(mean(safeRows.map((row) => row.traffic_share))),
    trafficShareJamCorrelation: round(
      pearson(
        incidents.map((row) => row.traffic_share),
        jamIndicators,
      ),
    ),
  };
}

function buildInsights(
  metrics: DashboardMetrics,
  linkMetrics: LinkMetric[],
  loadBands: LoadBandMetric[],
  trafficShareBands: TrafficShareBandMetric[],
): string[] {
  const insights: string[] = [];
  const sortedTrust = [...linkMetrics].sort((a, b) => b.trustRisk - a.trustRisk);
  const sortedTargeting = [...linkMetrics].sort((a, b) => b.targetingRisk - a.targetingRisk);
  const firstTrust = sortedTrust[0];
  const secondTrust = sortedTrust[1];
  const firstTarget = sortedTargeting[0];

  const lowBand = loadBands.find((band) => band.min === 0.1) ?? loadBands[0];
  const highBand = [...loadBands].reverse().find((band) => (band.medianLatencyMs ?? 0) > 0);

  if (
    lowBand?.medianLatencyMs &&
    highBand?.medianLatencyMs &&
    lowBand.medianLatencyMs > 0
  ) {
    const multiplier = highBand.medianLatencyMs / lowBand.medianLatencyMs;
    insights.push(
      `Congestion is strongly non-linear: the highest populated load band has about ${multiplier.toFixed(1)}× the median latency of the ${lowBand.label} band.`,
    );
  }

  if (firstTrust && secondTrust) {
    insights.push(
      `${firstTrust.linkId} and ${secondTrust.linkId} show the clearest persistent telemetry mismatch, with trust-risk scores of ${(firstTrust.trustRisk * 100).toFixed(0)}% and ${(secondTrust.trustRisk * 100).toFixed(0)}%.`,
    );
  }

  const lowDeciles = trafficShareBands.slice(0, 2);
  const highDeciles = trafficShareBands.slice(-2);
  const lowJamRate = mean(lowDeciles.map((band) => band.jamRate));
  const highJamRate = mean(highDeciles.map((band) => band.jamRate));
  if (lowJamRate !== null && highJamRate !== null && lowJamRate > 0) {
    insights.push(
      `High-share traffic windows are targeted more often: the top two traffic-share deciles are jammed about ${(highJamRate / lowJamRate).toFixed(1)}× as frequently as the bottom two deciles.`,
    );
  }

  if (firstTarget) {
    insights.push(
      `${firstTarget.linkId} currently ranks highest on the descriptive targeting-risk index, combining jam frequency and average traffic share.`,
    );
  }

  if (metrics.missingObservedLatencyCount > 0 || metrics.missingTelemetryCount > 0) {
    insights.push(
      `Null handling matters: ${metrics.missingObservedLatencyCount.toLocaleString()} observed-latency values and ${metrics.missingTelemetryCount.toLocaleString()} self-reported telemetry values are missing and are excluded from numeric averages.`,
    );
  }

  return insights;
}

export function analyzeDashboard(
  traffic: TrafficRow[],
  telemetry: TelemetryRow[],
  incidents: IncidentRow[],
  config: UniverseConfig,
): DashboardAnalysis {
  const metrics = buildMetrics(traffic, telemetry, incidents);
  const linkMetrics = buildLinkMetrics(traffic, telemetry, incidents, config);
  const minTick = Math.min(
    ...traffic.map((row) => row.tick),
    ...telemetry.map((row) => row.tick),
    ...incidents.map((row) => row.tick),
  );
  const maxTick = Math.max(
    ...traffic.map((row) => row.tick),
    ...telemetry.map((row) => row.tick),
    ...incidents.map((row) => row.tick),
  );
  const tickSpan = Number.isFinite(minTick) && Number.isFinite(maxTick) ? maxTick - minTick + 1 : 1;
  const bucketSize = Math.max(1, Math.ceil(tickSpan / 25));
  const tickTrend = buildTickTrend(traffic, telemetry, incidents, bucketSize);
  const loadBands = buildLoadBands(traffic);
  const trafficShareBands = buildTrafficShareBands(incidents);

  const congestionScatter: ScatterPoint[] = sampleEvenly(
    traffic
      .filter((row) => row.observed_latency_ms !== null)
      .map((row) => ({
        x: row.load_ratio,
        y: row.observed_latency_ms ?? 0,
        label: `${row.link_id} · tick ${row.tick}`,
        group: row.link_id,
      })),
    750,
  );

  const telemetryScatter: ScatterPoint[] = sampleEvenly(
    telemetry
      .filter((row) => row.self_reported_latency_ms !== null)
      .map((row) => ({
        x: row.self_reported_latency_ms ?? 0,
        y: row.measured_latency_ms,
        label: `${row.link_id} · tick ${row.tick}`,
        group: row.link_id,
      })),
    750,
  );

  const linkTargetingScatter: ScatterPoint[] = linkMetrics.map((metric) => ({
    x: metric.averageTrafficShare,
    y: metric.jamRate,
    label: metric.linkId,
    group: metric.riskLevel,
  }));

  return {
    metrics,
    linkMetrics,
    tickTrend,
    loadBands,
    trafficShareBands,
    congestionScatter,
    telemetryScatter,
    linkTargetingScatter,
    insights: buildInsights(metrics, linkMetrics, loadBands, trafficShareBands),
  };
}
