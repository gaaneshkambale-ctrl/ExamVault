namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface INewsletterSubscriberRepository
{
    /// <summary>Idempotent - re-subscribing an email already on the list is a
    /// silent no-op (matches the "Thanks for subscribing!" success the caller
    /// always shows, whether or not the email was already there).</summary>
    Task SubscribeAsync(string email, CancellationToken cancellationToken = default);
}
