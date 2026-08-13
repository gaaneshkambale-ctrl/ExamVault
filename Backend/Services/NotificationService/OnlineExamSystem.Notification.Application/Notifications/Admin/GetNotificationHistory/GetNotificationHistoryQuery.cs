using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;

public record GetNotificationHistoryQuery(NotificationType? Type, int Page, int PageSize);
