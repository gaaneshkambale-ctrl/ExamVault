namespace OnlineExamSystem.User.Application.Interfaces;

public interface IEmailDispatcher
{
    Task<bool> SendAsync(
        string toEmail,
        string toName,
        string subject,
        string body,
        CancellationToken cancellationToken = default);
}
