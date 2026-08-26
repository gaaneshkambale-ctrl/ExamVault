using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.SystemLogs.ListSystemErrorLogs;

public class ListSystemErrorLogsHandler
{
    // Same "full matching range for client-side aggregation" convention as
    // ListAuditLogsHandler - capped so an unbounded date range can't blow
    // up the response.
    private const int MaxRows = 5000;

    private readonly ISystemErrorLogRepository _repository;

    public ListSystemErrorLogsHandler(ISystemErrorLogRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<SystemErrorLog>> HandleAsync(
        ListSystemErrorLogsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetAsync(
            query.FromUtc, query.ToUtc, query.Service, query.Severity, query.IsResolved, MaxRows, cancellationToken);
}
