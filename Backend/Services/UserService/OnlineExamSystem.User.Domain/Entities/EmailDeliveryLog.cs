using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

// One row per send attempt through N8nEmailDispatcher (account-invite,
// password reset, test email). BaseEntity, not TenantScopedEntity - same
// reasoning as PlatformSettings and NotificationService's SystemErrorLog:
// this is an operational log Super Admin needs to see in full, not
// per-organization data.
public class EmailDeliveryLog : BaseEntity
{
    public required string ToEmail { get; set; }
    public required string Subject { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
