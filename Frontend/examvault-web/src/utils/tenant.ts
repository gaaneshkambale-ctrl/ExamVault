// Mirrors the Gateway's TenantResolutionMiddleware.ExtractSubdomain (Phase 3
// of multi_tenant_saas.txt) so the frontend and Gateway agree on what counts
// as a subdomain. Unlike the Gateway, this does NOT special-case the
// reserved `platform` slug - that carve-out is a Gateway ROUTING concept
// only (so the Super Admin's own login page isn't rejected by the
// subdomain-legitimacy check); for login purposes `platform` is a real,
// normal Tenant row that the Super Admin's own account genuinely belongs to.
export function extractTenantSlug(hostname: string): string | undefined {
  if (!hostname) return undefined;
  // Strip port if present in hostname string
  const cleanHost = hostname.split(':')[0].toLowerCase();
  if (cleanHost === 'localhost') return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(cleanHost)) return undefined;
  if (cleanHost.endsWith('.azurecontainerapps.io')) return undefined;

  const labels = cleanHost.split('.');
  // Support *.localhost (e.g. "stanford.localhost") in local dev
  if (labels.length === 2 && labels[1] === 'localhost') {
    return labels[0];
  }
  // Support production domains (e.g. "stanford.examvaults.in" or "stanford.examvault.com")
  return labels.length >= 3 ? labels[0] : undefined;
}

export function buildTenantLoginUrl(
  slug: string,
  host: string = typeof window !== 'undefined' ? window.location.host : 'localhost:5173',
  protocol: string = typeof window !== 'undefined' ? window.location.protocol : 'http:'
): string {
  if (!slug) return `${protocol}//${host}/login`;

  const [cleanHost, port] = host.toLowerCase().split(':');
  const portSuffix = port ? `:${port}` : '';

  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost')) {
    return `${protocol}//${slug}.localhost${portSuffix}/login`;
  }

  const labels = cleanHost.split('.');
  if (labels.length >= 2) {
    const baseDomain = labels.slice(-2).join('.');
    return `${protocol}//${slug}.${baseDomain}${portSuffix}/login`;
  }

  return `${protocol}//${slug}.${cleanHost}${portSuffix}/login`;
}
