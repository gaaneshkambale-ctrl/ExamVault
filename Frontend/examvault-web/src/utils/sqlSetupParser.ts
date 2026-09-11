// Shared by every place a parsed SQL grid renders - the live exam's "Use the
// following table" setup grid and "Expected Output" box, and the admin Question
// Preview's equivalent sections - so an SQL question looks and parses identically
// everywhere instead of each screen reimplementing this.

export interface ParsedSqlTable {
  tableName: string;
  columns: string[];
  rows: string[][];
}

// Splits a comma-separated list at the TOP LEVEL only - commas inside a '...'
// string or nested (...) don't split. Used for both a CREATE TABLE column list
// and one VALUES tuple's contents.
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      current += ch;
      if (ch === "'" && text[i + 1] === "'") {
        current += text[++i];
      } else if (ch === "'") {
        inQuote = false;
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      current += ch;
    } else if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    parts.push(current);
  }
  return parts;
}

// Extracts each top-level "(...)" group from a VALUES clause like
// "(1, 'a'), (2, 'b')".
function matchValueTuples(text: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      current += ch;
      if (ch === "'" && text[i + 1] === "'") {
        current += text[++i];
      } else if (ch === "'") {
        inQuote = false;
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      if (depth > 0) current += ch;
    } else if (ch === '(') {
      depth++;
      if (depth > 1) current += ch;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        tuples.push(current);
        current = '';
      } else {
        current += ch;
      }
    } else if (depth > 0) {
      current += ch;
    }
  }
  return tuples;
}

function cleanSqlLiteral(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

// Best-effort parse of an admin-authored Setup SQL script (one or more CREATE
// TABLE + INSERT INTO ... VALUES ... pairs, eg. a departments table joined to an
// employees table) into real data grids. Deliberately conservative: bails out to
// null (caller falls back to the raw SQL text) on anything it can't confidently
// parse - a column/value count mismatch, an INSERT for a table that was never
// CREATEd - rather than risk rendering a wrong or misleading grid from
// admin-written SQL it doesn't fully understand.
export function parseSqlSetup(setupSql: string): ParsedSqlTable[] | null {
  const createMatches = [...setupSql.matchAll(/CREATE\s+TABLE\s+(\w+)\s*\(([^;]*)\)\s*;/gis)];
  if (createMatches.length === 0) {
    return null;
  }

  const tables: ParsedSqlTable[] = [];
  const tableIndexByName = new Map<string, number>();
  for (const [, tableName, columnDefs] of createMatches) {
    const columns = splitTopLevel(columnDefs)
      .map((def) => def.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (columns.length === 0) {
      return null;
    }
    tableIndexByName.set(tableName.toLowerCase(), tables.length);
    tables.push({ tableName, columns, rows: [] });
  }

  const insertMatches = [...setupSql.matchAll(/INSERT\s+INTO\s+(\w+)\s*(?:\([^)]*\))?\s*VALUES\s*([\s\S]*?);/gis)];
  if (insertMatches.length === 0) {
    return null;
  }

  let totalRows = 0;
  for (const [, insertTable, valuesText] of insertMatches) {
    const tableIndex = tableIndexByName.get(insertTable.toLowerCase());
    if (tableIndex === undefined) {
      return null;
    }
    const table = tables[tableIndex];
    for (const tuple of matchValueTuples(valuesText)) {
      const values = splitTopLevel(tuple).map(cleanSqlLiteral);
      if (values.length !== table.columns.length) {
        return null;
      }
      table.rows.push(values);
      totalRows++;
    }
  }

  return totalRows > 0 ? tables : null;
}

// sqlTestCases[i].expectedOutput is the backend's canonical row-set format: one
// raw JSON object per line, e.g. `{"name":"John"}\n{"name":"Bob"}` (see
// SqlReferenceRunner.CanonicalRowSet). Parses it into rows for a table; returns
// null if it doesn't parse as that shape, so callers can fall back to raw text
// instead of rendering a broken/misleading table.
export function parseSqlRowSet(text: string): { columns: string[]; rows: Record<string, unknown>[] } | null {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  try {
    const rows = lines.map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Not a row object');
      }
      return parsed as Record<string, unknown>;
    });
    const columns = Object.keys(rows[0]);
    return { columns, rows };
  } catch {
    return null;
  }
}

// Converts parseSqlRowSet's { columns, rows: Record<string,unknown>[] } shape
// into DataTable's flat string[][] rows.
export function toSqlTableRows(parsed: { columns: string[]; rows: Record<string, unknown>[] }): string[][] {
  return parsed.rows.map((row) => parsed.columns.map((col) => String(row[col])));
}
