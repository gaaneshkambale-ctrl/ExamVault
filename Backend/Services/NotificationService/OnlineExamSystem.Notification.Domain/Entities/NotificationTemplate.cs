using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

public class NotificationTemplate : BaseEntity
{
    public required string Name { get; set; }
    public NotificationType Type { get; set; }
    public bool SendEmail { get; set; } = true;
    public bool SendInApp { get; set; } = true;
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
