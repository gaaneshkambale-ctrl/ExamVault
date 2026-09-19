import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useExams } from './useExams';
import { getMyAttempt } from '../api/submissionApi';
import { getMyAssignmentForExam } from '../api/assignmentApi';
import { getAssignmentStatus } from '../types/assignment';

// Same "Live" definition MyExams.tsx's own tab counts already use (an exam
// the student hasn't started/completed yet, whose assignment window is open
// right now - or has no scheduled window at all, meaning it's available with
// nothing to wait for) - kept in sync with that page's rowStatus logic
// rather than a second, looser definition drifting alongside it. Used for
// the sidebar's "My Exams" badge.
export function useLiveExamCount(): number {
  const { data: exams } = useExams();
  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const attemptQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['submissions', 'mine', exam.id],
      queryFn: () => getMyAttempt(exam.id),
      enabled: !!exams,
    })),
  });
  const assignmentQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['assignments', 'mine', exam.id],
      queryFn: () => getMyAssignmentForExam(exam.id),
      enabled: !!exams,
    })),
  });

  return publishedExams.reduce((count, exam, index) => {
    if (attemptQueries[index]?.data) {
      // Already started or completed - not "available" anymore.
      return count;
    }
    const assignment = assignmentQueries[index]?.data;
    const startAtUtc = assignment?.startAtUtc ?? exam.startAtUtc;
    const endAtUtc = assignment?.endAtUtc ?? exam.endAtUtc;
    const isLive = startAtUtc && endAtUtc ? getAssignmentStatus(startAtUtc, endAtUtc) === 'Active' : true;
    return isLive ? count + 1 : count;
  }, 0);
}
