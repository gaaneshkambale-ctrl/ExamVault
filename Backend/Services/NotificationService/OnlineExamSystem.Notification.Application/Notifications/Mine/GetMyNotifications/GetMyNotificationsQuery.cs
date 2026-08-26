namespace OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;

public record GetMyNotificationsQuery(Guid UserId, bool UnreadOnly, int Page, int PageSize);
