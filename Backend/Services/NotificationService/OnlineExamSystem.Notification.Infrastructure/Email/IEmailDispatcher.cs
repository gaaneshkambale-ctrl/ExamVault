namespace OnlineExamSystem.Notification.Infrastructure.Email;

public interface IEmailDispatcher
{
    Task<bool> SendAsync(
        string toEmail,
        string toName,
        string subject,
        string body,
        string type,
        Guid notificationId,
        CancellationToken cancellationToken = default);
}
