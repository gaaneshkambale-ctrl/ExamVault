using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeEmailDispatcher : IEmailDispatcher
{
    public List<(string ToEmail, string ToName, string Subject, string Body)> SentEmails { get; } = [];
    public bool ReturnFailure { get; set; }

    public Task<bool> SendAsync(
        string toEmail,
        string toName,
        string subject,
        string body,
        string? loginUrl = null,
        string? tenantSlug = null,
        CancellationToken cancellationToken = default)
    {
        if (ReturnFailure)
        {
            return Task.FromResult(false);
        }

        SentEmails.Add((toEmail, toName, subject, body));
        return Task.FromResult(true);
    }
}
