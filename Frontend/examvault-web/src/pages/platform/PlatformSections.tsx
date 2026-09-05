import { useEffect, useMemo, useState } from 'react';
import { Accordion, Card, Col, Form, InputGroup, Pagination, Row, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import OrgAvatar from '../../components/OrgAvatar';
import { BookIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { listAllSections } from '../../api/sectionApi';
import type { PlatformSectionResponse } from '../../types/section';

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

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function QuestionStackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

// Small, non-Bootstrap-Badge count pill - react-bootstrap's Badge defaults to
// bg="primary", an !important utility class that clobbers a custom inline
// background while a custom text color still applies on top of it, making
// the count unreadable (hit this live on the Exam Categories page).
function CountPill({ count, label, className = '' }: { count: number; label: string; className?: string }) {
  return (
    <span
      className={`d-inline-flex align-items-center rounded-pill px-2 py-1 small fw-medium ${className}`}
      style={{
        background: count > 0 ? '#eef2ff' : '#f3f4f6',
        color: count > 0 ? '#4f46e5' : '#9ca3af',
      }}
    >
      {count} {label}
    </span>
  );
}

function groupKey(tenantId: string, examId: string) {
  return `${tenantId}::${examId}`;
}

// Real, cross-tenant - GET /api/exams/sections (SuperAdmin only), same query
// key across this page so React Query dedupes the fetch. Grouped two levels
// deep - Organization, then Exam within it - rather than one flat table,
// since a Super Admin browsing sections almost always thinks "which org,
// which exam" first. Every organization from useTenants() is shown even
// with 0 sections (same reasoning as Exam Categories showing every catalog
// category even at 0 exams) so it's visible which orgs haven't built out
// any sections yet.
export default function PlatformSections() {
  const { data: sections, isLoading, isError } = useQuery({ queryKey: ['platform-sections'], queryFn: listAllSections });
  const { data: tenants } = useTenants();

  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [pageByGroup, setPageByGroup] = useState<Record<string, number>>({});
  const [pageSizeByGroup, setPageSizeByGroup] = useState<Record<string, number>>({});

  const orgScopedSections = useMemo(
    () => (organizationFilter === 'all' ? (sections ?? []) : (sections ?? []).filter((s) => s.tenantId === organizationFilter)),
    [sections, organizationFilter],
  );
  const orgScopedTenants = useMemo(
    () => (organizationFilter === 'all' ? (tenants ?? []) : (tenants ?? []).filter((t) => t.id === organizationFilter)),
    [tenants, organizationFilter],
  );

  const totalOrganizations = orgScopedTenants.length;
  const totalExams = new Set(orgScopedSections.map((s) => s.examId)).size;
  const totalSections = orgScopedSections.length;
  const totalQuestions = orgScopedSections.reduce((sum, s) => sum + s.questionCount, 0);

  const searchQuery = searchText.trim().toLowerCase();

  const sectionsByTenant = useMemo(() => {
    const map = new Map<string, PlatformSectionResponse[]>();
    orgScopedSections.forEach((section) => {
      const existing = map.get(section.tenantId) ?? [];
      existing.push(section);
      map.set(section.tenantId, existing);
    });
    return map;
  }, [orgScopedSections]);

  const visibleOrgs = useMemo(() => {
    return orgScopedTenants
      .map((tenant) => {
        const tenantSections = sectionsByTenant.get(tenant.id) ?? [];
        const matchedSections = !searchQuery
          ? tenantSections
          : tenantSections.filter(
              (s) =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.examTitle.toLowerCase().includes(searchQuery) ||
                tenant.name.toLowerCase().includes(searchQuery),
            );

        const examMap = new Map<string, { examId: string; examTitle: string; sections: PlatformSectionResponse[] }>();
        matchedSections.forEach((s) => {
          const existing = examMap.get(s.examId);
          if (existing) {
            existing.sections.push(s);
          } else {
            examMap.set(s.examId, { examId: s.examId, examTitle: s.examTitle, sections: [s] });
          }
        });
        const exams = [...examMap.values()].sort((a, b) => b.sections.length - a.sections.length);

        return { tenant, matchedSections, exams };
      })
      .filter(({ tenant, matchedSections }) => !searchQuery || tenant.name.toLowerCase().includes(searchQuery) || matchedSections.length > 0)
      .sort((a, b) => b.matchedSections.length - a.matchedSections.length);
  }, [orgScopedTenants, sectionsByTenant, searchQuery]);

  useEffect(() => {
    setPageByGroup({});
  }, [searchQuery, organizationFilter]);

  return (
    <PlatformLayout active="exams-sections">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / Sections</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Sections</h1>
          <p className="text-muted mb-0">View exam sections across all organizations, grouped by organization and exam.</p>
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
          <InputGroup style={{ width: 260 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search sections, exam, organization..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <Row className="g-3 my-1">
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<BuildingIcon />}
            label="Total Organizations"
            value={String(totalOrganizations)}
            caption="With platform access"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(totalExams)}
            caption="With at least one section"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<LayersIcon />}
            label="Total Sections"
            value={String(totalSections)}
            caption="Across all organizations"
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<QuestionStackIcon />}
            label="Total Questions"
            value={String(totalQuestions)}
            caption="Assigned across sections"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      {isLoading && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            <div className="d-flex justify-content-center">
              <div className="spinner-border" role="status" />
            </div>
          </Card.Body>
        </Card>
      )}

      {isError && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-danger py-5">Couldn't load sections. Please try again.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleOrgs.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No organizations match your search.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleOrgs.length > 0 && (
        <Accordion defaultActiveKey="0" alwaysOpen>
          {visibleOrgs.map(({ tenant, matchedSections, exams }, orgIndex) => (
            <Accordion.Item eventKey={String(orgIndex)} key={tenant.id} className="border-0 shadow-sm mb-2">
              <Accordion.Header>
                <span className="d-flex align-items-center gap-2 flex-grow-1">
                  <OrgAvatar name={tenant.name} size={28} />
                  <span className="fw-medium">{tenant.name}</span>
                  <span className="text-muted small">{matchedSections.length}</span>
                </span>
                <CountPill count={matchedSections.length} label={matchedSections.length === 1 ? 'Section' : 'Sections'} className="me-2" />
              </Accordion.Header>
              <Accordion.Body className="p-3">
                {exams.length === 0 ? (
                  <div className="text-center text-muted py-4">No sections yet for this organization.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {exams.map(({ examId, examTitle, sections: examSections }) => {
                      const key = groupKey(tenant.id, examId);
                      const pageSize = pageSizeByGroup[key] ?? PAGE_SIZE_OPTIONS[0];
                      const currentPage = pageByGroup[key] ?? 1;
                      const totalPages = Math.max(1, Math.ceil(examSections.length / pageSize));
                      const clampedPage = Math.min(currentPage, totalPages);
                      const pagedSections = examSections.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
                      const rangeStart = examSections.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
                      const rangeEnd = Math.min(clampedPage * pageSize, examSections.length);

                      return (
                        <div key={examId} className="border rounded-3 overflow-hidden">
                          <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-body-tertiary">
                            <span className="d-flex align-items-center gap-2">
                              <span
                                className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                                style={{ width: 24, height: 24, background: '#eef2ff', color: '#4f46e5' }}
                              >
                                <DocumentIcon />
                              </span>
                              <span className="fw-medium small">{examTitle}</span>
                            </span>
                            <CountPill count={examSections.length} label={examSections.length === 1 ? 'Section' : 'Sections'} />
                          </div>
                          <Table responsive hover className="mb-0 align-middle">
                            <thead className="text-muted small text-uppercase">
                              <tr>
                                <th className="ps-3">Section</th>
                                <th>Questions</th>
                                <th>Marks</th>
                                <th className="pe-3">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedSections.map((section) => (
                                <tr key={section.id}>
                                  <td className="ps-3 fw-medium">{section.name}</td>
                                  <td className="text-muted">{section.questionCount}</td>
                                  <td className="text-muted">{section.marks}</td>
                                  <td className="pe-3 text-muted">{section.durationMinutes} min</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                          {examSections.length > PAGE_SIZE_OPTIONS[0] && (
                            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                              <div className="text-muted small">
                                Showing {rangeStart} to {rangeEnd} of {examSections.length} sections
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                {totalPages > 1 && (
                                  <Pagination className="mb-0" size="sm">
                                    <Pagination.Prev
                                      disabled={clampedPage === 1}
                                      onClick={() => setPageByGroup((prev) => ({ ...prev, [key]: Math.max(1, clampedPage - 1) }))}
                                    />
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                      <Pagination.Item
                                        key={p}
                                        active={p === clampedPage}
                                        onClick={() => setPageByGroup((prev) => ({ ...prev, [key]: p }))}
                                      >
                                        {p}
                                      </Pagination.Item>
                                    ))}
                                    <Pagination.Next
                                      disabled={clampedPage === totalPages}
                                      onClick={() => setPageByGroup((prev) => ({ ...prev, [key]: Math.min(totalPages, clampedPage + 1) }))}
                                    />
                                  </Pagination>
                                )}
                                <Form.Select
                                  size="sm"
                                  style={{ width: 100 }}
                                  value={pageSize}
                                  onChange={(e) => {
                                    const size = Number(e.target.value);
                                    setPageSizeByGroup((prev) => ({ ...prev, [key]: size }));
                                    setPageByGroup((prev) => ({ ...prev, [key]: 1 }));
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </PlatformLayout>
  );
}
