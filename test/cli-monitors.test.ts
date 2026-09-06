import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { program } from "../src/cli";

const KEY = "test-key";
const originalFetch = globalThis.fetch;
const originalKey = process.env.CARSXE_API_KEY;

let fetchMock: ReturnType<typeof mock.fn>;
let logs: string[];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "Content-Type": "application/json" },
  });
}

async function runCli(args: string[]): Promise<string> {
  logs = [];
  mock.method(console, "log", (...parts: unknown[]) => {
    logs.push(parts.map(String).join(" "));
  });
  mock.method(console, "error", (...parts: unknown[]) => {
    logs.push(parts.map(String).join(" "));
  });
  await program.parseAsync(args, { from: "user" });
  return logs.join("\n");
}

function lastFetch(): { url: URL; method: string; body: unknown } {
  const calls = fetchMock.mock.calls;
  assert.ok(calls.length > 0, "expected fetch to be called");
  const [input, init] = calls[calls.length - 1].arguments as [
    string,
    RequestInit | undefined,
  ];
  return {
    url: new URL(input),
    method: init?.method ?? "GET",
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

describe("monitors CLI", () => {
  beforeEach(() => {
    process.env.CARSXE_API_KEY = KEY;
    fetchMock = mock.fn(async () => jsonResponse({ success: true, id: "mon_1" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CARSXE_API_KEY;
    else process.env.CARSXE_API_KEY = originalKey;
    mock.restoreAll();
  });

  it("creates a monitor from flags", async () => {
    const out = await runCli([
      "monitors",
      "create",
      "--name",
      "Fleet",
      "--vehicle-type",
      "vin",
      "--vehicle",
      "1C4JJXR64PW696340",
      "--product",
      "recalls",
      "--frequency",
      "daily",
      "--delivery",
      "email",
    ]);
    const call = lastFetch();
    assert.equal(call.url.pathname, "/v1/monitors");
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body, {
      name: "Fleet",
      vehicleType: "vin",
      vehicles: ["1C4JJXR64PW696340"],
      products: ["recalls"],
      schedule: { frequency: "daily" },
      delivery: ["email"],
    });
    assert.match(out, /"id": "mon_1"/);
  });

  it("runs a monitor immediately", async () => {
    await runCli(["monitors", "run", "mon_1"]);
    const call = lastFetch();
    assert.equal(call.url.pathname, "/v1/monitors/mon_1/run");
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body, {});
  });

  it("lists, gets, updates, imports, alerts, and deletes", async () => {
    await runCli(["monitors", "list"]);
    assert.equal(lastFetch().url.pathname, "/v1/monitors");

    await runCli(["monitors", "get", "mon_1"]);
    assert.equal(lastFetch().url.pathname, "/v1/monitors/mon_1");

    await runCli(["monitors", "update", "mon_1", "--pause"]);
    assert.equal(lastFetch().method, "PATCH");
    assert.deepEqual(lastFetch().body, { status: "paused" });

    await runCli(["monitors", "import", "mon_1", "--vehicles", "VIN1,VIN2"]);
    assert.equal(lastFetch().url.pathname, "/v1/monitors/mon_1/import");
    assert.deepEqual(lastFetch().body, { vehicles: ["VIN1", "VIN2"] });

    await runCli(["monitors", "alerts"]);
    assert.equal(lastFetch().url.pathname, "/v1/monitors/alerts");

    await runCli(["monitors", "alerts", "mon_1"]);
    assert.equal(lastFetch().url.pathname, "/v1/monitors/mon_1/alerts");

    await runCli(["monitors", "delete", "mon_1"]);
    assert.equal(lastFetch().method, "DELETE");
    assert.equal(lastFetch().url.pathname, "/v1/monitors/mon_1");
  });

  it("points help at docs.carsxe.com", () => {
    const monitors = program.commands.find((cmd) => cmd.name() === "monitors");
    assert.ok(monitors);
    let help = "";
    monitors.configureOutput({
      writeOut: (s) => {
        help += s;
      },
    });
    monitors.outputHelp();
    assert.match(help, /https:\/\/docs\.carsxe\.com\/docs\/products\/monitors/);
    assert.match(help, /https:\/\/docs\.carsxe\.com\/docs\/guides\/agents/);
  });
});
