using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.ListTemplates;

public record ListTemplatesQuery(
    string? Search = null,
    NotificationType? Type = null,
    string? Channel = null,
    string? Status = null);
