import { isQuestionCorrect, isSkipped } from './generateResultPdf';
import type { ResultPdfSectionStat } from './generateResultPdf';
import type { QuestionResultResponse } from '../types/result';

// Shared by StudentResultDetails.tsx's on-screen Section-wise tab and by both
// generateResultPdf.ts callers that have real section data available - keeps the
// on-screen breakdown and the downloaded PDF's breakdown from ever disagreeing.
export function computeSectionStats(
  resultQuestions: QuestionResultResponse[],
  sectionIdByQuestionId: Map<string, string | null | undefined>,
  sectionNameById: Map<string, string>,
): ResultPdfSectionStat[] {
  const byName = new Map<string, ResultPdfSectionStat>();
  for (const q of resultQuestions) {
    const sectionId = sectionIdByQuestionId.get(q.questionId);
    const name = (sectionId && sectionNameById.get(sectionId)) || 'Unsectioned';
    const entry = byName.get(name) ?? { name, total: 0, correct: 0, incorrect: 0, skipped: 0, score: 0, maxScore: 0 };
    entry.total += 1;
    entry.maxScore += q.marks;
    entry.score += q.marksAwarded;
    if (isSkipped(q)) entry.skipped += 1;
    else if (isQuestionCorrect(q)) entry.correct += 1;
    else entry.incorrect += 1;
    byName.set(name, entry);
  }
  return Array.from(byName.values());
}
