// Section-wise and question-difficulty aggregation for the Advance Exam
// Report's PDF and Excel exports - mirrors the exact same client-side join
// (QuestionResultResponse has no sectionId of its own, but Question Service's
// QuestionResponse does) ExamTypeSectionPerformance.tsx and
// ExamTypeQuestionAnalysis.tsx already use, just scoped to one exam's
// attempts instead of every exam of a type. Kept separate from
// advanceExamReport.ts (which the on-screen page also depends on, and whose
// AdvanceReportData shape is unrelated to this) since this analysis is
// export-only for now.
import type { AdminAttemptResultResponse } from '../types/result';
import type { QuestionResponse } from '../types/question';
import type { SectionResponse } from '../types/section';
import type { MyTenant } from '../types/tenant';

export interface SectionPerformanceStat {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  avgScore: number;
  accuracy: number;
}

export function buildSectionWiseStats(
  attempts: AdminAttemptResultResponse[],
  questions: QuestionResponse[],
  sections: SectionResponse[],
  examTitle: string,
): SectionPerformanceStat[] {
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));
  const sectionByQuestionId = new Map<string, string>();
  const questionCountBySection = new Map<string, number>();
  for (const q of questions) {
    if (!q.sectionId) continue;
    sectionByQuestionId.set(q.id, q.sectionId);
    questionCountBySection.set(q.sectionId, (questionCountBySection.get(q.sectionId) ?? 0) + 1);
  }

  // Non-sectioned exam (or no section data loaded) - fall back to one
  // synthetic row for the whole exam, same "Overall" fallback
  // generateResultPdf.ts's own per-student sectionStats prop uses, just
  // labelled with the exam's title instead of "Overall".
  if (sectionByQuestionId.size === 0) {
    if (attempts.length === 0) return [];
    const totalScore = attempts.reduce((sum, a) => sum + a.totalScore, 0);
    const totalMarks = attempts.reduce((sum, a) => sum + a.totalMarks, 0);
    return [
      {
        sectionId: 'overall',
        sectionName: examTitle,
        totalQuestions: questions.length,
        avgScore: Math.round((totalScore / attempts.length) * 10) / 10,
        accuracy: totalMarks === 0 ? 0 : Math.round((totalScore / totalMarks) * 100),
      },
    ];
  }

  const byId = new Map<string, { marksAwarded: number; marks: number; attemptCount: number }>();
  for (const attempt of attempts) {
    const touched = new Set<string>();
    for (const q of attempt.questions) {
      const sectionId = sectionByQuestionId.get(q.questionId);
      if (!sectionId) continue;
      const entry = byId.get(sectionId) ?? { marksAwarded: 0, marks: 0, attemptCount: 0 };
      entry.marksAwarded += q.marksAwarded;
      entry.marks += q.marks;
      touched.add(sectionId);
      byId.set(sectionId, entry);
    }
    touched.forEach((id) => {
      byId.get(id)!.attemptCount += 1;
    });
  }

  return Array.from(byId.entries())
    .map(([sectionId, agg]) => ({
      sectionId,
      sectionName: sectionNameById.get(sectionId) ?? 'Unknown Section',
      totalQuestions: questionCountBySection.get(sectionId) ?? 0,
      avgScore: agg.attemptCount === 0 ? 0 : Math.round((agg.marksAwarded / agg.attemptCount) * 10) / 10,
      accuracy: agg.marks === 0 ? 0 : Math.round((agg.marksAwarded / agg.marks) * 100),
    }))
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName));
}

export interface QuestionDifficultyStat {
  questionId: string;
  questionText: string;
  correct: number;
  attempts: number;
  percentCorrect: number;
}

/** Every question this exam has, ranked hardest (lowest % correct) first - same isCorrect/selectedOptionId-based correctness definition ExamTypeQuestionAnalysis.tsx already uses elsewhere in the app. */
export function buildQuestionDifficulty(attempts: AdminAttemptResultResponse[]): QuestionDifficultyStat[] {
  const byId = new Map<string, { questionText: string; correct: number; attempts: number }>();
  for (const attempt of attempts) {
    for (const q of attempt.questions) {
      const entry = byId.get(q.questionId) ?? { questionText: q.questionText, correct: 0, attempts: 0 };
      entry.attempts += 1;
      if (q.isCorrect) entry.correct += 1;
      byId.set(q.questionId, entry);
    }
  }
  return Array.from(byId.entries())
    .map(([questionId, v]) => ({
      questionId,
      questionText: v.questionText,
      correct: v.correct,
      attempts: v.attempts,
      percentCorrect: v.attempts === 0 ? 0 : Math.round((v.correct / v.attempts) * 100),
    }))
    .sort((a, b) => a.percentCorrect - b.percentCorrect);
}

// Shared by both exportAdvanceExamReportPdf.ts and exportAdvanceExamReportExcel.ts
// so the two exports are built from the exact same extra data instead of one
// silently drifting behind the other.
export interface AdvanceReportExtras {
  sectionStats: SectionPerformanceStat[];
  questionDifficulty: QuestionDifficultyStat[];
  organization?: MyTenant;
  generatedByName?: string;
}
