# AlchemiX — Chimera Intelligence Dashboard

A complete React + TypeScript analytical frontend for the three Phase 2 historical CSV datasets:

- `link_traffic_history.csv`
- `link_telemetry.csv`
- `link_incident_history.csv`

It also loads `universe-config.json` to draw the Zeta-26 topology and attach capacity and planet metadata to every link.

## What the dashboard shows

### 1. Command overview

- Total observations, active links, and tick coverage
- Average and P95 load ratios
- Median and P95 observed latency
- Historical jamming frequency
- Telemetry error and hard-saturation counts
- Interactive universe topology, with link width based on average load and color based on a descriptive composite-risk index
- Automatically generated analytical findings

### 2. Congestion analysis

- Pearson and Spearman load-latency relationships
- Load ratio versus observed latency scatter plot
- Median latency by 10% load band
- Load trend across tick windows
- Links ranked by P95 load
- Correct exclusion of null latency values

### 3. Telemetry trust analysis

- Self-reported versus measured latency scatter plot
- Correlation, mean/median absolute percentage error, and under-reporting frequency
- Trust-risk ranking for every link
- Telemetry-error trend
- Priority list of links with persistent deception signatures

### 4. Predictable-route targeting analysis

- Jam count and jam rate
- Average traffic share during jammed and safe windows
- Point-biserial correlation between traffic share and the jammed flag
- Jam probability by traffic-share decile
- Historical jam rate per link
- Link traffic-share versus jam-rate scatter plot

### 5. Link intelligence table

A sortable link-level evidence table with:

- Average load
- P95 observed latency
- Mean signed telemetry delta
- Trust score
- Jam rate
- Descriptive composite risk
- Risk level

The detailed view explains the congestion, trust, and targeting components for a selected link.

## Important interpretation rule

The dashboard's risk indices are intentionally transparent descriptive scores for exploration and prioritization. They are **not trained-model outputs** and should not replace the Phase 2 congestion, trust, and targeting-risk models in the routing engine.

The composite score is:

```text
40% congestion risk + 30% trust risk + 30% targeting risk
```

It is included to make the frontend immediately useful before the final models are connected.

## Run the frontend

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
```

## Dataset location

The supplied files are already copied to:

```text
public/data/
├── link_traffic_history.csv
├── link_telemetry.csv
├── link_incident_history.csv
└── universe-config.json
```

The app parses and analyzes these files in the browser. No API server is required for the historical dashboard.

## Integrate with the current Wails frontend

The safest integration is:

1. Copy `src/components`, `src/lib`, and `src/types.ts` into the existing `frontend/src` directory.
2. Copy the four files from `public/data` into the existing Wails frontend's `public/data` directory.
3. Add the dashboard as a new top-level screen or route.
4. Keep the existing Phase 1 transmission screen unchanged and add an **Intelligence** navigation item.
5. Run `wails dev` from the project root.

Because the charts are implemented with native SVG, the dashboard does not require a charting package or CSV-parsing package.

## Future live-data connection

For the live assessment, preserve the visual components and replace the historical loader with a service that polls `/state`. The live response can feed the same chart and table interfaces after model inference adds:

- `predicted_congestion_penalty_ms`
- `trust_score`
- `targeting_risk_score`
- `combined_cost`

Do not train the final models on build-period `/state` values. The dashboard currently uses only the provided historical CSVs.

## Windows install fix

This copy uses the public npm registry. If a previous installation attempt failed, run in PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache verify
npm install
npm run dev
```

Vite 8 requires Node.js 20.19+ or 22.12+.
