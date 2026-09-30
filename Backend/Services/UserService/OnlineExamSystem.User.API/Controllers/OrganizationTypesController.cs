using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.OrganizationTypes.Create;
using OnlineExamSystem.User.Application.OrganizationTypes.Delete;
using OnlineExamSystem.User.Application.OrganizationTypes.List;
using OnlineExamSystem.User.Application.OrganizationTypes.Update;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.API.Controllers;

// Super Admin only for managing the list; List() itself is overridden down
// to plain [Authorize] so any authenticated tenant member (Admin filling in
// Organization Settings, or a Super Admin creating a new organization) can
// fetch the active options for the "Institution Type" dropdown.
[ApiController]
[Route("api/organization-types")]
[Authorize(Roles = "SuperAdmin")]
public class OrganizationTypesController : ControllerBase
{
    private readonly ListOrganizationTypesHandler _listHandler;
    private readonly CreateOrganizationTypeHandler _createHandler;
    private readonly UpdateOrganizationTypeHandler _updateHandler;
    private readonly DeleteOrganizationTypeHandler _deleteHandler;
    private readonly ILogger<OrganizationTypesController> _logger;

    public OrganizationTypesController(
        ListOrganizationTypesHandler listHandler,
        CreateOrganizationTypeHandler createHandler,
        UpdateOrganizationTypeHandler updateHandler,
        DeleteOrganizationTypeHandler deleteHandler,
        ILogger<OrganizationTypesController> logger)
    {
        _listHandler = listHandler;
        _createHandler = createHandler;
        _updateHandler = updateHandler;
        _deleteHandler = deleteHandler;
        _logger = logger;
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var types = await _listHandler.HandleAsync(new ListOrganizationTypesQuery(ActiveOnly: true), cancellationToken);
        return Ok(types.Select(ToResponse));
    }

    // Super Admin's own management screen - includes deactivated rows.
    [HttpGet("all")]
    public async Task<IActionResult> ListAll(CancellationToken cancellationToken)
    {
        var types = await _listHandler.HandleAsync(new ListOrganizationTypesQuery(ActiveOnly: false), cancellationToken);
        return Ok(types.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrganizationTypeRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _createHandler.HandleAsync(
            new CreateOrganizationTypeCommand(request.Name, request.SortOrder, createdByUserId),
            cancellationToken);

        if (result.NameAlreadyExists)
        {
            return Conflict(new { message = "An organization type with this name already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("OrganizationType {OrganizationTypeId} ({Name}) created.", result.OrganizationType!.Id, result.OrganizationType.Name);
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.OrganizationType));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateOrganizationTypeRequest request, CancellationToken cancellationToken)
    {
        var updatedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _updateHandler.HandleAsync(
            new UpdateOrganizationTypeCommand(id, request.Name, request.IsActive, request.SortOrder, updatedByUserId),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = "Organization type not found." });
        }

        if (result.NameAlreadyExists)
        {
            return Conflict(new { message = "An organization type with this name already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("OrganizationType {OrganizationTypeId} updated.", id);
        return Ok(ToResponse(result.OrganizationType!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteHandler.HandleAsync(new DeleteOrganizationTypeCommand(id), cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = "Organization type not found." });
        }

        _logger.LogInformation("OrganizationType {OrganizationTypeId} deleted.", id);
        return NoContent();
    }

    private static OrganizationTypeResponse ToResponse(OrganizationType type) => new(
        type.Id,
        type.Name,
        type.IsActive,
        type.SortOrder,
        type.CreatedAtUtc,
        type.UpdatedAtUtc);
}
