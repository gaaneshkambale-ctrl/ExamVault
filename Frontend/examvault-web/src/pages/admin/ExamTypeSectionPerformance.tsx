import { useMemo, useState } from 'react';
import { Card, Col, Form, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { BookIcon, CheckCircleIcon } from '../../components/reports/ReportIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';
import { useQuestionsByExamIds } from '../../hooks/useQuestions';
import { useSectionsByExamIds } from '../../hooks/useSections';

interface SectionAgg {
  sectionId: string;
  sectionName: string;
  examId: string;
  examTitle: string;
  marksAwarded: number;
  marks: number;
  attemptCount: number;
}

// Only feasible with data this app actually has: QuestionResultResponse
// (per-question marks/marksAwarded on a scored attempt) carries no
// sectionId of its own, but QuestionResponse (Question Service) does - so
// this joins the two client-side per question, rather than adding a new
// backend endpoint. Sections have no passing-marks field of their own
// (SectionRequest has none), so this only ever shows an average score % per
// section, never a per-section pass/fail - that concept doesn't exist here.
export default function ExamTypeSectionPerformance() {
  const { typeId } = useParams<{ typeId: string }>();
  const { examType, examsOfType, resultsOfType, isLoading: isLoadingType } = useExamTypeReportData(typeId);

  const sectionedExams = useMemo(() => examsOfType.filter((e) => e.containsSections), [examsOfType]);
  const sectionedExamIds = useMemo(() => sectionedExams.map((e) => e.id), [sectionedExams]);

  const { questionsByExam, isLoading: isLoadingQuestions } = useQuestionsByExamIds(sectionedExamIds);
  const { sectionsByExam, isLoading: isLoadingSections } = useSectionsByExamIds(sectionedExamIds);
  const isLoading = isLoadingType || isLoadingQuestions || isLoadingSections;

  const [examFilter, setExamFilter] = useState('All');

  const sectionAggs = useMemo(() => {
    if (sectionedExamIds.length === 0) return [];

    const examTitleById = new Map(sectionedExams.map((e) => [e.id, e.title]));
    // questionId -> { sectionId, examId } - only for questions that are
    // actually assigned to a section (an unassigned question contributes
    // to nothing here, same as it contributes to no section anywhere else).
    const sectionByQuestionId = new Map<string, { sectionId: string; examId: string }>();
    const sectionNameById = new Map<string, string>();
    for (const examId of sectionedExamIds) {
      for (const section of sectionsByExam[examId] ?? []) {
        sectionNameById.set(section.id, section.name);
      }
      for (const question of questionsByExam[examId] ?? []) {
        if (question.sectionId) {
          sectionByQuestionId.set(question.id, { sectionId: question.sectionId, examId });
        }
      }
    }

    const byKey = new Map<string, SectionAgg>();
    for (const attempt of resultsOfType ?? []) {
      if (!sectionedExamIds.includes(attempt.examId)) continue;
      if (examFilter !== 'All' && attempt.examId !== examFilter) continue;

      const touchedSections = new Set<string>();
      for (const q of attempt.questions) {
        const location = sectionByQuestionId.get(q.questionId);
        if (!location) continue;

        const key = location.sectionId;
        const entry = byKey.get(key) ?? {
          sectionId: location.sectionId,
          sectionName: sectionNameById.get(location.sectionId) ?? 'Unknown Section',
          examId: location.examId,
          examTitle: examTitleById.get(location.examId) ?? 'Unknown Exam',
          marksAwarded: 0,
          marks: 0,
          attemptCount: 0,
        };
        entry.marksAwarded += q.marksAwarded;
        entry.marks += q.marks;
        touchedSections.add(key);
        byKey.set(key, entry);
      }
      for (const key of touchedSections) {
        byKey.get(key)!.attemptCount += 1;
      }
    }

    return Array.from(byKey.values())
      .map((s) => ({ ...s, averagePercent: s.marks === 0 ? 0 : Math.round((s.marksAwarded / s.marks) * 100) }))
      .sort((a, b) => a.examTitle.localeCompare(b.examTitle) || a.sectionName.localeCompare(b.sectionName));
  }, [resultsOfType, sectionedExamIds, sectionedExams, questionsByExam, sectionsByExam, examFilter]);

  const overallAveragePercent = useMemo(() => {
    const totalAwarded = sectionAggs.reduce((sum, s) => sum + s.marksAwarded, 0);
    const totalMarks = sectionAggs.reduce((sum, s) => sum + s.marks, 0);
    return totalMarks === 0 ? 0 : Math.round((totalAwarded / totalMarks) * 100);
  }, [sectionAggs]);

  return (
    <AdminLayout active="Exam Type Performance">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / By Exam Type / Section Performance</p>
          <h1 className="h4 fw-bold mb-1 text-primary">
            Section Performance{examType ? ` – ${examType.name}` : ''}
          </h1>
        </div>
        <Link to={`/admin/reports/exam-type/${typeId}`} className="btn btn-outline-secondary btn-sm">
          &larr; Back to Details
        </Link>
      </div>
      <p className="text-muted mb-4">
        Average score by section, across every sectioned {examType ? examType.name.toLowerCase() : ''} exam.
      </p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && sectionedExams.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            No sectioned exams in this exam type yet - section-level performance only applies to exams built
            with sections.
          </Card.Body>
        </Card>
      )}

      {!isLoading && sectionedExams.length > 0 && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<BookIcon />} label="Sectioned Exams" value={sectionedExams.length.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<BookIcon />} label="Sections Analyzed" value={sectionAggs.length.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Overall Average Score"
                value={`${overallAveragePercent}%`}
                iconBg="#f0fdf4"
                iconColor="#16a34a"
              />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="p-3 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <SectionHeader icon={<BookIcon />} title="Section Performance" />
                <Form.Select size="sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)} style={{ width: 220 }}>
                  <option value="All">All Sectioned Exams</option>
                  {sectionedExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </Form.Select>
              </div>
              {sectionAggs.length === 0 ? (
                <div className="text-center text-muted py-5">No attempts on any sectioned exam yet.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">Section</th>
                      <th>Exam</th>
                      <th>Attempts</th>
                      <th style={{ width: 200 }}>Average Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionAggs.map((s) => (
                      <tr key={s.sectionId}>
                        <td className="ps-4 fw-medium">{s.sectionName}</td>
                        <td className="text-muted">{s.examTitle}</td>
                        <td>{s.attemptCount}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <ProgressBar
                              now={s.averagePercent}
                              variant={s.averagePercent < 50 ? 'danger' : s.averagePercent < 75 ? 'warning' : 'success'}
                              style={{ width: 100, height: 8 }}
                            />
                            <span className="small text-muted">{s.averagePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
