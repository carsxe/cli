#!/usr/bin/env node
import * as fs from "fs";
import { Command, Option } from "commander";
import { browserLogin } from "./browser-auth";
import { version } from "../package.json";
import { api } from "./api";
import {
  configFilePath,
  getSavedKey,
  maskKey,
  removeSavedKey,
  setSavedKey,
} from "./config";
import {
  assertCreateBody,
  assertUpdateBody,
  buildMonitorImportBody,
  buildMonitorWriteBody,
} from "./monitor-input";
import { renderTable } from "./table";

const MONITOR_DOCS = "https://docs.carsxe.com/docs/products/monitors";

const program = new Command();
// ── Helpers ────────────────────────────────────────────────────────────────

function resolveKey(): string {
  // Priority: CARSXE_API_KEY env var > ~/.carsxe/config.json
  const key = process.env.CARSXE_API_KEY ?? getSavedKey();
  if (!key) {
    console.error(
      "Error: No API key found.\n" +
        "  Run:  carsxe config set-key <your-api-key>\n" +
        "  Or:   export CARSXE_API_KEY=<your-api-key>",
    );
    process.exit(1);
  }
  return key;
}

function output(data: unknown, raw: boolean, table: boolean): void {
  if (table) {
    console.log(renderTable(data));
  } else {
    console.log(raw ? JSON.stringify(data) : JSON.stringify(data, null, 2));
  }
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function outputOpts(cmd: Command): { raw: boolean; table: boolean } {
  let raw = false;
  let table = false;
  let current: Command | null = cmd;
  while (current) {
    const opts = current.opts() as { raw?: boolean; table?: boolean };
    if (opts.raw) raw = true;
    if (opts.table) table = true;
    current = current.parent;
  }
  return { raw, table };
}

function addOutputOptions(cmd: Command): Command {
  return cmd
    .addOption(
      new Option("--raw", "Output compact single-line JSON").hideHelp(),
    )
    .addOption(
      new Option(
        "--table",
        "Output as a formatted table instead of JSON",
      ).hideHelp(),
    );
}

async function run(
  fn: (key: string) => Promise<unknown>,
  raw: boolean,
  table: boolean,
): Promise<void> {
  try {
    const result = await fn(resolveKey());
    output(result, raw, table);
    const r = result as { success?: boolean };
    if (r?.success === false) process.exit(1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

// ── Global options ─────────────────────────────────────────────────────────

/**
 * Opens a URL in the user's default browser.
 *
 * WSL (Windows Subsystem for Linux) has no GUI/display server, so
 * xdg-open (used by the 'open' package) fails silently. Instead, we
 * call cmd.exe /c start directly, which invokes the Windows browser.
 */
async function openBrowser(url: string): Promise<void> {
  const isWsl =
    process.platform === "linux" &&
    (process.env.WSL_DISTRO_NAME !== undefined ||
      process.env.WSLENV !== undefined ||
      (fs.existsSync("/proc/version") &&
        fs
          .readFileSync("/proc/version", "utf8")
          .toLowerCase()
          .includes("microsoft")));

  if (isWsl) {
    const { default: cp } = await import("child_process");
    const escaped = url.replace(/&/g, "^&");
    cp.spawn("cmd.exe", ["/c", "start", "", escaped], { stdio: "ignore" });
    return;
  }

  const { default: open } = await import("open");
  await open(url);
}

program
  .name("carsxe")
  .description("CarsXE API command-line interface")
  .addHelpText(
    "after",
    "\nRun `carsxe <command> --help` to see all options for a command.\nExample: carsxe images --help",
  )
  .addOption(
    new Option("--raw", "Output compact single-line JSON").default(false),
  )
  .addOption(
    new Option(
      "--table",
      "Output as a formatted table instead of JSON",
    ).default(false),
  )
  .version(version, "-v, --version");

// ── login ──────────────────────────────────────────────────────────────────

program
  .command("login")
  .description("Authorize via browser and save your API key automatically")
  .action(async () => {
    try {
      const { apiKey, teamName } = await browserLogin({
        onOpen: async (url) => {
          await openBrowser(url);
          console.log(`Authorize here: ${url}`);
          console.log("Waiting for browser confirmation...");
        },
      });

      setSavedKey(apiKey);
      console.log(`✓ Authorized as ${teamName}`);
      console.log(`API key saved to ${configFilePath()}`);
      process.exit(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

// ── config ─────────────────────────────────────────────────────────────────

const config = program
  .command("config")
  .description("Manage your CarsXE API key");

config
  .command("set-key <api-key>")
  .description("Save your API key to ~/.carsxe/config.json")
  .action((apiKey: string) => {
    setSavedKey(apiKey);
    console.log(`API key saved to ${configFilePath()}`);
    console.log(`Key: ${maskKey(apiKey)}`);
  });

config
  .command("get-key")
  .description("Show the active API key and where it comes from")
  .action(() => {
    const fromEnv = process.env.CARSXE_API_KEY;
    const fromFile = getSavedKey();

    if (fromEnv) {
      console.log(`Source : CARSXE_API_KEY environment variable`);
      console.log(`Key    : ${maskKey(fromEnv)}`);
    } else if (fromFile) {
      console.log(`Source : ${configFilePath()}`);
      console.log(`Key    : ${maskKey(fromFile)}`);
    } else {
      console.log("No API key configured.");
      console.log("Run: carsxe config set-key <your-api-key>");
    }
  });

config
  .command("remove-key")
  .description("Remove the saved API key from ~/.carsxe/config.json")
  .action(() => {
    removeSavedKey();
    console.log("API key removed.");
  });

// ── specs ──────────────────────────────────────────────────────────────────

program
  .command("specs")
  .description("Get full vehicle specifications from a VIN")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .option("--deep-data", "Enable deep data (additional equipment details)")
  .option("--disable-int-vin", "Disable international VIN decoding fallback")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run(
      (k) =>
        api.specs(
          k,
          opts.vin,
          opts.deepData ? "true" : undefined,
          opts.disableIntVin ? "true" : undefined,
        ),
      raw,
      table,
    );
  });

// ── market-value ───────────────────────────────────────────────────────────

program
  .command("market-value")
  .description("Get current market value of a vehicle from a VIN")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .option("--mileage <mileage>", "Current odometer reading in miles")
  .option(
    "--state <state>",
    "Two-letter US state code for regional pricing (e.g. CA, TX)",
  )
  .option(
    "--condition <condition>",
    "Vehicle condition: excellent | clean | average | rough",
  )
  .option("--country <country>", "Country code for pricing (default: US)")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run(
      (k) =>
        api.marketValue(
          k,
          opts.vin,
          opts.mileage,
          opts.state,
          opts.condition,
          opts.country,
        ),
      raw,
      table,
    );
  });

// ── history ────────────────────────────────────────────────────────────────

program
  .command("history")
  .description(
    "Get vehicle history report (owners, accidents, title) from a VIN",
  )
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.history(k, opts.vin), raw, table);
  });

// ── recalls ────────────────────────────────────────────────────────────────

program
  .command("recalls")
  .description("Get open safety recalls for a vehicle from a VIN")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.recalls(k, opts.vin), raw, table);
  });

