import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExam } from '../../hooks/useExams';
import type { GenerateDifficulty, GenerateQuestionType, GenerateSource } from '../../types/ai';

export default function AiGenerateQuestions() {
  const { examId } = useParams<{ examId: string }>();
  const { data: exam } = useExam(examId);

  const [source, setSource] = useState<GenerateSource>('ExistingExam');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<GenerateQuestionType[]>(['MultipleChoice']);
  const [difficultyLevels, setDifficultyLevels] = useState<GenerateDifficulty[]>(['Medium']);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [showNotWiredNotice, setShowNotWiredNotice] = useState(false);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Not wired to a real endpoint yet - AI Milestone Day 27 is the UI shell only.
    // Day 28 wires this to POST /api/ai/generate-questions and shows real drafts.
    setShowNotWiredNotice(true);
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generate Questions</h1>
        <p className="text-muted mb-0">
          {exam ? `Exam: ${exam.title}` : 'Loading exam...'}
        </p>
      </div>

      {showNotWiredNotice && (
        <Alert variant="info" onClose={() => setShowNotWiredNotice(false)} dismissible>
          AI generation isn't connected yet - this form is the Day 27 shell only. The next
          step wires this button to a real AI provider and shows generated drafts to review.
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
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
                {source === 'ExistingExam' ? (
                  <Form.Group className="mb-3" controlId="aiSourceExam">
                    <Form.Label className="fw-bold">Exam</Form.Label>
                    <Form.Control type="text" value={exam?.title ?? ''} disabled readOnly />
                  </Form.Group>
                ) : (
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
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="aiQuestionCount" style={{ maxWidth: 200 }}>
                  <Form.Label className="fw-bold">Number of Questions</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </Form.Group>
              </Col>
            </Row>

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
              <Link to={`/admin/exams/${examId}/edit`} className="btn btn-outline-secondary">
                Cancel
              </Link>
              <Button type="submit" variant="primary">
                Generate Questions
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
