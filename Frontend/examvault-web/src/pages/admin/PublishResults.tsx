import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { updateExam } from '../../api/examApi';
import { createNotification } from '../../api/notificationApi';
import { getGroup } from '../../api/groupApi';
import { useExams } from '../../hooks/useExams';
import { useGroups } from '../../hooks/useGroups';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import type { ExamResponse, UpdateExamRequest } from '../../types/exam';

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function toUpdateRequest(exam: ExamResponse, overrides: Partial<UpdateExamRequest>): UpdateExamRequest {
  const { id: _id, status: _status, totalQuestions: _totalQuestions, createdOn: _createdOn, ...form } = exam;
  return { ...form, ...overrides };
}

interface PublishOptions {
  visibility: 'All' | 'Selected';
  selectedGroupIds: string[];
  notifyStudents: boolean;
  includeReportCard: boolean;
}

export default function PublishResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: groups } = useGroups();
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ready' | 'published'>('ready');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<PublishOptions>({
    visibility: 'All',
    selectedGroupIds: [],
    notifyStudents: true,
    includeReportCard: true,
  });
  const [feedback, setFeedback] = useState<string>('');

  const loading = isLoadingExams || isLoadingResults;

  const examStats = useMemo(() => {
    const byExam = new Map<string, typeof allResults>();
    for (const r of allResults) {
      const list = byExam.get(r.examId) ?? [];
      list.push(r);
      byExam.set(r.examId, list);
    }
    return (exams ?? []).map((exam) => {
      const results = byExam.get(exam.id) ?? [];
      const passed = results.filter((r) => r.passed).length;
      const lastSubmitted = results.reduce(
        (max, r) => (r.submittedAtUtc > max ? r.submittedAtUtc : max),
        results[0]?.submittedAtUtc ?? '',
      );
      return {
        exam,
        candidates: results.length,
        passed,
        failed: results.length - passed,
        passPercent: results.length === 0 ? 0 : (passed / results.length) * 100,
        completedOn: lastSubmitted,
      };
    });
  }, [exams, allResults]);

  const readyExams = examStats.filter((s) => s.exam.status === 'Published' && !s.exam.showResult && s.candidates > 0);
  const publishedExams = examStats.filter((s) => s.exam.showResult);

  const publishMutation = useMutation({
    mutationFn: async (examIds: string[]) => {
      for (const examId of examIds) {
        const exam = exams?.find((e) => e.id === examId);
        if (!exam) continue;

        await updateExam(examId, toUpdateRequest(exam, { showResult: true }));

        if (options.notifyStudents) {
          const message = options.includeReportCard
            ? `Results for "${exam.title}" have been published. Your detailed report card is available to download.`
            : `Results for "${exam.title}" have been published.`;

          if (options.visibility === 'All') {
            await createNotification({
              title: 'Results Published',
              message,
              type: 'Result',
              sendTo: 'ExamCandidates',
              userIds: null,
              relatedExamId: examId,
              sendNow: true,
              scheduledAtUtc: null,
            });
          } else {
            const groupDetails = await Promise.all(options.selectedGroupIds.map((id) => getGroup(id)));
            const userIds = Array.from(new Set(groupDetails.flatMap((g) => g.memberUserIds)));
            if (userIds.length > 0) {
              await createNotification({
                title: 'Results Published',
                message,
                type: 'Result',
                sendTo: 'SelectedStudents',
                userIds,
                relatedExamId: examId,
                sendNow: true,
                scheduledAtUtc: null,
              });
            }
          }
        }
      }
    },
    onSuccess: (_data, examIds) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setSelectedIds(new Set());
      setFeedback(`Published results for ${examIds.length} exam${examIds.length === 1 ? '' : 's'}.`);
    },
  });

  const toggleSelected = (examId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const rows = activeTab === 'ready' ? readyExams : publishedExams;

  return (
    <AdminLayout active="Publish Results">
      <h1 className="h4 fw-bold mb-1 text-primary">Publish Results</h1>
      <p className="text-muted mb-4">Review and publish exam results to students.</p>

      <Alert variant="info" className="py-2 small">
        Publishing makes results visible to students immediately. Please review before publishing.
      </Alert>

      {feedback && (
        <Alert variant="success" className="py-2 small" dismissible onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      )}

      {publishMutation.isError && (
        <Alert variant="danger" className="py-2 small">
          Publishing failed for one or more exams. Please try again.
        </Alert>
      )}

      <div className="d-flex gap-2 mb-3">
        <Button
          variant={activeTab === 'ready' ? 'primary' : 'outline-secondary'}
          size="sm"
          onClick={() => setActiveTab('ready')}
        >
          Ready to Publish ({readyExams.length})
        </Button>
        <Button
          variant={activeTab === 'published' ? 'primary' : 'outline-secondary'}
          size="sm"
          onClick={() => setActiveTab('published')}
        >
          Published ({publishedExams.length})
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className={loading || rows.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              {activeTab === 'ready' ? 'No exams are ready to publish.' : 'No results published yet.'}
            </div>
          )}

          {!loading && rows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  {activeTab === 'ready' && <th className="ps-4" style={{ width: 40 }} />}
                  <th className={activeTab === 'ready' ? '' : 'ps-4'}>Exam Name</th>
                  <th>Exam Code</th>
                  <th>Completed On</th>
                  <th>Total Candidates</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass %</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.exam.id}>
                    {activeTab === 'ready' && (
                      <td className="ps-4">
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.has(s.exam.id)}
                          onChange={() => toggleSelected(s.exam.id)}
                        />
                      </td>
                    )}
                    <td className={activeTab === 'ready' ? 'fw-medium' : 'ps-4 fw-medium'}>{s.exam.title}</td>
                    <td>{s.exam.examCode ?? '—'}</td>
                    <td>{s.completedOn ? new Date(s.completedOn).toLocaleDateString() : '—'}</td>
                    <td>{s.candidates}</td>
                    <td>{s.passed}</td>
                    <td>{s.failed}</td>
                    <td>{Math.round(s.passPercent)}%</td>
                    <td className="pe-4">
                      {activeTab === 'ready' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate([s.exam.id])}
                        >
                          Publish
                        </Button>
                      ) : (
                        <Badge bg="success">Published</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {activeTab === 'ready' && readyExams.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <SectionHeader icon={<GearIcon />} title="Publishing Options" />
            <Row className="g-4">
              <Col md={6}>
                <Form.Label className="fw-bold small">Result Visibility</Form.Label>
                <Form.Check
                  type="radio"
                  name="visibility"
                  id="visibilityAll"
                  label="All Students"
                  checked={options.visibility === 'All'}
                  onChange={() => setOptions((prev) => ({ ...prev, visibility: 'All' }))}
                />
                <Form.Check
                  type="radio"
                  name="visibility"
                  id="visibilitySelected"
                  label="Selected Groups/Batches"
                  checked={options.visibility === 'Selected'}
                  onChange={() => setOptions((prev) => ({ ...prev, visibility: 'Selected' }))}
                />
                {options.visibility === 'Selected' && (
                  <Form.Select
                    multiple
                    className="mt-2"
                    htmlSize={Math.min(4, Math.max(2, groups?.length ?? 2))}
                    value={options.selectedGroupIds}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        selectedGroupIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                      }))
                    }
                  >
                    {(groups ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Form.Select>
                )}
                <div className="text-muted small mt-1">
                  Notifications go only to the selected groups; note that result visibility itself
                  (Show Result) is exam-wide, not per-group.
                </div>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-bold small d-block">Notify Students</Form.Label>
                <Form.Check
                  type="switch"
                  id="notifyStudents"
                  label="Send notification to students"
                  checked={options.notifyStudents}
                  onChange={(e) => setOptions((prev) => ({ ...prev, notifyStudents: e.target.checked }))}
                />
                <Form.Label className="fw-bold small d-block mt-3">Include Report Card</Form.Label>
                <Form.Check
                  type="switch"
                  id="includeReportCard"
                  label="Mention downloadable report card in notification"
                  checked={options.includeReportCard}
                  onChange={(e) => setOptions((prev) => ({ ...prev, includeReportCard: e.target.checked }))}
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-4">
              <Button
                variant="primary"
                disabled={selectedIds.size === 0 || publishMutation.isPending}
                onClick={() => publishMutation.mutate(Array.from(selectedIds))}
              >
                {publishMutation.isPending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Publishing...
                  </>
                ) : (
                  `Publish Selected Results (${selectedIds.size})`
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}
