import { readSheet } from 'read-excel-file/browser';
import { rowsToCsv } from './csvFromRows';
import type { SpreadsheetCell } from './csvFromRows';

export const IMPORT_FILE_ACCEPT = '.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const isXlsxFile = (file: File) => file.name.toLowerCase().endsWith('.xlsx');

// Reads an uploaded .csv or .xlsx into CSV text. For .xlsx only the FIRST
// sheet is read (the templates are single-sheet); legacy .xls is not supported
// and is rejected with a clear message instead of failing obscurely.
export async function importFileToCsvText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xls')) {
    throw new Error('Legacy .xls files are not supported - save the sheet as .xlsx or .csv and upload that.');
  }
  if (!isXlsxFile(file)) {
    return file.text();
  }
  try {
    const rows = await readSheet(file);
    return rowsToCsv(rows as SpreadsheetCell[][]);
  } catch {
    throw new Error('That .xlsx file could not be read. Check it is a valid Excel workbook, or save it as .csv.');
  }
}
