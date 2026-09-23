import type { APITypes } from "./types";

const BASE_URL = "https://api.carsxe.com";
const SOURCE = "cli";
const TIMEOUT_MS = 30_000;

type Params = Record<string, string | undefined>;

function buildUrl(
  endpoint: string,
  apiKey: string,
  params: Params = {},
): string {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("source", SOURCE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return url.toString();
}

async function throwWithBody(res: Response): Promise<never> {
  let detail = "";
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) detail = ` — ${body.message}`;
  } catch {
    /* response body is not JSON */
  }
  throw new Error(`HTTP ${res.status} ${res.statusText}${detail}`);
}

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return { success: true };
  const text = await res.text();
  if (!text) return { success: true };
  return JSON.parse(text) as unknown;
}

async function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  apiKey: string,
  endpoint: string,
  options: { params?: Params; body?: unknown } = {},
): Promise<unknown> {
  const url = buildUrl(endpoint, apiKey, options.params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const init: RequestInit = { method, signal: controller.signal };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return throwWithBody(res);
  return parseResponse(res);
}

async function doGet(
  apiKey: string,
  endpoint: string,
  params: Params = {},
): Promise<unknown> {
  return request("GET", apiKey, endpoint, { params });
}

async function doPost(
  apiKey: string,
  endpoint: string,
  body: unknown,
): Promise<unknown> {
  return request("POST", apiKey, endpoint, { body });
}

function monitorPath(id?: string, suffix?: string): string {
  const segments = ["v1/monitors"];
  if (id !== undefined) segments.push(encodeURIComponent(id));
  if (suffix) segments.push(suffix);
  return segments.join("/");
}

export const api: APITypes = {
  specs(
    key: string,
    vin: string,
    deepdata?: string,
    disableIntVINDecoding?: string,
  ) {
    return doGet(key, "specs", { vin, deepdata, disableIntVINDecoding });
  },
  marketValue(
    key: string,
    vin: string,
    mileage?: string,
    state?: string,
    condition?: string,
    country?: string,
  ) {
    return doGet(key, "v2/marketvalue", {
      vin,
      mileage,
      state,
      condition,
      country,
    });
  },
  history(key: string, vin: string) {
    return doGet(key, "history", { vin });
  },
  recalls(key: string, vin: string) {
    return doGet(key, "v1/recalls", { vin });
  },
  internationalVin(key: string, vin: string) {
    return doGet(key, "v1/international-vin-decoder", { vin });
  },
  plateDecoder(
    key: string,
    plate: string,
    country: string,
    state?: string,
    district?: string,
  ) {
    return doGet(key, "v2/platedecoder", { plate, country, state, district });
  },
  lienTheft(key: string, vin: string) {
    return doGet(key, "v1/lien-theft", { vin });
  },
  plateImage(key: string, imageUrl: string) {
    return doPost(key, "platerecognition", { image: imageUrl });
  },
  vinOcr(key: string, imageUrl: string) {
    return doPost(key, "v1/vinocr", { image: imageUrl });
  },
  ymm(key: string, year: string, make: string, model: string, trim?: string) {
    return doGet(key, "v1/ymm", { year, make, model, trim });
  },
  images(
    key: string,
    make: string,
    model: string,
    year?: string,
    trim?: string,
    color?: string,
    angle?: string,
    photoType?: string,
    size?: string,
  ) {
    return doGet(key, "images", {
      make,
      model,
      year,
      trim,
      color,
      angle,
      photoType,
      size,
    });
  },
  obd(key: string, code: string) {
    return doGet(key, "obdcodesdecoder", { code });
  },
  listMonitors(key: string) {
    return doGet(key, monitorPath());
  },
  getMonitor(key: string, id: string) {
    return doGet(key, monitorPath(id));
  },
  createMonitor(key: string, body: unknown) {
    return doPost(key, monitorPath(), body);
  },
  updateMonitor(key: string, id: string, body: unknown) {
    return request("PATCH", key, monitorPath(id), { body });
  },
  deleteMonitor(key: string, id: string) {
    return request("DELETE", key, monitorPath(id));
  },
  importMonitorVehicles(key: string, id: string, body: unknown) {
    return doPost(key, monitorPath(id, "import"), body);
  },
  runMonitor(key: string, id: string) {
    return doPost(key, monitorPath(id, "run"), {});
  },
  listMonitorAlerts(key: string, id?: string) {
    return doGet(key, monitorPath(id, "alerts"));
  },
};
