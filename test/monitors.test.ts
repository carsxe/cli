import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { api } from "../src/api";

type FetchCall = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

const KEY = "test-key";

let fetchMock: ReturnType<typeof mock.fn>;
const originalFetch = globalThis.fetch;

function jsonResponse(data: unknown, status = 200, statusText = "OK"): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(): FetchCall {
  const calls = fetchMock.mock.calls;
  assert.ok(calls.length > 0, "expected fetch to be called");
  const [input, init] = calls[calls.length - 1].arguments as [
    string,
    RequestInit | undefined,
  ];
  return {
    url: new URL(input),
    method: init?.method ?? "GET",
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

describe("monitor API", () => {
  beforeEach(() => {
    fetchMock = mock.fn(async () => jsonResponse({ success: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  it("lists monitors with API key and cli source", async () => {
    await api.listMonitors(KEY);
    const call = lastCall();
    assert.equal(call.url.origin, "https://api.carsxe.com");
    assert.equal(call.url.pathname, "/v1/monitors");
    assert.equal(call.url.searchParams.get("key"), KEY);
    assert.equal(call.url.searchParams.get("source"), "cli");
    assert.equal(call.method, "GET");
  });

  it("gets a monitor by encoded id", async () => {
    await api.getMonitor(KEY, "mon/1");
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon%2F1");
    assert.equal(call.method, "GET");
  });

  it("creates a monitor with a JSON body", async () => {
    const body = {
      name: "Fleet",
      vehicleType: "vin",
      vehicles: ["1C4JJXR64PW696340"],
      products: ["recalls"],
      schedule: { frequency: "daily" },
      delivery: ["email"],
    };
    await api.createMonitor(KEY, body);
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors");
    assert.equal(call.method, "POST");
    assert.equal(call.headers["Content-Type"], "application/json");
    assert.deepEqual(call.body, body);
  });

  it("patches a monitor", async () => {
    await api.updateMonitor(KEY, "mon_1", { status: "paused" });
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1");
    assert.equal(call.method, "PATCH");
    assert.deepEqual(call.body, { status: "paused" });
  });

  it("deletes a monitor and accepts an empty 204", async () => {
    fetchMock.mock.mockImplementation(async () => new Response(null, { status: 204 }));
    const result = await api.deleteMonitor(KEY, "mon_1");
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1");
    assert.equal(call.method, "DELETE");
    assert.deepEqual(result, { success: true });
  });

  it("imports vehicles into a monitor", async () => {
    await api.importMonitorVehicles(KEY, "mon_1", {
      vehicles: ["1C4JJXR64PW696340"],
    });
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1/import");
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body, { vehicles: ["1C4JJXR64PW696340"] });
  });

  it("runs a monitor now", async () => {
    await api.runMonitor(KEY, "mon_1");
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1/run");
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body, {});
  });

  it("lists account-wide alerts", async () => {
    await api.listMonitorAlerts(KEY);
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/alerts");
    assert.equal(call.method, "GET");
  });

  it("lists alerts for one monitor", async () => {
    await api.listMonitorAlerts(KEY, "mon_1");
    const call = lastCall();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1/alerts");
    assert.equal(call.method, "GET");
  });

  it("surfaces HTTP errors from the JSON message", async () => {
    fetchMock.mock.mockImplementation(async () =>
      jsonResponse({ message: "Monitor not found" }, 404, "Not Found"),
    );
    await assert.rejects(
      () => api.getMonitor(KEY, "missing"),
      /HTTP 404 Not Found — Monitor not found/,
    );
  });
});
