import type { ExamAttemptResponse } from '../types/submission';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export function attemptViolationCount(attempt: ExamAttemptResponse): number {
  return (
    attempt.noFaceDetectedCount +
    attempt.multipleFacesDetectedCount +
    attempt.tabSwitchCount +
    attempt.multipleTabsCount +
    attempt.copyPasteCount +
    attempt.rightClickCount +
    attempt.multipleMonitorsCount
  );
}

export function getRiskLevel(violationCount: number): RiskLevel {
  if (violationCount >= 4) {
    return 'High';
  }
  if (violationCount >= 1) {
    return 'Medium';
  }
  return 'Low';
}
