import { describe, expect, it } from 'vitest';
import { computeSectionStats } from './sectionStats';
import type { QuestionResultResponse } from '../types/result';

function makeQuestion(overrides: Partial<QuestionResultResponse> & { questionId: string }): QuestionResultResponse {
  return {
    questionText: 'Q',
    marks: 10,
    marksAwarded: 0,
    selectedOptionId: null,
    isCorrect: false,
    options: [],
    questionType: 'MCQ',
    answerText: null,
    isPendingGrading: false,
    selectedOptionIds: null,
    ...overrides,
  };
}

describe('computeSectionStats', () => {
  it('groups questions by their section name, in encounter order', () => {
    const sectionIdByQuestionId = new Map([
      ['q1', 'sec-1'],
      ['q2', 'sec-2'],
    ]);
    const sectionNameById = new Map([
      ['sec-1', 'SQL Basic'],
      ['sec-2', 'Linq Basic'],
    ]);
    const questions = [
      makeQuestion({ questionId: 'q1', marks: 10, marksAwarded: 6, isCorrect: true, selectedOptionId: 'opt' }),
      makeQuestion({ questionId: 'q2', marks: 10, marksAwarded: 3, isCorrect: false, selectedOptionId: 'opt' }),
    ];

    const stats = computeSectionStats(questions, sectionIdByQuestionId, sectionNameById);

    expect(stats).toEqual([
      { name: 'SQL Basic', total: 1, correct: 1, incorrect: 0, skipped: 0, score: 6, maxScore: 10 },
      { name: 'Linq Basic', total: 1, correct: 0, incorrect: 1, skipped: 0, score: 3, maxScore: 10 },
    ]);
  });

  it('falls back to "Unsectioned" for a question with no matching section', () => {
    const questions = [
      makeQuestion({ questionId: 'q1', marks: 5, marksAwarded: 5, isCorrect: true, selectedOptionId: 'opt' }),
    ];

    const stats = computeSectionStats(questions, new Map(), new Map());

    expect(stats).toEqual([{ name: 'Unsectioned', total: 1, correct: 1, incorrect: 0, skipped: 0, score: 5, maxScore: 5 }]);
  });

  it('counts an unattempted question as skipped, not incorrect', () => {
    const questions = [
      makeQuestion({ questionId: 'q1', selectedOptionId: null, selectedOptionIds: null, answerText: null }),
    ];

    const stats = computeSectionStats(questions, new Map(), new Map());

    expect(stats[0]).toMatchObject({ correct: 0, incorrect: 0, skipped: 1 });
  });

  it('accumulates multiple questions within the same section', () => {
    const sectionIdByQuestionId = new Map([
      ['q1', 'sec-1'],
      ['q2', 'sec-1'],
    ]);
    const sectionNameById = new Map([['sec-1', 'c# fundamental']]);
    const questions = [
      makeQuestion({ questionId: 'q1', marks: 10, marksAwarded: 10, isCorrect: true, selectedOptionId: 'opt' }),
      makeQuestion({ questionId: 'q2', marks: 10, marksAwarded: 0, selectedOptionId: 'opt', isCorrect: false }),
    ];

    const stats = computeSectionStats(questions, sectionIdByQuestionId, sectionNameById);

    expect(stats).toEqual([
      { name: 'c# fundamental', total: 2, correct: 1, incorrect: 1, skipped: 0, score: 10, maxScore: 20 },
    ]);
  });

  it('returns an empty array for no questions', () => {
    expect(computeSectionStats([], new Map(), new Map())).toEqual([]);
  });
});
