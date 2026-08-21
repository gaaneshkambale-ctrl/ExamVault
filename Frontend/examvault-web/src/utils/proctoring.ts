import type { ExamAttemptResponse, ProctoringViolationType, ViolationSeverity } from '../types/submission';

export type RiskLevel = 'Low' | 'Medium' | 'High';

// Matches RecordProctoringViolationHandler's SeverityFor() on the backend -
// multiple-faces/monitors are the strongest real signals of someone else
// being involved, a bare right-click is the weakest, everything else sits
// in between. Kept here only for display fallback; the server is the source
// of truth for a violation's actual persisted Severity.
export const violationLabel: Record<ProctoringViolationType, string> = {
  NoFaceDetected: 'No Face Detected',
  MultipleFacesDetected: 'Multiple Faces Detected',
  TabSwitch: 'Tab Switching',
  MultipleTabs: 'Multiple Tabs',
  CopyPaste: 'Copy/Paste',
  RightClick: 'Right-Click',
  MultipleMonitors: 'Multiple Monitors',
};

export const violationDescription: Record<ProctoringViolationType, string> = {
  NoFaceDetected: "Student's face was not visible in the camera frame.",
  MultipleFacesDetected: 'Secondary person detected in the camera frame.',
  TabSwitch: 'Navigated away from the active exam tab.',
  MultipleTabs: 'Same exam attempt detected open in another tab.',
  CopyPaste: 'Copy, cut, or paste action attempted during the exam.',
  RightClick: 'Right-click / context menu attempted during the exam.',
  MultipleMonitors: 'A second display was detected connected to the device.',
};

export const severityVariant: Record<ViolationSeverity, string> = {
  Low: 'secondary',
  Medium: 'warning',
  Critical: 'danger',
};

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
