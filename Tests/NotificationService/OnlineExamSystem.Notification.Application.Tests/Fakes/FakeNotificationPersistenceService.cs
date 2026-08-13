using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public record RecordedCreateCall(
    Guid BatchId,
    IReadOnlyList<NotificationRecipient> Recipients,
    NotificationType Type,
    string Title,
    string Message,
    Guid? RelatedExamId,
    Guid? CreatedByAdminUserId,
    DateTime? ScheduledAtUtc);

public class FakeNotificationPersistenceService : INotificationPersistenceService
{
    public List<RecordedCreateCall> Calls { get; } = [];

    public Task<IReadOnlyList<NotificationEntity>> CreateNotificationsAsync(
        Guid batchId,
        IReadOnlyList<NotificationRecipient> recipients,
        NotificationType type,
        string title,
        string message,
        Guid? relatedExamId = null,
        Guid? createdByAdminUserId = null,
        DateTime? scheduledAtUtc = null,
        CancellationToken cancellationToken = default)
    {
        Calls.Add(new RecordedCreateCall(
            batchId, recipients, type, title, message, relatedExamId, createdByAdminUserId, scheduledAtUtc));

        var entities = recipients
            .Select(r => new NotificationEntity
            {
                BatchId = batchId,
                UserId = r.UserId,
                Type = type,
                Title = title,
                Message = message,
                RelatedExamId = relatedExamId,
                CreatedByAdminUserId = createdByAdminUserId,
                ScheduledAtUtc = scheduledAtUtc,
            })
            .ToList();

        return Task.FromResult<IReadOnlyList<NotificationEntity>>(entities);
    }
}
