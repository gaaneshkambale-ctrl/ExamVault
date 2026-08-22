import { Pagination } from 'react-bootstrap';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

// Same numbered-pager shape ManageExams.tsx/ManageUsers.tsx already use,
// pulled out shared since Results' Exam/Student tables both need it.
export default function TablePagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPageChange,
}: TablePaginationProps) {
  if (totalCount === 0) return null;

  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <div className="text-muted small">
        Showing {rangeStart} to {rangeEnd} of {totalCount} entries
      </div>
      <Pagination className="mb-0">
        <Pagination.Prev disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))} />
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Pagination.Item key={p} active={p === page} onClick={() => onPageChange(p)}>
            {p}
          </Pagination.Item>
        ))}
        <Pagination.Next
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        />
      </Pagination>
    </div>
  );
}
