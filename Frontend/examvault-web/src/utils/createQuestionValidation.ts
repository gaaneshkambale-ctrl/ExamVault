import type { QuestionFormFields } from '../types/question';

export interface CreateQuestionFormErrors {
  questionText?: string;
  marks?: string;
  options?: string;
}

export function validateCreateQuestion(form: QuestionFormFields): CreateQuestionFormErrors {
  const errors: CreateQuestionFormErrors = {};

  if (!form.questionText.trim()) {
    errors.questionText = 'Question text is required.';
  } else if (form.questionText.length > 2000) {
    errors.questionText = 'Question text must be 2000 characters or fewer.';
  }

  if (!Number.isFinite(form.marks) || form.marks <= 0) {
    errors.marks = 'Marks must be greater than 0.';
  }

  const correctCount = form.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    errors.options = 'Exactly one option must be marked correct.';
  } else if (form.questionType === 'MultipleChoice' && form.options.length < 2) {
    errors.options = 'Add at least two options.';
  } else if (form.questionType === 'TrueFalse' && form.options.length !== 2) {
    errors.options = 'True/False questions need exactly two options.';
  } else if (form.options.some((o) => !o.optionText.trim())) {
    errors.options = 'Options cannot be empty.';
  }

  return errors;
}
