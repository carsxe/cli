# CarsXE CLI

Command-line interface for the [CarsXE API](https://carsxe.com). Query vehicle specs, market value, history, recalls (VIN, YMM, or batch), YMM options, ownership, license plates, OBD codes, and more — directly from your terminal or AI agent.

## Requirements

- Node.js 22 or higher — [nodejs.org](https://nodejs.org)

## Installation

```bash
npm install -g @carsxe/cli
```

This works the same on Linux, macOS, and Windows (including WSL).

---

## Setup

### Option 1 — Browser login (recommended)

Run once and your API key is saved automatically:

```bash
carsxe login
```

This opens your browser to [carsxe.com](https://carsxe.com), authenticates you, and saves your key to `~/.carsxe/config.json`. It is used automatically for every command from that point on.

### Option 2 — Set the key manually

Paste your API key from [carsxe.com/dashboard/developer](https://carsxe.com/dashboard/developer):

```bash
carsxe config set-key YOUR_API_KEY
```

### Option 3 — Environment variable

Set `CARSXE_API_KEY` before running any command. This takes precedence over the saved config file.

**Linux / macOS**

```bash
export CARSXE_API_KEY=YOUR_API_KEY
```

**Windows (PowerShell — permanent)**

```powershell
[System.Environment]::SetEnvironmentVariable("CARSXE_API_KEY", "YOUR_API_KEY", "User")
```

### Priority order

`CARSXE_API_KEY` env var takes precedence over `~/.carsxe/config.json`.

---

## Global Options

These options apply to every command:

| Option          | Description                                 |
| --------------- | ------------------------------------------- |
| `--table`       | Output as a formatted table instead of JSON |
| `--raw`         | Output compact single-line JSON             |
| `-v, --version` | Print version number                        |
| `-h, --help`    | Display help                                |

> **Tip:** Run `carsxe <command> --help` to see all options for any command.

---

## Commands

### `login` — Browser Login

Authorize via browser and save your API key automatically.

```bash
carsxe login
```

Opens [carsxe.com/cli-auth](https://carsxe.com/cli-auth) in your browser. Sign in with your CarsXE account, the tab closes itself, and your API key is saved to `~/.carsxe/config.json` — no copy-pasting needed.

Works on Windows, macOS, Linux, and WSL.

---

### `config` — Configuration

Manage your saved API key.

```bash
carsxe config set-key <api-key>   # Save API key
carsxe config get-key             # Show active key and its source
carsxe config remove-key          # Remove saved key
```

**Examples:**

```bash
carsxe config set-key abc123xyz
# API key saved to ~/.carsxe/config.json   (Linux/macOS)
# API key saved to C:\Users\You\.carsxe\config.json   (Windows)
# Key: abc1...3xyz

carsxe config get-key
# Source : ~/.carsxe/config.json
# Key    : abc1...3xyz

carsxe config remove-key
# API key removed.
```

---

### `specs` — Vehicle Specifications

Decode a VIN and get full vehicle specifications (make, model, year, engine, trim, equipment, and more).

```bash
carsxe specs --vin <vin> [--deep-data] [--disable-int-vin]
```

| Option              | Required | Description                                     |
| ------------------- | -------- | ----------------------------------------------- |
| `--vin <vin>`       | Yes      | Vehicle Identification Number                   |
| `--deep-data`       | No       | Enable deep data (additional equipment details) |
| `--disable-int-vin` | No       | Disable international VIN decoding fallback     |

**Example:**

```bash
carsxe specs --vin 1HGBH41JXMN109186
```

---

### `market-value` — Market Value

Get the current estimated market value of a vehicle.

```bash
carsxe market-value --vin <vin> [--mileage <mileage>] [--state <state>] [--condition <condition>] [--country <country>]
```

| Option                    | Required | Description                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------- |
| `--vin <vin>`             | Yes      | Vehicle Identification Number                                     |
| `--mileage <mileage>`     | No       | Current odometer reading in miles                                 |
| `--state <state>`         | No       | Two-letter US state code for regional pricing (e.g. `CA`, `TX`)   |
| `--condition <condition>` | No       | Vehicle condition: `excellent` \| `clean` \| `average` \| `rough` |
| `--country <country>`     | No       | Country code for pricing (default: `US`)                          |

**Example:**

```bash
carsxe market-value --vin 1HGBH41JXMN109186 --mileage 45000 --state CA --condition clean
```

---

### `history` — Vehicle History

Get a full vehicle history report including past owners, accidents, title status, and odometer readings.

```bash
carsxe history --vin <vin>
```

| Option        | Required | Description                   |
| ------------- | -------- | ----------------------------- |
| `--vin <vin>` | Yes      | Vehicle Identification Number |

**Example:**

```bash
carsxe history --vin 1HGBH41JXMN109186
```

---

### `recalls` — Safety Recalls

Check for open safety recalls on a vehicle.

```bash
carsxe recalls --vin <vin>
```

| Option        | Required | Description                   |
| ------------- | -------- | ----------------------------- |
| `--vin <vin>` | Yes      | Vehicle Identification Number |

**Example:**

```bash
carsxe recalls --vin 1HGBH41JXMN109186
```

---

### `recalls-ymm` — Recalls by Year / Make / Model

Check safety recalls when you don't have a VIN — search by year, make, and model instead.

```bash
carsxe recalls-ymm --year <year> --make <make> --model <model>
```

| Option            | Required | Description                  |
| ----------------- | -------- | ---------------------------- |
| `--year <year>`   | Yes      | Model year (e.g. `2023`)     |
| `--make <make>`   | Yes      | Vehicle make (e.g. `Toyota`) |
| `--model <model>` | Yes      | Vehicle model (e.g. `Camry`) |

**Example:**

```bash
carsxe recalls-ymm --year 2023 --make Toyota --model Camry
```

---

### `recalls-batch` — Bulk Recalls

Submit up to 10,000 VINs for asynchronous recall checking, then poll status and retrieve results.

```bash
carsxe recalls-batch submit [--vin <vin>]... [--csv <csv>] [--csv-url <url>] [--webhook-url <url>]
carsxe recalls-batch status --batch-id <id>
carsxe recalls-batch results --batch-id <id>
carsxe recalls-batch download --batch-id <id>
```

Provide at least one of `--vin`, `--csv`, or `--csv-url` on submit. `--vin` may be repeated.

| Command / Option          | Required | Description                                              |
| ------------------------- | -------- | -------------------------------------------------------- |
| `submit --vin <vin>`      | *        | VIN to include (repeatable)                              |
| `submit --csv <csv>`      | *        | Inline CSV of VINs (one per line or a `vin` column)      |
| `submit --csv-url <url>`  | *        | HTTPS URL to a CSV file of VINs                          |
| `submit --webhook-url`    | No       | HTTPS webhook URL when the batch finishes                |
| `status --batch-id <id>`  | Yes      | Batch ID returned by submit                              |
| `results --batch-id <id>` | Yes      | Fetch completed results as JSON                          |
| `download --batch-id <id>`| Yes      | Download completed results as CSV (printed to stdout)    |

\* At least one VIN input is required on `submit`.

**Example:**

```bash
carsxe recalls-batch submit --vin 1HGBH41JXMN109186 --vin 5YJSA1E26HF000001
# { "success": true, "data": { "batchId": "brb_...", "status": "uploading", ... } }

carsxe recalls-batch status --batch-id brb_mnablbn7_wvbaqv
carsxe recalls-batch results --batch-id brb_mnablbn7_wvbaqv
carsxe recalls-batch download --batch-id brb_mnablbn7_wvbaqv > recalls.csv
```

---

### `lien-theft` — Lien & Theft Check

Check whether a vehicle has active liens or has been reported stolen.

```bash
carsxe lien-theft --vin <vin>
```

| Option        | Required | Description                   |
| ------------- | -------- | ----------------------------- |
| `--vin <vin>` | Yes      | Vehicle Identification Number |

**Example:**

```bash
carsxe lien-theft --vin 1HGBH41JXMN109186
```

---

### `international-vin` — International VIN Decoder

Decode a VIN from a non-US vehicle (European, Asian, and other markets).

```bash
carsxe international-vin --vin <vin>
```

| Option        | Required | Description                   |
| ------------- | -------- | ----------------------------- |
| `--vin <vin>` | Yes      | Vehicle Identification Number |

**Example:**

```bash
carsxe international-vin --vin WBAFR7C57CC811956
```

---

### `plate-decoder` — License Plate Decoder

Look up vehicle information from a license plate number.

```bash
carsxe plate-decoder --plate <plate> --country <country> [--state <state>] [--district <district>]
```

| Option                  | Required | Description                                    |
| ----------------------- | -------- | ---------------------------------------------- |
| `--plate <plate>`       | Yes      | License plate number                           |
| `--country <country>`   | Yes      | Country code (e.g. `US`, `GB`, `DE`, `CA`)     |
| `--state <state>`       | No       | State or province code (e.g. `CA`, `TX`, `ON`) |
| `--district <district>` | No       | District or region                             |

**Example:**

```bash
carsxe plate-decoder --plate ABC1234 --country US --state CA
```

---

### `plate-image` — Plate Image Recognition

Extract and decode a license plate from an image URL.

```bash
carsxe plate-image --image <url>
```

| Option          | Required | Description                          |
| --------------- | -------- | ------------------------------------ |
| `--image <url>` | Yes      | Publicly accessible URL of the image |

**Example:**

```bash
carsxe plate-image --image https://example.com/car-photo.jpg
```

---

### `vin-ocr` — VIN OCR from Image

Extract a VIN from a photo of a VIN plate or dashboard sticker.

```bash
carsxe vin-ocr --image <url>
```

| Option          | Required | Description                          |
| --------------- | -------- | ------------------------------------ |
| `--image <url>` | Yes      | Publicly accessible URL of the image |

**Example:**

```bash
carsxe vin-ocr --image https://example.com/vin-sticker.jpg
```

---

### `ymm` — Year / Make / Model

Look up vehicle data when you don't have a VIN — search by year, make, and model instead.

```bash
carsxe ymm --year <year> --make <make> --model <model> [--trim <trim>]
```

| Option            | Required | Description                   |
| ----------------- | -------- | ----------------------------- |
| `--year <year>`   | Yes      | Model year (e.g. `2020`)      |
| `--make <make>`   | Yes      | Vehicle make (e.g. `Toyota`)  |
| `--model <model>` | Yes      | Vehicle model (e.g. `Camry`)  |
| `--trim <trim>`   | No       | Trim level (e.g. `LE`, `XSE`) |

**Example:**

```bash
carsxe ymm --year 2020 --make Toyota --model Camry --trim LE
```

---

### `ymm-options` — Year / Make / Model Options

Populate cascading year → make → model → trim/variant dropdowns. All filters are optional; omit `dimension` to infer the list from the filters you pass.

```bash
carsxe ymm-options [--dimension <dimension>] [--year <year>] [--make <make>] [--model <model>] [--trim <trim>]
```

| Option                    | Required | Description                                              |
| ------------------------- | -------- | -------------------------------------------------------- |
| `--dimension <dimension>` | No       | `years` \| `makes` \| `models` \| `trims` \| `variants` |
| `--year <year>`           | No       | Filter by model year                                     |
| `--make <make>`           | No       | Filter by make (required for `models`)                   |
| `--model <model>`         | No       | Filter by model (required for `trims`)                   |
| `--trim <trim>`           | No       | Substring filter on trim or variant names                |

**Examples:**

```bash
carsxe ymm-options
carsxe ymm-options --year 2023
carsxe ymm-options --dimension models --year 2023 --make Toyota
carsxe ymm-options --dimension variants --year 2025 --make Lexus
```

---

### `ownership` — Owner & Resident Lookup (Enterprise)

Look up registered owners and residents. Available on Enterprise plans only. All four lookups share the same API key entitlement.

```bash
carsxe ownership vin --vin <vin> [--include <include>]
carsxe ownership person --first-name <name> --last-name <name> --address <address> --zip <zip> [--include <include>]
carsxe ownership address --address <address> --zip <zip> [--include <include>] [--variant <variant>]
carsxe ownership zip --zip <zip> [--gender <gender>] [--min-age <age>] [--max-age <age>] [--income <income>] [--page <page>] [--limit <limit>] [--include <include>] [--variant <variant>]
```

`--include` is a comma-separated subset of `demographics,emails,phones,vehicle_history`. Omit it to get everything.

#### `ownership vin`

| Option                | Required | Description                   |
| --------------------- | -------- | ----------------------------- |
| `--vin <vin>`         | Yes      | Vehicle Identification Number |
| `--include <include>` | No       | Response sections to include  |

#### `ownership person`

| Option                  | Required | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `--first-name <name>`   | Yes      | First name (max 50 characters)                   |
| `--last-name <name>`    | Yes      | Last name (max 50 characters)                    |
| `--address <address>`   | Yes      | Street address only, no city/state               |
| `--zip <zip>`           | Yes      | 5-digit US ZIP, optionally ZIP+4                 |
| `--include <include>`   | No       | Response sections to include                     |

#### `ownership address`

| Option                  | Required | Description                                              |
| ----------------------- | -------- | -------------------------------------------------------- |
| `--address <address>`   | Yes      | Street address only, no city/state                       |
| `--zip <zip>`           | Yes      | 5-digit US ZIP, optionally ZIP+4                         |
| `--include <include>`   | No       | Response sections to include                             |
| `--variant <variant>`   | No       | Legacy alias (`vehicle_history` or `compliance`)         |

#### `ownership zip`

| Option                  | Required | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `--zip <zip>`           | Yes      | Exactly 5-digit US ZIP                           |
| `--gender <gender>`     | No       | `M` or `F`                                       |
| `--min-age <age>`       | No       | Minimum age (whole number)                       |
| `--max-age <age>`       | No       | Maximum age (whole number)                       |
| `--income <income>`     | No       | Income code or label (e.g. `F`, `K`)             |
| `--page <page>`         | No       | Page number (default `1`)                        |
| `--limit <limit>`       | No       | Page size (default `15`, max `100`)              |
| `--include <include>`   | No       | Response sections to include                     |
| `--variant <variant>`   | No       | Legacy alias (`vehicle_history`)                 |

**Examples:**

```bash
carsxe ownership vin --vin 1FT8X3BT0BEA61538 --include demographics
carsxe ownership person --first-name John --last-name Sample --address "123 Example St" --zip 90210
carsxe ownership address --address "123 Example St" --zip 90210
carsxe ownership zip --zip 90210 --gender F --min-age 45 --page 1 --limit 15
```

---

### `images` — Vehicle Images

Retrieve photos of a vehicle by make, model, and year.

```bash
carsxe images --make <make> --model <model> [options]
```

| Option                | Required | Description                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `--make <make>`       | Yes      | Vehicle make (e.g. `Toyota`)                                       |
| `--model <model>`     | Yes      | Vehicle model (e.g. `Camry`)                                       |
| `--year <year>`       | No       | Model year                                                         |
| `--trim <trim>`       | No       | Trim level                                                         |
| `--color <color>`     | No       | Vehicle color                                                      |
| `--angle <angle>`     | No       | Photo angle: `front` \| `side` \| `back`                           |
| `--photo-type <type>` | No       | Photo type: `interior` \| `exterior` \| `engine`                   |
| `--size <size>`       | No       | Image size: `Small` \| `Medium` \| `Large` \| `Wallpaper` \| `All` |

**Example:**

```bash
carsxe images --make Toyota --model Camry --year 2020 --angle front --size Large
```

---

### `obd` — OBD-II Code Decoder

Decode a diagnostic trouble code (DTC) from your OBD-II scanner.

```bash
carsxe obd --code <code>
```

| Option          | Required | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| `--code <code>` | Yes      | OBD-II code (e.g. `P0300`, `C1234`, `B0001`, `U0100`) |

**Example:**

```bash
carsxe obd --code P0300
```

---

## Output

By default all commands output pretty-printed JSON.

**Table view** — use `--table` for a human-friendly two-column layout:

```bash
carsxe --table obd --code P0300
```

```
┌──────────────────────┬────────────────────────────────────────┐
│ Field                │ Value                                  │
├──────────────────────┼────────────────────────────────────────┤
│ success              │ true                                   │
│ code                 │ P0300                                  │
│ definition           │ Random/Multiple Cylinder Misfire ...   │
│ ...                  │ ...                                    │
└──────────────────────┴────────────────────────────────────────┘
```

Nested objects are flattened with dot notation (e.g. `engine.cylinders`). Arrays of primitives are joined on one line.

**Raw JSON** — use `--raw` for compact single-line JSON, useful for piping to `jq` or scripts:

**Linux / macOS**

```bash
carsxe --raw specs --vin 1HGBH41JXMN109186 | jq '.make'
```

**Windows (PowerShell)**

```powershell
carsxe --raw specs --vin 1HGBH41JXMN109186 | ConvertFrom-Json | Select-Object -ExpandProperty make
```

---

## Exit Codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Success                                   |
| `1`  | API error, HTTP error, or missing API key |

---

## License

MIT — [CarsXE](https://carsxe.com)
