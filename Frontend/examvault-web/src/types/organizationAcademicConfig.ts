export interface OrganizationAcademicConfig {
  academicFields: Record<string, string>;
  resultFields: string[];
  updatedAtUtc: string | null;
}

export interface UpdateOrganizationAcademicConfigRequest {
  academicFields: Record<string, string>;
  resultFields: string[];
}
