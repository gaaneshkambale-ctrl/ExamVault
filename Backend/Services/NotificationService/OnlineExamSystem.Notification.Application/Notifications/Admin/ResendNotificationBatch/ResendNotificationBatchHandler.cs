using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;

public class ResendNotificationBatchHandler
{
    private readonly INotificationRepository _repository;
    private readonly IUserDirectoryClient _userDirectoryClient;
    private readonly INotificationPersistenceService _persistenceService;

    public ResendNotificationBatchHandler(
        INotificationRepository repository,
        IUserDirectoryClient userDirectoryClient,
        INotificationPersistenceService persistenceService)
    {
        _repository = repository;
        _userDirectoryClient = userDirectoryClient;
        _persistenceService = persistenceService;
    }

    public async Task<ResendNotificationBatchResult> HandleAsync(
        ResendNotificationBatchCommand command,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repository.GetByBatchIdAsync(command.BatchId, cancellationToken);
        if (rows.Count == 0)
        {
            return ResendNotificationBatchResult.NotFound();
        }

        var first = rows[0];
        var recipientIds = rows.Select(r => r.UserId).Distinct().ToHashSet();

        var allUsers = await _userDirectoryClient.GetAllUsersAsync(command.BearerToken, cancellationToken);
        var recipients = allUsers
            .Where(u => recipientIds.Contains(u.Id))
            .Select(u => new NotificationRecipient(u.Id, u.Email, u.FullName))
            .ToList();

        var newBatchId = Guid.NewGuid();

        await _persistenceService.CreateNotificationsAsync(
            newBatchId,
            recipients,
            first.Type,
            first.Title,
            first.Message,
            first.RelatedExamId,
            command.AdminUserId,
            scheduledAtUtc: null,
            cancellationToken: cancellationToken);

        return ResendNotificationBatchResult.Ok(newBatchId, recipients.Count);
    }
}
