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
