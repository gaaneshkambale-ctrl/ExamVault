using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
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
    private readonly ILogger<PlansController> _logger;

    public PlansController(
        CreatePlanHandler createPlanHandler,
        UpdatePlanHandler updatePlanHandler,
        DeletePlanHandler deletePlanHandler,
        ListPlansHandler listPlansHandler,
        ILogger<PlansController> logger)
    {
        _createPlanHandler = createPlanHandler;
        _updatePlanHandler = updatePlanHandler;
        _deletePlanHandler = deletePlanHandler;
        _listPlansHandler = listPlansHandler;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var plans = await _listPlansHandler.HandleAsync(new ListPlansQuery(), cancellationToken);
        return Ok(plans.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePlanRequest request, CancellationToken cancellationToken)
    {
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
                request.StorageGb),
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
        return StatusCode(StatusCodes.Status201Created, ToResponse(plan));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePlanRequest request, CancellationToken cancellationToken)
    {
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
                request.StorageGb),
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
        return Ok(ToResponse(result.Plan!));
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

    private static PlanResponse ToResponse(Plan plan) => new(
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
        plan.StorageGb);
}
