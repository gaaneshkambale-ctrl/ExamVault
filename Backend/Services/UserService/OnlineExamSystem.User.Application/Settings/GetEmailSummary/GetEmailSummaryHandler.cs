using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Settings.GetEmailSummary;

// Sums UserService's own account-invite/test-email log with NotificationService's
// separate general-notification log (its own N8nEmailDispatcher copy, its own
// database) via the fail-open IEmailDeliverySummaryClient - the two dispatchers
// are genuinely independent (see N8nEmailDispatcher.cs's own comment), so a
// true platform-wide total has to add both, not just report UserService's slice.
public class GetEmailSummaryHandler
{
    private readonly IEmailDeliveryLogRepository _localRepository;
    private readonly IEmailDeliverySummaryClient _remoteClient;

    public GetEmailSummaryHandler(IEmailDeliveryLogRepository localRepository, IEmailDeliverySummaryClient remoteClient)
    {
        _localRepository = localRepository;
        _remoteClient = remoteClient;
    }

    public async Task<EmailSummaryResult> HandleAsync(GetEmailSummaryQuery query, CancellationToken cancellationToken = default)
    {
        var local = await _localRepository.GetTodaySummaryAsync(cancellationToken);
        var remote = await _remoteClient.GetTodaySummaryAsync(cancellationToken);

        var sent = local.Sent + remote.Sent;
        var delivered = local.Delivered + remote.Delivered;
        var failed = local.Failed + remote.Failed;
        var deliveryRate = sent == 0 ? (double?)null : Math.Round(delivered * 100.0 / sent, 1);

        return new EmailSummaryResult(sent, delivered, failed, deliveryRate);
    }
}
