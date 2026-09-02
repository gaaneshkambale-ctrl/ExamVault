using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
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
    private readonly ILogger<RolesController> _logger;

    public RolesController(
        GetAllRolePermissionsHandler getAllRolePermissionsHandler,
        UpdateRolePermissionsHandler updateRolePermissionsHandler,
        ILogger<RolesController> logger)
    {
        _getAllRolePermissionsHandler = getAllRolePermissionsHandler;
        _updateRolePermissionsHandler = updateRolePermissionsHandler;
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
        return Ok(new RolePermissionsResponse(role, result.Permissions));
    }
}
