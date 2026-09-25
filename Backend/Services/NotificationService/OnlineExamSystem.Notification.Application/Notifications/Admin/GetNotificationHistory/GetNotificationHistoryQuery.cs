using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;

public record GetNotificationHistoryQuery(
    NotificationType? Type,
    int Page,
    int PageSize,
    string? Search = null,
    string? Channel = null,
    string? Status = null,
    // Instructor sees only batches related to an exam they own - null for
    // Admin/SuperAdmin (unrestricted). BearerToken is only needed to
    // resolve the owned-exam-id set when OwnerUserId is set.
    Guid? OwnerUserId = null,
    string BearerToken = "");
