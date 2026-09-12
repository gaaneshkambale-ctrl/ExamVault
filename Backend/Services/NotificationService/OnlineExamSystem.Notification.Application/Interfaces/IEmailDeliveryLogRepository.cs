namespace OnlineExamSystem.Notification.Application.Interfaces;

public record EmailDeliverySummary(int Sent, int Delivered, int Failed);

public interface IEmailDeliveryLogRepository
{
    /// <summary>Best-effort - callers must never let a logging failure break the
    /// send itself. Records one row per attempt, success or failure.</summary>
    Task LogAsync(string toEmail, string subject, bool success, string? errorMessage, CancellationToken cancellationToken = default);

    /// <summary>Counts today's (UTC) send attempts by outcome.</summary>
    Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default);
}
