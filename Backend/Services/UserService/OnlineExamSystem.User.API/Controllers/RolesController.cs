using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.RolePermissions.GetAll;
using OnlineExamSystem.User.Application.Users.RolePermissions.Update;

namespace OnlineExamSystem.User.API.Controllers;

// Nested under api/users (not its own top-level route) so it rides the
// gateway's existing /api/users/{**catch-all} proxy route, same as
// GroupsController - no gateway config change needed.
[ApiController]
[Route("api/users/roles")]
[Authorize(Roles = "Admin")]
public class RolesController : ControllerBase
{
    private readonly GetAllRolePermissionsHandler _getAllRolePermissionsHandler;
    private readonly UpdateRolePermissionsHandler _updateRolePermissionsHandler;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<RolesController> _logger;

    public RolesController(
        GetAllRolePermissionsHandler getAllRolePermissionsHandler,
        UpdateRolePermissionsHandler updateRolePermissionsHandler,
        IAuditClient auditClient,
        ILogger<RolesController> logger)
    {
        _getAllRolePermissionsHandler = getAllRolePermissionsHandler;
        _updateRolePermissionsHandler = updateRolePermissionsHandler;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetAllPermissions(CancellationToken cancellationToken)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);
        var roles = await _getAllRolePermissionsHandler.HandleAsync(
            new GetAllRolePermissionsQuery(tenantId),
            cancellationToken);

        return Ok(roles.Select(r => new RolePermissionsResponse(r.Role, r.Permissions)));
    }

    [HttpPut("{role}/permissions")]
    public async Task<IActionResult> UpdatePermissions(
        string role,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        // Self-lockout guard: an Admin editing their own role's permissions
        // (e.g. accidentally unchecking Users-Edit) would leave no one left
        // in the tenant able to undo it - only a platform SuperAdmin could.
        // This endpoint is Admin-only today, so in practice this only ever
        // fires for role == "Admin", but the check is written generally.
        if (User.IsInRole(role))
        {
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]>
                {
                    ["request"] = ["You can't edit the permissions of your own role. Ask another Admin, or contact platform support."],
                }));
        }

        var tenantId = Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);
        var result = await _updateRolePermissionsHandler.HandleAsync(
            new UpdateRolePermissionsCommand(tenantId, role, request.Permissions),
            cancellationToken);

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Permissions for role {Role} updated.", role);
        await RecordSecurityEventAsync(tenantId, $"{role} role permissions updated", cancellationToken);
        return Ok(new RolePermissionsResponse(role, result.Permissions));
    }

    // The self-service counterpart to TenantsController's own
    // RecordSecurityEventAsync (Super Admin path) - this is the single most
    // sensitive self-service action a tenant Admin can take (changing what
    // every Instructor/Student in their org can do), previously logged only
    // to ILogger with no audit trail. TenantId here is the caller's own
    // ambient tenant (this endpoint has no explicit tenantId route param),
    // and the acting Admin is also the affected tenant's own Admin - no
    // separate "actor vs. affected org" split needed like the platform
    // console's version has.
    private Task RecordSecurityEventAsync(Guid tenantId, string activity, CancellationToken cancellationToken)
    {
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return _auditClient.RecordAsync(
            tenantId,
            "Security",
            activity,
            null,
            null,
            actorId is not null ? Guid.Parse(actorId) : null,
            User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
    }
}
