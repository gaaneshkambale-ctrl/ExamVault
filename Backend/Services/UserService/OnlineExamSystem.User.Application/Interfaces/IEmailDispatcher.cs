namespace OnlineExamSystem.User.Application.Interfaces;

public interface IEmailDispatcher
{
    Task<bool> SendAsync(
        string toEmail,
        string toName,
        string subject,
        string body,
        string? loginUrl = null,
        string? tenantSlug = null,
        CancellationToken cancellationToken = default);
}
