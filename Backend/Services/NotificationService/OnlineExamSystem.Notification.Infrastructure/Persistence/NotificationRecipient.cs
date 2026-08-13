namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public record NotificationRecipient(Guid UserId, string Email, string FullName);
