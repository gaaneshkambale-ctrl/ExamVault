import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExam, useExams } from '../../hooks/useExams';
import { useSection } from '../../hooks/useSections';
import { generateQuestions } from '../../api/aiApi';
import { DISABLED_QUESTION_TYPES } from '../../types/ai';
import type {
  GenerateDifficulty,
  GenerateQuestionsRequest,
  GenerateQuestionType,
  GenerateSource,
} from '../../types/ai';
import { extractServerError } from '../../utils/apiError';

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

function ExistingExamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function TopicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DocumentUploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ShapesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><circle cx="17.5" cy="6.5" r="3.5" /><path d="M3 21l7-8 4 4 7-8" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function TipCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

interface SourceCardProps {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function SourceCard({ icon, label, selected, disabled, onClick }: SourceCardProps) {
  return (
    <Card
      role={disabled ? undefined : 'button'}
      onClick={disabled ? undefined : onClick}
      className="flex-fill"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderColor: selected ? '#4f46e5' : undefined,
        borderWidth: selected ? 2 : 1,
        background: selected ? '#f5f3ff' : undefined,
      }}
    >
      <Card.Body className="d-flex align-items-center gap-2 py-3">
        <span style={{ color: selected ? '#4f46e5' : '#6c757d' }}>{icon}</span>
        <span className="fw-medium small" style={{ color: selected ? '#4f46e5' : undefined }}>{label}</span>
      </Card.Body>
    </Card>
  );
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function SummaryRow({ icon, label, value }: SummaryRowProps) {
  return (
    <div className="d-flex align-items-start gap-2 mb-3">
      <div className="mt-1">{icon}</div>
      <div>
        <div className="text-muted small mb-0">{label}</div>
        <div className="fw-bold small">{value}</div>
      </div>
    </div>
  );
}

const GENERATION_TIPS = [
  'Be specific with topics and subtopics',
  'Select appropriate difficulty levels',
  'Use a mix of question types',
  'Review and edit questions after generation',
];

const QUESTION_TYPE_LABELS: Record<GenerateQuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
};

