using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.API.Jobs;

/// <summary>Fixed 30-day retention for SystemErrorLog - simpler than
/// AuditLogRetentionCleanupService's per-tenant setting, since these aren't
/// tenant data (many rows have no TenantId at all): one global cutoff is
/// enough. Same polling BackgroundService shape.</summary>
public class SystemErrorLogRetentionCleanupService : BackgroundService
{
    private const int RetentionDays = 30;
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SystemErrorLogRetentionCleanupService> _logger;

    public SystemErrorLogRetentionCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<SystemErrorLogRetentionCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                await CleanupOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "System error log retention cleanup failed.");
                await ReportSystemErrorAsync(ex, stoppingToken);
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    // Lives in the same service that hosts SystemLogsController, so this can
    // call the handler directly instead of the HTTP round-trip every other
    // service's background jobs need.
    private async Task ReportSystemErrorAsync(Exception exception, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var recordHandler = scope.ServiceProvider.GetRequiredService<RecordSystemErrorLogHandler>();
            await recordHandler.HandleAsync(
                new RecordSystemErrorLogCommand(
                    "Notification Service",
                    SystemLogLevel.Error,
                    exception.Message,
                    exception.GetType().FullName,
                    exception.StackTrace,
                    null,
                    null,
                    null),
                cancellationToken);
        }
        catch
        {
            // Best-effort only.
        }
    }

    private async Task CleanupOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<ISystemErrorLogRepository>();

        var cutoffUtc = DateTime.UtcNow.AddDays(-RetentionDays);
        var deletedCount = await repository.DeleteOlderThanAsync(cutoffUtc, cancellationToken);
        if (deletedCount > 0)
        {
            _logger.LogInformation(
                "System error log retention cleanup removed {DeletedCount} rows older than {CutoffUtc}.",
                deletedCount, cutoffUtc);
        }
    }
}
