using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;

public class DeleteNotificationBatchHandler
{
    private readonly INotificationRepository _repository;

    public DeleteNotificationBatchHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<DeleteNotificationBatchResult> HandleAsync(
        DeleteNotificationBatchCommand command,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repository.GetByBatchIdAsync(command.BatchId, cancellationToken);
        if (rows.Count == 0)
        {
            return DeleteNotificationBatchResult.NotFound();
        }

        await _repository.RemoveBatchAsync(command.BatchId, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return DeleteNotificationBatchResult.Ok();
    }
}
