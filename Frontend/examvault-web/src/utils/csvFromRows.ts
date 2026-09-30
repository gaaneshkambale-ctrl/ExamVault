// Cell values as a spreadsheet reader hands them back (string / number /
// boolean / Date / empty). Kept independent of any spreadsheet library so the
// conversion below stays trivially testable.
export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

function cellToText(cell: SpreadsheetCell): string {
  if (cell === null || cell === undefined) return '';
  // Excel turns a typed True/False into a real boolean cell; the question
  // importers (and the server's True/False rule) expect the words "True"/"False".
  if (typeof cell === 'boolean') return cell ? 'True' : 'False';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell);
}

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Turns spreadsheet rows into RFC 4180 CSV text so an .xlsx upload can go
// through exactly the same parsers/validation as a .csv upload. Embedded
// newlines (e.g. multi-line Sql setup scripts) stay inside quoted fields.
export function rowsToCsv(rows: SpreadsheetCell[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsvField(cellToText(cell))).join(',')).join('\r\n');
}
