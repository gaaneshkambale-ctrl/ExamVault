import { describe, expect, it } from 'vitest';
import { validateCreateQuestion } from './createQuestionValidation';
import type { CreateQuestionRequest } from '../types/question';

const validMultipleChoice: CreateQuestionRequest = {
  examId: 'exam-1',
  questionType: 'MultipleChoice',
  questionText: 'What is the base class for all classes in C#?',
  marks: 1,
  difficulty: 'Easy',
  shuffleOptions: false,
  options: [
    { optionText: 'object', isCorrect: true },
    { optionText: 'System.Object', isCorrect: false },
  ],
};

const validCodeProgram: CreateQuestionRequest = {
  examId: 'exam-1',
  questionType: 'CodeProgram',
  questionText: 'Write a function that reverses a string.',
  marks: 5,
  difficulty: 'Medium',
  shuffleOptions: false,
  options: [],
  programmingLanguage: 'Python',
  allowLanguageChange: false,
};

const validTrueFalse: CreateQuestionRequest = {
  examId: 'exam-1',
  questionType: 'TrueFalse',
  questionText: 'ASP.NET Core middleware runs in the order it is registered.',
  marks: 1,
  difficulty: 'Medium',
  shuffleOptions: false,
  options: [
    { optionText: 'True', isCorrect: true },
    { optionText: 'False', isCorrect: false },
  ],
};

describe('validateCreateQuestion', () => {
  it('returns no errors for a valid Multiple Choice question', () => {
    expect(validateCreateQuestion(validMultipleChoice)).toEqual({});
  });

  it('returns no errors for a valid True/False question', () => {
    expect(validateCreateQuestion(validTrueFalse)).toEqual({});
  });

  it('requires question text', () => {
    const errors = validateCreateQuestion({ ...validMultipleChoice, questionText: '   ' });
    expect(errors.questionText).toBe('Question text is required.');
  });

  it('requires positive marks', () => {
    const errors = validateCreateQuestion({ ...validMultipleChoice, marks: 0 });
    expect(errors.marks).toBe('Marks must be greater than 0.');
  });

  it('requires exactly one correct option', () => {
    const errors = validateCreateQuestion({
      ...validMultipleChoice,
      options: [
        { optionText: 'object', isCorrect: false },
        { optionText: 'System.Object', isCorrect: false },
      ],
    });
    expect(errors.options).toBe('Exactly one option must be marked correct.');
  });

  it('requires at least two options for Multiple Choice', () => {
    const errors = validateCreateQuestion({
      ...validMultipleChoice,
      options: [{ optionText: 'object', isCorrect: true }],
    });
    expect(errors.options).toBe('Add at least two options.');
  });

  it('requires exactly two options for True/False', () => {
    const errors = validateCreateQuestion({
      ...validTrueFalse,
      options: [
        { optionText: 'True', isCorrect: true },
        { optionText: 'False', isCorrect: false },
        { optionText: 'Maybe', isCorrect: false },
      ],
    });
    expect(errors.options).toBe('True/False questions need exactly two options.');
  });

  it('returns no errors for a valid Code/Programming question', () => {
    expect(validateCreateQuestion(validCodeProgram)).toEqual({});
  });

  it('requires a programming language for Code/Programming', () => {
    const errors = validateCreateQuestion({ ...validCodeProgram, programmingLanguage: undefined });
    expect(errors.programmingLanguage).toBe('Select a programming language.');
  });

  it('ignores empty options for Code/Programming', () => {
    const errors = validateCreateQuestion({ ...validCodeProgram, options: [] });
    expect(errors.options).toBeUndefined();
  });
});
