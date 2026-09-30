namespace OnlineExamSystem.User.Application.Interfaces;

public interface IEmailDeliverySummaryClient
{
    /// <summary>NotificationService's own today summary (its N8nEmailDispatcher
    /// copy logs separately, in its own database). Fail-open to (0, 0, 0) on
    /// any network failure - this backs a display-only stat, never a gate.</summary>
    Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default);
}
