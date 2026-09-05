import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Dropdown, Form, InputGroup, Pagination, Row, Col, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { BookIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { listAllQuestions } from '../../api/questionApi';
import type { QuestionDifficulty, QuestionType } from '../../types/question';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Same real backend enum this platform already exposes on Question Bank -
// "MultipleChoice" is the single-correct-answer type, actually behaving
// like what's normally called "Single Choice" (see PlatformQuestionBank.tsx's
// own comment on this same label choice).
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

function CodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function exportQuestionsToCsv(
  rows: { questionText: string; examTitle: string; orgName: string; questionType: QuestionType; difficulty: QuestionDifficulty; marks: number; createdAtUtc: string; createdByName: string | null }[],
) {
  const header = ['Question', 'Exam', 'Organization', 'Type', 'Difficulty', 'Marks', 'Created On', 'Created By'];
  const csvRows = rows.map((r) => [
    r.questionText,
    r.examTitle,
    r.orgName,
    QUESTION_TYPE_LABELS[r.questionType],
    r.difficulty,
    String(r.marks),
    new Date(r.createdAtUtc).toISOString(),
    r.createdByName ?? '',
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-questions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type TypeFilter = 'all' | QuestionType;
type DifficultyFilter = 'all' | QuestionDifficulty;

// Real, cross-tenant - the same GET /api/questions/all (SuperAdmin only)
// endpoint Question Bank uses, presented as a flat, searchable, paginated
// table instead of an Organization -> Exam -> Section accordion - a
// different browsing need (a fast list/search/export view), not a
// duplicate feature. Deliberately has no Subject/Topic/Status columns and
// no Add/Edit/Delete actions - neither concept exists in the Question
// domain today (only Type/Difficulty/Marks do), and Super Admin browses
// tenant content here rather than authoring it, same as Question Bank.
export default function PlatformQuestions() {
  const { data: questions, isLoading, isError } = useQuery({ queryKey: ['platform-questions'], queryFn: listAllQuestions });
  const { data: exams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const examTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (exams ?? []).forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const totalQuestions = (questions ?? []).length;
  const multipleChoiceCount = (questions ?? []).filter((q) => q.questionType === 'MultipleChoice' || q.questionType === 'MultiSelect').length;
  const codeQuestionCount = (questions ?? []).filter((q) => q.questionType === 'CodeProgram').length;
  const examsCovered = new Set((questions ?? []).map((q) => q.examId)).size;
  const pct = (count: number) => (totalQuestions === 0 ? '0' : ((count / totalQuestions) * 100).toFixed(2));

  const searchQuery = searchText.trim().toLowerCase();

  const filteredQuestions = useMemo(() => {
    return (questions ?? []).filter((q) => {
      if (organizationFilter !== 'all' && q.tenantId !== organizationFilter) return false;
      if (typeFilter !== 'all' && q.questionType !== typeFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (!searchQuery) return true;
      const examTitle = examTitleById.get(q.examId) ?? '';
      const orgName = tenantNameById.get(q.tenantId) ?? '';
      return (
        q.questionText.toLowerCase().includes(searchQuery) ||
        examTitle.toLowerCase().includes(searchQuery) ||
        orgName.toLowerCase().includes(searchQuery)
      );
    });
  }, [questions, organizationFilter, typeFilter, difficultyFilter, searchQuery, examTitleById, tenantNameById]);

  useEffect(() => {
    setPage(1);
  }, [organizationFilter, typeFilter, difficultyFilter, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredQuestions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredQuestions.length);

  return (
    <PlatformLayout active="questions">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Questions</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Questions</h1>
          <p className="text-muted mb-0">Search and browse questions across every organization on the platform.</p>
        </div>
      </div>

      <Row xs={2} lg={4} className="g-3 my-1">
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
            icon={<CheckCircleIcon />}
            label="Choice-Based Questions"
            value={String(multipleChoiceCount)}
            caption={`${pct(multipleChoiceCount)}% of total`}
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CodeIcon />}
            label="Code / Programming"
            value={String(codeQuestionCount)}
            caption={`${pct(codeQuestionCount)}% of total`}
            iconBg="#fce7f3"
            iconColor="#db2777"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<BookIcon />}
            label="Exams Covered"
            value={String(examsCovered)}
            caption="With at least one question"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
      </Row>

      <div className="d-flex gap-2 flex-wrap my-2">
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
        <Dropdown>
          <Dropdown.Toggle as="button" bsPrefix="btn" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
            <FilterIcon /> {difficultyFilter === 'all' ? 'All Difficulties' : difficultyFilter}
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item active={difficultyFilter === 'all'} onClick={() => setDifficultyFilter('all')}>
              All Difficulties
            </Dropdown.Item>
            {(['Easy', 'Medium', 'Hard'] as QuestionDifficulty[]).map((d) => (
              <Dropdown.Item key={d} active={difficultyFilter === d} onClick={() => setDifficultyFilter(d)}>
                {d}
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
            placeholder="Search question, exam, org..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </InputGroup>
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={filteredQuestions.length === 0}
          onClick={() =>
            exportQuestionsToCsv(
              filteredQuestions.map((q) => ({
                questionText: q.questionText,
                examTitle: examTitleById.get(q.examId) ?? '',
                orgName: tenantNameById.get(q.tenantId) ?? '',
                questionType: q.questionType,
                difficulty: q.difficulty,
                marks: q.marks,
                createdAtUtc: q.createdAtUtc,
                createdByName: q.createdByName,
              })),
            )
          }
        >
          Export
        </button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredQuestions.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load questions. Please try again.</div>}

          {!isLoading && !isError && filteredQuestions.length === 0 && (
            <div className="text-center text-muted py-5">No questions match your search.</div>
          )}

          {!isLoading && !isError && filteredQuestions.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Question</th>
                  <th>Exam</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th>Created On</th>
                  <th className="pe-4">Created By</th>
                </tr>
              </thead>
              <tbody>
                {pagedQuestions.map((q) => (
                  <tr key={q.id}>
                    <td className="ps-4" style={{ maxWidth: 320 }} title={q.questionText}>
                      <div className="text-truncate">{q.questionText}</div>
                    </td>
                    <td className="text-muted">{examTitleById.get(q.examId) ?? '—'}</td>
                    <td className="text-muted">{tenantNameById.get(q.tenantId) ?? '—'}</td>
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
                    <td className="pe-4 text-muted">{q.createdByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredQuestions.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredQuestions.length} questions
          </div>
          <div className="d-flex align-items-center gap-3">
            <Pagination className="mb-0">
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                  {p}
                </Pagination.Item>
              ))}
              <Pagination.Next disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
            </Pagination>
            <Form.Select size="sm" style={{ width: 100 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
