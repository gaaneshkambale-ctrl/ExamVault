namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;

public record UpdateTemplateCommand(
    Guid Id,
    string Name,
    string Type,
    bool SendEmail,
    bool SendInApp,
    string Subject,
    string Body,
    bool IsActive);
