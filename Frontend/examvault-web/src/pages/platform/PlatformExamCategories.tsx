import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Accordion, Badge, Card, Col, Form, InputGroup, Pagination, Row, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { BookIcon, CheckCircleIcon, DatabaseIcon, TargetIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { EXAM_CATEGORIES } from '../../types/exam';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="7" x2="9" y2="7" /><line x1="15" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="9" y2="11" /><line x1="15" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="9" y2="15" /><line x1="15" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <line x1="7" y1="7" x2="7" y2="7" />
    </svg>
  );
}

// Cosmetic per-category icon/color, keyed off the real EXAM_CATEGORIES catalog
// (types/exam.ts, same list Create/Edit Exam's Category dropdown offers) - not
// stored anywhere itself, purely a deterministic keyword match so the same
// category always renders the same way. Falls back to a generic tag for any
// legacy/custom category value that predates or bypasses the fixed list.
function categoryStyle(name: string): { icon: ReactNode; iconBg: string; iconColor: string } {
  const lower = name.toLowerCase();
  if (lower.includes('technical')) return { icon: <GearIcon />, iconBg: '#ede9fe', iconColor: '#7c3aed' };
  if (lower.includes('database') || lower.includes('data')) return { icon: <DatabaseIcon />, iconBg: '#fce7f3', iconColor: '#db2777' };
  if (lower.includes('aptitude') || lower.includes('reasoning')) return { icon: <TargetIcon />, iconBg: '#dcfce7', iconColor: '#16a34a' };
  if (lower.includes('program') || lower.includes('code') || lower.includes('dev')) return { icon: <CodeIcon />, iconBg: '#ffedd5', iconColor: '#ea580c' };
  if (lower.includes('soft skill') || lower.includes('communication')) return { icon: <HandshakeIcon />, iconBg: '#fef9c3', iconColor: '#ca8a04' };
  if (lower.includes('general')) return { icon: <BookOpenIcon />, iconBg: '#dbeafe', iconColor: '#2563eb' };
  return { icon: <TagIcon />, iconBg: '#f3f4f6', iconColor: '#4b5563' };
}

