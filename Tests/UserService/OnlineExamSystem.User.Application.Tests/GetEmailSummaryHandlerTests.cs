using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Settings.GetEmailSummary;
using OnlineExamSystem.User.Application.Tests.Fakes;

namespace OnlineExamSystem.User.Application.Tests;

public class GetEmailSummaryHandlerTests
{
    [Fact]
    public async Task Sums_local_and_remote_counts()
    {
        var localRepository = new FakeEmailDeliveryLogRepository { Summary = new EmailDeliverySummary(Sent: 3, Delivered: 2, Failed: 1) };
        var remoteClient = new FakeEmailDeliverySummaryClient { Summary = new EmailDeliverySummary(Sent: 7, Delivered: 6, Failed: 1) };
        var handler = new GetEmailSummaryHandler(localRepository, remoteClient);

        var result = await handler.HandleAsync(new GetEmailSummaryQuery());

        Assert.Equal(10, result.SentToday);
        Assert.Equal(8, result.DeliveredToday);
        Assert.Equal(2, result.FailedToday);
        Assert.Equal(80.0, result.DeliveryRatePercent);
    }

    [Fact]
    public async Task No_sends_today_reports_a_null_delivery_rate_instead_of_dividing_by_zero()
    {
        var localRepository = new FakeEmailDeliveryLogRepository { Summary = new EmailDeliverySummary(0, 0, 0) };
        var remoteClient = new FakeEmailDeliverySummaryClient { Summary = new EmailDeliverySummary(0, 0, 0) };
        var handler = new GetEmailSummaryHandler(localRepository, remoteClient);

        var result = await handler.HandleAsync(new GetEmailSummaryQuery());

        Assert.Equal(0, result.SentToday);
        Assert.Null(result.DeliveryRatePercent);
    }

    [Fact]
    public async Task Remote_service_outage_still_reports_local_counts_instead_of_failing()
    {
        // FakeEmailDeliverySummaryClient always succeeds in these tests, but its
        // real implementation (EmailDeliverySummaryClient) fails open to (0,0,0)
        // on any exception - this test documents the handler's contract with
        // that fail-open contract, not a network failure itself.
        var localRepository = new FakeEmailDeliveryLogRepository { Summary = new EmailDeliverySummary(Sent: 4, Delivered: 4, Failed: 0) };
        var remoteClient = new FakeEmailDeliverySummaryClient { Summary = new EmailDeliverySummary(0, 0, 0) };
        var handler = new GetEmailSummaryHandler(localRepository, remoteClient);

        var result = await handler.HandleAsync(new GetEmailSummaryQuery());

        Assert.Equal(4, result.SentToday);
        Assert.Equal(4, result.DeliveredToday);
        Assert.Equal(100.0, result.DeliveryRatePercent);
    }
}
