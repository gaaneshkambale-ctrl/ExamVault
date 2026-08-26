using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Enums;
using ExamDefaultsEntity = OnlineExamSystem.Exam.Domain.Entities.ExamDefaults;

namespace OnlineExamSystem.Exam.Application.Settings.UpdateExamDefaults;

public class UpdateExamDefaultsHandler
{
    private readonly IExamRepository _examRepository;

    public UpdateExamDefaultsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<ExamDefaultsEntity> HandleAsync(
        UpdateExamDefaultsCommand command,
        CancellationToken cancellationToken = default)
    {
        var settings = await _examRepository.GetOrCreateExamDefaultsAsync(cancellationToken);
        settings.DefaultDurationMinutes = command.DefaultDurationMinutes;
        settings.PassingScorePercent = command.PassingScorePercent;
        settings.DefaultMaxAttempts = command.DefaultMaxAttempts;
        settings.NegativeMarkingEnabled = command.NegativeMarkingEnabled;
        settings.NegativeMarkingValue = command.NegativeMarkingValue;
        settings.AutoSaveEnabled = command.AutoSaveEnabled;
        settings.AutoSubmitEnabled = command.AutoSubmitEnabled;
        settings.QuestionNavigationMode = Enum.Parse<QuestionNavigationMode>(command.QuestionNavigationMode, ignoreCase: true);
        settings.ResultPublishingMode = Enum.Parse<ResultPublishingMode>(command.ResultPublishingMode, ignoreCase: true);
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
