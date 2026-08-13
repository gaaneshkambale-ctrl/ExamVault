using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public NotificationType Type { get; set; }
    public bool InAppEnabled { get; set; } = true;
    public bool EmailEnabled { get; set; } = true;
}
