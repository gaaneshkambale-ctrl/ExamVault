namespace OnlineExamSystem.Notification.Domain.Enums;

public enum NotificationType
{
    Exam = 0,
    Reminder = 1,
    Result = 2,
    System = 3,
    Account = 4,
    // Added for the Super Admin's platform-wide Notification Templates
    // library (setting.png/notifications.png) - a tenant-level Admin's
    // templates never use these, only templates created under the
    // reserved Platform tenant do.
    Announcement = 5,
    Alert = 6,
}
