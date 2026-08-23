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
            else if (isDue)
            {
                if (emailEnabled)
                {
                    var delivered = await _emailDispatcher.SendAsync(
                        recipient.Email,
                        recipient.FullName,
                        recipientTitle,
                        recipientMessage,
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
