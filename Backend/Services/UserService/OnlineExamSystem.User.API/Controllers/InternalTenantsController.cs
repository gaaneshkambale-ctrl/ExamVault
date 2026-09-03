using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.User.Application.Tenants.GetBySlug;
using OnlineExamSystem.User.Application.Tenants.GetPermissionVersion;

namespace OnlineExamSystem.User.API.Controllers;

// Deliberately routed outside /api so the Gateway's users-route
// (/api/users/{**catch-all}) can never proxy it - only the Gateway itself,
// calling User API directly on its own port, can reach it (Phase 3 of
// multi_tenant_saas.txt: subdomain -> tenant resolution). Same pattern as
// InternalController's /internal/users/by-ids. Anonymous because the only
// caller is the Gateway resolving routing legitimacy before any user JWT
// exists yet (e.g. on the login page) - this endpoint never returns
// anything sensitive, just the public tenant identity (id/name/slug/active).
[ApiController]
[Route("internal/tenants")]
public class InternalTenantsController : ControllerBase
{
    private readonly GetTenantBySlugHandler _getTenantBySlugHandler;
    private readonly GetTenantPermissionVersionHandler _getTenantPermissionVersionHandler;

    public InternalTenantsController(
        GetTenantBySlugHandler getTenantBySlugHandler,
        GetTenantPermissionVersionHandler getTenantPermissionVersionHandler)
    {
        _getTenantBySlugHandler = getTenantBySlugHandler;
        _getTenantPermissionVersionHandler = getTenantPermissionVersionHandler;
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> BySlug(string slug, CancellationToken cancellationToken)
    {
        var tenant = await _getTenantBySlugHandler.HandleAsync(new GetTenantBySlugQuery(slug), cancellationToken);
        if (tenant is null)
        {
            return NotFound();
        }

        return Ok(new InternalTenantResponse(tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive));
    }

    // Polled (with a short local cache, see each service's own
    // PermissionVersionGuard) by every other service's authorization
    // policies to detect a token issued before a permission change.
    // Anonymous like this controller's other action - the caller here is
    // always another backend service, not a forwarded end-user identity
    // that would add anything meaningful to check; network isolation
    // (this route is never Gateway-proxied) is the real boundary.
    [HttpGet("{tenantId:guid}/permission-version")]
    public async Task<IActionResult> PermissionVersion(Guid tenantId, CancellationToken cancellationToken)
    {
        var version = await _getTenantPermissionVersionHandler.HandleAsync(
            new GetTenantPermissionVersionQuery(tenantId), cancellationToken);
        if (version is null)
        {
            return NotFound();
        }

        return Ok(new PermissionVersionResponse(version.Value));
    }

    private record InternalTenantResponse(Guid Id, string Name, string Slug, bool IsActive);
    private record PermissionVersionResponse(int Version);
}
