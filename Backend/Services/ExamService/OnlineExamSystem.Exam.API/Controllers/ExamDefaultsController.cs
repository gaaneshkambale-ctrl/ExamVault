using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Settings.GetExamDefaults;
using OnlineExamSystem.Exam.Application.Settings.UpdateExamDefaults;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using ExamDefaultsEntity = OnlineExamSystem.Exam.Domain.Entities.ExamDefaults;
using static OnlineExamSystem.Exam.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Exam.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Exam.API.Controllers;

// Nested under api/exams/defaults so the Gateway's existing exams-route
// (/api/exams/{**catch-all}) already proxies this - no new Gateway route needed.
// Not yet wired into CreateExam's actual prefill values (deferred - see
// ActionPlan.txt), so both verbs are Admin-only for now, gated on Settings.
[ApiController]
[Route("api/exams/defaults")]
[Authorize(Roles = "Admin")]
[Authorize(Policy = Settings)]
public class ExamDefaultsController : ControllerBase
{
    private readonly GetExamDefaultsHandler _getExamDefaultsHandler;
    private readonly UpdateExamDefaultsHandler _updateExamDefaultsHandler;

    public ExamDefaultsController(
        GetExamDefaultsHandler getExamDefaultsHandler,
        UpdateExamDefaultsHandler updateExamDefaultsHandler)
    {
        _getExamDefaultsHandler = getExamDefaultsHandler;
        _updateExamDefaultsHandler = updateExamDefaultsHandler;
    }

    [HttpGet]
    [Authorize(Policy = SettingsView)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getExamDefaultsHandler.HandleAsync(new GetExamDefaultsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    [Authorize(Policy = SettingsEdit)]
    public async Task<IActionResult> Update(UpdateExamDefaultsRequest request, CancellationToken cancellationToken)
    {
        var settings = await _updateExamDefaultsHandler.HandleAsync(
            new UpdateExamDefaultsCommand(
                request.DefaultDurationMinutes,
                request.PassingScorePercent,
                request.DefaultMaxAttempts,
                request.NegativeMarkingEnabled,
                request.NegativeMarkingValue,
                request.AutoSaveEnabled,
                request.AutoSubmitEnabled,
                request.QuestionNavigationMode,
                request.ResultPublishingMode),
            cancellationToken);
        return Ok(ToResponse(settings));
    }

    private static ExamDefaultsResponse ToResponse(ExamDefaultsEntity settings) =>
        new(
            settings.DefaultDurationMinutes,
            settings.PassingScorePercent,
            settings.DefaultMaxAttempts,
            settings.NegativeMarkingEnabled,
            settings.NegativeMarkingValue,
            settings.AutoSaveEnabled,
            settings.AutoSubmitEnabled,
            settings.QuestionNavigationMode.ToString(),
            settings.ResultPublishingMode.ToString(),
            settings.UpdatedAtUtc);
}
