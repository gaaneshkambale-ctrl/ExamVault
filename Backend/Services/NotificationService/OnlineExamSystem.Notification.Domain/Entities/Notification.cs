using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

public class Notification : BaseEntity
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
}
