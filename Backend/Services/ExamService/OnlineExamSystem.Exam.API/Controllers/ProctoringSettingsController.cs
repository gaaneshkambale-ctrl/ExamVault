using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Proctoring.GetProctoringSettings;
using OnlineExamSystem.Exam.Application.Proctoring.UpdateProctoringSettings;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using ProctoringSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ProctoringSettings;
using static OnlineExamSystem.Exam.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Exam.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Exam.API.Controllers;

// Nested under api/exams/proctoring-settings so the Gateway's existing exams-route
// (/api/exams/{**catch-all}) already proxies this - no new Gateway route needed.
// GET is readable by any authenticated user (the student's exam client needs to know
// which detectors are active); only Admin can change the settings.
[ApiController]
[Route("api/exams/proctoring-settings")]
[Authorize]
public class ProctoringSettingsController : ControllerBase
{
    private readonly GetProctoringSettingsHandler _getProctoringSettingsHandler;
    private readonly UpdateProctoringSettingsHandler _updateProctoringSettingsHandler;

    public ProctoringSettingsController(
        GetProctoringSettingsHandler getProctoringSettingsHandler,
        UpdateProctoringSettingsHandler updateProctoringSettingsHandler)
    {
        _getProctoringSettingsHandler = getProctoringSettingsHandler;
        _updateProctoringSettingsHandler = updateProctoringSettingsHandler;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getProctoringSettingsHandler.HandleAsync(new GetProctoringSettingsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Settings)]
    [Authorize(Policy = SettingsEdit)]
    public async Task<IActionResult> Update(UpdateProctoringSettingsRequest request, CancellationToken cancellationToken)
    {
        var settings = await _updateProctoringSettingsHandler.HandleAsync(
            new UpdateProctoringSettingsCommand(
                request.ProctoringEnabled,
                request.FaceDetectionEnabled,
                request.MultiPersonDetectionEnabled,
                request.ScreenMonitoringEnabled,
                request.FullscreenExitEnabled,
                request.MultipleTabsEnabled,
                request.CopyPasteBlockingEnabled,
                request.RightClickBlockingEnabled,
                request.MultipleMonitorsEnabled,
                request.SessionTimeoutMinutes),
            cancellationToken);
        return Ok(ToResponse(settings));
    }

    private static ProctoringSettingsResponse ToResponse(ProctoringSettingsEntity settings) =>
        new(
            settings.ProctoringEnabled,
            settings.FaceDetectionEnabled,
            settings.MultiPersonDetectionEnabled,
            settings.ScreenMonitoringEnabled,
            settings.FullscreenExitEnabled,
            settings.MultipleTabsEnabled,
            settings.CopyPasteBlockingEnabled,
            settings.RightClickBlockingEnabled,
            settings.MultipleMonitorsEnabled,
            settings.SessionTimeoutMinutes,
            settings.UpdatedAtUtc);
}
