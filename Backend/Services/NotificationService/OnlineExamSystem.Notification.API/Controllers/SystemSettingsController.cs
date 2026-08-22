using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Settings.GetSystemSettings;
using OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Shared.Contracts.Responses.Notification;
using SystemSettingsEntity = OnlineExamSystem.Notification.Domain.Entities.SystemSettings;

namespace OnlineExamSystem.Notification.API.Controllers;

// Unlike Proctoring/Reminder-settings (nested under the exams-route's existing
// catch-all) this is a brand new top-level path, so it needs its own new Gateway
// route - added as "system-settings-route" in the Gateway's appsettings.json.
[ApiController]
[Route("api/system-settings")]
[Authorize(Roles = "Admin")]
public class SystemSettingsController : ControllerBase
{
    private readonly GetSystemSettingsHandler _getSystemSettingsHandler;
    private readonly UpdateSystemSettingsHandler _updateSystemSettingsHandler;
    private readonly IHostEnvironment _hostEnvironment;

    public SystemSettingsController(
        GetSystemSettingsHandler getSystemSettingsHandler,
        UpdateSystemSettingsHandler updateSystemSettingsHandler,
        IHostEnvironment hostEnvironment)
    {
        _getSystemSettingsHandler = getSystemSettingsHandler;
        _updateSystemSettingsHandler = updateSystemSettingsHandler;
        _hostEnvironment = hostEnvironment;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getSystemSettingsHandler.HandleAsync(new GetSystemSettingsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateSystemSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _updateSystemSettingsHandler.HandleAsync(
            new UpdateSystemSettingsCommand(
                request.MaintenanceModeEnabled, request.BackupFrequency, request.AuditLogRetentionDays, request.LogLevel),
            cancellationToken);

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return Ok(ToResponse(result.Settings!));
    }

    private SystemSettingsResponse ToResponse(SystemSettingsEntity settings) =>
        new(
            settings.MaintenanceModeEnabled,
            settings.BackupFrequency.ToString(),
            settings.AuditLogRetentionDays,
            settings.LogLevel.ToString(),
            _hostEnvironment.EnvironmentName,
            settings.UpdatedAtUtc);
}
