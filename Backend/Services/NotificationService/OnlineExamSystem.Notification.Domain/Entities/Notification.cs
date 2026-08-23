using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.Domain.Entities;

public class Notification : TenantScopedEntity
{
    public Guid BatchId { get; set; }
    public Guid UserId { get; set; }
    public NotificationType Type { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public bool IsRead { get; set; }
    public Guid? RelatedExamId { get; set; }
    public EmailStatus EmailStatus { get; set; } = EmailStatus.Pending;
    public Guid? CreatedByAdminUserId { get; set; }
    public DateTime? ScheduledAtUtc { get; set; }
    // Row always gets created (needed for admin History/delivery tracking
    // regardless of channel choice) - this just controls whether it's
    // surfaced in the student's own in-app notification list.
    public bool ShowInApp { get; set; } = true;
}
