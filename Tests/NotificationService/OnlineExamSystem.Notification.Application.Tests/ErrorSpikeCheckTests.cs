using OnlineExamSystem.Notification.Application.SystemLogs.ErrorSpike;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Notification.Application.Tests;

public class ErrorSpikeCheckTests
{
    private static readonly DateTime Now = new(2026, 9, 26, 12, 0, 0, DateTimeKind.Utc);

    private static FakeSystemErrorLogRepository RepositoryWith(int count, TimeSpan age, bool resolved = false)
    {
        var repository = new FakeSystemErrorLogRepository();
        for (var i = 0; i < count; i++)
        {
            repository.Entries.Add(new SystemErrorLog
            {
                Service = "User Service",
                Severity = SystemLogLevel.Error,
                Message = "Boom",
                CreatedAtUtc = Now - age,
                IsResolved = resolved,
            });
        }
        return repository;
    }

    [Fact]
    public async Task Below_the_threshold_does_not_alert()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(ErrorSpikeCheck.Threshold - 1, TimeSpan.FromMinutes(1)));

        Assert.Null(await check.EvaluateAsync(Now, lastAlertUtc: null));
    }

    [Fact]
    public async Task Reaching_the_threshold_alerts_with_the_count()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(ErrorSpikeCheck.Threshold, TimeSpan.FromMinutes(1)));

        Assert.Equal(ErrorSpikeCheck.Threshold, await check.EvaluateAsync(Now, lastAlertUtc: null));
    }

    [Fact]
    public async Task No_second_alert_within_the_cooldown()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(50, TimeSpan.FromMinutes(1)));

        Assert.Null(await check.EvaluateAsync(Now, lastAlertUtc: Now - TimeSpan.FromMinutes(20)));
    }

    [Fact]
    public async Task Alerts_again_once_the_cooldown_has_passed()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(50, TimeSpan.FromMinutes(1)));

        Assert.Equal(50, await check.EvaluateAsync(Now, lastAlertUtc: Now - ErrorSpikeCheck.Cooldown - TimeSpan.FromMinutes(1)));
    }

    [Fact]
    public async Task Errors_outside_the_window_do_not_count()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(50, ErrorSpikeCheck.Window + TimeSpan.FromMinutes(1)));

        Assert.Null(await check.EvaluateAsync(Now, lastAlertUtc: null));
    }

    [Fact]
    public async Task Resolved_errors_do_not_count()
    {
        var check = new ErrorSpikeCheck(RepositoryWith(50, TimeSpan.FromMinutes(1), resolved: true));

        Assert.Null(await check.EvaluateAsync(Now, lastAlertUtc: null));
    }
}
