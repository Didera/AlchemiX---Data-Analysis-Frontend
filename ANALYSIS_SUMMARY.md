# Historical Dataset Findings Used by the Dashboard

The frontend computes these values from the supplied CSV files at runtime. The full, unfiltered dataset currently contains:

- **18,000 total records**: 6,000 traffic, 6,000 telemetry, and 6,000 incident observations
- **12 interplanetary links**
- **500 ticks** per dataset

## Congestion

- Average load ratio: approximately **29.94%**
- P95 load ratio: approximately **61.26%**
- Pearson correlation between load ratio and observed latency: approximately **0.691**
- Spearman correlation: approximately **0.713**
- Median latency rises sharply as load increases; the 70–80% load band is multiple times slower than low-load bands
- 3 hard-saturation records are present
- 257 observed-latency values are null and are excluded from averages and scatter plots

## Telemetry trust

- Overall reported-versus-measured latency correlation: approximately **0.934**
- Mean absolute percentage error: approximately **8.93%**
- Median absolute percentage error: approximately **2.99%**
- 256 self-reported latency values are null
- `Aegis-Elysium` and `Boreas-Fenix` show the strongest persistent under-reporting signatures in the historical data

## Targeting risk

- 493 jammed observations
- Overall jam rate: approximately **8.22%**
- Average traffic share during jammed observations: approximately **11.42%**
- Average traffic share during safe observations: approximately **8.07%**
- Jam frequency increases materially in the highest traffic-share deciles, supporting the predictable-route targeting hypothesis

These are descriptive historical findings. The final routing agent should use trained models for live congestion penalty, trust score, and targeting-risk predictions.
