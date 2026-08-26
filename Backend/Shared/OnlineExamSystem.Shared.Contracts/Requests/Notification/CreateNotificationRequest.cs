namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

public record CreateNotificationRequest(
    string Title,
    string Message,
    string Type,
    string SendTo,
    IReadOnlyList<Guid>? UserIds,
    Guid? RelatedExamId,
    bool SendNow,
    DateTime? ScheduledAtUtc,
    bool SendEmail = true,
    bool SendInApp = true);
