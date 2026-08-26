namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record NotificationTemplateResponse(
    Guid Id,
    string Name,
    string Type,
    bool SendEmail,
    bool SendInApp,
    string Channels,
    string Subject,
    string Body,
    string Status,
    DateTime UpdatedAtUtc);
