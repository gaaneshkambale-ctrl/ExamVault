using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeEmailDeliverySummaryClient : IEmailDeliverySummaryClient
{
    public EmailDeliverySummary Summary { get; set; } = new(0, 0, 0);

    public Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Summary);
}
