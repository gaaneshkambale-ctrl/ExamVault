using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.SystemLogs.ErrorSpike;

/// <summary>Decides whether the System Logs error rate warrants emailing the
/// platform owner (ErrorSpikeAlertService polls this). Nothing pushed an
/// alert anywhere before - an incident was only noticed when users
/// complained. Cooldown keeps an ongoing incident from sending an email every
/// poll; it's in-memory in the caller, so a restart can send one extra.</summary>
public class ErrorSpikeCheck
{
    public const int Threshold = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan Cooldown = TimeSpan.FromHours(1);

    private readonly ISystemErrorLogRepository _repository;

    public ErrorSpikeCheck(ISystemErrorLogRepository repository)
    {
        _repository = repository;
    }

    /// <summary>The recent unresolved error count when an alert should be sent
    /// now, otherwise null.</summary>
    public async Task<int?> EvaluateAsync(DateTime nowUtc, DateTime? lastAlertUtc, CancellationToken cancellationToken = default)
    {
        if (lastAlertUtc is { } last && nowUtc - last < Cooldown)
        {
            return null;
        }

        var count = await _repository.CountUnresolvedSinceAsync(nowUtc - Window, cancellationToken);
        return count >= Threshold ? count : null;
    }
}
