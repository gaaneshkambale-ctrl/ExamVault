using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.CreateTemplate;

public class CreateTemplateResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public NotificationTemplate? Template { get; init; }

    public static CreateTemplateResult Ok(NotificationTemplate template) =>
        new() { Success = true, Template = template };

    public static CreateTemplateResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };
}
