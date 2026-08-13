namespace OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;

public record ResendNotificationBatchCommand(Guid BatchId, Guid AdminUserId, string BearerToken);
