using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface INotificationPersistenceService
{
    Task<IReadOnlyList<NotificationEntity>> CreateNotificationsAsync(
        Guid batchId,
        IReadOnlyList<NotificationRecipient> recipients,
        NotificationType type,
        string title,
        string message,
        Guid? relatedExamId = null,
        Guid? createdByAdminUserId = null,
        DateTime? scheduledAtUtc = null,
        bool sendEmail = true,
        bool sendInApp = true,
        CancellationToken cancellationToken = default);
}
