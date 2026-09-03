using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

// One row per send attempt through this service's own N8nEmailDispatcher
// (exam reminders, results published, general notification emails) - a
// separate log from UserService's own copy, since the two dispatchers are
// genuinely independent webhooks (see N8nEmailDispatcher.cs's own comment).
// BaseEntity, not TenantScopedEntity - same reasoning as SystemErrorLog:
// Super Admin's platform-wide Email Summary needs every row, not a
// per-organization slice.
public class EmailDeliveryLog : BaseEntity
{
    public required string ToEmail { get; set; }
    public required string Subject { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
