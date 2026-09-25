// Generic, real HTML <table> renderer for any columns/rows grid - shared by the
// live exam's SQL "Use the following table(s)"/"Expected Output" panels and the
// admin Question Preview's per-language "Example" table, so every place that shows
// tabular question data looks identical instead of each screen reinventing it.
// Styling matches the user-specified reference: full width, all-left-aligned,
// full grid lines (horizontal row separators + vertical column separators).
// Colors use Bootstrap 5.3's theme-aware CSS custom properties (not hardcoded hex)
// so this renders correctly in both light and dark mode, same convention already
// used throughout the rest of the exam UI - a fixed light palette here looked fine
// in light mode but was unreadable when the surrounding app was in dark mode.
const BORDER = '1px solid var(--bs-border-color)';

export interface DataTableProps {
  columns: string[];
  rows: string[][];
  // Set false when the caller already wraps this in its own bordered/rounded
  // card (eg. a colored title-bar container) - avoids a double border/radius.
  bordered?: boolean;
}

export default function DataTable({ columns, rows, bordered = true }: DataTableProps) {
  return (
    <table
      className="mb-0"
      style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        color: 'var(--bs-body-color)',
        ...(bordered ? { border: BORDER, borderRadius: 8, overflow: 'hidden' } : {}),
      }}
    >
      <thead>
        <tr>
          {columns.map((col, j) => (
            <th
              key={col}
              style={{
                background: 'var(--bs-tertiary-bg)',
                fontWeight: 600,
                textAlign: 'left',
                padding: '10px 14px',
                borderBottom: BORDER,
                borderLeft: j === 0 ? 'none' : BORDER,
                whiteSpace: 'nowrap',
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((value, j) => (
              <td
                key={j}
                style={{
                  background: 'var(--bs-body-bg)',
                  padding: '10px 14px',
                  borderBottom: i === rows.length - 1 ? 'none' : BORDER,
                  borderLeft: j === 0 ? 'none' : BORDER,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
