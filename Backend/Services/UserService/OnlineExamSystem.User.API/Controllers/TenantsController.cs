using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Tenants.AssignPlan;
using OnlineExamSystem.User.Application.Tenants.Create;
using OnlineExamSystem.User.Application.Tenants.CreateAdmin;
using OnlineExamSystem.User.Application.Tenants.Delete;
using OnlineExamSystem.User.Application.Tenants.GetRolePermissions;
using OnlineExamSystem.User.Application.Tenants.List;
using OnlineExamSystem.User.Application.Tenants.ResetAdminPassword;
using OnlineExamSystem.User.Application.Tenants.SetActiveStatus;
using OnlineExamSystem.User.Application.Tenants.SetTrial;
using OnlineExamSystem.User.Application.Tenants.Update;
using OnlineExamSystem.User.Application.Tenants.UpdateRolePermissions;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.API.Controllers;

// Manual tenant-provisioning path (Phase 1 scope note: no self-service
// signup yet) - Super Admin only, spans tenants rather than belonging to one.
[ApiController]
[Route("api/tenants")]
[Authorize(Roles = "SuperAdmin")]
public class TenantsController : ControllerBase
{
    private readonly CreateTenantHandler _createTenantHandler;
    private readonly ListTenantsHandler _listTenantsHandler;
    private readonly SetTenantActiveStatusHandler _setTenantActiveStatusHandler;
    private readonly CreateTenantAdminHandler _createTenantAdminHandler;
    private readonly AssignPlanToTenantHandler _assignPlanToTenantHandler;
    private readonly UpdateTenantHandler _updateTenantHandler;
    private readonly DeleteTenantHandler _deleteTenantHandler;
    private readonly ResetTenantAdminPasswordHandler _resetTenantAdminPasswordHandler;
    private readonly SetTenantTrialHandler _setTenantTrialHandler;
    private readonly GetTenantRolePermissionsHandler _getTenantRolePermissionsHandler;
    private readonly UpdateTenantRolePermissionsHandler _updateTenantRolePermissionsHandler;
    private readonly IUserRepository _userRepository;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(
        CreateTenantHandler createTenantHandler,
        ListTenantsHandler listTenantsHandler,
        SetTenantActiveStatusHandler setTenantActiveStatusHandler,
        CreateTenantAdminHandler createTenantAdminHandler,
        AssignPlanToTenantHandler assignPlanToTenantHandler,
        UpdateTenantHandler updateTenantHandler,
        DeleteTenantHandler deleteTenantHandler,
        ResetTenantAdminPasswordHandler resetTenantAdminPasswordHandler,
        SetTenantTrialHandler setTenantTrialHandler,
        GetTenantRolePermissionsHandler getTenantRolePermissionsHandler,
        UpdateTenantRolePermissionsHandler updateTenantRolePermissionsHandler,
        IUserRepository userRepository,
        IAuditClient auditClient,
        ILogger<TenantsController> logger)
    {
        _createTenantHandler = createTenantHandler;
        _listTenantsHandler = listTenantsHandler;
        _setTenantActiveStatusHandler = setTenantActiveStatusHandler;
        _createTenantAdminHandler = createTenantAdminHandler;
        _assignPlanToTenantHandler = assignPlanToTenantHandler;
        _updateTenantHandler = updateTenantHandler;
        _deleteTenantHandler = deleteTenantHandler;
        _resetTenantAdminPasswordHandler = resetTenantAdminPasswordHandler;
        _setTenantTrialHandler = setTenantTrialHandler;
        _getTenantRolePermissionsHandler = getTenantRolePermissionsHandler;
        _updateTenantRolePermissionsHandler = updateTenantRolePermissionsHandler;
        _userRepository = userRepository;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTenantRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _createTenantHandler.HandleAsync(
            new CreateTenantCommand(
                request.Name,
                request.Slug,
                request.PlanId,
                request.IsTrial,
                request.TrialEndsAtUtc,
                request.OrganizationType,
                request.AddressLine1,
                request.AddressLine2,
                request.City,
                request.State,
                request.PostalCode,
                request.Country,
                createdByUserId),
            cancellationToken);

        if (result.SlugAlreadyExists)
        {
            return Conflict(new { message = "A tenant with this slug already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var tenant = result.Tenant!;
        _logger.LogInformation("Tenant {TenantId} ({Slug}) created.", tenant.Id, tenant.Slug);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, tenant.CreatedByUserId, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToResponse(tenant, createdByName));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var tenants = await _listTenantsHandler.HandleAsync(new ListTenantsQuery(), cancellationToken);
        var names = await ActorNameResolver.ResolveAsync(_userRepository, tenants.Select(t => t.CreatedByUserId), cancellationToken);
        return Ok(tenants.Select(t => ToResponse(t, t.CreatedByUserId.HasValue ? names.GetValueOrDefault(t.CreatedByUserId.Value) : null)));
    }

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _setTenantActiveStatusHandler.HandleAsync(
            new SetTenantActiveStatusCommand(id, false),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        _logger.LogInformation("Tenant {TenantId} deactivated.", id);
        await RecordSecurityEventAsync(id, "Organization deactivated", cancellationToken);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Tenant!.CreatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Tenant!, createdByName));
    }

