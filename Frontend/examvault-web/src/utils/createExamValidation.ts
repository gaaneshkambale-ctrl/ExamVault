import type { CreateExamRequest } from '../types/exam';

export function validateCreateExam(
  form: CreateExamRequest,
): Partial<Record<keyof CreateExamRequest, string>> {
  const errors: Partial<Record<keyof CreateExamRequest, string>> = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required.';
  } else if (form.title.length > 200) {
    errors.title = 'Title must be 200 characters or fewer.';
  }

  if (form.description.length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer.';
  }

  if (!Number.isFinite(form.durationMinutes) || form.durationMinutes <= 0) {
    errors.durationMinutes = 'Duration must be greater than 0.';
  }

  if (!Number.isFinite(form.totalMarks) || form.totalMarks <= 0) {
    errors.totalMarks = 'Total marks must be greater than 0.';
  }

  if (!Number.isFinite(form.passingMarks) || form.passingMarks < 0) {
    errors.passingMarks = 'Passing marks cannot be negative.';
  } else if (form.passingMarks > form.totalMarks) {
    errors.passingMarks = 'Passing marks cannot exceed total marks.';
  }

  if (form.instructions.length > 2000) {
    errors.instructions = 'Instructions must be 2000 characters or fewer.';
  }

  return errors;
}
