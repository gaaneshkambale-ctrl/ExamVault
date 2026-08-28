export type NavigationType = 'Free' | 'Sequential' | 'Locked';

export interface SectionRequest {
  name: string;
  description: string;
  instructions: string;
  displayOrder: number;
  questionCount: number;
  marks: number;
  durationMinutes: number;
  navigationType: NavigationType;
  negativeMarkingEnabled: boolean;
  negativeMarks: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReview: boolean;
}

export interface SectionResponse extends SectionRequest {
  id: string;
  examId: string;
  createdAtUtc: string;
}

export interface SectionOrderItem {
  sectionId: string;
  displayOrder: number;
}

// Super Admin platform-wide Sections browse only - separate shape from
// SectionResponse (adds examTitle/tenantId, drops the per-exam-only fields
// a cross-tenant browse has no use for).
export interface PlatformSectionResponse {
  id: string;
  examId: string;
  examTitle: string;
  tenantId: string;
  name: string;
  displayOrder: number;
  questionCount: number;
  marks: number;
  durationMinutes: number;
  createdAtUtc: string;
}
