import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import ReportStatCard from '../../../components/reports/ReportStatCard';
import { DatabaseIcon, TargetIcon } from '../../../components/reports/ReportIcons';
import { useTenants } from '../../../hooks/useTenants';
import { listExams } from '../../../api/examApi';
import type { ExamResponse } from '../../../types/exam';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CalendarRangeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="14" />
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

// Same cosmetic per-category icon convention as PlatformExamCategories.tsx's
// categoryStyle - duplicated locally per this codebase's per-file
// convention, keyed off the real EXAM_CATEGORIES catalog.
function categoryStyle(name: string): { icon: ReactNode; iconBg: string; iconColor: string } {
  const lower = name.toLowerCase();
  if (lower.includes('technical')) return { icon: <TargetIcon />, iconBg: '#ede9fe', iconColor: '#7c3aed' };
  if (lower.includes('database') || lower.includes('data')) return { icon: <DatabaseIcon />, iconBg: '#fce7f3', iconColor: '#db2777' };
  if (lower.includes('aptitude') || lower.includes('reasoning')) return { icon: <TargetIcon />, iconBg: '#dcfce7', iconColor: '#16a34a' };
  if (lower.includes('program') || lower.includes('code') || lower.includes('dev')) return { icon: <CodeIcon />, iconBg: '#ffedd5', iconColor: '#ea580c' };
  if (lower.includes('soft skill') || lower.includes('communication')) return { icon: <HandshakeIcon />, iconBg: '#fef9c3', iconColor: '#ca8a04' };
  if (lower.includes('general')) return { icon: <BookOpenIcon />, iconBg: '#dbeafe', iconColor: '#2563eb' };
  return { icon: <TagIcon />, iconBg: '#f3f4f6', iconColor: '#4b5563' };
}

