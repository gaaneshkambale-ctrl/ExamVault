import { Form, Pagination } from 'react-bootstrap';
import { getPaginationRange } from '../../utils/paginationRange';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  // Optional: only renders the "N / page" selector when the caller has a
  // pageSize to control. Omit both to keep a fixed page size, unchanged
  // from before this existed.
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

// Same numbered-pager shape ManageExams.tsx/ManageUsers.tsx already use,
// pulled out shared since Results' Exam/Student tables both need it.
// First/Last jump buttons plus a windowed page list (see getPaginationRange)
// keep this usable once a table has hundreds of pages - a page-per-button
// pager becomes an unusable, overflowing wall of buttons past a few dozen
// pages (hit in practice: Audit Reports with 1000+ activities).
export default function TablePagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalCount === 0) return null;

  return (
    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
      <div className="text-muted small">
        Showing {rangeStart} to {rangeEnd} of {totalCount} entries
      </div>
      <div className="d-flex align-items-center gap-3">
        <Pagination className="mb-0">
          <Pagination.First disabled={page === 1} onClick={() => onPageChange(1)} />
          <Pagination.Prev disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))} />
          {getPaginationRange(page, totalPages).map((p, i) =>
            p === 'ellipsis' ? (
              <Pagination.Ellipsis key={`ellipsis-${i}`} disabled />
            ) : (
              <Pagination.Item key={p} active={p === page} onClick={() => onPageChange(p)}>
                {p}
              </Pagination.Item>
            ),
          )}
          <Pagination.Next
            disabled={page === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          />
          <Pagination.Last disabled={page === totalPages} onClick={() => onPageChange(totalPages)} />
        </Pagination>
        {pageSize !== undefined && pageSizeOptions && onPageSizeChange && (
          <Form.Select
            size="sm"
            style={{ width: 100 }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </Form.Select>
        )}
      </div>
    </div>
  );
}
