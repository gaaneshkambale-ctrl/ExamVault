export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
}

export interface CreateTenantAdminRequest {
  fullName: string;
  email: string;
}
