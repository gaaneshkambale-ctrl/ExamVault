// Mirrors the backend's PlanFeature enum (Backend/Shared/.../Multitenancy/PlanFeature.cs)
// - the 8 gateable Admin console modules.
export type PlanFeature =
  | 'Users'
  | 'Exams'
  | 'ExamTypes'
  | 'LiveMonitoring'
  | 'Results'
  | 'Reports'
  | 'Notifications'
  | 'Settings';

export const ALL_PLAN_FEATURES: PlanFeature[] = [
  'Users',
  'Exams',
  'ExamTypes',
  'LiveMonitoring',
  'Results',
  'Reports',
  'Notifications',
  'Settings',
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
