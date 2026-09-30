namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;

public record GetNotificationHistoryStatsQuery(Guid? OwnerUserId = null, string BearerToken = "");
