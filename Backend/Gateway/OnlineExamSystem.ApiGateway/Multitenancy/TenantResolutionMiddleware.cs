using System.Net;

namespace OnlineExamSystem.ApiGateway.Multitenancy;

// Phase 3 of multi_tenant_saas.txt. Deliberately NOT an authorization
// mechanism - it only rejects requests to a Host header whose subdomain
// doesn't map to a known, active tenant, before the request reaches any
// backend service. Real data isolation stays enforced by the JWT's
// TenantId claim (Phase 1) plus each service's query filters (Phase 2);
// this middleware never injects a trusted tenant header for a service to
// act on, since a service-to-service call could forge one.
public class TenantResolutionMiddleware
{
    // The reserved entry point for Super Admin tenant-management screens
    // (Phase 4) - it isn't itself a tenant, so it always passes through.
    private static readonly string[] ReservedSlugs = ["platform"];

    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantLookupClient tenantLookupClient)
    {
        var slug = ExtractSubdomain(context.Request.Host.Host);
        if (slug is null || ReservedSlugs.Contains(slug, StringComparer.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var tenant = await tenantLookupClient.GetBySlugAsync(slug, context.RequestAborted);
        if (tenant is null || !tenant.IsActive)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new { message = "Unknown or inactive organization." });
            return;
        }

        await _next(context);
    }

    // No real wildcard DNS yet (Phase 3's infra bullet in
    // multi_tenant_saas.txt is still open) - local dev (localhost) and
    // today's Azure dev environment (the default *.azurecontainerapps.io
    // FQDN) both have no meaningful subdomain to resolve, so they pass
    // through unrestricted rather than being rejected. Only a genuine
    // "label.label.tld" shape (3+ dot-separated labels) is tenant-scoped.
    internal static string? ExtractSubdomain(string host)
    {
        if (string.IsNullOrWhiteSpace(host)) return null;

        // Strip port if present (e.g. "stanford.localhost:5000")
        var cleanHost = host.Split(':')[0];
        if (cleanHost.Equals("localhost", StringComparison.OrdinalIgnoreCase)) return null;
        if (IPAddress.TryParse(cleanHost, out _)) return null;
        if (cleanHost.EndsWith(".azurecontainerapps.io", StringComparison.OrdinalIgnoreCase)) return null;

        var labels = cleanHost.Split('.');
        // Support *.localhost (e.g. "stanford.localhost") in local dev
        if (labels.Length == 2 && labels[1].Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return labels[0];
        }
        // Support production domains (e.g. "stanford.examvaults.in" or "stanford.examvault.com")
        return labels.Length >= 3 ? labels[0] : null;
    }
}
