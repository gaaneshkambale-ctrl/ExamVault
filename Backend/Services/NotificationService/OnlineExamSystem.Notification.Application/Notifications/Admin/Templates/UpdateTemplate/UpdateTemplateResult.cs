using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;

public class UpdateTemplateResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public NotificationTemplate? Template { get; init; }

    public static UpdateTemplateResult Ok(NotificationTemplate template) =>
        new() { Success = true, Template = template };

    public static UpdateTemplateResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static UpdateTemplateResult NotFound() => new() { IsNotFound = true };
}
