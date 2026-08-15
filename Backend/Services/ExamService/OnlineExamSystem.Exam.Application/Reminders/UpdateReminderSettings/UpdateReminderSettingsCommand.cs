namespace OnlineExamSystem.Exam.Application.Reminders.UpdateReminderSettings;

public record UpdateReminderSettingsCommand(bool Enable24HourReminder, bool Enable1HourReminder);
