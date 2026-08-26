namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.CreateTemplate;

public record CreateTemplateCommand(
    string Name,
    string Type,
    bool SendEmail,
    bool SendInApp,
    string Subject,
    string Body,
    bool IsActive);
