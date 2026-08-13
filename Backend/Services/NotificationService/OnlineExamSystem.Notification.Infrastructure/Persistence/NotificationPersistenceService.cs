using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Notification.Infrastructure.Email;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NotificationPersistenceService : INotificationPersistenceService
{
    private readonly NotificationDbContext _dbContext;
    private readonly IEmailDispatcher _emailDispatcher;

    public NotificationPersistenceService(NotificationDbContext dbContext, IEmailDispatcher emailDispatcher)
    {
        _dbContext = dbContext;
        _emailDispatcher = emailDispatcher;
    }

    public async Task<IReadOnlyList<NotificationEntity>> CreateNotificationsAsync(
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
        var recipientIds = recipients.Select(r => r.UserId).ToList();
        var preferences = await _dbContext.NotificationPreferences
            .Where(p => p.Type == type && recipientIds.Contains(p.UserId))
            .ToListAsync(cancellationToken);
        var preferenceByUserId = preferences.ToDictionary(p => p.UserId);

        var isDue = scheduledAtUtc is null || scheduledAtUtc <= DateTime.UtcNow;
        var entities = new List<NotificationEntity>();

        foreach (var recipient in recipients)
        {
            var emailEnabled = !preferenceByUserId.TryGetValue(recipient.UserId, out var preference) || preference.EmailEnabled;

            var entity = new NotificationEntity
            {
                BatchId = batchId,
                UserId = recipient.UserId,
                Type = type,
                Title = title,
                Message = message,
                RelatedExamId = relatedExamId,
                CreatedByAdminUserId = createdByAdminUserId,
                ScheduledAtUtc = scheduledAtUtc,
                EmailStatus = EmailStatus.Pending,
            };

            if (isDue)
            {
                if (emailEnabled)
                {
                    var delivered = await _emailDispatcher.SendAsync(
                        recipient.Email,
                        recipient.FullName,
                        title,
                        message,
                        type.ToString(),
                        entity.Id,
                        cancellationToken);
                    entity.EmailStatus = delivered ? EmailStatus.Delivered : EmailStatus.Failed;
                }
                else
                {
                    // In-app delivery is instant and unconditional - a recipient
                    // with Email off for this type still counts as Delivered.
                    entity.EmailStatus = EmailStatus.Delivered;
                }
            }
            // Scheduled-for-later batches are store-only: EmailStatus stays
            // Pending forever, no dispatcher is ever attempted for them.

            entities.Add(entity);
        }

        _dbContext.Notifications.AddRange(entities);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return entities;
    }
}
