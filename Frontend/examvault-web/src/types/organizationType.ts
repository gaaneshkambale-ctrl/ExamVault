export interface OrganizationType {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateOrganizationTypeRequest {
  name: string;
  sortOrder: number;
}

export interface UpdateOrganizationTypeRequest {
  name: string;
  isActive: boolean;
  sortOrder: number;
}
