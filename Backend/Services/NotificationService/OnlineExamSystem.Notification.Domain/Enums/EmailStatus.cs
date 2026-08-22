namespace OnlineExamSystem.Notification.Domain.Enums;

public enum EmailStatus
{
    Pending = 0,
    Delivered = 1,
    Failed = 2,
    // Email was intentionally never attempted because the sender chose an
    // In-App Only delivery channel - distinct from Pending (which means
    // "not due yet") and Failed (which means "attempted and lost").
    Skipped = 3,
}
