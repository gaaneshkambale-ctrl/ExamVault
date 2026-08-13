namespace OnlineExamSystem.Notification.Application.Interfaces;

public record NotificationRecipient(Guid UserId, string Email, string FullName);
