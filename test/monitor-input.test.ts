import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import {
  assertCreateBody,
  assertUpdateBody,
  buildMonitorImportBody,
  buildMonitorWriteBody,
  parseVehiclesFromText,
} from "../src/monitor-input";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "carsxe-cli-"));

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("monitor input", () => {
  it("builds a create body from flags", () => {
    const body = buildMonitorWriteBody({
      name: "Fleet",
      vehicleType: "vin",
      vehicle: ["1C4JJXR64PW696340"],
      product: ["recalls"],
      frequency: "daily",
      delivery: ["email"],
    });
    assert.deepEqual(body, {
      name: "Fleet",
      vehicleType: "vin",
      vehicles: ["1C4JJXR64PW696340"],
      products: ["recalls"],
      schedule: { frequency: "daily" },
      delivery: ["email"],
    });
  });

  it("merges flags over a JSON body and maps pause/resume", () => {
    const body = buildMonitorWriteBody({
      json: '{"name":"Fleet","schedule":{"timezone":"UTC"}}',
      frequency: "weekly",
      pause: true,
    });
    assert.equal(body.name, "Fleet");
    assert.deepEqual(body.schedule, { timezone: "UTC", frequency: "weekly" });
    assert.equal(body.status, "paused");

    const resumed = buildMonitorWriteBody({ resume: true });
    assert.equal(resumed.status, "active");
  });

  it("reads a JSON file for --json", () => {
    const file = path.join(tmpDir, "monitor.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ name: "FromFile", products: ["recalls"] }),
    );
    const body = buildMonitorWriteBody({ json: file, name: "Override" });
    assert.equal(body.name, "Override");
    assert.deepEqual(body.products, ["recalls"]);
  });

  it("parses CSV and JSON vehicle lists", () => {
    assert.deepEqual(
      parseVehiclesFromText("vin\n1C4JJXR64PW696340\n1HGCM82633A004352\n"),
      ["1C4JJXR64PW696340", "1HGCM82633A004352"],
    );
    assert.deepEqual(parseVehiclesFromText('["VIN1","VIN2"]'), ["VIN1", "VIN2"]);
    assert.deepEqual(parseVehiclesFromText('{"vehicles":["VIN3"]}'), ["VIN3"]);
  });

  it("imports vehicles from flags and a file", () => {
    const file = path.join(tmpDir, "vehicles.csv");
    fs.writeFileSync(file, "vin\n1C4JJXR64PW696340\n");
    const body = buildMonitorImportBody({
      vehicle: ["1HGCM82633A004352"],
      file,
    });
    assert.deepEqual(body, {
      vehicles: ["1HGCM82633A004352", "1C4JJXR64PW696340"],
    });
  });

  it("rejects empty create/update/import input", () => {
    assert.throws(() => assertCreateBody({}), /Monitor name is required/);
    assert.throws(() => assertUpdateBody({}), /at least one field/);
    assert.throws(() => buildMonitorImportBody({}), /Provide vehicles/);
  });
});
