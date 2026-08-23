using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Tenants.Create;
using OnlineExamSystem.User.Application.Tenants.CreateAdmin;
using OnlineExamSystem.User.Application.Tenants.List;
using OnlineExamSystem.User.Application.Tenants.SetActiveStatus;
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
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(
        CreateTenantHandler createTenantHandler,
        ListTenantsHandler listTenantsHandler,
        SetTenantActiveStatusHandler setTenantActiveStatusHandler,
        CreateTenantAdminHandler createTenantAdminHandler,
        ILogger<TenantsController> logger)
    {
        _createTenantHandler = createTenantHandler;
        _listTenantsHandler = listTenantsHandler;
        _setTenantActiveStatusHandler = setTenantActiveStatusHandler;
        _createTenantAdminHandler = createTenantAdminHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTenantRequest request, CancellationToken cancellationToken)
    {
        var result = await _createTenantHandler.HandleAsync(
            new CreateTenantCommand(request.Name, request.Slug),
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
        return StatusCode(StatusCodes.Status201Created, ToResponse(tenant));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var tenants = await _listTenantsHandler.HandleAsync(new ListTenantsQuery(), cancellationToken);
        return Ok(tenants.Select(ToResponse));
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
        return Ok(ToResponse(result.Tenant!));
    }

    [HttpPost("{id:guid}/admins")]
    public async Task<IActionResult> CreateAdmin(
        Guid id,
        CreateTenantAdminRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _createTenantAdminHandler.HandleAsync(
            new CreateTenantAdminCommand(id, request.FullName, request.Email),
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
        return StatusCode(StatusCodes.Status201Created, new UserListItemResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAtUtc,
            user.IsActive,
            user.PhoneNumber,
            HasPhoto: false,
            user.RollNumber));
    }

    private static TenantResponse ToResponse(Tenant tenant) =>
        new(tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedAtUtc);
}
