export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAtUtc: string;
  planId: string;
  isTrial: boolean;
  trialEndsAtUtc: string | null;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  planId?: string;
  isTrial?: boolean;
  trialEndsAtUtc?: string | null;
}

export interface CreateTenantAdminRequest {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  designation?: string | null;
}

export interface UpdateTenantRequest {
  name: string;
  slug: string;
}
