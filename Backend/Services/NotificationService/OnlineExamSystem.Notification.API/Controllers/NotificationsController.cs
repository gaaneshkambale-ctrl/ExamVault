using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;
using OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.CreateTemplate;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.DuplicateTemplate;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.ListTemplates;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetUnreadCount;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAllAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Shared.Contracts.Responses.Notification;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly GetMyNotificationsHandler _getMyNotificationsHandler;
    private readonly GetNotificationByIdHandler _getNotificationByIdHandler;
    private readonly GetUnreadCountHandler _getUnreadCountHandler;
    private readonly MarkAsReadHandler _markAsReadHandler;
    private readonly MarkAllAsReadHandler _markAllAsReadHandler;
    private readonly DeleteMyNotificationHandler _deleteMyNotificationHandler;
    private readonly GetMyPreferencesHandler _getMyPreferencesHandler;
    private readonly SavePreferencesHandler _savePreferencesHandler;
    private readonly CreateNotificationHandler _createNotificationHandler;
    private readonly GetNotificationHistoryHandler _getNotificationHistoryHandler;
    private readonly GetNotificationHistoryStatsHandler _getNotificationHistoryStatsHandler;
    private readonly GetNotificationBatchDetailsHandler _getNotificationBatchDetailsHandler;
    private readonly ResendNotificationBatchHandler _resendNotificationBatchHandler;
    private readonly DeleteNotificationBatchHandler _deleteNotificationBatchHandler;
    private readonly ListTemplatesHandler _listTemplatesHandler;
    private readonly CreateTemplateHandler _createTemplateHandler;
    private readonly UpdateTemplateHandler _updateTemplateHandler;
    private readonly DuplicateTemplateHandler _duplicateTemplateHandler;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        GetMyNotificationsHandler getMyNotificationsHandler,
        GetNotificationByIdHandler getNotificationByIdHandler,
        GetUnreadCountHandler getUnreadCountHandler,
        MarkAsReadHandler markAsReadHandler,
        MarkAllAsReadHandler markAllAsReadHandler,
        DeleteMyNotificationHandler deleteMyNotificationHandler,
        GetMyPreferencesHandler getMyPreferencesHandler,
        SavePreferencesHandler savePreferencesHandler,
        CreateNotificationHandler createNotificationHandler,
        GetNotificationHistoryHandler getNotificationHistoryHandler,
        GetNotificationHistoryStatsHandler getNotificationHistoryStatsHandler,
        GetNotificationBatchDetailsHandler getNotificationBatchDetailsHandler,
        ResendNotificationBatchHandler resendNotificationBatchHandler,
        DeleteNotificationBatchHandler deleteNotificationBatchHandler,
        ListTemplatesHandler listTemplatesHandler,
        CreateTemplateHandler createTemplateHandler,
        UpdateTemplateHandler updateTemplateHandler,
        DuplicateTemplateHandler duplicateTemplateHandler,
        ILogger<NotificationsController> logger)
    {
        _getMyNotificationsHandler = getMyNotificationsHandler;
        _getNotificationByIdHandler = getNotificationByIdHandler;
        _getUnreadCountHandler = getUnreadCountHandler;
        _markAsReadHandler = markAsReadHandler;
        _markAllAsReadHandler = markAllAsReadHandler;
        _deleteMyNotificationHandler = deleteMyNotificationHandler;
        _getMyPreferencesHandler = getMyPreferencesHandler;
        _savePreferencesHandler = savePreferencesHandler;
        _createNotificationHandler = createNotificationHandler;
        _getNotificationHistoryHandler = getNotificationHistoryHandler;
        _getNotificationHistoryStatsHandler = getNotificationHistoryStatsHandler;
        _getNotificationBatchDetailsHandler = getNotificationBatchDetailsHandler;
        _resendNotificationBatchHandler = resendNotificationBatchHandler;
        _deleteNotificationBatchHandler = deleteNotificationBatchHandler;
        _listTemplatesHandler = listTemplatesHandler;
        _createTemplateHandler = createTemplateHandler;
        _updateTemplateHandler = updateTemplateHandler;
        _duplicateTemplateHandler = duplicateTemplateHandler;
        _logger = logger;
    }

    private Guid CallerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Guid CallerTenantId => Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);

    private string BearerToken =>
        Request.Headers["Authorization"].ToString()["Bearer ".Length..];

    // ---------- Mine ----------

    [HttpGet]
    public async Task<IActionResult> GetMine(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await _getMyNotificationsHandler.HandleAsync(
            new GetMyNotificationsQuery(CallerId, unreadOnly, page, pageSize), cancellationToken);

        return Ok(new NotificationListResponse(items.Select(ToResponse).ToList(), totalCount, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _getNotificationByIdHandler.HandleAsync(
            new GetNotificationByIdQuery(id, CallerId), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        return Ok(ToResponse(result.Notification!));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var count = await _getUnreadCountHandler.HandleAsync(new GetUnreadCountQuery(CallerId), cancellationToken);
        return Ok(new UnreadCountResponse(count));
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var result = await _markAsReadHandler.HandleAsync(new MarkAsReadCommand(id, CallerId), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        return Ok(ToResponse(result.Notification!));
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var count = await _markAllAsReadHandler.HandleAsync(new MarkAllAsReadCommand(CallerId), cancellationToken);
        return Ok(new { markedCount = count });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteMine(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteMyNotificationHandler.HandleAsync(
            new DeleteMyNotificationCommand(id, CallerId), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        return NoContent();
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        var items = await _getMyPreferencesHandler.HandleAsync(new GetMyPreferencesQuery(CallerId), cancellationToken);
        return Ok(items.Select(i => new NotificationPreferenceResponse(i.Type.ToString(), i.InAppEnabled, i.EmailEnabled)));
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> SavePreferences(SavePreferencesRequest request, CancellationToken cancellationToken)
    {
        var items = request.Preferences
            .Select(p => new NotificationPreferenceItem(
                Enum.Parse<NotificationType>(p.Type, ignoreCase: true), p.InAppEnabled, p.EmailEnabled))
            .ToList();

        var result = await _savePreferencesHandler.HandleAsync(
            new SavePreferencesCommand(CallerId, items), cancellationToken);

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return NoContent();
    }

    // ---------- Admin ----------

    // Deliberately NOT widened to SuperAdmin like every other Admin
    // endpoint below - this always resolves recipients from CallerTenantId,
    // so a Super Admin's own "Platform" tenant has no real users to
    // reach. Making it "work" for a Super Admin would silently create rows
    // nobody outside the Platform tenant ever sees - the Super Admin
    // console's Platform Announcement page keeps its Create action
    // disabled instead of pretending this reaches every organization.
    [HttpPost("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateNotificationRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateNotificationCommand(
            CallerTenantId,
            request.Title,
            request.Message,
            request.Type,
            request.SendTo,
            request.UserIds,
            request.RelatedExamId,
            request.SendNow,
            request.ScheduledAtUtc,
            CallerId,
            BearerToken,
            request.SendEmail,
            request.SendInApp);

        var result = await _createNotificationHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsNoRecipients)
        {
            return Problem(detail: "No recipients matched the selected audience.", statusCode: StatusCodes.Status400BadRequest);
        }

        _logger.LogInformation(
            "Notification batch {BatchId} created for {RecipientCount} recipients by {AdminUserId}.",
            result.BatchId, result.RecipientCount, CallerId);

        return StatusCode(StatusCodes.Status201Created, new CreateNotificationResponse(result.BatchId, result.RecipientCount));
    }

    [HttpGet("admin/history")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string? type,
        [FromQuery] string? search,
        [FromQuery] string? channel,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        NotificationType? parsedType = type is null ? null : Enum.Parse<NotificationType>(type, ignoreCase: true);

        var (items, totalCount) = await _getNotificationHistoryHandler.HandleAsync(
            new GetNotificationHistoryQuery(parsedType, page, pageSize, search, channel, status), cancellationToken);

        var responses = items.Select(i =>
        {
            var isScheduled = i.ScheduledAtUtc.HasValue && i.ScheduledAtUtc.Value > DateTime.UtcNow;
            var statusLabel = i.Failed > 0 ? "Failed" : isScheduled ? "Scheduled" : "Delivered";
            var channels = (i.HasInApp, i.HasEmail) switch
            {
                (true, true) => "In-App + Email",
                (true, false) => "In-App",
                (false, true) => "Email",
                _ => "-",
            };

            return new NotificationBatchSummaryResponse(
                i.BatchId,
                i.Title,
                i.Type.ToString(),
                i.RecipientCount,
                i.SentAtUtc,
                i.ScheduledAtUtc,
                statusLabel,
                i.Delivered,
                i.Failed,
                i.Skipped,
                i.Pending,
                channels,
                i.TenantId,
                i.CreatedByAdminUserId);
        }).ToList();

        return Ok(new NotificationHistoryResponse(responses, totalCount, page, pageSize));
    }

    [HttpGet("admin/history/stats")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetHistoryStats(CancellationToken cancellationToken)
    {
        var stats = await _getNotificationHistoryStatsHandler.HandleAsync(
            new GetNotificationHistoryStatsQuery(), cancellationToken);

        return Ok(new NotificationHistoryStatsResponse(
            stats.SentToday, stats.Delivered, stats.Failed, stats.Scheduled, stats.Total, stats.Pending));
    }

    [HttpGet("admin/history/{batchId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetBatchDetails(Guid batchId, CancellationToken cancellationToken)
    {
        var result = await _getNotificationBatchDetailsHandler.HandleAsync(
            new GetNotificationBatchDetailsQuery(batchId), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        var d = result.Details!;
        return Ok(new NotificationBatchDetailsResponse(
            d.BatchId,
            d.Title,
            d.Message,
            d.Type.ToString(),
            d.RelatedExamId,
            d.SentAtUtc,
            d.ScheduledAtUtc,
            d.ScheduledAtUtc > DateTime.UtcNow ? "Scheduled" : "Sent",
            d.TotalRecipients,
            d.Delivered,
            d.Failed,
            d.Pending,
            d.Skipped));
    }

    [HttpPost("admin/history/{batchId:guid}/resend")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Resend(Guid batchId, CancellationToken cancellationToken)
    {
        var result = await _resendNotificationBatchHandler.HandleAsync(
            new ResendNotificationBatchCommand(batchId, CallerId, BearerToken), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        _logger.LogInformation(
            "Notification batch {BatchId} resent as {NewBatchId} by {AdminUserId}.",
            batchId, result.NewBatchId, CallerId);

        return StatusCode(
            StatusCodes.Status201Created,
            new ResendNotificationResponse(result.NewBatchId, result.RecipientCount));
    }

    [HttpDelete("admin/history/{batchId:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteBatch(Guid batchId, CancellationToken cancellationToken)
    {
        var result = await _deleteNotificationBatchHandler.HandleAsync(
            new DeleteNotificationBatchCommand(batchId), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        return NoContent();
    }

    // ---------- Admin: Templates ----------

    [HttpGet("admin/templates")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ListTemplates(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] string? channel,
        [FromQuery] string? status,
        CancellationToken cancellationToken = default)
    {
        NotificationType? parsedType = type is null ? null : Enum.Parse<NotificationType>(type, ignoreCase: true);

        var items = await _listTemplatesHandler.HandleAsync(
            new ListTemplatesQuery(search, parsedType, channel, status), cancellationToken);

        return Ok(items.Select(ToTemplateResponse).ToList());
    }

    [HttpPost("admin/templates")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateTemplate(CreateNotificationTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await _createTemplateHandler.HandleAsync(
            new CreateTemplateCommand(
                request.Name, request.Type, request.SendEmail, request.SendInApp, request.Subject, request.Body, request.IsActive),
            cancellationToken);

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return StatusCode(StatusCodes.Status201Created, ToTemplateResponse(result.Template!));
    }

    [HttpPut("admin/templates/{id:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateTemplate(Guid id, UpdateNotificationTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await _updateTemplateHandler.HandleAsync(
            new UpdateTemplateCommand(
                id, request.Name, request.Type, request.SendEmail, request.SendInApp, request.Subject, request.Body, request.IsActive),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return Ok(ToTemplateResponse(result.Template!));
    }

    [HttpPost("admin/templates/{id:guid}/duplicate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DuplicateTemplate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _duplicateTemplateHandler.HandleAsync(new DuplicateTemplateCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        return StatusCode(StatusCodes.Status201Created, ToTemplateResponse(result.Template!));
    }

    private static NotificationTemplateResponse ToTemplateResponse(NotificationTemplate template)
    {
        var channels = (template.SendInApp, template.SendEmail) switch
        {
            (true, true) => "In-App + Email",
            (true, false) => "In-App",
            (false, true) => "Email",
            _ => "-",
        };

        return new NotificationTemplateResponse(
            template.Id,
            template.Name,
            template.Type.ToString(),
            template.SendEmail,
            template.SendInApp,
            channels,
            template.Subject,
            template.Body,
            template.IsActive ? "Active" : "Draft",
            template.UpdatedAtUtc);
    }

    private static NotificationResponse ToResponse(NotificationEntity notification) => new(
        notification.Id,
        notification.Type.ToString(),
        notification.Title,
        notification.Message,
        notification.IsRead,
        notification.RelatedExamId,
        notification.EmailStatus.ToString(),
        notification.CreatedAtUtc);
}
