using OnlineExamSystem.Exam.Application.Interfaces;
using GeneralSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.GeneralSettings;

namespace OnlineExamSystem.Exam.Application.Settings.GetGeneralSettings;

public class GetGeneralSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public GetGeneralSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<GeneralSettingsEntity> HandleAsync(
        GetGeneralSettingsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetOrCreateGeneralSettingsAsync(cancellationToken);
}
