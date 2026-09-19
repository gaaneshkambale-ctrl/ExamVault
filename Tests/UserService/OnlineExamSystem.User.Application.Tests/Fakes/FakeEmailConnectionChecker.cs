using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeEmailConnectionChecker : IEmailConnectionChecker
{
    public EmailConnectionStatus Result { get; set; } = EmailConnectionStatus.Reachable;
    public string? LastCheckedUrl { get; private set; }

    public Task<EmailConnectionStatus> CheckAsync(string webhookUrl, CancellationToken cancellationToken = default)
    {
        LastCheckedUrl = webhookUrl;
        return Task.FromResult(Result);
    }
}
