import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { createSection, updateSection } from '../../api/sectionApi';
import { bulkAssignSection } from '../../api/questionApi';
import { useSection, useSections } from '../../hooks/useSections';
import { useQuestionsBySection, useUnassignedQuestions } from '../../hooks/useQuestions';
import type { NavigationType, SectionRequest } from '../../types/section';
import { extractServerError } from '../../utils/apiError';

const NAVIGATION_TYPES: { value: NavigationType; label: string; description: string }[] = [
  { value: 'Free', label: 'Free Navigation', description: 'Students can go to any question in this section.' },
  { value: 'Sequential', label: 'Sequential Navigation', description: 'Students must complete questions in order.' },
  { value: 'Locked', label: 'Locked Navigation', description: 'Once answered, questions cannot be revisited.' },
];

const initialForm: SectionRequest = {
  name: '',
  description: '',
  instructions: '',
  displayOrder: 0,
  questionCount: 0,
  marks: 0,
  durationMinutes: 30,
  navigationType: 'Free',
  negativeMarkingEnabled: false,
  negativeMarks: 0,
  shuffleQuestions: true,
  shuffleOptions: true,
  allowReview: true,
};

export default function SectionForm() {
  const { examId, sectionId } = useParams<{ examId: string; sectionId?: string }>();
  const isEdit = !!sectionId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromWizard = searchParams.get('wizard') === 'true';
  const queryClient = useQueryClient();

  const { data: existingSection, isLoading: isLoadingSection } = useSection(examId, sectionId);
  const { data: existingSections } = useSections(examId, !isEdit);
  const { data: unassignedQuestions, isLoading: isLoadingUnassigned } = useUnassignedQuestions(examId);
  const { data: sectionQuestions, isLoading: isLoadingSectionQuestions } = useQuestionsBySection(
    examId,
    sectionId,
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<SectionRequest>(initialForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'All' | 'MultipleChoice' | 'TrueFalse'>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [searchText, setSearchText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && existingSection) {
      const { id: _id, examId: _examId, createdAtUtc: _createdAtUtc, ...rest } = existingSection;
      setForm(rest);
    } else if (!isEdit && existingSections) {
      setForm((prev) => ({ ...prev, displayOrder: existingSections.length }));
    }
  }, [isEdit, existingSection, existingSections]);

  useEffect(() => {
    if (sectionQuestions) {
      const ids = new Set(sectionQuestions.map((q) => q.id));
      setSelectedIds(ids);
      setOriginalAssignedIds(ids);
    }
  }, [sectionQuestions]);

  const availableQuestions = [
    ...(unassignedQuestions ?? []),
    ...(sectionQuestions ?? []),
  ].filter((q, index, all) => all.findIndex((x) => x.id === q.id) === index);

  const filteredQuestions = availableQuestions.filter((q) => {
    if (typeFilter !== 'All' && q.questionType !== typeFilter) return false;
    if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
    if (searchText.trim() && !q.questionText.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const selectedQuestions = availableQuestions.filter((q) => selectedIds.has(q.id));
  const totalMarksSelected = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateField = <K extends keyof SectionRequest>(field: K, value: SectionRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sections', examId] });
    queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', examId] });
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const savedSection = isEdit
        ? await updateSection(examId!, sectionId!, form)
        : await createSection(examId!, form);

      const deselected = [...originalAssignedIds].filter((id) => !selectedIds.has(id));
      if (deselected.length > 0) {
        await bulkAssignSection(null, deselected);
      }
      const selectedList = [...selectedIds];
      if (selectedList.length > 0) {
        await bulkAssignSection(savedSection.id, selectedList);
      }

      invalidateAll();
      navigate(
        fromWizard ? `/admin/exams/${examId}/wizard/sections` : `/admin/exams/${examId}/sections`,
      );
    } catch (error) {
      setSubmitError(extractServerError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && isLoadingSection) {
    return (
      <AdminLayout active="Exams">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">{isEdit ? 'Edit Section' : 'Add Section'}</h1>
      </div>

      <div className="d-flex gap-2 mb-4">
        {(['Information', 'Rules', 'Question Assignment'] as const).map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3;
          return (
            <Button
              key={label}
              variant={step === stepNumber ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setStep(stepNumber)}
            >
              {stepNumber}. {label}
            </Button>
          );
        })}
      </div>

      {submitError && <Alert variant="danger">{submitError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {step === 1 && (
            <>
              <Form.Group className="mb-3" controlId="sectionName">
                <Form.Label className="fw-bold">Section Name</Form.Label>
                <Form.Control
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. C# Fundamentals"
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="sectionDescription">
                <Form.Label className="fw-bold">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="sectionInstructions">
                <Form.Label className="fw-bold">Instructions (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.instructions}
                  onChange={(e) => updateField('instructions', e.target.value)}
                />
              </Form.Group>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3" controlId="sectionQuestionCount">
                    <Form.Label className="fw-bold">Question Count</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={form.questionCount}
                      onChange={(e) => updateField('questionCount', Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3" controlId="sectionMarks">
                    <Form.Label className="fw-bold">Marks</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={form.marks}
                      onChange={(e) => updateField('marks', Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3" controlId="sectionDuration">
                    <Form.Label className="fw-bold">Duration (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={form.durationMinutes}
                      onChange={(e) => updateField('durationMinutes', Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3" controlId="sectionDisplayOrder">
                    <Form.Label className="fw-bold">Display Order</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={form.displayOrder}
                      onChange={(e) => updateField('displayOrder', Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end">
                <Button variant="primary" onClick={() => setStep(2)}>
                  Next: Rules
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4">
                <div className="fw-bold mb-2">Navigation Type</div>
                {NAVIGATION_TYPES.map((nav) => (
                  <Form.Check
                    key={nav.value}
                    type="radio"
                    id={`nav-${nav.value}`}
                    name="navigationType"
                    className="mb-2"
                    checked={form.navigationType === nav.value}
                    onChange={() => updateField('navigationType', nav.value)}
                    label={
                      <>
                        <div className="fw-medium">{nav.label}</div>
                        <div className="text-muted small">{nav.description}</div>
                      </>
                    }
                  />
                ))}
              </div>

              <Form.Check
                type="switch"
                id="sectionNegativeMarking"
                className="mb-2"
                label="Negative Marking"
                checked={form.negativeMarkingEnabled}
                onChange={(e) => updateField('negativeMarkingEnabled', e.target.checked)}
              />
              {form.negativeMarkingEnabled && (
                <Form.Group className="mb-3" style={{ maxWidth: 200 }} controlId="sectionNegativeMarks">
                  <Form.Label className="small text-muted">Marks deducted for wrong answer</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    step={0.25}
                    value={form.negativeMarks}
                    onChange={(e) => updateField('negativeMarks', Number(e.target.value))}
                  />
                </Form.Group>
              )}

              <Form.Check
                type="switch"
                id="sectionShuffleQuestions"
                className="mb-2 mt-3"
                label="Shuffle Questions"
                checked={form.shuffleQuestions}
                onChange={(e) => updateField('shuffleQuestions', e.target.checked)}
              />
              <Form.Check
                type="switch"
                id="sectionShuffleOptions"
                className="mb-2"
                label="Shuffle Options"
                checked={form.shuffleOptions}
                onChange={(e) => updateField('shuffleOptions', e.target.checked)}
              />
              <Form.Check
                type="switch"
                id="sectionAllowReview"
                className="mb-2"
                label="Students can review questions in this section"
                checked={form.allowReview}
                onChange={(e) => updateField('allowReview', e.target.checked)}
              />

              <div className="d-flex justify-content-between mt-4">
                <Button variant="outline-secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setStep(3)}>
                  Next: Question Assignment
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Row className="g-2 mb-3">
                <Col md={3}>
                  <Form.Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  >
                    <option value="All">All Types</option>
                    <option value="MultipleChoice">Multiple Choice</option>
                    <option value="TrueFalse">True/False</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value as typeof difficultyFilter)}
                  >
                    <option value="All">All Difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Control
                    type="search"
                    placeholder="Search questions..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </Col>
              </Row>

              {(isLoadingUnassigned || (isEdit && isLoadingSectionQuestions)) && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" />
                </div>
              )}

              {!isLoadingUnassigned && filteredQuestions.length === 0 && (
                <div className="text-center text-muted py-4">
                  No unassigned questions match these filters. Add questions to this exam first from
                  the Exam page, then come back to assign them here.
                </div>
              )}

              {!isLoadingUnassigned && filteredQuestions.length > 0 && (
                <Table responsive hover className="align-middle">
                  <thead className="text-muted small text-uppercase table-light">
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q) => (
                      <tr
                        key={q.id}
                        role="button"
                        onClick={() => toggleQuestion(q.id)}
                        className={selectedIds.has(q.id) ? 'table-primary' : undefined}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <Form.Check
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleQuestion(q.id)}
                          />
                        </td>
                        <td>{q.questionText}</td>
                        <td>{q.questionType === 'MultipleChoice' ? 'MCQ' : 'True/False'}</td>
                        <td>
                          <Badge bg="secondary">{q.difficulty}</Badge>
                        </td>
                        <td>{q.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <div className="text-muted small">
                  Selected Questions: <strong>{selectedIds.size}</strong> &nbsp;|&nbsp; Total Marks:{' '}
                  <strong>{totalMarksSelected}</strong>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? 'Saving...' : isEdit ? 'Save Section' : 'Add Section'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
