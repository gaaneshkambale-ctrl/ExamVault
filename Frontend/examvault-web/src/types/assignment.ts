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
  enableLiveVideo: boolean;
}

export interface UpdateAssignmentRequest {
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
  enableLiveVideo: boolean;
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
  enableLiveVideo: boolean;
  createdAtUtc: string;
  cancelledAtUtc: string | null;
}

export interface MyAssignmentResponse {
  id: string;
  examId: string;
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
  enableLiveVideo: boolean;
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
  cancelledAtUtc: string | null;
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

// Separate from getAssignmentStatus (used by AdminDashboard/ActiveExams,
// left untouched) - the Exam Scheduled page's mockup has exactly four
// buckets with no distinct "Active/Ongoing" card, so "currently in
// progress" folds into StartingToday here rather than getting its own
// bucket.
export type ScheduleStatus = 'Cancelled' | 'Completed' | 'StartingToday' | 'Upcoming';

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getScheduleStatus(assignment: {
  startAtUtc: string;
  endAtUtc: string;
  cancelledAtUtc: string | null;
}): ScheduleStatus {
  if (assignment.cancelledAtUtc) return 'Cancelled';

  const now = new Date();
  const start = new Date(assignment.startAtUtc);
  const end = new Date(assignment.endAtUtc);

  if (now.getTime() > end.getTime()) return 'Completed';
  if (now.getTime() >= start.getTime() || isSameCalendarDay(now, start)) return 'StartingToday';
  return 'Upcoming';
}
