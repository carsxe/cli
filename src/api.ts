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

async function doGet(
  apiKey: string,
  endpoint: string,
  params: Params = {},
): Promise<unknown> {
  const url = buildUrl(endpoint, apiKey, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return throwWithBody(res);
  return res.json();
}

async function doPost(
  apiKey: string,
  endpoint: string,
  body: Record<string, string>,
): Promise<unknown> {
  const url = buildUrl(endpoint, apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return throwWithBody(res);
  return res.json();
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
  marketValue(key: string, vin: string) {
    return doGet(key, "v2/marketvalue", { vin });
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
};
