using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;
using OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;
using OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetUnreadCount;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAllAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;
using OnlineExamSystem.Notification.Domain.Enums;
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
    private readonly GetUnreadCountHandler _getUnreadCountHandler;
    private readonly MarkAsReadHandler _markAsReadHandler;
    private readonly MarkAllAsReadHandler _markAllAsReadHandler;
    private readonly DeleteMyNotificationHandler _deleteMyNotificationHandler;
    private readonly GetMyPreferencesHandler _getMyPreferencesHandler;
    private readonly SavePreferencesHandler _savePreferencesHandler;
    private readonly CreateNotificationHandler _createNotificationHandler;
    private readonly GetNotificationHistoryHandler _getNotificationHistoryHandler;
    private readonly GetNotificationBatchDetailsHandler _getNotificationBatchDetailsHandler;
    private readonly ResendNotificationBatchHandler _resendNotificationBatchHandler;
    private readonly DeleteNotificationBatchHandler _deleteNotificationBatchHandler;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        GetMyNotificationsHandler getMyNotificationsHandler,
        GetUnreadCountHandler getUnreadCountHandler,
        MarkAsReadHandler markAsReadHandler,
        MarkAllAsReadHandler markAllAsReadHandler,
        DeleteMyNotificationHandler deleteMyNotificationHandler,
        GetMyPreferencesHandler getMyPreferencesHandler,
        SavePreferencesHandler savePreferencesHandler,
        CreateNotificationHandler createNotificationHandler,
        GetNotificationHistoryHandler getNotificationHistoryHandler,
        GetNotificationBatchDetailsHandler getNotificationBatchDetailsHandler,
        ResendNotificationBatchHandler resendNotificationBatchHandler,
        DeleteNotificationBatchHandler deleteNotificationBatchHandler,
        ILogger<NotificationsController> logger)
    {
        _getMyNotificationsHandler = getMyNotificationsHandler;
        _getUnreadCountHandler = getUnreadCountHandler;
        _markAsReadHandler = markAsReadHandler;
        _markAllAsReadHandler = markAllAsReadHandler;
        _deleteMyNotificationHandler = deleteMyNotificationHandler;
        _getMyPreferencesHandler = getMyPreferencesHandler;
        _savePreferencesHandler = savePreferencesHandler;
        _createNotificationHandler = createNotificationHandler;
        _getNotificationHistoryHandler = getNotificationHistoryHandler;
        _getNotificationBatchDetailsHandler = getNotificationBatchDetailsHandler;
        _resendNotificationBatchHandler = resendNotificationBatchHandler;
        _deleteNotificationBatchHandler = deleteNotificationBatchHandler;
        _logger = logger;
    }

    private Guid CallerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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

    [HttpPost("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateNotificationRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateNotificationCommand(
            request.Title,
            request.Message,
            request.Type,
            request.SendTo,
            request.UserIds,
            request.RelatedExamId,
            request.SendNow,
            request.ScheduledAtUtc,
            CallerId,
            BearerToken);

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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        NotificationType? parsedType = type is null ? null : Enum.Parse<NotificationType>(type, ignoreCase: true);

        var (items, totalCount) = await _getNotificationHistoryHandler.HandleAsync(
            new GetNotificationHistoryQuery(parsedType, page, pageSize), cancellationToken);

        var responses = items.Select(i => new NotificationBatchSummaryResponse(
            i.BatchId,
            i.Title,
            i.Type.ToString(),
            i.RecipientCount,
            i.SentAtUtc,
            i.ScheduledAtUtc,
            i.ScheduledAtUtc > DateTime.UtcNow ? "Scheduled" : "Sent")).ToList();

        return Ok(new NotificationHistoryResponse(responses, totalCount, page, pageSize));
    }

    [HttpGet("admin/history/{batchId:guid}")]
    [Authorize(Roles = "Admin")]
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
            d.Pending));
    }

    [HttpPost("admin/history/{batchId:guid}/resend")]
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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
