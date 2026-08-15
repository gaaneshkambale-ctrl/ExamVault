namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record UpdateReminderSettingsRequest(bool Enable24HourReminder, bool Enable1HourReminder);
