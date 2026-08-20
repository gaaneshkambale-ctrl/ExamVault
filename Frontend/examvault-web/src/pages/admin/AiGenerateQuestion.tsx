import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExam, useExams } from '../../hooks/useExams';
import { useSection } from '../../hooks/useSections';
import { generateQuestions } from '../../api/aiApi';
import type {
  GenerateDifficulty,
  GenerateQuestionsRequest,
  GenerateQuestionType,
  GenerateSource,
} from '../../types/ai';
import { extractServerError } from '../../utils/apiError';

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
  const aiExams = allExams?.filter((exam) => exam.examType === 'AiGenerated');

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
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generate Questions</h1>
        <p className="text-muted mb-0">
          {selectedExam ? `Exam: ${selectedExam.title}` : 'Pick an exam to get started'}
          {lockedSection ? ` · Section: ${lockedSection.name}` : ''}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {generateError && <Alert variant="danger">{generateError}</Alert>}

          <Form noValidate onSubmit={handleSubmit}>
            <Form.Label className="fw-bold">Choose Source</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant={source === 'ExistingExam' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => setSource('ExistingExam')}
              >
                From Existing Exam
              </Button>
              <Button
                type="button"
                variant={source === 'TopicText' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => setSource('TopicText')}
              >
                From Topic / Text
              </Button>
              <Button type="button" variant="outline-secondary" size="sm" disabled>
                From Document
              </Button>
            </div>

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
                      ? 'No AI Generated exams yet. Create one with Exam Type set to "AI Generated" first.'
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
            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant={questionTypes.includes('MultipleChoice') ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => toggleQuestionType('MultipleChoice')}
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
              <Button type="button" variant="outline-secondary" size="sm" disabled>
                Short Answer
              </Button>
            </div>

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
    </AdminLayout>
  );
}
