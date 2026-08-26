using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.DuplicateTemplate;

public class DuplicateTemplateResult
{
    public bool IsNotFound { get; init; }
    public NotificationTemplate? Template { get; init; }

    public static DuplicateTemplateResult Ok(NotificationTemplate template) => new() { Template = template };

    public static DuplicateTemplateResult NotFound() => new() { IsNotFound = true };
}