// Real, cross-tenant - ExamsController.List already accepts a SuperAdmin
// caller, same query key PlatformAllExams.tsx/OrganizationDetails.tsx use so
// React Query dedupes the fetch. Grouped by exam.category (free text,
// validated NotEmpty/MaxLength(100) server-side, not a hard enum - see
// CreateExamValidator.cs) rather than any separate "categories" backend
// entity, since none exists; the 6 EXAM_CATEGORIES values are the same
// catalog Create/Edit Exam's own Category dropdown offers, so every one of
// them is shown here even with 0 exams, plus any legacy/custom category
// value actually found on an exam that isn't in that catalog.
export default function PlatformExamCategories() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [pageByCategory, setPageByCategory] = useState<Record<string, number>>({});
  const [pageSizeByCategory, setPageSizeByCategory] = useState<Record<string, number>>({});

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const orgScopedExams = useMemo(
    () => (organizationFilter === 'all' ? (exams ?? []) : (exams ?? []).filter((e) => e.tenantId === organizationFilter)),
    [exams, organizationFilter],
  );

  const totalExams = orgScopedExams.length;
  const publishedCount = orgScopedExams.filter((e) => e.status === 'Published').length;
  const draftCount = orgScopedExams.filter((e) => e.status === 'Draft').length;
  const pct = (count: number) => (totalExams === 0 ? '0' : ((count / totalExams) * 100).toFixed(2));

  const searchQuery = searchText.trim().toLowerCase();

  const categoryNames = useMemo(() => {
    const extra = new Set<string>();
    orgScopedExams.forEach((e) => {
      const name = e.category || 'Uncategorized';
      if (!(EXAM_CATEGORIES as readonly string[]).includes(name)) {
        extra.add(name);
      }
    });
    return [...EXAM_CATEGORIES, ...[...extra].sort()];
  }, [orgScopedExams]);

  const examsByCategory = useMemo(() => {
    const map = new Map<string, typeof exams>();
    orgScopedExams.forEach((exam) => {
      const key = exam.category || 'Uncategorized';
      const existing = map.get(key) ?? [];
      existing.push(exam);
      map.set(key, existing);
    });
    return map;
  }, [orgScopedExams]);

  const visibleCategories = useMemo(() => {
    return categoryNames
      .map((name) => {
        const categoryExams = examsByCategory.get(name) ?? [];
        const matchedExams = !searchQuery
          ? categoryExams
          : categoryExams.filter((e) => {
              const orgName = tenantNameById.get(e.tenantId) ?? '';
              return (
                e.title.toLowerCase().includes(searchQuery) ||
                name.toLowerCase().includes(searchQuery) ||
                orgName.toLowerCase().includes(searchQuery)
              );
            });
        return { name, allExams: categoryExams, matchedExams };
      })
      .filter(({ name, matchedExams }) => !searchQuery || name.toLowerCase().includes(searchQuery) || matchedExams.length > 0)
      .sort((a, b) => b.allExams.length - a.allExams.length);
  }, [categoryNames, examsByCategory, searchQuery, tenantNameById]);

  useEffect(() => {
    setPageByCategory({});
  }, [searchQuery, organizationFilter]);

  return (
    <PlatformLayout active="exams-categories">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / Exam Categories</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Exam Categories</h1>
          <p className="text-muted mb-0">View exam categories across all organizations, grouped by category.</p>
        </div>
        <div className="d-flex gap-2">
          <InputGroup style={{ width: 200 }}>
            <InputGroup.Text>
              <BuildingIcon />
            </InputGroup.Text>
            <Form.Select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
              <option value="all">All Organizations</option>
              {(tenants ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Form.Select>
          </InputGroup>
          <InputGroup style={{ width: 240 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search categories or exams..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <Row className="g-3 my-1">
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<ListIcon />}
            label="Total Categories"
            value={String(categoryNames.length)}
            caption="Across all organizations"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(totalExams)}
            caption="Across all categories"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Published Exams"
            value={String(publishedCount)}
            caption={`${pct(publishedCount)}% of total`}
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<DraftIcon />}
            label="Draft Exams"
            value={String(draftCount)}
            caption={`${pct(draftCount)}% of total`}
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Card className="border-0 shadow-sm w-100">
            <Card.Body className="text-center py-5 text-muted">Loading...</Card.Body>
          </Card>
        </div>
      )}

      {isError && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-danger py-5">Couldn't load exams. Please try again.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleCategories.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No categories match your search.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleCategories.length > 0 && (
        <Accordion defaultActiveKey="0" alwaysOpen>
          {visibleCategories.map(({ name, matchedExams }, index) => {
            const style = categoryStyle(name);
            const pageSize = pageSizeByCategory[name] ?? PAGE_SIZE_OPTIONS[0];
            const currentPage = pageByCategory[name] ?? 1;
            const totalPages = Math.max(1, Math.ceil(matchedExams.length / pageSize));
            const clampedPage = Math.min(currentPage, totalPages);
            const pagedExams = matchedExams.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
            const rangeStart = matchedExams.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
            const rangeEnd = Math.min(clampedPage * pageSize, matchedExams.length);

            return (
              <Accordion.Item eventKey={String(index)} key={name} className="border-0 shadow-sm mb-2">
                <Accordion.Header>
                  <span className="d-flex align-items-center gap-2 flex-grow-1">
                    <span
                      className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                      style={{ width: 28, height: 28, background: style.iconBg, color: style.iconColor }}
                    >
                      {style.icon}
                    </span>
                    <span className="fw-medium">{name}</span>
                    <span className="text-muted small">{matchedExams.length}</span>
                  </span>
                  <Badge
                    className="me-2"
                    style={{
                      background: matchedExams.length > 0 ? '#eef2ff' : '#f3f4f6',
                      color: matchedExams.length > 0 ? '#4f46e5' : '#9ca3af',
                      fontWeight: 500,
                    }}
                  >
                    {matchedExams.length} {matchedExams.length === 1 ? 'Exam' : 'Exams'}
                  </Badge>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                  {matchedExams.length === 0 ? (
                    <div className="text-center text-muted py-4">No exams in this category yet.</div>
                  ) : (
                    <>
                      <Table responsive hover className="mb-0 align-middle">
                        <thead className="text-muted small text-uppercase bg-light">
                          <tr>
                            <th className="ps-4">Exam Name</th>
                            <th>Organization</th>
                            <th>Status</th>
                            <th className="pe-4">Created On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedExams.map((exam) => (
                            <tr key={exam.id}>
                              <td className="ps-4">
                                <div className="fw-medium">{exam.title}</div>
                                {exam.examCode && (
                                  <div className="text-muted" style={{ fontSize: 12 }}>
                                    {exam.examCode}
                                  </div>
                                )}
                              </td>
                              <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                              <td>
                                <Badge
                                  bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}
                                >
                                  {exam.status}
                                </Badge>
                              </td>
                              <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                        <div className="text-muted small">
                          Showing {rangeStart} to {rangeEnd} of {matchedExams.length} exams
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          {totalPages > 1 && (
                            <Pagination className="mb-0" size="sm">
                              <Pagination.Prev
                                disabled={clampedPage === 1}
                                onClick={() => setPageByCategory((prev) => ({ ...prev, [name]: Math.max(1, clampedPage - 1) }))}
                              />
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <Pagination.Item
                                  key={p}
                                  active={p === clampedPage}
                                  onClick={() => setPageByCategory((prev) => ({ ...prev, [name]: p }))}
                                >
                                  {p}
                                </Pagination.Item>
                              ))}
                              <Pagination.Next
                                disabled={clampedPage === totalPages}
                                onClick={() => setPageByCategory((prev) => ({ ...prev, [name]: Math.min(totalPages, clampedPage + 1) }))}
                              />
                            </Pagination>
                          )}
                          <Form.Select
                            size="sm"
                            style={{ width: 100 }}
                            value={pageSize}
                            onChange={(e) => {
                              const size = Number(e.target.value);
                              setPageSizeByCategory((prev) => ({ ...prev, [name]: size }));
                              setPageByCategory((prev) => ({ ...prev, [name]: 1 }));
                            }}
                          >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>
                                {size} / page
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                      </div>
                    </>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </PlatformLayout>
  );
}
