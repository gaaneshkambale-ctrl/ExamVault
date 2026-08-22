import type { NotificationType } from '../types/notification';

// Raw templates - {{examTitle}}/{{startDate}}/{{duration}} are batch-constant
// (same for every recipient) and get substituted client-side from the
// selected exam right before submit (see substituteExamFields). {{studentName}}/
// {{studentEmail}} genuinely vary per recipient within one batch, so those
// stay untouched here and get substituted server-side, per recipient, in
// NotificationPersistenceService.
export interface NotificationTemplate {
  id: string;
  label: string;
  type: NotificationType;
  title: string;
  message: string;
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'exam-assignment',
    label: 'Exam Assignment',
    type: 'Exam',
    title: 'Your {{examTitle}} Exam is Assigned',
    message:
      'Hello {{studentName}},\n\n' +
      'You have been assigned the {{examTitle}}.\n' +
      'Please log in to ExamVault to view your exam schedule.\n\n' +
      'Exam Date: {{startDate}}   Duration: {{duration}}',
  },
  {
    id: 'exam-reminder',
    label: 'Exam Reminder',
    type: 'Reminder',
    title: 'Reminder: {{examTitle}} starts soon',
    message:
      'Hello {{studentName}},\n\n' +
      'This is a reminder that your {{examTitle}} exam starts on {{startDate}}.\n' +
      'Duration: {{duration}}.',
  },
  {
    id: 'result-published',
    label: 'Result Published',
    type: 'Result',
    title: 'Your {{examTitle}} results are available',
    message:
      'Hello {{studentName}},\n\n' +
      'Your results for {{examTitle}} have been published.\n' +
      'Log in to ExamVault to view your score.',
  },
  {
    id: 'system-announcement',
    label: 'System Announcement',
    type: 'System',
    title: 'ExamVault Announcement',
    message: 'Hello {{studentName}},\n\n[Write your announcement here]',
  },
  {
    id: 'account-notice',
    label: 'Account Notice',
    type: 'Account',
    title: 'Account Update',
    message: 'Hello {{studentName}},\n\n[Write your account-related message here]',
  },
];

export const EXAM_FIELD_PLACEHOLDERS = ['{{examTitle}}', '{{startDate}}', '{{duration}}'];

export function containsExamFieldPlaceholder(text: string): boolean {
  return EXAM_FIELD_PLACEHOLDERS.some((p) => text.includes(p));
}

// Substitutes the batch-constant exam fields using the given exam. Leaves
// {{studentName}}/{{studentEmail}} untouched - those are filled server-side
// per recipient.
export function substituteExamFields(
  text: string,
  exam: { title: string; startAtUtc: string | null; durationMinutes: number } | null,
): string {
  if (!exam) return text;
  const startDate = exam.startAtUtc ? new Date(exam.startAtUtc).toLocaleString() : 'Not scheduled';
  return text
    .replaceAll('{{examTitle}}', exam.title)
    .replaceAll('{{startDate}}', startDate)
    .replaceAll('{{duration}}', `${exam.durationMinutes} min`);
}
