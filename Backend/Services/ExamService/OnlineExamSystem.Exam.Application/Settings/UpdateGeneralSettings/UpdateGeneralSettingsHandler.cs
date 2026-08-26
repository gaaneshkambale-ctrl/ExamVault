using OnlineExamSystem.Exam.Application.Interfaces;
using GeneralSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.GeneralSettings;

namespace OnlineExamSystem.Exam.Application.Settings.UpdateGeneralSettings;

public class UpdateGeneralSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public UpdateGeneralSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<GeneralSettingsEntity> HandleAsync(
        UpdateGeneralSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var settings = await _examRepository.GetOrCreateGeneralSettingsAsync(cancellationToken);
        settings.OrganizationName = command.OrganizationName;
        settings.SupportEmail = command.SupportEmail;
        settings.Language = command.Language;
        settings.Timezone = command.Timezone;
        settings.DateFormat = command.DateFormat;
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return settings;
    }
}
