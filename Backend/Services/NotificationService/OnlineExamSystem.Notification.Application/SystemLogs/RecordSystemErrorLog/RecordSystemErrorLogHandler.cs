using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;

public class RecordSystemErrorLogHandler
{
    private const int MaxStackTraceLength = 4000;
    private const int MaxMessageLength = 2000;

    private readonly ISystemErrorLogRepository _repository;

    public RecordSystemErrorLogHandler(ISystemErrorLogRepository repository)
    {
        _repository = repository;
    }

    public async Task HandleAsync(RecordSystemErrorLogCommand command, CancellationToken cancellationToken = default)
    {
        var entry = new SystemErrorLog
        {
            Service = command.Service,
            Severity = command.Severity,
            Message = Truncate(command.Message, MaxMessageLength)!,
            ExceptionType = command.ExceptionType,
            StackTrace = Truncate(command.StackTrace, MaxStackTraceLength),
            RequestPath = command.RequestPath,
            RequestMethod = command.RequestMethod,
            TenantId = command.TenantId,
        };

        await _repository.AddAsync(entry, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private static string? Truncate(string? value, int maxLength) =>
        value is null || value.Length <= maxLength ? value : value[..maxLength];
}