    [HttpPost("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _setTenantActiveStatusHandler.HandleAsync(
            new SetTenantActiveStatusCommand(id, true),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        _logger.LogInformation("Tenant {TenantId} reactivated.", id);
        await RecordSecurityEventAsync(id, "Organization reactivated", cancellationToken);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Tenant!.CreatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Tenant!, createdByName));
    }

    [HttpPost("{id:guid}/admins")]
    public async Task<IActionResult> CreateAdmin(
        Guid id,
        CreateTenantAdminRequest request,
        CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _createTenantAdminHandler.HandleAsync(
            new CreateTenantAdminCommand(id, request.FullName, request.Email, request.PhoneNumber, request.Designation, createdByUserId),
            cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        if (result.EmailAlreadyExists)
        {
            return Conflict(new { message = "A user with this email already exists in this tenant." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var user = result.User!;
        _logger.LogInformation("Admin {UserId} created for tenant {TenantId}.", user.Id, id);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, user.CreatedByUserId, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new UserListItemResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAtUtc,
            user.IsActive,
            user.PhoneNumber,
            HasPhoto: false,
            user.RollNumber,
            user.TenantId,
            user.LastLoginAtUtc,
            user.CreatedByUserId,
            createdByName));
    }

    [HttpPut("{id:guid}/plan")]
    public async Task<IActionResult> AssignPlan(Guid id, AssignPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await _assignPlanToTenantHandler.HandleAsync(
            new AssignPlanToTenantCommand(id, request.PlanId), cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        if (result.PlanNotFound)
        {
            return NotFound(new { message = "Plan not found." });
        }

        _logger.LogInformation("Tenant {TenantId} assigned to plan {PlanId}.", id, request.PlanId);
        if (!result.PlanUnchanged)
        {
            await RecordSecurityEventAsync(
                id,
                "Plan changed",
                cancellationToken,
                entityId: request.PlanId.ToString(),
                details: $"{result.PreviousPlanName} -> {result.NewPlanName}");
        }
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Tenant!.CreatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Tenant!, createdByName));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        var result = await _updateTenantHandler.HandleAsync(
            new UpdateTenantCommand(
                id,
                request.Name,
                request.Slug,
                request.OrganizationCode,
                request.OrganizationType,
                request.AddressLine1,
                request.AddressLine2,
                request.City,
                request.State,
                request.PostalCode,
                request.Country),
            cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        if (result.SlugAlreadyExists)
        {
            return Conflict(new { message = "A tenant with this slug already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Tenant {TenantId} updated.", id);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Tenant!.CreatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Tenant!, createdByName));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteTenantHandler.HandleAsync(new DeleteTenantCommand(id), cancellationToken);

        if (result.CannotDeletePlatformTenant)
        {
            return BadRequest(new { message = "The platform tenant cannot be deleted." });
        }

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        _logger.LogInformation("Tenant {TenantId} deleted.", id);
        await RecordSecurityEventAsync(id, "Organization deleted", cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/admins/{adminUserId:guid}/reset-password")]
    public async Task<IActionResult> ResetAdminPassword(Guid id, Guid adminUserId, CancellationToken cancellationToken)
    {
        var result = await _resetTenantAdminPasswordHandler.HandleAsync(
            new ResetTenantAdminPasswordCommand(id, adminUserId), cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        if (result.UserNotFound || result.UserNotAdminOfTenant)
        {
            return NotFound(new { message = "Admin not found for this organization." });
        }

        _logger.LogInformation("Password reset for tenant {TenantId} admin {AdminUserId}.", id, adminUserId);
        await RecordSecurityEventAsync(id, "Admin password reset", cancellationToken, entityId: adminUserId.ToString());
        return Ok(new ResetTenantAdminPasswordResponse(result.TemporaryPassword!));
    }

    [HttpPut("{id:guid}/trial")]
    public async Task<IActionResult> SetTrial(Guid id, SetTenantTrialRequest request, CancellationToken cancellationToken)
    {
        var result = await _setTenantTrialHandler.HandleAsync(
            new SetTenantTrialCommand(id, request.IsTrial, request.TrialEndsAtUtc), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        if (result.IsInvalid)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        _logger.LogInformation("Tenant {TenantId} trial set to {IsTrial}.", id, request.IsTrial);
        await RecordSecurityEventAsync(
            id,
            request.IsTrial ? "Trial started" : "Trial ended",
            cancellationToken,
            details: request.IsTrial ? $"Ends {request.TrialEndsAtUtc:yyyy-MM-dd}" : null);
        var createdByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Tenant!.CreatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Tenant!, createdByName));
    }

    [HttpGet("{id:guid}/roles/{role}/permissions")]
    public async Task<IActionResult> GetRolePermissions(Guid id, string role, CancellationToken cancellationToken)
    {
        var result = await _getTenantRolePermissionsHandler.HandleAsync(
            new GetTenantRolePermissionsQuery(id, role), cancellationToken);

        if (result.IsInvalidRole)
        {
            return BadRequest(new { message = "Unknown role." });
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        var updatedByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.UpdatedByUserId, cancellationToken);
        return Ok(new RolePermissionsResponse(role, result.Permissions!, result.UpdatedAtUtc, result.UpdatedByUserId, updatedByName));
    }

    [HttpPut("{id:guid}/roles/{role}/permissions")]
    public async Task<IActionResult> UpdateRolePermissions(
        Guid id,
        string role,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var updatedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _updateTenantRolePermissionsHandler.HandleAsync(
            new UpdateTenantRolePermissionsCommand(id, role, request.Permissions, updatedByUserId), cancellationToken);

        if (result.IsInvalidRole)
        {
            return BadRequest(new { message = "Unknown role." });
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Tenant not found." });
        }

        _logger.LogInformation("{Role} role permissions for tenant {TenantId} updated.", role, id);
        await RecordSecurityEventAsync(id, $"{role} role permissions updated", cancellationToken);
        var updatedByName = await ActorNameResolver.ResolveOneAsync(_userRepository, updatedByUserId, cancellationToken);
        return Ok(new RolePermissionsResponse(role, result.Permissions!, result.UpdatedAtUtc, updatedByUserId, updatedByName));
    }

    private static TenantResponse ToResponse(Tenant tenant, string? createdByName) =>
        new(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.IsActive,
            tenant.CreatedAtUtc,
            tenant.PlanId,
            tenant.IsTrial,
            tenant.TrialEndsAtUtc,
            tenant.OrganizationCode,
            tenant.OrganizationType,
            tenant.AddressLine1,
            tenant.AddressLine2,
            tenant.City,
            tenant.State,
            tenant.PostalCode,
            tenant.Country,
            tenant.CreatedByUserId,
            createdByName);

    // Gives AuditModule.Security (defined but never written anywhere until
    // now) a real purpose - the Super Admin's own tenant-lifecycle actions.
    // TenantId is the AFFECTED org (what this event is about); UserId/
    // UserName are the acting Super Admin (who did it) - same "subject vs.
    // actor" split RecordAsync already uses for a regular login entry.
    private Task RecordSecurityEventAsync(
        Guid targetTenantId,
        string activity,
        CancellationToken cancellationToken,
        string? entityId = null,
        string? details = null)
    {
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return _auditClient.RecordAsync(
            targetTenantId,
            "Security",
            activity,
            details,
            entityId,
            actorId is not null ? Guid.Parse(actorId) : null,
            User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            // This whole controller is [Authorize(Roles = "SuperAdmin")] -
            // every call through here is genuinely a platform staff member
            // acting on someone else's org, so this is always true, not a
            // per-request role check. See AuditLog.IsSuperAdminActor's own
            // comment for what this masks and where.
            isSuperAdminActor: true,
            cancellationToken: cancellationToken);
    }
}
