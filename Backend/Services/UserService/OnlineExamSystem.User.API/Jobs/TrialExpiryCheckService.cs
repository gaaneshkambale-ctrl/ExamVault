using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.API.Jobs;

/// <summary>Auto-deactivates any tenant whose trial has expired while it's still Active -
/// previously TrialEndsAtUtc was purely informational (the Trial Organizations list showed
/// "Expired" but the org kept working normally). Same polling BackgroundService shape as
/// ExamService's ExamReminderCheckService / NotificationService's
/// AuditLogRetentionCleanupService. Only flips IsActive, exactly what the manual Deactivate
/// action does (LoginUserHandler already rejects logins for an inactive tenant) - IsTrial and
/// TrialEndsAtUtc are left untouched, so Reactivate/End Trial/Change Plan still work the same
/// way afterward if a Super Admin wants to recover the organization.</summary>
public class TrialExpiryCheckService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TrialExpiryCheckService> _logger;

    public TrialExpiryCheckService(IServiceScopeFactory scopeFactory, ILogger<TrialExpiryCheckService> logger)
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
                await CheckOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Trial expiry check failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var tenantRepository = scope.ServiceProvider.GetRequiredService<ITenantRepository>();
        var auditClient = scope.ServiceProvider.GetRequiredService<IAuditClient>();

        var now = DateTime.UtcNow;
        var tenants = await tenantRepository.GetAllAsync(cancellationToken);
        var expired = tenants
            .Where(t => t.IsActive && t.IsTrial && t.TrialEndsAtUtc is not null && t.TrialEndsAtUtc <= now)
            .ToList();
        if (expired.Count == 0)
        {
            return;
        }

        foreach (var tenant in expired)
        {
            tenant.IsActive = false;
        }
        await tenantRepository.SaveChangesAsync(cancellationToken);

        foreach (var tenant in expired)
        {
            _logger.LogInformation(
                "Tenant {TenantId} ({Name}) auto-deactivated - trial ended {TrialEndsAtUtc}.",
                tenant.Id, tenant.Name, tenant.TrialEndsAtUtc);
            await auditClient.RecordAsync(
                tenant.Id,
                "Security",
                "Organization deactivated",
                "Trial expired",
                null,
                null,
                "System",
                null,
                cancellationToken: cancellationToken);
        }
    }
}
