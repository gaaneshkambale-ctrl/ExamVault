using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Notification.Infrastructure.Persistence;

namespace OnlineExamSystem.Notification.API.Jobs;

/// <summary>Sends the actual per-recipient email for a notification batch
/// outside the HTTP request that created it. NotificationPersistenceService
/// persists every row as Pending up front and enqueues one
/// NotificationDispatchItem per recipient here rather than awaiting the send
/// inline - a large batch used to run long enough for the caller's request
/// to be cancelled (e.g. an API gateway timeout) before its one
/// SaveChangesAsync call was ever reached, silently discarding the whole
/// batch even though some emails had already gone out for real.</summary>
public class NotificationDispatchBackgroundService : BackgroundService
{
    private readonly INotificationDispatchQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationDispatchBackgroundService> _logger;

    public NotificationDispatchBackgroundService(
        INotificationDispatchQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<NotificationDispatchBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var item in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await DispatchAsync(item, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(
                    ex,
                    "Failed to dispatch notification {NotificationId} to {RecipientEmail}.",
                    item.NotificationId,
                    item.RecipientEmail);
            }
        }
    }

    private async Task DispatchAsync(NotificationDispatchItem item, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
        var emailDispatcher = scope.ServiceProvider.GetRequiredService<IEmailDispatcher>();

        var delivered = await emailDispatcher.SendAsync(
            item.RecipientEmail,
            item.RecipientName,
            item.Title,
            item.Message,
            item.TypeName,
            item.NotificationId,
            cancellationToken);

        // IgnoreQueryFilters: this runs with no ambient HttpContext, so
        // ICurrentTenant reports unauthenticated - same reasoning as every
        // other background-consumer read in this service.
        var entity = await dbContext.Notifications
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(n => n.Id == item.NotificationId, cancellationToken);
        if (entity is null)
        {
            return;
        }

        entity.EmailStatus = delivered ? EmailStatus.Delivered : EmailStatus.Failed;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
