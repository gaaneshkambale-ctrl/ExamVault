import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import CreateQuestionModal from '../../components/CreateQuestionModal';
import DeleteQuestionButton from '../../components/DeleteQuestionButton';
import { EditIcon } from '../../components/icons/ActionIcons';
import { createSection, updateSection } from '../../api/sectionApi';
import { bulkAssignSection } from '../../api/questionApi';
import { useExam } from '../../hooks/useExams';
import { useSection, useSections } from '../../hooks/useSections';
import { useQuestionsBySection, useUnassignedQuestions } from '../../hooks/useQuestions';
import type { NavigationType, SectionRequest } from '../../types/section';
import type { QuestionResponse, QuestionType } from '../../types/question';
import { extractServerError } from '../../utils/apiError';

function stepFromParam(value: string | null): 1 | 2 | 3 {
  return value === '2' ? 2 : value === '3' ? 3 : 1;
}

const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const INSTRUCTIONS_MAX = 2000;

const STEP_META: { step: 1 | 2 | 3; label: string; sublabel: string }[] = [
  { step: 1, label: 'Information', sublabel: 'Section details' },
  { step: 2, label: 'Rules', sublabel: 'Set section rules' },
  { step: 3, label: 'Question Assignment', sublabel: 'Add questions' },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function TipCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

const QUICK_TIPS = [
  'Keep section names short and meaningful',
  'Set appropriate time and marks',
  'Organize sections in logical order',
  'You can reorder sections later',
];

interface NumberFieldProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  required?: boolean;
  hint: string;
  footnote?: string;
  value: number;
  min: number;
  step?: number;
  onChange: (value: number) => void;
}

