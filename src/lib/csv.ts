import type {
  IncidentRow,
  TelemetryRow,
  TrafficRow,
} from "../types";

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (quoted && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]!);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function nullableNumber(value: string): number | null {
  if (value === "" || value.toLowerCase() === "null") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value in ${field}: ${value}`);
  }
  return parsed;
}

export function parseTrafficCsv(text: string): TrafficRow[] {
  return parseCsv(text).map((row) => ({
    link_id: row.link_id ?? "",
    tick: requiredNumber(row.tick ?? "", "tick"),
    load_units: requiredNumber(row.load_units ?? "", "load_units"),
    load_ratio: requiredNumber(row.load_ratio ?? "", "load_ratio"),
    status: row.status ?? "unknown",
    observed_latency_ms: nullableNumber(row.observed_latency_ms ?? ""),
  }));
}

export function parseTelemetryCsv(text: string): TelemetryRow[] {
  return parseCsv(text).map((row) => ({
    link_id: row.link_id ?? "",
    tick: requiredNumber(row.tick ?? "", "tick"),
    self_reported_latency_ms: nullableNumber(
      row.self_reported_latency_ms ?? "",
    ),
    measured_latency_ms: requiredNumber(
      row.measured_latency_ms ?? "",
      "measured_latency_ms",
    ),
  }));
}

export function parseIncidentCsv(text: string): IncidentRow[] {
  return parseCsv(text).map((row) => ({
    link_id: row.link_id ?? "",
    tick: requiredNumber(row.tick ?? "", "tick"),
    traffic_share: requiredNumber(row.traffic_share ?? "", "traffic_share"),
    jammed_flag: (row.jammed_flag ?? "").toLowerCase() === "true",
  }));
}
