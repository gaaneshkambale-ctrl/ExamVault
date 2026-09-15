using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.API.Controllers;

// Deliberately routed outside /api, same pattern as UserService's
// InternalPlatformSettingsController - only another backend service calling
// Notification API directly on its own port can reach it. Anonymous because
// the caller is UserService's GetEmailSummaryHandler aggregating a
// platform-wide Email Summary stat for Super Admin, nothing sensitive.
[ApiController]
[Route("internal/email-delivery")]
public class InternalEmailDeliveryController : ControllerBase
{
    private readonly IEmailDeliveryLogRepository _repository;

    public InternalEmailDeliveryController(IEmailDeliveryLogRepository repository)
    {
        _repository = repository;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        var summary = await _repository.GetTodaySummaryAsync(cancellationToken);
        return Ok(new
        {
            sentToday = summary.Sent,
            deliveredToday = summary.Delivered,
            failedToday = summary.Failed,
        });
    }
}
