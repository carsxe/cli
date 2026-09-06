import * as fs from "fs";

export type MonitorWriteOptions = {
  json?: string;
  name?: string;
  vehicleType?: string;
  vehicle?: string[];
  vehicles?: string;
  product?: string[];
  products?: string;
  delivery?: string[];
  frequency?: string;
  status?: string;
  pause?: boolean;
  resume?: boolean;
};

export type MonitorImportOptions = {
  json?: string;
  vehicle?: string[];
  vehicles?: string;
  file?: string;
};

function readInputText(value: string): string {
  if (value === "-") {
    return fs.readFileSync(0, "utf8");
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return value;
  }
  if (fs.existsSync(value) && fs.statSync(value).isFile()) {
    return fs.readFileSync(value, "utf8");
  }
  return value;
}

export function parseJsonInput(value: string): unknown {
  const text = readInputText(value);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      "Invalid JSON. Pass an inline object, a .json file path, or '-' for stdin.",
    );
  }
}

export function splitCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function collectList(
  repeatable: string[] | undefined,
  csv?: string,
): string[] {
  return [...(repeatable ?? []), ...splitCsv(csv)];
}

export function parseVehiclesFromText(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { vehicles?: unknown }).vehicles)
    ) {
      return ((parsed as { vehicles: unknown[] }).vehicles).map(String);
    }
  }

  const vehicles: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const firstCell = rawLine.split(",")[0]?.trim() ?? "";
    if (!firstCell) continue;
    if (/^(vin|vehicle|vehicles|id)$/i.test(firstCell)) continue;
    vehicles.push(firstCell);
  }
  return vehicles;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  throw new Error("JSON body must be an object.");
}

export function buildMonitorWriteBody(
  opts: MonitorWriteOptions,
): Record<string, unknown> {
  const body = opts.json ? asObject(parseJsonInput(opts.json)) : {};

  if (opts.name) body.name = opts.name;
  if (opts.vehicleType) body.vehicleType = opts.vehicleType;

  const vehicles = collectList(opts.vehicle, opts.vehicles);
  if (vehicles.length) body.vehicles = vehicles;

  const products = collectList(opts.product, opts.products);
  if (products.length) body.products = products;

  const delivery = collectList(opts.delivery);
  if (delivery.length) body.delivery = delivery;

  if (opts.frequency) {
    const schedule =
      body.schedule && typeof body.schedule === "object"
        ? { ...(body.schedule as Record<string, unknown>) }
        : {};
    schedule.frequency = opts.frequency;
    body.schedule = schedule;
  }

  if (opts.status) body.status = opts.status;
  if (opts.pause) body.status = "paused";
  if (opts.resume) body.status = "active";

  return body;
}

export function buildMonitorImportBody(
  opts: MonitorImportOptions,
): Record<string, unknown> {
  if (opts.json) return asObject(parseJsonInput(opts.json));

  const vehicles = collectList(opts.vehicle, opts.vehicles);
  if (opts.file) {
    const content = fs.readFileSync(opts.file, "utf8");
    vehicles.push(...parseVehiclesFromText(content));
  }

  if (!vehicles.length) {
    throw new Error(
      "Provide vehicles via --vehicle, --vehicles, --file, or --json.",
    );
  }

  return { vehicles };
}

export function assertCreateBody(body: Record<string, unknown>): void {
  if (!body.name || typeof body.name !== "string") {
    throw new Error("Monitor name is required. Use --name or --json.");
  }
}

export function assertUpdateBody(body: Record<string, unknown>): void {
  if (Object.keys(body).length === 0) {
    throw new Error(
      "Provide at least one field to update (--name, --status, --pause, --resume, --json, …).",
    );
  }
}