// ── international-vin ──────────────────────────────────────────────────────

program
  .command("international-vin")
  .description("Decode an international (non-US) VIN")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.internationalVin(k, opts.vin), raw, table);
  });

// ── plate-decoder ──────────────────────────────────────────────────────────

program
  .command("plate-decoder")
  .description("Decode a license plate to get vehicle information")
  .requiredOption("--plate <plate>", "License plate number")
  .requiredOption("--country <country>", "Country code (e.g. US, GB, DE)")
  .option("--state <state>", "State or province code (e.g. CA, TX)")
  .option("--district <district>", "District or region")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run(
      (k) =>
        api.plateDecoder(
          k,
          opts.plate,
          opts.country,
          opts.state,
          opts.district,
        ),
      raw,
      table,
    );
  });

// ── lien-theft ─────────────────────────────────────────────────────────────

program
  .command("lien-theft")
  .description("Check for active liens and theft records on a vehicle")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.lienTheft(k, opts.vin), raw, table);
  });

// ── plate-image ────────────────────────────────────────────────────────────

program
  .command("plate-image")
  .description("Recognize and decode a license plate from an image URL")
  .requiredOption(
    "--image <url>",
    "URL of the image containing the license plate",
  )
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.plateImage(k, opts.image), raw, table);
  });

// ── vin-ocr ────────────────────────────────────────────────────────────────

program
  .command("vin-ocr")
  .description("Extract a VIN from an image URL using OCR")
  .requiredOption("--image <url>", "URL of the image containing the VIN")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.vinOcr(k, opts.image), raw, table);
  });

// ── ymm ────────────────────────────────────────────────────────────────────

program
  .command("ymm")
  .description("Look up vehicle data by year, make, and model")
  .requiredOption("--year <year>", "Vehicle year (e.g. 2020)")
  .requiredOption("--make <make>", "Vehicle make (e.g. Toyota)")
  .requiredOption("--model <model>", "Vehicle model (e.g. Camry)")
  .option("--trim <trim>", "Vehicle trim level")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run(
      (k) => api.ymm(k, opts.year, opts.make, opts.model, opts.trim),
      raw,
      table,
    );
  });

// ── images ─────────────────────────────────────────────────────────────────

program
  .command("images")
  .description("Retrieve images of a vehicle by make, model, and year")
  .requiredOption("--make <make>", "Vehicle make (e.g. Toyota)")
  .requiredOption("--model <model>", "Vehicle model (e.g. Camry)")
  .option("--year <year>", "Vehicle year")
  .option("--trim <trim>", "Vehicle trim level")
  .option("--color <color>", "Vehicle color")
  .option("--angle <angle>", "Photo angle: front | side | back")
  .option("--photo-type <type>", "Photo type: interior | exterior | engine")
  .option(
    "--size <size>",
    "Image size: Small | Medium | Large | Wallpaper | All",
  )
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run(
      (k) =>
        api.images(
          k,
          opts.make,
          opts.model,
          opts.year,
          opts.trim,
          opts.color,
          opts.angle,
          opts.photoType,
          opts.size,
        ),
      raw,
      table,
    );
  });

