namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ReminderSettingsResponse(bool Enable24HourReminder, bool Enable1HourReminder, DateTime UpdatedAtUtc = default);
