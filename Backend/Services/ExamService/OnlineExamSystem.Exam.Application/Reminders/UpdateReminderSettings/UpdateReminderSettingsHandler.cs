using OnlineExamSystem.Exam.Application.Interfaces;
using ReminderSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ReminderSettings;

namespace OnlineExamSystem.Exam.Application.Reminders.UpdateReminderSettings;

public class UpdateReminderSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public UpdateReminderSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<ReminderSettingsEntity> HandleAsync(
        UpdateReminderSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var settings = await _examRepository.GetOrCreateReminderSettingsAsync(cancellationToken);
        settings.Enable24HourReminder = command.Enable24HourReminder;
        settings.Enable1HourReminder = command.Enable1HourReminder;
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
