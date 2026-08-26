namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

public record CreateNotificationTemplateRequest(
    string Name,
    string Type,
    bool SendEmail,
    bool SendInApp,
    string Subject,
    string Body,
    bool IsActive = true);

public record UpdateNotificationTemplateRequest(
    string Name,
    string Type,
    bool SendEmail,
    bool SendInApp,
    string Subject,
    string Body,
    bool IsActive);
