import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import type { DraftQuestion, DraftQuestionOption, GenerateDifficulty } from '../types/ai';

interface DraftEditorModalProps {
  draft: DraftQuestion | null;
  onCancel: () => void;
  onSave: (updated: DraftQuestion) => void;
}

let nextOptionKey = 0;

interface OptionState extends DraftQuestionOption {
  key: number;
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function DraftEditorModal({ draft, onCancel, onSave }: DraftEditorModalProps) {
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<GenerateDifficulty>('Medium');
  const [options, setOptions] = useState<OptionState[]>([]);

  useEffect(() => {
    if (draft) {
      setQuestionText(draft.questionText);
      setMarks(draft.marks);
      setDifficulty(draft.difficulty);
      setOptions(draft.options.map((o) => ({ key: nextOptionKey++, ...o })));
    }
  }, [draft]);

  if (!draft) {
    return null;
  }

  const updateOptionText = (key: number, text: string) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, optionText: text } : o)));
  };

  const markCorrect = (key: number) => {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));
  };

  const toggleCorrect = (key: number) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, isCorrect: !o.isCorrect } : o)));
  };

  const addOption = () =>
    setOptions((prev) => [...prev, { key: nextOptionKey++, optionText: '', isCorrect: false }]);

  const removeOption = (key: number) =>
    setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.key !== key) : prev));

  const handleSave = () => {
    onSave({
      ...draft,
      questionText,
      marks,
      difficulty,
      options: options.map(({ optionText, isCorrect }) => ({ optionText, isCorrect })),
    });
  };

  return (
    <Modal show onHide={onCancel} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit Generated Question</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3" controlId="draftQuestionText">
          <Form.Label className="fw-bold">Question</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="draftMarks" style={{ maxWidth: 160 }}>
          <Form.Label className="fw-bold">Marks</Form.Label>
          <Form.Control
            type="number"
            min={1}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="draftDifficulty" style={{ maxWidth: 200 }}>
          <Form.Label className="fw-bold">Difficulty</Form.Label>
          <Form.Select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as GenerateDifficulty)}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </Form.Select>
        </Form.Group>

        <Form.Label className="fw-bold">Options</Form.Label>
        {options.map((option, index) => (
          <div key={option.key} className="d-flex align-items-center gap-2 mb-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light border fw-bold flex-shrink-0"
              style={{ width: 32, height: 32 }}
            >
              {optionLetter(index)}
            </span>
            <Form.Control
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option.optionText}
              disabled={draft.questionType === 'TrueFalse'}
              onChange={(e) => updateOptionText(option.key, e.target.value)}
            />
            {draft.questionType !== 'TrueFalse' && options.length > 2 && (
              <Button variant="link" className="text-danger" onClick={() => removeOption(option.key)}>
                Remove
              </Button>
            )}
          </div>
        ))}
        {draft.questionType !== 'TrueFalse' && (
          <Button variant="outline-secondary" size="sm" className="mb-3" onClick={addOption}>
            + Add Option
          </Button>
        )}

        {draft.questionType === 'MultiSelect' ? (
          <Form.Group className="mb-2" controlId="draftCorrectAnswers">
            <Form.Label className="fw-bold">Correct Answers (select all that apply)</Form.Label>
            {options.map((option, index) => (
              <Form.Check
                key={option.key}
                type="checkbox"
                id={`draftCorrect-${option.key}`}
                label={`${optionLetter(index)} - ${option.optionText || `Option ${index + 1}`}`}
                checked={option.isCorrect}
                onChange={() => toggleCorrect(option.key)}
              />
            ))}
          </Form.Group>
        ) : (
          <Form.Group className="mb-2" controlId="draftCorrectAnswer" style={{ maxWidth: 320 }}>
            <Form.Label className="fw-bold">Correct Answer</Form.Label>
            <Form.Select
              value={options.find((o) => o.isCorrect)?.key ?? ''}
              onChange={(e) => markCorrect(Number(e.target.value))}
            >
              <option value="" disabled>
                Select correct answer
              </option>
              {options.map((option, index) => (
                <option key={option.key} value={option.key}>
                  {optionLetter(index)} - {option.optionText || `Option ${index + 1}`}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
