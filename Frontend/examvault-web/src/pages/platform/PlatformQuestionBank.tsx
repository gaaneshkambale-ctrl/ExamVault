import { useEffect, useMemo, useState } from 'react';
import { Accordion, Badge, Card, Col, Dropdown, Form, InputGroup, Pagination, Row, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import OrgAvatar from '../../components/OrgAvatar';
import { BookIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { listAllSections } from '../../api/sectionApi';
import { listAllQuestions } from '../../api/questionApi';
import type { PlatformQuestionResponse, QuestionDifficulty, QuestionType } from '../../types/question';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// "MultipleChoice" is the backend's real name for the single-correct-answer
// type, but its actual behavior is what's normally called "Single Choice" -
// same label QuestionDetails.tsx/AiGenerateQuestions.tsx already use, kept
// here rather than copying the mockup's literal "Multiple Choice" wording,
// which would misrepresent what the backend enum actually means.
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

const DIFFICULTY_VARIANT: Record<QuestionDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

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

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" /><circle cx="8" cy="12" r="3" />
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

function DocumentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

// Plain span, not react-bootstrap's Badge - Badge's default bg="primary" is
// an !important utility class that clobbers a custom inline background
// while a custom text color still applies on top of it, making the count
// unreadable (hit this live on the Exam Categories page).
function CountPill({ count, label }: { count: number; label: string }) {
  return (
    <span
      className="d-inline-flex align-items-center rounded-pill px-2 py-1 small fw-medium"
      style={{
        background: count > 0 ? '#eef2ff' : '#f3f4f6',
        color: count > 0 ? '#4f46e5' : '#9ca3af',
      }}
    >
      {count} {label}
    </span>
  );
}

function exportQuestionsToCsv(
  questions: PlatformQuestionResponse[],
  examTitleById: Map<string, string>,
  tenantNameById: Map<string, string>,
  sectionNameById: Map<string, string>,
) {
  const header = ['Question', 'Exam', 'Section', 'Organization', 'Type', 'Difficulty', 'Marks', 'Added On'];
  const rows = questions.map((q) => [
    q.questionText,
    examTitleById.get(q.examId) ?? '',
    q.sectionId ? (sectionNameById.get(q.sectionId) ?? '') : 'Unassigned',
    tenantNameById.get(q.tenantId) ?? '',
    QUESTION_TYPE_LABELS[q.questionType],
    q.difficulty,
    String(q.marks),
    new Date(q.createdAtUtc).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-question-bank-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function groupKey(tenantId: string, examId: string, sectionKey: string) {
  return `${tenantId}::${examId}::${sectionKey}`;
}

type TypeFilter = 'all' | QuestionType;

// Real, cross-tenant - GET /api/questions/all (SuperAdmin only). Grouped
// three levels deep - Organization, then Exam, then Section within it -
// same reasoning as Sections.tsx's Organization -> Exam grouping, one level
// further since a question always belongs to a section (or none yet).
// QuestionService has no Exams/Sections tables of its own (separate
// database), so exam titles and section names are joined against the
// platform's own already-fetched cross-tenant lists (same query keys the
// All Exams/Sections pages use, so React Query dedupes every fetch).
export default function PlatformQuestionBank() {
  const { data: questions, isLoading, isError } = useQuery({ queryKey: ['platform-questions'], queryFn: listAllQuestions });
  const { data: exams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: sections } = useQuery({ queryKey: ['platform-sections'], queryFn: listAllSections });
  const { data: tenants } = useTenants();

  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [pageByGroup, setPageByGroup] = useState<Record<string, number>>({});
  const [pageSizeByGroup, setPageSizeByGroup] = useState<Record<string, number>>({});

  const examTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (exams ?? []).forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  const sectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    (sections ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sections]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const orgScopedQuestions = useMemo(
    () => (organizationFilter === 'all' ? (questions ?? []) : (questions ?? []).filter((q) => q.tenantId === organizationFilter)),
    [questions, organizationFilter],
  );
  const orgScopedTenants = useMemo(
    () => (organizationFilter === 'all' ? (tenants ?? []) : (tenants ?? []).filter((t) => t.id === organizationFilter)),
    [tenants, organizationFilter],
  );

  const totalQuestions = orgScopedQuestions.length;
  const totalExams = new Set(orgScopedQuestions.map((q) => q.examId)).size;
  const singleChoiceCount = orgScopedQuestions.filter((q) => q.questionType === 'MultipleChoice').length;
  const trueFalseCount = orgScopedQuestions.filter((q) => q.questionType === 'TrueFalse').length;
  const otherCount = totalQuestions - singleChoiceCount - trueFalseCount;
  const pct = (count: number) => (totalQuestions === 0 ? '0' : ((count / totalQuestions) * 100).toFixed(2));

  const searchQuery = searchText.trim().toLowerCase();

  const typeAndSearchFiltered = useMemo(() => {
    return orgScopedQuestions.filter((q) => {
      if (typeFilter !== 'all' && q.questionType !== typeFilter) return false;
      if (!searchQuery) return true;
      const examTitle = examTitleById.get(q.examId) ?? '';
      const orgName = tenantNameById.get(q.tenantId) ?? '';
      const sectionName = q.sectionId ? (sectionNameById.get(q.sectionId) ?? '') : 'Unassigned';
      return (
        q.questionText.toLowerCase().includes(searchQuery) ||
        examTitle.toLowerCase().includes(searchQuery) ||
        orgName.toLowerCase().includes(searchQuery) ||
        sectionName.toLowerCase().includes(searchQuery)
      );
    });
  }, [orgScopedQuestions, typeFilter, searchQuery, examTitleById, tenantNameById, sectionNameById]);

  const questionsByTenant = useMemo(() => {
    const map = new Map<string, PlatformQuestionResponse[]>();
    typeAndSearchFiltered.forEach((q) => {
      const existing = map.get(q.tenantId) ?? [];
      existing.push(q);
      map.set(q.tenantId, existing);
    });
    return map;
  }, [typeAndSearchFiltered]);

  const visibleOrgs = useMemo(() => {
    return orgScopedTenants
      .map((tenant) => {
        const tenantQuestions = questionsByTenant.get(tenant.id) ?? [];

        const examMap = new Map<string, { examId: string; examTitle: string; questions: PlatformQuestionResponse[] }>();
        tenantQuestions.forEach((q) => {
          const existing = examMap.get(q.examId);
          if (existing) {
            existing.questions.push(q);
          } else {
            examMap.set(q.examId, { examId: q.examId, examTitle: examTitleById.get(q.examId) ?? 'Untitled Exam', questions: [q] });
          }
        });

        const exams = [...examMap.values()]
          .map(({ examId, examTitle, questions: examQuestions }) => {
            const sectionMap = new Map<string, { sectionKey: string; sectionName: string; questions: PlatformQuestionResponse[] }>();
            examQuestions.forEach((q) => {
              const sectionKey = q.sectionId ?? 'unassigned';
              const sectionName = q.sectionId ? (sectionNameById.get(q.sectionId) ?? 'Section') : 'Unassigned';
              const existing = sectionMap.get(sectionKey);
              if (existing) {
                existing.questions.push(q);
              } else {
                sectionMap.set(sectionKey, { sectionKey, sectionName, questions: [q] });
              }
            });
            const sectionGroups = [...sectionMap.values()].sort((a, b) => {
              if (a.sectionKey === 'unassigned') return 1;
              if (b.sectionKey === 'unassigned') return -1;
              return b.questions.length - a.questions.length;
            });
            return { examId, examTitle, questions: examQuestions, sectionGroups };
          })
          .sort((a, b) => b.questions.length - a.questions.length);

        return { tenant, matchedQuestions: tenantQuestions, exams };
      })
      .filter(
        ({ tenant, matchedQuestions }) =>
          !searchQuery || tenant.name.toLowerCase().includes(searchQuery) || matchedQuestions.length > 0,
      )
      .sort((a, b) => b.matchedQuestions.length - a.matchedQuestions.length);
  }, [orgScopedTenants, questionsByTenant, examTitleById, sectionNameById, searchQuery]);

  useEffect(() => {
    setPageByGroup({});
  }, [searchQuery, organizationFilter, typeFilter]);

  return (
    <PlatformLayout active="exams-question-bank">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / Question Bank</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Question Bank</h1>
          <p className="text-muted mb-0">View questions across all organizations, grouped by organization, exam, and section.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
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
          <Dropdown>
            <Dropdown.Toggle as="button" bsPrefix="btn" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
              <FilterIcon /> {typeFilter === 'all' ? 'All Question Types' : QUESTION_TYPE_LABELS[typeFilter]}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
                All Question Types
              </Dropdown.Item>
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                <Dropdown.Item key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                  {QUESTION_TYPE_LABELS[type]}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <InputGroup style={{ width: 240 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search question, exam, section, org..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={typeAndSearchFiltered.length === 0}
            onClick={() => exportQuestionsToCsv(typeAndSearchFiltered, examTitleById, tenantNameById, sectionNameById)}
          >
            Export
          </button>
        </div>
      </div>

      <Row xs={2} lg={5} className="g-3 my-1">
        <Col>
          <ReportStatCard
            icon={<ListIcon />}
            label="Total Questions"
            value={String(totalQuestions)}
            caption="Across all organizations"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(totalExams)}
            caption="With at least one question"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Single Choice"
            value={String(singleChoiceCount)}
            caption={`${pct(singleChoiceCount)}% of total`}
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<ToggleIcon />}
            label="True / False"
            value={String(trueFalseCount)}
            caption={`${pct(trueFalseCount)}% of total`}
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<LayersIcon />}
            label="Other Types"
            value={String(otherCount)}
            caption={`${pct(otherCount)}% of total`}
            iconBg="#fce7f3"
            iconColor="#db2777"
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
          <Card.Body className="text-center text-danger py-5">Couldn't load questions. Please try again.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleOrgs.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No organizations match your search.</Card.Body>
        </Card>
      )}

      {!isLoading && !isError && visibleOrgs.length > 0 && (
        <Accordion defaultActiveKey="0" alwaysOpen>
          {visibleOrgs.map(({ tenant, matchedQuestions, exams }, orgIndex) => (
            <Accordion.Item eventKey={String(orgIndex)} key={tenant.id} className="border-0 shadow-sm mb-2">
              <Accordion.Header>
                <span className="d-flex align-items-center gap-2 flex-grow-1">
                  <OrgAvatar name={tenant.name} size={28} />
                  <span className="fw-medium">{tenant.name}</span>
                  <span className="text-muted small">{matchedQuestions.length}</span>
                </span>
                <span className="me-2">
                  <CountPill count={matchedQuestions.length} label={matchedQuestions.length === 1 ? 'Question' : 'Questions'} />
                </span>
              </Accordion.Header>
              <Accordion.Body className="p-3">
                {exams.length === 0 ? (
                  <div className="text-center text-muted py-4">No questions yet for this organization.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {exams.map(({ examId, examTitle, questions: examQuestions, sectionGroups }) => (
                      <div key={examId} className="border rounded-3 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light">
                          <span className="d-flex align-items-center gap-2">
                            <span
                              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                              style={{ width: 24, height: 24, background: '#eef2ff', color: '#4f46e5' }}
                            >
                              <DocumentIcon />
                            </span>
                            <span className="fw-medium small">{examTitle}</span>
                          </span>
                          <CountPill count={examQuestions.length} label={examQuestions.length === 1 ? 'Question' : 'Questions'} />
                        </div>

                        <div className="d-flex flex-column gap-2 p-2">
                          {sectionGroups.map(({ sectionKey, sectionName, questions: sectionQuestions }) => {
                            const key = groupKey(tenant.id, examId, sectionKey);
                            const pageSize = pageSizeByGroup[key] ?? PAGE_SIZE_OPTIONS[0];
                            const currentPage = pageByGroup[key] ?? 1;
                            const totalPages = Math.max(1, Math.ceil(sectionQuestions.length / pageSize));
                            const clampedPage = Math.min(currentPage, totalPages);
                            const pagedQuestions = sectionQuestions.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
                            const rangeStart = sectionQuestions.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
                            const rangeEnd = Math.min(clampedPage * pageSize, sectionQuestions.length);

                            return (
                              <div key={sectionKey} className="border rounded-3 overflow-hidden">
                                <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: '#fafafa' }}>
                                  <span className="d-flex align-items-center gap-2 text-muted">
                                    <SectionIcon />
                                    <span className="small fw-medium">{sectionName}</span>
                                  </span>
                                  <span className="text-muted small">
                                    {sectionQuestions.length} {sectionQuestions.length === 1 ? 'question' : 'questions'}
                                  </span>
                                </div>
                                <Table responsive hover className="mb-0 align-middle">
                                  <thead className="text-muted small text-uppercase">
                                    <tr>
                                      <th className="ps-3">Question</th>
                                      <th>Type</th>
                                      <th>Difficulty</th>
                                      <th>Marks</th>
                                      <th>Added On</th>
                                      <th className="pe-3">Created By</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pagedQuestions.map((q) => (
                                      <tr key={q.id}>
                                        <td className="ps-3" style={{ maxWidth: 360 }}>
                                          <div className="text-truncate">{q.questionText}</div>
                                        </td>
                                        <td>
                                          <Badge bg="light" text="dark" className="border">
                                            {QUESTION_TYPE_LABELS[q.questionType]}
                                          </Badge>
                                        </td>
                                        <td>
                                          <Badge bg={DIFFICULTY_VARIANT[q.difficulty]}>{q.difficulty}</Badge>
                                        </td>
                                        <td className="text-muted">{q.marks}</td>
                                        <td className="text-muted">{new Date(q.createdAtUtc).toLocaleDateString()}</td>
                                        <td className="pe-3 text-muted">{q.createdByName ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                                {sectionQuestions.length > PAGE_SIZE_OPTIONS[0] && (
                                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                                    <div className="text-muted small">
                                      Showing {rangeStart} to {rangeEnd} of {sectionQuestions.length} questions
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
                                            onClick={() =>
                                              setPageByGroup((prev) => ({ ...prev, [key]: Math.min(totalPages, clampedPage + 1) }))
                                            }
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
                      </div>
                    ))}
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