// ── obd ────────────────────────────────────────────────────────────────────

program
  .command("obd")
  .description("Decode an OBD-II diagnostic trouble code (DTC)")
  .requiredOption("--code <code>", "OBD-II code (e.g. P0300, C1234)")
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.obd(k, opts.code), raw, table);
  });

// ── monitors ───────────────────────────────────────────────────────────────

const monitors = program
  .command("monitors")
  .description("Manage Monitoring watchlists")
  .addHelpText(
    "after",
    "\nDocs: " +
      MONITOR_DOCS +
      "\nAlso: https://docs.carsxe.com/docs/guides/agents\n",
  );

addOutputOptions(
  monitors
    .command("list")
    .description("List Monitoring watchlists for this API key")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (_opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => api.listMonitors(k), raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("get <id>")
    .description("Get a Monitoring watchlist by id")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (id: string, _opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => api.getMonitor(k, id), raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("create")
    .description("Create a Monitoring watchlist")
    .option("--name <name>", "Watchlist name")
    .option("--vehicle-type <type>", "Vehicle identifier type: vin | plate")
    .option("--vehicle <id>", "Vehicle identifier (repeatable)", collect, [])
    .option("--vehicles <ids>", "Comma-separated vehicle identifiers")
    .option("--product <name>", "Product to monitor (repeatable)", collect, [])
    .option("--products <names>", "Comma-separated products (e.g. recalls)")
    .option(
      "--frequency <frequency>",
      "Schedule frequency: daily | weekly | monthly",
    )
    .option(
      "--delivery <channel>",
      "Delivery channel (repeatable, e.g. email)",
      collect,
      [],
    )
    .option("--status <status>", "Watchlist status: active | paused")
    .option("--json <json>", "JSON body, file path, or '-' for stdin")
    .addHelpText(
      "after",
      `\nDocs: ${MONITOR_DOCS}\n\nExample:\n` +
        "  carsxe monitors create --name Fleet --vehicle-type vin" +
        " --vehicle 1C4JJXR64PW696340 --product recalls" +
        " --frequency daily --delivery email\n",
    )
    .action(async (opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => {
        const body = buildMonitorWriteBody(opts);
        assertCreateBody(body);
        return api.createMonitor(k, body);
      }, raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("update <id>")
    .description("Update a Monitoring watchlist (including pause/resume)")
    .option("--name <name>", "Watchlist name")
    .option("--vehicle-type <type>", "Vehicle identifier type: vin | plate")
    .option(
      "--vehicle <id>",
      "Replace vehicle identifiers (repeatable)",
      collect,
      [],
    )
    .option("--vehicles <ids>", "Replace vehicles (comma-separated)")
    .option("--product <name>", "Replace products (repeatable)", collect, [])
    .option("--products <names>", "Replace products (comma-separated)")
    .option(
      "--frequency <frequency>",
      "Schedule frequency: daily | weekly | monthly",
    )
    .option(
      "--delivery <channel>",
      "Replace delivery channels (repeatable)",
      collect,
      [],
    )
    .option("--status <status>", "Watchlist status: active | paused")
    .option("--pause", "Pause the watchlist (status=paused)")
    .option("--resume", "Resume the watchlist (status=active)")
    .option("--json <json>", "JSON body, file path, or '-' for stdin")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (id: string, opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => {
        const body = buildMonitorWriteBody(opts);
        assertUpdateBody(body);
        return api.updateMonitor(k, id, body);
      }, raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("delete <id>")
    .description("Delete a Monitoring watchlist")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (id: string, _opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => api.deleteMonitor(k, id), raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("import <id>")
    .description("Import vehicles into a Monitoring watchlist")
    .option("--vehicle <id>", "Vehicle identifier (repeatable)", collect, [])
    .option("--vehicles <ids>", "Comma-separated vehicle identifiers")
    .option("--file <path>", "CSV or newline-separated vehicle list")
    .option("--json <json>", "JSON body, file path, or '-' for stdin")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (id: string, opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => {
        const body = buildMonitorImportBody(opts);
        return api.importMonitorVehicles(k, id, body);
      }, raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("run <id>")
    .description("Run a Monitoring watchlist immediately")
    .addHelpText(
      "after",
      `\nDocs: ${MONITOR_DOCS}\n\nExample:\n  carsxe monitors run <id>\n`,
    )
    .action(async (id: string, _opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => api.runMonitor(k, id), raw, table);
    }),
);

addOutputOptions(
  monitors
    .command("alerts [id]")
    .description("List recent Monitoring alerts (account-wide or one watchlist)")
    .addHelpText("after", `\nDocs: ${MONITOR_DOCS}\n`)
    .action(async (id: string | undefined, _opts, cmd) => {
      const { raw, table } = outputOpts(cmd);
      await run((k) => api.listMonitorAlerts(k, id), raw, table);
    }),
);

export { program };

function isEntrypoint(): boolean {
  const entry = process.argv[1] ?? "";
  return /(?:^|[\\/])cli\.(ts|js)$/.test(entry);
}

if (isEntrypoint()) {
  program.parseAsync().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