export default function AiGenerateQuestion() {
  const { examId: urlExamId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('sectionId');
  const fromWizard = searchParams.get('wizard') === 'true';

  const { data: lockedExam } = useExam(urlExamId);
  const { data: allExams, isLoading: isLoadingExams } = useExams();
  const { data: lockedSection } = useSection(urlExamId, sectionId ?? undefined);

  const sectionReturnTo = sectionId
    ? `/admin/exams/${urlExamId}/sections/${sectionId}/edit?step=3${fromWizard ? '&wizard=true' : ''}`
    : undefined;

  // This flow generates questions with AI - only exams tagged AI Generated
  // are eligible sources, so Manual exams (added to by hand) don't clutter
  // the picker.
  const aiExams = allExams?.filter((exam) => exam.creationMethod === 'AiGenerated');

  const [selectedExamId, setSelectedExamId] = useState(urlExamId ?? '');
  const [source, setSource] = useState<GenerateSource>('ExistingExam');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);

  // When generating for a specific section, default the count to whatever was
  // planned for that section on the Information step, instead of the generic 10.
  useEffect(() => {
    if (lockedSection && lockedSection.questionCount > 0) {
      setQuestionCount(lockedSection.questionCount);
    }
  }, [lockedSection]);

  const [questionTypes, setQuestionTypes] = useState<GenerateQuestionType[]>(['MultipleChoice']);
  const [difficultyLevels, setDifficultyLevels] = useState<GenerateDifficulty[]>(['Medium']);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const selectedExam = urlExamId
    ? lockedExam
    : aiExams?.find((e) => e.id === selectedExamId);

  const toggleQuestionType = (type: GenerateQuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleDifficulty = (level: GenerateDifficulty) => {
    setDifficultyLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  // Generating from within a section's Question Assignment step should target that
  // section's own topic, not the whole exam's - the exam title is too broad once
  // questions are being scoped to one section.
  const existingExamTopic = lockedSection
    ? `${lockedSection.name}${lockedSection.description ? `: ${lockedSection.description}` : ''}`
    : selectedExam
      ? `${selectedExam.title}${selectedExam.description ? `: ${selectedExam.description}` : ''}`
      : '';

  const buildRequest = (): GenerateQuestionsRequest => ({
    source,
    examId: selectedExamId || null,
    topic: source === 'ExistingExam' ? existingExamTopic : topic,
    questionCount,
    questionTypes,
    difficultyLevels,
    additionalInstructions: additionalInstructions.trim() || null,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setGenerateError('Please select which exam these questions will be added to.');
      return;
    }

    const request = buildRequest();
    setIsGenerating(true);
    setGenerateError('');
    try {
      const drafts = await generateQuestions(request);
      navigate('/admin/questions/ai-generate/preview', {
        state: {
          drafts,
          examId: selectedExamId,
          request,
          backTo: urlExamId
            ? `/admin/exams/${urlExamId}/questions/ai-generate`
            : '/admin/questions/ai-generate',
          returnTo: sectionReturnTo,
        },
      });
    } catch (error) {
      setGenerateError(extractServerError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <p className="text-muted small mb-1">Create Exam / AI Generate Questions</p>
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generate Questions</h1>
        <p className="text-muted mb-0">
          {selectedExam ? `Exam: ${selectedExam.title}` : 'Pick an exam to get started'}
          {lockedSection ? ` · Section: ${lockedSection.name}` : ''}
        </p>
      </div>

      <Row className="g-4">
      <Col lg={8}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {generateError && <Alert variant="danger">{generateError}</Alert>}

          <div className="d-flex align-items-center gap-2 mb-4">
            <div
              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
              style={{ width: 36, height: 36, background: '#eef2ff' }}
            >
              <SparkleIcon />
            </div>
            <div>
              <div className="fw-bold">AI Question Generation</div>
              <div className="text-muted small">Generate relevant and high-quality questions using AI</div>
            </div>
          </div>

          <Form noValidate onSubmit={handleSubmit}>
            <Form.Label className="fw-bold">Choose Source</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-1">
              <SourceCard
                icon={<ExistingExamIcon />}
                label="From Existing Exam"
                selected={source === 'ExistingExam'}
                onClick={() => setSource('ExistingExam')}
              />
              <SourceCard
                icon={<TopicIcon />}
                label="From Topic / Text"
                selected={source === 'TopicText'}
                onClick={() => setSource('TopicText')}
              />
              <SourceCard icon={<DocumentUploadIcon />} label="From Document" selected={false} disabled onClick={() => {}} />
            </div>
            <p className="text-muted small mb-4 mt-2">
              {source === 'ExistingExam'
                ? 'Select an exam to generate questions from - approved questions are added to it.'
                : 'Describe a topic or paste reference text for the AI to generate questions from.'}
            </p>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="aiSourceExam">
                  <Form.Label className="fw-bold">
                    Exam <span className="text-danger">*</span>
                  </Form.Label>
                  {urlExamId ? (
                    <Form.Control type="text" value={lockedExam?.title ?? ''} disabled readOnly />
                  ) : (
                    <Form.Select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      disabled={isLoadingExams}
                    >
                      <option value="">Select exam</option>
                      {(aiExams ?? []).map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.title}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                  <Form.Text className="text-muted">
                    {!isLoadingExams && aiExams?.length === 0
                      ? 'No AI Generated exams yet. Create one with Creation Method set to "AI Generated" first.'
                      : 'Approved questions are added to this exam.'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="aiQuestionCount" style={{ maxWidth: 200 }}>
                  <Form.Label className="fw-bold">Number of Questions</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={20}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </Form.Group>
              </Col>
            </Row>

            {source === 'TopicText' && (
              <Form.Group className="mb-3" controlId="aiSourceTopic">
                <Form.Label className="fw-bold">Topic / Text</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Object-oriented programming basics"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </Form.Group>
            )}

            <Form.Label className="fw-bold">Question Types</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-1">
              <Button
                type="button"
                variant={questionTypes.includes('MultipleChoice') ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => toggleQuestionType('MultipleChoice')}
              >
                Single Choice
              </Button>
              <Button
                type="button"
                variant={questionTypes.includes('MultiSelect') ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => toggleQuestionType('MultiSelect')}
              >
                Multiple Choice
              </Button>
              <Button
                type="button"
                variant={questionTypes.includes('TrueFalse') ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => toggleQuestionType('TrueFalse')}
              >
                True / False
              </Button>
              {DISABLED_QUESTION_TYPES.map((label) => (
                <Button key={label} type="button" variant="outline-secondary" size="sm" disabled>
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-muted small mb-4">
              Short/Long Answer and Code/Programming aren't available yet - the AI generator has no
              free-text grading or test-case-authoring step for those types today.
            </p>

            <Form.Label className="fw-bold">Difficulty Level</Form.Label>
            <div className="d-flex gap-4 mb-4">
              {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                <Form.Check
                  key={level}
                  type="checkbox"
                  id={`aiDifficulty${level}`}
                  label={level}
                  checked={difficultyLevels.includes(level)}
                  onChange={() => toggleDifficulty(level)}
                />
              ))}
            </div>

            <Form.Group className="mb-4" controlId="aiInstructions">
              <Form.Label className="fw-bold">Additional Instructions (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter any specific instructions for AI..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Link
                to={
                  sectionReturnTo ?? (urlExamId ? `/admin/exams/${urlExamId}/edit` : '/admin/exams')
                }
                className="btn btn-outline-secondary"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isGenerating ||
                  !selectedExamId ||
                  questionTypes.length === 0 ||
                  difficultyLevels.length === 0 ||
                  (source === 'TopicText' && !topic.trim())
                }
              >
                {isGenerating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      </Col>

      <Col lg={4}>
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                style={{ width: 32, height: 32, background: '#eef2ff' }}
              >
                <ListIcon />
              </div>
              <div className="fw-bold small">Generation Summary</div>
            </div>
            <SummaryRow
              icon={<TargetIcon />}
              label="Source"
              value={source === 'ExistingExam' ? 'Existing Exam' : 'Topic / Text'}
            />
            <SummaryRow
              icon={<ExistingExamIcon />}
              label={source === 'ExistingExam' ? 'Exam' : 'Topic'}
              value={source === 'ExistingExam' ? (selectedExam?.title ?? '—') : (topic || '—')}
            />
            <SummaryRow icon={<ListIcon />} label="Number of Questions" value={String(questionCount)} />
            <SummaryRow
              icon={<BarChartIcon />}
              label="Difficulty"
              value={difficultyLevels.length > 0 ? difficultyLevels.join(', ') : '—'}
            />
            <SummaryRow
              icon={<ShapesIcon />}
              label="Question Types"
              value={
                questionTypes.length > 0
                  ? questionTypes.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')
                  : '—'
              }
            />
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <div className="d-flex align-items-center gap-2 mb-3">
              <BulbIcon />
              <div className="fw-bold small">Tips for Better Results</div>
            </div>
            {GENERATION_TIPS.map((tip) => (
              <div key={tip} className="d-flex align-items-start gap-2 mb-2">
                <div className="mt-1"><TipCheckIcon /></div>
                <div className="small text-muted">{tip}</div>
              </div>
            ))}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm" style={{ background: '#eff6ff' }}>
          <Card.Body>
            <div className="d-flex gap-2">
              <InfoIcon />
              <div className="small" style={{ color: '#1e40af' }}>
                AI-generated questions are suggestions. Please review and approve before finalizing.
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
      </Row>
    </AdminLayout>
  );
}
