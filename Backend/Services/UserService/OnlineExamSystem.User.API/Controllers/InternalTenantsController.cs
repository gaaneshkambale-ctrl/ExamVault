using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.User.Application.Tenants.GetBySlug;

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

    public InternalTenantsController(GetTenantBySlugHandler getTenantBySlugHandler)
    {
        _getTenantBySlugHandler = getTenantBySlugHandler;
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

    private record InternalTenantResponse(Guid Id, string Name, string Slug, bool IsActive);
}
