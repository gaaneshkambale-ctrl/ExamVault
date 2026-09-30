using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Plans.Create;
using OnlineExamSystem.User.Application.Plans.Delete;
using OnlineExamSystem.User.Application.Plans.List;
using OnlineExamSystem.User.Application.Plans.Update;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.API.Controllers;

// Super Admin only - Plans are a platform-wide concept, not scoped to any
// one tenant. See ActionPlan.txt's "SUBSCRIPTION-BASED FEATURE GATING"
// section for the full design (Plan -> Tenant.PlanId -> JWT "feature"
// claims -> per-service authorization policies).
[ApiController]
[Route("api/plans")]
[Authorize(Roles = "SuperAdmin")]
public class PlansController : ControllerBase
{
    private readonly CreatePlanHandler _createPlanHandler;
    private readonly UpdatePlanHandler _updatePlanHandler;
    private readonly DeletePlanHandler _deletePlanHandler;
    private readonly ListPlansHandler _listPlansHandler;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<PlansController> _logger;

    public PlansController(
        CreatePlanHandler createPlanHandler,
        UpdatePlanHandler updatePlanHandler,
        DeletePlanHandler deletePlanHandler,
        ListPlansHandler listPlansHandler,
        IUserRepository userRepository,
        ILogger<PlansController> logger)
    {
        _createPlanHandler = createPlanHandler;
        _updatePlanHandler = updatePlanHandler;
        _deletePlanHandler = deletePlanHandler;
        _listPlansHandler = listPlansHandler;
        _userRepository = userRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var plans = await _listPlansHandler.HandleAsync(new ListPlansQuery(), cancellationToken);
        var names = await ActorNameResolver.ResolveAsync(
            _userRepository,
            plans.SelectMany(p => new[] { p.CreatedByUserId, p.UpdatedByUserId }),
            cancellationToken);
        return Ok(plans.Select(p => ToResponse(p, names)));
    }

    // Anonymous, real-data pricing feed for the public marketing site
    // (Home.tsx's Pricing teaser) - overrides this controller's own
    // class-level SuperAdmin-only [Authorize]. Excludes the "Full Access"
    // default/fallback plan (TenantConstants.FullAccessPlanId) - it's the
    // internal default new tenants get, not a real sellable public tier,
    // same exclusion the Super Admin "All Plans" page already applies.
    // Every field returned here (pricing/limits/included modules) is
    // already meant to be public on a pricing page - nothing sensitive.
    [AllowAnonymous]
    [HttpGet("public")]
    public async Task<IActionResult> ListPublic(CancellationToken cancellationToken)
    {
        var plans = await _listPlansHandler.HandleAsync(new ListPlansQuery(), cancellationToken);
        var noNames = new Dictionary<Guid, string>();
        return Ok(plans.Where(p => p.Id != TenantConstants.FullAccessPlanId).Select(p => ToResponse(p, noNames)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePlanRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _createPlanHandler.HandleAsync(
            new CreatePlanCommand(
                request.Name,
                request.Description,
                ParseFeatures(request.IncludedFeatures),
                request.MonthlyPrice,
                request.AnnualPrice,
                request.MaxStudents,
                request.MaxAdmins,
                request.MaxInstructors,
                request.MaxExams,
                request.MaxQuestions,
                request.MaxAiQuestionsPerMonth,
                request.StorageGb,
                createdByUserId),
            cancellationToken);

        if (result.NameAlreadyExists)
        {
            return Conflict(new { message = "A plan with this name already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var plan = result.Plan!;
        _logger.LogInformation("Plan {PlanId} ({Name}) created.", plan.Id, plan.Name);
        var names = await ActorNameResolver.ResolveAsync(_userRepository, new[] { plan.CreatedByUserId, plan.UpdatedByUserId }, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToResponse(plan, names));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePlanRequest request, CancellationToken cancellationToken)
    {
        var updatedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _updatePlanHandler.HandleAsync(
            new UpdatePlanCommand(
                id,
                request.Name,
                request.Description,
                ParseFeatures(request.IncludedFeatures),
                request.MonthlyPrice,
                request.AnnualPrice,
                request.MaxStudents,
                request.MaxAdmins,
                request.MaxInstructors,
                request.MaxExams,
                request.MaxQuestions,
                request.MaxAiQuestionsPerMonth,
                request.StorageGb,
                updatedByUserId),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = "Plan not found." });
        }

        if (result.NameAlreadyExists)
        {
            return Conflict(new { message = "A plan with this name already exists." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Plan {PlanId} updated.", id);
        var names = await ActorNameResolver.ResolveAsync(_userRepository, new[] { result.Plan!.CreatedByUserId, result.Plan!.UpdatedByUserId }, cancellationToken);
        return Ok(ToResponse(result.Plan!, names));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deletePlanHandler.HandleAsync(new DeletePlanCommand(id), cancellationToken);

        if (result.NotFound)
        {
            return NotFound(new { message = "Plan not found." });
        }

        if (result.InUse)
        {
            return Conflict(new { message = "This plan is still assigned to at least one organization." });
        }

        _logger.LogInformation("Plan {PlanId} deleted.", id);
        return NoContent();
    }

    private static List<PlanFeature> ParseFeatures(IReadOnlyList<string> features) =>
        features.Select(f => Enum.Parse<PlanFeature>(f, ignoreCase: true)).ToList();

    private static PlanResponse ToResponse(Plan plan, IReadOnlyDictionary<Guid, string> names) => new(
        plan.Id,
        plan.Name,
        plan.Description,
        plan.IncludedFeatures.Select(f => f.ToString()).ToList(),
        plan.CreatedAtUtc,
        plan.UpdatedAtUtc,
        plan.MonthlyPrice,
        plan.AnnualPrice,
        plan.MaxStudents,
        plan.MaxAdmins,
        plan.MaxInstructors,
        plan.MaxExams,
        plan.MaxQuestions,
        plan.MaxAiQuestionsPerMonth,
        plan.StorageGb,
        plan.CreatedByUserId,
        plan.UpdatedByUserId,
        plan.CreatedByUserId.HasValue ? names.GetValueOrDefault(plan.CreatedByUserId.Value) : null,
        plan.UpdatedByUserId.HasValue ? names.GetValueOrDefault(plan.UpdatedByUserId.Value) : null);
}
