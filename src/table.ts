import Table from 'cli-table3';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function flatten(value: JsonValue, prefix = ''): Array<[string, string]> {
  if (value === null || value === undefined) {
    return [[prefix, '']];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [[prefix, '(none)']];
    // Array of primitives — join on one line
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return [[prefix, value.map(String).join(', ')]];
    }
    // Array of objects — flatten each item with an index
    return value.flatMap((item, i) => flatten(item as JsonValue, `${prefix}[${i}]`));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      flatten(v as JsonValue, prefix ? `${prefix}.${k}` : k),
    );
  }

  return [[prefix, String(value)]];
}

export function renderTable(data: unknown): string {
  const table = new Table({
    head: ['Field', 'Value'],
    style: { head: ['cyan'] },
    wordWrap: true,
    colWidths: [36, 60],
  });

  const rows = flatten(data as JsonValue);
  for (const [key, val] of rows) {
    table.push([key, val]);
  }

  return table.toString();
}
