using OnlineExamSystem.Notification.Application.SystemLogs.ErrorSpike;
using OnlineExamSystem.Notification.Infrastructure.Email;

namespace OnlineExamSystem.Notification.API.Jobs;

/// <summary>Every 5 minutes: if System Logs has an error spike (see
/// ErrorSpikeCheck), email the platform owner. Recipient is Alerts:Email,
/// defaulting to the same support@ inbox the Contact form uses - deliberately
/// not a User Service lookup of Super Admins, so the alert still goes out
/// when the User Service is the thing that's broken.</summary>
public class ErrorSpikeAlertService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ErrorSpikeAlertService> _logger;
    private DateTime? _lastAlertUtc;

    public ErrorSpikeAlertService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ErrorSpikeAlertService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CheckOnceAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Not reported to System Logs itself - an alerting failure
                // shouldn't add to the very error count it is watching.
                _logger.LogError(ex, "Error spike alert check failed.");
            }
        }
    }

    private async Task CheckOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var check = scope.ServiceProvider.GetRequiredService<ErrorSpikeCheck>();
        var nowUtc = DateTime.UtcNow;

        var count = await check.EvaluateAsync(nowUtc, _lastAlertUtc, cancellationToken);
        if (count is null)
        {
            return;
        }

        var recipient = _configuration["Alerts:Email"] ?? "support@examvaults.in";
        var dispatcher = scope.ServiceProvider.GetRequiredService<IEmailDispatcher>();
        var sent = await dispatcher.SendAsync(
            recipient,
            "ExamVault Alerts",
            $"ExamVault alert: {count} errors in the last {ErrorSpikeCheck.Window.TotalMinutes:0} minutes",
            $"{count} new unresolved errors were recorded in System Logs in the last " +
            $"{ErrorSpikeCheck.Window.TotalMinutes:0} minutes (alert threshold: {ErrorSpikeCheck.Threshold}).\n\n" +
            "Check Super Admin > System Logs for details.\n\n" +
            $"You won't get another alert for {ErrorSpikeCheck.Cooldown.TotalMinutes:0} minutes.",
            "Alert",
            Guid.NewGuid(),
            cancellationToken);

        _lastAlertUtc = nowUtc;
        _logger.LogWarning("Error spike: {Count} errors in {Window}; alert email sent={Sent}.", count, ErrorSpikeCheck.Window, sent);
    }
}
