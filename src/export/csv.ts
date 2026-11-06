const RISKY_START = /^[=+\-@\t\r]/;

/** Makes one cell safe for CSV and for Excel (blocks formula injection). */
export function safeCell(value: string | number): string {
  // Numbers are written as-is, so negatives like -5 are not touched.
  if (typeof value === "number") return value.toFixed(2);

  let s = value;
  if (RISKY_START.test(s)) s = "'" + s; // stops Excel running it as a formula

  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(
  columns: { header: string; key: string }[],
  rows: Record<string, string | number>[],
): string {
  const head = columns.map((c) => safeCell(c.header)).join(",");
  const body = rows.map((r) =>
    columns.map((c) => safeCell(r[c.key] ?? "")).join(","),
  );
  return [head, ...body].join("\n");
}