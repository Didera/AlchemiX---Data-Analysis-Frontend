export interface TrafficRow {
  link_id: string;
  tick: number;
  load_units: number;
  load_ratio: number;
  status: "ok" | "saturated" | string;
  observed_latency_ms: number | null;
}

export interface TelemetryRow {
  link_id: string;
  tick: number;
  self_reported_latency_ms: number | null;
  measured_latency_ms: number;
}

export interface IncidentRow {
  link_id: string;
  tick: number;
  traffic_share: number;
  jammed_flag: boolean;
}

export interface UniverseMetadata {
  system_name: string;
  speed_of_light_kms: number;
  max_void_hop_distance_km: number;
  coordinate_scale_unit_km: number;
  tower_processing_delay_ms: number;
  fiber_speed_fraction: number;
}

export interface PlanetNode {
  id: string;
  codex: number;
  x: number;
  y: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
}

export interface UniverseLink {
  link_id: string;
  planet_a: string;
  planet_b: string;
  capacity_units: number;
}

export interface UniverseConfig {
  universe_metadata: UniverseMetadata;
  nodes: PlanetNode[];
  interplanetary_links: UniverseLink[];
}

export interface DatasetBundle {
  traffic: TrafficRow[];
  telemetry: TelemetryRow[];
  incidents: IncidentRow[];
  config: UniverseConfig;
}

export interface TickTrendPoint {
  tick: number;
  label: string;
  averageLoadRatio: number;
  averageObservedLatencyMs: number | null;
  telemetryErrorRate: number | null;
  jamRate: number;
  saturatedCount: number;
}

export interface LoadBandMetric {
  label: string;
  min: number;
  max: number;
  samples: number;
  averageLatencyMs: number | null;
  medianLatencyMs: number | null;
  p95LatencyMs: number | null;
}

export interface TrafficShareBandMetric {
  label: string;
  min: number;
  max: number;
  samples: number;
  jamRate: number;
  jamCount: number;
  averageShare: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  group?: string;
}

export interface LinkMetric {
  linkId: string;
  planetA: string;
  planetB: string;
  capacityUnits: number;
  samples: number;
  averageLoadRatio: number;
  p95LoadRatio: number;
  medianObservedLatencyMs: number | null;
  averageObservedLatencyMs: number | null;
  p95ObservedLatencyMs: number | null;
  latencyAmplification: number | null;
  saturationCount: number;
  saturationRate: number;
  missingObservedLatencyCount: number;
  telemetrySamples: number;
  missingTelemetryCount: number;
  meanTelemetryDeltaMs: number | null;
  telemetryMape: number | null;
  medianTelemetryApe: number | null;
  underreportRate: number | null;
  severeUnderreportRate: number | null;
  telemetryCorrelation: number | null;
  jamCount: number;
  jamRate: number;
  averageTrafficShare: number;
  p95TrafficShare: number;
  congestionRisk: number;
  trustRisk: number;
  trustScore: number;
  targetingRisk: number;
  compositeRisk: number;
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
}

export interface DashboardMetrics {
  trafficRecords: number;
  telemetryRecords: number;
  incidentRecords: number;
  visibleLinks: number;
  visibleTicks: number;
  averageLoadRatio: number;
  p95LoadRatio: number;
  averageObservedLatencyMs: number | null;
  medianObservedLatencyMs: number | null;
  p95ObservedLatencyMs: number | null;
  maxObservedLatencyMs: number | null;
  saturatedCount: number;
  saturationRate: number;
  missingObservedLatencyCount: number;
  loadLatencyPearson: number | null;
  loadLatencySpearman: number | null;
  missingTelemetryCount: number;
  meanTelemetryDeltaMs: number | null;
  medianTelemetryDeltaMs: number | null;
  telemetryMape: number | null;
  medianTelemetryApe: number | null;
  telemetryUnderreportRate: number | null;
  telemetryCorrelation: number | null;
  jamCount: number;
  jamRate: number;
  averageShareWhenJammed: number | null;
  averageShareWhenSafe: number | null;
  trafficShareJamCorrelation: number | null;
}

export interface DashboardAnalysis {
  metrics: DashboardMetrics;
  linkMetrics: LinkMetric[];
  tickTrend: TickTrendPoint[];
  loadBands: LoadBandMetric[];
  trafficShareBands: TrafficShareBandMetric[];
  congestionScatter: ScatterPoint[];
  telemetryScatter: ScatterPoint[];
  linkTargetingScatter: ScatterPoint[];
  insights: string[];
}