function NumberField({ icon, iconBg, label, required, hint, footnote, value, min, step, onChange }: NumberFieldProps) {
  return (
    <Card className="border shadow-none h-100">
      <Card.Body className="p-3">
        <div className="d-flex align-items-start gap-2 mb-2">
          <div
            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
            style={{ width: 32, height: 32, background: iconBg }}
          >
            {icon}
          </div>
          <div>
            <div className="fw-bold small">
              {label} {required && <span className="text-danger">*</span>}
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{hint}</div>
          </div>
        </div>
        <Form.Control
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {footnote && <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>{footnote}</div>}
      </Card.Body>
    </Card>
  );
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

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

  const { data: exam } = useExam(examId);
  const { data: existingSection, isLoading: isLoadingSection } = useSection(examId, sectionId);
  const { data: existingSections } = useSections(examId, !isEdit);
  const { data: unassignedQuestions, isLoading: isLoadingUnassigned } = useUnassignedQuestions(examId);
  const { data: sectionQuestions, isLoading: isLoadingSectionQuestions } = useQuestionsBySection(
    examId,
    sectionId,
  );

  const [step, setStep] = useState<1 | 2 | 3>(stepFromParam(searchParams.get('step')));
  const [form, setForm] = useState<SectionRequest>(initialForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'All' | QuestionType>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [searchText, setSearchText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);

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
  const allFilteredSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id));

  // AI-generated exams get the multi-step AI generator instead of the manual form.
  const useAiGenerate = exam?.creationMethod === 'AiGenerated';

  // Average marks per question, from the section's own planned Marks / Question Count -
  // used to default the manual Create Question modal's Marks field instead of always 1.
  const defaultQuestionMarks =
    form.questionCount > 0 ? Math.max(1, Math.round(form.marks / form.questionCount)) : 1;

  const goToCreateQuestion = async () => {
    if (!useAiGenerate) {
      setShowCreateQuestion(true);
      return;
    }

    const wizardParam = fromWizard ? '&wizard=true' : '';

    if (isEdit && sectionId) {
      navigate(`/admin/exams/${examId}/questions/ai-generate?sectionId=${sectionId}${wizardParam}`);
      return;
    }

    // New, unsaved section: save it first so there's a real section to attach questions to -
    // otherwise navigating to the AI generator would lose the in-progress Information/Rules data.
    setSubmitError('');
    setSubmitting(true);
    try {
      const saved = await createSection(examId!, form);
      invalidateAll();
      navigate(`/admin/exams/${examId}/questions/ai-generate?sectionId=${saved.id}${wizardParam}`);
    } catch (error) {
      setSubmitError(extractServerError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Distinct from goToCreateQuestion: AI-generated exams still get a manual entry
  // option alongside "Generate with AI" rather than the two being mutually exclusive.
  const openManualQuestion = () => setShowCreateQuestion(true);

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

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredQuestions.forEach((q) => next.delete(q.id));
      } else {
        filteredQuestions.forEach((q) => next.add(q.id));
      }
      return next;
    });
  };

  const updateField = <K extends keyof SectionRequest>(field: K, value: SectionRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuestionCreated = (questions: QuestionResponse[]) => {
    queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', examId] });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      questions.forEach((q) => next.add(q.id));
      return next;
    });
    setShowCreateQuestion(false);
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

  const cancelTarget = fromWizard ? `/admin/exams/${examId}/wizard/sections` : `/admin/exams/${examId}/sections`;

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">{isEdit ? 'Edit Section' : 'Add Section'}</h1>
        <p className="text-muted mb-0">
          {isEdit ? "Update this section's details and rules" : 'Organize your exam by adding sections'}
        </p>
      </div>

      <div className="d-flex align-items-start mb-4">
        {STEP_META.map(({ step: s, label, sublabel }, i) => {
          const isDone = s < step;
          const isActive = s === step;
          return (
            <div key={s} className="d-flex align-items-center" style={{ flex: i === STEP_META.length - 1 ? '0 0 auto' : '1 1 auto' }}>
              <button
                type="button"
                onClick={() => setStep(s)}
                className="btn p-0 border-0 bg-transparent d-flex flex-column align-items-center text-center"
                style={{ minWidth: 140 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    background: isDone ? '#198754' : isActive ? '#4f46e5' : '#e9ecef',
                    color: isDone || isActive ? 'white' : '#6c757d',
                  }}
                >
                  {isDone ? <CheckIcon /> : s}
                </div>
                <div className="small mt-2" style={{ color: isActive ? '#4f46e5' : isDone ? '#198754' : '#6c757d', fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{sublabel}</div>
              </button>
              {i < STEP_META.length - 1 && (
                <div className="flex-grow-1" style={{ height: 2, background: isDone ? '#198754' : '#e9ecef', marginBottom: 30 }} />
              )}
            </div>
          );
        })}
      </div>

      {submitError && <Alert variant="danger">{submitError}</Alert>}

      {step === 1 ? (
        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{ width: 36, height: 36, background: '#eef2ff' }}
                  >
                    <DocumentIcon />
                  </div>
                  <div>
                    <div className="fw-bold">Section Information</div>
                    <div className="text-muted small">Enter the basic details for this section</div>
                  </div>
                </div>

                <Form.Group className="mb-3" controlId="sectionName">
                  <Form.Label className="fw-bold">
                    Section Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.name}
                    maxLength={NAME_MAX}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="E.g. C# Fundamentals"
                  />
                  <div className="d-flex justify-content-between">
                    <Form.Text className="text-muted">Give a clear and descriptive name for this section</Form.Text>
                    <div className="text-muted small ms-auto">{form.name.length}/{NAME_MAX}</div>
                  </div>
                </Form.Group>
                <Form.Group className="mb-3" controlId="sectionDescription">
                  <Form.Label className="fw-bold">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={DESCRIPTION_MAX}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                  <div className="d-flex justify-content-between">
                    <Form.Text className="text-muted">Describe the topics or purpose of this section</Form.Text>
                    <div className="text-muted small ms-auto">{form.description.length}/{DESCRIPTION_MAX}</div>
                  </div>
                </Form.Group>
                <Form.Group className="mb-4" controlId="sectionInstructions">
                  <Form.Label className="fw-bold">Instructions (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={INSTRUCTIONS_MAX}
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    placeholder="Enter special instructions for students in this section"
                  />
                  <div className="d-flex justify-content-between">
                    <Form.Text className="text-muted">&nbsp;</Form.Text>
                    <div className="text-muted small ms-auto">{form.instructions.length}/{INSTRUCTIONS_MAX}</div>
                  </div>
                </Form.Group>

                <Row className="g-3 mb-4">
                  <Col md={3}>
                    <NumberField
                      icon={<QuestionIcon />}
                      iconBg="#dbeafe"
                      label="Question Count"
                      required
                      hint="Total questions in this section"
                      value={form.questionCount}
                      min={0}
                      onChange={(v) => updateField('questionCount', v)}
                    />
                  </Col>
                  <Col md={3}>
                    <NumberField
                      icon={<StarIcon />}
                      iconBg="#fef3c7"
                      label="Marks"
                      required
                      hint="Total marks for this section"
                      value={form.marks}
                      min={0}
                      onChange={(v) => updateField('marks', v)}
                    />
                  </Col>
                  <Col md={3}>
                    <NumberField
                      icon={<ClockIcon />}
                      iconBg="#d1fae5"
                      label="Duration (minutes)"
                      required
                      hint="Time allocated for this section"
                      value={form.durationMinutes}
                      min={1}
                      onChange={(v) => updateField('durationMinutes', v)}
                    />
                  </Col>
                  <Col md={3}>
                    <NumberField
                      icon={<OrderIcon />}
                      iconBg="#dbeafe"
                      label="Display Order"
                      required
                      hint="Order of this section"
                      footnote="Lower numbers appear first"
                      value={form.displayOrder}
                      min={0}
                      onChange={(v) => updateField('displayOrder', v)}
                    />
                  </Col>
                </Row>

                <div className="d-flex justify-content-between">
                  <Link to={cancelTarget} className="btn btn-outline-secondary">
                    Cancel
                  </Link>
                  <Button variant="primary" onClick={() => setStep(2)}>
                    Next: Rules &rarr;
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <EyeIcon />
                  <div>
                    <div className="fw-bold small">Section Preview</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>This is how the section will appear</div>
                  </div>
                </div>
                {form.name.trim() ? (
                  <div>
                    <div className="fw-bold mb-1">{form.name}</div>
                    {form.description && <div className="text-muted small mb-2">{form.description}</div>}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="light" text="dark" className="border">{form.questionCount} questions</Badge>
                      <Badge bg="light" text="dark" className="border">{form.marks} marks</Badge>
                      <Badge bg="light" text="dark" className="border">{form.durationMinutes} min</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                      <rect x="5" y="3" width="14" height="18" rx="2" />
                      <path d="M9 3v-.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 2.5V3" />
                      <line x1="8" y1="9" x2="16" y2="9" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="13" y2="17" />
                    </svg>
                    <div className="fw-bold small">No section created yet</div>
                    <div className="text-muted small">Fill in the section details to see preview</div>
                  </div>
                )}
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <BulbIcon />
                  <div className="fw-bold small">Quick Tips</div>
                </div>
                {QUICK_TIPS.map((tip) => (
                  <div key={tip} className="d-flex align-items-start gap-2 mb-2">
                    <div className="mt-1"><TipCheckIcon /></div>
                    <div className="small text-muted">{tip}</div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
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
              <Row className="g-4">
                <Col md={3}>
                  <Form.Group className="mb-3" controlId="sectionQuestionTypeFilter">
                    <Form.Label className="fw-bold small">Question Type</Form.Label>
                    <Form.Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                    >
                      <option value="All">All</option>
                      <option value="MultipleChoice">Single Choice</option>
                      <option value="MultiSelect">Multiple Choice</option>
                      <option value="TrueFalse">True/False</option>
                      <option value="CodeProgram">Code / Programming</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="sectionDifficultyFilter">
                    <Form.Label className="fw-bold small">Difficulty</Form.Label>
                    <Form.Select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value as typeof difficultyFilter)}
                    >
                      <option value="All">All</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group controlId="sectionQuestionSearch">
                    <Form.Label className="fw-bold small">Search Question</Form.Label>
                    <Form.Control
                      type="search"
                      placeholder="Search by keyword..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={9}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold">Available Questions</div>
                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        disabled={submitting}
                        onClick={goToCreateQuestion}
                      >
                        {useAiGenerate
                          ? isEdit || submitting
                            ? '+ Generate with AI'
                            : 'Save & Generate with AI'
                          : '+ Create Question'}
                      </Button>
                      {useAiGenerate && (
                        <Button variant="outline-secondary" size="sm" onClick={openManualQuestion}>
                          + Manual Question
                        </Button>
                      )}
                      {filteredQuestions.length > 0 && (
                        <Button variant="outline-secondary" size="sm" onClick={toggleSelectAll}>
                          {allFilteredSelected ? 'Clear All' : 'Select All'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {(isLoadingUnassigned || (isEdit && isLoadingSectionQuestions)) && (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" />
                    </div>
                  )}

                  {!isLoadingUnassigned && filteredQuestions.length === 0 && (
                    <div className="text-center text-muted py-4">
                      No unassigned questions match these filters. Click "
                      {useAiGenerate ? '+ Manual Question' : '+ Create Question'}" above to add one.
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
                          <th>Actions</th>
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
                            <td>{QUESTION_TYPE_LABELS[q.questionType]}</td>
                            <td>
                              <Badge bg="secondary">{q.difficulty}</Badge>
                            </td>
                            <td>{q.marks}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-2">
                                <Link
                                  to={`/admin/questions/${q.id}/edit`}
                                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                                  style={{ width: 32, height: 32 }}
                                  title="Edit"
                                  aria-label="Edit question"
                                >
                                  <EditIcon />
                                </Link>
                                <DeleteQuestionButton
                                  questionId={q.id}
                                  examId={q.examId}
                                  iconOnly
                                  onDeleted={() =>
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(q.id);
                                      return next;
                                    })
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Col>
              </Row>

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
      )}

      {examId && (
        <CreateQuestionModal
          examId={examId}
          sectionName={form.name}
          defaultMarks={defaultQuestionMarks}
          allowImport={!useAiGenerate}
          show={showCreateQuestion}
          onClose={() => setShowCreateQuestion(false)}
          onCreated={handleQuestionCreated}
        />
      )}
    </AdminLayout>
  );
}
