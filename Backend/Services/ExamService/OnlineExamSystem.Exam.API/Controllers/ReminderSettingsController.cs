using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Reminders.GetReminderSettings;
using OnlineExamSystem.Exam.Application.Reminders.UpdateReminderSettings;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using ReminderSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ReminderSettings;

namespace OnlineExamSystem.Exam.API.Controllers;

// Nested under api/exams/reminder-settings so the Gateway's existing exams-route
// (/api/exams/{**catch-all}) already proxies this - no new Gateway route needed.
[ApiController]
[Route("api/exams/reminder-settings")]
[Authorize(Roles = "Admin")]
public class ReminderSettingsController : ControllerBase
{
    private readonly GetReminderSettingsHandler _getReminderSettingsHandler;
    private readonly UpdateReminderSettingsHandler _updateReminderSettingsHandler;

    public ReminderSettingsController(
        GetReminderSettingsHandler getReminderSettingsHandler,
        UpdateReminderSettingsHandler updateReminderSettingsHandler)
    {
        _getReminderSettingsHandler = getReminderSettingsHandler;
        _updateReminderSettingsHandler = updateReminderSettingsHandler;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getReminderSettingsHandler.HandleAsync(new GetReminderSettingsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateReminderSettingsRequest request, CancellationToken cancellationToken)
    {
        var settings = await _updateReminderSettingsHandler.HandleAsync(
            new UpdateReminderSettingsCommand(request.Enable24HourReminder, request.Enable1HourReminder),
            cancellationToken);
        return Ok(ToResponse(settings));
    }

    private static ReminderSettingsResponse ToResponse(ReminderSettingsEntity settings) =>
        new(settings.Enable24HourReminder, settings.Enable1HourReminder, settings.UpdatedAtUtc);
}
