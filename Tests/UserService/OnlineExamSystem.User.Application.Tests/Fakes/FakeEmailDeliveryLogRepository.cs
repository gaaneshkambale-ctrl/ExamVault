using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeEmailDeliveryLogRepository : IEmailDeliveryLogRepository
{
    public EmailDeliverySummary Summary { get; set; } = new(0, 0, 0);
    public List<(string ToEmail, string Subject, bool Success, string? ErrorMessage)> Logged { get; } = new();

    public Task LogAsync(string toEmail, string subject, bool success, string? errorMessage, CancellationToken cancellationToken = default)
    {
        Logged.Add((toEmail, subject, success, errorMessage));
        return Task.CompletedTask;
    }

    public Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Summary);
}
