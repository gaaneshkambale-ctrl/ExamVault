import { describe, expect, it } from 'vitest';
import { validateCreateExam } from './createExamValidation';
import type { CreateExamRequest } from '../types/exam';

const validForm: CreateExamRequest = {
  title: 'C# Fundamentals',
  description: 'Covers the basics of C#.',
  category: 'Technical',
  containsSections: false,
  creationMethod: 'Manual',
  durationMinutes: 60,
  totalMarks: 50,
  passingMarks: 25,
  instructions: 'Answer all questions.',
  examTypeId: 'exam-type-1',
  tags: '',
};

describe('validateCreateExam', () => {
  it('returns no errors for fully valid input', () => {
    expect(validateCreateExam(validForm)).toEqual({});
  });

  it('requires a title', () => {
    const errors = validateCreateExam({ ...validForm, title: '   ' });
    expect(errors.title).toBe('Title is required.');
  });

  it('requires a category', () => {
    const errors = validateCreateExam({ ...validForm, category: '' });
    expect(errors.category).toBe('Category is required.');
  });

  it('rejects a duration that is not positive', () => {
    const errors = validateCreateExam({ ...validForm, durationMinutes: 0 });
    expect(errors.durationMinutes).toBe('Duration must be greater than 0.');
  });

  it('rejects total marks that are not positive', () => {
    const errors = validateCreateExam({ ...validForm, totalMarks: 0 });
    expect(errors.totalMarks).toBe('Total marks must be greater than 0.');
  });

  it('rejects negative passing marks', () => {
    const errors = validateCreateExam({ ...validForm, passingMarks: -1 });
    expect(errors.passingMarks).toBe('Passing marks cannot be negative.');
  });

  it('rejects passing marks above total marks', () => {
    const errors = validateCreateExam({ ...validForm, totalMarks: 50, passingMarks: 60 });
    expect(errors.passingMarks).toBe('Passing marks cannot exceed total marks.');
  });

  it('requires an exam type', () => {
    const errors = validateCreateExam({ ...validForm, examTypeId: null });
    expect(errors.examTypeId).toBe('Exam type is required.');
  });
});
