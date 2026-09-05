// Dropdown options for Tenant.organizationType - stored as plain text on
// the backend (see Tenant.cs), this fixed list just keeps entry consistent.
export const ORGANIZATION_TYPES = [
  'University',
  'School',
  'Coaching Institute',
  'Corporate Training',
  'Government',
  'Other',
];

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAtUtc: string;
  planId: string;
  isTrial: boolean;
  trialEndsAtUtc: string | null;
  organizationCode: string | null;
  organizationType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  planId?: string;
  isTrial?: boolean;
  trialEndsAtUtc?: string | null;
  organizationType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
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
  organizationCode?: string | null;
  organizationType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}
