#!/usr/bin/env node
import { Command, Option } from "commander";
import { version } from "../package.json";
import { api } from "./api";
import { renderTable } from "./table";
import {
  getSavedKey,
  setSavedKey,
  removeSavedKey,
  maskKey,
  configFilePath,
} from "./config";

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

// ── Global options ─────────────────────────────────────────────────────────

program
  .name("carsxe")
  .description("CarsXE API command-line interface")
  .version(version)
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
  );

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
  .action(async (opts, cmd) => {
    const { raw, table } = cmd.parent.opts();
    await run((k) => api.marketValue(k, opts.vin), raw, table);
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

// ── Parse ──────────────────────────────────────────────────────────────────

program.parseAsync().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
