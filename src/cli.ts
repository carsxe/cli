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
import { renderTable } from "./table";

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

function formatOpts(cmd: Command): { raw: boolean; table: boolean } {
  const opts = cmd.optsWithGlobals() as { raw?: boolean; table?: boolean };
  return { raw: Boolean(opts.raw), table: Boolean(opts.table) };
}

function collectVin(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

async function runText(fn: (key: string) => Promise<string>): Promise<void> {
  try {
    const result = await fn(resolveKey());
    process.stdout.write(result);
    if (!result.endsWith("\n")) process.stdout.write("\n");
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

// ── recalls-ymm ────────────────────────────────────────────────────────────

program
  .command("recalls-ymm")
  .description("Get safety recalls by year, make, and model (no VIN required)")
  .requiredOption("--year <year>", "Vehicle year (e.g. 2023)")
  .requiredOption("--make <make>", "Vehicle make (e.g. Toyota)")
  .requiredOption("--model <model>", "Vehicle model (e.g. Camry)")
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) => api.recallsYmm(k, opts.year, opts.make, opts.model),
      raw,
      table,
    );
  });

// ── recalls-batch ──────────────────────────────────────────────────────────

const recallsBatch = program
  .command("recalls-batch")
  .description("Submit and retrieve bulk recall checks (up to 10,000 VINs)");

recallsBatch
  .command("submit")
  .description("Submit a bulk recalls batch (vins, csv, and/or csv-url)")
  .option(
    "--vin <vin>",
    "VIN to include (repeatable)",
    collectVin,
    [] as string[],
  )
  .option("--csv <csv>", "Inline CSV of VINs (one per line or a vin column)")
  .option("--csv-url <url>", "HTTPS URL to a CSV file of VINs")
  .option("--webhook-url <url>", "HTTPS webhook URL when the batch finishes")
  .action(async (opts, cmd) => {
    const vins = (opts.vin as string[]).filter(Boolean);
    if (!vins.length && !opts.csv && !opts.csvUrl) {
      console.error(
        "Error: Provide at least one of --vin, --csv, or --csv-url",
      );
      process.exit(1);
    }
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) =>
        api.recallsBatchSubmit(k, {
          vins: vins.length ? vins : undefined,
          csv: opts.csv,
          csvUrl: opts.csvUrl,
          webhookUrl: opts.webhookUrl,
        }),
      raw,
      table,
    );
  });

recallsBatch
  .command("status")
  .description("Check the status of a bulk recalls batch")
  .requiredOption("--batch-id <id>", "Batch ID returned by submit")
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run((k) => api.recallsBatchStatus(k, opts.batchId), raw, table);
  });

recallsBatch
  .command("results")
  .description("Fetch completed bulk recalls results as JSON")
  .requiredOption("--batch-id <id>", "Batch ID returned by submit")
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run((k) => api.recallsBatchResults(k, opts.batchId), raw, table);
  });

recallsBatch
  .command("download")
  .description("Download completed bulk recalls results as CSV")
  .requiredOption("--batch-id <id>", "Batch ID returned by submit")
  .action(async (opts) => {
    await runText((k) => api.recallsBatchDownload(k, opts.batchId));
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

// ── ymm-options ────────────────────────────────────────────────────────────

program
  .command("ymm-options")
  .description(
    "List year / make / model / trim / variant options for dropdowns",
  )
  .option(
    "--dimension <dimension>",
    "years | makes | models | trims | variants",
  )
  .option("--year <year>", "Filter by model year")
  .option("--make <make>", "Filter by make (required for models)")
  .option("--model <model>", "Filter by model (required for trims)")
  .option("--trim <trim>", "Substring filter on trim or variant names")
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) =>
        api.ymmOptions(
          k,
          opts.dimension,
          opts.year,
          opts.make,
          opts.model,
          opts.trim,
        ),
      raw,
      table,
    );
  });

// ── ownership (enterprise) ─────────────────────────────────────────────────

const INCLUDE_HELP =
  "Comma-separated subset of demographics,emails,phones,vehicle_history";

const ownership = program
  .command("ownership")
  .description(
    "Look up registered owners and residents (Enterprise plans only)",
  );

ownership
  .command("vin")
  .description("Look up registered owner(s) by VIN")
  .requiredOption("--vin <vin>", "Vehicle Identification Number")
  .option("--include <include>", INCLUDE_HELP)
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run((k) => api.ownershipVin(k, opts.vin, opts.include), raw, table);
  });

ownership
  .command("person")
  .description("Look up a person by name and address")
  .requiredOption("--first-name <name>", "First name (max 50 characters)")
  .requiredOption("--last-name <name>", "Last name (max 50 characters)")
  .requiredOption(
    "--address <address>",
    "Street address only, no city/state (max 100 characters)",
  )
  .requiredOption("--zip <zip>", "5-digit US ZIP, optionally ZIP+4")
  .option("--include <include>", INCLUDE_HELP)
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) =>
        api.ownershipPerson(
          k,
          opts.firstName,
          opts.lastName,
          opts.address,
          opts.zip,
          opts.include,
        ),
      raw,
      table,
    );
  });

ownership
  .command("address")
  .description("Look up residents at a street address")
  .requiredOption(
    "--address <address>",
    "Street address only, no city/state (max 100 characters)",
  )
  .requiredOption("--zip <zip>", "5-digit US ZIP, optionally ZIP+4")
  .option("--include <include>", INCLUDE_HELP)
  .option(
    "--variant <variant>",
    "Legacy alias (vehicle_history or compliance); prefer --include",
  )
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) =>
        api.ownershipAddress(
          k,
          opts.address,
          opts.zip,
          opts.include,
          opts.variant,
        ),
      raw,
      table,
    );
  });

ownership
  .command("zip")
  .description("Search people in a ZIP with optional filters")
  .requiredOption("--zip <zip>", "Exactly 5-digit US ZIP")
  .option("--gender <gender>", "M or F")
  .option("--min-age <age>", "Minimum age (whole number)")
  .option("--max-age <age>", "Maximum age (whole number)")
  .option(
    "--income <income>",
    "Income code or label (e.g. F, K, $50,000–$59,999)",
  )
  .option("--page <page>", "Page number (default 1)")
  .option("--limit <limit>", "Page size (default 15, max 100)")
  .option("--include <include>", INCLUDE_HELP)
  .option(
    "--variant <variant>",
    "Legacy alias (vehicle_history); prefer --include",
  )
  .action(async (opts, cmd) => {
    const { raw, table } = formatOpts(cmd);
    await run(
      (k) =>
        api.ownershipZip(
          k,
          opts.zip,
          opts.gender,
          opts.minAge,
          opts.maxAge,
          opts.income,
          opts.page,
          opts.limit,
          opts.include,
          opts.variant,
        ),
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

// ── Parse ──────────────────────────────────────────────────────────────────

program.parseAsync().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
