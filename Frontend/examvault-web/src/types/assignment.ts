export type AssignmentTargetType = 'Students' | 'Batch' | 'AllStudents';

export interface CreateAssignmentRequest {
  examId: string;
  targetType: AssignmentTargetType;
  userIds: string[] | null;
  groupId: string | null;
  startAtUtc: string;
  endAtUtc: string;
  timeZoneId: string;
  maxAttempts: number;
  allowLateJoin: boolean;
  graceTimeMinutes: number;
  showInstructions: boolean;
  showResultsAfterSubmit: boolean;
  showCorrectAnswers: boolean;
  allowReviewAfterSubmit: boolean;
  autoSubmitOnTimeOver: boolean;
  enableProctoring: boolean;
}

export interface ExamAssignmentResponse {
  id: string;
  assignmentNumber: number;
  examId: string;
  targetType: AssignmentTargetType;
  groupId: string | null;
  targetUserIds: string[];
  startAtUtc: string;
  endAtUtc: string;
  timeZoneId: string;
  maxAttempts: number;
  allowLateJoin: boolean;
  graceTimeMinutes: number;
  showInstructions: boolean;
  showResultsAfterSubmit: boolean;
  showCorrectAnswers: boolean;
  allowReviewAfterSubmit: boolean;
  autoSubmitOnTimeOver: boolean;
  enableProctoring: boolean;
  createdAtUtc: string;
}

export interface AssignmentListItemResponse {
  id: string;
  assignmentNumber: number;
  examId: string;
  examTitle: string;
  targetType: AssignmentTargetType;
  groupId: string | null;
  targetCount: number;
  startAtUtc: string;
  endAtUtc: string;
  createdAtUtc: string;
}

export type AssignmentStatus = 'Upcoming' | 'Active' | 'Expired';

export function getAssignmentStatus(startAtUtc: string, endAtUtc: string): AssignmentStatus {
  const now = Date.now();
  const start = new Date(startAtUtc).getTime();
  const end = new Date(endAtUtc).getTime();
  if (now < start) return 'Upcoming';
  if (now > end) return 'Expired';
  return 'Active';
}
