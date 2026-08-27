export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAtUtc: string;
  planId: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  planId?: string;
}

export interface CreateTenantAdminRequest {
  fullName: string;
  email: string;
}

export interface UpdateTenantRequest {
  name: string;
  slug: string;
}
