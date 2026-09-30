using OnlineExamSystem.Exam.Application.Interfaces;
using ProctoringSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ProctoringSettings;

namespace OnlineExamSystem.Exam.Application.Proctoring.UpdateProctoringSettings;

public class UpdateProctoringSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public UpdateProctoringSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<ProctoringSettingsEntity> HandleAsync(
        UpdateProctoringSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var settings = await _examRepository.GetOrCreateProctoringSettingsAsync(cancellationToken);
        settings.ProctoringEnabled = command.ProctoringEnabled;
        settings.FaceDetectionEnabled = command.FaceDetectionEnabled;
        settings.MultiPersonDetectionEnabled = command.MultiPersonDetectionEnabled;
        settings.ScreenMonitoringEnabled = command.ScreenMonitoringEnabled;
        settings.FullscreenExitEnabled = command.FullscreenExitEnabled;
        settings.MultipleTabsEnabled = command.MultipleTabsEnabled;
        settings.CopyPasteBlockingEnabled = command.CopyPasteBlockingEnabled;
        settings.RightClickBlockingEnabled = command.RightClickBlockingEnabled;
        settings.MultipleMonitorsEnabled = command.MultipleMonitorsEnabled;
        settings.SessionTimeoutMinutes = command.SessionTimeoutMinutes;
        settings.UpdatedAtUtc = DateTime.UtcNow;
        settings.UpdatedByUserId = command.UpdatedByUserId;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
