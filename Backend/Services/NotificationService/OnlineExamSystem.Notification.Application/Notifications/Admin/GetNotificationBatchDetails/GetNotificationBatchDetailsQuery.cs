namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;

public record GetNotificationBatchDetailsQuery(Guid BatchId, Guid? OwnerUserId = null, string BearerToken = "");
