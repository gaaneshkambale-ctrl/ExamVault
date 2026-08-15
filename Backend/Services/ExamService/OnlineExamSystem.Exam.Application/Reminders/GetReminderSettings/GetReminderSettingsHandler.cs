using OnlineExamSystem.Exam.Application.Interfaces;
using ReminderSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ReminderSettings;

namespace OnlineExamSystem.Exam.Application.Reminders.GetReminderSettings;

public class GetReminderSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public GetReminderSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<ReminderSettingsEntity> HandleAsync(
        GetReminderSettingsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetOrCreateReminderSettingsAsync(cancellationToken);
}
