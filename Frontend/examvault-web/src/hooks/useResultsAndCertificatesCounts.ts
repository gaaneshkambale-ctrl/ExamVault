import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useExams } from './useExams';
import { getMyResult } from '../api/resultApi';
import { isCertificateEligible } from '../utils/certificateId';
import type { ResultSummaryResponse } from '../types/result';

// Both counts come from the same per-exam getMyResult query set (My Results
// and My Certificates already each build/would build their own copy of this
// same ['results','mine',examId] query - react-query dedupes identical query
// keys, so computing both counts here doesn't cost more than one). A
// certificate is earned for every exam the student scored 80%+ on (see
// isCertificateEligible/MyCertificates.tsx's own comment) - no separate
// issuance step or persisted certificate record to count instead.
export function useResultsAndCertificatesCounts(): { resultsCount: number; certificatesCount: number } {
  const { data: exams } = useExams();
  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  const results = resultQueries
    .map((q) => q.data)
    .filter((result): result is ResultSummaryResponse => !!result);

  return {
    resultsCount: results.length,
    certificatesCount: results.filter(isCertificateEligible).length,
  };
}
