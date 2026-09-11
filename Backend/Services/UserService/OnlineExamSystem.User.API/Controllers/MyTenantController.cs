using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.API.Controllers;

// Self-service organization info for the currently authenticated user's own
// tenant - eg. the Advanced Exam Report PDF's org name/address block.
// Deliberately separate from TenantsController, which is
// [Authorize(Roles = "SuperAdmin")] at the class level for cross-tenant
// provisioning; this reads only the caller's own tenant (off the JWT's
// tenant_id claim, never a route parameter) and is open to any authenticated
// role, same as UsersController's own "me" endpoints.
[ApiController]
[Route("api/tenants/mine")]
[Authorize]
public class MyTenantController : ControllerBase
{
    private readonly ITenantRepository _tenantRepository;

    public MyTenantController(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst(TenantClaimTypes.TenantId)?.Value;
        if (!Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return NotFound(new { message = "No organization associated with this account." });
        }

        var tenant = await _tenantRepository.GetByIdAsync(tenantId, cancellationToken);
        if (tenant is null)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return Ok(new MyTenantResponse(
            tenant.Name,
            tenant.AddressLine1,
            tenant.AddressLine2,
            tenant.City,
            tenant.State,
            tenant.PostalCode,
            tenant.Country));
    }
}
