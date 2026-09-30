namespace OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;

public record CreateNotificationCommand(
    Guid TenantId,
    string Title,
    string Message,
    string Type,
    string SendTo,
    IReadOnlyList<Guid>? UserIds,
    Guid? RelatedExamId,
    bool SendNow,
    DateTime? ScheduledAtUtc,
    Guid AdminUserId,
    string BearerToken,
    bool SendEmail = true,
    bool SendInApp = true,
    // Instructor is restricted to notifications tied to an exam they
    // created themselves (RelatedExamId must be set and match) - null for
    // Admin/SuperAdmin, unrestricted.
    Guid? OwnerUserId = null);
