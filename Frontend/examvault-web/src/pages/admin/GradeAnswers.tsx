import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import UserAvatar from '../../components/UserAvatar';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useUsers } from '../../hooks/useUsers';
import { useUngradedAnswers } from '../../hooks/useSubmissions';
import { gradeAnswer } from '../../api/submissionApi';
import { extractServerError } from '../../utils/apiError';
import { PROGRAMMING_LANGUAGES } from '../../types/question';
import type { QuestionResponse } from '../../types/question';

function languageLabel(language: string | null | undefined): string {
  return PROGRAMMING_LANGUAGES.find((l) => l.value === language)?.label ?? language ?? '';
}

export default function GradeAnswers() {
  const { examId } = useParams<{ examId: string }>();
  const queryClient = useQueryClient();

  const { data: exam } = useExam(examId);
  const { data: questions } = useQuestions(examId);
  const { data: users } = useUsers();
  const { data: ungraded, isLoading, isError } = useUngradedAnswers(examId);

  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const questionById = useMemo(() => {
    const map = new Map<string, QuestionResponse>();
    for (const q of questions ?? []) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  const userById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; hasPhoto: boolean }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email, hasPhoto: user.hasPhoto });
    }
    return map;
  }, [users]);

  const rowKey = (attemptId: string, questionId: string) => `${attemptId}:${questionId}`;

  const handleSave = async (attemptId: string, questionId: string, maxMarks: number) => {
    const key = rowKey(attemptId, questionId);
    const raw = marksInput[key];
    const marks = Number(raw);

    if (raw === undefined || raw === '' || !Number.isFinite(marks) || marks < 0) {
      setRowErrors((prev) => ({ ...prev, [key]: 'Enter a valid mark.' }));
      return;
    }
    if (marks > maxMarks) {
      setRowErrors((prev) => ({ ...prev, [key]: `Cannot exceed ${maxMarks} marks.` }));
      return;
    }

    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSavingKey(key);
    try {
      await gradeAnswer(attemptId, questionId, marks);
      queryClient.invalidateQueries({ queryKey: ['submissions', 'ungraded', examId] });
    } catch (error) {
      setRowErrors((prev) => ({ ...prev, [key]: extractServerError(error) }));
    } finally {
      setSavingKey(null);
    }
  };

  const rows = ungraded ?? [];

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Grade Code Answers</h1>
        <p className="text-muted mb-0">{exam ? `Exam: ${exam.title}` : 'Loading exam...'}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || rows.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && !isLoading && (
            <Alert variant="danger" className="mb-0">
              Couldn't load ungraded answers. Please try again.
            </Alert>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              No code answers are waiting on grading for this exam.
            </div>
          )}

          {!isLoading && !isError && rows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Question</th>
                  <th>Submitted Answer</th>
                  <th style={{ width: 140 }}>Marks</th>
                  <th className="pe-4" style={{ width: 120 }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = rowKey(row.attemptId, row.questionId);
                  const question = questionById.get(row.questionId);
                  const user = userById.get(row.userId);
                  const maxMarks = question?.marks ?? 0;

                  return (
                    <tr key={key}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar
                            userId={row.userId}
                            fullName={user?.fullName ?? 'Student'}
                            hasPhoto={user?.hasPhoto ?? false}
                            size={32}
                          />
                          <div>
                            <div className="fw-medium">{user?.fullName ?? 'Unknown Student'}</div>
                            <div className="text-muted small">{user?.email ?? ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div className="fw-medium">{question?.questionText ?? 'Question'}</div>
                        {question?.programmingLanguage && (
                          <Badge bg="secondary-subtle" text="dark" className="mt-1">
                            {languageLabel(question.programmingLanguage)}
                          </Badge>
                        )}
                        <div className="text-muted small mt-1">Max marks: {maxMarks}</div>
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <pre
                          className="bg-body-tertiary border rounded p-2 mb-0 small"
                          style={{ maxHeight: 200, overflow: 'auto' }}
                        >
                          {row.answerText}
                        </pre>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          max={maxMarks}
                          size="sm"
                          value={marksInput[key] ?? ''}
                          onChange={(e) =>
                            setMarksInput((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          isInvalid={!!rowErrors[key]}
                        />
                        <Form.Control.Feedback type="invalid">{rowErrors[key]}</Form.Control.Feedback>
                      </td>
                      <td className="pe-4">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={savingKey === key}
                          onClick={() => void handleSave(row.attemptId, row.questionId, maxMarks)}
                        >
                          {savingKey === key ? <Spinner animation="border" size="sm" /> : 'Save'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="mt-3">
        <Link to={`/admin/exams/${examId}`} className="btn btn-outline-secondary">
          Back to Exam
        </Link>
      </div>
    </AdminLayout>
  );
}
