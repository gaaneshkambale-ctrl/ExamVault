// Mirrors the Gateway's TenantResolutionMiddleware.ExtractSubdomain (Phase 3
// of multi_tenant_saas.txt) so the frontend and Gateway agree on what counts
// as a subdomain. Unlike the Gateway, this does NOT special-case the
// reserved `platform` slug - that carve-out is a Gateway ROUTING concept
// only (so the Super Admin's own login page isn't rejected by the
// subdomain-legitimacy check); for login purposes `platform` is a real,
// normal Tenant row that the Super Admin's own account genuinely belongs to.
export function extractTenantSlug(hostname: string): string | undefined {
  if (!hostname) return undefined;
  if (hostname.toLowerCase() === 'localhost') return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return undefined;
  if (hostname.toLowerCase().endsWith('.azurecontainerapps.io')) return undefined;

  const labels = hostname.split('.');
  return labels.length >= 3 ? labels[0] : undefined;
}