function exportExamsToCsv(entries: ExamEntry[], tenantNameById: Map<string, string>) {
  const header = ['Exam', 'Organization', 'Start Time', 'End Time', 'Duration (min)', 'Window'];
  const rows = entries.map(({ exam, window }) => [
    exam.title,
    tenantNameById.get(exam.tenantId) ?? '',
    exam.startAtUtc ? new Date(exam.startAtUtc).toISOString() : '',
    exam.endAtUtc ? new Date(exam.endAtUtc).toISOString() : '',
    String(exam.durationMinutes),
    window,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `active-exams-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type Tab = 'live' | 'today' | 'tomorrow' | 'upcoming';

interface ExamEntry {
  exam: ExamResponse;
  window: 'Live' | 'Starts Today' | 'Starts Tomorrow' | 'Upcoming';
  isLive: boolean;
  isStartsToday: boolean;
  isStartsTomorrow: boolean;
  isUpcoming7Days: boolean;
}

// Real data only - exam.startAtUtc/endAtUtc/status already drive
// MonitoringOverview.tsx's Live/Upcoming split; this page adds the
// mockup's Today/Tomorrow/7-day tabs as broader, overlapping windows on
// top of the same real fields, computed client-side. No participant counts
// (no real "assigned/registered" field exists on ExamResponse) and no
// per-exam analytics action - both dropped rather than faked.
export default function ActiveExams() {
  const { data: exams, isLoading: examsLoading, isError: examsError } = useQuery({
    queryKey: ['platform-exams'],
    queryFn: listExams,
  });
  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError } = useTenants();

  const [tab, setTab] = useState<Tab>('live');
  const [searchText, setSearchText] = useState('');

  const isLoading = examsLoading || tenantsLoading;
  const isError = examsError || tenantsError;

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const allEntries = useMemo<ExamEntry[]>(() => {
    const now = Date.now();
    const todayStr = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;

    return (exams ?? [])
      .filter((exam) => exam.status === 'Published' && exam.startAtUtc)
      .map((exam) => {
        const start = new Date(exam.startAtUtc!).getTime();
        const end = exam.endAtUtc ? new Date(exam.endAtUtc).getTime() : null;
        const isLive = start <= now && (end === null || end >= now);
        const startDateStr = new Date(exam.startAtUtc!).toDateString();
        const isStartsToday = !isLive && start > now && startDateStr === todayStr;
        const isStartsTomorrow = !isLive && start > now && startDateStr === tomorrowStr;
        const isUpcoming7Days = !isLive && start > now && start <= in7Days;
        const window: ExamEntry['window'] = isLive ? 'Live' : isStartsToday ? 'Starts Today' : isStartsTomorrow ? 'Starts Tomorrow' : 'Upcoming';
        return { exam, window, isLive, isStartsToday, isStartsTomorrow, isUpcoming7Days };
      })
      .filter((e) => e.isLive || e.isUpcoming7Days)
      .sort((a, b) => new Date(a.exam.startAtUtc!).getTime() - new Date(b.exam.startAtUtc!).getTime());
  }, [exams]);

  const liveEntries = allEntries.filter((e) => e.isLive);
  const todayEntries = allEntries.filter((e) => e.isStartsToday);
  const tomorrowEntries = allEntries.filter((e) => e.isStartsTomorrow);
  const upcomingEntries = allEntries.filter((e) => e.isUpcoming7Days);

  const tabEntries = tab === 'live' ? liveEntries : tab === 'today' ? todayEntries : tab === 'tomorrow' ? tomorrowEntries : upcomingEntries;

  const searchQuery = searchText.trim().toLowerCase();
  const filteredEntries = tabEntries.filter(({ exam }) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(exam.tenantId) ?? '';
    return exam.title.toLowerCase().includes(searchQuery) || orgName.toLowerCase().includes(searchQuery);
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'live', label: 'Live Now', count: liveEntries.length },
    { key: 'today', label: 'Starts Today', count: todayEntries.length },
    { key: 'tomorrow', label: 'Starts Tomorrow', count: tomorrowEntries.length },
    { key: 'upcoming', label: 'Upcoming (7 Days)', count: upcomingEntries.length },
  ];

  return (
    <PlatformLayout active="mon-active-exams">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Monitoring / Active Exams</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Active Exams</h1>
          <p className="text-muted mb-0">Published exams that are live now or scheduled to start.</p>
        </div>
        <div className="d-flex gap-2">
          <InputGroup style={{ width: 260 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search exam, organization..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={filteredEntries.length === 0}
            onClick={() => exportExamsToCsv(filteredEntries, tenantNameById)}
          >
            Export
          </button>
        </div>
      </div>

      <Row xs={2} lg={4} className="g-3 my-1">
        <Col>
          <ReportStatCard
            icon={<DocumentIcon />}
            label="Live Now"
            value={String(liveEntries.length)}
            caption="Exams are currently live"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CalendarIcon />}
            label="Starts Today"
            value={String(todayEntries.length)}
            caption="Scheduled to start today"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<ClockIcon />}
            label="Starts Tomorrow"
            value={String(tomorrowEntries.length)}
            caption="Scheduled to start tomorrow"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CalendarRangeIcon />}
            label="Upcoming (7 Days)"
            value={String(upcomingEntries.length)}
            caption="Within the next 7 days"
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
      </Row>

      <div className="d-flex gap-2 mb-3 border-bottom">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="btn btn-link text-decoration-none px-3 py-2"
            style={{
              borderBottom: tab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              color: tab === t.key ? '#4f46e5' : '#6b7280',
              fontWeight: tab === t.key ? 600 : 500,
              borderRadius: 0,
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredEntries.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

          {!isLoading && !isError && filteredEntries.length === 0 && (
            <div className="text-center text-muted py-5">
              {searchQuery ? 'No exams match your search.' : 'No exams in this window.'}
            </div>
          )}

          {!isLoading && !isError && filteredEntries.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam</th>
                  <th>Organization</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th className="pe-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(({ exam, window }) => {
                  const style = categoryStyle(exam.category);
                  return (
                    <tr key={exam.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                            style={{ width: 32, height: 32, background: style.iconBg, color: style.iconColor }}
                          >
                            {style.icon}
                          </span>
                          <div>
                            <div className="fw-medium">{exam.title}</div>
                            {exam.examCode && (
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {exam.examCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                      <td className="text-muted">{new Date(exam.startAtUtc!).toLocaleString()}</td>
                      <td className="text-muted">{exam.endAtUtc ? new Date(exam.endAtUtc).toLocaleString() : '—'}</td>
                      <td className="text-muted">{exam.durationMinutes} min</td>
                      <td className="pe-4">
                        <Badge bg={window === 'Live' ? 'success' : 'warning'}>{window}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
