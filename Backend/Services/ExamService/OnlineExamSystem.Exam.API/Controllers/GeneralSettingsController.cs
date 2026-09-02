using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Settings.GetGeneralSettings;
using OnlineExamSystem.Exam.Application.Settings.UpdateGeneralSettings;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using GeneralSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.GeneralSettings;
using static OnlineExamSystem.Exam.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Exam.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Exam.API.Controllers;

// Nested under api/exams/general-settings so the Gateway's existing exams-route
// (/api/exams/{**catch-all}) already proxies this - no new Gateway route needed.
// Nothing outside the Settings hub consumes this yet, so both verbs are
// Admin-only and gated on the Settings feature at class level.
[ApiController]
[Route("api/exams/general-settings")]
[Authorize(Roles = "Admin")]
[Authorize(Policy = Settings)]
public class GeneralSettingsController : ControllerBase
{
    private readonly GetGeneralSettingsHandler _getGeneralSettingsHandler;
    private readonly UpdateGeneralSettingsHandler _updateGeneralSettingsHandler;

    public GeneralSettingsController(
        GetGeneralSettingsHandler getGeneralSettingsHandler,
        UpdateGeneralSettingsHandler updateGeneralSettingsHandler)
    {
        _getGeneralSettingsHandler = getGeneralSettingsHandler;
        _updateGeneralSettingsHandler = updateGeneralSettingsHandler;
    }

    [HttpGet]
    [Authorize(Policy = SettingsView)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getGeneralSettingsHandler.HandleAsync(new GetGeneralSettingsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    [Authorize(Policy = SettingsEdit)]
    public async Task<IActionResult> Update(UpdateGeneralSettingsRequest request, CancellationToken cancellationToken)
    {
        var settings = await _updateGeneralSettingsHandler.HandleAsync(
            new UpdateGeneralSettingsCommand(
                request.OrganizationName, request.SupportEmail, request.Language, request.Timezone, request.DateFormat),
            cancellationToken);
        return Ok(ToResponse(settings));
    }

    private static GeneralSettingsResponse ToResponse(GeneralSettingsEntity settings) =>
        new(
            settings.OrganizationName,
            settings.SupportEmail,
            settings.Language,
            settings.Timezone,
            settings.DateFormat,
            settings.UpdatedAtUtc);
}
