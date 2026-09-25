using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NotificationPersistenceService : INotificationPersistenceService
{
    private readonly NotificationDbContext _dbContext;
    private readonly INotificationDispatchQueue _dispatchQueue;

    public NotificationPersistenceService(NotificationDbContext dbContext, INotificationDispatchQueue dispatchQueue)
    {
        _dbContext = dbContext;
        _dispatchQueue = dispatchQueue;
    }

    public async Task<IReadOnlyList<NotificationEntity>> CreateNotificationsAsync(
        Guid tenantId,
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
        CancellationToken cancellationToken = default)
    {
        // IgnoreQueryFilters + explicit tenantId: this method is called both from an
        // authenticated admin request (ambient tenant available) and from background
        // consumers with no HttpContext at all (see the *Consumer classes) - tenantId is
        // always passed in explicitly so both callers behave identically rather than the
        // consumer path silently seeing no preferences at all.
        var recipientIds = recipients.Select(r => r.UserId).ToList();
        var preferences = await _dbContext.NotificationPreferences
            .IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId && p.Type == type && recipientIds.Contains(p.UserId))
            .ToListAsync(cancellationToken);
        var preferenceByUserId = preferences.ToDictionary(p => p.UserId);

        var isDue = scheduledAtUtc is null || scheduledAtUtc <= DateTime.UtcNow;
        var entities = new List<NotificationEntity>();

        foreach (var recipient in recipients)
        {
            // The only genuinely per-recipient merge fields - exam-level
            // fields ({{examTitle}}/{{startDate}}/{{duration}}) are already
            // substituted client-side before this call, since they're the
            // same for every recipient in the batch.
            var recipientTitle = title
                .Replace("{{studentName}}", recipient.FullName)
                .Replace("{{studentEmail}}", recipient.Email);
            var recipientMessage = message
                .Replace("{{studentName}}", recipient.FullName)
                .Replace("{{studentEmail}}", recipient.Email);

            var emailEnabled = !preferenceByUserId.TryGetValue(recipient.UserId, out var preference) || preference.EmailEnabled;

            var entity = new NotificationEntity
            {
                TenantId = tenantId,
                BatchId = batchId,
                UserId = recipient.UserId,
                Type = type,
                Title = recipientTitle,
                Message = recipientMessage,
                RelatedExamId = relatedExamId,
                CreatedByAdminUserId = createdByAdminUserId,
                ScheduledAtUtc = scheduledAtUtc,
                EmailStatus = EmailStatus.Pending,
                ShowInApp = sendInApp,
            };

            if (!sendEmail)
            {
                entity.EmailStatus = EmailStatus.Skipped;
            }
            else if (isDue && !emailEnabled)
            {
                // In-app delivery is instant and unconditional - a recipient
                // with Email off for this type still counts as Delivered.
                entity.EmailStatus = EmailStatus.Delivered;
            }
            // Otherwise (isDue && emailEnabled, or scheduled-for-later)
            // EmailStatus stays Pending - the actual email send for a due,
            // enabled recipient is queued below rather than awaited here.

            entities.Add(entity);
        }

        _dbContext.Notifications.AddRange(entities);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Only now, after every row for this batch is safely persisted, hand
        // the slow part (a real per-recipient outbound email call) to the
        // background dispatcher. Sending inline here - as this method used
        // to - meant a large batch could run long enough for the caller's
        // HTTP request to be cancelled (e.g. an API gateway timeout) before
        // SaveChangesAsync was ever reached, silently discarding the whole
        // batch even though some emails had already gone out for real.
        for (var i = 0; i < entities.Count; i++)
        {
            var entity = entities[i];
            if (entity.EmailStatus != EmailStatus.Pending || !isDue)
            {
                continue;
            }

            var recipient = recipients[i];
            _dispatchQueue.Enqueue(new NotificationDispatchItem(
                entity.Id,
                recipient.Email,
                recipient.FullName,
                entity.Title,
                entity.Message,
                type.ToString()));
        }

        return entities;
    }
}
