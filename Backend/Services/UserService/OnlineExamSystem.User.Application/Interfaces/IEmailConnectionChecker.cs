namespace OnlineExamSystem.User.Application.Interfaces;

public enum EmailConnectionStatus
{
    NotConfigured,
    Reachable,
    Unreachable,
}

public interface IEmailConnectionChecker
{
    /// <summary>Lightweight reachability probe - does NOT trigger the n8n
    /// workflow (never POSTs a real payload). Any HTTP response, including a
    /// 404/405 for an unsupported method, counts as Reachable: it proves DNS,
    /// TCP, and TLS all succeeded and something is listening. Only a timeout,
    /// connection refusal, or DNS failure counts as Unreachable.</summary>
    Task<EmailConnectionStatus> CheckAsync(string webhookUrl, CancellationToken cancellationToken = default);
}
