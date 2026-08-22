using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Audit.Admin.ListAuditLogs;

public class ListAuditLogsHandler
{
    // Same "return the full matching range for client-side aggregation"
    // convention every other report page in this app already uses (see
    // GetExamReportHandler / by-exam results) rather than inventing a new
    // pagination scheme - capped so an unbounded date range can't blow up
    // the response.
    private const int MaxRows = 5000;

    private readonly IAuditLogRepository _repository;

    public ListAuditLogsHandler(IAuditLogRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<AuditLog>> HandleAsync(
        ListAuditLogsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetAsync(query.FromUtc, query.ToUtc, query.Module, query.UserId, MaxRows, cancellationToken);
}
