using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.SystemLogs.ResolveSystemErrorLog;

public class ResolveSystemErrorLogHandler
{
    private readonly ISystemErrorLogRepository _repository;

    public ResolveSystemErrorLogHandler(ISystemErrorLogRepository repository)
    {
        _repository = repository;
    }

    public async Task<ResolveSystemErrorLogResult> HandleAsync(
        ResolveSystemErrorLogCommand command,
        CancellationToken cancellationToken = default)
    {
        var entry = await _repository.GetByIdAsync(command.Id, cancellationToken);
        if (entry is null)
        {
            return ResolveSystemErrorLogResult.NotFound();
        }

        entry.IsResolved = true;
        entry.ResolvedAtUtc = DateTime.UtcNow;
        entry.ResolvedByUserId = command.ResolvedByUserId;
        await _repository.SaveChangesAsync(cancellationToken);

        return ResolveSystemErrorLogResult.Ok();
    }
}
