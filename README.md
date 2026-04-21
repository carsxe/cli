# CarsXE CLI

Command-line interface for the [CarsXE API](https://api.carsxe.com). Query vehicle specs, market value, history, recalls, license plates, OBD codes, and more — directly from your terminal or AI agent.

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

This opens your browser to [api.carsxe.com](https://api.carsxe.com), authenticates you, and saves your key to `~/.carsxe/config.json`. It is used automatically for every command from that point on.

### Option 2 — Set the key manually

Paste your API key from [api.carsxe.com/dashboard/developer](https://api.carsxe.com/dashboard/developer):

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

Opens [api.carsxe.com/cli-auth](https://api.carsxe.com/cli-auth) in your browser. Sign in with your CarsXE account, the tab closes itself, and your API key is saved to `~/.carsxe/config.json` — no copy-pasting needed.

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

MIT — [CarsXE](https://api.carsxe.com)
