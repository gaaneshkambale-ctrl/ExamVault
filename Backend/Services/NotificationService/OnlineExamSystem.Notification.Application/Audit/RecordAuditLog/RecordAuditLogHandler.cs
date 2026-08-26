using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Audit.RecordAuditLog;

public class RecordAuditLogHandler
{
    private readonly IAuditLogRepository _repository;

    public RecordAuditLogHandler(IAuditLogRepository repository)
    {
        _repository = repository;
    }

    public async Task HandleAsync(RecordAuditLogCommand command, CancellationToken cancellationToken = default)
    {
        var entry = new AuditLog
        {
            TenantId = command.TenantId,
            Module = command.Module,
            Activity = command.Activity,
            Details = command.Details,
            EntityId = command.EntityId,
            UserId = command.UserId,
            UserName = command.UserName,
            IpAddress = command.IpAddress,
        };

        await _repository.AddAsync(entry, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }
}
