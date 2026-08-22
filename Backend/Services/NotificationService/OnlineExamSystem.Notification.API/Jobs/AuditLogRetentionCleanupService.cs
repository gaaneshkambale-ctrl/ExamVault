using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.API.Jobs;

/// <summary>Enforces System Settings' Audit Log Retention Days for real - unlike
/// MaintenanceModeEnabled/LogLevel on the same entity (persisted but not yet wired to
/// real behavior), this one is bounded and safe to actually enforce: a single-service
/// DELETE of AuditLog rows older than the configured cutoff. Same polling
/// BackgroundService shape as ExamService's ExamReminderCheckService.</summary>
public class AuditLogRetentionCleanupService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogRetentionCleanupService> _logger;

    public AuditLogRetentionCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<AuditLogRetentionCleanupService> logger)
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
                _logger.LogError(ex, "Audit log retention cleanup failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CleanupOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var systemSettingsRepository = scope.ServiceProvider.GetRequiredService<ISystemSettingsRepository>();
        var auditLogRepository = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();

        var settings = await systemSettingsRepository.GetOrCreateAsync(cancellationToken);
        var cutoffUtc = DateTime.UtcNow.AddDays(-settings.AuditLogRetentionDays);

        var deletedCount = await auditLogRepository.DeleteOlderThanAsync(cutoffUtc, cancellationToken);
        if (deletedCount > 0)
        {
            _logger.LogInformation(
                "Audit log retention cleanup removed {DeletedCount} rows older than {CutoffUtc} ({RetentionDays} day retention).",
                deletedCount, cutoffUtc, settings.AuditLogRetentionDays);
        }
    }
}
