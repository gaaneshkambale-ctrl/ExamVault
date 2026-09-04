// Mirrors the backend's PlanFeature enum (Backend/Shared/.../Multitenancy/PlanFeature.cs)
// - the 10 gateable Admin console modules. ExamSecurity/Proctoring split
// out of LiveMonitoring 2026-09-04 (see ActionPlan.txt's "SPLIT
// LiveMonitoring" plan) - LiveMonitoring narrowed to non-video real-time
// oversight, ExamSecurity covers violation tracking, Proctoring covers
// webcam/live-video/recording.
export type PlanFeature =
  | 'Users'
  | 'Exams'
  | 'ExamTypes'
  | 'LiveMonitoring'
  | 'Results'
  | 'Reports'
  | 'Notifications'
  | 'Settings'
  | 'ExamSecurity'
  | 'Proctoring';

export const ALL_PLAN_FEATURES: PlanFeature[] = [
  'Users',
  'Exams',
  'ExamTypes',
  'LiveMonitoring',
  'Results',
  'Reports',
  'Notifications',
  'Settings',
  'ExamSecurity',
  'Proctoring',
];

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  Users: 'User Management',
  Exams: 'Exam Authoring',
  ExamTypes: 'Exam Types',
  LiveMonitoring: 'Live Monitoring',
  Results: 'Results',
  Reports: 'Reports',
  Notifications: 'Notifications',
  Settings: 'Settings',
  ExamSecurity: 'Exam Security',
  Proctoring: 'Proctoring',
};

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  includedFeatures: PlanFeature[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreatePlanRequest {
  name: string;
  description: string | null;
  includedFeatures: PlanFeature[];
}

export interface UpdatePlanRequest {
  name: string;
  description: string | null;
  includedFeatures: PlanFeature[];
}
